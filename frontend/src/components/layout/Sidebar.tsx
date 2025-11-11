import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Building2,
  Bell,
  FileText,
  TrendingUp,
  Settings,
  Users,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  roles?: string[] // Optional: restrict by role
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Sites',
    href: '/sites',
    icon: Building2,
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: Bell,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

const adminNavItems: NavItem[] = [
  {
    name: 'Admin',
    href: '/admin',
    icon: Users,
    roles: ['admin'],
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // Fallback for when user is not authenticated (shouldn't happen in protected routes)
  const currentUser = user || {
    name: 'Guest',
    role: 'viewer' as const,
    avatar: undefined,
  }

  const userRole = currentUser.role

  const canAccessItem = (item: NavItem): boolean => {
    if (!item.roles || item.roles.length === 0) return true
    return item.roles.includes(userRole)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      site_manager: 'Site Manager',
      technician: 'Technician',
      operator: 'Operator',
      viewer: 'Viewer',
    }
    return labels[role] || role
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed md:static inset-y-0 left-0 z-50',
          'w-64 flex-shrink-0 bg-white dark:bg-gray-900/50',
          'border-r border-gray-200 dark:border-gray-800',
          'flex flex-col',
          'transform transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo/Header */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 text-primary">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <svg
                className="w-5 h-5 text-primary"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <h1 className="text-gray-900 dark:text-white text-lg font-bold">
              Hydros IoT Hub
            </h1>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex flex-col justify-between flex-1 p-4 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {/* User Profile */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
              {currentUser.avatar ? (
                <div
                  className="bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 flex-shrink-0"
                  style={{ backgroundImage: `url("${currentUser.avatar}")` }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold text-sm">
                    {getUserInitials(currentUser.name)}
                  </span>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <h2 className="text-gray-900 dark:text-white text-base font-medium leading-normal truncate">
                  {currentUser.name}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">
                  {getRoleLabel(currentUser.role)}
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                if (!canAccessItem(item)) return null
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary/20 text-primary dark:bg-primary/30'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{item.name}</p>
                  </NavLink>
                )
              })}

              {/* Admin section */}
              {adminNavItems.some(canAccessItem) && (
                <>
                  <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
                  {adminNavItems.map((item) => {
                    if (!canAccessItem(item)) return null
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={onClose}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                            isActive
                              ? 'bg-primary/20 text-primary dark:bg-primary/30'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          )
                        }
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{item.name}</p>
                      </NavLink>
                    )
                  })}
                </>
              )}
            </nav>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col gap-1 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => {
                // TODO: Open support modal or link
                console.log('Support clicked')
              }}
            >
              <HelpCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Support</p>
            </button>
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Logout</p>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
