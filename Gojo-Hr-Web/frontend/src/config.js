const viteEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_BASE
const reactEnv = typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_BASE
const rawBase = viteEnv || reactEnv || 'http://localhost:5000'

export const BACKEND_BASE = String(rawBase).trim().replace(/\/$/, '')

// For API endpoints under /api prefix if needed
export const API_BASE = `${BACKEND_BASE}`
