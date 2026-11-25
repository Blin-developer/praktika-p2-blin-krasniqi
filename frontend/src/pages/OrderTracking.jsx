import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  X,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getOrderVerificationUrl } from '../utils/orderQr';
import DashboardLayout from '../components/DashboardLayout';
import DeliveryMap from '../components/DeliveryMap';

export default function NdjekjaPorosive() {
  const { user } = useAuth();
  const [porosite, setPorosite] = useState([]);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);
  const [gabim, setGabim] = useState(null);
  const [kerkoTekst, setKerkoTekst] = useState('');
  const [statusFiltri, setStatusFiltri] = useState('all');
  const [anuloModal, setAnuloModal] = useState({ hapur: false, orderNumber: null, arsyeja: '' });
  const [dukeAnuluar, setDukeAnuluar] = useState(false);

  const ngarkoPorosite = async (overrideSearch) => {
    try {
      setDukeNgarkuar(true);
      setGabim(null);
      const params = {};
      if (statusFiltri !== 'all') params.status = statusFiltri;

      const searchValue = overrideSearch !== undefined ? overrideSearch : kerkoTekst;
      if (searchValue && searchValue.trim()) {
        params.search = searchValue.trim();
      }

      const res = await api.get('/orders/my-orders', { params });
      setPorosite(res.data?.data || []);
    } catch (err) {
      console.error('Dështoi ngarkimi i porosive', err);
      setGabim(
        err.response?.data?.message ||
        'Nuk u arrit të ngarkohen porositë tuaja. Ju lutem kontrolloni lidhjen dhe provoni sërish.'
      );
    } finally {
      setDukeNgarkuar(false);
    }
  };

  useEffect(() => {
    ngarkoPorosite();
    const poll = setInterval(() => {
      ngarkoPorosite();
    }, 6000);
    return () => clearInterval(poll);
  }, [statusFiltri]);

  const handleKerkimSubmit = (e) => {
    e.preventDefault();
    ngarkoPorosite();
  };

  const handlePastroKerkimin = () => {
    setKerkoTekst('');
    ngarkoPorosite('');
  };

  const handleAnuloPorosine = async (e) => {
    e.preventDefault();
    if (!anuloModal.orderNumber) return;

    try {
      setDukeAnuluar(true);
      await api.post(`/orders/${anuloModal.orderNumber}/cancel`, {
        reason: anuloModal.arsyeja.trim() || 'Anuluar nga klienti.',
      });
      setAnuloModal({ hapur: false, orderNumber: null, arsyeja: '' });
      await ngarkoPorosite();
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi anulimi i porosisë.');
    } finally {
      setDukeAnuluar(false);
    }
  };

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

  const merrBadgeKlase = (st) => {
    switch (st) {
      case 'completed': return 'badge badge-success';
      case 'in_preparation': return 'badge badge-warning';
      case 'ready_for_pickup': return 'badge badge-primary';
      case 'confirmed': return 'badge badge-primary';
      case 'cancelled': return 'badge badge-danger';
      case 'pending':
      default:
        return 'badge badge-outline';
    }
  };

  const formatoAdresen = (deliveryAddress) => {
    if (!deliveryAddress) return 'Prishtinë';

    let addressObj = null;
    if (typeof deliveryAddress === 'string') {
      try {
        addressObj = JSON.parse(deliveryAddress);
      } catch {
        return deliveryAddress.replace(/nd[ëe]rtesa\s+nd[ëe]rtesa/gi, 'Ndërtesa');
      }
    } else {
      addressObj = deliveryAddress;
    }

    if (!addressObj) return 'Prishtinë';

    const parts = [];
    if (addressObj.street) parts.push(addressObj.street);
    if (addressObj.building) {
      const cleanBld = String(addressObj.building).replace(/^(nd[ëe]rtesa|objekti|banesa)\s*[:#-]?\s*/i, '').trim();
      if (cleanBld) parts.push(`Ndërtesa ${cleanBld}`);
    }
    if (addressObj.floor) {
      const floorStr = String(addressObj.floor).trim();
      if (/hyrja|kati/i.test(floorStr)) {
        parts.push(floorStr);
      } else {
        parts.push(`Hyrja/Kati: ${floorStr}`);
      }
    }
    if (addressObj.city) {
      parts.push(addressObj.city);
    } else {
      parts.push('Prishtinë');
    }

    return parts.join(', ');
  };

  const STATUS_LEVELS = {
    pending: 0,
    confirmed: 1,
    in_preparation: 2,
    ready_for_pickup: 3,
    completed: 4,
  };

  return (
    <DashboardLayout activeTab="orders">
      <div style={{ maxWidth: '920px', margin: '0 auto', paddingBottom: '40px' }}>
        {/* Header Sekondar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                Aktiviteti Im
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                • {porosite.length} {porosite.length === 1 ? 'porosi gjithsej' : 'porosi gjithsej'}
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
              Porositë e Mia & Pass-i Digjital
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
              Ndiqni përgatitjen e porosisë në kohë reale dhe paraqisni kodin tuaj QR në sportel ose prisni korrierin.
            </p>
          </div>

          <button
            type="button"
            onClick={() => ngarkoPorosite()}
            className="btn btn-secondary"
            style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 16px' }}
            title="Rifresko listën e porosive"
          >
            <RefreshCw size={15} />
            <span>Rifresko</span>
          </button>
        </div>

        {/* Shiriti i Kërkimit & Filtrave me Stil Wolt */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <form onSubmit={handleKerkimSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Kërko me numër porosie, restorant ose artikull..."
                value={kerkoTekst}
                onChange={(e) => setKerkoTekst(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 16px 11px 40px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease'
                }}
              />
              <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              {kerkoTekst && (
                <button
                  type="button"
                  onClick={handlePastroKerkimin}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
                  title="Pastro kërkimin"
                >
                  <X size={17} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0 22px', borderRadius: '10px', fontWeight: 700 }}
            >
              Kërko
            </button>
          </form>

          {/* Status Tabs me stil pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {[
              { id: 'all', emri: 'Të Gjitha' },
              { id: 'pending', emri: 'Në Pritje' },
              { id: 'confirmed', emri: 'Të Konfirmuara' },
              { id: 'in_preparation', emri: 'Në Përgatitje' },
              { id: 'ready_for_pickup', emri: 'Gati' },
              { id: 'completed', emri: 'Të Përfunduara' },
              { id: 'cancelled', emri: 'Të Anuluara' },
            ].map((tab) => {
              const isActive = statusFiltri === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFiltri(tab.id)}
                  style={{
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 600,
                    padding: '7px 16px',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: isActive ? '#0066ff' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.emri}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mesazhi i Gabimit me mundësi Retry */}
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
            fontSize: '14px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{gabim}</span>
            </div>
            <button
              type="button"
              onClick={() => ngarkoPorosite()}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px' }}
            >
              Provo Përsëri
            </button>
          </div>
        )}

        {/* Përmbajtja e Porosive */}
        {duke_ngarkuar ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            padding: '60px 20px',
            color: '#64748b'
          }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#0066ff', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '14.5px', fontWeight: 600 }}>Duke ngarkuar të dhënat e porosive...</div>
          </div>
        ) : porosite.length === 0 ? (
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
              background: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <ShoppingBag size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              {statusFiltri !== 'all' || kerkoTekst
                ? 'Nuk u gjet asnjë porosi'
                : 'Nuk keni ende asnjë porosi të kryer'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
              {statusFiltri !== 'all' || kerkoTekst
                ? 'Provoni të ndryshoni filtrat e statusit ose termin e kërkimit për të gjetur porositë tuaja.'
                : 'Eksploroni restorantet partnere në Tastio dhe porositni pjatat tuaja të preferuara.'}
            </p>
            {statusFiltri !== 'all' || kerkoTekst ? (
              <button
                type="button"
                onClick={() => { setStatusFiltri('all'); handlePastroKerkimin(); }}
                className="btn btn-primary"
                style={{ borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}
              >
                Pastro Filtrat
              </button>
            ) : (
              <Link
                to="/restorante"
                className="btn btn-primary"
                style={{ borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}
              >
                Eksploro Restorantet
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {porosite.map((porosia) => {
              const isDelivery = porosia.order_type === 'delivery';
              const isCancelled = porosia.status === 'cancelled';
              const currentLevel = STATUS_LEVELS[porosia.status] ?? 0;

              const qrPayload = getOrderVerificationUrl(porosia);
              const shortCode = porosia.pickup_token?.short_code || String(porosia.order_number).replace(/^TASTIO-/, '');

              return (
                <div
                  key={porosia.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.2s ease'
                  }}
                >
                  {/* Header i Kartelës */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: 'rgba(0, 102, 255, 0.1)',
                          color: '#0066ff',
                          fontWeight: 800,
                          fontSize: '12.5px',
                          padding: '4px 10px',
                          borderRadius: '8px'
                        }}>
                          Porosia #{porosia.order_number}
                        </span>
                        <span className="badge badge-outline" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                          {isDelivery ? '🚚 Dërgesë' : '🛍️ Marrje në Sportel'}
                        </span>
                        {porosia.is_scheduled && porosia.scheduled_for && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '8px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe'
                          }}>
                            📅 E Planifikuar: {new Date(porosia.scheduled_for).toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' })} · {new Date(porosia.scheduled_for).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                        {porosia.branch?.restaurant?.name || porosia.branch?.name || 'Restorant Tastio'}
                      </h2>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {isDelivery ? (
                          <span>📍 Adresa: {formatoAdresen(porosia.delivery_address)}</span>
                        ) : (
                          <span>📍 Marrja te {porosia.branch?.name} • {porosia.branch?.address}</span>
                        )}
                      </div>
                    </div>

                    <span className={merrBadgeKlase(porosia.status)} style={{ textTransform: 'uppercase', fontSize: '11.5px', fontWeight: 700, padding: '5px 12px' }}>
                      {perktheStatusin(porosia.status)}
                    </span>
                  </div>

                  {/* Stepper Vizual Dinamik Wolt */}
                  {isCancelled ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 18px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      color: '#991b1b',
                    }}>
                      <XCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Porosia është Anuluar</div>
                        <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                          Kjo porosi nuk është më aktive në kuzhinë.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      border: '1px solid #edf2f7',
                      overflowX: 'auto'
                    }}>
                      {/* Hapi 1: Konfirmuar */}
                      <div style={{ textAlign: 'center', minWidth: '95px' }}>
                        <div style={{
                          fontWeight: currentLevel >= 1 ? 700 : 500,
                          fontSize: '12.5px',
                          color: currentLevel > 1 ? '#16a34a' : (currentLevel === 1 ? '#0066ff' : '#94a3b8'),
                        }}>
                          {currentLevel > 1 ? '✓ Konfirmuar' : (currentLevel === 1 ? '● Konfirmuar' : '○ Në Pritje')}
                        </div>
                      </div>

                      {/* Vija 1 -> 2 */}
                      <div style={{
                        flex: 1,
                        height: '2px',
                        backgroundColor: currentLevel >= 2 ? '#16a34a' : '#e2e8f0',
                        margin: '0 8px',
                        transition: 'background-color 0.3s ease',
                      }} />

                      {/* Hapi 2: Në Kuzhinë */}
                      <div style={{ textAlign: 'center', minWidth: '95px' }}>
                        <div style={{
                          fontWeight: currentLevel >= 2 ? 700 : 500,
                          fontSize: '12.5px',
                          color: currentLevel > 2 ? '#16a34a' : (currentLevel === 2 ? '#0066ff' : '#94a3b8'),
                        }}>
                          {currentLevel > 2 ? '✓ Në Kuzhinë' : (currentLevel === 2 ? '● Në Kuzhinë' : '○ Kuzhina')}
                        </div>
                      </div>

                      {/* Vija 2 -> 3 */}
                      <div style={{
                        flex: 1,
                        height: '2px',
                        backgroundColor: currentLevel >= 3 ? '#16a34a' : '#e2e8f0',
                        margin: '0 8px',
                        transition: 'background-color 0.3s ease',
                      }} />

                      {/* Hapi 3: Gati / Në Rrugë */}
                      <div style={{ textAlign: 'center', minWidth: '105px' }}>
                        <div style={{
                          fontWeight: currentLevel >= 3 ? 700 : 500,
                          fontSize: '12.5px',
                          color: currentLevel > 3 ? '#16a34a' : (currentLevel === 3 ? '#0066ff' : '#94a3b8'),
                        }}>
                          {isDelivery
                            ? (currentLevel > 3 ? '✓ Në Rrugë' : (currentLevel === 3 ? '● Në Rrugë' : '○ Në Rrugë'))
                            : (currentLevel > 3 ? '✓ Gati' : (currentLevel === 3 ? '● Gati' : '○ Gati'))
                          }
                        </div>
                      </div>

                      {/* Vija 3 -> 4 */}
                      <div style={{
                        flex: 1,
                        height: '2px',
                        backgroundColor: currentLevel >= 4 ? '#16a34a' : '#e2e8f0',
                        margin: '0 8px',
                        transition: 'background-color 0.3s ease',
                      }} />

                      {/* Hapi 4: E Dorëzuar / Përfunduar */}
                      <div style={{ textAlign: 'center', minWidth: '95px' }}>
                        <div style={{
                          fontWeight: currentLevel >= 4 ? 700 : 500,
                          fontSize: '12.5px',
                          color: currentLevel >= 4 ? '#16a34a' : '#94a3b8',
                        }}>
                          {isDelivery
                            ? (currentLevel >= 4 ? '✓ Dorëzuar' : '○ Dorëzim')
                            : (currentLevel >= 4 ? '✓ Përfunduar' : '○ Përfundim')
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pass-i Digjital & Kodi QR */}
                  {isDelivery && porosia.delivery && (
                    <div style={{
                      marginBottom: '20px',
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0066ff', textTransform: 'uppercase' }}>
                            Gjurmimi Live i Dërgesës
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#18181b', marginTop: '2px' }}>
                            {porosia.delivery.courier?.user
                              ? `Korrieri: ${porosia.delivery.courier.user.name} (${porosia.delivery.courier.vehicle_type})`
                              : 'Duke pritur caktimin e korrierit...'}
                          </div>
                        </div>
                        <span className="badge badge-primary">
                          {({
                            pending_assignment: 'Në Dispeçim',
                            assigned: 'Caktuar Korrieri',
                            accepted: 'Korrieri Pranoi',
                            heading_to_restaurant: 'Drejt Restorantit',
                            arrived_at_restaurant: 'Në Restorant',
                            picked_up: 'U Mor Porosia',
                            heading_to_customer: 'Në Rrugë drejt Jush',
                            arrived_at_customer: 'Korrieri Mbërriti!',
                            delivered: 'E Dorëzuar',
                            failed: 'Problem me Dërgesën',
                            cancelled: 'E Anuluar',
                          }[porosia.delivery.status] || porosia.delivery.status)}
                        </span>
                      </div>

                      {!['delivered', 'cancelled', 'failed'].includes(porosia.delivery.status) && (
                        <DeliveryMap
                          pickup={{
                            lat: porosia.delivery.pickup_latitude ?? porosia.branch?.latitude,
                            lng: porosia.delivery.pickup_longitude ?? porosia.branch?.longitude,
                            label: porosia.branch?.name || 'Restoranti',
                          }}
                          dropoff={{
                            lat: porosia.delivery.dropoff_latitude,
                            lng: porosia.delivery.dropoff_longitude,
                            label: 'Adresa Juaj',
                          }}
                          courier={{
                            lat: porosia.delivery.courier?.current_latitude,
                            lng: porosia.delivery.courier?.current_longitude,
                            label: porosia.delivery.courier?.user?.name || 'Korrieri',
                          }}
                          height={210}
                        />
                      )}
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '16px 20px',
                    border: isDelivery ? '1px solid #bfdbfe' : '1.5px dashed #0066ff',
                    borderRadius: '14px',
                    backgroundColor: isDelivery ? '#eff6ff' : '#f8faff',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: '8px',
                      borderRadius: '10px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}>
                      <QRCodeSVG value={qrPayload} size={98} />
                      <Link
                        to={`/orders/${porosia.id}/verify?token=${encodeURIComponent(porosia.pickup_token?.short_code || porosia.order_number)}`}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#0066ff',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        title="Hap faqen e verifikimit"
                      >
                        Verifiko <ExternalLink size={10} />
                      </Link>
                    </div>

                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: isDelivery ? '#1e40af' : '#0066ff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {isDelivery ? 'Pass Digjital & Dëshmi e Dërgesës' : 'Pass Digjital Zyrtar për Sportel'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px', color: '#0f172a' }}>
                        Kodi: <span style={{ color: '#0066ff' }}>{shortCode}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: 1.45, margin: '4px 0 0' }}>
                        {isDelivery
                          ? `Dëshmi digjitale e porosisë tuaj. Pagesa me para në dorëzim (€${parseFloat(porosia.total_price).toFixed(2)}).`
                          : 'Paraqisni këtë kod QR ose kodin e shkurtër në sportel gjatë marrjes së porosisë.'}
                      </p>
                    </div>
                  </div>

                  {/* Përmbledhja e Artikujve */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Artikujt e Porosisë:
                    </div>
                    {porosia.items?.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px' }}>
                        <span>{item.quantity}x {item.product_name_snapshot}</span>
                        <span style={{ fontWeight: 600 }}>€{parseFloat(item.line_total).toFixed(2)}</span>
                      </div>
                    ))}

                    {isDelivery && parseFloat(porosia.delivery_fee || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                        <span>Tarifa e dërgesës</span>
                        <span>€{parseFloat(porosia.delivery_fee).toFixed(2)}</span>
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '15px',
                      fontWeight: 800,
                      marginTop: '10px',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '10px',
                    }}>
                      <span>Shuma Totale {isDelivery ? '(Para në Dorëzim)' : '(Pagesë në Sportel)'}</span>
                      <span style={{ color: '#0066ff' }}>€{parseFloat(porosia.total_price).toFixed(2)}</span>
                    </div>

                    {/* Butoni i Anulimit vetëm për pending / confirmed */}
                    {['pending', 'confirmed'].includes(porosia.status) && (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setAnuloModal({ hapur: true, orderNumber: porosia.order_number, arsyeja: '' })}
                          className="btn"
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            padding: '6px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          Anulo Porosinë
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal për Anulimin e Porosisë */}
        {anuloModal.hapur && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(3px)'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#111827' }}>
                Anuloni Porosinë #{anuloModal.orderNumber}?
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '16px' }}>
                Jeni të sigurt që dëshironi të anuloni këtë porosi? Porosia mund të anulohet vetëm para se kuzhina të nisë përgatitjen.
              </p>
              <form onSubmit={handleAnuloPorosine}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }}>
                    Arsyeja e anulimit (opsionale):
                  </label>
                  <textarea
                    value={anuloModal.arsyeja}
                    onChange={(e) => setAnuloModal({ ...anuloModal, arsyeja: e.target.value })}
                    placeholder="Shkruani arsyen e anulimit..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAnuloModal({ hapur: false, orderNumber: null, arsyeja: '' })}
                    className="btn btn-secondary"
                    style={{ fontSize: '13.5px', borderRadius: '8px' }}
                  >
                    Mbyll
                  </button>
                  <button
                    type="submit"
                    disabled={dukeAnuluar}
                    className="btn"
                    style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px' }}
                  >
                    {dukeAnuluar ? 'Duke anuluar...' : 'Konfirmo Anulimin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
