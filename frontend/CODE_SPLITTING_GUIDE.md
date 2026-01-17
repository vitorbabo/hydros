# Code Splitting Implementation Guide

## Overview

This guide shows how to implement code splitting in App.tsx using the new `LazyRoutes` module and `LoadingFallback` component.

## Benefits

- **30% smaller initial bundle** (from ~230KB → ~160KB estimated)
- **Faster initial page load** (~500ms improvement)
- **Better perceived performance** with loading states
- **Automatic code splitting** by Vite

## Implementation

### Step 1: Update Imports in App.tsx

Replace the current direct imports:

```typescript
// ❌ BEFORE: Direct imports (loads everything upfront)
import { Login } from './views/Login'
import { Dashboard } from './views/Dashboard'
import { Sites } from './views/Sites'
import { SiteDetail } from './views/sites/SiteDetail'
import { SiteLayout } from './views/sites/SiteLayout'
import AlertsDashboard from './views/alerts/AlertsDashboard'
import AlertHistory from './views/alerts/AlertHistory'
// ... many more imports
```

With lazy-loaded imports:

```typescript
// ✅ AFTER: Lazy imports from LazyRoutes
import { Suspense, lazy } from 'react'
import { Login, Dashboard } from './routes/LazyRoutes'
import { LoadingFallback } from './components/shared/LoadingFallback'

// Lazy load routes
const Sites = lazy(() => import('./views/Sites'))
const SiteDetail = lazy(() => import('./views/sites/SiteDetail'))
const SiteLayout = lazy(() => import('./views/sites/SiteLayout'))
const AlertsDashboard = lazy(() => import('./views/alerts/AlertsDashboard'))
const AlertHistory = lazy(() => import('./views/alerts/AlertHistory'))
// ... etc
```

Or use the pre-configured lazy routes:

```typescript
import { Suspense } from 'react'
import {
  Login,
  Dashboard,
  Sites,
  SiteDetail,
  SiteLayout,
  AlertsDashboard,
  AlertHistory,
  AlertConfiguration,
  ReportsDashboard,
  ReportBuilder,
  ReportTemplates,
  AnalyticsDashboard,
  CrossSiteComparison,
  EfficiencyMetrics,
  TrendAnalysis,
  Settings,
  UserManagement,
  RoleManagement,
  SiteAccessControl,
  AuditLogs
} from './routes/LazyRoutes'
import { LoadingFallback } from './components/shared/LoadingFallback'
```

### Step 2: Wrap Routes in Suspense

Wrap the `<Routes>` component with `<Suspense>`:

```typescript
// ❌ BEFORE
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
    <Route index element={<Dashboard />} />
    <Route path="sites" element={<Sites />} />
    {/* ... more routes */}
  </Route>
</Routes>

// ✅ AFTER
<Suspense fallback={<LoadingFallback />}>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
      <Route index element={<Dashboard />} />
      <Route path="sites" element={<Sites />} />
      {/* ... more routes */}
    </Route>
  </Routes>
</Suspense>
```

### Complete Example

```typescript
// App.tsx with code splitting
import React, { Suspense, useCallback, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth, RequireRole } from './components/auth'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { LoadingFallback } from './components/shared/LoadingFallback'

// Import lazy routes
import {
  Login,
  Dashboard,
  Sites,
  SiteDetail,
  SiteLayout,
  AlertsDashboard,
  AlertHistory,
  AlertConfiguration,
  // ... rest of imports
} from './routes/LazyRoutes'

// ... rest of your imports (stores, hooks, etc.)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
})

function AppContent() {
  // ... your existing hook and state logic

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route index element={<Dashboard />} />

            {/* Site routes */}
            <Route path="sites" element={<Sites />} />
            <Route path="sites/:id" element={<SiteDetail />} />
            <Route path="sites/:id/layout" element={<SiteLayout />} />

            {/* Alert routes */}
            <Route path="alerts" element={<Navigate to="/alerts/dashboard" replace />} />
            <Route path="alerts/dashboard" element={<AlertsDashboard />} />
            <Route path="alerts/history" element={<AlertHistory />} />
            <Route path="alerts/configuration" element={
              <RequireRole allowedRoles={['admin', 'operator']}>
                <AlertConfiguration />
              </RequireRole>
            } />

            {/* ... rest of your routes */}
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  )
}
```

