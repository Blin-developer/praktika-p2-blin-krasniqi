import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Flame,
  Truck,
  ShoppingBag,
  Sparkles,
  Timer
} from 'lucide-react';

export default function SistemiKuzhinesKDS() {
  const { user } = useAuth();
  const [biletat, setBiletat] = useState([]);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);
  const [gabim, setGabim] = useState(null);
  const [stacioniZgjedhur, setStacioniZgjedhur] = useState('ALL');
  const [veprimDukeUProcesuar, setVeprimDukeUProcesuar] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const ngarkoBiletat = async () => {
    try {
      setDukeNgarkuar(true);
      setGabim(null);
      const res = await api.get('/kds/tickets');
      setBiletat(res.data?.data || []);
    } catch (err) {
      console.error('Dështoi ngarkimi i biletave KDS', err);
      setGabim(
        err.response?.data?.message ||
        'Dështoi lidhja me sistemin KDS. Ju lutem kontrolloni serverin dhe provoni sërish.'
      );
    } finally {
      setDukeNgarkuar(false);
    }
  };

  useEffect(() => {
    ngarkoBiletat();
    const interval = setInterval(ngarkoBiletat, 10000); // Auto-refresh çdo 10 sekonda
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 30000); // Përditëso minutat
    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, []);

  const handleNdryshoStatusin = async (ticketId, targetStatus) => {
    try {
      setVeprimDukeUProcesuar(ticketId);
      await api.patch(`/kds/tickets/${ticketId}/status`, {
        status: targetStatus,
        reason: targetStatus === 'in_preparation'
          ? 'Kuzhina filloi përgatitjen.'
          : 'Porosia u përgatit dhe është gati.',
      });
      await ngarkoBiletat();
    } catch (err) {
      alert(err.response?.data?.message || 'Ndodhi një gabim gjatë përditësimit të statusit.');
    } finally {
      setVeprimDukeUProcesuar(null);
    }
  };

  // Filtrimi sipas stacionit
  const biletatFiltrura = biletat.filter((b) => {
    if (stacioniZgjedhur === 'ALL') return true;
    return b.items?.some((item) => {
      const kodi = item.station?.code || 'GRILL';
      return kodi.toUpperCase() === stacioniZgjedhur.toUpperCase();
    });
  });

  const llogaritMinutat = (createdAt) => {
    if (!createdAt) return 0;
    const diffMs = currentTime - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const stacionet = [
    { kodi: 'ALL', emri: 'Të Gjitha' },
    { kodi: 'GRILL', emri: 'Grill' },
    { kodi: 'SALAD', emri: 'Sallatë' },
    { kodi: 'BEVERAGE', emri: 'Pije' },
    { kodi: 'PACKAGING', emri: 'Paketim' }
  ];

  return (
    <DashboardLayout activeTab="kds">
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
        {/* Header KDS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-warning" style={{ fontWeight: 800 }}>
                KDS LIVE
              </span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                Sinkronizim çdo 10s
              </div>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
              Sistemi i Shfaqjes në Kuzhinë (KDS)
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
              I kyçur si <strong>{user?.name}</strong> • Menaxhoni përgatitjen dhe kohën e porosive sipas stacioneve.
            </p>
          </div>

          <button
            type="button"
            onClick={() => ngarkoBiletat()}
            className="btn btn-secondary"
            style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 16px' }}
            title="Rifresko biletat"
          >
            <RefreshCw size={15} />
            <span>Rifresko Biletat</span>
          </button>
        </div>

        {/* Filtrimi sipas Stacioneve */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginRight: '6px' }}>
            Stacionet:
          </span>
          {stacionet.map((st) => {
            const isActive = stacioniZgjedhur === st.kodi;
            return (
              <button
                key={st.kodi}
                type="button"
                onClick={() => setStacioniZgjedhur(st.kodi)}
                style={{
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 600,
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#0066ff' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                {st.emri}
              </button>
            );
          })}
        </div>

        {/* Gabim Alert */}
        {gabim && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: '#991b1b',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{gabim}</span>
            </div>
            <button
              type="button"
              onClick={() => ngarkoBiletat()}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px' }}
            >
              Provo Përsëri
            </button>
          </div>
        )}

        {/* Rrjeti i Biletave */}
        {duke_ngarkuar && biletat.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            padding: '60px 20px',
            color: '#64748b'
          }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#0066ff', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '14.5px', fontWeight: 600 }}>Duke ngarkuar biletat e kuzhinës...</div>
          </div>
        ) : biletatFiltrura.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '64px 20px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Sparkles size={28} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Kuzhina është e pastër!
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
              Nuk ka asnjë biletë aktive në pritje për përgatitje për momentin.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px'
          }}>
            {biletatFiltrura.map((bileta) => {
              const minutesElapsed = llogaritMinutat(bileta.created_at);
              const isUrgent = minutesElapsed >= 20;
              const isWarning = minutesElapsed >= 10 && minutesElapsed < 20;

              return (
                <div
                  key={bileta.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    borderTop: `4px solid ${bileta.status === 'in_preparation' ? '#0066ff' : '#f59e0b'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Kreu i Biletës */}
                  <div style={{
                    padding: '16px 18px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
                          #{bileta.order_number}
                        </span>
                        {/* Timer Badge */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isUrgent ? '#fef2f2' : (isWarning ? '#fffbeb' : '#f0fdf4'),
                          color: isUrgent ? '#dc2626' : (isWarning ? '#d97706' : '#16a34a')
                        }}>
                          <Clock size={11} />
                          <span>{minutesElapsed} min</span>
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                        Klienti: <strong style={{ color: '#0f172a' }}>{bileta.customer_name || bileta.customer?.name || 'Klient'}</strong>
                        {bileta.customer_phone ? ` (${bileta.customer_phone})` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span className={`badge ${bileta.status === 'confirmed' ? 'badge-warning' : 'badge-primary'}`} style={{ textTransform: 'uppercase', fontSize: '10.5px' }}>
                        {bileta.status === 'confirmed' ? 'E Konfirmuar' : 'Në Përgatitje'}
                      </span>
                      <span className="badge badge-outline" style={{ fontSize: '10px' }}>
                        {bileta.order_type === 'delivery' ? '🚚 Dërgesë' : '🛍️ Marrje'}
                      </span>
                      {bileta.is_scheduled && bileta.scheduled_for && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe'
                        }}>
                          📅 {new Date(bileta.scheduled_for).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Artikujt e Biletës */}
                  <div style={{ padding: '16px 18px', flex: 1 }}>
                    {bileta.items?.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          marginBottom: '12px',
                          paddingBottom: '12px',
                          borderBottom: '1px dashed #e2e8f0'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                            {item.quantity}x {item.product_name_snapshot}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569'
                          }}>
                            {item.station?.code || 'GRILL'}
                          </span>
                        </div>

                        {item.options?.length > 0 && (
                          <div style={{ marginTop: '4px', paddingLeft: '10px', borderLeft: '2px solid #0066ff', fontSize: '12px', color: '#475569' }}>
                            {item.options.map((opt) => (
                              <div key={opt.id}>• {opt.option_group_name_snapshot}: <strong>{opt.option_choice_name_snapshot}</strong></div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {bileta.customer_note && (
                      <div style={{
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fef3c7',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#92400e',
                        marginTop: '8px'
                      }}>
                        📝 Shënim: {bileta.customer_note}
                      </div>
                    )}
                  </div>

                  {/* Butonat e Veprimit */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      type="button"
                      disabled={bileta.status === 'in_preparation' || veprimDukeUProcesuar === bileta.id}
                      onClick={() => handleNdryshoStatusin(bileta.id, 'in_preparation')}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        backgroundColor: bileta.status === 'in_preparation' ? '#f1f5f9' : '#0066ff',
                        color: bileta.status === 'in_preparation' ? '#64748b' : '#ffffff',
                        border: 'none',
                        cursor: bileta.status === 'in_preparation' ? 'default' : 'pointer',
                      }}
                    >
                      {bileta.status === 'in_preparation' ? '👨‍🍳 Në Përgatitje' : 'Fillo Përgatitjen'}
                    </button>
                    <button
                      type="button"
                      disabled={veprimDukeUProcesuar === bileta.id}
                      onClick={() => handleNdryshoStatusin(bileta.id, 'ready_for_pickup')}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none'
                      }}
                    >
                      ✓ Shëno Gati
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
