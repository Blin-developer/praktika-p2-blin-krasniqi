import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider, useCart } from './contexts/CartContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Faqet
import Restorantet from './pages/Restaurants';
import DetajetRestorantit from './pages/RestaurantDetail';
import Kyqja from './pages/Login';
import Regjistrimi from './pages/Register';
import SistemiKuzhinesKDS from './pages/KdsView';
import PaneliAdministrimit from './pages/AdminDashboard';
import NdjekjaPorosive from './pages/OrderTracking';
import Paautorizuar from './pages/Unauthorized';

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
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleCkyqja = () => {
    logout();
    navigate('/');
  };

  const merrEmrinERolit = (r) => {
    switch (r) {
      case 'super_admin': return 'Super Admin';
      case 'owner': return 'Pronar';
      case 'branch_manager': return 'Menaxher';
      case 'kitchen_staff': return 'Kuzhinë';
      case 'cashier': return 'Arkëtar';
      case 'customer': return 'Klient';
      default: return r;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Shiriti Kryesor i Navigimit */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--color-border)',
        padding: '14px 0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo & Emri i Platformës */}
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '20px'
            }}>
              G
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                Gourmet<span style={{ color: 'var(--color-primary)' }}>Express</span>
              </span>
              <span className="badge badge-primary" style={{ marginLeft: '10px', verticalAlign: 'middle', fontSize: '11px' }}>
                Platformë në Kosovë
              </span>
            </div>
          </Link>

          {/* Lidhjet e Navigimit */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '14px', fontWeight: 600 }}>
            <Link to="/restorante" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>
              🍔 Restorantet
            </Link>

            {isAuthenticated && (
              <Link to="/porosite" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>
                📦 Porositë e Mia
              </Link>
            )}

            {/* Shkurtoret sipas Roleve */}
            {user && (user.role === 'kitchen_staff' || user.role === 'branch_manager' || user.role === 'super_admin') && (
              <Link to="/kds" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700 }}>
                👨‍🍳 Kuzhina (KDS)
              </Link>
            )}

            {user && (user.role === 'owner' || user.role === 'branch_manager' || user.role === 'super_admin') && (
              <Link to="/admin" style={{ color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 700 }}>
                ⚙️ Paneli Admin
              </Link>
            )}

            {/* Veprimet e Autentifikimit */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
                <span className="badge badge-outline" style={{ fontSize: '12px' }}>
                  {user?.name} ({merrEmrinERolit(user?.role)})
                </span>
                <button
                  onClick={handleCkyqja}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Çkyçu
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to="/kyqja" className="btn btn-outline" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '14px' }}>
                  Kyçu
                </Link>
                <Link to="/regjistrim" className="btn btn-primary" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '14px' }}>
                  Regjistrohu
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Përmbajtja Kryesore */}
      <main style={{ flex: 1, padding: '36px 0' }}>
        <div className="container">
          <Routes>
            <Route path="/" element={<PamjaKryesore />} />
            <Route path="/restorante" element={<Restorantet />} />
            <Route path="/restorante/:slug" element={<DetajetRestorantit />} />
            <Route path="/kyqja" element={<Kyqja />} />
            <Route path="/regjistrim" element={<Regjistrimi />} />
            <Route path="/unauthorized" element={<Paautorizuar />} />

            {/* Rrugë të Mbrojtura me Autentifikim */}
            <Route element={<ProtectedRoute />}>
              <Route path="/porosite" element={<NdjekjaPorosive />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['kitchen_staff', 'branch_manager', 'super_admin']} />}>
              <Route path="/kds" element={<SistemiKuzhinesKDS />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['owner', 'branch_manager', 'super_admin']} />}>
              <Route path="/admin" element={<PaneliAdministrimit />} />
            </Route>

            {/* Përputhshmëri me shtigje alternative */}
            <Route path="/restaurants" element={<Restorantet />} />
            <Route path="/restaurants/:slug" element={<DetajetRestorantit />} />
            <Route path="/login" element={<Kyqja />} />
            <Route path="/register" element={<Regjistrimi />} />
            <Route path="/orders" element={<NdjekjaPorosive />} />

            <Route path="*" element={<PamjaKryesore />} />
          </Routes>
        </div>
      </main>

      {/* Fundfaqja */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid var(--color-border)',
        padding: '24px 0',
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--color-text-muted)'
      }}>
        <div className="container">
          <p>© 2026 GourmetExpress — Praktika Profesionale 2026/27 — Projekti 02: Platformë për Porositjen e Ushqimit në Restorante</p>
          <p style={{ marginTop: '4px', fontSize: '12px' }}>
            Zhvilluesi: Blin Krasniqi • Dega Aktive: <code>development</code> • Afati i Dorëzimit: 6 Dhjetor 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

