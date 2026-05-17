import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { chatService } from "../services/chatService";
import { useNavigate, useLocation } from "react-router-dom";
import { FaPaperPlane, FaCheck, FaImage, FaTimes } from "react-icons/fa";
import { increment, ref as dbRef, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, db, schoolPath } from "../firebase";
import { getRtdbRoot } from "../api/rtdbScope";
import {
  buildChatMessageQuery,
  buildChatSummaryPath,
  buildChatSummaryUpdate,
  filterChatMessageRows,
  getLastChatMessageKey,
} from "../utils/chatRtdb";
import {
  clearCachedChatSummary,
  buildUnreadConversationMap,
  fetchTeacherConversationSummaries,
  readSessionResource,
  resolveTeacherSchoolCode,
  writeSessionResource,
} from "../utils/teacherData";
import {
  buildUnreadSessionKey,
  compressImageToJpeg,
  createPlaceholderAvatar,
  deleteStorageObjectByUrl,
  formatDateLabel,
  formatTime,
  mergeChatMessages,
  getChatIdForTab,
  normalizeTab,
} from "../utils/chatHelpers";

import { usePresence } from "../hooks/usePresence";
import { useTeacherSession } from "../hooks/useTeacherSession";
import { useContacts } from "../hooks/useContacts";

import ContactList from "./chat/ContactList";
import MessageThread from "./chat/MessageThread";
import MessageInput from "./chat/MessageInput";
import ImagePreviewOverlay from "./chat/ImagePreviewOverlay";
import MessageActionMenu from "./chat/MessageActionMenu";
import styles from "./chat/AllChat.module.css";

const CHAT_POLL_IDLE_GRACE_MS = 2 * 60 * 1000;
const UNREAD_SUMMARY_TTL_MS = 3 * 60 * 1000;
// Debounce delay for showing/hiding the search/filter card while scrolling.
const SEARCH_CARD_DEBOUNCE_MS = 280;
// Ignore tiny scroll jitter smaller than this pixel delta.
const SCROLL_DELTA_THRESHOLD_PX = 14;
// Consider the list near the top when scrollTop is within this pixel range.
const SCROLL_NEAR_TOP_PX = 8;
// Consider the list near the bottom when remaining scroll distance is within this pixel range.
const SCROLL_NEAR_BOTTOM_PX = 6;
// Idle timeout before hiding search/filter card after scroll settles.
const SEARCH_CARD_IDLE_TIMEOUT_MS = 1000;
const CHAT_MESSAGE_POLL_INTERVAL_MS = 2 * 60 * 1000;
const CHAT_HISTORY_PAGE_SIZE = 50;
const UNREAD_REFRESH_MIN_INTERVAL_MS = 15 * 1000;
const CHAT_FOCUS_SYNC_COOLDOWN_MS = 8 * 1000;
const rtdbBase = getRtdbRoot();
const buildRtdbUrl = (path) => `${rtdbBase}/${String(path || "").replace(/^\/+/, "")}.json`;

/**
 * AllChat main orchestration component for teacher chat UI.
 * Handles chat state, message CRUD, presence, and layout.
 *
 * @returns {JSX.Element}
 */
