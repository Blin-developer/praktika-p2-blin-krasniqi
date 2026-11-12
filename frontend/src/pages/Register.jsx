import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function Regjistrimi() {
  const [emri, setEmri] = useState('');
  const [email, setEmail] = useState('');
  const [telefoni, setTelefoni] = useState('');
  const [fjalekalimi, setFjalekalimi] = useState('');
  const [konfirmimiFjalekalimit, setKonfirmimiFjalekalimit] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [roli, setRoli] = useState('customer');
  const [gabim, setGabim] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGabim(null);

    if (fjalekalimi.length < 8) {
      setGabim('Fjalëkalimi duhet të ketë të paktën 8 karaktere.');
      return;
    }

    if (fjalekalimi !== konfirmimiFjalekalimit) {
      setGabim('Konfirmimi i fjalëkalimit nuk përputhet. Ju lutem kontrolloni.');
      return;
    }

    setDukeNgarkuar(true);

    try {
      const res = await api.post('/auth/register', {
        name: emri,
        email,
        phone: telefoni,
        password: fjalekalimi,
        password_confirmation: konfirmimiFjalekalimit,
        role: roli,
      });

      login(res.data.user, res.data.token);
      navigate(roli === 'owner' ? '/admin' : '/restorante');
    } catch (err) {
      const mesazhet = err.response?.data?.errors;
      if (mesazhet) {
        const pare = Object.values(mesazhet)[0];
        setGabim(Array.isArray(pare) ? pare[0] : pare);
      } else {
        setGabim(err.response?.data?.mesazh || 'Regjistrimi dështoi. Ju lutem provoni sërish.');
      }
    } finally {
      setDukeNgarkuar(false);
    }
  };

  const passMatch = fjalekalimi && konfirmimiFjalekalimit && fjalekalimi === konfirmimiFjalekalimit;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <Link to="/" style={styles.logoLink}>Tastio</Link>
        </div>

        <h2 style={styles.title}>Krijoni llogarinë tuaj</h2>
        <p style={styles.subtitle}>
          Bashkohuni me Tastio — porosit nga restorantet më të mira ose menaxhoni biznesin tuaj.
        </p>

        {gabim && (
          <div style={styles.errorBox}>
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{gabim}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Emri */}
          <div style={styles.fieldGroup}>
            <label htmlFor="regName" style={styles.label}>Emri dhe Mbiemri *</label>
            <input
              id="regName"
              type="text"
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              required
              placeholder="p.sh. Blin Krasniqi"
              style={styles.input}
            />
          </div>

          {/* Email */}
          <div style={styles.fieldGroup}>
            <label htmlFor="regEmail" style={styles.label}>Adresa e Emailit *</label>
            <input
              id="regEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="p.sh. emri@shembull.com"
              style={styles.input}
            />
          </div>

          {/* Telefon */}
          <div style={styles.fieldGroup}>
            <label htmlFor="regPhone" style={styles.label}>Numri i Telefonit</label>
            <input
              id="regPhone"
              type="tel"
              value={telefoni}
              onChange={(e) => setTelefoni(e.target.value)}
              placeholder="+383 4X XXX XXX"
              style={styles.input}
            />
          </div>

          {/* Lloji i llogarisë */}
          <div style={styles.fieldGroup}>
            <label htmlFor="regRole" style={styles.label}>Lloji i Llogarisë *</label>
            <select
              id="regRole"
              value={roli}
              onChange={(e) => setRoli(e.target.value)}
              style={styles.select}
            >
              <option value="customer">Klient — Porosit ushqim dhe pije</option>
              <option value="owner">Pronar Restoranti — Menaxhim biznesi dhe degësh</option>
            </select>
          </div>

          {/* Fjalëkalimi */}
          <div style={styles.fieldGroup}>
            <label htmlFor="regPass" style={styles.label}>Fjalëkalimi (min. 8 karaktere) *</label>
            <div style={styles.inputWrap}>
              <input
                id="regPass"
                type={showPass ? 'text' : 'password'}
                value={fjalekalimi}
                onChange={(e) => setFjalekalimi(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                style={{ ...styles.input, paddingRight: '46px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
                tabIndex={-1}
                aria-label="Trego / fshih fjalëkalimin"
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Konfirmo fjalëkalimin */}
          <div style={{ ...styles.fieldGroup, marginBottom: '28px' }}>
            <label htmlFor="regPassConfirm" style={styles.label}>Konfirmoni Fjalëkalimin *</label>
            <div style={styles.inputWrap}>
              <input
                id="regPassConfirm"
                type={showPassConfirm ? 'text' : 'password'}
                value={konfirmimiFjalekalimit}
                onChange={(e) => setKonfirmimiFjalekalimit(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                style={{
                  ...styles.input,
                  paddingRight: '46px',
                  borderColor: konfirmimiFjalekalimit
                    ? (passMatch ? '#22c55e' : '#f87171')
                    : '#e2e8f0',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassConfirm(!showPassConfirm)}
                style={styles.eyeBtn}
                tabIndex={-1}
                aria-label="Trego / fshih fjalëkalimin"
              >
                {showPassConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {/* Feedback i menjëhershëm */}
            {konfirmimiFjalekalimit && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: passMatch ? '#16a34a' : '#dc2626',
              }}>
                {passMatch
                  ? <><CheckCircle2 size={14} /> Fjalëkalimet përputhen</>
                  : <><AlertCircle size={14} /> Fjalëkalimet nuk përputhen</>
                }
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={duke_ngarkuar}
            style={{ ...styles.submitBtn, opacity: duke_ngarkuar ? 0.75 : 1 }}
          >
            {duke_ngarkuar ? 'Duke krijuar llogarinë...' : 'Krijo Llogarinë'}
          </button>
        </form>

        <p style={styles.switchText}>
          Keni tashmë një llogari?{' '}
          <Link to="/kyqja" style={styles.switchLink}>Kyçuni</Link>
        </p>
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
    maxWidth: '500px',
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
  fieldGroup: {
    marginBottom: '18px',
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
  select: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14.5px',
    color: '#0f172a',
    background: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    cursor: 'pointer',
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