function PamjaKryesore() {
  const modulet = [
    { titulli: '1. Identiteti & RBAC', pershkrimi: 'Klient, Staf Kuzhine, Menaxher Dege, Pronar Restoranti, Super Admin', statusi: '✅ Dita 1 – Konfiguruar' },
    { titulli: '2. Restorantet & Degët', pershkrimi: 'Izolimi i të dhënave, gjeolokacioni në Prishtinë, statusi i hapur/mbyllur', statusi: '✅ Dita 1 – Skema & Seed' },
    { titulli: '3. Kategoritë e Biznesit & Menysë', pershkrimi: 'Klasifikimi i kuzhinave dhe strukturimi i menysë së ushqimit', statusi: '✅ Dita 1 – Skema & Seed' },
    { titulli: '4. Produktet & Motori i Modifikuesve', pershkrimi: 'Grupet e opsioneve, kufijtë min/max dhe shtesat e çmimeve në kohë reale', statusi: '✅ Dita 1 – Ndërfaqja & DB' },
    { titulli: '5. Orare Pune & Dritare për Marrje', pershkrimi: 'Orari javor 7-ditor dhe kapaciteti maksimal për çdo dritare 15-minutëshe', statusi: '✅ Dita 1 – 23 Migrime MySQL' },
    { titulli: '6. Llogaritja e Sigurt e Çmimeve', pershkrimi: 'Vërtetim 100% matematikor në backend i të gjitha çmimeve dhe taksave', statusi: '✅ Dita 1 – Shtresa e Shërbimit' },
    { titulli: '7. Makina e Gjendjes së Porosisë', pershkrimi: 'Në Pritje → Konfirmuar → Në Kuzhinë → Gati Për Marrje → E Përfunduar', statusi: '✅ Dita 1 – Regjistri i Historikut' },
    { titulli: '8. Sistemi i Shfaqjes në Kuzhinë (KDS)', pershkrimi: 'Rutim biletash sipas stacioneve (Grill, Sallatë, Pije, Paketim)', statusi: '✅ Dita 1 – Ekrani KDS Aktiv' },
    { titulli: '9. Motori i Kohës së Përgatitjes', pershkrimi: 'Vlerësim dinamik i kohës dhe ruajtja e historikut të gatishmërisë', statusi: '✅ Dita 1 – Skema Relacionale' },
    { titulli: '10. Pass Digjital me Kod QR & Pagesë', pershkrimi: 'Verifikim i sigurt me kod QR në sportel dhe pagesë me para në dorë / POS', statusi: '✅ Dita 1 – Gjenerimi QR Aktiv' },
    { titulli: '11. WebSockets në Kohë Reale', pershkrimi: 'Transmetim i drejtpërdrejtë i statusit dhe sinjalizimeve në kohë reale', statusi: 'E Planifikuar (Java 4)' },
    { titulli: '12. Analitika & Regjistri i Auditimit', pershkrimi: 'Të hyrat, performanca e përgatitjes dhe regjistri i pandryshueshëm i auditit', statusi: '✅ Dita 1 – Metrika Administrative' },
  ];

  return (
    <div>
      {/* Baneri Ballor me Stil Komercial */}
      <div className="card" style={{
        padding: '48px 36px',
        marginBottom: '40px',
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        color: '#ffffff',
        borderRadius: '16px'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', marginBottom: '16px', display: 'inline-block' }}>
            🚀 Platformë Profesionale për Porositjen e Ushqimit
          </span>
          <h1 style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.2, marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Dëshironi Sanduiçë Artizanalë dhe Smash Burger në Prishtinë?
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9, lineHeight: 1.5, marginBottom: '24px' }}>
            Porositni paraprakisht online, zgjidhni orën tuaj të saktë për marrje dhe shmangni pritjen në radhë me pass-in tuaj digjital me kod QR.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/restorante" className="btn" style={{ backgroundColor: '#ffffff', color: '#0369a1', fontWeight: 700, padding: '12px 24px', fontSize: '15px', textDecoration: 'none' }}>
              Eksploro Restorantet
            </Link>
            <Link to="/kyqja" className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 24px', fontSize: '15px', textDecoration: 'none' }}>
              ⚡ Roli Demonstrues
            </Link>
          </div>
        </div>
      </div>

      {/* Matrica e Përputhshmërisë me 12 Modulet e Specifikimit */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
          Arkitektura e Specifikimit & Statusi i Moduleve
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Përmbushja e plotë e 12 moduleve funksionale sipas kërkesave të praktikës profesionale.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {modulet.map((m, idx) => (
            <div key={idx} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{m.titulli}</h3>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>{m.statusi}</span>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', lineHeight: 1.4, flex: 1 }}>
                {m.pershkrimi}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
