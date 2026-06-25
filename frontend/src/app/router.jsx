import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { RailSkeleton, HeroBannerSkeleton } from '../components/feedback/Skeleton';

const RouteErrorBoundary = lazy(() => import('../components/feedback/ErrorBoundary').then(m => ({ default: m.RouteErrorBoundary })));
const GlobalErrorBoundary = lazy(() => import('../components/feedback/GlobalErrorBoundary'));
const MainSiteLayout = lazy(() => import('../layouts/MainSiteLayout'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));

const HomePage = lazy(() => import('../pages/HomePage'));
const BrowsePage = lazy(() => import('../pages/BrowsePage'));
const MovieDetailsPage = lazy(() => import('../pages/MovieDetailsPage'));
const SeriesDetailsPage = lazy(() => import('../pages/SeriesDetailsPage'));
const VideoPlayerPage = lazy(() => import('../pages/VideoPlayerPage'));
const AccessPage = lazy(() => import('../pages/AccessPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AddContentPage = lazy(() => import('../pages/admin/AddContentPage'));
const ContentLibraryPage = lazy(() => import('../pages/admin/ContentLibraryPage'));
const ScannerPage = lazy(() => import('../pages/admin/ScannerPage'));
const DuplicatesPage = lazy(() => import('../pages/admin/DuplicatesPage'));
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const SearchAnalyticsPage = lazy(() => import('../pages/admin/SearchAnalyticsPage'));

function withRouteFallback(element, routeType = 'default') {
  const getFallback = () => {
    switch (routeType) {
      case 'home':
        return <HeroBannerSkeleton />;
      case 'browse':
        return (
          <div style={{ padding: 'var(--spacing-lg) var(--spacing-lg) var(--spacing-xl)' }}>
            <RailSkeleton count={6} />
          </div>
        );
      case 'detail':
        return (
          <div style={{ padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
            <RailSkeleton count={1} />
          </div>
        );
      default:
        return (
          <div style={{
            minHeight: '40vh',
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255,255,255,0.72)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            Loading...
          </div>
        );
    }
  };

  return (
    <Suspense fallback={getFallback()}>
      {element}
    </Suspense>
  );
}

function TVRedirect() {
  useEffect(() => {
    window.location.replace('http://10.45.45.254/');
  }, []);
  return null;
}

function LayoutSuspense({ children }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />
    }>
      {children}
    </Suspense>
  );
}

const appBasePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LayoutSuspense><MainSiteLayout /></LayoutSuspense>,
    errorElement: <LayoutSuspense><RouteErrorBoundary /></LayoutSuspense>,
    children: [
      {
        index: true,
        element: withRouteFallback(<HomePage />, 'home'),
      },
      {
        path: 'browse',
        element: withRouteFallback(<BrowsePage />, 'browse'),
      },
      {
        path: 'movies',
        element: withRouteFallback(<BrowsePage type="movie" />, 'browse'),
      },
      {
        path: 'series',
        element: withRouteFallback(<BrowsePage type="series" />, 'browse'),
      },
      {
        path: 'search',
        element: <Navigate to="/browse" replace />,
      },
      {
        path: 'movies/:slug',
        element: withRouteFallback(<MovieDetailsPage />, 'detail'),
      },
      {
        path: 'series/:slug',
        element: withRouteFallback(<SeriesDetailsPage />, 'detail'),
      },
      {
        path: 'tv',
        element: <TVRedirect />,
      },
      {
        path: 'access',
        element: withRouteFallback(<AccessPage />, 'default'),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '/admin',
    element: <LayoutSuspense><AdminLayout /></LayoutSuspense>,
    errorElement: <LayoutSuspense><RouteErrorBoundary /></LayoutSuspense>,
    children: [
      {
        index: true,
        element: withRouteFallback(<AdminDashboard />, 'default'),
      },
      {
        path: 'content',
        element: withRouteFallback(<ContentLibraryPage />, 'browse'),
      },
      {
        path: 'content/new',
        element: withRouteFallback(<AddContentPage />, 'default'),
      },
      {
        path: 'content/:id/edit',
        element: withRouteFallback(<AddContentPage />, 'default'),
      },
      {
        path: 'movies',
        element: withRouteFallback(<ContentLibraryPage />, 'browse'),
      },
      {
        path: 'series',
        element: withRouteFallback(<ContentLibraryPage />, 'browse'),
      },
      {
        path: 'scanner',
        element: withRouteFallback(<ScannerPage />, 'default'),
      },
      {
        path: 'duplicates',
        element: withRouteFallback(<DuplicatesPage />, 'default'),
      },
      {
        path: 'users',
        element: withRouteFallback(<UsersPage />, 'default'),
      },
      {
        path: 'analytics',
        element: withRouteFallback(<SearchAnalyticsPage />, 'default'),
      },
      {
        path: '*',
        element: <Navigate to="/admin" replace />,
      },
    ],
  },
  {
    path: '/login',
    element: withRouteFallback(<LoginPage />, 'default'),
  },
  {
    path: '/play/:type/:id',
    element: withRouteFallback(<VideoPlayerPage />, 'default'),
  },
], {
  basename: appBasePath,
});

function AppRouter() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />
    }>
      <GlobalErrorBoundary>
        <RouterProvider router={router} />
      </GlobalErrorBoundary>
    </Suspense>
  );
}

export default AppRouter;
