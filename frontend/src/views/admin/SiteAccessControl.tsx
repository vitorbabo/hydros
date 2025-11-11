import { useState } from 'react'
import { MapPin, Users, Check, X, Download } from 'lucide-react'
import { useUserManagementStore } from '../../store/userManagementStore'
import { useDashboardStore } from '../../store/dashboardStore'
import { UserRole } from '../../store/authStore'

export function SiteAccessControl() {
  const { users, assignSiteToUser, removeSiteFromUser } = useUserManagementStore()
  const { sites } = useDashboardStore()

  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')
  const [filterSite, setFilterSite] = useState<string | 'all'>('all')

  const sitesList = Object.values(sites)
  const nonAdminUsers = users.filter((u) => u.role !== 'admin')

  // Filter users based on role and site
  const filteredUsers = nonAdminUsers.filter((user) => {
    const roleMatch = filterRole === 'all' || user.role === filterRole
    const siteMatch =
      filterSite === 'all' || user.assignedSites.includes(filterSite)
    return roleMatch && siteMatch
  })

  const hasAccess = (userId: string, siteId: string): boolean => {
    const user = users.find((u) => u.id === userId)
    return user?.assignedSites.includes(siteId) || false
  }

  const toggleAccess = (userId: string, siteId: string) => {
    if (hasAccess(userId, siteId)) {
      removeSiteFromUser(userId, siteId)
    } else {
      assignSiteToUser(userId, siteId)
    }
  }

  const exportToCSV = () => {
    // Create CSV header
    const header = ['User', 'Email', 'Role', ...sitesList.map((s) => s.name)]

    // Create CSV rows
    const rows = filteredUsers.map((user) => [
      user.name,
      user.email,
      user.role,
      ...sitesList.map((site) => (hasAccess(user.id, site.id) ? 'Yes' : 'No'))
    ])

    // Combine header and rows
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n')

    // Download file
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `site-access-control-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
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
              <MapPin className="w-7 h-7 text-primary" />
              Site Access Control
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage user access to sites with matrix view
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Role Filter */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="site_manager">Site Manager</option>
              <option value="technician">Technician</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Site Filter */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Filter by Site
            </label>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Sites</option>
              {sitesList.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
            Showing{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {filteredUsers.length}
            </span>{' '}
            users and{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {sitesList.length}
            </span>{' '}
            sites
          </div>
        </div>
      </div>

      {/* Matrix Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
        {sitesList.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No sites available</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No users match the filters
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-20 min-w-[250px]">
                      User
                    </th>
                    {sitesList.map((site) => (
                      <th
                        key={site.id}
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{site.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 sticky left-0 bg-white dark:bg-gray-800 z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-semibold text-sm">
                              {user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getRoleBadgeColor(
                                user.role
                              )}`}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                          </div>
                        </div>
                      </td>
                      {sitesList.map((site) => (
                        <td key={site.id} className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleAccess(user.id, site.id)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                              hasAccess(user.id, site.id)
                                ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            title={
                              hasAccess(user.id, site.id)
                                ? 'Click to revoke access'
                                : 'Click to grant access'
                            }
                          >
                            {hasAccess(user.id, site.id) ? (
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
            How to Use
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p>
              • Click the checkmark or X icon to toggle site access for each user
            </p>
            <p>
              • Green checkmark indicates the user has access to that site
            </p>
            <p>• Gray X indicates the user does not have access to that site</p>
            <p>
              • Admin users automatically have access to all sites and are not shown
              in this matrix
            </p>
            <p>• Use filters to narrow down users by role or site assignment</p>
            <p>• Export to CSV to download the current access matrix</p>
          </div>
        </div>
      </div>
    </div>
  )
}
