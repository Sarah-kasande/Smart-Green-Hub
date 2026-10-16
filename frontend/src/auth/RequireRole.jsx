// Protects a group of pages. Not signed in -> sign-in page. Wrong role -> that user's own home.
// (The server checks roles again on every API call; this only keeps the screens tidy.)
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homePathFor, useAuth } from './AuthContext'
import PageLoader from '../components/ui/PageLoader'

export default function RequireRole({ roles }) {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />
  return <Outlet />
}
