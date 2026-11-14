import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function NdjekjaPorosive() {
  const { user } = useAuth();
  const [porosite, setPorosite] = useState([]);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);

  useEffect(() => {
    async function ngarkoPorosite() {
      try {
        setDukeNgarkuar(true);
        const res = await api.get('/orders/my-orders');
        setPorosite(res.data.data || []);
      } catch (err) {
        console.error('Dështoi ngarkimi i porosive', err);
      } finally {
        setDukeNgarkuar(false);
      }
    }
    ngarkoPorosite();
  }, []);

  const perktheStatusin = (st) => {
    switch (st) {
      case 'pending': return 'Në Pritje';
      case 'confirmed': return 'E Konfirmuar';
      case 'in_preparation': return 'Në Përgatitje';
      case 'ready_for_pickup': return 'Gati për Marrje';
      case 'completed': return 'E Përfunduar';
      case 'cancelled': return 'E Anuluar';
      default: return st;
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Porositë e Mia & Pass-i Digjital</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Ndiqni përgatitjen e porosisë në kohë reale dhe paraqisni kodin tuaj QR në sportel.
        </p>
      </div>

      {duke_ngarkuar ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>Duke ngarkuar porositë...</div>
      ) : porosite.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>Nuk keni kryer ende asnjë porosi.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {porosite.map((porosia) => {
            const isDelivery = porosia.order_type === 'delivery';
            let addressObj = null;
            if (isDelivery && porosia.delivery_address) {
              if (typeof porosia.delivery_address === 'string') {
                try { addressObj = JSON.parse(porosia.delivery_address); } catch { addressObj = { street: porosia.delivery_address }; }
              } else {
                addressObj = porosia.delivery_address;
              }
            }

            return (
              <div key={porosia.id} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className="badge badge-primary">
                        Porosia #{porosia.order_number}
                      </span>
                      <span className="badge badge-outline" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                        {isDelivery ? '🚚 Dërgesë' : '🛍️ Marrje në Sportel'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{porosia.branch?.restaurant?.name}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {isDelivery ? (
                        <span>
                          📍 Adresa: {addressObj?.street ? `${addressObj.street}, ${addressObj.city || 'Prishtinë'}` : (porosia.delivery_address || 'Prishtinë')}
                          {addressObj?.building ? ` (Ndërtesa ${addressObj.building})` : ''}
                        </span>
                      ) : (
                        <span>📍 Marrja te {porosia.branch?.name} • {porosia.branch?.address}</span>
                      )}
                    </div>
                  </div>

                  <span className="badge badge-success" style={{ textTransform: 'uppercase', fontSize: '12px' }}>
                    {perktheStatusin(porosia.status)}
                  </span>
                </div>

                {/* Stepper Vizual i Statusit */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#16a34a' }}>✓ Konfirmuar</div>
                  </div>
                  <div style={{ flex: 1, height: '2px', backgroundColor: '#16a34a', margin: '0 12px' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#16a34a' }}>✓ Në Kuzhinë</div>
                  </div>
                  <div style={{ flex: 1, height: '2px', backgroundColor: '#16a34a', margin: '0 12px' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>
                      {isDelivery ? '● Në Rrugë / Korrieri' : '● Gati Për Marrje'}
                    </div>
                  </div>
                  <div style={{ flex: 1, height: '2px', backgroundColor: '#cbd5e1', margin: '0 12px' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#94a3b8' }}>○ E Dorëzuar</div>
                  </div>
                </div>

                {/* Informacioni i Dërgesës ose Pass-i Digjital */}
                {isDelivery ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    marginBottom: '24px'
                  }}>
                    <div style={{ fontSize: '28px' }}>🚚</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af' }}>
                        Porosi me Dërgesë te Dera Juaj
                      </div>
                      <div style={{ fontSize: '13px', color: '#3b82f6', marginTop: '2px' }}>
                        Pagesa bëhet me para në dorë tek korrieri në momentin e pranimit. Koha e vlerësuar: 25–40 min.
                      </div>
                    </div>
                  </div>
                ) : (
                  porosia.pickup_token && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '24px',
                      padding: '20px',
                      border: '2px dashed var(--color-primary)',
                      borderRadius: '12px',
                      backgroundColor: '#fff7ed',
                      marginBottom: '24px'
                    }}>
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
                        <QRCodeSVG value={porosia.pickup_token.qr_payload} size={110} />
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                          Pass Digjital Zyrtar për Marrje në Sportel
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
                          Kodi i Shkurtër: <span style={{ color: 'var(--color-primary)' }}>{porosia.pickup_token.short_code}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#7c2d12', marginTop: '4px' }}>
                          Paraqisni këtë kod QR ose kodin 6-shifror në sportel gjatë marrjes dhe kryerjes së pagesës.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Përmbledhja e Artikujve */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Artikujt e Porosisë:</div>
                  {porosia.items?.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                      <span>{item.quantity}x {item.product_name_snapshot}</span>
                      <span style={{ fontWeight: 600 }}>€{parseFloat(item.line_total).toFixed(2)}</span>
                    </div>
                  ))}
                  {isDelivery && parseFloat(porosia.delivery_fee || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                      <span>Tarifa e dërgesës</span>
                      <span>€{parseFloat(porosia.delivery_fee).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                    <span>Shuma Totale {isDelivery ? '(Para në Dorëzim)' : '(Pagesë në Sportel)'}</span>
                    <span style={{ color: 'var(--color-primary)' }}>€{parseFloat(porosia.total_price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
