import { useAuthStore, UserRole } from '../../store/authStore'
import { AlertTriangle } from 'lucide-react'

interface RequireRoleProps {
  children: React.ReactNode
  roles: UserRole[]
  fallback?: React.ReactNode
}

/**
 * Route guard component that requires specific roles
 * Shows 403 Forbidden error if user doesn't have required role
 */
export function RequireRole({ children, roles, fallback }: RequireRoleProps) {
  const { user } = useAuthStore()

  // User not authenticated (should be caught by RequireAuth)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to access this page.
          </p>
        </div>
      </div>
    )
  }

  // User doesn't have required role
  if (!roles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            403 - Access Forbidden
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access this page.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Your role:</strong> {user.role}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              <strong>Required roles:</strong> {roles.join(', ')}
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // User has required role, render children
  return <>{children}</>
}
