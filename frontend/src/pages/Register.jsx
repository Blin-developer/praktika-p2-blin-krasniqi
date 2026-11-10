import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

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

  const fusha = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px' };

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/tastio-logo.jpg" alt="Tastio Logo" style={{ height: '54px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Krijoni Llogarinë në Tastio</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
          Bashkohuni me Tastio dhe porositni nga restorantet më të mira të Prishtinës.
        </p>

        {gabim && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #f87171', borderRadius: '8px', color: '#b91c1c', fontSize: '14px', marginBottom: '20px' }}>
            {gabim}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Emri i Plotë</label>
            <input type="text" value={emri} onChange={(e) => setEmri(e.target.value)} required placeholder="p.sh. Blin Krasniqi" style={fusha} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Adresa e Emailit</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="p.sh. emri@shembull.com" style={fusha} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Numri i Telefonit</label>
            <input type="tel" value={telefoni} onChange={(e) => setTelefoni(e.target.value)} placeholder="+383 4X XXX XXX" style={fusha} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Lloji i Llogarisë</label>
            <select value={roli} onChange={(e) => setRoli(e.target.value)} style={fusha}>
              <option value="customer">Klient (Porosit ushqim për marrje)</option>
              <option value="owner">Pronar Restoranti (Menaxho brendin dhe degët)</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Fjalëkalimi (min. 8 karaktere)</label>
            <input type="password" value={fjalekalimi} onChange={(e) => setFjalekalimi(e.target.value)} required minLength={8} placeholder="••••••••" style={fusha} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Konfirmo Fjalëkalimin</label>
            <input type="password" value={konfirmimiFjalekalimit} onChange={(e) => setKonfirmimiFjalekalimit(e.target.value)} required minLength={8} placeholder="••••••••" style={fusha} />
          </div>

          <button type="submit" disabled={duke_ngarkuar} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
            {duke_ngarkuar ? 'Duke krijuar llogarinë...' : 'Regjistrohu'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Keni tashmë llogari? <Link to="/kyqja" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Kyçuni</Link>
        </div>
      </div>
    </div>
  );
}
