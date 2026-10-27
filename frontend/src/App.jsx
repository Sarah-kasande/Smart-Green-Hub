// All pages and who may open them.
// Each page is loaded only when it is opened (React.lazy), so phones download less at first (NFR01).
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import PageLoader from './components/ui/PageLoader'
import PublicLayout from './layouts/PublicLayout'
// The signed-in layout (menus, dialogs, search) is loaded only after signing in, so the public
// pages stay light on phones. When a signed-in page is opened directly (bookmark, installed app),
// loading starts at once, in parallel with the sign-in check, instead of one step after another.
const loadAppLayout = () => import('./layouts/AppLayout')
const AppLayout = lazy(loadAppLayout)
if (/^\/(operator|institution|admin)/.test(window.location.pathname)) loadAppLayout()
import RequireRole from './auth/RequireRole'
import { UpdateOnNavigate } from './pwa'
const Landing = lazy(() => import('./pages/public/Landing'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Settings = lazy(() => import('./pages/account/Settings'))
const OperatorHome = lazy(() => import('./pages/operator/OperatorHome'))
const Batches = lazy(() => import('./pages/operator/Batches'))
const BatchNew = lazy(() => import('./pages/operator/BatchNew'))
const BatchDetail = lazy(() => import('./pages/operator/BatchDetail'))
const SalesExpenses = lazy(() => import('./pages/operator/SalesExpenses'))
const Alerts = lazy(() => import('./pages/operator/Alerts'))
const Planting = lazy(() => import('./pages/operator/Planting'))
const SurplusListings = lazy(() => import('./pages/operator/SurplusListings'))
const SyncPage = lazy(() => import('./pages/operator/SyncPage'))
const InstitutionHome = lazy(() => import('./pages/institution/InstitutionHome'))
const Board = lazy(() => import('./pages/institution/Board'))
const Requests = lazy(() => import('./pages/shared/Requests'))
const Impact = lazy(() => import('./pages/shared/Impact'))
const Notifications = lazy(() => import('./pages/shared/Notifications'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const VerificationQueue = lazy(() => import('./pages/admin/VerificationQueue'))
const RulesSpecies = lazy(() => import('./pages/admin/RulesSpecies'))
const AdminListings = lazy(() => import('./pages/admin/AdminListings'))
const AuditLog = lazy(() => import('./pages/admin/AuditLog'))
const EmailProblems = lazy(() => import('./pages/admin/EmailProblems'))
import RequireApproved from './auth/RequireApproved'
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <UpdateOnNavigate />
    <Routes>
      {/* Anyone */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Nursery operators */}
      <Route element={<RequireRole roles={['operator']} />}>
        <Route path="/operator" element={<AppLayout />}>
          <Route index element={<OperatorHome />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          {/* Everything below needs an approved nursery (FR02) */}
          <Route element={<RequireApproved />}>
            <Route path="batches" element={<Batches />} />
            <Route path="batches/new" element={<BatchNew />} />
            <Route path="batches/:id" element={<BatchDetail />} />
            <Route path="sales" element={<SalesExpenses />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="planting" element={<Planting />} />
            <Route path="surplus" element={<SurplusListings />} />
            <Route path="requests" element={<Requests />} />
            <Route path="impact" element={<Impact />} />
            <Route path="sync" element={<SyncPage />} />
          </Route>
        </Route>
      </Route>

      {/* Receiving institutions */}
      <Route element={<RequireRole roles={['institution']} />}>
        <Route path="/institution" element={<AppLayout />}>
          <Route index element={<InstitutionHome />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route element={<RequireApproved />}>
            <Route path="board" element={<Board />} />
            <Route path="requests" element={<Requests />} />
            <Route path="impact" element={<Impact />} />
          </Route>
        </Route>
      </Route>

      {/* Administrator */}
      <Route element={<RequireRole roles={['admin']} />}>
        <Route path="/admin" element={<AppLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="verification" element={<VerificationQueue />} />
          <Route path="rules" element={<RulesSpecies />} />
          <Route path="listings" element={<AdminListings />} />
          <Route path="impact" element={<Impact />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="notifications-failed" element={<EmailProblems />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
