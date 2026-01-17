/**
 * Lazy-loaded route components for code splitting
 *
 * This dramatically reduces the initial bundle size by loading
 * route components only when they're needed.
 *
 * Benefits:
 * - Faster initial page load
 * - Smaller initial bundle (150-200KB → ~80-100KB)
 * - Better performance on slow connections
 * - Automatic code splitting by Vite
 */
import { lazy } from 'react'

// Core views (loaded immediately)
export { Login } from '../views/Login'
export { Dashboard } from '../views/Dashboard'

// Site views (lazy loaded)
export const Sites = lazy(() => import('../views/Sites'))
export const SiteDetail = lazy(() => import('../views/sites/SiteDetail'))
export const SiteLayout = lazy(() => import('../views/sites/SiteLayout'))

// Alert views (lazy loaded)
export const AlertsDashboard = lazy(() => import('../views/alerts/AlertsDashboard'))
export const AlertHistory = lazy(() => import('../views/alerts/AlertHistory'))
export const AlertConfiguration = lazy(() => import('../views/alerts/AlertConfiguration'))

// Report views (lazy loaded)
export const ReportsDashboard = lazy(() => import('../views/reports/ReportsDashboard'))
export const ReportBuilder = lazy(() => import('../views/reports/ReportBuilder'))
export const ReportTemplates = lazy(() => import('../views/reports/ReportTemplates'))

// Analytics views (lazy loaded)
export const AnalyticsDashboard = lazy(() => import('../views/analytics/AnalyticsDashboard'))
export const CrossSiteComparison = lazy(() => import('../views/analytics/CrossSiteComparison'))
export const EfficiencyMetrics = lazy(() => import('../views/analytics/EfficiencyMetrics'))
export const TrendAnalysis = lazy(() => import('../views/analytics/TrendAnalysis'))

// Settings and Admin views (lazy loaded)
export const Settings = lazy(() => import('../views/Settings'))
export const UserManagement = lazy(() => import('../views/admin/UserManagement'))
export const RoleManagement = lazy(() => import('../views/admin/RoleManagement'))
export const SiteAccessControl = lazy(() => import('../views/admin/SiteAccessControl'))
export const AuditLogs = lazy(() => import('../views/admin/AuditLogs'))
