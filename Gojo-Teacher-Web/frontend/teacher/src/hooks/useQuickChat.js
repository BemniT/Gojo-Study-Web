import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { increment, ref as dbRef, update } from "firebase/database";
import {
  buildChatMessageQuery,
  buildChatSummaryPath,
  buildChatSummaryUpdate,
  filterChatMessageRows,
  getLastChatMessageKey,
} from "../utils/chatRtdb";
import { mergeChatMessages } from "../utils/chatHelpers";
import {
  getChatId,
  buildQuickChatMessageRows,
  createQuickChatMessageId,
} from "../utils/studentHelpers";
import { clearCachedChatSummary } from "../utils/teacherData";
import { db, schoolPath } from "../firebase";

const QUICK_CHAT_HISTORY_LIMIT = 50;
const QUICK_CHAT_POLL_INTERVAL_MS = 2 * 60 * 1000;
const QUICK_CHAT_IDLE_GRACE_MS = 2 * 60 * 1000;

const normalizeIdentifier = (value) => String(value || "").trim();

export function useQuickChat({ teacherUserId, resolvedSchoolCode, rtdbBase }) {
  const [liveQuickChatMessages, setLiveQuickChatMessages] = useState([]);
  const [olderQuickChatMessages, setOlderQuickChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [quickChatLoading, setQuickChatLoading] = useState(false);
  const [quickChatLoadingOlder, setQuickChatLoadingOlder] = useState(false);
  const [quickChatHasOlder, setQuickChatHasOlder] = useState(false);
  const [quickChatTarget, setQuickChatTarget] = useState(null);

  const quickChatMessagesRef = useRef(null);
  const quickChatScrollRestoreRef = useRef(null);
  const lastQuickChatActivityAtRef = useRef(Date.now());
  const lastQuickChatMessageKeyRef = useRef("");

  const buildRtdbUrl = useCallback(
    (path) => `${rtdbBase}/${String(path || "").replace(/^\/+/, "")}.json`,
    [rtdbBase]
  );

  const fetchQuickChatMessagesPage = useCallback(
    async ({ chatId, beforeMessageKey, afterMessageKey } = {}) => {
      if (!chatId) {
        return { messages: [], overflowed: false };
      }

      const response = await axios.get(buildRtdbUrl(`Chats/${chatId}/messages`), {
        params: buildChatMessageQuery({
          pageSize: QUICK_CHAT_HISTORY_LIMIT,
          beforeMessageKey,
          afterMessageKey,
        }),
      });
      const messagesNode = response?.data && typeof response.data === "object" ? response.data : {};
      const messageList = filterChatMessageRows(buildQuickChatMessageRows(messagesNode, teacherUserId), {
        beforeMessageKey,
        afterMessageKey,
      });

      return {
        messages: messageList,
        overflowed: Boolean(afterMessageKey) && messageList.length > QUICK_CHAT_HISTORY_LIMIT,
      };
    },
    [buildRtdbUrl, teacherUserId]
  );

  const patchQuickChatSummary = useCallback(
    async (ownerUserId, chatId, patch) => {
      const normalizedOwnerUserId = normalizeIdentifier(ownerUserId);
      if (!normalizedOwnerUserId || !chatId || !patch || typeof patch !== "object") {
        return;
      }

      await axios.patch(buildRtdbUrl(buildChatSummaryPath(normalizedOwnerUserId, chatId)), patch);
    },
    [buildRtdbUrl]
  );

  const updateQuickChatParticipants = useCallback(
    async (chatId, participantIds = []) => {
      const participantPatch = (participantIds || []).reduce((result, participantId) => {
        const normalizedParticipantId = normalizeIdentifier(participantId);
        if (normalizedParticipantId) {
          result[normalizedParticipantId] = true;
        }
        return result;
      }, {});

      if (!Object.keys(participantPatch).length) {
        return;
      }

      await axios.patch(buildRtdbUrl(`Chats/${chatId}/participants`), participantPatch);
    },
    [buildRtdbUrl]
  );

  const syncQuickChatSummaryCache = useCallback(
    (chatId) => {
      clearCachedChatSummary({
        rtdbBase,
        chatId,
        teacherUserId,
      });
    },
    [rtdbBase, teacherUserId]
  );

  const messages = useMemo(
    () => mergeChatMessages(olderQuickChatMessages, liveQuickChatMessages),
    [olderQuickChatMessages, liveQuickChatMessages]
  );

  useEffect(() => {
    const hasTarget = Boolean(quickChatTarget?.userId);
    if (!hasTarget) {
      return undefined;
    }

    const markQuickChatActivity = () => {
      lastQuickChatActivityAtRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") {
        return;
      }
      markQuickChatActivity();
    };

    window.addEventListener("focus", markQuickChatActivity);
    window.addEventListener("online", markQuickChatActivity);
    window.addEventListener("pointerdown", markQuickChatActivity, { passive: true });
    window.addEventListener("touchstart", markQuickChatActivity, { passive: true });
    window.addEventListener("keydown", markQuickChatActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", markQuickChatActivity);
      window.removeEventListener("online", markQuickChatActivity);
      window.removeEventListener("pointerdown", markQuickChatActivity);
      window.removeEventListener("touchstart", markQuickChatActivity);
      window.removeEventListener("keydown", markQuickChatActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [quickChatTarget?.userId]);

  useEffect(() => {
    if (!teacherUserId || !quickChatTarget?.userId) {
      lastQuickChatMessageKeyRef.current = "";
      setLiveQuickChatMessages([]);
      setOlderQuickChatMessages([]);
      setQuickChatLoading(false);
      setQuickChatLoadingOlder(false);
      setQuickChatHasOlder(false);
      quickChatScrollRestoreRef.current = null;
      return undefined;
    }

    const chatKey = getChatId(teacherUserId, quickChatTarget.userId);

    setQuickChatLoading(true);
    lastQuickChatMessageKeyRef.current = "";
    let cancelled = false;
    let syncInFlight = false;

    const syncLatestMessages = async ({ force = false } = {}) => {
      const isVisible = typeof document === "undefined" || document.visibilityState === "visible";
      const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
      const isRecentlyActive = Date.now() - lastQuickChatActivityAtRef.current <= QUICK_CHAT_IDLE_GRACE_MS;
      if (!force && (!isVisible || !isOnline || !isRecentlyActive)) {
        return;
      }

      if (syncInFlight) return;
      syncInFlight = true;

      try {
        const afterMessageKey = !force ? lastQuickChatMessageKeyRef.current : "";
        let replaceMessages = !afterMessageKey;
        let appliedMessages = [];

        if (afterMessageKey) {
          const incrementalResult = await fetchQuickChatMessagesPage({
            chatId: chatKey,
            afterMessageKey,
          });

          if (incrementalResult.overflowed) {
            const snapshotResult = await fetchQuickChatMessagesPage({ chatId: chatKey });
            appliedMessages = snapshotResult.messages;
            replaceMessages = true;
          } else {
            appliedMessages = incrementalResult.messages;
            replaceMessages = false;
          }
        } else {
          const snapshotResult = await fetchQuickChatMessagesPage({ chatId: chatKey });
          appliedMessages = snapshotResult.messages;
        }

        if (cancelled) return;

        if (replaceMessages) {
          lastQuickChatMessageKeyRef.current = getLastChatMessageKey(appliedMessages);
          setLiveQuickChatMessages(appliedMessages);
          setQuickChatHasOlder((previousValue) => previousValue || appliedMessages.length >= QUICK_CHAT_HISTORY_LIMIT);
        } else if (appliedMessages.length) {
          setLiveQuickChatMessages((previousMessages) => {
            const nextMessages = mergeChatMessages(previousMessages, appliedMessages);
            lastQuickChatMessageKeyRef.current = getLastChatMessageKey(nextMessages);
            return nextMessages;
          });
        }
        setQuickChatLoading(false);

        const unseenMessages = appliedMessages.filter(
          (message) => String(message?.receiverId || "") === String(teacherUserId) && !message?.seen
        );
        if (!unseenMessages.length) return;

        const seenAt = Date.now();
        const seenPatch = unseenMessages.reduce((result, message) => {
          const messageKey = normalizeIdentifier(message?.id || message?.messageId);
          if (!messageKey) return result;
          result[`messages/${messageKey}/seen`] = true;
          result[`messages/${messageKey}/seenAt`] = seenAt;
          return result;
        }, {});

        try {
          await Promise.all([
            axios.patch(buildRtdbUrl(`Chats/${chatKey}`), seenPatch),
            patchQuickChatSummary(
              teacherUserId,
              chatKey,
              buildChatSummaryUpdate({
                chatId: chatKey,
                otherUserId: quickChatTarget.userId,
                unreadCount: 0,
                lastMessageSeen: true,
                lastMessageSeenAt: seenAt,
              })
            ),
          ]);

          if (cancelled) return;

          setLiveQuickChatMessages((previousMessages) =>
            previousMessages.map((message) => {
              const messageKey = normalizeIdentifier(message?.id || message?.messageId);
              if (!messageKey || !seenPatch[`messages/${messageKey}/seen`]) {
                return message;
              }

              return {
                ...message,
                seen: true,
                seenAt,
              };
            })
          );
          syncQuickChatSummaryCache(chatKey);
        } catch (error) {
          console.error("Failed to mark messages seen:", error);
        }
      } catch (error) {
        console.error("Failed to load quick chat messages:", error);
        if (!cancelled) {
          lastQuickChatMessageKeyRef.current = "";
          setLiveQuickChatMessages([]);
          setOlderQuickChatMessages([]);
          setQuickChatHasOlder(false);
          setQuickChatLoading(false);
        }
      } finally {
        syncInFlight = false;
      }
    };

    const handleFocusedRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      lastQuickChatActivityAtRef.current = Date.now();
      void syncLatestMessages({ force: true });
    };

    void syncLatestMessages({ force: true });
    const intervalId = window.setInterval(() => {
      void syncLatestMessages();
    }, QUICK_CHAT_POLL_INTERVAL_MS);
    window.addEventListener("focus", handleFocusedRefresh);
    window.addEventListener("online", handleFocusedRefresh);
    document.addEventListener("visibilitychange", handleFocusedRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocusedRefresh);
      window.removeEventListener("online", handleFocusedRefresh);
      document.removeEventListener("visibilitychange", handleFocusedRefresh);
    };
  }, [quickChatTarget?.userId, teacherUserId, rtdbBase, resolvedSchoolCode, buildRtdbUrl, fetchQuickChatMessagesPage, patchQuickChatSummary, syncQuickChatSummaryCache]);

  const loadOlderMessages = useCallback(async () => {
    if (
      quickChatLoading ||
      quickChatLoadingOlder ||
      !teacherUserId ||
      !quickChatTarget?.userId ||
      messages.length === 0
    ) {
      return;
    }

    const oldestMessageKey = normalizeIdentifier(messages[0]?.id || messages[0]?.messageId);
    if (!oldestMessageKey) {
      setQuickChatHasOlder(false);
      return;
    }

    const scrollContainer = quickChatMessagesRef.current;
    if (scrollContainer) {
      quickChatScrollRestoreRef.current = {
        previousScrollHeight: scrollContainer.scrollHeight,
        previousScrollTop: scrollContainer.scrollTop,
      };
    }

    setQuickChatLoadingOlder(true);

    try {
      const chatId = getChatId(teacherUserId, quickChatTarget.userId);
      const { messages: olderMessagesPage } = await fetchQuickChatMessagesPage({
        chatId,
        beforeMessageKey: oldestMessageKey,
      });

      if (!olderMessagesPage.length) {
        setQuickChatHasOlder(false);
        quickChatScrollRestoreRef.current = null;
        return;
      }

      setOlderQuickChatMessages((previousMessages) =>
        mergeChatMessages(olderMessagesPage, previousMessages)
      );
      setQuickChatHasOlder(olderMessagesPage.length >= QUICK_CHAT_HISTORY_LIMIT);
    } catch (error) {
      console.error("Failed to load older quick chat messages:", error);
      quickChatScrollRestoreRef.current = null;
    } finally {
      setQuickChatLoadingOlder(false);
    }
  }, [quickChatLoading, quickChatLoadingOlder, teacherUserId, quickChatTarget?.userId, messages, fetchQuickChatMessagesPage]);

  const sendMessage = useCallback(async () => {
    const text = String(newMessageText || "").trim();
    if (!text || !quickChatTarget?.userId || !teacherUserId) return;

    const senderId = teacherUserId;
    const receiverId = quickChatTarget.userId;
    const chatId = getChatId(senderId, receiverId);
    const timeStamp = Date.now();

    const message = {
      messageId: createQuickChatMessageId(),
      senderId,
      receiverId,
      type: "text",
      text,
      seen: false,
      edited: false,
      deleted: false,
      timeStamp,
    };

    try {
      const teacherSummary = buildChatSummaryUpdate({
        chatId,
        otherUserId: receiverId,
        unreadCount: 0,
        lastMessageText: text,
        lastMessageType: "text",
        lastMessageTime: timeStamp,
        lastSenderId: senderId,
        lastMessageSeen: false,
        lastMessageSeenAt: null,
      });
      const receiverSummary = {
        ...buildChatSummaryUpdate({
          chatId,
          otherUserId: senderId,
          lastMessageText: text,
          lastMessageType: "text",
          lastMessageTime: timeStamp,
          lastSenderId: senderId,
          lastMessageSeen: false,
          lastMessageSeenAt: null,
        }),
        unreadCount: increment(1),
      };

      const updates = {
        [schoolPath(`Chats/${chatId}/messages/${message.messageId}`)]: message,
        [schoolPath(`Chats/${chatId}/participants/${senderId}`)]: true,
        [schoolPath(`Chats/${chatId}/participants/${receiverId}`)]: true,
        [schoolPath(buildChatSummaryPath(senderId, chatId))]: teacherSummary,
        [schoolPath(buildChatSummaryPath(receiverId, chatId))]: receiverSummary,
      };

      await update(dbRef(db), updates);

      syncQuickChatSummaryCache(chatId);
      setLiveQuickChatMessages((previousMessages) => {
        const nextMessages = mergeChatMessages(previousMessages, [
          {
            id: message.messageId,
            ...message,
            isTeacher: true,
          },
        ]);
        lastQuickChatMessageKeyRef.current = getLastChatMessageKey(nextMessages);
        return nextMessages;
      });
      setNewMessageText("");
    } catch (err) {
      console.error("Failed to send quick chat message:", err);
    }
  }, [newMessageText, quickChatTarget?.userId, teacherUserId, syncQuickChatSummaryCache]);

  return {
    quickChatTarget,
    setQuickChatTarget,
    messages,
    newMessageText,
    setNewMessageText,
    quickChatLoading,
    quickChatLoadingOlder,
    quickChatHasOlder,
    sendMessage,
    loadOlderMessages,
    quickChatMessagesRef,
    quickChatScrollRestoreRef,
  };
}
