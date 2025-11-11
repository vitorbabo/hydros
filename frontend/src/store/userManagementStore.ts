import { create } from 'zustand'
import { User, UserRole, mockUsers } from './authStore'

// Role interface
export interface Role {
  id: string
  name: string
  permissions: string[]
  description: string
}

// Audit log interface
export interface AuditLog {
  id: string
  userId: string
  userName: string
  userEmail: string
  action: string
  resource: string
  resourceId: string
  timestamp: string
  details?: Record<string, unknown>
  ipAddress?: string
}

// User management store interface
interface UserManagementStore {
  // State
  users: User[]
  roles: Role[]
  auditLogs: AuditLog[]
  isLoading: boolean
  error: string | null

  // Filters
  selectedRole: UserRole | 'all'
  selectedSite: string | 'all'
  searchQuery: string

  // User management
  getUsers: () => void
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void
  updateUser: (userId: string, updates: Partial<User>) => void
  deleteUser: (userId: string) => void
  getUserById: (userId: string) => User | undefined

  // Site assignment
  assignSiteToUser: (userId: string, siteId: string) => void
  removeSiteFromUser: (userId: string, siteId: string) => void
  bulkAssignSitesToUser: (userId: string, siteIds: string[]) => void

  // Filter management
  setSelectedRole: (role: UserRole | 'all') => void
  setSelectedSite: (siteId: string | 'all') => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void

  // Getters
  getUsersBySite: (siteId: string) => User[]
  getUsersByRole: (role: UserRole) => User[]
  getFilteredUsers: () => User[]

  // Audit logging
  logAction: (
    userId: string,
    userName: string,
    userEmail: string,
    action: string,
    resource: string,
    resourceId: string,
    details?: Record<string, unknown>
  ) => void
  getAuditLogsByUser: (userId: string) => AuditLog[]
  getAuditLogsByResource: (resource: string, resourceId: string) => AuditLog[]
  clearAuditLogs: () => void

  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
}

