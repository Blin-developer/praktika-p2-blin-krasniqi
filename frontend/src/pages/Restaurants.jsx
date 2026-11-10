import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Restorantet() {
  const [restorantet, setRestorantet] = useState([]);
  const [kategorite, setKategorite] = useState([]);
  const [kategoriaZgjedhur, setKategoriaZgjedhur] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);

  useEffect(() => {
    async function ngarkoTeDhenat() {
      try {
        setDukeNgarkuar(true);
        const [catRes, restRes] = await Promise.all([
          api.get('/public/categories'),
          api.get(kategoriaZgjedhur ? `/public/restaurants?category=${kategoriaZgjedhur}` : '/public/restaurants')
        ]);
        setKategorite(catRes.data.data || []);
        setRestorantet(restRes.data.data || []);
      } catch (err) {
        console.error('Dështoi ngarkimi i restoranteve', err);
      } finally {
        setDukeNgarkuar(false);
      }
    }
    ngarkoTeDhenat();
  }, [kategoriaZgjedhur]);

  return (
    <div>
      {/* Shiriti i Kategorive */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.5px' }}>
          Eksploroni Restorantet në Prishtinë
        </h2>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
          <button
            onClick={() => setKategoriaZgjedhur(null)}
            className={`btn ${kategoriaZgjedhur === null ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '24px', padding: '8px 18px', fontSize: '14px', whiteSpace: 'nowrap' }}
          >
            🍽️ Të Gjitha Kuzhinat
          </button>
          {kategorite.map((kat) => (
            <button
              key={kat.id}
              onClick={() => setKategoriaZgjedhur(kat.slug)}
              className={`btn ${kategoriaZgjedhur === kat.slug ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: '24px', padding: '8px 18px', fontSize: '14px', whiteSpace: 'nowrap' }}
            >
              {kat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Rrjeti i Restoranteve */}
      {duke_ngarkuar ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
          Duke ngarkuar restorantet...
        </div>
      ) : restorantet.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>Nuk u gjet asnjë restorant për këtë kategori.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {restorantet.map((rest) => (
            <Link
              key={rest.id}
              to={`/restorante/${rest.slug}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card" style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '180px', position: 'relative', backgroundColor: '#e2e8f0' }}>
                  <img
                    src={rest.banner_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=300&fit=crop'}
                    alt={rest.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '16px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    border: '3px solid #ffffff',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    boxShadow: 'var(--shadow-md)'
                  }}>
                    <img
                      src={rest.logo_url || rest.banner_url}
                      alt={rest.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>

                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{rest.name}</h3>
                    <span className="badge badge-success">Hapur</span>
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.4', flex: 1, marginBottom: '16px' }}>
                    {rest.description}
                  </p>
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    <span>📍 {rest.branches?.length || 1} Degë në Prishtinë</span>
                    <span>⚡ Koha e vlerësuar: 20-25 min</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
