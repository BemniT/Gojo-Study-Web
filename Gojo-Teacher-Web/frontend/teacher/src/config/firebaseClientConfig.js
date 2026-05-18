const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const trimEnvValue = (value, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

export const firebaseConfig = {
  apiKey: trimEnvValue(import.meta.env.VITE_FIREBASE_API_KEY, DEFAULT_FIREBASE_CONFIG.apiKey),
  authDomain: trimEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, DEFAULT_FIREBASE_CONFIG.authDomain),
  databaseURL: trimEnvValue(import.meta.env.VITE_FIREBASE_DATABASE_URL, DEFAULT_FIREBASE_CONFIG.databaseURL),
  projectId: trimEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, DEFAULT_FIREBASE_CONFIG.projectId),
  storageBucket: trimEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, DEFAULT_FIREBASE_CONFIG.storageBucket),
  messagingSenderId: trimEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, DEFAULT_FIREBASE_CONFIG.messagingSenderId),
  appId: trimEnvValue(import.meta.env.VITE_FIREBASE_APP_ID, DEFAULT_FIREBASE_CONFIG.appId),
  measurementId: trimEnvValue(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, DEFAULT_FIREBASE_CONFIG.measurementId),
};

export const RTDB_BASE_RAW = firebaseConfig.databaseURL.replace(/\/+$/, "");
