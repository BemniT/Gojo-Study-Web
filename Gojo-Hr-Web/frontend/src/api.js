import { BACKEND_BASE } from './config'
import axios from 'axios'

const api = axios.create({
  baseURL: BACKEND_BASE
})

api.interceptors.request.use((config) => {
  let schoolCode = ''

  try {
    const storedAdmin = JSON.parse(localStorage.getItem('admin') || '{}')
    schoolCode = String(storedAdmin?.activeSchoolCode || storedAdmin?.schoolCode || '').trim()
  } catch {
    schoolCode = ''
  }

  config.headers = config.headers || {}

  if (schoolCode) {
    config.headers['X-School-Code'] = schoolCode
  } else {
    delete config.headers['X-School-Code']
  }

  return config
})

export default api
