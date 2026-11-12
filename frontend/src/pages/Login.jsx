import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Kyqja() {
  const [email, setEmail] = useState('');
  const [fjalekalimi, setFjalekalimi] = useState('');
  const [gabim, setGabim] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Modal / Gjendje për "Ke harruar fjalëkalimin?"
  const [harruarModal, setHarruarModal] = useState(false);
  const [harruarEmail, setHarruarEmail] = useState('');
  const [harruarSukses, setHarruarSukses] = useState(false);
  const [harruarDukeNgarkuar, setHarruarDukeNgarkuar] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGabim(null);
    setDukeNgarkuar(true);

    try {
      const res = await api.post('/auth/login', { email, password: fjalekalimi });
      login(res.data.user, res.data.token);

      // Ridrejtim sipas rolit
      const roli = res.data.user.role;
      if (roli === 'super_admin') navigate('/admin');
      else if (roli === 'kitchen_staff') navigate('/kds');
      else if (roli === 'branch_manager' || roli === 'owner') navigate('/admin');
      else navigate('/restorante');
    } catch (err) {
      setGabim(err.response?.data?.errors?.email?.[0] || err.response?.data?.mesazh || 'Kyçja dështoi. Kontrolloni kredencialet tuaja.');
    } finally {
      setDukeNgarkuar(false);
    }
  };

  const handleHarruarSubmit = (e) => {
    e.preventDefault();
    setHarruarDukeNgarkuar(true);
    setTimeout(() => {
      setHarruarDukeNgarkuar(false);
      setHarruarSukses(true);
    }, 700);
  };

  const handleKyqjaRapide = (demoEmail) => {
    setEmail(demoEmail);
    setFjalekalimi('password123');
  };

  return (
    <div style={{ maxWidth: '440px', margin: '30px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: '36px 32px', borderRadius: '18px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: "'Nunito', 'Fredoka', sans-serif",
              fontStyle: 'italic',
              fontSize: '38px',
              fontWeight: 900,
              color: '#0865F5',
              letterSpacing: '-1.5px',
              display: 'inline-block'
            }}>
              Tastio
            </span>
          </Link>
        </div>

        {harruarModal ? (
          <div>
            <button
              type="button"
              onClick={() => {
                setHarruarModal(false);
                setHarruarSukses(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '16px',
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> Kthehu te kyçja
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>
              Rikuperimi i Fjalëkalimit
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', lineHeight: 1.5 }}>
              Vendosni adresën e emailit me të cilën jeni regjistruar dhe do t'ju dërgojmë lidhjen e sigurt për rivendosjen e fjalëkalimit.
            </p>

            {harruarSukses ? (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '18px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#166534', fontSize: '15px', fontWeight: 700 }}>
                  Email-i u dërgua me sukses
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#15803d', lineHeight: 1.5 }}>
                  Nëse llogaria me email <strong>{harruarEmail}</strong> ekziston, keni pranuar udhëzimet për rivendosje. Kontrolloni edhe dosjen Spam.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHarruarModal(false);
                    setHarruarSukses(false);
                  }}
                  className="btn btn-primary"
                  style={{ marginTop: '16px', width: '100%', padding: '10px' }}
                >
                  Kthehu te formulari i kyçjes
                </button>
              </div>
            ) : (
              <form onSubmit={handleHarruarSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="recoveryEmail" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                    Email Adresa e Llogarisë
                  </label>
                  <input
                    id="recoveryEmail"
                    type="email"
                    value={harruarEmail}
                    onChange={(e) => setHarruarEmail(e.target.value)}
                    required
                    placeholder="shembull@email.com"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={harruarDukeNgarkuar}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 700 }}
                >
                  {harruarDukeNgarkuar ? 'Duke dërguar udhëzimet...' : 'Dërgo Lidhjen e Rivendosjes'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px', textAlign: 'center', color: '#0f172a' }}>
              Mirë se vini përsëri
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
              Futni të dhënat e llogarisë suaj për të vazhduar.
            </p>

            {gabim && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#991b1b',
                fontSize: '14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{gabim}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="loginEmail" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Adresa e Emailit
                </label>
                <input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="klienti@tastio.com"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="loginPassword" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Fjalëkalimi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setHarruarModal(true);
                      setHarruarEmail(email);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0865F5',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Ke harruar fjalëkalimin?
                  </button>
                </div>
                <input
                  id="loginPassword"
                  type="password"
                  value={fjalekalimi}
                  onChange={(e) => setFjalekalimi(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={duke_ngarkuar}
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: 800, borderRadius: '9999px' }}
              >
                {duke_ngarkuar ? 'Duke u kyçur...' : 'Kyçu'}
              </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
              Nuk keni llogari?{' '}
              <Link to="/regjistrim" style={{ color: '#0865F5', fontWeight: 700, textDecoration: 'none' }}>
                Krijoni llogari
              </Link>
            </div>

            {/* Zgjedhësi i Roleve Demonstruese me stil profesional pa emoji */}
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.6px' }}>
                Kyçje e Shpejtë – Llogari Demonstruese
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleKyqjaRapide('customer.blin@tastio.com')}
                  className="btn btn-outline"
                  style={{ fontSize: '12.5px', padding: '8px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <span>Klient: <strong>Blin Krasniqi</strong></span>
                  <span style={{ color: '#0865F5', fontWeight: 600 }}>customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleKyqjaRapide('kitchen.grill@tastio.com')}
                  className="btn btn-outline"
                  style={{ fontSize: '12.5px', padding: '8px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <span>Staf Kuzhine: <strong>Lirim Hoxha (Grill)</strong></span>
                  <span style={{ color: '#0865F5', fontWeight: 600 }}>kitchen_staff</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleKyqjaRapide('manager.center@tastio.com')}
                  className="btn btn-outline"
                  style={{ fontSize: '12.5px', padding: '8px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <span>Menaxher Dege: <strong>Vesa Gashi (Tartine)</strong></span>
                  <span style={{ color: '#0865F5', fontWeight: 600 }}>branch_manager</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleKyqjaRapide('owner.tartine@tastio.com')}
                  className="btn btn-outline"
                  style={{ fontSize: '12.5px', padding: '8px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <span>Pronar Restoranti: <strong>Tartine Deli & Bakery</strong></span>
                  <span style={{ color: '#0865F5', fontWeight: 600 }}>owner</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleKyqjaRapide('admin@tastio.com')}
                  className="btn btn-outline"
                  style={{ fontSize: '12.5px', padding: '8px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <span>Super Administrator: <strong>Paneli i Platformës</strong></span>
                  <span style={{ color: '#0865F5', fontWeight: 600 }}>super_admin</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