// Generate unique ID
const generateId = () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
const generateAuditId = () => `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Predefined roles
const predefinedRoles: Role[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    permissions: [
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
    description: 'Full system access with user management and configuration rights'
  },
  {
    id: 'role-site-manager',
    name: 'Site Manager',
    permissions: [
      'view:assigned_sites',
      'edit:assigned_sites',
      'configure:assigned_sites',
      'manage:site_users',
      'configure:alerts',
      'acknowledge:alerts',
      'generate:reports',
      'use:ai_assistant'
    ],
    description: 'Manage specific sites with user assignment and configuration capabilities'
  },
  {
    id: 'role-technician',
    name: 'Technician',
    permissions: [
      'view:assigned_sites',
      'edit:module_settings',
      'acknowledge:alerts',
      'view:event_logs',
      'generate:reports',
      'use:ai_assistant'
    ],
    description: 'Operational access with limited configuration rights'
  },
  {
    id: 'role-operator',
    name: 'Operator',
    permissions: [
      'view:assigned_sites',
      'view:realtime_data',
      'acknowledge:alerts',
      'view:metrics',
      'generate:reports',
      'use:ai_assistant'
    ],
    description: 'Monitor and respond to alerts with read-only configuration'
  },
  {
    id: 'role-viewer',
    name: 'Viewer',
    permissions: ['view:assigned_sites', 'view:analytics', 'view:reports', 'use:ai_assistant'],
    description: 'Read-only access to assigned sites and reports'
  }
]

// Initialize with mock users (convert from authStore mock users)
const initializeUsers = (): User[] => {
  return mockUsers.map(({ password: _, ...user }) => user)
}

// Create the user management store
export const useUserManagementStore = create<UserManagementStore>((set, get) => ({
  // Initial state
  users: initializeUsers(),
  roles: predefinedRoles,
  auditLogs: [],
  isLoading: false,
  error: null,
  selectedRole: 'all',
  selectedSite: 'all',
  searchQuery: '',

  // Get users (in real app, this would fetch from API)
  getUsers: () => {
    set({ isLoading: true })
    // Simulate API call
    setTimeout(() => {
      set({ isLoading: false })
    }, 500)
  },

  // Add user
  addUser: (userData) => {
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString()
    }

    set((state) => ({
      users: [...state.users, newUser]
    }))

    console.log('User added:', newUser.email)
  },

  // Update user
  updateUser: (userId, updates) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      )
    }))

    console.log('User updated:', userId)
  },

  // Delete user
  deleteUser: (userId) => {
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId)
    }))

    console.log('User deleted:', userId)
  },

  // Get user by ID
  getUserById: (userId) => {
    return get().users.find((user) => user.id === userId)
  },

  // Assign site to user
  assignSiteToUser: (userId, siteId) => {
    set((state) => ({
      users: state.users.map((user) => {
        if (user.id === userId && !user.assignedSites.includes(siteId)) {
          return {
            ...user,
            assignedSites: [...user.assignedSites, siteId]
          }
        }
        return user
      })
    }))

    console.log('Site assigned:', siteId, 'to user:', userId)
  },

  // Remove site from user
  removeSiteFromUser: (userId, siteId) => {
    set((state) => ({
      users: state.users.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            assignedSites: user.assignedSites.filter((id) => id !== siteId)
          }
        }
        return user
      })
    }))

    console.log('Site removed:', siteId, 'from user:', userId)
  },

  // Bulk assign sites to user
  bulkAssignSitesToUser: (userId, siteIds) => {
    set((state) => ({
      users: state.users.map((user) => {
        if (user.id === userId) {
          const uniqueSites = Array.from(new Set([...user.assignedSites, ...siteIds]))
          return {
            ...user,
            assignedSites: uniqueSites
          }
        }
        return user
      })
    }))

    console.log('Bulk sites assigned to user:', userId)
  },

  // Filter management
  setSelectedRole: (role) => set({ selectedRole: role }),
  setSelectedSite: (siteId) => set({ selectedSite: siteId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () =>
    set({
      selectedRole: 'all',
      selectedSite: 'all',
      searchQuery: ''
    }),

  // Get users by site
  getUsersBySite: (siteId) => {
    return get().users.filter(
      (user) => user.role === 'admin' || user.assignedSites.includes(siteId)
    )
  },

  // Get users by role
  getUsersByRole: (role) => {
    return get().users.filter((user) => user.role === role)
  },

  // Get filtered users
  getFilteredUsers: () => {
    const { users, selectedRole, selectedSite, searchQuery } = get()

    return users.filter((user) => {
      // Role filter
      const roleMatch = selectedRole === 'all' || user.role === selectedRole

      // Site filter (admin users match all sites)
      const siteMatch =
        selectedSite === 'all' ||
        user.role === 'admin' ||
        user.assignedSites.includes(selectedSite)

      // Search query filter
      const searchMatch =
        searchQuery === '' ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(searchQuery))

      return roleMatch && siteMatch && searchMatch
    })
  },

  // Log action
  logAction: (userId, userName, userEmail, action, resource, resourceId, details) => {
    const auditLog: AuditLog = {
      id: generateAuditId(),
      userId,
      userName,
      userEmail,
      action,
      resource,
      resourceId,
      timestamp: new Date().toISOString(),
      details
    }

    set((state) => ({
      auditLogs: [auditLog, ...state.auditLogs]
    }))

    console.log('Audit log created:', action, resource, resourceId)
  },

  // Get audit logs by user
  getAuditLogsByUser: (userId) => {
    return get().auditLogs.filter((log) => log.userId === userId)
  },

  // Get audit logs by resource
  getAuditLogsByResource: (resource, resourceId) => {
    return get().auditLogs.filter(
      (log) => log.resource === resource && log.resourceId === resourceId
    )
  },

  // Clear audit logs
  clearAuditLogs: () => set({ auditLogs: [] }),

  // Error handling
  setError: (error) => set({ error }),
  clearError: () => set({ error: null })
}))

// Mock audit logs for development
export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    userId: 'user-admin-001',
    userName: 'Admin User',
    userEmail: 'admin@hydros.io',
    action: 'user:created',
    resource: 'user',
    resourceId: 'user-tech-001',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    details: { role: 'technician', email: 'tech@hydros.io' }
  },
  {
    id: 'audit-2',
    userId: 'user-admin-001',
    userName: 'Admin User',
    userEmail: 'admin@hydros.io',
    action: 'site:assigned',
    resource: 'user',
    resourceId: 'user-operator-001',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    details: { siteId: 'clear_creek', siteName: 'Clear Creek Water Treatment Plant' }
  },
  {
    id: 'audit-3',
    userId: 'user-manager-001',
    userName: 'Site Manager',
    userEmail: 'manager@hydros.io',
    action: 'alert_rule:updated',
    resource: 'alert_rule',
    resourceId: 'rule-1',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    details: { field: 'threshold', oldValue: 4, newValue: 5 }
  },
  {
    id: 'audit-4',
    userId: 'user-admin-001',
    userName: 'Admin User',
    userEmail: 'admin@hydros.io',
    action: 'user:deleted',
    resource: 'user',
    resourceId: 'user-old-001',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    details: { email: 'olduser@hydros.io', role: 'viewer' }
  }
]
