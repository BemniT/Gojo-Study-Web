<<<<<<< HEAD
const viteEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_BASE
const reactEnv = typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_BASE
const rawBase = viteEnv || reactEnv || 'http://localhost:5000'

export const BACKEND_BASE = String(rawBase).trim().replace(/\/$/, '')
=======
// Backend API configuration from environment variables
// In development: uses .env.development
// In production: uses .env.production
export const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
>>>>>>> 766d34b2b7502d6b1d32154621a888e9f4979040

// For API endpoints under /api prefix if needed
export const API_BASE = `${BACKEND_BASE}`

// Application metadata
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Gojo HR Management'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0'
export const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

// Validate configuration in development
if (import.meta.env.DEV && !import.meta.env.VITE_BACKEND_URL) {
  console.warn('⚠️ VITE_BACKEND_URL not set, using default:', BACKEND_BASE)
}