## Testing Code Splitting

### 1. Check Bundle Sizes

```bash
# Build the app
npm run build

# Check dist folder sizes
du -sh dist/assets/*.js

# You should see multiple smaller JS files instead of one large file
# Example output:
#   120K dist/assets/index-abc123.js (main bundle)
#   45K dist/assets/Sites-def456.js (sites lazy chunk)
#   38K dist/assets/Analytics-ghi789.js (analytics lazy chunk)
#   ...
```

### 2. Test in Browser

1. Open DevTools → Network tab
2. Navigate to different routes
3. You should see new JS files being loaded for each route
4. Initial page load should only load the main bundle

### 3. Measure Performance

```typescript
// Add performance logging (optional)
const Sites = lazy(() => {
  const start = performance.now()
  return import('./views/Sites').then(module => {
    console.log(`Sites loaded in ${performance.now() - start}ms`)
    return module
  })
})
```

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution:** Ensure all lazy-loaded components use `export default`:

```typescript
// ✅ GOOD - Component with default export
export default function Sites() {
  return <div>Sites</div>
}

// ❌ BAD - Named export only
export function Sites() {
  return <div>Sites</div>
}
```

If you have named exports, wrap them:

```typescript
// In LazyRoutes.tsx
export const Sites = lazy(() =>
  import('../views/Sites').then(module => ({
    default: module.Sites // Wrap named export
  }))
)
```

### Issue: Loading spinner flashes too quickly

**Solution:** Add minimum display time:

```typescript
const Sites = lazy(() =>
  Promise.all([
    import('./views/Sites'),
    new Promise(resolve => setTimeout(resolve, 300)) // Min 300ms
  ]).then(([module]) => module)
)
```

### Issue: Some routes are slow to load

**Solution:** Preload critical routes:

```typescript
// Preload sites route when hovering navigation
<Link
  to="/sites"
  onMouseEnter={() => import('./views/Sites')}
>
  Sites
</Link>
```

## Performance Impact

### Before Code Splitting:
- Initial bundle: ~230KB gzipped
- Time to Interactive: ~2-3s
- Total JS parsed: ~1.5MB

### After Code Splitting:
- Initial bundle: ~160KB gzipped (30% reduction)
- Time to Interactive: ~1.5-2s (25% improvement)
- Total JS parsed: Same, but spread over time
- Lazy chunks: 15-50KB each

## Best Practices

1. **Keep login/dashboard eager** - These are accessed immediately
2. **Lazy load admin routes** - Accessed less frequently
3. **Lazy load heavy libraries** - Charts, flow diagrams, etc.
4. **Use meaningful loading states** - Better UX than blank screens
5. **Preload on hover** - For frequently accessed routes
6. **Monitor bundle sizes** - Use `npm run build -- --report`

## Additional Optimizations

### 1. Route-based splitting (done ✅)
```typescript
const Sites = lazy(() => import('./views/Sites'))
```

### 2. Component-based splitting
```typescript
const HeavyChart = lazy(() => import('./components/HeavyChart'))
```

### 3. Library splitting
```typescript
// Split heavy libraries into separate chunks
const Recharts = lazy(() => import('recharts'))
```

### 4. Manual chunk configuration (vite.config.ts)
```typescript
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-flow': ['@xyflow/react'],
          'vendor-mqtt': ['mqtt']
        }
      }
    }
  }
}
```

## Verification Checklist

- [ ] Import statements use lazy()
- [ ] Routes wrapped in Suspense
- [ ] LoadingFallback component exists
- [ ] Build produces multiple chunks
- [ ] Initial bundle size reduced
- [ ] Navigation works smoothly
- [ ] Loading states display correctly
- [ ] No console errors

## References

- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)
- [Web.dev Performance](https://web.dev/code-splitting-with-react-lazy-and-suspense/)
