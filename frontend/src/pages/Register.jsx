import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import './Auth.css';

export default function Regjistrimi() {
  const [emri, setEmri] = useState('');
  const [mbiemri, setMbiemri] = useState('');
  const [email, setEmail] = useState('');
  const [telefoni, setTelefoni] = useState('');
  const [fjalekalimi, setFjalekalimi] = useState('');
  const [konfirmimiFjalekalimit, setKonfirmimiFjalekalimit] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pranoKushtet, setPranoKushtet] = useState(false);

  const [gabim, setGabim] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

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

    // Validime në nivel klienti
    if (!emri.trim() || !mbiemri.trim()) {
      setGabim('Ju lutem shënoni emrin dhe mbiemrin.');
      return;
    }

    if (fjalekalimi.length < 8) {
      setGabim('Fjalëkalimi duhet të ketë të paktën 8 karaktere.');
      return;
    }

    if (fjalekalimi !== konfirmimiFjalekalimit) {
      setGabim('Konfirmimi i fjalëkalimit nuk përputhet me fjalëkalimin.');
      return;
    }

    if (!pranoKushtet) {
      setGabim('Ju lutem pranoni Kushtet e Përdorimit dhe Politikën e Privatësisë për të vazhduar.');
      return;
    }

    setDukeNgarkuar(true);

    try {
      const emriPlote = `${emri.trim()} ${mbiemri.trim()}`;

      const res = await api.post('/auth/register', {
        name: emriPlote,
        first_name: emri.trim(),
        last_name: mbiemri.trim(),
        email: email.trim(),
        phone: telefoni.trim() || null,
        password: fjalekalimi,
        password_confirmation: konfirmimiFjalekalimit,
      });

      const perdoruesi = res.data.user || res.data.perdoruesi;
      const token = res.data.token;

      login(perdoruesi, token);

      // Klientët e rinj publikë dërgohen gjithmonë te faqja kryesore
      navigate('/');
    } catch (err) {
      const mesazhet = err.response?.data?.errors;
      if (mesazhet) {
        const fushaPare = Object.values(mesazhet)[0];
        setGabim(Array.isArray(fushaPare) ? fushaPare[0] : fushaPare);
      } else {
        setGabim(
          err.response?.data?.mesazh ||
          err.response?.data?.message ||
          'Regjistrimi dështoi. Kontrolloni të dhënat dhe provoni përsëri.'
        );
      }
    } finally {
      setDukeNgarkuar(false);
    }
  };

  const perputhenFjalekalimet =
    fjalekalimi && konfirmimiFjalekalimit && fjalekalimi === konfirmimiFjalekalimit;

  return (
    <div className="tastio-auth-page">
      <div className="tastio-auth-container" style={{ maxWidth: '460px' }}>
        {/* Logo Tastio në krye */}
        <div className="tastio-auth-logo-wrap">
          <Link to="/" className="tastio-auth-logo" aria-label="Kthehu në Ballinë">
            Tastio
          </Link>
        </div>

        {/* Titulli dhe Nëntitulli */}
        <div className="tastio-auth-header">
          <h1 className="tastio-auth-title">Krijo llogarinë tënde</h1>
          <p className="tastio-auth-subtitle">
            Plotësoni të dhënat tuaja për të krijuar llogarinë në Tastio.
          </p>
        </div>

        {gabim && (
          <div className="tastio-auth-alert-error" role="alert" style={{ marginBottom: '18px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{gabim}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="tastio-auth-form">
          {/* Emri dhe Mbiemri në një rresht */}
          <div className="tastio-auth-row">
            <div className="tastio-auth-field">
              <label htmlFor="regFirstName" className="tastio-auth-label">
                Emri *
              </label>
              <div className="tastio-auth-input-wrap">
                <input
                  id="regFirstName"
                  type="text"
                  className="tastio-auth-input"
                  value={emri}
                  onChange={(e) => setEmri(e.target.value)}
                  required
                  placeholder="p.sh. Blin"
                  autoFocus
                />
              </div>
            </div>

            <div className="tastio-auth-field">
              <label htmlFor="regLastName" className="tastio-auth-label">
                Mbiemri *
              </label>
              <div className="tastio-auth-input-wrap">
                <input
                  id="regLastName"
                  type="text"
                  className="tastio-auth-input"
                  value={mbiemri}
                  onChange={(e) => setMbiemri(e.target.value)}
                  required
                  placeholder="p.sh. Krasniqi"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="tastio-auth-field">
            <label htmlFor="regEmail" className="tastio-auth-label">
              Adresa e Emailit *
            </label>
            <div className="tastio-auth-input-wrap">
              <input
                id="regEmail"
                type="email"
                className="tastio-auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="p.sh. emri@shembull.com"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Numri i Telefonit */}
          <div className="tastio-auth-field">
            <label htmlFor="regPhone" className="tastio-auth-label">
              Numri i Telefonit
            </label>
            <div className="tastio-auth-input-wrap">
              <input
                id="regPhone"
                type="tel"
                className="tastio-auth-input"
                value={telefoni}
                onChange={(e) => setTelefoni(e.target.value)}
                placeholder="+383 4X XXX XXX"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Fjalëkalimi */}
          <div className="tastio-auth-field">
            <label htmlFor="regPassword" className="tastio-auth-label">
              Fjalëkalimi (të paktën 8 karaktere) *
            </label>
            <div className="tastio-auth-input-wrap">
              <input
                id="regPassword"
                type={showPassword ? 'text' : 'password'}
                className="tastio-auth-input"
                value={fjalekalimi}
                onChange={(e) => setFjalekalimi(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                autoComplete="new-password"
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

          {/* Konfirmimi i Fjalëkalimit */}
          <div className="tastio-auth-field">
            <label htmlFor="regConfirmPassword" className="tastio-auth-label">
              Konfirmimi i Fjalëkalimit *
            </label>
            <div
              className="tastio-auth-input-wrap"
              style={{
                borderColor: konfirmimiFjalekalimit
                  ? perputhenFjalekalimet
                    ? '#10b981'
                    : '#ef4444'
                  : undefined,
              }}
            >
              <input
                id="regConfirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="tastio-auth-input"
                value={konfirmimiFjalekalimit}
                onChange={(e) => setKonfirmimiFjalekalimit(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="tastio-auth-eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Tregues vizual për përputhjen e fjalëkalimit */}
            {konfirmimiFjalekalimit && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginTop: '4px',
                  color: perputhenFjalekalimet ? '#10b981' : '#f87171',
                }}
              >
                {perputhenFjalekalimet ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Fjalëkalimet përputhen</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    <span>Fjalëkalimet nuk përputhen</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Checkbox për Kushtet e Përdorimit */}
          <label className="tastio-auth-checkbox-label">
            <input
              type="checkbox"
              className="tastio-auth-checkbox"
              checked={pranoKushtet}
              onChange={(e) => setPranoKushtet(e.target.checked)}
              required
            />
            <span>
              Pajtohem me{' '}
              <a href="#kushtet" onClick={(e) => e.preventDefault()}>
                Kushtet e Përdorimit
              </a>{' '}
              dhe{' '}
              <a href="#privatesia" onClick={(e) => e.preventDefault()}>
                Politikën e Privatësisë
              </a>{' '}
              të platformës Tastio.
            </span>
          </label>

          {/* Butoni Submit */}
          <button
            type="submit"
            disabled={duke_ngarkuar}
            className="tastio-auth-submit-btn"
          >
            {duke_ngarkuar ? (
              <>
                <span className="tastio-auth-spinner" />
                <span>Duke krijuar llogarinë...</span>
              </>
            ) : (
              <span>Krijo llogari</span>
            )}
          </button>
        </form>

        {/* Kalimi te Kyçu */}
        <div className="tastio-auth-footer-text">
          <span>Ke tashmë llogari?</span>
          <Link to="/kyqja" className="tastio-auth-footer-link">
            Kyçu
          </Link>
        </div>
      </div>
    </div>
  );
}
