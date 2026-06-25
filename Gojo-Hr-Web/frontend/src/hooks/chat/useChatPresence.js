import { useEffect, useState } from 'react';
import { loadPresenceByUserIds } from '../../utils/chatSummary';
import { UNREAD_REFRESH_INTERVAL_MS, isPageVisible } from '../../utils/chatHelpers';

export default function useChatPresence({ db, schoolPath, schoolCode, userIds }) {
  const [presence, setPresence] = useState({});

  useEffect(() => {
    if (!userIds.length) { setPresence({}); return undefined; }

    let cancelled = false;

    const refreshPresence = () => {
      if (!isPageVisible()) return Promise.resolve();
      return loadPresenceByUserIds({ db, schoolPath, userIds })
        .then((presenceMap) => {
          if (!cancelled) {
            setPresence(userIds.reduce((accumulator, userId) => {
              accumulator[userId] = Object.prototype.hasOwnProperty.call(presenceMap, userId) ? presenceMap[userId] : null;
              return accumulator;
            }, {}));
          }
        })
        .catch((error) => console.error('Failed to refresh scoped presence:', error));
    };

    refreshPresence().catch(() => {});
    const intervalId = window.setInterval(() => { refreshPresence().catch(() => {}); }, UNREAD_REFRESH_INTERVAL_MS);
    const handleVisibilityChange = () => { if (isPageVisible()) refreshPresence().catch(() => {}); };

    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [db, schoolCode, userIds]);

  const isUserOnline = (userId) => {
    const record = presence?.[userId];
    if (record == null) return false;
    if (typeof record === 'boolean') return record;
    if (typeof record === 'number') return Date.now() - Number(record) < 2 * 60 * 1000;
    if (typeof record === 'object') {
      if (typeof record.online === 'boolean') return record.online;
      const lastSeen = record.lastSeen || record.timestamp || record.updatedAt;
      if (lastSeen) return Date.now() - Number(lastSeen) < 2 * 60 * 1000;
    }
    return false;
  };

  const getLastSeenText = (userId) => {
    const record = presence?.[userId];
    if (!record || isUserOnline(userId)) return 'Online now';

    let timestamp = null;
    if (typeof record === 'number') timestamp = record;
    if (typeof record === 'object') timestamp = record.lastSeen || record.timestamp || record.updatedAt || null;
    if (!timestamp) return 'Offline';

    const diff = Date.now() - Number(timestamp);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Seen just now';
    if (minutes < 60) return `Seen ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Seen ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Seen ${days}d ago`;
    return `Seen ${new Date(Number(timestamp)).toLocaleDateString()}`;
  };

  return { presence, isUserOnline, getLastSeenText };
}
