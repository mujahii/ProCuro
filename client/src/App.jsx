import { lazy, Suspense, Component } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import PWAInstallPrompt from './components/ui/PWAInstallPrompt'
import CookieConsent from './components/ui/CookieConsent'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AddressProvider } from './context/AddressContext'
import { LanguageProvider } from './context/LanguageContext'

// First-paint critical (eager)
import LandingPage from './pages/public/LandingPage'
import LoginPage from './pages/public/LoginPage'
import RegisterOwnerPage from './pages/public/RegisterOwnerPage'
import RegisterSupplierPage from './pages/public/RegisterSupplierPage'

// Layouts + routing helpers (eager)
import OwnerLayout from './components/layout/OwnerLayout'
import SupplierLayout from './components/layout/SupplierLayout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/routing/ProtectedRoute'
import PublicOnlyRoute from './components/routing/PublicOnlyRoute'
import ChatbotFAB from './components/ai/ChatbotFAB'

// Secondary public pages
const SelectRolePage = lazy(() => import('./pages/public/SelectRolePage'))
const PublicSupplierProfilePage = lazy(() => import('./pages/public/SupplierProfilePage'))
const SupplierListPage = lazy(() => import('./pages/public/SupplierListPage'))
const ProductsListPage = lazy(() => import('./pages/public/ProductsListPage'))
const ResetPasswordPage = lazy(() => import('./pages/public/ResetPasswordPage'))
const AboutPage = lazy(() => import('./pages/public/AboutPage'))
const HelpCenterPage = lazy(() => import('./pages/public/HelpCenterPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('./pages/public/TermsOfServicePage'))
const CareersPage = lazy(() => import('./pages/public/CareersPage'))
const PressPage = lazy(() => import('./pages/public/PressPage'))
const AccountDeletedPage = lazy(() => import('./pages/public/AccountDeletedPage'))

// Admin
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/UsersPage'))
const AdminSuppliersPage = lazy(() => import('./pages/admin/SuppliersPage'))
const AdminCertificatesPage = lazy(() => import('./pages/admin/CertificatesPage'))
const AdminProductsPage = lazy(() => import('./pages/admin/ProductsPage'))
const AdminOrdersPage = lazy(() => import('./pages/admin/OrdersPage'))
const AdminReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const AdminChatPage = lazy(() => import('./pages/admin/AdminChatPage'))
const AdminDeliveryFeesPage = lazy(() => import('./pages/admin/DeliveryFeesPage'))

// Owner
const OwnerStorePage = lazy(() => import('./pages/owner/StorePage'))
const AllProductsPage = lazy(() => import('./pages/owner/AllProductsPage'))
const OwnerCartPage = lazy(() => import('./pages/owner/CartPage'))
const OwnerOrdersPage = lazy(() => import('./pages/owner/OrdersPage'))
const OwnerAnalyticsPage = lazy(() => import('./pages/owner/AnalyticsPage'))
const OwnerProfilePage = lazy(() => import('./pages/owner/ProfilePage'))

// Supplier
const SupplierDashboardPage = lazy(() => import('./pages/supplier/DashboardPage'))
const SupplierProductsPage = lazy(() => import('./pages/supplier/ProductsPage'))
const SupplierOrdersPage = lazy(() => import('./pages/supplier/OrdersPage'))
const SupplierAnalyticsPage = lazy(() => import('./pages/supplier/AnalyticsPage'))
const SupplierBankDetailsPage = lazy(() => import('./pages/supplier/BankDetailsPage'))
const SupplierAccountPage = lazy(() => import('./pages/supplier/ProfilePage'))

// Shared
const ChatPage = lazy(() => import('./pages/shared/ChatPage'))

function AuthenticatedChatbotFAB() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const isChatPage = pathname.includes('/chat')
  const isOnboarding = pathname === '/select-role'
  if (!user || isChatPage || isOnboarding) return null
  return <ChatbotFAB />
}

// Catches lazy-import chunk errors after a new deploy (stale cached hashes)
// and reloads the page so the new service worker activates.
class ChunkErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { errored: false } }
  static getDerivedStateFromError() { return { errored: true } }
  componentDidCatch(err) {
    if (err?.message?.includes('dynamically imported module') || err?.name === 'ChunkLoadError') {
      window.location.reload()
    }
  }
  render() { return this.state.errored ? null : this.props.children }
}

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-herb" />
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <CartProvider>
        <AddressProvider>
          <Toaster
            position="top-center"
            containerStyle={{ top: 'calc(4.5rem + var(--sat))' }}
            toastOptions={{
              duration: 4000,
              success: {
                style: { background: '#083A4F', color: '#fff' },
                iconTheme: { primary: '#A58D66', secondary: '#fff' },
              },
              error: {
                style: { background: '#991B1B', color: '#fff' },
              },
            }}
          />
          <CookieConsent />
          <PWAInstallPrompt />
          <ChunkErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterOwnerPage /></PublicOnlyRoute>} />
            <Route path="/register/supplier" element={<PublicOnlyRoute><RegisterSupplierPage /></PublicOnlyRoute>} />
            <Route path="/select-role" element={<SelectRolePage />} />
            <Route path="/suppliers" element={<SupplierListPage />} />
            <Route path="/supplier/:id" element={<PublicSupplierProfilePage />} />
            <Route path="/products" element={<ProductsListPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/press" element={<PressPage />} />
            <Route path="/account-deleted" element={<AccountDeletedPage />} />

            {/* Admin (separate, not linked from public login) */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="suppliers" element={<AdminSuppliersPage />} />
              <Route path="certificates" element={<AdminCertificatesPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="chat" element={<AdminChatPage />} />
              <Route path="delivery-fees" element={<AdminDeliveryFeesPage />} />
            </Route>

            {/* Restaurant Owner */}
            <Route path="/owner" element={<ProtectedRoute allowedRoles={['restaurant_owner']}><OwnerLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/owner/store" replace />} />
              <Route path="store" element={<OwnerStorePage />} />
              <Route path="products" element={<AllProductsPage />} />
              <Route path="cart" element={<OwnerCartPage />} />
              <Route path="orders" element={<OwnerOrdersPage />} />
              <Route path="analytics" element={<OwnerAnalyticsPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="profile" element={<OwnerProfilePage />} />
            </Route>

            {/* Supplier */}
            <Route path="/supplier" element={<ProtectedRoute allowedRoles={['supplier']}><SupplierLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/supplier/dashboard" replace />} />
              <Route path="dashboard" element={<SupplierDashboardPage />} />
              <Route path="products" element={<SupplierProductsPage />} />
              <Route path="orders" element={<SupplierOrdersPage />} />
              <Route path="analytics" element={<SupplierAnalyticsPage />} />
              <Route path="bank-details" element={<SupplierBankDetailsPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="profile" element={<SupplierAccountPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </ChunkErrorBoundary>
          <AuthenticatedChatbotFAB />
        </AddressProvider>
      </CartProvider>
    </AuthProvider>
    </LanguageProvider>
  )
}
