import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FIREBASE_DATABASE_URL } from "../../config.js";

/**
 * useRegistrarSession
 *
 * Owns the Register-Web admin session layer:
 *   - finance state (the rich role-specific session object stored under
 *     localStorage["registrar"] or legacy "admin")
 *   - admin alias (compat shape older handlers reference)
 *   - schoolCode derivation
 *   - loadingAdmin gate for mount fetch
 *   - one-time bootstrap that hydrates `finance` from Finance →
 *     School_Admins → Users RTDB nodes
 *
 * Latent-bug fix: the original page hardcoded
 *   DB_URL = "https://bale-house-rental-default-rtdb.firebaseio.com"
 * pointing at a different project. All Finance/School_Admins/Users reads were
 * silently hitting the wrong DB. This hook now reads from
 * FIREBASE_DATABASE_URL via config.
 */
export default function useRegistrarSession() {
  const _storedFinance = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("registrar") || localStorage.getItem("admin")) || {};
    } catch {
      return {};
    }
  }, []);

  const [finance, setFinance] = useState({
    financeId: _storedFinance.financeId || _storedFinance.adminId || "",
    userId: _storedFinance.userId || "",
    schoolCode: _storedFinance.schoolCode || "",
    name: _storedFinance.name || _storedFinance.username || "Register Office",
    username: _storedFinance.username || "",
    role: _storedFinance.role || _storedFinance.userType || "registrar",
    profileImage: _storedFinance.profileImage || "/default-profile.png",
    isActive: _storedFinance.isActive || false,
  });
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const schoolCode = finance.schoolCode || _storedFinance.schoolCode || "";
  const DB_ROOT = schoolCode
    ? `${FIREBASE_DATABASE_URL}/Platform1/Schools/${schoolCode}`
    : FIREBASE_DATABASE_URL;

  // Compat alias for older handlers that reference `admin`.
  const admin = {
    adminId: finance.financeId || finance.adminId || "",
    userId: finance.userId || "",
    name: finance.name || finance.username || "Register Office",
    profileImage: finance.profileImage || "/default-profile.png",
    isActive: finance.isActive || false,
  };

  // ---------------- BOOTSTRAP ----------------
  useEffect(() => {
    let cancelled = false;

    const loadFinanceFromStorage = async () => {
      const stored = localStorage.getItem("registrar") || localStorage.getItem("admin");

      if (!stored) {
        if (!cancelled) setLoadingAdmin(false);
        return;
      }

      try {
        const financeData = JSON.parse(stored) || {};

        const financeKey = financeData.financeId || financeData.adminId || financeData.id || financeData.uid || "";
        const possibleUserId = financeData.userId || financeData.user_id || financeData.uid || financeData.user || "";

        // Try Finance → School_Admins lookup keyed by financeId.
        if (financeKey) {
          let res = null;
          try {
            res = (await axios.get(`${DB_ROOT}/Finance/${financeKey}.json`)) || null;
          } catch {
            res = null;
          }

          if (!res || !res.data) {
            try {
              res = (await axios.get(`${DB_ROOT}/School_Admins/${financeKey}.json`)) || null;
            } catch {
              res = null;
            }
          }

          if (res && res.data) {
            const node = res.data;
            const userId = node.userId || node.user_id || possibleUserId || "";
            if (userId) {
              try {
                const userRes = await axios.get(`${DB_ROOT}/Users/${userId}.json`);
                if (!cancelled) {
                  setFinance({
                    financeId: financeKey,
                    userId,
                    schoolCode: financeData.schoolCode || "",
                    name: userRes.data?.name || node.name || financeData.name || "Register Office",
                    username: userRes.data?.username || financeData.username || "",
                    role: node.role || node.userType || userRes.data?.role || userRes.data?.userType || financeData.role || financeData.userType || "registrar",
                    profileImage: userRes.data?.profileImage || node.profileImage || financeData.profileImage || "/default-profile.png",
                    isActive: node.isActive || financeData.isActive || false,
                  });
                }
              } catch {
                if (!cancelled) {
                  setFinance({
                    financeId: financeKey,
                    userId,
                    schoolCode: financeData.schoolCode || "",
                    name: node.name || financeData.name || "Register Office",
                    username: node.username || financeData.username || "",
                    role: node.role || node.userType || financeData.role || financeData.userType || "registrar",
                    profileImage: node.profileImage || financeData.profileImage || "/default-profile.png",
                    isActive: node.isActive || financeData.isActive || false,
                  });
                }
              }
              if (!cancelled) setLoadingAdmin(false);
              return;
            }

            // Node exists but no linked userId: use node fields.
            if (!cancelled) {
              setFinance({
                financeId: financeKey,
                userId: "",
                schoolCode: financeData.schoolCode || "",
                name: node.name || financeData.name || "Register Office",
                username: node.username || financeData.username || "",
                role: node.role || node.userType || financeData.role || financeData.userType || "registrar",
                profileImage: node.profileImage || financeData.profileImage || "/default-profile.png",
                isActive: node.isActive || financeData.isActive || false,
              });
              setLoadingAdmin(false);
            }
            return;
          }
        }

        // No financeKey but we have a userId — try Users directly.
        if (possibleUserId) {
          try {
            const userRes = await axios.get(`${DB_ROOT}/Users/${possibleUserId}.json`);
            if (!cancelled) {
              setFinance({
                financeId: financeData.financeId || financeData.adminId || "",
                userId: possibleUserId,
                schoolCode: financeData.schoolCode || "",
                name: userRes.data?.name || financeData.name || "Register Office",
                username: userRes.data?.username || financeData.username || "",
                role: userRes.data?.role || userRes.data?.userType || financeData.role || financeData.userType || "registrar",
                profileImage: userRes.data?.profileImage || financeData.profileImage || "/default-profile.png",
                isActive: financeData.isActive || false,
              });
              setLoadingAdmin(false);
            }
            return;
          } catch {
            // fallthrough to storage-only path
          }
        }

        // Fallback: use stored fields without clearing storage (prevents redirect on reload).
        if (!cancelled) {
          setFinance({
            financeId: financeData.financeId || financeData.adminId || "",
            userId: financeData.userId || "",
            schoolCode: financeData.schoolCode || "",
            name: financeData.name || financeData.username || "Register Office",
            username: financeData.username || "",
            role: financeData.role || financeData.userType || "registrar",
            profileImage: financeData.profileImage || "/default-profile.png",
            isActive: financeData.isActive || false,
          });
        }
      } catch {
        // Parsing failed: clear corrupted storage.
        try {
          localStorage.removeItem("registrar");
          localStorage.removeItem("admin");
        } catch {
          // ignore storage write errors
        }
      }

      if (!cancelled) setLoadingAdmin(false);
    };

    loadFinanceFromStorage();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    finance,
    setFinance,
    admin,
    schoolCode,
    DB_ROOT,
    loadingAdmin,
  };
}
