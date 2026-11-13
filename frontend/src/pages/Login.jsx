import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function Kyqja() {
  const [email, setEmail] = useState('');
  const [fjalekalimi, setFjalekalimi] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gabim, setGabim] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Rikuperimi i fjalëkalimit ("Ke harruar fjalëkalimin?")
  const [harruarModal, setHarruarModal] = useState(false);
  const [harruarEmail, setHarruarEmail] = useState('');
  const [harruarSukses, setHarruarSukses] = useState(false);
  const [harruarDukeNgarkuar, setHarruarDukeNgarkuar] = useState(false);

  // Nëse përdoruesi është i kyçur tashmë, ridrejtoje
  useEffect(() => {
    if (isAuthenticated && user) {
      if (['super_admin', 'admin', 'owner', 'branch_manager'].includes(user.role)) {
        navigate('/admin', { replace: true });
      } else if (user.role === 'kitchen_staff') {
        navigate('/kds', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGabim(null);
    setDukeNgarkuar(true);

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password: fjalekalimi,
      });

      const perdoruesi = res.data.user || res.data.perdoruesi;
      const token = res.data.token;

      login(perdoruesi, token);

      // Ridrejtim i sigurt sipas rolit
      const roli = perdoruesi?.role || perdoruesi?.roli;
      if (['super_admin', 'admin', 'owner', 'branch_manager'].includes(roli)) {
        navigate('/admin');
      } else if (roli === 'kitchen_staff') {
        navigate('/kds');
      } else {
        navigate('/');
      }
    } catch (err) {
      const mesazhiGabimit =
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.mesazh ||
        err.response?.data?.message ||
        'Kredencialet e dhëna nuk janë të sakta. Kontrolloni email-in dhe fjalëkalimin.';
      setGabim(mesazhiGabimit);
    } finally {
      setDukeNgarkuar(false);
    }
  };

  const handleHarruarSubmit = async (e) => {
    e.preventDefault();
    setHarruarDukeNgarkuar(true);

    try {
      await api.post('/auth/forgot-password', { email: harruarEmail.trim() });
    } catch {
      // Për arsye sigurie, shfaqim gjithmonë konfirmimin
    } finally {
      setHarruarDukeNgarkuar(false);
      setHarruarSukses(true);
    }
  };

  return (
    <div className="tastio-auth-page">
      <div className="tastio-auth-container">
        {/* Logo Tastio në krye */}
        <div className="tastio-auth-logo-wrap">
          <Link to="/" className="tastio-auth-logo" aria-label="Kthehu në Ballinë">
            Tastio
          </Link>
        </div>

        {harruarModal ? (
          /* ==========================================================
             Seksioni: Rikuperimi i Fjalëkalimit
             ========================================================== */
          <div>
            <button
              type="button"
              className="tastio-auth-back-btn"
              onClick={() => {
                setHarruarModal(false);
                setHarruarSukses(false);
              }}
            >
              <ArrowLeft size={16} />
              <span>Kthehu te kyçja</span>
            </button>

            <div className="tastio-auth-header">
              <h1 className="tastio-auth-title">Rikuperimi i Fjalëkalimit</h1>
              <p className="tastio-auth-subtitle">
                Vendosni adresën e emailit me të cilën keni regjistruar llogarinë dhe do t'ju dërgojmë udhëzimet e rivendosjes.
              </p>
            </div>

            {harruarSukses ? (
              <div className="tastio-auth-alert-success">
                <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 8px' }} />
                <h4>Udhëzimet u dërguan</h4>
                <p>
                  Nëse ekziston një llogari me email <strong>{harruarEmail}</strong>, keni pranuar lidhjen e sigurt për rivendosjen e fjalëkalimit. Kontrolloni edhe dosjen Spam.
                </p>
                <button
                  type="button"
                  className="tastio-auth-submit-btn"
                  style={{ marginTop: '20px' }}
                  onClick={() => {
                    setHarruarModal(false);
                    setHarruarSukses(false);
                  }}
                >
                  Kthehu te Formulari i Kyçjes
                </button>
              </div>
            ) : (
              <form onSubmit={handleHarruarSubmit} className="tastio-auth-form">
                <div className="tastio-auth-field">
                  <label htmlFor="recoveryEmail" className="tastio-auth-label">
                    Email Adresa e Llogarisë
                  </label>
                  <div className="tastio-auth-input-wrap">
                    <input
                      id="recoveryEmail"
                      type="email"
                      className="tastio-auth-input"
                      value={harruarEmail}
                      onChange={(e) => setHarruarEmail(e.target.value)}
                      required
                      placeholder="shembull@email.com"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={harruarDukeNgarkuar}
                  className="tastio-auth-submit-btn"
                >
                  {harruarDukeNgarkuar ? (
                    <>
                      <span className="tastio-auth-spinner" />
                      <span>Duke dërguar udhëzimet...</span>
                    </>
                  ) : (
                    <span>Dërgo Lidhjen e Rivendosjes</span>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ==========================================================
             Seksioni Kryesor: Kyçu (Login)
             ========================================================== */
          <>
            <div className="tastio-auth-header">
              <h1 className="tastio-auth-title">Mirë se u ktheve!</h1>
              <p className="tastio-auth-subtitle">Kyçu në llogarinë tënde për të vazhduar.</p>
            </div>

            {gabim && (
              <div className="tastio-auth-alert-error" role="alert" style={{ marginBottom: '18px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{gabim}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="tastio-auth-form">
              {/* Email */}
              <div className="tastio-auth-field">
                <label htmlFor="loginEmail" className="tastio-auth-label">
                  Adresa e Emailit
                </label>
                <div className="tastio-auth-input-wrap">
                  <input
                    id="loginEmail"
                    type="email"
                    className="tastio-auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="p.sh. emri@shembull.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Fjalëkalimi */}
              <div className="tastio-auth-field">
                <div className="tastio-auth-label">
                  <label htmlFor="loginPassword">Fjalëkalimi</label>
                  <button
                    type="button"
                    className="tastio-auth-forgot-link"
                    onClick={() => {
                      setHarruarModal(true);
                      setHarruarEmail(email);
                    }}
                  >
                    Ke harruar fjalëkalimin?
                  </button>
                </div>
                <div className="tastio-auth-input-wrap">
                  <input
                    id="loginPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="tastio-auth-input"
                    value={fjalekalimi}
                    onChange={(e) => setFjalekalimi(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="tastio-auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Butoni Submit */}
              <button
                type="submit"
                disabled={duke_ngarkuar}
                className="tastio-auth-submit-btn"
              >
                {duke_ngarkuar ? (
                  <>
                    <span className="tastio-auth-spinner" />
                    <span>Duke u kyçur...</span>
                  </>
                ) : (
                  <span>Kyçu</span>
                )}
              </button>
            </form>

            {/* Kalimi te Regjistrohu */}
            <div className="tastio-auth-footer-text">
              <span>Nuk ke llogari?</span>
              <Link to="/regjistrim" className="tastio-auth-footer-link">
                Regjistrohu
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
