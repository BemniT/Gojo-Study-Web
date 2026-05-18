import { useEffect, useState } from "react";
import { get, onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { normalizeIdentifier } from "../utils/teacherData";

const CHAT_POLL_IDLE_GRACE_MS = 2 * 60 * 1000;

export function usePresence({ contacts = {}, selectedChatUser = null, rtdbBase = "", lastChatActivityAtRef }) {
  const [presence, setPresence] = useState({});

  useEffect(() => {
    let cancelled = false;

    const { students = [], parents = [], admins = [], selectedTab = "student" } = contacts || {};

    const activeContacts = selectedTab === "student" ? students : selectedTab === "parent" ? parents : admins;

    const presenceUserIds = [...new Set([
      ...activeContacts.map((contact) => normalizeIdentifier(contact?.userId)).filter(Boolean),
      normalizeIdentifier(selectedChatUser?.userId),
    ].filter(Boolean))];

    if (!presenceUserIds.length) {
      setPresence({});
      return undefined;
    }

    const safeActivityRef = lastChatActivityAtRef || { current: Date.now() };

    const loadInitialPresence = async () => {
      const isVisible = typeof document === "undefined" || document.visibilityState === "visible";
      const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
      const isRecentlyActive = Date.now() - Number(safeActivityRef.current || 0) <= CHAT_POLL_IDLE_GRACE_MS;
      if (!isVisible || !isOnline || !isRecentlyActive) {
        return;
      }

      try {
        const snapshots = await Promise.all(
          presenceUserIds.map(async (userId) => {
            const snapshot = await get(ref(db, `Presence/${userId}`));
            return [userId, snapshot.exists() ? snapshot.val() : null];
          })
        );

        const initialPresence = snapshots.reduce((result, [userId, value]) => {
          result[userId] = value;
          return result;
        }, {});

        if (!cancelled) {
          setPresence(initialPresence);
        }
      } catch (error) {
        // on failures, clear presence so UI doesn't mislead
        if (!cancelled) {
          setPresence({});
        }
      }
    };

    void loadInitialPresence();

    const unsubscribers = presenceUserIds.map((userId) =>
      onValue(
        ref(db, `Presence/${userId}`),
        (snapshot) => {
          if (cancelled) return;
          setPresence((previousPresence) => ({
            ...previousPresence,
            [userId]: snapshot.exists() ? snapshot.val() : null,
          }));
        },
        () => {
          if (cancelled) return;
          setPresence((previousPresence) => ({
            ...previousPresence,
            [userId]: null,
          }));
        }
      )
    );

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch {
          // ignore stale listener cleanup failures
        }
      });
    };
  }, [
    contacts?.admins,
    contacts?.parents,
    selectedChatUser?.userId,
    contacts?.selectedTab,
    contacts?.students,
    lastChatActivityAtRef,
  ]);

  return { presence };
}
