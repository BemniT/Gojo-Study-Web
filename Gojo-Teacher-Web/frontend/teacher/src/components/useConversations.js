/**
 * @file useConversations.js
 * @description React hook that fetches and manages recent conversation summaries and handles opening a conversation from the teacher dashboard.
 */
import { useState, useCallback } from "react";
import axios from "axios";
import { readSessionResource, writeSessionResource, fetchTeacherConversationSummaries } from "../utils/teacherData";
import { buildChatSummaryPath, buildChatSummaryUpdate } from "../utils/chatRtdb";

/**
 * Manages conversation state, fetching, and interaction for the dashboard.
 * @param {{ teacher: object, effectiveSchoolCode: string, DB_ROOT: string, navigate: Function }} params
 * @returns {{ conversations: Array, setConversations: Function, fetchConversations: Function,
 *   handleOpenConversation: Function, getDashboardConversationsSessionKey: Function }}
 */
export function useConversations({ teacher, effectiveSchoolCode, DB_ROOT, navigate }) {
  const [conversations, setConversations] = useState([]);

  const teacherId = teacher?.userId || null;

  // Returns the session-cache key for the teacher's conversation list for the given school and user.
  const getDashboardConversationsSessionKey = useCallback(
    (candidateSchoolCode, teacherUserId) =>
      `dashboard_conversations_${String(candidateSchoolCode || "global").toUpperCase()}_${String(teacherUserId || "").trim()}`,
    []
  );

  // Loads recent conversation summaries from session cache or Firebase and updates state.
  const fetchConversations = useCallback(
    async (currentTeacher) => {
      if (document.visibilityState !== "visible") return;
      try {
        const t = currentTeacher || teacher;
        if (!t || !t.userId || !effectiveSchoolCode) {
          setConversations([]);
          return;
        }

        const sessionCacheKey = getDashboardConversationsSessionKey(effectiveSchoolCode, t.userId);
        const cachedConversations = readSessionResource(sessionCacheKey, {
          ttlMs: 90 * 1000,
        });
        if (Array.isArray(cachedConversations)) {
          setConversations(cachedConversations);
          return;
        }

        const convs = await fetchTeacherConversationSummaries({
          rtdbBase: DB_ROOT,
          schoolCode: effectiveSchoolCode,
          teacherUserId: t.userId,
          unreadOnly: false,
          limit: 5,
        });

        writeSessionResource(sessionCacheKey, convs);
        setConversations(convs);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setConversations([]);
      }
    },
    [teacher, effectiveSchoolCode, DB_ROOT, getDashboardConversationsSessionKey]
  );

  // Navigates to the chat view for the selected conversation and clears its unread count.
  const handleOpenConversation = useCallback(
    async (conv) => {
      if (!teacher || !conv || !navigate) return;
      const { chatId, contact } = conv;

      navigate("/all-chat", { state: { contact, chatId } });

      if (conv.unreadForMe > 0) {
        try {
          await axios.patch(
            `${DB_ROOT}/${buildChatSummaryPath(teacherId, chatId)}.json`,
            buildChatSummaryUpdate({
              chatId,
              otherUserId: contact?.userId,
              unreadCount: 0,
              lastMessageSeen: true,
              lastMessageSeenAt: Date.now(),
            })
          );
        } catch (err) {
          console.error("Failed to clear unread in DB:", err);
        }
      }

      setConversations((prev) =>
        prev.map((item) =>
          item.chatId === chatId
            ? { ...item, unreadForMe: 0 }
            : item
        )
      );
    },
    [teacher, teacherId, DB_ROOT, navigate]
  );

  return {
    conversations,
    setConversations,
    fetchConversations,
    handleOpenConversation,
    getDashboardConversationsSessionKey,
  };
}
