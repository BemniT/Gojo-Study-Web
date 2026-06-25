import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endAt, get, limitToLast, onValue, orderByChild, push, query, ref, update } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import {
  buildChatSummaryUpdate,
  clearChatSummaryUnread,
  sortedChatId,
  writeChatSummaryUpdate,
} from '../../utils/chatSummary';
import { MAX_CHAT_IMAGE_BYTES, MESSAGE_PAGE_SIZE, formatDateLabel, mergeMessages, normalizeChatMessages } from '../../utils/chatHelpers';
import { compressChatImageToJpeg } from '../../utils/chatImageCompress';

export default function useChatThread({
  db,
  storage,
  schoolPath,
  schoolCode,
  adminUserId,
  selectedChatUser,
  setChatSummariesByUserId,
  setUnreadCounts,
  unreadCounts,
}) {
  const [recentMessages, setRecentMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState('');
  const [activeMenuMessageId, setActiveMenuMessageId] = useState('');
  const [imageSending, setImageSending] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);

  const chatEndRef = useRef(null);
  const imageInputRef = useRef(null);

  const currentChatKey = useMemo(() => {
    if (!adminUserId || !selectedChatUser?.userId) return null;
    return sortedChatId(adminUserId, selectedChatUser.userId);
  }, [adminUserId, selectedChatUser]);

  const messages = useMemo(() => mergeMessages(olderMessages, recentMessages), [olderMessages, recentMessages]);

  const displayItems = useMemo(() => {
    const items = [];
    let lastLabel = null;

    messages.forEach((message) => {
      const label = formatDateLabel(message.timeStamp);
      if (label && label !== lastLabel) {
        items.push({ type: 'date', id: `date-${label}-${message.timeStamp}`, label });
        lastLabel = label;
      }
      items.push({ type: 'message', ...message });
    });

    return items;
  }, [messages]);

  useEffect(() => {
    if (!selectedChatUser || !adminUserId || !currentChatKey) {
      setRecentMessages([]);
      setOlderMessages([]);
      setHasOlderMessages(false);
      return undefined;
    }

    setOlderMessages([]);
    setHasOlderMessages(false);

    const chatRef = ref(db, schoolPath(`Chats/${currentChatKey}/messages`));
    const recentMessagesQuery = query(chatRef, orderByChild('timeStamp'), limitToLast(MESSAGE_PAGE_SIZE));
    const unsubscribe = onValue(recentMessagesQuery, (snapshot) => {
      const payload = snapshot.val() || {};
      const list = normalizeChatMessages(payload, adminUserId);

      setRecentMessages(list);
      setHasOlderMessages(list.length >= MESSAGE_PAGE_SIZE);

      Object.entries(payload).forEach(([id, value]) => {
        if (String(value?.receiverId || '') === adminUserId && !value?.seen) {
          update(ref(db, schoolPath(`Chats/${currentChatKey}/messages/${id}`)), { seen: true }).catch(console.error);
        }
      });

      Promise.all([
        update(ref(db, schoolPath(`Chats/${currentChatKey}/unread`)), { [adminUserId]: 0 }).catch(() => {}),
        clearChatSummaryUnread({
          db, schoolPath,
          ownerUserId: adminUserId,
          otherUserId: selectedChatUser?.userId,
          chatId: currentChatKey,
        }).catch(() => {}),
      ]).catch(() => {});

      if (selectedChatUser?.userId) {
        setUnreadCounts((previous) => ({ ...previous, [selectedChatUser.userId]: 0 }));
        setChatSummariesByUserId((previous) => ({
          ...previous,
          [selectedChatUser.userId]: {
            ...(previous[selectedChatUser.userId] || {}),
            chatId: currentChatKey,
            otherUserId: selectedChatUser.userId,
            unreadCount: 0,
          },
        }));
      }
    });

    return () => unsubscribe();
  }, [adminUserId, currentChatKey, db, selectedChatUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentMessages]);

  const resetComposer = useCallback(() => {
    setInput('');
    setEditingMessageId('');
    setActiveMenuMessageId('');
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!currentChatKey || loadingOlderMessages || !hasOlderMessages) return;

    const loadedMessages = mergeMessages(olderMessages, recentMessages);
    const oldestTimestamp = Number(loadedMessages[0]?.timeStamp || 0);
    if (!oldestTimestamp) { setHasOlderMessages(false); return; }

    setLoadingOlderMessages(true);
    try {
      const olderMessagesQuery = query(
        ref(db, schoolPath(`Chats/${currentChatKey}/messages`)),
        orderByChild('timeStamp'),
        endAt(oldestTimestamp - 1),
        limitToLast(MESSAGE_PAGE_SIZE)
      );
      const snapshot = await get(olderMessagesQuery);
      const payload = snapshot.val() || {};
      const list = normalizeChatMessages(payload, adminUserId);

      if (!list.length) { setHasOlderMessages(false); return; }
      setOlderMessages((previous) => mergeMessages(previous, list));
      if (list.length < MESSAGE_PAGE_SIZE) setHasOlderMessages(false);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [adminUserId, currentChatKey, db, hasOlderMessages, loadingOlderMessages, olderMessages, recentMessages]);

  const sendMessage = useCallback(async () => {
    if (!selectedChatUser || !adminUserId || !currentChatKey) return;
    const text = String(input || '').trim();
    if (!text) return;
    const latestVisibleMessage = [...messages]
      .filter((message) => !message?.deleted)
      .sort((left, right) => Number(left.timeStamp || 0) - Number(right.timeStamp || 0))
      .at(-1);

    if (editingMessageId) {
      await update(ref(db, schoolPath(`Chats/${currentChatKey}/messages/${editingMessageId}`)), { text, edited: true });

      if (latestVisibleMessage?.id === editingMessageId) {
        const editPatch = {
          chatId: currentChatKey,
          lastMessageText: text,
          lastMessageType: 'text',
          lastMessageTime: latestVisibleMessage?.timeStamp,
          lastSenderId: latestVisibleMessage?.senderId,
        };
        await Promise.all([
          writeChatSummaryUpdate({ db, schoolPath, ownerUserId: adminUserId, chatId: currentChatKey, summary: { ...editPatch, otherUserId: selectedChatUser.userId } }),
          writeChatSummaryUpdate({ db, schoolPath, ownerUserId: selectedChatUser.userId, chatId: currentChatKey, summary: { ...editPatch, otherUserId: adminUserId } }),
        ]);

        setChatSummariesByUserId((previous) => ({
          ...previous,
          [selectedChatUser.userId]: {
            ...(previous[selectedChatUser.userId] || {}),
            ...buildChatSummaryUpdate({ ...editPatch, otherUserId: selectedChatUser.userId }),
          },
        }));
      }

      resetComposer();
      return;
    }

    const timeStamp = Date.now();
    const messageData = {
      senderId: adminUserId,
      receiverId: selectedChatUser.userId,
      type: 'text',
      text,
      seen: false,
      edited: false,
      deleted: false,
      timeStamp,
    };

    await push(ref(db, schoolPath(`Chats/${currentChatKey}/messages`)), messageData);
    await update(ref(db, schoolPath(`Chats/${currentChatKey}/participants`)), {
      [adminUserId]: true,
      [selectedChatUser.userId]: true,
    });

    const receiverSummaryUnreadRef = ref(db, schoolPath(`Chat_Summaries/${selectedChatUser.userId}/${currentChatKey}/unreadCount`));
    const receiverSummaryUnreadSnapshot = await get(receiverSummaryUnreadRef).catch(() => null);
    const nextReceiverUnread = Number(receiverSummaryUnreadSnapshot?.val() || 0) + 1;

    const summaryBase = {
      chatId: currentChatKey,
      lastMessageText: text,
      lastMessageType: 'text',
      lastMessageTime: timeStamp,
      lastSenderId: adminUserId,
    };

    await Promise.all([
      writeChatSummaryUpdate({ db, schoolPath, ownerUserId: adminUserId, chatId: currentChatKey, summary: { ...summaryBase, otherUserId: selectedChatUser.userId, unreadCount: Number(unreadCounts[selectedChatUser.userId] || 0) } }),
      writeChatSummaryUpdate({ db, schoolPath, ownerUserId: selectedChatUser.userId, chatId: currentChatKey, summary: { ...summaryBase, otherUserId: adminUserId, unreadCount: nextReceiverUnread } }),
    ]);

    setChatSummariesByUserId((previous) => ({
      ...previous,
      [selectedChatUser.userId]: {
        ...(previous[selectedChatUser.userId] || {}),
        ...summaryBase,
        otherUserId: selectedChatUser.userId,
        unreadCount: Number(unreadCounts[selectedChatUser.userId] || 0),
      },
    }));

    setInput('');
  }, [adminUserId, currentChatKey, db, editingMessageId, input, messages, resetComposer, selectedChatUser, setChatSummariesByUserId, unreadCounts]);

  const sendImageMessage = useCallback(async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || !selectedChatUser || !adminUserId || !currentChatKey) {
      if (event?.target) event.target.value = '';
      return;
    }

    try {
      setImageSending(true);
      const compressedBlob = await compressChatImageToJpeg(file, { maxBytes: MAX_CHAT_IMAGE_BYTES });
      const messagesRef = ref(db, schoolPath(`Chats/${currentChatKey}/messages`));
      const messageRef = push(messagesRef);
      const messageId = messageRef.key;
      const timeStamp = Date.now();
      const uploadRef = storageRef(storage, `chatImages/${schoolCode}/${currentChatKey}/${messageId}.jpg`);

      await uploadBytes(uploadRef, compressedBlob, { contentType: 'image/jpeg' });
      const imageUrl = await getDownloadURL(uploadRef);

      await update(messageRef, {
        messageId,
        senderId: adminUserId,
        receiverId: selectedChatUser.userId,
        type: 'image',
        text: '',
        imageUrl,
        seen: false,
        edited: false,
        deleted: false,
        timeStamp,
      });

      await update(ref(db, schoolPath(`Chats/${currentChatKey}/participants`)), {
        [adminUserId]: true,
        [selectedChatUser.userId]: true,
      });

      const receiverSummaryUnreadRef = ref(db, schoolPath(`Chat_Summaries/${selectedChatUser.userId}/${currentChatKey}/unreadCount`));
      const receiverSummaryUnreadSnapshot = await get(receiverSummaryUnreadRef).catch(() => null);
      const nextReceiverUnread = Number(receiverSummaryUnreadSnapshot?.val() || 0) + 1;

      const summaryBase = {
        chatId: currentChatKey,
        lastMessageText: 'Image',
        lastMessageType: 'image',
        lastMessageTime: timeStamp,
        lastSenderId: adminUserId,
      };

      await Promise.all([
        writeChatSummaryUpdate({ db, schoolPath, ownerUserId: adminUserId, chatId: currentChatKey, summary: { ...summaryBase, otherUserId: selectedChatUser.userId, unreadCount: Number(unreadCounts[selectedChatUser.userId] || 0) } }),
        writeChatSummaryUpdate({ db, schoolPath, ownerUserId: selectedChatUser.userId, chatId: currentChatKey, summary: { ...summaryBase, otherUserId: adminUserId, unreadCount: nextReceiverUnread } }),
      ]);

      setChatSummariesByUserId((previous) => ({
        ...previous,
        [selectedChatUser.userId]: {
          ...(previous[selectedChatUser.userId] || {}),
          ...summaryBase,
          otherUserId: selectedChatUser.userId,
          unreadCount: Number(unreadCounts[selectedChatUser.userId] || 0),
        },
      }));
    } catch (error) {
      console.error('Image send failed:', error);
      window.alert('Image send failed. Please try again.');
    } finally {
      setImageSending(false);
      if (event?.target) event.target.value = '';
    }
  }, [adminUserId, currentChatKey, db, schoolCode, selectedChatUser, setChatSummariesByUserId, storage, unreadCounts]);

  const beginEditing = useCallback((message) => {
    setEditingMessageId(message.id);
    setInput(String(message.text || ''));
    setActiveMenuMessageId('');
  }, []);

  const deleteMessage = useCallback(async (messageId) => {
    if (!currentChatKey || !messageId) return;
    const remainingMessages = [...messages]
      .filter((message) => !message?.deleted && message.id !== messageId)
      .sort((left, right) => Number(left.timeStamp || 0) - Number(right.timeStamp || 0));
    const latestVisibleMessage = [...messages]
      .filter((message) => !message?.deleted)
      .sort((left, right) => Number(left.timeStamp || 0) - Number(right.timeStamp || 0))
      .at(-1);
    const nextLatestMessage = remainingMessages.at(-1);
    await update(ref(db, schoolPath(`Chats/${currentChatKey}/messages/${messageId}`)), { deleted: true });

    if (latestVisibleMessage?.id === messageId && selectedChatUser?.userId) {
      const summaryPatch = nextLatestMessage
        ? {
          lastMessageText: nextLatestMessage.text,
          lastMessageType: nextLatestMessage.type,
          lastMessageTime: nextLatestMessage.timeStamp,
          lastSenderId: nextLatestMessage.senderId,
        }
        : { lastMessageText: '', lastMessageType: 'deleted', lastMessageTime: 0, lastSenderId: '' };

      await Promise.all([
        writeChatSummaryUpdate({ db, schoolPath, ownerUserId: adminUserId, chatId: currentChatKey, summary: { chatId: currentChatKey, otherUserId: selectedChatUser.userId, ...summaryPatch } }),
        writeChatSummaryUpdate({ db, schoolPath, ownerUserId: selectedChatUser.userId, chatId: currentChatKey, summary: { chatId: currentChatKey, otherUserId: adminUserId, ...summaryPatch } }),
      ]);

      setChatSummariesByUserId((previous) => ({
        ...previous,
        [selectedChatUser.userId]: {
          ...(previous[selectedChatUser.userId] || {}),
          ...buildChatSummaryUpdate({ chatId: currentChatKey, otherUserId: selectedChatUser.userId, ...summaryPatch }),
        },
      }));
    }

    setActiveMenuMessageId('');
    if (editingMessageId === messageId) resetComposer();
  }, [adminUserId, currentChatKey, db, editingMessageId, messages, resetComposer, selectedChatUser, setChatSummariesByUserId]);

  return {
    messages,
    displayItems,
    input,
    setInput,
    editingMessageId,
    activeMenuMessageId,
    setActiveMenuMessageId,
    imageSending,
    previewImageUrl,
    setPreviewImageUrl,
    loadingOlderMessages,
    hasOlderMessages,
    chatEndRef,
    imageInputRef,
    sendMessage,
    sendImageMessage,
    loadOlderMessages,
    beginEditing,
    deleteMessage,
    resetComposer,
  };
}
