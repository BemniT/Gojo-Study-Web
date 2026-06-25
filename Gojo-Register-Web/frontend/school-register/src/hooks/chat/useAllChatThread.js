import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { get, onValue, push, ref, set, update } from "firebase/database";
import { db } from "../../firebase";

const getChatKey = (a, b) => [String(a || ""), String(b || "")].sort().join("_");

const getChatKeyCandidates = (a, b) => {
  const left = String(a || "");
  const right = String(b || "");
  const sorted = getChatKey(left, right);
  const direct = `${left}_${right}`;
  const reverse = `${right}_${left}`;
  return [sorted, direct, reverse].filter((v, i, arr) => v && arr.indexOf(v) === i);
};

export default function useAllChatThread({ DB_ROOT, DB_PATH, financeUserId, selectedChatUser }) {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [typing, setTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [activeChatKey, setActiveChatKey] = useState(null);

  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const normalizedChatKey = useMemo(() => {
    if (!selectedChatUser?.userId || !financeUserId) return null;
    return getChatKey(financeUserId, selectedChatUser.userId);
  }, [selectedChatUser, financeUserId]);

  const updateUnreadForSelected = async (userId) => {
    if (!financeUserId || !userId) return;
    const key = activeChatKey || getChatKey(financeUserId, userId);
    try {
      await axios.patch(`${DB_ROOT}/Chats/${key}/unread.json`, { [financeUserId]: 0 });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!financeUserId || !selectedChatUser?.userId || !normalizedChatKey) {
      setActiveChatKey(null);
      return;
    }

    let mounted = true;

    const resolveKey = async () => {
      const candidates = getChatKeyCandidates(financeUserId, selectedChatUser.userId);
      for (const key of candidates) {
        const basePath = DB_PATH ? `${DB_PATH}/Chats/${key}` : `Chats/${key}`;
        try {
          const snap = await get(ref(db, basePath));
          if (snap.exists()) {
            if (mounted) setActiveChatKey(key);
            return;
          }
        } catch {
          // try next
        }
      }
      if (mounted) setActiveChatKey(normalizedChatKey);
    };

    resolveKey();
    return () => { mounted = false; };
  }, [DB_PATH, financeUserId, normalizedChatKey, selectedChatUser]);

  useEffect(() => {
    if (!activeChatKey || !selectedChatUser?.userId || !financeUserId) return;

    const basePath = DB_PATH ? `${DB_PATH}/Chats/${activeChatKey}` : `Chats/${activeChatKey}`;
    const userPath = DB_PATH ? `${DB_PATH}/Users/${selectedChatUser.userId}/lastSeen` : `Users/${selectedChatUser.userId}/lastSeen`;

    const messagesRef = ref(db, `${basePath}/messages`);
    const typingRef = ref(db, `${basePath}/typing`);
    const lastSeenRef = ref(db, userPath);

    const unsubMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const mapped = Object.entries(data)
        .map(([id, m]) => ({
          ...m,
          id,
          sender: String(m.senderId) === String(financeUserId) ? "registerer" : "user",
        }))
        .sort((a, b) => Number(a.timeStamp || 0) - Number(b.timeStamp || 0));
      setMessages(mapped);
    });

    const unsubTyping = onValue(typingRef, (snapshot) => {
      const val = snapshot.val();
      setTyping(Boolean(val?.userId) && String(val.userId) === String(selectedChatUser.userId));
    });

    const unsubLastSeen = onValue(lastSeenRef, (snapshot) => {
      setLastSeen(snapshot.val());
    });

    updateUnreadForSelected(selectedChatUser.userId);

    return () => {
      unsubMessages();
      unsubTyping();
      unsubLastSeen();
    };
  }, [activeChatKey, selectedChatUser, financeUserId, DB_PATH]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChatKey || !selectedChatUser?.userId || !financeUserId) return;

    const basePath = DB_PATH ? `${DB_PATH}/Chats/${activeChatKey}` : `Chats/${activeChatKey}`;
    const messagesRef = ref(db, `${basePath}/messages`);
    const chatRef = ref(db, basePath);

    if (editingMsgId) {
      await update(ref(db, `${basePath}/messages/${editingMsgId}`), {
        text: messageInput,
        edited: true,
      });
      setEditingMsgId(null);
      setMessageInput("");
      return;
    }

    const payload = {
      senderId: financeUserId,
      receiverId: selectedChatUser.userId,
      type: "text",
      text: messageInput,
      imageUrl: null,
      replyTo: null,
      seen: false,
      edited: false,
      deleted: false,
      timeStamp: Date.now(),
    };

    const msgRef = push(messagesRef);
    await set(msgRef, payload);

    let unreadNode = {};
    try {
      const unreadSnap = await get(ref(db, `${basePath}/unread`));
      unreadNode = unreadSnap.val() || {};
    } catch {
      unreadNode = {};
    }

    const nextUnreadForReceiver = Number(unreadNode[selectedChatUser.userId] || 0) + 1;

    await update(chatRef, {
      participants: {
        [financeUserId]: true,
        [selectedChatUser.userId]: true,
      },
      lastMessage: { ...payload, messageId: msgRef.key },
      unread: {
        ...(unreadNode || {}),
        [financeUserId]: 0,
        [selectedChatUser.userId]: nextUnreadForReceiver,
      },
      typing: null,
    });

    setMessageInput("");
  };

  const deleteMessage = async (msgId) => {
    if (!activeChatKey || !msgId) return;
    const basePath = DB_PATH ? `${DB_PATH}/Chats/${activeChatKey}` : `Chats/${activeChatKey}`;
    await update(ref(db, `${basePath}/messages/${msgId}`), { deleted: true });
  };

  const handleTyping = async (e) => {
    const text = e.target.value;
    setMessageInput(text);

    if (!activeChatKey || !financeUserId) return;
    const basePath = DB_PATH ? `${DB_PATH}/Chats/${activeChatKey}` : `Chats/${activeChatKey}`;
    const typingRef = ref(db, `${basePath}/typing`);

    if (!text.trim()) {
      await set(typingRef, { userId: null });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    await set(typingRef, { userId: financeUserId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await set(typingRef, { userId: null });
    }, 1800);
  };

  return {
    messages,
    messageInput,
    setMessageInput,
    editingMsgId,
    setEditingMsgId,
    activeMessageId,
    setActiveMessageId,
    typing,
    lastSeen,
    chatEndRef,
    sendMessage,
    deleteMessage,
    handleTyping,
    updateUnreadForSelected,
  };
}
