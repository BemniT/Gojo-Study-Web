import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  buildChatMessageQuery,
  buildChatSummaryPath,
  buildChatSummaryUpdate,
  filterChatMessageRows,
} from "../utils/chatRtdb";
import { clearCachedChatSummary } from "../utils/teacherData";
import {
  getChatIdForTab,
  mergeChatMessages,
  normalizeTab,
} from "../utils/chatHelpers";

const CHAT_HISTORY_PAGE_SIZE = 50;
const CHAT_MESSAGE_POLL_INTERVAL_MS = 2 * 60 * 1000;
const CHAT_POLL_IDLE_GRACE_MS = 2 * 60 * 1000;

const buildRtdbUrl = (rtdbBase, path) =>
  `${rtdbBase}/${String(path || "").replace(/^\/+/, "")}.json`;

const buildChatMessageRows = (messagesNode = {}, teacherUserId) => {
  return Object.entries(messagesNode || {})
    .map(([id, message]) => ({
      id,
      messageId: id,
      ...message,
      isTeacher: message?.senderId === teacherUserId,
    }))
    .sort(
      (leftMessage, rightMessage) =>
        Number(leftMessage?.timeStamp || 0) - Number(rightMessage?.timeStamp || 0)
    );
};

const fetchChatMessagesPage = async ({
  chatKey,
  beforeMessageKey,
  afterMessageKey,
  teacherUserId,
  rtdbBase,
}) => {
  if (!chatKey) {
    return { messages: [], overflowed: false };
  }

  const response = await axios.get(buildRtdbUrl(rtdbBase, `Chats/${chatKey}/messages`), {
    params: buildChatMessageQuery({
      pageSize: CHAT_HISTORY_PAGE_SIZE,
      beforeMessageKey,
      afterMessageKey,
    }),
  });

  const messagesNode = response?.data && typeof response.data === "object" ? response.data : {};
  const messageList = filterChatMessageRows(buildChatMessageRows(messagesNode, teacherUserId), {
    beforeMessageKey,
    afterMessageKey,
  });

  return {
    messages: messageList,
    overflowed: Boolean(afterMessageKey) && messageList.length > CHAT_HISTORY_PAGE_SIZE,
  };
};

const patchChatSummary = async ({
  ownerUserId,
  chatKey,
  patch,
  rtdbBase,
}) => {
  const normalizedOwnerUserId = String(ownerUserId || "").trim();
  if (!normalizedOwnerUserId || !chatKey || !patch || typeof patch !== "object") {
    return;
  }

  await axios.patch(
    buildRtdbUrl(rtdbBase, buildChatSummaryPath(normalizedOwnerUserId, chatKey)),
    patch
  );
};

const syncTeacherSummaryCache = ({ chatKey, rtdbBase, teacherUserId }) => {
  if (!chatKey || !teacherUserId) return;
  clearCachedChatSummary({
    rtdbBase,
    chatId: chatKey,
    teacherUserId,
  });
};

