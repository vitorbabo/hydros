import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useUserManagementStore } from '../../store/userManagementStore'
import { useAuthStore, UserRole, roleDescriptions } from '../../store/authStore'
import { useDashboardStore } from '../../store/dashboardStore'

interface UserFormModalProps {
  userId?: string | null
  onClose: () => void
}

export function UserFormModal({ userId, onClose }: UserFormModalProps) {
  const { users, addUser, updateUser, getUserById } = useUserManagementStore()
  const { user: currentUser, logAction } = useAuthStore()
  const { sites } = useDashboardStore()

  const isEditing = !!userId
  const existingUser = userId ? getUserById(userId) : null

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'viewer' as UserRole,
    assignedSites: [] as string[]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with existing user data
  useEffect(() => {
    if (existingUser) {
      setFormData({
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone || '',
        role: existingUser.role,
        assignedSites: existingUser.assignedSites
      })
    }
  }, [existingUser])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    } else {
      // Check for duplicate email (excluding current user when editing)
      const emailExists = users.some(
        (u) =>
          u.email.toLowerCase() === formData.email.toLowerCase() &&
          u.id !== userId
      )
      if (emailExists) {
        newErrors.email = 'Email already exists'
      }
    }

    // Phone validation (optional)
    if (formData.phone && !/^[+]?[\d\s()-]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format'
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required'
    }

    // Site assignment validation (not required for admin)
    if (formData.role !== 'admin' && formData.assignedSites.length === 0) {
      newErrors.assignedSites = 'At least one site must be assigned'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditing && userId) {
        // Update existing user
        updateUser(userId, {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          assignedSites: formData.role === 'admin' ? [] : formData.assignedSites
        })

        console.log('User updated successfully')
      } else {
        // Add new user
        addUser({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          assignedSites: formData.role === 'admin' ? [] : formData.assignedSites,
          lastLogin: undefined
        })

        console.log('User created successfully')
      }

      // Close modal
      onClose()
    } catch (error) {
      console.error('Error saving user:', error)
      setErrors({ submit: 'Failed to save user. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      // Clear site assignments if switching to admin
      assignedSites: role === 'admin' ? [] : prev.assignedSites
    }))
    // Clear role error
    setErrors((prev) => ({ ...prev, role: '', assignedSites: '' }))
  }

  const handleSiteToggle = (siteId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedSites: prev.assignedSites.includes(siteId)
        ? prev.assignedSites.filter((id) => id !== siteId)
        : [...prev.assignedSites, siteId]
    }))
    // Clear site assignment error
    setErrors((prev) => ({ ...prev, assignedSites: '' }))
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General Error */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
              {errors.submit}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.name
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.email
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.phone
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Role Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role *
            </label>
            <div className="space-y-2">
              {(
                ['admin', 'site_manager', 'technician', 'operator', 'viewer'] as UserRole[]
              ).map((role) => (
                <label
                  key={role}
                  className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={formData.role === role}
                    onChange={() => handleRoleChange(role)}
                    className="mt-1 w-4 h-4 text-primary border-gray-300 dark:border-gray-600 focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white capitalize">
                      {role.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {roleDescriptions[role]}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.role}
              </p>
            )}
          </div>

          {/* Site Assignment */}
          {formData.role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned Sites *
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {Object.values(sites).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No sites available
                  </p>
                ) : (
                  Object.values(sites).map((site) => (
                    <label
                      key={site.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assignedSites.includes(site.id)}
                        onChange={() => handleSiteToggle(site.id)}
                        className="w-4 h-4 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
                      />
                      <span className="text-gray-900 dark:text-white">
                        {site.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {errors.assignedSites && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.assignedSites}
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
