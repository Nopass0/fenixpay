import axios from 'axios'
import { useAgentAuth } from '@/stores/agent-auth'

const agentApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// Request interceptor to add auth token
agentApi.interceptors.request.use(
  (config) => {
    const token = useAgentAuth.getState().token
    if (token) {
      config.headers['x-agent-token'] = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
agentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAgentAuth.getState().logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/agent/login'
      }
    }
    return Promise.reject(error)
  }
)

export default agentApi