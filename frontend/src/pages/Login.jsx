import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Kyqja() {
  const [email, setEmail] = useState('');
  const [fjalekalimi, setFjalekalimi] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gabim, setGabim] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Rikuperimi i fjalëkalimit
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

      const roli = res.data.user.role;
      if (roli === 'super_admin') navigate('/admin');
      else if (roli === 'kitchen_staff') navigate('/kds');
      else if (roli === 'branch_manager' || roli === 'owner') navigate('/admin');
      else navigate('/restorante');
    } catch (err) {
      setGabim(
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.mesazh ||
        'Kyçja dështoi. Kontrolloni email-in dhe fjalëkalimin.'
      );
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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <Link to="/" style={styles.logoLink}>Tastio</Link>
        </div>

        {harruarModal ? (
          /* ===== RECOVERY SECTION ===== */
          <div>
            <button
              type="button"
              onClick={() => { setHarruarModal(false); setHarruarSukses(false); }}
              style={styles.backBtn}
            >
              <ArrowLeft size={15} /> Kthehu te kyçja
            </button>

            <h2 style={styles.title}>Rikuperimi i Fjalëkalimit</h2>
            <p style={styles.subtitle}>
              Vendosni email-in e llogarisë dhe do t'ju dërgojmë lidhjen e rivendosjes.
            </p>

            {harruarSukses ? (
              <div style={styles.successBox}>
                <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 12px', display: 'block' }} />
                <h4 style={{ margin: '0 0 8px', color: '#166534', fontSize: '16px', fontWeight: 700 }}>
                  Udhëzimet u dërguan
                </h4>
                <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#15803d', lineHeight: 1.5 }}>
                  Nëse llogaria me email <strong>{harruarEmail}</strong> ekziston, keni pranuar udhëzimet. Kontrolloni edhe dosjen Spam.
                </p>
                <button
                  type="button"
                  onClick={() => { setHarruarModal(false); setHarruarSukses(false); }}
                  style={styles.submitBtn}
                >
                  Kthehu te formulari i kyçjes
                </button>
              </div>
            ) : (
              <form onSubmit={handleHarruarSubmit}>
                <div style={styles.fieldGroup}>
                  <label htmlFor="recoveryEmail" style={styles.label}>Email Adresa e Llogarisë</label>
                  <input
                    id="recoveryEmail"
                    type="email"
                    value={harruarEmail}
                    onChange={(e) => setHarruarEmail(e.target.value)}
                    required
                    placeholder="shembull@email.com"
                    style={styles.input}
                  />
                </div>
                <button
                  type="submit"
                  disabled={harruarDukeNgarkuar}
                  style={styles.submitBtn}
                >
                  {harruarDukeNgarkuar ? 'Duke dërguar...' : 'Dërgo Lidhjen e Rivendosjes'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ===== LOGIN SECTION ===== */
          <>
            <h2 style={styles.title}>Mirë se vini përsëri</h2>
            <p style={styles.subtitle}>Kyçuni në llogarinë tuaj Tastio për të vazhduar.</p>

            {gabim && (
              <div style={styles.errorBox}>
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <span>{gabim}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={styles.fieldGroup}>
                <label htmlFor="loginEmail" style={styles.label}>Adresa e Emailit</label>
                <input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="klienti@tastio.com"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label htmlFor="loginPassword" style={{ ...styles.label, marginBottom: 0 }}>Fjalëkalimi</label>
                  <button
                    type="button"
                    onClick={() => { setHarruarModal(true); setHarruarEmail(email); }}
                    style={styles.forgotBtn}
                  >
                    Ke harruar fjalëkalimin?
                  </button>
                </div>
                <div style={styles.inputWrap}>
                  <input
                    id="loginPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={fjalekalimi}
                    onChange={(e) => setFjalekalimi(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ ...styles.input, paddingRight: '46px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    tabIndex={-1}
                    aria-label="Trego / fshih fjalëkalimin"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={duke_ngarkuar}
                style={{ ...styles.submitBtn, opacity: duke_ngarkuar ? 0.75 : 1 }}
              >
                {duke_ngarkuar ? 'Duke u kyçur...' : 'Kyçu'}
              </button>
            </form>

            <p style={styles.switchText}>
              Nuk keni llogari?{' '}
              <Link to="/regjistrim" style={styles.switchLink}>Krijoni llogari</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: 'calc(100vh - 72px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    background: '#F5F7FA',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    background: '#ffffff',
    borderRadius: '20px',
    padding: '44px 40px',
    boxShadow: '0 12px 40px rgba(15, 23, 42, 0.09)',
    border: '1px solid #e2e8f0',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoLink: {
    fontFamily: "'Nunito', 'Fredoka', sans-serif",
    fontStyle: 'italic',
    fontSize: '40px',
    fontWeight: 900,
    color: '#0865F5',
    letterSpacing: '-1.5px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 8px',
    letterSpacing: '-0.4px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  subtitle: {
    fontSize: '14.5px',
    color: '#64748b',
    textAlign: 'center',
    margin: '0 0 28px',
    lineHeight: 1.5,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    color: '#991b1b',
    fontSize: '14px',
    marginBottom: '20px',
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '14px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '10px',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13.5px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '7px',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14.5px',
    color: '#0f172a',
    background: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#0865F5',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: '#0865F5',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 800,
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(8, 101, 245, 0.35)',
    transition: 'background 0.2s, box-shadow 0.2s',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: 'block',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    marginBottom: '20px',
  },
  switchText: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
    color: '#64748b',
  },
  switchLink: {
    color: '#0865F5',
    fontWeight: 700,
    textDecoration: 'none',
  },
};