export const useChatMessages = ({
  selectedChatUser,
  teacherUserId,
  currentChatKey,
  selectedTab,
  resolvedSchoolCode,
  teacherSchoolCode,
  rtdbBase,
  lastChatActivityAtRef,
  chatMessagesRef,
  chatScrollRestoreRef,
  setUnreadCounts,
}) => {
  const [liveMessages, setLiveMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLoadingOlder, setChatLoadingOlder] = useState(false);
  const [chatHasOlder, setChatHasOlder] = useState(false);

  const lastSyncedChatMessageKeyRef = useRef("");
  const activityRef = lastChatActivityAtRef || useRef(Date.now());

  const messages = useMemo(
    () => mergeChatMessages(olderMessages, liveMessages),
    [olderMessages, liveMessages]
  );

  const getActiveChatKey = () =>
    currentChatKey ||
    getChatIdForTab(normalizeTab(selectedTab) || "student", teacherUserId, selectedChatUser?.userId);

  useEffect(() => {
    if (!selectedChatUser || !teacherUserId) {
      lastSyncedChatMessageKeyRef.current = "";
      setLiveMessages([]);
      setOlderMessages([]);
      setChatHasOlder(false);
      setChatLoading(false);
      setChatLoadingOlder(false);
      if (chatScrollRestoreRef) chatScrollRestoreRef.current = null;
      return undefined;
    }

    const chatKey = getActiveChatKey();
    setLiveMessages([]);
    setOlderMessages([]);
    lastSyncedChatMessageKeyRef.current = "";
    setChatHasOlder(false);
    setChatLoading(true);
    setChatLoadingOlder(false);
    if (chatScrollRestoreRef) chatScrollRestoreRef.current = null;

    let cancelled = false;
    let syncInFlight = false;

    const syncLatestMessages = async ({ force = false } = {}) => {
      const isVisible = typeof document === "undefined" || document.visibilityState === "visible";
      const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
      const isRecentlyActive = Date.now() - activityRef.current <= CHAT_POLL_IDLE_GRACE_MS;
      if (!force && (!isVisible || !isOnline || !isRecentlyActive)) {
        return;
      }

      if (syncInFlight) return;
      syncInFlight = true;

      try {
        const afterMessageKey = !force ? lastSyncedChatMessageKeyRef.current : "";
        let replaceMessages = !afterMessageKey;
        let appliedMessages = [];

        if (afterMessageKey) {
          const incrementalResult = await fetchChatMessagesPage({
            chatKey,
            afterMessageKey,
            teacherUserId,
            rtdbBase,
          });

          if (incrementalResult.overflowed) {
            const snapshotResult = await fetchChatMessagesPage({
              chatKey,
              teacherUserId,
              rtdbBase,
            });
            appliedMessages = snapshotResult.messages;
            replaceMessages = true;
          } else {
            appliedMessages = incrementalResult.messages;
            replaceMessages = false;
          }
        } else {
          const snapshotResult = await fetchChatMessagesPage({
            chatKey,
            teacherUserId,
            rtdbBase,
          });
          appliedMessages = snapshotResult.messages;
        }

        if (cancelled) return;

        if (replaceMessages) {
          lastSyncedChatMessageKeyRef.current = getLastChatMessageKey(appliedMessages);
          setLiveMessages(appliedMessages);
          setChatHasOlder((previousValue) =>
            previousValue || appliedMessages.length >= CHAT_HISTORY_PAGE_SIZE
          );
        } else if (appliedMessages.length) {
          setLiveMessages((previousMessages) => {
            const nextMessages = mergeChatMessages(previousMessages, appliedMessages);
            lastSyncedChatMessageKeyRef.current = getLastChatMessageKey(nextMessages);
            return nextMessages;
          });
        }

        setChatLoading(false);

        const unseenIncomingMessages = appliedMessages.filter(
          (message) => message && !message.seen && message.receiverId === teacherUserId
        );

        if (unseenIncomingMessages.length) {
          const seenAt = Date.now();
          const seenPatch = unseenIncomingMessages.reduce((result, message) => {
            const messageId = String(message?.id || message?.messageId || "").trim();
            if (!messageId) return result;
            result[`messages/${messageId}/seen`] = true;
            result[`messages/${messageId}/seenAt`] = seenAt;
            return result;
          }, {});

          await Promise.all([
            axios.patch(buildRtdbUrl(rtdbBase, `Chats/${chatKey}`), seenPatch),
            patchChatSummary({
              ownerUserId: teacherUserId,
              chatKey,
              patch: buildChatSummaryUpdate({
                chatId: chatKey,
                otherUserId: selectedChatUser.userId,
                unreadCount: 0,
                lastMessageSeen: true,
                lastMessageSeenAt: seenAt,
              }),
              rtdbBase,
            }),
          ]);

          if (cancelled) return;

          setLiveMessages((previousMessages) =>
            previousMessages.map((message) => {
              const messageId = String(message?.id || message?.messageId || "").trim();
              if (!messageId || !seenPatch[`messages/${messageId}/seen`]) {
                return message;
              }

              return {
                ...message,
                seen: true,
                seenAt,
              };
            })
          );
          syncTeacherSummaryCache({ chatKey, rtdbBase, teacherUserId });
        }

        if (typeof setUnreadCounts === "function") {
          setUnreadCounts((previousCounts) => ({
            ...previousCounts,
            [selectedChatUser.userId]: 0,
          }));
        }
      } catch (error) {
        console.error("Chat listener failed:", error);
        if (!cancelled) {
          lastSyncedChatMessageKeyRef.current = "";
          setLiveMessages([]);
          setOlderMessages([]);
          setChatHasOlder(false);
          setChatLoading(false);
        }
      } finally {
        syncInFlight = false;
      }
    };

    const handleFocusedRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      activityRef.current = Date.now();
      void syncLatestMessages({ force: true });
    };

    void syncLatestMessages({ force: true });
    const intervalId = window.setInterval(() => {
      void syncLatestMessages();
    }, CHAT_MESSAGE_POLL_INTERVAL_MS);
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
  }, [
    selectedChatUser,
    teacherUserId,
    currentChatKey,
    selectedTab,
    resolvedSchoolCode,
    teacherSchoolCode,
    rtdbBase,
    activityRef,
    chatMessagesRef,
    chatScrollRestoreRef,
  ]);

  const loadOlderMessages = async () => {
    if (
      chatLoading ||
      chatLoadingOlder ||
      !selectedChatUser ||
      !teacherUserId ||
      messages.length === 0
    ) {
      return;
    }

    const oldestMessageKey = String(messages[0]?.id || messages[0]?.messageId || "").trim();
    if (!oldestMessageKey) {
      setChatHasOlder(false);
      return;
    }

    const scrollContainer = chatMessagesRef?.current;
    if (scrollContainer) {
      if (chatScrollRestoreRef) {
        chatScrollRestoreRef.current = {
          previousScrollHeight: scrollContainer.scrollHeight,
          previousScrollTop: scrollContainer.scrollTop,
        };
      }
    }

    setChatLoadingOlder(true);

    try {
      const chatKey = getActiveChatKey();
      if (!chatKey) {
        if (chatScrollRestoreRef) chatScrollRestoreRef.current = null;
        return;
      }

      const { messages: olderMessagesPage } = await fetchChatMessagesPage({
        chatKey,
        beforeMessageKey: oldestMessageKey,
        teacherUserId,
        rtdbBase,
      });

      if (!olderMessagesPage.length) {
        setChatHasOlder(false);
        if (chatScrollRestoreRef) chatScrollRestoreRef.current = null;
        return;
      }

      setOlderMessages((previousMessages) => mergeChatMessages(olderMessagesPage, previousMessages));
      setChatHasOlder(olderMessagesPage.length >= CHAT_HISTORY_PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load older messages:", error);
      if (chatScrollRestoreRef) chatScrollRestoreRef.current = null;
    } finally {
      setChatLoadingOlder(false);
    }
  };

  return {
    messages,
    liveMessages,
    olderMessages,
    chatLoading,
    chatLoadingOlder,
    chatHasOlder,
    setChatHasOlder,
    setChatLoading,
    setChatLoadingOlder,
    setLiveMessages,
    setOlderMessages,
    loadOlderMessages,
  };
};
