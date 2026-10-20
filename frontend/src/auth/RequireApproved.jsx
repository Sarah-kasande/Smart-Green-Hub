// Pages that need an approved nursery or institution (FR02). Before approval the user is sent
// back to their home page, which explains the account check. The server checks this again.
import { Navigate, Outlet } from 'react-router-dom'
import { homePathFor, useAuth } from './AuthContext'

export default function RequireApproved() {
  const { user, organisation } = useAuth()
  if (organisation?.verification_status !== 'approved') return <Navigate to={homePathFor(user.role)} replace />
  return <Outlet />
}
