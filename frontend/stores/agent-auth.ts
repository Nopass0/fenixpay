import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Agent {
  id: string
  email: string
  name: string
  commissionRate: number
  trcWallet: string | null
}

interface AgentAuthState {
  agent: Agent | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  verify: () => Promise<boolean>
  setAgent: (agent: Agent) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const useAgentAuth = create<AgentAuthState>()(
  persist(
    (set, get) => ({
      agent: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await fetch(`${API_URL}/agent/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Ошибка входа')
          }

          const data = await response.json()
          set({
            agent: data.agent,
            token: data.token,
            isAuthenticated: true,
          })
        } catch (error) {
          throw error
        }
      },

      logout: () => {
        const { token } = get()
        if (token) {
          fetch(`${API_URL}/agent/logout`, {
            method: 'POST',
            headers: {
              'x-agent-token': token,
            },
          }).catch(() => {})
        }
        
        set({
          agent: null,
          token: null,
          isAuthenticated: false,
        })
      },

      verify: async () => {
        const { token } = get()
        if (!token) return false

        try {
          const response = await fetch(`${API_URL}/agent/verify`, {
            headers: {
              'x-agent-token': token,
            },
          })

          if (!response.ok) {
            set({
              agent: null,
              token: null,
              isAuthenticated: false,
            })
            return false
          }

          const data = await response.json()
          if (data.success && data.agent) {
            set({
              agent: data.agent,
              isAuthenticated: true,
            })
            return true
          }

          return false
        } catch (error) {
          set({
            agent: null,
            token: null,
            isAuthenticated: false,
          })
          return false
        }
      },

      setAgent: (agent: Agent) => {
        set({ agent })
      },
    }),
    {
      name: 'agent-auth',
    }
  )
)