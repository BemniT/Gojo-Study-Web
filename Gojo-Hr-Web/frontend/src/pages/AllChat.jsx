import React, { useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBell, FaCog, FaFacebookMessenger } from 'react-icons/fa';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { app } from '../firebase';
import '../styles/global.css';
import AvatarBadge from '../components/AvatarBadge';
import ContactList from '../components/chat/ContactList';
import ChatThread from '../components/chat/ChatThread';
import ImagePreviewModal from '../components/chat/ImagePreviewModal';
import useHrSession from '../hooks/auth/useHrSession';
import useChatContacts from '../hooks/chat/useChatContacts';
import useChatPresence from '../hooks/chat/useChatPresence';
import useChatThread from '../hooks/chat/useChatThread';
import { DEFAULT_SCHOOL_CODE } from '../utils/chatHelpers';

const headerActionStyle = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 38,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid var(--border-soft, #dbe2f2)',
  background: 'var(--surface-panel, #fff)',
  color: 'var(--text-secondary, #334155)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
};

export default function AllChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, hrUserId } = useHrSession();

  const db = useMemo(() => getDatabase(app), []);
  const storage = useMemo(() => getStorage(app), []);

  const adminUserId = hrUserId || String(admin?.adminId || admin?.adminID || '').trim();
  const schoolCode = String(admin?.activeSchoolCode || admin?.schoolCode || DEFAULT_SCHOOL_CODE).trim() || DEFAULT_SCHOOL_CODE;
  const schoolPath = useCallback(
    (path) => `Platform1/Schools/${schoolCode}/${String(path || '').replace(/^\/+/, '')}`,
    [schoolCode]
  );

  const locationState = location.state || {};
  const incomingContact = locationState.contact || locationState.user || null;
  const incomingContactUserId = String(incomingContact?.userId || '').trim();
  const incomingChatId = String(locationState.chatId || '').trim();

  useEffect(() => {
    if (adminUserId) return;
    navigate('/login', { replace: true });
  }, [adminUserId, navigate]);

  const contacts = useChatContacts({
    db,
    schoolPath,
    schoolCode,
    adminUserId,
    incomingContactUserId,
    incomingChatId,
    incomingContact,
  });

  const presence = useChatPresence({
    db,
    schoolPath,
    schoolCode,
    userIds: contacts.visiblePresenceUserIds,
  });

  const thread = useChatThread({
    db,
    storage,
    schoolPath,
    schoolCode,
    adminUserId,
    selectedChatUser: contacts.selectedChatUser,
    setChatSummariesByUserId: contacts.setChatSummariesByUserId,
    setUnreadCounts: contacts.setUnreadCounts,
    unreadCounts: contacts.unreadCounts,
  });

  const handleSelectContact = (employee) => {
    contacts.setSelectedChatUser(employee);
    thread.setActiveMenuMessageId('');
    thread.resetComposer();
  };

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--page-bg)',
        color: 'var(--text-primary)',
        '--sidebar-width': 'clamp(230px, 16vw, 290px)',
        '--topbar-height': '64px',
      }}
    >
      <nav className="top-navbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 18px 0 20px', borderBottom: '1px solid var(--border-soft)', background: 'var(--surface-panel)', zIndex: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Gojo HR</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" title="Notifications" style={headerActionStyle}><FaBell /></button>
          <Link to="/all-chat" aria-label="Messages" style={{ ...headerActionStyle, color: 'var(--accent)', borderColor: 'var(--border-strong)', background: 'var(--surface-accent)' }}><FaFacebookMessenger /></Link>
          <Link to="/settings" aria-label="Settings" style={headerActionStyle}><FaCog /></Link>
          <AvatarBadge src={admin.profileImage} name={admin.name || 'HR Office'} size={40} fontSize={14} />
        </div>
      </nav>

      <div className="google-dashboard" style={{ display: 'flex', gap: 14, padding: 'calc(var(--topbar-height) + 18px) 14px 18px', marginTop: 0, height: '100vh', overflow: 'hidden', background: 'var(--page-bg)', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>
        <div className="admin-sidebar-spacer" style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)', flex: '0 0 var(--sidebar-width)', pointerEvents: 'none' }} />

        <main style={{ flex: '1 1 0', minWidth: 0, margin: 0, padding: '0 12px 0 2px', height: 'calc(100vh - var(--topbar-height) - 36px)', maxHeight: 'calc(100vh - var(--topbar-height) - 36px)', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 1260, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 16, alignItems: 'stretch', height: '100%', minHeight: 0 }}>
              <ContactList
                searchText={contacts.searchText}
                setSearchText={contacts.setSearchText}
                roleFilters={contacts.roleFilters}
                selectedRoleFilter={contacts.selectedRoleFilter}
                setSelectedRoleFilter={contacts.setSelectedRoleFilter}
                contactError={contacts.contactError}
                loadingContacts={contacts.loadingContacts}
                filteredEmployees={contacts.filteredEmployees}
                orderedFilteredEmployees={contacts.orderedFilteredEmployees}
                selectedChatUser={contacts.selectedChatUser}
                unreadCounts={contacts.unreadCounts}
                isUserOnline={presence.isUserOnline}
                onSelect={handleSelectContact}
                contactListRef={contacts.contactListRef}
                onScroll={contacts.updateContactListScrollTop}
              />

              <ChatThread
                selectedChatUser={contacts.selectedChatUser}
                isUserOnline={presence.isUserOnline}
                getLastSeenText={presence.getLastSeenText}
                messages={thread.messages}
                displayItems={thread.displayItems}
                hasOlderMessages={thread.hasOlderMessages}
                loadingOlderMessages={thread.loadingOlderMessages}
                onLoadOlder={thread.loadOlderMessages}
                activeMenuMessageId={thread.activeMenuMessageId}
                setActiveMenuMessageId={thread.setActiveMenuMessageId}
                beginEditing={thread.beginEditing}
                deleteMessage={thread.deleteMessage}
                setPreviewImageUrl={thread.setPreviewImageUrl}
                chatEndRef={thread.chatEndRef}
                imageInputRef={thread.imageInputRef}
                sendImageMessage={thread.sendImageMessage}
                input={thread.input}
                setInput={thread.setInput}
                editingMessageId={thread.editingMessageId}
                resetComposer={thread.resetComposer}
                sendMessage={thread.sendMessage}
                imageSending={thread.imageSending}
              />
            </section>
          </div>
        </main>
      </div>

      <ImagePreviewModal url={thread.previewImageUrl} onClose={() => thread.setPreviewImageUrl('')} />
    </div>
  );
}
