import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { onValue, ref } from "firebase/database";
import { db } from "../../firebase";

const getChatKey = (a, b) =>
  [String(a || ""), String(b || "")].sort().join("_");

/**
 * useStudentChat
 *
 * Owns the chat popup state for the currently selected student:
 * - `popupMessages` and a real-time RTDB listener that also marks
 *   admin-addressed messages as seen on each snapshot.
 * - `newMessageText` and `sendMessage` for the input box.
 * - `messagesEndRef` for the popup scroll anchor.
 *
 * Fixes a latent ReferenceError in the prior inline code: `dbRT` was
 * never declared and `getChatKey` was never imported, so the popup
 * crashed the moment it opened. Both are now self-contained here.
 */
export default function useStudentChat({ dbUrl, adminUserId, selectedStudent, studentChatOpen }) {
  const [popupMessages, setPopupMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const messagesEndRef = useRef(null);

  // Initial fetch when the popup opens (one-shot via HTTP for fast first paint).
  useEffect(() => {
    if (!studentChatOpen || !selectedStudent) return undefined;

    let cancelled = false;
    const chatKey = getChatKey(selectedStudent.userId, adminUserId);

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${dbUrl}/Chats/${chatKey}/messages.json`);
        const msgs = Object.values(res.data || {})
          .map((m) => ({ ...m, sender: m.senderId === adminUserId ? "admin" : "student" }))
          .sort((a, b) => a.timeStamp - b.timeStamp);
        if (!cancelled) setPopupMessages(msgs);
      } catch (err) {
        console.error("Failed to fetch chat messages:", err);
      }
    };

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [studentChatOpen, selectedStudent, adminUserId, dbUrl]);

  // Real-time listener + mark-as-seen for admin-addressed messages.
  useEffect(() => {
    if (!studentChatOpen || !selectedStudent) return undefined;

    const chatKey = getChatKey(selectedStudent.userId, adminUserId);
    const messagesRef = ref(db, `Chats/${chatKey}/messages`);

    const handleSnapshot = async (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data)
        .map(([id, msg]) => ({ messageId: id, ...msg }))
        .sort((a, b) => a.timeStamp - b.timeStamp);
      setPopupMessages(list);

      // Mark admin-addressed messages as seen
      const updates = {};
      Object.entries(data).forEach(([msgId, msg]) => {
        if (msg && msg.receiverId === adminUserId && !msg.seen) {
          updates[`Chats/${chatKey}/messages/${msgId}/seen`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        try {
          await axios.patch(`${dbUrl}/.json`, updates);
          axios
            .patch(`${dbUrl}/Chats/${chatKey}.json`, {
              unread: { [adminUserId]: 0 },
              lastMessage: { seen: true },
            })
            .catch(() => {});
        } catch (err) {
          console.error("Failed to patch seen updates:", err);
        }
      }
    };

    const unsubscribe = onValue(messagesRef, handleSnapshot);
    return () => unsubscribe();
  }, [studentChatOpen, selectedStudent, adminUserId, dbUrl]);

  // Send a message — push to /messages, patch lastMessage + participants,
  // bump the receiver's unread counter.
  const sendMessage = async () => {
    if (!newMessageText.trim() || !selectedStudent) return;

    const newMessage = {
      senderId: adminUserId,
      receiverId: selectedStudent.userId,
      text: newMessageText,
      timeStamp: Date.now(),
      seen: false,
    };

    const chatKey = getChatKey(selectedStudent.userId, adminUserId);

    try {
      const pushRes = await axios.post(`${dbUrl}/Chats/${chatKey}/messages.json`, {
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        type: "text",
        text: newMessage.text || "",
        imageUrl: null,
        replyTo: null,
        seen: false,
        edited: false,
        deleted: false,
        timeStamp: newMessage.timeStamp,
      });

      const generatedId = pushRes.data && pushRes.data.name;

      const lastMessage = {
        text: newMessage.text,
        senderId: newMessage.senderId,
        seen: false,
        timeStamp: newMessage.timeStamp,
      };

      await axios.patch(`${dbUrl}/Chats/${chatKey}.json`, {
        participants: { [adminUserId]: true, [selectedStudent.userId]: true },
        lastMessage,
      });

      // Bump receiver's unread counter
      try {
        const unreadRes = await axios.get(`${dbUrl}/Chats/${chatKey}/unread.json`);
        const unread = unreadRes.data || {};
        const prev = Number(unread[selectedStudent.userId] || 0);
        const updated = {
          ...(unread || {}),
          [selectedStudent.userId]: prev + 1,
          [adminUserId]: Number(unread[adminUserId] || 0),
        };
        await axios.put(`${dbUrl}/Chats/${chatKey}/unread.json`, updated);
      } catch {
        await axios.put(`${dbUrl}/Chats/${chatKey}/unread.json`, {
          [selectedStudent.userId]: 1,
          [adminUserId]: 0,
        });
      }

      setPopupMessages((prev) => [
        ...prev,
        { messageId: generatedId || `${Date.now()}`, ...newMessage, sender: "admin" },
      ]);
      setNewMessageText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return {
    popupMessages,
    setPopupMessages,
    newMessageText,
    setNewMessageText,
    messagesEndRef,
    sendMessage,
  };
}