export default function AllChat() {
  // Error notification state
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // basic refs and state (minimal set to avoid ReferenceErrors)
  const lastSyncedChatMessageKeyRef = useRef("");
  const chatScrollRestoreRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const chatMessagesRef = useRef(null);
  const chatEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const contactScrollRef = useRef(null);
  const previousContactScrollTopRef = useRef(0);
  const searchCardDebounceTimerRef = useRef(null);
  const searchCardIdleTimerRef = useRef(null);
  const lastUnreadRefreshAtRef = useRef(0);
  const lastForcedChatSyncAtRef = useRef(0);

  const lastChatActivityAtRef = useRef(Date.now());

  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const { teacher, teacherUserId, teacherSchoolCode } = useTeacherSession();
  const [liveMessages, setLiveMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const messages = useMemo(
    () => mergeChatMessages(olderMessages, liveMessages),
    [olderMessages, liveMessages]
  );
  const [chatHasOlder, setChatHasOlder] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLoadingOlder, setChatLoadingOlder] = useState(false);
  const [currentChatKey, setCurrentChatKey] = useState(null);

  const [selectedTab, setSelectedTab] = useState("student");
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState("");

  const [searchText, setSearchText] = useState("");
  const [selectedStudentGrade, setSelectedStudentGrade] = useState("All");
  const [selectedStudentSection, setSelectedStudentSection] = useState("All");
  const [showStudentFilters, setShowStudentFilters] = useState(false);
  const [showSearchFilterCard, setShowSearchFilterCard] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [editingMessages, setEditingMessages] = useState({});
  const [clickedMessageId, setClickedMessageId] = useState(null);
  const [imageMenu, setImageMenu] = useState({ open: false, message: null });
  const [textMenu, setTextMenu] = useState({ open: false, message: null });
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [imageSending, setImageSending] = useState(false);
  const [input, setInput] = useState("");
  const refreshUnreadCountsRef = useRef(async () => {});

  const { students, parents, admins, loadingContacts } = useContacts({
    teacherUserId,
    resolvedSchoolCode,
    teacherSchoolCode,
    rtdbBase,
    selectedTab,
    teacher,
  });

  // Set of all allowed userIds for message sending
  const allowedUserIds = useMemo(
    () =>
      new Set([
        ...students.map((u) => String(u.userId)),
        ...parents.map((u) => String(u.userId)),
        ...admins.map((u) => String(u.userId)),
      ]),
    [students, parents, admins]
  );

  const unreadContactCandidates = useMemo(() => {
    const sourceContacts = [...students, ...parents, ...admins];
    const byUserId = new Map();
    sourceContacts.forEach((contact) => {
      const userId = String(contact?.userId || "").trim();
      if (!userId || byUserId.has(userId)) return;
      byUserId.set(userId, contact);
    });
    return Array.from(byUserId.values());
  }, [students, parents, admins]);

  const unreadContactCandidatesKey = useMemo(
    () => unreadContactCandidates.map((contact) => String(contact?.userId || "").trim()).sort().join("|"),
    [unreadContactCandidates]
  );

  const createMessageId = useCallback(
    () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  const fetchChatMessagesPage = useCallback(async ({ chatKey, beforeMessageKey, afterMessageKey }) => {
    if (!chatKey) return { messages: [], overflowed: false };

    const response = await axios.get(buildRtdbUrl(`Chats/${chatKey}/messages`), {
      params: buildChatMessageQuery({
        pageSize: CHAT_HISTORY_PAGE_SIZE,
        beforeMessageKey,
        afterMessageKey,
      }),
    });

    const messageRows = Object.entries(response?.data || {})
      .map(([id, message]) => ({
        id,
        messageId: id,
        ...message,
        isTeacher: message?.senderId === teacherUserId,
      }))
      .sort((leftMessage, rightMessage) => Number(leftMessage?.timeStamp || 0) - Number(rightMessage?.timeStamp || 0));

    const page = filterChatMessageRows(messageRows, {
      beforeMessageKey,
      afterMessageKey,
    });

    return {
      messages: page,
      overflowed: Boolean(afterMessageKey) && page.length > CHAT_HISTORY_PAGE_SIZE,
    };
  }, [teacherUserId]);

  const patchChatSummary = useCallback(async (ownerUserId, chatKey, patch) => {
    const normalizedOwnerUserId = String(ownerUserId || "").trim();
    if (!normalizedOwnerUserId || !chatKey || !patch || typeof patch !== "object") return;

    await axios.patch(buildRtdbUrl(buildChatSummaryPath(normalizedOwnerUserId, chatKey)), patch);
  }, []);

  const syncTeacherSummaryCache = useCallback((chatKey) => {
    if (!chatKey || !teacherUserId) return;
    clearCachedChatSummary({
      rtdbBase,
      chatId: chatKey,
      teacherUserId,
    });
  }, [teacherUserId]);

  const updateLocalMessage = useCallback((targetId, updater) => {
    const normalizeMessageId = (message) => String(message?.id || message?.messageId || "").trim();
    const normalizedTargetId = String(targetId || "").trim();

    const applyUpdate = (messagesSource) =>
      messagesSource.map((message) => {
        if (normalizeMessageId(message) !== normalizedTargetId) return message;
        return updater(message);
      });

    setLiveMessages((previousMessages) => applyUpdate(previousMessages));
    setOlderMessages((previousMessages) => applyUpdate(previousMessages));
  }, []);

  

/* ================= CHAT LISTENER ================= */
  useEffect(() => {
    if (!selectedChatUser || !teacherUserId) {
      lastSyncedChatMessageKeyRef.current = "";
      setLiveMessages([]);
      setOlderMessages([]);
      setChatHasOlder(false);
      setChatLoading(false);
      setChatLoadingOlder(false);
      chatScrollRestoreRef.current = null;
      return undefined;
    }

    const chatKey =
      currentChatKey ||
      getChatIdForTab(normalizeTab(selectedTab) || "student", teacherUserId, selectedChatUser.userId);
    setCurrentChatKey(chatKey); // ensure state is in sync

    setLiveMessages([]);
    setOlderMessages([]);
  lastSyncedChatMessageKeyRef.current = "";
    setChatHasOlder(false);
    setChatLoading(true);
    setChatLoadingOlder(false);
    chatScrollRestoreRef.current = null;
    let cancelled = false;
    let syncInFlight = false;

    const syncLatestMessages = async ({ force = false } = {}) => {
      const isVisible = typeof document === "undefined" || document.visibilityState === "visible";
      const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
      const isRecentlyActive = Date.now() - lastChatActivityAtRef.current <= CHAT_POLL_IDLE_GRACE_MS;
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
          });

          if (incrementalResult.overflowed) {
            const snapshotResult = await fetchChatMessagesPage({ chatKey });
            appliedMessages = snapshotResult.messages;
            replaceMessages = true;
          } else {
            appliedMessages = incrementalResult.messages;
            replaceMessages = false;
          }
        } else {
          const snapshotResult = await fetchChatMessagesPage({ chatKey });
          appliedMessages = snapshotResult.messages;
        }

        if (cancelled) return;

        if (replaceMessages) {
          lastSyncedChatMessageKeyRef.current = getLastChatMessageKey(appliedMessages);
          setLiveMessages(appliedMessages);
          setChatHasOlder((previousValue) => previousValue || appliedMessages.length >= CHAT_HISTORY_PAGE_SIZE);
        } else if (appliedMessages.length) {
          setLiveMessages((previousMessages) => {
            const nextMessages = mergeChatMessages(previousMessages, appliedMessages);
            lastSyncedChatMessageKeyRef.current = getLastChatMessageKey(nextMessages);
            return nextMessages;
          });
        }

        if (afterMessageKey && appliedMessages.length) {
          void refreshUnreadCountsRef.current({ force: true });
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
            axios.patch(buildRtdbUrl(`Chats/${chatKey}`), seenPatch),
            patchChatSummary(
              teacherUserId,
              chatKey,
              buildChatSummaryUpdate({
                chatId: chatKey,
                otherUserId: selectedChatUser.userId,
                unreadCount: 0,
                lastMessageSeen: true,
                lastMessageSeenAt: seenAt,
              })
            ),
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
          syncTeacherSummaryCache(chatKey);
        }

        setUnreadCounts((previousCounts) => ({
          ...previousCounts,
          [selectedChatUser.userId]: 0,
        }));
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
      const now = Date.now();
      if (now - lastForcedChatSyncAtRef.current < CHAT_FOCUS_SYNC_COOLDOWN_MS) {
        return;
      }
      lastForcedChatSyncAtRef.current = now;
      lastChatActivityAtRef.current = Date.now();
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
  }, [selectedChatUser, teacherUserId, currentChatKey, selectedTab]);

  

  const getActiveChatKey = useCallback(() => {
    if (!selectedChatUser || !teacherUserId) return null;
    return (
      currentChatKey ||
      getChatIdForTab(normalizeTab(selectedTab) || "student", teacherUserId, selectedChatUser.userId)
    );
  }, [selectedChatUser, teacherUserId, currentChatKey, selectedTab]);

  const { presence } = usePresence({
    contacts: { students, parents, admins, selectedTab },
    selectedChatUser,
    rtdbBase,
    lastChatActivityAtRef,
  });

  useEffect(() => {
    if (!teacherUserId || !rtdbBase) return undefined;

    const unreadSessionKey = buildUnreadSessionKey(resolvedSchoolCode || teacherSchoolCode, selectedTab);
    const cachedUnread = readSessionResource(unreadSessionKey, { ttlMs: UNREAD_SUMMARY_TTL_MS });
    if (cachedUnread && typeof cachedUnread === "object") {
      setUnreadCounts(cachedUnread);
    }

    let cancelled = false;

    const refreshUnreadCounts = async ({ force = false, hard = false } = {}) => {
      if (!force && typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      if (!hard && now - lastUnreadRefreshAtRef.current < UNREAD_REFRESH_MIN_INTERVAL_MS) {
        return;
      }

      try {
        const conversations = await fetchTeacherConversationSummaries({
          rtdbBase,
          teacherUserId,
          schoolCode: resolvedSchoolCode || teacherSchoolCode,
          contactCandidates: unreadContactCandidates,
          unreadOnly: true,
          force,
        });

        if (cancelled) return;

        const unreadMap = buildUnreadConversationMap(conversations);
        if (selectedChatUser?.userId) {
          unreadMap[String(selectedChatUser.userId)] = 0;
        }

        setUnreadCounts(unreadMap);
        writeSessionResource(unreadSessionKey, unreadMap);
        lastUnreadRefreshAtRef.current = Date.now();
      } catch {
        if (!cancelled) {
          setUnreadCounts({});
        }
      }
    };

    refreshUnreadCountsRef.current = refreshUnreadCounts;
    void refreshUnreadCounts({ force: true, hard: true });

    const handleFocusedUnreadRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      void refreshUnreadCounts({ force: true });
    };

    const handleVisibilityUnreadRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void refreshUnreadCounts({ force: true });
      }
    };

    window.addEventListener("focus", handleFocusedUnreadRefresh);
    window.addEventListener("online", handleFocusedUnreadRefresh);
    document.addEventListener("visibilitychange", handleVisibilityUnreadRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocusedUnreadRefresh);
      window.removeEventListener("online", handleFocusedUnreadRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityUnreadRefresh);
    };
  }, [
    teacherUserId,
    rtdbBase,
    resolvedSchoolCode,
    teacherSchoolCode,
    selectedTab,
    selectedChatUser?.userId,
    unreadContactCandidatesKey,
  ]);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selectedChatUser) return;
    if (!allowedUserIds.has(String(selectedChatUser.userId || ""))) return;

    const editingId = Object.keys(editingMessages).find((id) => editingMessages[id]);
    const chatKey = getActiveChatKey();
    if (!chatKey) return;

    if (editingId) {
      // Update existing message
      try {
        await chatService.editMessage({
          chatKey,
          messageId: editingId,
          newText: input,
          buildRtdbUrl,
        });
        setLiveMessages((previousMessages) =>
          previousMessages.map((message) =>
            String(message?.id || "") === String(editingId)
              ? { ...message, text: input, edited: true }
              : message
          )
        );
        setEditingMessages({});
        setClickedMessageId(null);
        setInput("");
      } catch (error) {
        setErrorMessage("Failed to edit message. Please try again.");
      }
    } else {
      // Send new message
      const messageId = createMessageId();
      const messageData = {
        messageId,
        senderId: teacherUserId,
        receiverId: selectedChatUser.userId,
        type: "text",
        text: input,
        seen: false,
        edited: false,
        deleted: false,
        timeStamp: Date.now(),
      };
      try {
        await chatService.sendTextMessage({
          chatKey,
          messageId,
          messageData,
          teacherUserId,
          selectedChatUser,
          buildChatSummaryUpdate,
          buildRtdbUrl,
          schoolPath,
          db,
        });
        syncTeacherSummaryCache(chatKey);
        setLiveMessages((previousMessages) => {
          const nextMessages = mergeChatMessages(previousMessages, [{ id: messageId, ...messageData, isTeacher: true }]);
          lastSyncedChatMessageKeyRef.current = getLastChatMessageKey(nextMessages);
          return nextMessages;
        });
        setInput("");
      } catch (error) {
        setErrorMessage("Failed to send message. Please try again.");
      }
    }
  }, [input, selectedChatUser, allowedUserIds, teacherUserId, editingMessages, getActiveChatKey, syncTeacherSummaryCache]);

  const sendImageMessage = useCallback(async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || !selectedChatUser || !teacherUserId) {
      if (event?.target) event.target.value = "";
      return;
    }
    if (!allowedUserIds.has(String(selectedChatUser.userId || ""))) {
      if (event?.target) event.target.value = "";
      return;
    }

    const chatKey = getActiveChatKey();
    if (!chatKey) {
      if (event?.target) event.target.value = "";
      return;
    }

    try {
      setImageSending(true);
      const messageId = createMessageId();
      const uploadedImageUrl = await chatService.sendImageMessage({
        chatKey,
        messageId,
        file,
        compressImageToJpeg,
        teacherUserId,
        selectedChatUser,
        buildChatSummaryUpdate,
        buildRtdbUrl,
        schoolPath,
        db,
      });
      const messageData = {
        messageId,
        senderId: teacherUserId,
        receiverId: selectedChatUser.userId,
        type: "image",
        text: "",
        imageUrl: uploadedImageUrl,
        seen: false,
        edited: false,
        deleted: false,
        timeStamp: Date.now(),
      };
      syncTeacherSummaryCache(chatKey);
      setLiveMessages((previousMessages) => {
        const nextMessages = mergeChatMessages(previousMessages, [{ id: messageId, ...messageData, isTeacher: true }]);
        lastSyncedChatMessageKeyRef.current = getLastChatMessageKey(nextMessages);
        return nextMessages;
      });
    } catch (error) {
      setErrorMessage("Failed to send image. Please try again.");
    } finally {
      setImageSending(false);
      if (event?.target) event.target.value = "";
    }
  }, [selectedChatUser, teacherUserId, allowedUserIds, getActiveChatKey, syncTeacherSummaryCache]);

  /* ================= EDIT / DELETE ================= */
  const handleEditMessage = useCallback(async (id, newText) => {
    const chatKey = getActiveChatKey();
    if (!chatKey) return;
    try {
      await chatService.editMessage({
        chatKey,
        messageId: id,
        newText,
        buildRtdbUrl,
      });
      updateLocalMessage(id, (message) => ({ ...message, text: newText, edited: true }));
    } catch (error) {
      setErrorMessage("Failed to edit message. Please try again.");
    }
    setEditingMessages((prev) => ({ ...prev, [id]: false }));
  }, [getActiveChatKey, updateLocalMessage]);

  const handleDeleteMessage = useCallback(async (id) => {
    const chatKey = getActiveChatKey();
    if (!chatKey) return;
    const targetMessage = messages.find(
      (message) => String(message?.id || message?.messageId || "").trim() === String(id || "").trim()
    );
    const imageUrl = String(targetMessage?.imageUrl || "").trim();
    try {
      await chatService.deleteMessage({
        chatKey,
        messageId: id,
        buildRtdbUrl,
      });
      updateLocalMessage(id, (message) => ({ ...message, deleted: true, imageUrl: "" }));
      if (imageUrl) {
        await chatService.deleteImage({ imageUrl, deleteStorageObjectByUrl });
      }
    } catch (error) {
      setErrorMessage("Failed to delete message. Please try again.");
    }
  }, [messages, getActiveChatKey, updateLocalMessage]);

  const startEditing = useCallback((id, text) => {
    setEditingMessages({ [id]: true });
    setInput(text);
    setClickedMessageId(id);
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (chatLoading || chatLoadingOlder || !selectedChatUser || !teacherUserId || messages.length === 0) {
      return;
    }

    const oldestMessageKey = String(messages[0]?.id || messages[0]?.messageId || "").trim();
    if (!oldestMessageKey) {
      setChatHasOlder(false);
      return;
    }

    const scrollContainer = chatMessagesRef.current;
    if (scrollContainer) {
      chatScrollRestoreRef.current = {
        previousScrollHeight: scrollContainer.scrollHeight,
        previousScrollTop: scrollContainer.scrollTop,
      };
    }

    setChatLoadingOlder(true);

    try {
      const chatKey = getActiveChatKey();
      if (!chatKey) {
        chatScrollRestoreRef.current = null;
        return;
      }

      const { messages: olderMessagesPage } = await fetchChatMessagesPage({
        chatKey,
        beforeMessageKey: oldestMessageKey,
      });

      if (!olderMessagesPage.length) {
        setChatHasOlder(false);
        chatScrollRestoreRef.current = null;
        return;
      }

      setOlderMessages((previousMessages) => mergeChatMessages(olderMessagesPage, previousMessages));
      setChatHasOlder(olderMessagesPage.length >= CHAT_HISTORY_PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load older messages:", error);
      chatScrollRestoreRef.current = null;
    } finally {
      setChatLoadingOlder(false);
    }
  }, [chatLoading, chatLoadingOlder, selectedChatUser, teacherUserId, messages, getActiveChatKey]);


  const displayItems = useMemo(() => {
    const items = [];
    let lastLabel = null;
    messages.forEach((m) => {
      const label = formatDateLabel(m.timeStamp);
      if (label && label !== lastLabel) {
        items.push({ type: "date", id: `date-${m.timeStamp}-${label}`, label });
        lastLabel = label;
      }
      items.push({ type: "message", ...m });
    });
    return items;
  }, [messages]);

  const beginImageLongPress = useCallback((message) => {
    clearTimeout(longPressTimerRef.current);
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setImageMenu({ open: true, message });
    }, 520);
  }, []);

  const cancelImageLongPress = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }, []);

  const beginTextLongPress = useCallback((message) => {
    clearTimeout(longPressTimerRef.current);
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setTextMenu({ open: true, message });
    }, 520);
  }, []);

  const handleTextBubbleClick = useCallback((messageId) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    setClickedMessageId(messageId);
  }, []);

  const handleImageClick = useCallback((imageUrl) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    setPreviewImageUrl(imageUrl);
  }, []);

  const handleDownloadImage = useCallback(async (message) => {
    try {
      const url = String(message?.imageUrl || "").trim();
      if (!url) return;
      const link = document.createElement("a");
      link.href = url;
      link.download = `chat-image-${message?.timeStamp || Date.now()}.jpg`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Image download failed:", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(longPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const restoreSnapshot = chatScrollRestoreRef.current;
    const scrollContainer = chatMessagesRef.current;

    if (restoreSnapshot && scrollContainer) {
      scrollContainer.scrollTop =
        restoreSnapshot.previousScrollTop +
        (scrollContainer.scrollHeight - restoreSnapshot.previousScrollHeight);
      chatScrollRestoreRef.current = null;
      return;
    }

    chatEndRef.current?.scrollIntoView({ behavior: messages.length > CHAT_HISTORY_PAGE_SIZE ? "auto" : "smooth" });
  }, [messages]);

  const list = useMemo(() => {
    let base = selectedTab === "student" ? students : selectedTab === "parent" ? parents : admins;

    if (selectedTab === "student") {
      base = base.filter((student) => {
        const grade = String(student?.grade || "").trim();
        const section = String(student?.section || "").trim().toUpperCase();
        if (selectedStudentGrade !== "All" && grade !== selectedStudentGrade) return false;
        if (selectedStudentSection !== "All" && section !== selectedStudentSection) return false;
        return true;
      });
    }

    const q = searchText.trim().toLowerCase();
    if (!q) return base;
    return base.filter((u) => {
      const name = String(u?.name || "").toLowerCase();
      const username = String(u?.username || "").toLowerCase();
      const userId = String(u?.userId || "").toLowerCase();
      const title = String(u?.title || "").toLowerCase();
      return name.includes(q) || username.includes(q) || userId.includes(q) || title.includes(q);
    });
  }, [selectedTab, students, parents, admins, searchText, selectedStudentGrade, selectedStudentSection]);

  const availableStudentGrades = useMemo(() => {
    const gradeSet = new Set();
    students.forEach((student) => {
      const grade = String(student?.grade || "").trim();
      if (grade) gradeSet.add(grade);
    });
    return ["All", ...Array.from(gradeSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }, [students]);

  const availableStudentSections = useMemo(() => {
    const sectionSet = new Set();
    students.forEach((student) => {
      const section = String(student?.section || "").trim().toUpperCase();
      if (section) sectionSet.add(section);
    });
    return ["All", ...Array.from(sectionSet).sort((a, b) => a.localeCompare(b))];
  }, [students]);

  const isUserOnline = useCallback((userId) => {
    if (!userId) return false;
    // try to resolve presence entry for multiple key shapes
    const findPresence = () => {
      // direct key
      if (presence?.[userId] !== undefined) return presence[userId];
      // string form
      const s = String(userId);
      if (presence?.[s] !== undefined) return presence[s];
      // try numeric key
      const n = Number(userId);
      if (!Number.isNaN(n) && presence?.[n] !== undefined) return presence[n];
      // try to find an entry where entry.userId matches
      for (const [, val] of Object.entries(presence || {})) {
        try {
          if (val && (val.userId === userId || String(val.userId) === s)) return val;
        } catch (e) {
          // ignore
        }
      }
      return undefined;
    };

    const p = findPresence();
    if (p == null) return false;
    if (typeof p === 'boolean') return p === true;
    if (typeof p === 'object') {
      if (p.state === 'online' || p.online === true) return true;
      if (p.lastSeen) {
        const last = Number(p.lastSeen) || 0;
        return Date.now() - last < 60_000;
      }
      // if presence value itself is a timestamp
      if (typeof p === 'number') {
        return Date.now() - p < 60_000;
      }
    }
    return false;
  }, [presence]);

  const getLastSeenText = useCallback((userId) => {
    const p = presence?.[userId];
    if (!p) return null;
    // accept numeric timestamp or object with common timestamp keys
    let ts = null;
    if (typeof p === 'number' || /^[0-9]+$/.test(String(p))) ts = Number(p);
    if (typeof p === 'object') ts = p.lastSeen || p.timestamp || p.lastActive || p.last_seen || p.time || null;
    if (!ts) return null;
    const diff = Date.now() - Number(ts);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'last seen just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `last seen ${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `last seen ${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `last seen ${days}d ago`;
    return `last seen on ${new Date(ts).toLocaleDateString()}`;
  }, [presence]);

  const setSearchFilterCardVisibility = useCallback((visible, { debounced = true } = {}) => {
    if (searchCardDebounceTimerRef.current) {
      clearTimeout(searchCardDebounceTimerRef.current);
      searchCardDebounceTimerRef.current = null;
    }

    if (!debounced) {
      setShowSearchFilterCard(Boolean(visible));
      return;
    }

    searchCardDebounceTimerRef.current = setTimeout(() => {
      setShowSearchFilterCard(Boolean(visible));
      searchCardDebounceTimerRef.current = null;
    }, SEARCH_CARD_DEBOUNCE_MS);
  }, []);

  const handleContactListScroll = useCallback((event) => {
    const container = event?.currentTarget;
    if (!container) return;

    const currentTop = Number(container.scrollTop || 0);
    const previousTop = Number(previousContactScrollTopRef.current || 0);
    const delta = Math.abs(currentTop - previousTop);
    previousContactScrollTopRef.current = currentTop;

    if (delta < SCROLL_DELTA_THRESHOLD_PX) {
      return;
    }

    const nearTop = currentTop <= SCROLL_NEAR_TOP_PX;
    const remainingBottomDistance =
      Number(container.scrollHeight || 0) - (currentTop + Number(container.clientHeight || 0));
    const nearBottom = remainingBottomDistance <= SCROLL_NEAR_BOTTOM_PX;

    setSearchFilterCardVisibility(nearTop || nearBottom, { debounced: true });

    if (searchCardIdleTimerRef.current) {
      clearTimeout(searchCardIdleTimerRef.current);
      searchCardIdleTimerRef.current = null;
    }
    searchCardIdleTimerRef.current = setTimeout(() => {
      setSearchFilterCardVisibility(false, { debounced: false });
      searchCardIdleTimerRef.current = null;
    }, SEARCH_CARD_IDLE_TIMEOUT_MS);
  }, [setSearchFilterCardVisibility]);

  useEffect(() => {
    return () => {
      if (searchCardDebounceTimerRef.current) {
        clearTimeout(searchCardDebounceTimerRef.current);
      }
      if (searchCardIdleTimerRef.current) {
        clearTimeout(searchCardIdleTimerRef.current);
      }
    };
  }, []);

  const tabTitle = selectedTab === "admin" ? "Management" : selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1);
  const listCount = list.length;
  const isStudentFilterActive =
    selectedStudentGrade !== "All" || selectedStudentSection !== "All";

  return (
    <div
      className={styles.allChatLayout}
      aria-label="All Chat Main Layout"
    >
      {errorMessage && (
        <div className={styles.errorBanner} role="alert" aria-live="assertive">
          {errorMessage}
          <button
            className={styles.errorBannerDismiss}
            aria-label="Dismiss error notification"
            onClick={() => setErrorMessage("")}
          >
            &times;
          </button>
        </div>
      )}
      {/* ===== SIDEBAR / USER LIST ===== */}
      <ContactList
        navigate={navigate}
        isMobile={false}
        selectedTab={selectedTab}
        selectedChatUser={selectedChatUser}
        sidebarOpen={sidebarOpen}
        setSelectedTab={setSelectedTab}
        setSelectedChatUser={setSelectedChatUser}
        setCurrentChatKey={setCurrentChatKey}
        setSelectedStudentGrade={setSelectedStudentGrade}
        setSelectedStudentSection={setSelectedStudentSection}
        setShowStudentFilters={setShowStudentFilters}
        showSearchFilterCard={showSearchFilterCard}
        showStudentFilters={showStudentFilters}
        isStudentFilterActive={isStudentFilterActive}
        tabTitle={tabTitle}
        listCount={listCount}
        searchText={searchText}
        setSearchText={setSearchText}
        availableStudentGrades={availableStudentGrades}
        availableStudentSections={availableStudentSections}
        students={students}
        parents={parents}
        admins={admins}
        loadingContacts={loadingContacts}
        list={list}
        unreadCounts={unreadCounts}
        createPlaceholderAvatar={createPlaceholderAvatar}
        isUserOnline={isUserOnline}
        getLastSeenText={getLastSeenText}
        setUnreadCounts={setUnreadCounts}
        setSidebarOpen={setSidebarOpen}
        handleContactListScroll={handleContactListScroll}
        contactScrollRef={contactScrollRef}
      />

      {/* ===== CHAT ===== */}
      <div
        className={styles.chatPanel}
        aria-label="Chat Panel"
      >
        {selectedChatUser ? (
          <>
            {/* ===== CHAT HEADER ===== */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderUserInfo} aria-label="Chat Header User Info">
                <img
                  src={selectedChatUser.profileImage}
                  alt={selectedChatUser.name}
                  aria-label="User profile image"
                  onError={(e) => {
                    const fallback = createPlaceholderAvatar(selectedChatUser?.name || "User");
                    if (e.currentTarget.src === fallback) return;
                    e.currentTarget.src = fallback;
                  }}
                  className={styles.chatHeaderAvatar}
                />
                <div className={styles.chatHeaderNameCol} aria-label="User name and status">
                  <span className={styles.chatHeaderName}>{selectedChatUser.name}</span>
                  <span style={{ fontSize: 12, color: isUserOnline(selectedChatUser.userId) ? "#16A34A" : "#64748b" }}>
                    {isUserOnline(selectedChatUser.userId)
                      ? "Online"
                      : getLastSeenText(selectedChatUser.userId) || tabTitle}
                  </span>
                </div>
              </div>
              <div className={styles.chatHeaderStats} aria-label="Chat header stats">
                <span className={styles.chatHeaderTabBadge}>
                  {tabTitle}
                </span>
                <span className={styles.chatHeaderCountBadge}>
                  {messages.length} messages
                </span>
              </div>
            </div>

            {/* ===== CHAT MESSAGES ===== */}
            <div
              ref={chatMessagesRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                background: "#ffffff",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
              }}
            >
              {chatLoading && !messages.length ? (
                <div style={{ alignSelf: "center", marginBottom: 12, fontSize: 12, color: "#64748b" }}>
                  Loading messages...
                </div>
              ) : null}

              {chatHasOlder || chatLoadingOlder ? (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <button
                    onClick={loadOlderMessages}
                    disabled={chatLoadingOlder}
                    aria-label="Load older messages"
                    style={{
                      borderRadius: 999,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#334155",
                      padding: "7px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: chatLoadingOlder ? "not-allowed" : "pointer",
                      opacity: chatLoadingOlder ? 0.7 : 1,
                    }}
                  >
                    {chatLoadingOlder ? "Loading older messages..." : "Load older messages"}
                  </button>
                </div>
              ) : null}

              {displayItems.map((item, index) => {
                if (item.type === "date") {
                  return (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 12px" }}>
                      <div style={{ flex: 1, height: 1, background: "#dbe7ff" }} />
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{item.label}</span>
                      <div style={{ flex: 1, height: 1, background: "#dbe7ff" }} />
                    </div>
                  );
                }

                const m = item;
                const isTeacher = m.isTeacher;
                const isEditing = !!editingMessages[m.id];
                const isImageMessage = String(m?.type || "").toLowerCase() === "image" && !!m?.imageUrl;
                const isDeletedMessage = !!m?.deleted;
                const prev = index > 0 ? displayItems[index - 1] : null;
                const prevSameSender = prev && prev.type === "message" && prev.senderId === m.senderId;

                return (
                  <div
                    key={m.id}
                    className={`${styles.messageRow} ${isTeacher ? styles.messageRowSent : styles.messageRowReceived}`}
                  >
                    <div
                      onClick={() => handleTextBubbleClick(m.id)}
                      onMouseDown={
                        isTeacher && !m.deleted && !isImageMessage
                          ? () => beginTextLongPress(m)
                          : undefined
                      }
                      onMouseUp={
                        isTeacher && !m.deleted && !isImageMessage
                          ? cancelImageLongPress
                          : undefined
                      }
                      onMouseLeave={
                        isTeacher && !m.deleted && !isImageMessage
                          ? cancelImageLongPress
                          : undefined
                      }
                      onTouchStart={
                        isTeacher && !m.deleted && !isImageMessage
                          ? () => beginTextLongPress(m)
                          : undefined
                      }
                      onTouchEnd={
                        isTeacher && !m.deleted && !isImageMessage
                          ? cancelImageLongPress
                          : undefined
                      }
                      onTouchCancel={
                        isTeacher && !m.deleted && !isImageMessage
                          ? cancelImageLongPress
                          : undefined
                      }
                      onContextMenu={
                        isTeacher && !m.deleted && !isImageMessage
                          ? (event) => {
                              event.preventDefault();
                              setTextMenu({ open: true, message: m });
                            }
                          : undefined
                      }
                      className={`${styles.messageBubble} ${isTeacher ? styles.messageBubbleSent : styles.messageBubbleReceived}`}
                      style={{
                        maxWidth: "76%",
                        padding: isImageMessage ? 6 : "9px 13px",
                      }}
                    >
                      {!isTeacher && !prevSameSender ? (
                        <div
                          style={{
                            position: "absolute",
                            left: -6,
                            bottom: -2,
                            width: 0,
                            height: 0,
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderBottom: "8px solid #f6f7fb",
                            transform: "rotate(180deg)",
                          }}
                        />
                      ) : null}

                      {isTeacher && !prevSameSender ? (
                        <div
                          style={{
                            position: "absolute",
                            right: -20,
                            bottom: -2,
                            width: 0,
                            height: 0,
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderBottom: "8px solid #007AFB",
                          }}
                        />
                      ) : null}

                      {isDeletedMessage ? (
                        <>
                          <span
                            style={{
                              fontStyle: "italic",
                              color: isTeacher ? "rgba(255,255,255,0.92)" : "#64748b",
                            }}
                          >
                            This message is deleted
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 6,
                              marginTop: 6,
                              fontSize: 10,
                              color: isTeacher ? "rgba(255,255,255,0.85)" : "#64748b",
                            }}
                          >
                            <span>{formatTime(m.timeStamp)}</span>
                            {isTeacher ? (
                              <span style={{ display: "flex", gap: 0 }}>
                                <FaCheck size={10} color="#fff" style={{ opacity: 0.82 }} />
                                {m.seen ? <FaCheck size={10} color="#ffffff" style={{ marginLeft: 2, opacity: 0.98 }} /> : null}
                              </span>
                            ) : null}
                          </div>
                        </>
                      ) : isImageMessage ? (
                        <div
                          style={{ width: 240, position: "relative" }}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleImageClick(m.imageUrl);
                          }}
                          onMouseDown={() => beginImageLongPress(m)}
                          onMouseUp={cancelImageLongPress}
                          onMouseLeave={cancelImageLongPress}
                          onTouchStart={() => beginImageLongPress(m)}
                          onTouchEnd={cancelImageLongPress}
                          onTouchCancel={cancelImageLongPress}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            setImageMenu({ open: true, message: m });
                          }}
                        >
                          <img
                            src={m.imageUrl}
                            alt="Chat"
                            style={{
                              width: "100%",
                              maxHeight: 220,
                              objectFit: "cover",
                              borderRadius: 12,
                              display: "block",
                              background: isTeacher ? "#0b61c3" : "#e2e8f0",
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              right: 8,
                              bottom: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              background: isTeacher ? "rgba(2,6,23,0.24)" : "rgba(255,255,255,0.82)",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 10,
                              color: isTeacher ? "#f8fafc" : "#475569",
                            }}
                          >
                            <span>{formatTime(m.timeStamp)}</span>
                            {isTeacher && !m.deleted ? (
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <FaCheck size={10} color="#fff" style={{ opacity: 0.82 }} />
                                {m.seen ? <FaCheck size={10} color="#ffffff" style={{ marginLeft: 2, opacity: 0.98 }} /> : null}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <>
                          {m.text}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 6,
                              marginTop: 6,
                              fontSize: 10,
                              color: isTeacher ? "rgba(255,255,255,0.85)" : "#64748b",
                            }}
                          >
                            {m.edited ? (
                              <span style={{ fontSize: 10, fontStyle: "italic", opacity: 0.95 }}>
                                edited
                              </span>
                            ) : null}
                            <span>{formatTime(m.timeStamp)}</span>
                            {isTeacher && !m.deleted ? (
                              <span style={{ display: "flex", gap: 0 }}>
                                <FaCheck size={10} color="#fff" style={{ opacity: 0.82 }} />
                                {m.seen ? <FaCheck size={10} color="#ffffff" style={{ marginLeft: 2, opacity: 0.98 }} /> : null}
                              </span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* ===== INPUT ===== */}
            <div className={styles.inputBar}>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={sendImageMessage}
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className={styles.attachButton}
                style={{
                  cursor: imageSending ? "not-allowed" : "pointer",
                  opacity: imageSending ? 0.65 : 1,
                }}
                disabled={imageSending}
                aria-label="Attach image"
              >
                <FaImage />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey) return;
                  event.preventDefault();
                  void sendMessage();
                }}
                placeholder={Object.values(editingMessages).some(Boolean) ? "Edit your message..." : "Type a message..."}
                className={styles.messageInput}
              />
              <div className={styles.sendButtonWrapper}>
                <button
                  onClick={sendMessage}
                  className={styles.sendButton}
                  aria-label="Send message"
                  disabled={imageSending}
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>

            {previewImageUrl ? (
              <div
                onClick={() => setPreviewImageUrl("")}
                className={`${styles.overlayBase} ${styles.previewOverlay}`}
              >
                <button
                  onClick={() => setPreviewImageUrl("")}
                  className={styles.previewCloseButton}
                  aria-label="Close image"
                >
                  <FaTimes />
                </button>
                <img
                  src={previewImageUrl}
                  alt="Preview"
                  onClick={(event) => event.stopPropagation()}
                  className={styles.previewImage}
                />
              </div>
            ) : null}

            {imageMenu.open ? (
              <div
                onClick={() => setImageMenu({ open: false, message: null })}
                className={`${styles.overlayBase} ${styles.sheetOverlay} ${styles.imageMenuOverlay}`}
              >
                <div
                  onClick={(event) => event.stopPropagation()}
                  className={styles.overlayPanel}
                >
                  <button
                    onClick={async () => {
                      await handleDownloadImage(imageMenu.message);
                      setImageMenu({ open: false, message: null });
                    }}
                    className={`${styles.overlayActionButton} ${styles.overlayActionDivider} ${styles.overlayActionPrimary}`}
                  >
                    Download image
                  </button>
                  {imageMenu?.message?.isTeacher ? (
                    <button
                      onClick={() => {
                        if (imageMenu?.message?.id) {
                          handleDeleteMessage(imageMenu.message.id);
                        }
                        setImageMenu({ open: false, message: null });
                      }}
                      className={`${styles.overlayActionButton} ${styles.overlayActionDivider} ${styles.overlayActionDanger}`}
                    >
                      Delete image
                    </button>
                  ) : null}
                  <button
                    onClick={() => setImageMenu({ open: false, message: null })}
                    className={`${styles.overlayActionButton} ${styles.overlayActionMuted}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {textMenu.open ? (
              <div
                onClick={() => setTextMenu({ open: false, message: null })}
                className={`${styles.overlayBase} ${styles.sheetOverlay} ${styles.textMenuOverlay}`}
              >
                <div
                  onClick={(event) => event.stopPropagation()}
                  className={styles.overlayPanel}
                >
                  <button
                    onClick={() => {
                      if (textMenu?.message?.id) {
                        startEditing(textMenu.message.id, textMenu?.message?.text || "");
                      }
                      setTextMenu({ open: false, message: null });
                    }}
                    className={`${styles.overlayActionButton} ${styles.overlayActionDivider} ${styles.overlayActionPrimary}`}
                  >
                    Edit message
                  </button>
                  <button
                    onClick={() => {
                      if (textMenu?.message?.id) {
                        handleDeleteMessage(textMenu.message.id);
                      }
                      setTextMenu({ open: false, message: null });
                    }}
                    className={`${styles.overlayActionButton} ${styles.overlayActionDivider} ${styles.overlayActionDanger}`}
                  >
                    Delete message
                  </button>
                  <button
                    onClick={() => setTextMenu({ open: false, message: null })}
                    className={`${styles.overlayActionButton} ${styles.overlayActionMuted}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.emptyStateContainer}>
            <div className={styles.emptyStateCard}>
              <h3 className={styles.emptyStateTitle}>Select a contact to start chatting</h3>
              <div className={styles.emptyStateDescription}>
                Choose from your assigned students, their parents, or academic admins.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

