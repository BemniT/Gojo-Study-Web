import React from 'react';
import { FaCheck, FaChevronUp, FaEdit, FaFacebookMessenger, FaImage, FaPaperPlane, FaTrash } from 'react-icons/fa';
import { createProfilePlaceholder } from '../../utils/profileImage';
import { MESSAGE_PAGE_SIZE, formatTime } from '../../utils/chatHelpers';

function MessageBubble({ message, previous, isMine, isImageMessage, isDeleted, showMenu, onClick, onPreviewImage, onEdit, onDelete }) {
  const prevSameSender = previous && previous.type === 'message' && previous.senderId === message.senderId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div
        onClick={onClick}
        style={{
          maxWidth: '76%',
          background: isMine ? 'var(--accent)' : 'var(--surface-muted)',
          color: isMine ? '#fff' : 'var(--text-primary)',
          padding: isImageMessage ? 6 : '10px 13px',
          borderRadius: 14,
          borderTopRightRadius: isMine ? 6 : 14,
          borderTopLeftRadius: isMine ? 14 : 6,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
          border: isMine ? 'none' : '1px solid var(--border-soft)',
          wordBreak: 'break-word',
          cursor: isMine ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {!isMine && !prevSameSender ? <div style={{ position: 'absolute', left: -6, bottom: -2, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '8px solid var(--surface-muted)', transform: 'rotate(180deg)' }} /> : null}
        {isMine && !prevSameSender ? <div style={{ position: 'absolute', right: -6, bottom: -2, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '8px solid var(--accent)' }} /> : null}

        {isDeleted ? (
          <>
            <span style={{ fontStyle: 'italic', color: isMine ? 'rgba(255,255,255,0.92)' : '#64748b' }}>This message is deleted</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6, fontSize: 10, color: isMine ? 'rgba(255,255,255,0.85)' : '#64748b' }}>
              <span>{formatTime(message.timeStamp)}</span>
            </div>
          </>
        ) : isImageMessage ? (
          <div style={{ width: 240, position: 'relative' }}>
            <img
              src={message.imageUrl}
              alt="Chat"
              loading="lazy"
              decoding="async"
              onClick={(event) => { event.stopPropagation(); onPreviewImage(message.imageUrl); }}
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, display: 'block', background: isMine ? '#0b61c3' : 'var(--surface-muted)', cursor: 'zoom-in' }}
            />
            <div style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 6, background: isMine ? 'rgba(2,6,23,0.24)' : 'rgba(8,17,31,0.72)', borderRadius: 999, padding: '2px 8px', fontSize: 10, color: '#f8fafc' }}>
              <span>{formatTime(message.timeStamp)}</span>
              {isMine ? <span style={{ display: 'flex', alignItems: 'center' }}><FaCheck size={10} color="#fff" style={{ opacity: 0.82 }} />{message.seen ? <FaCheck size={10} color="#fff" style={{ marginLeft: 2, opacity: 0.98 }} /> : null}</span> : null}
            </div>
          </div>
        ) : (
          <>
            {message.text}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6, fontSize: 10, color: isMine ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}>
              {message.edited ? <span style={{ fontStyle: 'italic', opacity: 0.95 }}>edited</span> : null}
              <span>{formatTime(message.timeStamp)}</span>
              {isMine ? <span style={{ display: 'flex', alignItems: 'center' }}><FaCheck size={10} color="#fff" style={{ opacity: 0.82 }} />{message.seen ? <FaCheck size={10} color="#fff" style={{ marginLeft: 2, opacity: 0.98 }} /> : null}</span> : null}
            </div>
          </>
        )}

        {showMenu ? (
          <div style={{ position: 'absolute', top: '100%', right: isMine ? 0 : 'auto', left: isMine ? 'auto' : 0, marginTop: 8, background: 'var(--surface-panel)', border: '1px solid var(--border-soft)', borderRadius: 14, boxShadow: 'var(--shadow-panel)', minWidth: 150, overflow: 'hidden', zIndex: 5 }}>
            {!isImageMessage ? (
              <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(message); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'var(--surface-panel)', padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                <FaEdit size={12} /> Edit message
              </button>
            ) : null}
            <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(message.id).catch(console.error); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'var(--surface-panel)', padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--danger)', cursor: 'pointer' }}>
              <FaTrash size={12} /> Delete message
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ChatThread({
  selectedChatUser,
  isUserOnline,
  getLastSeenText,
  messages,
  displayItems,
  hasOlderMessages,
  loadingOlderMessages,
  onLoadOlder,
  activeMenuMessageId,
  setActiveMenuMessageId,
  beginEditing,
  deleteMessage,
  setPreviewImageUrl,
  chatEndRef,
  imageInputRef,
  sendImageMessage,
  input,
  setInput,
  editingMessageId,
  resetComposer,
  sendMessage,
  imageSending,
}) {
  if (!selectedChatUser) {
    return (
      <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-soft)', borderRadius: 22, boxShadow: 'var(--shadow-panel)', display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'grid', placeItems: 'center', flex: 1, padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 460, padding: 28, borderRadius: 20, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ width: 58, height: 58, margin: '0 auto 14px', borderRadius: 18, background: 'var(--surface-accent)', color: 'var(--accent)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              <FaFacebookMessenger />
            </div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 22 }}>Select an employee to start chatting</h3>
            <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>This HR page loads internal employee conversations only. Students and parents are intentionally excluded from the contact list.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-soft)', borderRadius: 22, boxShadow: 'var(--shadow-panel)', display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 18px 14px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img
            src={selectedChatUser.profileImage}
            alt={selectedChatUser.name}
            onError={(event) => {
              const fallback = createProfilePlaceholder(selectedChatUser.name);
              if (event.currentTarget.src === fallback) return;
              event.currentTarget.src = fallback;
            }}
            style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-panel)', boxShadow: 'var(--shadow-soft)' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedChatUser.name}</span>
            <span style={{ fontSize: 12, color: isUserOnline(selectedChatUser.userId) ? '#16A34A' : 'var(--text-muted)' }}>
              {isUserOnline(selectedChatUser.userId) ? 'Online' : getLastSeenText(selectedChatUser.userId)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--surface-accent)', border: '1px solid var(--border-strong)', padding: '5px 10px', borderRadius: 999 }}>{selectedChatUser.role}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-muted)', border: '1px solid var(--border-soft)', padding: '5px 10px', borderRadius: 999 }}>{selectedChatUser.department}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-muted)', border: '1px solid var(--border-soft)', padding: '5px 10px', borderRadius: 999 }}>{messages.length} loaded</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', background: 'var(--surface-panel)' }}>
        {hasOlderMessages ? (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 16px' }}>
            <button
              type="button"
              onClick={() => onLoadOlder().catch(console.error)}
              disabled={loadingOlderMessages}
              style={{
                minHeight: 36, padding: '0 14px', borderRadius: 999,
                border: '1px solid var(--border-strong)', background: 'var(--surface-accent)',
                color: 'var(--accent)', fontWeight: 800, fontSize: 12,
                cursor: loadingOlderMessages ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <FaChevronUp size={11} />
              {loadingOlderMessages ? 'Loading older messages...' : `Load ${MESSAGE_PAGE_SIZE} older messages`}
            </button>
          </div>
        ) : null}

        {displayItems.map((item, index) => {
          if (item.type === 'date') {
            return (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', background: 'var(--surface-muted)', border: '1px solid var(--border-soft)', borderRadius: 999, padding: '6px 12px' }}>{item.label}</span>
              </div>
            );
          }

          const message = item;
          const isMine = message.isMine;
          const previous = index > 0 ? displayItems[index - 1] : null;
          const isImageMessage = String(message.type || '').toLowerCase() === 'image' && !!message.imageUrl;
          const isDeleted = !!message.deleted;
          const showMenu = activeMenuMessageId === message.id && isMine && !isDeleted;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              previous={previous}
              isMine={isMine}
              isImageMessage={isImageMessage}
              isDeleted={isDeleted}
              showMenu={showMenu}
              onClick={() => {
                if (!isMine || isDeleted) return;
                setActiveMenuMessageId((current) => current === message.id ? '' : message.id);
              }}
              onPreviewImage={setPreviewImageUrl}
              onEdit={beginEditing}
              onDelete={deleteMessage}
            />
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '0 18px 18px', padding: 8, borderRadius: 16, background: 'var(--surface-panel)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-soft)' }}>
        <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={sendImageMessage} />
        <button type="button" onClick={() => imageInputRef.current?.click()} style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--surface-accent)', border: '1px solid var(--border-strong)', color: 'var(--accent)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: imageSending ? 'not-allowed' : 'pointer', opacity: imageSending ? 0.65 : 1 }} disabled={imageSending} aria-label="Attach image">
          <FaImage />
        </button>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              sendMessage().catch(console.error);
            }
          }}
          placeholder={editingMessageId ? 'Edit your message...' : 'Type a message...'}
          style={{ flex: 1, padding: 12, borderRadius: 999, border: '1px solid var(--input-border)', outline: 'none', background: 'var(--input-bg)', color: 'var(--text-primary)', boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.04)' }}
        />
        {editingMessageId ? (
          <button type="button" onClick={resetComposer} style={{ minWidth: 88, borderRadius: 999, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
        ) : null}
        <button type="button" onClick={() => sendMessage().catch(console.error)} style={{ width: 46, height: 46, borderRadius: '50%', background: '#007AFB', border: 'none', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 8px 18px rgba(0, 122, 251, 0.25)', cursor: 'pointer' }} aria-label="Send message" disabled={imageSending}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}
