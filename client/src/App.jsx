import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AddressProvider } from './context/AddressContext'

// Public pages
import LandingPage from './pages/public/LandingPage'
import LoginPage from './pages/public/LoginPage'
import RegisterOwnerPage from './pages/public/RegisterOwnerPage'
import RegisterSupplierPage from './pages/public/RegisterSupplierPage'
import SelectRolePage from './pages/public/SelectRolePage'
import PublicSupplierProfilePage from './pages/public/SupplierProfilePage'
import SupplierListPage from './pages/public/SupplierListPage'
import ProductsListPage from './pages/public/ProductsListPage'

// Admin pages
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminUsersPage from './pages/admin/UsersPage'
import AdminSuppliersPage from './pages/admin/SuppliersPage'
import AdminCertificatesPage from './pages/admin/CertificatesPage'
import AdminProductsPage from './pages/admin/ProductsPage'
import AdminOrdersPage from './pages/admin/OrdersPage'
import AdminReportsPage from './pages/admin/ReportsPage'

// Owner pages
import OwnerLayout from './components/layout/OwnerLayout'
import OwnerStorePage from './pages/owner/StorePage'
import AllProductsPage from './pages/owner/AllProductsPage'
import OwnerCartPage from './pages/owner/CartPage'
import OwnerOrdersPage from './pages/owner/OrdersPage'
import OwnerAnalyticsPage from './pages/owner/AnalyticsPage'
import OwnerProfilePage from './pages/owner/ProfilePage'

// Supplier pages
import SupplierLayout from './components/layout/SupplierLayout'
import SupplierDashboardPage from './pages/supplier/DashboardPage'
import SupplierProductsPage from './pages/supplier/ProductsPage'
import SupplierOrdersPage from './pages/supplier/OrdersPage'
import SupplierAnalyticsPage from './pages/supplier/AnalyticsPage'
import SupplierCertificatesPage from './pages/supplier/CertificatesPage'
import SupplierBankDetailsPage from './pages/supplier/BankDetailsPage'
import SupplierProfilePage from './pages/supplier/ProfilePage'

// Routing
import ProtectedRoute from './components/routing/ProtectedRoute'
import PublicOnlyRoute from './components/routing/PublicOnlyRoute'
import AdminLayout from './components/layout/AdminLayout'
import ChatbotFAB from './components/ai/ChatbotFAB'

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AddressProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              success: {
                style: { background: '#1B4332', color: '#fff' },
                iconTheme: { primary: '#D4A017', secondary: '#fff' },
              },
              error: {
                style: { background: '#991B1B', color: '#fff' },
              },
            }}
          />
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
            </Route>

            {/* Restaurant Owner */}
            <Route path="/owner" element={<ProtectedRoute allowedRoles={['restaurant_owner']}><OwnerLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/owner/store" replace />} />
              <Route path="store" element={<OwnerStorePage />} />
              <Route path="products" element={<AllProductsPage />} />
              <Route path="cart" element={<OwnerCartPage />} />
              <Route path="orders" element={<OwnerOrdersPage />} />
              <Route path="analytics" element={<OwnerAnalyticsPage />} />
              <Route path="profile" element={<OwnerProfilePage />} />
            </Route>

            {/* Supplier */}
            <Route path="/supplier" element={<ProtectedRoute allowedRoles={['supplier']}><SupplierLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/supplier/dashboard" replace />} />
              <Route path="dashboard" element={<SupplierDashboardPage />} />
              <Route path="products" element={<SupplierProductsPage />} />
              <Route path="orders" element={<SupplierOrdersPage />} />
              <Route path="analytics" element={<SupplierAnalyticsPage />} />
              <Route path="certificates" element={<SupplierCertificatesPage />} />
              <Route path="bank-details" element={<SupplierBankDetailsPage />} />
              <Route path="profile" element={<SupplierProfilePage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ChatbotFAB />
        </AddressProvider>
      </CartProvider>
    </AuthProvider>
  )
}
