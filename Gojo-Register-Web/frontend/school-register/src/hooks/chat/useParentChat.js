import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { limitToLast, onValue, query, ref as rdbRef } from "firebase/database";
import { db } from "../../firebase";

const getChatId = (a, b) => [String(a || ""), String(b || "")].sort().join("_");

/**
 * useParentChat
 *
 * Owns the parent-chat popup state and side effects:
 * - `messages` and a real-time RTDB `messages` listener that also patches
 *   admin-addressed seen flags + unread reset + lastMessage seen.
 * - `typingUserId` from a real-time RTDB `typing` listener (popup only).
 * - `newMessageText` for the input.
 * - `messagesEndRef`, `chatMessagesContainerRef`, `shouldAutoScrollRef`
 *   and an auto-scroll effect that respects user scroll position.
 * - `handleChatScroll`, `handleTyping`, `sendMessage`, plus the
 *   internal `initChatIfMissing` and `maybeMarkLastMessageSeenForAdmin`.
 *
 * Single source of truth for the chat surface — page passes only DB/admin/
 * selectedParent/open and consumes the returned API straight into
 * `ParentChatPopup`.
 */
export default function useParentChat({ DB, DB_PATH, adminUserId, selectedParent, parentChatOpen }) {
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [typingUserId, setTypingUserId] = useState(null);

  const messagesEndRef = useRef(null);
  const chatMessagesContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const typingTimeoutRef = useRef(null);

  const chatId =
    adminUserId && selectedParent?.userId ? getChatId(adminUserId, selectedParent.userId) : null;

  const handleChatScroll = () => {
    const container = chatMessagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= 80;
  };

  const maybeMarkLastMessageSeenForAdmin = async (chatKey) => {
    try {
      const res = await axios
        .get(`${DB}/Chats/${chatKey}/lastMessage.json`)
        .catch(() => ({ data: null }));
      const last = res.data;
      if (!last) return;
      if (String(last.receiverId) === String(adminUserId) && last.seen === false) {
        await axios
          .patch(`${DB}/Chats/${chatKey}/lastMessage.json`, { seen: true })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  // Real-time messages listener + auto mark-as-seen for admin-addressed messages.
  useEffect(() => {
    if (!chatId) return undefined;
    const basePath = DB_PATH ? `${DB_PATH}/Chats/${chatId}` : `Chats/${chatId}`;
    const messagesRef = query(rdbRef(db, `${basePath}/messages`), limitToLast(20));

    const unsubscribe = onValue(messagesRef, async (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data)
        .map(([id, msg]) => ({ messageId: id, ...msg }))
        .sort((a, b) => Number(a.timeStamp || 0) - Number(b.timeStamp || 0));
      setMessages(list);

      const updates = {};
      Object.entries(data).forEach(([msgId, msg]) => {
        if (msg && msg.receiverId === adminUserId && !msg.seen) {
          updates[`${msgId}/seen`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        try {
          await axios.patch(`${DB}/Chats/${chatId}/messages.json`, updates).catch(() => {});
        } catch (err) {
          console.warn("Failed to patch parent seen updates", err);
        }
        axios.patch(`${DB}/Chats/${chatId}/unread.json`, { [adminUserId]: 0 }).catch(() => {});
        maybeMarkLastMessageSeenForAdmin(chatId);
        setMessages((prev) =>
          prev.map((m) => (m.receiverId === adminUserId ? { ...m, seen: true } : m))
        );
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DB, DB_PATH, chatId, adminUserId]);

  // Typing listener (popup only).
  useEffect(() => {
    if (!chatId || !parentChatOpen) {
      setTypingUserId(null);
      return undefined;
    }
    const basePath = DB_PATH ? `${DB_PATH}/Chats/${chatId}` : `Chats/${chatId}`;
    const typingRef = rdbRef(db, `${basePath}/typing`);
    const unsub = onValue(typingRef, (snapshot) => {
      const t = snapshot.val();
      setTypingUserId(t && t.userId ? t.userId : null);
    });
    return () => unsub();
  }, [DB_PATH, chatId, parentChatOpen]);

  // Mark messages as seen when the chat popup opens / selected parent changes.
  useEffect(() => {
    if (!parentChatOpen || !selectedParent || !adminUserId) return;
    const chatKey = getChatId(adminUserId, selectedParent.userId);

    const markSeen = async () => {
      try {
        const res = await axios.get(`${DB}/Chats/${chatKey}/messages.json`);
        const data = res.data || {};
        const updates = {};
        Object.entries(data).forEach(([msgId, msg]) => {
          if (msg && msg.receiverId === adminUserId && !msg.seen) {
            updates[`${msgId}/seen`] = true;
          }
        });
        if (Object.keys(updates).length > 0) {
          await axios.patch(`${DB}/Chats/${chatKey}/messages.json`, updates).catch(() => {});
        }
        setMessages((prev) =>
          prev.map((m) => (m.receiverId === adminUserId ? { ...m, seen: true } : m))
        );
      } catch (err) {
        console.warn("Failed to mark messages as seen:", err);
      }
    };

    markSeen();
    axios.patch(`${DB}/Chats/${chatKey}/unread.json`, { [adminUserId]: 0 }).catch(() => {});
    maybeMarkLastMessageSeenForAdmin(chatKey);
    axios.put(`${DB}/Chats/${chatKey}/typing.json`, null).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentChatOpen, selectedParent, adminUserId]);

  // Clear typing when popup closes or parent changes, and on unmount.
  useEffect(() => {
    if (!parentChatOpen && selectedParent && adminUserId) {
      const chatKey = getChatId(adminUserId, selectedParent.userId);
      axios.put(`${DB}/Chats/${chatKey}/typing.json`, null).catch(() => {});
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [parentChatOpen, selectedParent, adminUserId, DB]);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom).
  useEffect(() => {
    if (!parentChatOpen) return;
    const container = chatMessagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (!shouldAutoScrollRef.current && distanceFromBottom > 80) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, parentChatOpen]);

  // Reset auto-scroll on chat switch.
  useEffect(() => {
    if (!chatId) return;
    shouldAutoScrollRef.current = true;
  }, [chatId, parentChatOpen]);

  // Mark as seen when selectedParent changes (independent of popup state).
  useEffect(() => {
    if (!selectedParent || !adminUserId) return;
    const id = getChatId(adminUserId, selectedParent.userId);
    axios.patch(`${DB}/Chats/${id}/unread.json`, { [adminUserId]: 0 }).catch(() => {});
    maybeMarkLastMessageSeenForAdmin(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParent, adminUserId, DB]);

  const handleTyping = (text) => {
    if (!adminUserId || !selectedParent?.userId) return;
    const chatKey = getChatId(adminUserId, selectedParent.userId);

    if (!text || !text.trim()) {
      axios.put(`${DB}/Chats/${chatKey}/typing.json`, null).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    axios
      .put(`${DB}/Chats/${chatKey}/typing.json`, { userId: adminUserId })
      .catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      axios.put(`${DB}/Chats/${chatKey}/typing.json`, null).catch(() => {});
      typingTimeoutRef.current = null;
    }, 1800);
  };

  const initChatIfMissing = async () => {
    if (!chatId || !selectedParent?.userId) return;
    await axios
      .patch(`${DB}/Chats/${chatId}.json`, {
        participants: { [adminUserId]: true, [selectedParent.userId]: true },
        unread: { [adminUserId]: 0, [selectedParent.userId]: 0 },
        typing: null,
        lastMessage: null,
      })
      .catch(() => {});
  };

  const sendMessage = async (text) => {
    if (!text || !text.trim() || !selectedParent) return;
    if (!adminUserId || !selectedParent?.userId) return;

    shouldAutoScrollRef.current = true;
    const id = getChatId(adminUserId, selectedParent.userId);
    await initChatIfMissing();

    const newMsg = {
      senderId: adminUserId,
      receiverId: selectedParent.userId,
      type: "text",
      text,
      imageUrl: null,
      replyTo: null,
      seen: false,
      edited: false,
      deleted: false,
      timeStamp: Date.now(),
    };

    try {
      const pushRes = await axios
        .post(`${DB}/Chats/${id}/messages.json`, newMsg)
        .catch(() => ({ data: null }));
      const generatedId = pushRes?.data?.name || `${Date.now()}`;

      const lastMessage = {
        messageId: generatedId,
        senderId: newMsg.senderId,
        receiverId: newMsg.receiverId,
        text: newMsg.text || "",
        type: newMsg.type || "text",
        timeStamp: newMsg.timeStamp,
        seen: false,
        edited: false,
        deleted: false,
      };

      await axios
        .patch(`${DB}/Chats/${id}.json`, {
          participants: { [adminUserId]: true, [selectedParent.userId]: true },
          lastMessage,
          typing: null,
        })
        .catch(() => {});

      // Bump receiver's unread counter (preserve existing).
      try {
        const unreadRes = await axios.get(`${DB}/Chats/${id}/unread.json`);
        const unread = unreadRes.data || {};
        const prev = Number(unread[selectedParent.userId] || 0);
        const updated = {
          ...(unread || {}),
          [selectedParent.userId]: prev + 1,
          [adminUserId]: Number(unread[adminUserId] || 0),
        };
        await axios.put(`${DB}/Chats/${id}/unread.json`, updated).catch(() => {});
      } catch {
        await axios
          .put(`${DB}/Chats/${id}/unread.json`, {
            [selectedParent.userId]: 1,
            [adminUserId]: 0,
          })
          .catch(() => {});
      }

      setNewMessageText("");
      axios.put(`${DB}/Chats/${id}/typing.json`, null).catch(() => {});
    } catch (err) {
      console.error("Failed to send parent message:", err);
    }
  };

  return {
    messages,
    setMessages,
    newMessageText,
    setNewMessageText,
    typingUserId,
    chatId,
    messagesEndRef,
    chatMessagesContainerRef,
    handleChatScroll,
    handleTyping,
    sendMessage,
  };
}
