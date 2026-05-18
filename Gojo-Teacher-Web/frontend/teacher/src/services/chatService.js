// chatService.js
// Centralizes all RTDB and storage operations for chat
import axios from "axios";
import { db, storage } from "../firebase";
import { ref as dbRef, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { increment } from "firebase/database";

export const chatService = {
  async sendTextMessage({ chatKey, messageId, messageData, teacherUserId, selectedChatUser, buildChatSummaryUpdate, buildRtdbUrl, schoolPath, db }) {
    const teacherSummary = buildChatSummaryUpdate({
      chatId: chatKey,
      otherUserId: selectedChatUser.userId,
      unreadCount: 0,
      lastMessageText: messageData.text,
      lastMessageType: "text",
      lastMessageTime: messageData.timeStamp,
      lastSenderId: teacherUserId,
      lastMessageSeen: false,
      lastMessageSeenAt: null,
    });
    const receiverSummary = {
      ...buildChatSummaryUpdate({
        chatId: chatKey,
        otherUserId: teacherUserId,
        lastMessageText: messageData.text,
        lastMessageType: "text",
        lastMessageTime: messageData.timeStamp,
        lastSenderId: teacherUserId,
        lastMessageSeen: false,
        lastMessageSeenAt: null,
      }),
      unreadCount: increment(1),
    };
    const updates = {
      [schoolPath(`Chats/${chatKey}/messages/${messageId}`)]: messageData,
      [schoolPath(`Chats/${chatKey}/participants/${teacherUserId}`)]: true,
      [schoolPath(`Chats/${chatKey}/participants/${selectedChatUser.userId}`)]: true,
      [schoolPath(buildChatSummaryPath(teacherUserId, chatKey))]: teacherSummary,
      [schoolPath(buildChatSummaryPath(selectedChatUser.userId, chatKey))]: receiverSummary,
    };
    await update(dbRef(db), updates);
  },

  async sendImageMessage({ chatKey, messageId, file, compressImageToJpeg, teacherUserId, selectedChatUser, buildChatSummaryUpdate, buildRtdbUrl, schoolPath, db }) {
    const timeStamp = Date.now();
    const compressedBlob = await compressImageToJpeg(file, {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.72,
    });
    const uploadedImageRef = storageRef(storage, `chatImages/${chatKey}/${messageId}.jpg`);
    await uploadBytes(uploadedImageRef, compressedBlob, { contentType: "image/jpeg" });
    const uploadedImageUrl = await getDownloadURL(uploadedImageRef);
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
      timeStamp,
    };
    const teacherSummary = buildChatSummaryUpdate({
      chatId: chatKey,
      otherUserId: selectedChatUser.userId,
      unreadCount: 0,
      lastMessageText: "",
      lastMessageType: "image",
      lastMessageTime: timeStamp,
      lastSenderId: teacherUserId,
      lastMessageSeen: false,
      lastMessageSeenAt: null,
    });
    const receiverSummary = {
      ...buildChatSummaryUpdate({
        chatId: chatKey,
        otherUserId: teacherUserId,
        lastMessageText: "",
        lastMessageType: "image",
        lastMessageTime: timeStamp,
        lastSenderId: teacherUserId,
        lastMessageSeen: false,
        lastMessageSeenAt: null,
      }),
      unreadCount: increment(1),
    };
    const updates = {
      [schoolPath(`Chats/${chatKey}/messages/${messageId}`)]: messageData,
      [schoolPath(`Chats/${chatKey}/participants/${teacherUserId}`)]: true,
      [schoolPath(`Chats/${chatKey}/participants/${selectedChatUser.userId}`)]: true,
      [schoolPath(buildChatSummaryPath(teacherUserId, chatKey))]: teacherSummary,
      [schoolPath(buildChatSummaryPath(selectedChatUser.userId, chatKey))]: receiverSummary,
    };
    await update(dbRef(db), updates);
    return uploadedImageUrl;
  },

  async editMessage({ chatKey, messageId, newText, buildRtdbUrl }) {
    await axios.patch(buildRtdbUrl(`Chats/${chatKey}/messages/${messageId}`), {
      text: newText,
      edited: true,
    });
  },

  async deleteMessage({ chatKey, messageId, buildRtdbUrl }) {
    await axios.patch(buildRtdbUrl(`Chats/${chatKey}/messages/${messageId}`), { deleted: true });
  },

  async deleteImage({ imageUrl, deleteStorageObjectByUrl }) {
    if (imageUrl) {
      await deleteStorageObjectByUrl(imageUrl);
    }
  },
};
