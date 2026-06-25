import React from 'react';
import { FaFilter, FaSearch, FaUsers } from 'react-icons/fa';
import { createProfilePlaceholder } from '../../utils/profileImage';

export default function ContactList({
  searchText,
  setSearchText,
  roleFilters,
  selectedRoleFilter,
  setSelectedRoleFilter,
  contactError,
  loadingContacts,
  filteredEmployees,
  orderedFilteredEmployees,
  selectedChatUser,
  unreadCounts,
  isUserOnline,
  onSelect,
  contactListRef,
  onScroll,
}) {
  return (
    <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-soft)', borderRadius: 22, boxShadow: 'var(--shadow-panel)', display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Employees</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>HR conversations are limited to staff only</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 14, border: '1px solid var(--border-strong)', background: 'var(--surface-accent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaUsers />
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <FaSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search employees..."
            style={{ width: '100%', height: 44, borderRadius: 14, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', padding: '0 14px 0 38px', fontSize: 13, outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {roleFilters.map((role) => {
            const active = selectedRoleFilter === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRoleFilter(role)}
                style={{
                  border: active ? '1px solid var(--border-strong)' : '1px solid var(--border-soft)',
                  background: active ? 'var(--surface-accent)' : 'var(--surface-panel)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  borderRadius: 999, minHeight: 34, padding: '0 12px',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {role === 'all' ? <FaFilter size={11} /> : null}
                {role === 'all' ? 'All roles' : role}
              </button>
            );
          })}
        </div>

        {contactError ? (
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--warning-border)', background: 'var(--warning-soft)', color: 'var(--warning)', fontSize: 13, fontWeight: 700 }}>
            {contactError}
          </div>
        ) : null}
      </div>

      <div
        ref={contactListRef}
        onScroll={(event) => onScroll(event.currentTarget.scrollTop || 0)}
        style={{ padding: 14, overflowY: 'auto', flex: 1, minHeight: 0 }}
      >
        {loadingContacts ? <div style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 13 }}>Loading employee contacts...</div> : null}
        {!loadingContacts && !filteredEmployees.length ? <div style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 13 }}>No employee contacts matched the current filter.</div> : null}

        {orderedFilteredEmployees.map((employee) => {
          const isActive = selectedChatUser?.userId === employee.userId;
          const unread = unreadCounts[employee.userId] || 0;
          const online = isUserOnline(employee.userId);

          return (
            <button
              key={employee.userId}
              type="button"
              onClick={() => onSelect(employee)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: 12, borderRadius: 16, cursor: 'pointer', marginBottom: 10,
                background: 'var(--surface-panel)',
                border: isActive ? '1px solid var(--border-strong)' : '1px solid var(--border-soft)',
                boxShadow: isActive ? 'inset 3px 0 0 var(--accent), var(--shadow-soft)' : 'var(--shadow-soft)',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={employee.profileImage}
                    alt={employee.name}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      const fallback = createProfilePlaceholder(employee.name);
                      if (event.currentTarget.src === fallback) return;
                      event.currentTarget.src = fallback;
                    }}
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-panel)', boxShadow: 'var(--shadow-soft)' }}
                  />
                  <span style={{ position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, borderRadius: 12, border: '2px solid var(--surface-panel)', background: online ? '#22c55e' : '#94a3b8' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.role} · {employee.department}</span>
                </div>
              </div>

              {unread > 0 ? (
                <div style={{ minWidth: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ef4444', color: '#fff', borderRadius: 14, padding: '0 6px', fontSize: 11, fontWeight: 800, boxShadow: '0 4px 10px rgba(239,68,68,0.25)' }}>
                  {unread > 99 ? '99+' : unread}
                </div>
              ) : <div style={{ width: 26 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
