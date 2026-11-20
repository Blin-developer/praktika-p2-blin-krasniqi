import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Faqet kryesore
import Home from './pages/Home';
import Restorantet from './pages/Restaurants';
import DetajetRestorantit from './pages/RestaurantDetail';
import Kyqja from './pages/Login';
import Regjistrimi from './pages/Register';
import SistemiKuzhinesKDS from './pages/KdsView';
import PaneliAdministrimit from './pages/AdminDashboard';
import RestaurantOperations from './pages/RestaurantOperations';
import NdjekjaPorosive from './pages/OrderTracking';
import Paautorizuar from './pages/Unauthorized';

// Faqet e reja: Partnerët, Karriera (Punë), Cilësimet
import PartnerRestaurant from './pages/PartnerRestaurant';
import PartnerCourier from './pages/PartnerCourier';
import PartnerBusiness from './pages/PartnerBusiness';
import Careers from './pages/Careers';
import AccountSettings from './pages/AccountSettings';

// Faza 1 — Cart Drawer & Checkout System
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import OrderVerification from './pages/OrderVerification';

// Komponentët
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppLayout />
      </CartProvider>
    </AuthProvider>
  );
}

function AppLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Faqet me dizajn të veçantë (partner, karrierë, autentifikim dark, checkout, dashboard) që mbushin ekranin
  const isFullPageRoute = [
    '/partner-restoranti',
    '/behu-korrier',
    '/tastio-per-biznese',
    '/pune',
    '/karriera',
    '/kyqja',
    '/regjistrim',
    '/login',
    '/register',
    '/cilesimet',
    '/profili',
    '/porosite',
    '/orders',
    '/kds',
    '/admin',
    '/admin/operacionet',
    '/operacionet',
    '/checkout',
    '/partneret/restorant',
    '/partneret/korrier',
    '/partneret/biznese',
  ].includes(location.pathname) ||
    location.pathname.startsWith('/porosia-sukses/');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Shiriti Kryesor i Navigimit Tastio */}
      <Navbar />

      {/* Cart Drawer — anësor dhe global (fixed position, jashtë flow) */}
      <CartDrawer />

      {/* Përmbajtja Kryesore */}
      <main style={{ flex: 1, padding: (isHomePage || isFullPageRoute) ? 0 : '36px 0' }}>
        <Routes>
          {/* Faqja Kryesore */}
          <Route path="/" element={<Home />} />

          {/* Restorantet */}
          <Route path="/restorante" element={<Restorantet />} />
          <Route path="/restorante/:slug" element={<div className="container"><DetajetRestorantit /></div>} />

          {/* Autentifikimi (Dizajn Wolt Dark) */}
          <Route path="/kyqja" element={<Kyqja />} />
          <Route path="/regjistrim" element={<Regjistrimi />} />
          <Route path="/unauthorized" element={<div className="container"><Paautorizuar /></div>} />

          {/* Faqet e Partneritetit */}
          <Route path="/partner-restoranti" element={<PartnerRestaurant />} />
          <Route path="/behu-korrier" element={<PartnerCourier />} />
          <Route path="/tastio-per-biznese" element={<PartnerBusiness />} />

          {/* Karriera / Punë */}
          <Route path="/pune" element={<Careers />} />
          <Route path="/karriera" element={<Careers />} />

          {/* Faza 1: Checkout dhe Konfirmimi i Porosisë */}
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/porosia-sukses/:orderNumber" element={<OrderSuccess />} />
          <Route path="/orders/:orderIdentifier/verify" element={<OrderVerification />} />
          <Route path="/orders/:orderIdentifier/verifiko" element={<OrderVerification />} />
          <Route path="/porosite/:orderIdentifier/verify" element={<OrderVerification />} />
          <Route path="/porosite/:orderIdentifier/verifiko" element={<OrderVerification />} />

          {/* Rrugë të Mbrojtura me Autentifikim */}
          <Route element={<ProtectedRoute />}>
            <Route path="/porosite" element={<NdjekjaPorosive />} />
            <Route path="/cilesimet" element={<AccountSettings />} />
            <Route path="/profili" element={<AccountSettings />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['kitchen_staff', 'branch_manager', 'super_admin', 'admin']} />}>
            <Route path="/kds" element={<SistemiKuzhinesKDS />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['owner', 'branch_manager', 'super_admin', 'admin']} />}>
            <Route path="/admin" element={<PaneliAdministrimit />} />
            <Route path="/admin/operacionet" element={<RestaurantOperations />} />
            <Route path="/operacionet" element={<RestaurantOperations />} />
          </Route>

          {/* Përputhshmëri me shtigje alternative (alias-et) */}
          <Route path="/restaurants" element={<Restorantet />} />
          <Route path="/restaurants/:slug" element={<div className="container"><DetajetRestorantit /></div>} />
          <Route path="/login" element={<Kyqja />} />
          <Route path="/register" element={<Regjistrimi />} />
          <Route path="/orders" element={<NdjekjaPorosive />} />

          {/* Aliase për faqet e Partneritetit */}
          <Route path="/partneret/restorant" element={<PartnerRestaurant />} />
          <Route path="/partneret/korrier" element={<PartnerCourier />} />
          <Route path="/partneret/biznese" element={<PartnerBusiness />} />

          {/* Wildcard - kthehu te Home */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {/* Fundfaqja Profesionale Tastio */}
      <Footer />
    </div>
  );
}
