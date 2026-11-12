import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { AlertCircle } from 'lucide-react';

export default function Regjistrimi() {
  const [emri, setEmri] = useState('');
  const [email, setEmail] = useState('');
  const [telefoni, setTelefoni] = useState('');
  const [fjalekalimi, setFjalekalimi] = useState('');
  const [konfirmimiFjalekalimit, setKonfirmimiFjalekalimit] = useState('');
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
      setGabim('Konfirmimi i fjalëkalimit nuk përputhet.');
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

  const fusha = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ maxWidth: '480px', margin: '30px auto', padding: '0 16px' }}>
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

        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px', textAlign: 'center', color: '#0f172a' }}>
          Krijoni Llogarinë tuaj
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
          Bashkohuni me Tastio për porosi të shpejta ose për të menaxhuar restorantin tuaj.
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
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="regName" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Emri dhe Mbiemri *
            </label>
            <input
              id="regName"
              type="text"
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              required
              placeholder="p.sh. Blin Krasniqi"
              style={fusha}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="regEmail" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Adresa e Emailit *
            </label>
            <input
              id="regEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="p.sh. emri@shembull.com"
              style={fusha}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="regPhone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Numri i Telefonit
            </label>
            <input
              id="regPhone"
              type="tel"
              value={telefoni}
              onChange={(e) => setTelefoni(e.target.value)}
              placeholder="+383 4X XXX XXX"
              style={fusha}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="regRole" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Lloji i Llogarisë *
            </label>
            <select
              id="regRole"
              value={roli}
              onChange={(e) => setRoli(e.target.value)}
              style={fusha}
            >
              <option value="customer">Klient (Porosit ushqim dhe pije)</option>
              <option value="owner">Pronar Restoranti (Menaxhim biznesi dhe degësh)</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="regPass" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Fjalëkalimi (min. 8 karaktere) *
            </label>
            <input
              id="regPass"
              type="password"
              value={fjalekalimi}
              onChange={(e) => setFjalekalimi(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              style={fusha}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="regPassConfirm" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Konfirmoni Fjalëkalimin *
            </label>
            <input
              id="regPassConfirm"
              type="password"
              value={konfirmimiFjalekalimit}
              onChange={(e) => setKonfirmimiFjalekalimit(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              style={fusha}
            />
          </div>

          <button
            type="submit"
            disabled={duke_ngarkuar}
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: 800, borderRadius: '9999px' }}
          >
            {duke_ngarkuar ? 'Duke krijuar llogarinë...' : 'Krijo Llogarinë'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
          Keni tashmë një llogari?{' '}
          <Link to="/kyqja" style={{ color: '#0865F5', fontWeight: 700, textDecoration: 'none' }}>
            Kyçuni
          </Link>
        </div>
      </div>
    </div>
  );
}
