import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function SistemiKuzhinesKDS() {
  const { user } = useAuth();
  const [biletat, setBiletat] = useState([]);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);
  const [stacioniZgjedhur, setStacioniZgjedhur] = useState('ALL');

  useEffect(() => {
    async function ngarkoBiletat() {
      try {
        setDukeNgarkuar(true);
        const res = await api.get('/kds/tickets');
        setBiletat(res.data.data || []);
      } catch (err) {
        console.error('Dështoi ngarkimi i biletave KDS', err);
      } finally {
        setDukeNgarkuar(false);
      }
    }
    ngarkoBiletat();
  }, []);

  return (
    <div>
      {/* Kreu KDS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800 }}>👨‍🍳 Sistemi i Shfaqjes në Kuzhinë (KDS)</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            I kyçur si <strong>{user?.name}</strong> • Roli: <strong>{user?.role === 'kitchen_staff' ? 'Staf Kuzhine' : user?.role}</strong>
          </p>
        </div>

        {/* Filtrimi sipas Stacioneve */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { kodi: 'ALL', emri: 'TË GJITHA' },
            { kodi: 'GRILL', emri: 'GRILL' },
            { kodi: 'SALAD', emri: 'SALLATË' },
            { kodi: 'BEVERAGE', emri: 'PIJE' },
            { kodi: 'PACKAGING', emri: 'PAKETIM' }
          ].map((st) => (
            <button
              key={st.kodi}
              onClick={() => setStacioniZgjedhur(st.kodi)}
              className={`btn ${stacioniZgjedhur === st.kodi ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '16px' }}
            >
              {st.emri}
            </button>
          ))}
        </div>
      </div>

      {/* Rrjeti i Biletave */}
      {duke_ngarkuar ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>Duke ngarkuar biletat e kuzhinës...</div>
      ) : biletat.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Kuzhina është e pastër!</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Nuk ka asnjë porosi në pritje për përgatitje për momentin.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {biletat.map((bileta) => (
            <div key={bileta.id} className="card" style={{ borderTop: '4px solid var(--color-primary)', display: 'flex', flexDirection: 'column' }}>
              {/* Kreu i Biletës */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>#{bileta.order_number}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Klienti: {bileta.customer?.name}</div>
                </div>
                <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                  {bileta.status === 'confirmed' ? 'E Konfirmuar' : 'Në Përgatitje'}
                </span>
              </div>

              {/* Artikujt e Biletës */}
              <div style={{ padding: '16px', flex: 1 }}>
                {bileta.items?.map((item) => (
                  <div key={item.id} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px' }}>
                      <span>{item.quantity}x {item.product_name_snapshot}</span>
                      <span className="badge badge-outline" style={{ fontSize: '10px' }}>
                        {item.station?.code || 'GRILL'}
                      </span>
                    </div>

                    {/* Lista e Modifikuesve */}
                    {item.options?.length > 0 && (
                      <div style={{ marginTop: '6px', paddingLeft: '12px', borderLeft: '2px solid var(--color-primary)', fontSize: '12px', color: '#475569' }}>
                        {item.options.map((opt) => (
                          <div key={opt.id}>• {opt.option_group_name_snapshot}: <strong>{opt.option_choice_name_snapshot}</strong></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {bileta.customer_note && (
                  <div style={{ backgroundColor: '#fef3c7', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                    📝 Shënim: {bileta.customer_note}
                  </div>
                )}
              </div>

              {/* Butonat e Veprimit */}
              <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" style={{ flex: 1, padding: '8px', fontSize: '13px' }}>
                  ⏳ Në Përgatitje
                </button>
                <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '13px' }}>
                  ✅ Gati Për Marrje
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
