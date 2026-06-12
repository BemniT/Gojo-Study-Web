import { useEffect, useState } from "react";
import { fetchConversationSummaries } from "../../utils/registerData";

const DEFAULT_RECENT_CONTACT_LIMIT = 3;

/**
 * useConversations
 *
 * Owns the Dashboard's recent-contacts panel data:
 *   - `recentContacts`: top-N conversations the current user has had
 *     (deduplicated, sorted by lastMessageTime)
 *   - placeholders the legacy code still touches (`teachers`,
 *     `unreadTeachers`, `popupMessages`) — kept for the original page's
 *     read sites; cleared on every fetch
 *
 * Inputs:
 *   - dbRoot: school-scoped RTDB base
 *   - currentUserId: the registrar's userId (whose conversations to load)
 *   - limit: top-N rows to display (defaults to 3)
 */
export default function useConversations({
  dbRoot,
  currentUserId,
  limit = DEFAULT_RECENT_CONTACT_LIMIT,
}) {
  const [teachers, setTeachers] = useState([]);
  const [unreadTeachers, setUnreadTeachers] = useState({});
  const [popupMessages, setPopupMessages] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchTeachersAndUnread = async () => {
      if (!currentUserId) {
        if (cancelled) return;
        setRecentContacts([]);
        return;
      }

      try {
        setTeachers([]);
        setUnreadTeachers({});
        setPopupMessages([]);

        const summaries = await fetchConversationSummaries({
          rtdbBase: dbRoot,
          currentUserId,
          includeWithoutLastMessage: true,
          limit,
        });

        if (cancelled) return;

        setRecentContacts(
          summaries.slice(0, limit).map((summary) => ({
            userId: summary?.contact?.userId || "",
            name: summary?.contact?.name || summary?.displayName || "Unknown",
            profileImage: summary?.contact?.profileImage || "/default-profile.png",
            lastMessage: summary?.lastMessageText || "",
            lastTime: Number(summary?.lastMessageTime || 0),
            type: summary?.contact?.type || "user",
          }))
        );
      } catch (err) {
        console.error("Failed to load recent conversations:", err);
      }
    };

    fetchTeachersAndUnread();

    return () => {
      cancelled = true;
    };
  }, [dbRoot, currentUserId, limit]);

  return {
    teachers, setTeachers,
    unreadTeachers, setUnreadTeachers,
    popupMessages, setPopupMessages,
    recentContacts, setRecentContacts,
  };
}
