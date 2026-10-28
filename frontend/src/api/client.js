import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api"
const api = axios.create({ baseURL })

// Logout after 5 minutes of no activity
const INACTIVITY_LIMIT = 5 * 60 * 1000
let inactivityTimer = null
let logoutInProgress = false

const resolveApiUrl = (path) => {
  const root = String(baseURL || '').replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${root}${suffix}`
}

export const getApiErrorMessage = (err, fallback = 'Request failed') => {
  const data = err?.response?.data

  if (!data) return err?.message || fallback
  if (typeof data === 'string') {
    if (/<\/?[a-z][\s\S]*>/i.test(data) || data.includes('<!DOCTYPE')) {
      return 'API returned HTML. Please restart the frontend/backend servers and confirm the API URL points to Django.'
    }
    return data || fallback
  }
  if (data.error || data.detail) return data.error || data.detail

  const firstValue = Object.values(data)[0]
  if (Array.isArray(firstValue)) return firstValue[0] || fallback
  if (firstValue) return String(firstValue)

  return fallback
}

export const logoutSession = async ({ redirect = true, keepalive = false } = {}) => {
  if (logoutInProgress) return
  const access = localStorage.getItem('access')
  const refresh = localStorage.getItem('refresh')

  logoutInProgress = true

  try {
    if (access) {
      await fetch(resolveApiUrl('/auth/logout/'), {
        method: 'POST',
        keepalive,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ refresh }),
      })
    }
  } catch {
    // Closing tabs may cancel requests; the backend also expires stale sessions.
  } finally {
    localStorage.clear()
    if (inactivityTimer) clearTimeout(inactivityTimer)
    if (redirect) window.location.href = '/login'
    logoutInProgress = false
  }
}

export const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  if (!localStorage.getItem('access')) return

  inactivityTimer = setTimeout(() => {
    logoutSession({ redirect: true })
  }, INACTIVITY_LIMIT)
}

resetInactivityTimer()

;['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
  window.addEventListener(event, resetInactivityTimer, true)
})


api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access')
  if (token) cfg.headers.Authorization = `Bearer ${token}`

  return cfg
})

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config
    const requestUrl = String(orig?.url || '')
    const isAuthRequest =
      requestUrl.includes('/auth/login/') ||
      requestUrl.includes('/auth/refresh/') ||
      requestUrl.includes('/auth/logout/') ||
      requestUrl.includes('/public-users/login/')

    if (err.response?.status === 401 && orig && !orig._retry && !isAuthRequest) {
      orig._retry = true

      try {
        const refresh = localStorage.getItem('refresh')

        if (!refresh) {
          localStorage.clear()
          window.location.href = '/login'
          return Promise.reject(err)
        }

        const { data } = await api.post('/auth/refresh/', { refresh })

        localStorage.setItem('access', data.access)
        orig.headers.Authorization = `Bearer ${data.access}`

        return api(orig)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  }
)

export default api
