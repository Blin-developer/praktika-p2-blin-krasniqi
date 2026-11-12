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
import NdjekjaPorosive from './pages/OrderTracking';
import Paautorizuar from './pages/Unauthorized';

// Faqet e reja: Partnerët, Karriera (Punë)
import PartnerRestaurant from './pages/PartnerRestaurant';
import PartnerCourier from './pages/PartnerCourier';
import PartnerBusiness from './pages/PartnerBusiness';
import Careers from './pages/Careers';

// Komponentët
import Navbar from './components/Navbar';
import Footer from './components/Footer';

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

  // Faqet me partner dhe karrierë kanë padding-in e vet (hero section me padding)
  const isFullPageRoute = [
    '/partner-restoranti',
    '/behu-korrier',
    '/tastio-per-biznese',
    '/pune',
    '/karriera',
  ].includes(location.pathname);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Shiriti Kryesor i Navigimit Tastio */}
      <Navbar />

      {/* Përmbajtja Kryesore */}
      <main style={{ flex: 1, padding: (isHomePage || isFullPageRoute) ? 0 : '36px 0' }}>
        <Routes>
          {/* Faqja Kryesore */}
          <Route path="/" element={<Home />} />

          {/* Restorantet */}
          <Route path="/restorante" element={<Restorantet />} />
          <Route path="/restorante/:slug" element={<div className="container"><DetajetRestorantit /></div>} />

          {/* Autentifikimi */}
          <Route path="/kyqja" element={<div className="container"><Kyqja /></div>} />
          <Route path="/regjistrim" element={<div className="container"><Regjistrimi /></div>} />
          <Route path="/unauthorized" element={<div className="container"><Paautorizuar /></div>} />

          {/* Faqet e Partneritetit */}
          <Route path="/partner-restoranti" element={<PartnerRestaurant />} />
          <Route path="/behu-korrier" element={<PartnerCourier />} />
          <Route path="/tastio-per-biznese" element={<PartnerBusiness />} />

          {/* Karriera / Punë */}
          <Route path="/pune" element={<Careers />} />
          <Route path="/karriera" element={<Careers />} />

          {/* Rrugë të Mbrojtura me Autentifikim */}
          <Route element={<ProtectedRoute />}>
            <Route path="/porosite" element={<div className="container"><NdjekjaPorosive /></div>} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['kitchen_staff', 'branch_manager', 'super_admin']} />}>
            <Route path="/kds" element={<div className="container"><SistemiKuzhinesKDS /></div>} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['owner', 'branch_manager', 'super_admin']} />}>
            <Route path="/admin" element={<div className="container"><PaneliAdministrimit /></div>} />
          </Route>

          {/* Përputhshmëri me shtigje alternative (alias-et) */}
          <Route path="/restaurants" element={<Restorantet />} />
          <Route path="/restaurants/:slug" element={<div className="container"><DetajetRestorantit /></div>} />
          <Route path="/login" element={<div className="container"><Kyqja /></div>} />
          <Route path="/register" element={<div className="container"><Regjistrimi /></div>} />
          <Route path="/orders" element={<div className="container"><NdjekjaPorosive /></div>} />

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
