import { Shield, Check, X } from 'lucide-react'
import { useUserManagementStore } from '../../store/userManagementStore'
import { rolePermissions, roleDescriptions, UserRole } from '../../store/authStore'

export function RoleManagement() {
  const { roles } = useUserManagementStore()

  const rolesList: UserRole[] = ['admin', 'site_manager', 'technician', 'operator', 'viewer']

  // Define feature categories for better organization
  const featureCategories = [
    {
      name: 'Dashboard & Overview',
      permissions: ['view:all', 'view:assigned_sites']
    },
    {
      name: 'Site Configuration',
      permissions: ['edit:all', 'edit:assigned_sites', 'configure:assigned_sites']
    },
    {
      name: 'Module Settings',
      permissions: ['edit:module_settings']
    },
    {
      name: 'Alerts & Notifications',
      permissions: ['configure:alerts', 'acknowledge:alerts']
    },
    {
      name: 'Real-time Monitoring',
      permissions: ['view:realtime_data', 'view:metrics']
    },
    {
      name: 'Event Logs',
      permissions: ['view:event_logs']
    },
    {
      name: 'Analytics & Reports',
      permissions: ['view:analytics', 'view:reports', 'generate:reports']
    },
    {
      name: 'AI Assistant',
      permissions: ['use:ai_assistant']
    },
    {
      name: 'User Management',
      permissions: ['manage:users', 'manage:site_users']
    },
    {
      name: 'System Administration',
      permissions: ['manage:sites', 'manage:system', 'view:audit_logs', 'delete:all']
    }
  ]

  const hasPermission = (role: UserRole, permission: string): boolean => {
    const perms = rolePermissions[role]
    return perms.includes(permission) || perms.includes('view:all') || perms.includes('edit:all')
  }

  const getPermissionLabel = (permission: string): string => {
    const labels: Record<string, string> = {
      'view:all': 'View All Sites',
      'view:assigned_sites': 'View Assigned Sites',
      'edit:all': 'Edit All Sites',
      'edit:assigned_sites': 'Edit Assigned Sites',
      'configure:assigned_sites': 'Configure Sites',
      'edit:module_settings': 'Edit Module Settings',
      'configure:alerts': 'Configure Alert Rules',
      'acknowledge:alerts': 'Acknowledge Alerts',
      'view:realtime_data': 'View Real-time Data',
      'view:metrics': 'View Metrics',
      'view:event_logs': 'View Event Logs',
      'view:analytics': 'View Analytics',
      'view:reports': 'View Reports',
      'generate:reports': 'Generate Reports',
      'use:ai_assistant': 'Use AI Assistant',
      'manage:users': 'Manage All Users',
      'manage:site_users': 'Manage Site Users',
      'manage:sites': 'Manage Sites',
      'manage:system': 'System Settings',
      'view:audit_logs': 'View Audit Logs',
      'delete:all': 'Delete Resources'
    }
    return labels[permission] || permission
  }

  const getRoleBadgeColor = (role: UserRole) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      site_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      technician: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      operator: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
    return colors[role]
  }

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      admin: 'Admin',
      site_manager: 'Site Manager',
      technician: 'Technician',
      operator: 'Operator',
      viewer: 'Viewer'
    }
    return labels[role]
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-primary" />
              Role Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View role definitions and permission matrix
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
        {/* Role Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {rolesList.map((role) => (
            <div
              key={role}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      role
                    )}`}
                  >
                    <Shield className="w-3 h-3" />
                    {getRoleLabel(role)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {rolePermissions[role].length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    permissions
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {roleDescriptions[role]}
              </p>
            </div>
          ))}
        </div>

        {/* Permission Matrix */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Permission Matrix
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Detailed breakdown of permissions by role
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">
                    Feature / Permission
                  </th>
                  {rolesList.map((role) => (
                    <th
                      key={role}
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{getRoleLabel(role)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {featureCategories.map((category, catIndex) => (
                  <>
                    {/* Category Header */}
                    <tr
                      key={`cat-${catIndex}`}
                      className="bg-gray-50 dark:bg-gray-700/50"
                    >
                      <td
                        colSpan={rolesList.length + 1}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {category.name}
                      </td>
                    </tr>

                    {/* Permissions in Category */}
                    {category.permissions.map((permission) => (
                      <tr
                        key={permission}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-3 text-sm text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
                          {getPermissionLabel(permission)}
                        </td>
                        {rolesList.map((role) => (
                          <td
                            key={`${role}-${permission}`}
                            className="px-6 py-3 text-center"
                          >
                            {hasPermission(role, permission) ? (
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full">
                                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
            Role Hierarchy
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p>
              <strong>Admin:</strong> Full system access with no restrictions
            </p>
            <p>
              <strong>Site Manager:</strong> Can manage assigned sites and their users
            </p>
            <p>
              <strong>Technician:</strong> Can adjust module settings and acknowledge alerts
            </p>
            <p>
              <strong>Operator:</strong> Can monitor systems and acknowledge alerts
            </p>
            <p>
              <strong>Viewer:</strong> Read-only access to assigned sites
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
