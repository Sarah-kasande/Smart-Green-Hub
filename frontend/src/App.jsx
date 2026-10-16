// All pages and who may open them.
import { Route, Routes } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AppLayout from './layouts/AppLayout'
import RequireRole from './auth/RequireRole'
import Landing from './pages/public/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import CheckEmail from './pages/auth/CheckEmail'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import AccountHome from './pages/account/AccountHome'
import Settings from './pages/account/Settings'
import VerificationQueue from './pages/admin/VerificationQueue'
import ComingSoon from './pages/ComingSoon'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Anyone */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Nursery operators */}
      <Route element={<RequireRole roles={['operator']} />}>
        <Route path="/operator" element={<AppLayout />}>
          <Route index element={<AccountHome />} />
          <Route path="batches" element={<ComingSoon title="nav.batches" />} />
          <Route path="sales" element={<ComingSoon title="nav.salesExpenses" />} />
          <Route path="alerts" element={<ComingSoon title="nav.alerts" />} />
          <Route path="planting" element={<ComingSoon title="nav.planting" />} />
          <Route path="surplus" element={<ComingSoon title="nav.surplusBoard" />} />
          <Route path="requests" element={<ComingSoon title="nav.requests" />} />
          <Route path="impact" element={<ComingSoon title="nav.impact" />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Receiving institutions */}
      <Route element={<RequireRole roles={['institution']} />}>
        <Route path="/institution" element={<AppLayout />}>
          <Route index element={<AccountHome />} />
          <Route path="board" element={<ComingSoon title="nav.surplusBoard" />} />
          <Route path="requests" element={<ComingSoon title="nav.requests" />} />
          <Route path="impact" element={<ComingSoon title="nav.impact" />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Administrator */}
      <Route element={<RequireRole roles={['admin']} />}>
        <Route path="/admin" element={<AppLayout />}>
          <Route index element={<VerificationQueue />} />
          <Route path="rules" element={<ComingSoon title="nav.rules" />} />
          <Route path="audit" element={<ComingSoon title="nav.audit" />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
