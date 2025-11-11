import { create } from 'zustand'

// User role types
export type UserRole = 'admin' | 'site_manager' | 'technician' | 'operator' | 'viewer'

// User interface
export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  assignedSites: string[]
  avatar?: string
  createdAt: string
  lastLogin?: string
}

// Permission definitions for each role
export const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'view:all',
    'edit:all',
    'delete:all',
    'manage:users',
    'manage:sites',
    'manage:system',
    'view:audit_logs',
    'configure:alerts',
    'acknowledge:alerts',
    'generate:reports',
    'use:ai_assistant'
  ],
  site_manager: [
    'view:assigned_sites',
    'edit:assigned_sites',
    'configure:assigned_sites',
    'manage:site_users',
    'configure:alerts',
    'acknowledge:alerts',
    'generate:reports',
    'use:ai_assistant'
  ],
  technician: [
    'view:assigned_sites',
    'edit:module_settings',
    'acknowledge:alerts',
    'view:event_logs',
    'generate:reports',
    'use:ai_assistant'
  ],
  operator: [
    'view:assigned_sites',
    'view:realtime_data',
    'acknowledge:alerts',
    'view:metrics',
    'generate:reports',
    'use:ai_assistant'
  ],
  viewer: [
    'view:assigned_sites',
    'view:analytics',
    'view:reports',
    'use:ai_assistant'
  ]
}

// Role descriptions
export const roleDescriptions: Record<UserRole, string> = {
  admin: 'Full system access with user management and configuration rights',
  site_manager: 'Manage specific sites with user assignment and configuration capabilities',
  technician: 'Operational access with limited configuration rights',
  operator: 'Monitor and respond to alerts with read-only configuration',
  viewer: 'Read-only access to assigned sites and reports'
}

// Auth store interface
interface AuthStore {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUserProfile: (updates: Partial<User>) => void
  setUser: (user: User | null) => void
  clearError: () => void

  // Permission helpers
  hasPermission: (permission: string) => boolean
  canAccessSite: (siteId: string) => boolean
  canEditSiteConfig: (siteId: string) => boolean
  canManageUsers: () => boolean
  canConfigureAlerts: (siteId?: string) => boolean

  // Initialization
  initializeAuth: () => void
}

// Mock users for testing (these would come from backend in production)
export const mockUsers: Array<User & { password: string }> = [
  {
    id: 'user-admin-001',
    email: 'admin@hydros.io',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    assignedSites: [], // Admin has access to all sites
    avatar: undefined,
    phone: '+1 (555) 123-4567',
    createdAt: '2025-01-01T00:00:00Z',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'user-manager-001',
    email: 'manager@hydros.io',
    password: 'manager123',
    name: 'Site Manager',
    role: 'site_manager',
    assignedSites: ['clear_creek', 'riverside'],
    avatar: undefined,
    phone: '+1 (555) 234-5678',
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'user-tech-001',
    email: 'tech@hydros.io',
    password: 'tech123',
    name: 'Technician',
    role: 'technician',
    assignedSites: ['clear_creek'],
    avatar: undefined,
    phone: '+1 (555) 345-6789',
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'user-operator-001',
    email: 'operator@hydros.io',
    password: 'operator123',
    name: 'Operator',
    role: 'operator',
    assignedSites: ['clear_creek', 'riverside'],
    avatar: undefined,
    phone: '+1 (555) 456-7890',
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'user-viewer-001',
    email: 'viewer@hydros.io',
    password: 'viewer123',
    name: 'Viewer',
    role: 'viewer',
    assignedSites: ['clear_creek'],
    avatar: undefined,
    createdAt: '2025-01-01T00:00:00Z'
  }
]

// Local storage keys
const AUTH_STORAGE_KEY = 'hydros_auth_user'
const AUTH_TIMESTAMP_KEY = 'hydros_auth_timestamp'
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

// Create the auth store
export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Login action
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Find user by email and password (mock authentication)
      const mockUser = mockUsers.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      )

      if (!mockUser) {
        set({
          isLoading: false,
          error: 'Invalid email or password'
        })
        return false
      }

      // Create user object without password
      const { password: _, ...user } = mockUser
      const authenticatedUser: User = {
        ...user,
        lastLogin: new Date().toISOString()
      }

      // Store in localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser))
      localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString())

      set({
        user: authenticatedUser,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

      console.log('Login successful:', authenticatedUser.email, 'Role:', authenticatedUser.role)
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: 'An error occurred during login'
      })
      return false
    }
  },

  // Logout action
  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(AUTH_TIMESTAMP_KEY)
    set({
      user: null,
      isAuthenticated: false,
      error: null
    })
    console.log('User logged out')
  },

  // Update user profile
  updateUserProfile: (updates) => {
    const currentUser = get().user
    if (!currentUser) return

    const updatedUser = { ...currentUser, ...updates }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser))
    set({ user: updatedUser })
  },

  // Set user (used during initialization)
  setUser: (user) => {
    set({
      user,
      isAuthenticated: user !== null
    })
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Permission helpers
  hasPermission: (permission) => {
    const { user } = get()
    if (!user) return false

    const userPermissions = rolePermissions[user.role]

    // Admin has all permissions
    if (user.role === 'admin') return true

    // Check specific permission or wildcard
    return userPermissions.includes(permission) || userPermissions.includes('view:all')
  },

  canAccessSite: (siteId) => {
    const { user } = get()
    if (!user) return false

    // Admin can access all sites
    if (user.role === 'admin') return true

    // Check if site is in assigned sites
    return user.assignedSites.includes(siteId)
  },

  canEditSiteConfig: (siteId) => {
    const { user, canAccessSite } = get()
    if (!user || !canAccessSite(siteId)) return false

    return user.role === 'admin' || user.role === 'site_manager'
  },

  canManageUsers: () => {
    const { user } = get()
    if (!user) return false

    return user.role === 'admin' || user.role === 'site_manager'
  },

  canConfigureAlerts: (siteId) => {
    const { user, canAccessSite } = get()
    if (!user) return false

    // Admin can configure alerts for all sites
    if (user.role === 'admin') return true

    // Site managers can configure alerts for assigned sites
    if (user.role === 'site_manager' && siteId) {
      return canAccessSite(siteId)
    }

    return false
  },

  // Initialize authentication from localStorage
  initializeAuth: () => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY)
      const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY)

      if (!storedUser || !timestamp) {
        set({ user: null, isAuthenticated: false })
        return
      }

      // Check session timeout
      const now = Date.now()
      const sessionAge = now - parseInt(timestamp, 10)

      if (sessionAge > SESSION_TIMEOUT) {
        // Session expired
        console.log('Session expired, logging out')
        get().logout()
        return
      }

      // Restore user session
      const user: User = JSON.parse(storedUser)

      // Update timestamp to extend session
      localStorage.setItem(AUTH_TIMESTAMP_KEY, now.toString())

      set({
        user,
        isAuthenticated: true
      })

      console.log('Session restored:', user.email, 'Role:', user.role)
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ user: null, isAuthenticated: false })
    }
  }
}))
