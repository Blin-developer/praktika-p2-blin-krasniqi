import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function Kyqja() {
  const [email, setEmail] = useState('');
  const [fjalekalimi, setFjalekalimi] = useState('');
  const [gabim, setGabim] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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

  const handleKyqjaRapide = (demoEmail) => {
    setEmail(demoEmail);
    setFjalekalimi('password123');
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Kyçuni në GourmetExpress</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Futni kredencialet tuaja ose zgjidhni një rol demonstrues më poshtë.
        </p>

        {gabim && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {gabim}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Adresa e Emailit
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="p.sh. klienti@gourmetexpress.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Fjalëkalimi
            </label>
            <input
              type="password"
              value={fjalekalimi}
              onChange={(e) => setFjalekalimi(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={duke_ngarkuar}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
          >
            {duke_ngarkuar ? 'Duke u kyçur...' : 'Kyçu'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Nuk keni llogari? <Link to="/regjistrim" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Krijoni llogari</Link>
        </div>

        {/* Zgjedhësi i Roleve Demonstruese */}
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
            ⚡ Kyçje e Shpejtë – Roli Demonstrues
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button type="button" onClick={() => handleKyqjaRapide('customer.blin@gourmetexpress.com')} className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px', textAlign: 'left' }}>
              👤 Klient: <strong>Blin Krasniqi</strong>
            </button>
            <button type="button" onClick={() => handleKyqjaRapide('kitchen.grill@gourmetexpress.com')} className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px', textAlign: 'left' }}>
              👨‍🍳 Staf Kuzhine: <strong>Lirim Hoxha – Grill</strong>
            </button>
            <button type="button" onClick={() => handleKyqjaRapide('manager.center@gourmetexpress.com')} className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px', textAlign: 'left' }}>
              🏢 Menaxher Dege: <strong>Vesa Gashi – Tartine Qendër</strong>
            </button>
            <button type="button" onClick={() => handleKyqjaRapide('owner.tartine@gourmetexpress.com')} className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px', textAlign: 'left' }}>
              👑 Pronar Restoranti: <strong>Tartine Deli & Bakery</strong>
            </button>
            <button type="button" onClick={() => handleKyqjaRapide('admin@gourmetexpress.com')} className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px', textAlign: 'left' }}>
              🛡️ Super Administrator: <strong>Paneli i Platformës</strong>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
