import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface RequireAuthProps {
  children: React.ReactNode
}

/**
 * Route guard component that requires authentication
 * Redirects to login page if user is not authenticated
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, user, initializeAuth } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    // Initialize auth on mount to restore session from localStorage
    initializeAuth()
  }, [initializeAuth])

  // Show nothing while checking authentication (prevents flash of content)
  if (isAuthenticated === false && user === null) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Authenticated, render children
  return <>{children}</>
}
