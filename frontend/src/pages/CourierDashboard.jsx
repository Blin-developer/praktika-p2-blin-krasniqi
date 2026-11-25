import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Truck,
  MapPin,
  Store,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Navigation,
  RefreshCw,
  Power,
  Camera,
  History,
  Star,
  DollarSign,
  Package,
  ShieldAlert,
  ChevronRight,
  LocateFixed
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import DeliveryMap from '../components/DeliveryMap';
import './CourierDashboard.css';

const LIFECYCLE_STEPS = [
  { key: 'accepted', label: 'Pranuar' },
  { key: 'heading_to_restaurant', label: 'Drejt Restorantit' },
  { key: 'arrived_at_restaurant', label: 'Në Restorant' },
  { key: 'picked_up', label: 'Marrë' },
  { key: 'heading_to_customer', label: 'Drejt Klientit' },
  { key: 'arrived_at_customer', label: 'Te Klienti' },
];

const NEXT_ACTION_MAP = {
  accepted: { status: 'heading_to_restaurant', label: 'Nisu drejt Restorantit', style: 'primary' },
  heading_to_restaurant: { status: 'arrived_at_restaurant', label: 'Mbërrita në Restorant', style: 'primary' },
  arrived_at_restaurant: { status: 'picked_up', label: 'Konfirmo Marrjen e Porosisë', style: 'primary' },
  picked_up: { status: 'heading_to_customer', label: 'Nisu drejt Klientit', style: 'primary' },
  heading_to_customer: { status: 'arrived_at_customer', label: 'Mbërrita te Klienti', style: 'primary' },
  arrived_at_customer: { status: 'delivered', label: 'Konfirmo Dorëzimin', style: 'success' },
};

export default function CourierDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [busyActionId, setBusyActionId] = useState(null);

  // GPS State (Vetëm vendndodhje reale e shfletuesit me leje eksplicite)
  // 'idle' | 'requesting' | 'watching' | 'denied' | 'unavailable' | 'timeout' | 'insecure'
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState(null);
  const watchIdRef = useRef(null);
  const lastChecksumRef = useRef(null);

  // Modals: Completion Proof & Incident/Failure & Reject
  const [proofModal, setProofModal] = useState({ open: false, deliveryId: null, recipientName: '', notes: '', photoFile: null });
  const [failModal, setFailModal] = useState({ open: false, deliveryId: null, incidentType: 'customer_unavailable', reason: '', notes: '' });
  const [rejectModal, setRejectModal] = useState({ open: false, deliveryId: null, reason: '' });

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await api.get('/courier/dashboard');
      setData(res.data?.data || null);
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || 'Nuk u arrit të ngarkohet paneli i korrierit.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Sinkronizim në kohë reale çdo 3.5s
  useEffect(() => {
    loadDashboard();
    const syncTimer = setInterval(async () => {
      try {
        const res = await api.get('/courier/sync');
        const cs = res.data?.data?.checksum;
        if (cs && lastChecksumRef.current && cs !== lastChecksumRef.current) {
          loadDashboard(true);
        }
        if (cs) lastChecksumRef.current = cs;
      } catch {
        // Hesht në gabime të shkurtra rrjeti
      }
    }, 3500);

    return () => clearInterval(syncTimer);
  }, [loadDashboard]);

  // Menaxhimi i GPS Tracking: Ndizet kur ka dërgesë aktive dhe fiket automatikisht kur përfundohen
  const hasActiveDeliveries = (data?.active_deliveries?.length || 0) > 0;

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsStatus !== 'idle') {
      setGpsStatus('idle');
      setGpsErrorMsg(null);
    }
  }, [gpsStatus]);

  const startGpsTracking = useCallback(() => {
    // Kontroll i kontekstit të sigurt (HTTPS ose localhost)
    if (!window.isSecureContext) {
      setGpsStatus('insecure');
      setGpsErrorMsg(
        'GPS nuk funksionon mbi HTTP. Hapni aplikacionin nga localhost ose aktivizoni HTTPS. ' +
        'Adresat LAN (192.168.x.x) kërkojnë HTTPS për qasje në GPS.'
      );
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      setGpsErrorMsg('GPS nuk është i disponueshëm në këtë shfletues ose pajisje.');
      return;
    }

    if (watchIdRef.current !== null) return;

    // Vendosim statusin në 'requesting' derisa të marrim leje/konfirmim nga shfletuesi
    setGpsStatus('requesting');
    setGpsErrorMsg(null);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_meters: position.coords.accuracy,
        };
        setGpsCoords(coords);
        // Vendosim 'watching' vetëm pasi kemi koordinata reale
        setGpsStatus('watching');
        setGpsErrorMsg(null);
        try {
          await api.post('/courier/location', coords);
        } catch {
          // Vazhdo gjurmimin lokalisht — dërgesa tjetër do ta sinkronizojë
        }
      },
      (err) => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsStatus('denied');
            setGpsErrorMsg(
              'Leja e vendndodhjes GPS u refuzua në shfletues. ' +
              'Hapni cilësimet e shfletuesit, gjeni TASTIO dhe lejoni qasjen në vendndodhje.'
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsStatus('unavailable');
            setGpsErrorMsg(
              'Vendndodhja GPS nuk është e disponueshme. ' +
              'Sigurohuni që pajisja ka GPS aktiv dhe ka lidhje rrjeti.'
            );
            break;
          case err.TIMEOUT:
            setGpsStatus('timeout');
            setGpsErrorMsg(
              'Kërkesa GPS skadoi. ' +
              'Provoni sërish ose lëvizni në një vend me sinjal GPS më të mirë.'
            );
            break;
          default:
            setGpsStatus('unavailable');
            setGpsErrorMsg(`GPS dështoi me kod gabimi ${err.code}: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    watchIdRef.current = watchId;
  }, []);

  useEffect(() => {
    if (!hasActiveDeliveries && watchIdRef.current !== null) {
      stopGpsTracking();
    }
  }, [hasActiveDeliveries, stopGpsTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleToggleAvailability = async () => {
    if (!data?.courier) return;
    const nextStatus = data.courier.availability_status === 'offline' ? 'available' : 'offline';
    try {
      setBusyActionId('availability');
      await api.patch('/courier/availability', { availability_status: nextStatus });
      await loadDashboard(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Nuk mund të ndryshohej disponueshmëria.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleAccept = async (deliveryId) => {
    try {
      setBusyActionId(deliveryId);
      await api.post(`/courier/deliveries/${deliveryId}/accept`);
      await loadDashboard(true);
      // Sugjerojmë fillimin e GPS nëse shfletuesi e lejon
      if ('geolocation' in navigator && gpsStatus === 'idle') {
        startGpsTracking();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi pranimi i dërgesës.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModal.deliveryId) return;
    try {
      setBusyActionId(rejectModal.deliveryId);
      await api.post(`/courier/deliveries/${rejectModal.deliveryId}/reject`, {
        reason: rejectModal.reason.trim() || 'Refuzuar nga korrieri.',
      });
      setRejectModal({ open: false, deliveryId: null, reason: '' });
      await loadDashboard(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi refuzimi i dërgesës.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleNextStep = async (delivery) => {
    const next = NEXT_ACTION_MAP[delivery.status];
    if (!next) return;

    if (next.status === 'delivered') {
      setProofModal({
        open: true,
        deliveryId: delivery.id,
        recipientName: delivery.order?.customer_name || '',
        notes: '',
        photoFile: null,
      });
      return;
    }

    try {
      setBusyActionId(delivery.id);
      await api.patch(`/courier/deliveries/${delivery.id}/status`, { status: next.status });
      await loadDashboard(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi përditësimi i statusit.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofModal.deliveryId) return;
    try {
      setBusyActionId(proofModal.deliveryId);
      const formData = new FormData();
      formData.append('status', 'delivered');
      if (proofModal.recipientName.trim()) {
        formData.append('proof_recipient_name', proofModal.recipientName.trim());
      }
      if (proofModal.notes.trim()) {
        formData.append('delivery_notes', proofModal.notes.trim());
      }
      if (proofModal.photoFile) {
        formData.append('proof_photo', proofModal.photoFile);
      }

      await api.post(`/courier/deliveries/${proofModal.deliveryId}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProofModal({ open: false, deliveryId: null, recipientName: '', notes: '', photoFile: null });
      await loadDashboard(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi konfirmimi i dorëzimit.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleSubmitFailure = async (e) => {
    e.preventDefault();
    if (!failModal.deliveryId || !failModal.reason.trim()) return;
    try {
      setBusyActionId(failModal.deliveryId);
      await api.patch(`/courier/deliveries/${failModal.deliveryId}/status`, {
        status: 'failed',
        incident_type: failModal.incidentType,
        failure_reason: failModal.reason.trim(),
        delivery_notes: failModal.notes.trim() || null,
      });
      setFailModal({ open: false, deliveryId: null, incidentType: 'customer_unavailable', reason: '', notes: '' });
      await loadDashboard(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi raportimi i incidentit.');
    } finally {
      setBusyActionId(null);
    }
  };

  const courier = data?.courier;
  const stats = data?.stats || {};
  const pendingRequests = data?.pending_requests || [];
  const activeDeliveries = data?.active_deliveries || [];
  const recentHistory = data?.recent_history || [];

  const availabilityLabel = (st) => {
    if (st === 'available') return 'Online • I Lirë';
    if (st === 'busy') return 'Online • Në Dërgesë';
    return 'Offline';
  };

  return (
    <DashboardLayout activeTab="courier">
      <div className="tastio-courier-page">
        {/* Hero Header */}
        <div className="tastio-courier-hero">
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Tastio Courier App • Live Dispatch
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
              Mirësevini, {user?.name || 'Korrier'}
            </h1>
            <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px' }}>
              Automjeti: <strong style={{ color: '#fff' }}>{courier?.vehicle_type || 'Skuter'}</strong>
              {courier?.license_plate ? ` (${courier.license_plate})` : ''}
              {courier?.branch?.name ? ` • Dega: ${courier.branch.name}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busyActionId === 'availability' || courier?.availability_status === 'busy'}
              onClick={handleToggleAvailability}
              className={`tastio-courier-status-pill ${courier?.availability_status || 'offline'}`}
              title={courier?.availability_status === 'busy' ? 'Përfundoni dërgesën aktive përpara se të dilni Offline' : 'Kliko për të ndryshuar statusin'}
            >
              <Power size={15} />
              <span>{availabilityLabel(courier?.availability_status)}</span>
            </button>

            <button
              type="button"
              onClick={() => loadDashboard()}
              className="btn btn-secondary"
              style={{ borderRadius: '9999px', padding: '8px 14px', fontSize: '13px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Rifresko</span>
            </button>
          </div>
        </div>

        {/* Statistikat Ditore & Performanca */}
        <div className="tastio-courier-stats-grid">
          <div className="tastio-courier-stat-card">
            <span className="tastio-courier-stat-label">Dorëzuar Sot</span>
            <span className="tastio-courier-stat-value" style={{ color: '#0066ff' }}>
              {stats.today_completed ?? 0}
            </span>
          </div>
          <div className="tastio-courier-stat-card">
            <span className="tastio-courier-stat-label">Fitimet Sot</span>
            <span className="tastio-courier-stat-value" style={{ color: '#10b981' }}>
              €{Number(stats.today_earnings || 0).toFixed(2)}
            </span>
          </div>
          <div className="tastio-courier-stat-card">
            <span className="tastio-courier-stat-label">Gjithsej Dërgesa</span>
            <span className="tastio-courier-stat-value">
              {stats.successful_deliveries ?? 0}
            </span>
          </div>
          <div className="tastio-courier-stat-card">
            <span className="tastio-courier-stat-label">Vlerësimi</span>
            <span className="tastio-courier-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
              {Number(stats.rating_avg || 5).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Shiriti i GPS Tracking me Leje Eksplicite */}
        <div className="tastio-courier-gps-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LocateFixed size={18} color={
              gpsStatus === 'watching' ? '#10b981' :
              (gpsStatus === 'denied' || gpsStatus === 'insecure') ? '#ef4444' :
              gpsStatus === 'requesting' ? '#f59e0b' : '#64748b'
            } />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#18181b' }}>
                {gpsStatus === 'watching' && 'Gjurmimi GPS Live është aktiv'}
                {gpsStatus === 'requesting' && 'Duke kërkuar leje GPS...'}
                {gpsStatus === 'idle' && 'Gjurmimi GPS është në pritje'}
                {gpsStatus === 'denied' && 'Leja e vendndodhjes GPS u refuzua'}
                {gpsStatus === 'unavailable' && 'GPS nuk është i disponueshëm në këtë pajisje'}
                {gpsStatus === 'timeout' && 'Kërkesa GPS skadoi'}
                {gpsStatus === 'insecure' && 'GPS kërkon HTTPS ose localhost'}
              </div>
              <div style={{ fontSize: '12px', color: gpsErrorMsg ? '#dc2626' : '#64748b' }}>
                {gpsErrorMsg
                  ? gpsErrorMsg
                  : gpsCoords
                    ? `Koordinatat reale: ${gpsCoords.latitude.toFixed(5)}, ${gpsCoords.longitude.toFixed(5)}`
                    : 'Ndani vendndodhjen vetëm gjatë dërgesave aktive; ndalet automatikisht pas dorëzimit.'}
              </div>
            </div>
          </div>

          {gpsStatus !== 'watching' ? (
            <button
              type="button"
              onClick={startGpsTracking}
              disabled={gpsStatus === 'requesting'}
              className="btn btn-primary"
              style={{ borderRadius: '10px', fontSize: '12.5px', padding: '7px 14px', opacity: gpsStatus === 'requesting' ? 0.7 : 1 }}
            >
              <Navigation size={14} />
              <span>{gpsStatus === 'requesting' ? 'Duke kërkuar...' : 'Aktivizo GPS'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopGpsTracking}
              className="btn btn-secondary"
              style={{ borderRadius: '10px', fontSize: '12.5px', padding: '7px 14px' }}
            >
              <span>Ndalo GPS</span>
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Kërkesat e Reja për Pranim */}
        {pendingRequests.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0066ff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} />
              Kërkesa të Reja për Dërgesë ({pendingRequests.length})
            </h2>
            {pendingRequests.map((req) => (
              <div key={req.id} className="tastio-courier-request-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#18181b' }}>
                      #{req.order?.order_number}
                    </span>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                      Restoranti: <strong style={{ color: '#18181b' }}>{req.branch?.name}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>
                      +€{Number(req.delivery_fee || 1.5).toFixed(2)}
                    </span>
                    {req.assignment_expires_at && (
                      <div style={{ fontSize: '11.5px', color: '#d97706', fontWeight: 700 }}>
                        Skadon më {new Date(req.assignment_expires_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '13.5px', color: '#334155', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><Store size={14} style={{ display: 'inline', marginRight: '6px' }} /> <strong>Marrja:</strong> {req.pickup_address || req.branch?.address}</div>
                  <div><MapPin size={14} style={{ display: 'inline', marginRight: '6px', color: '#10b981' }} /> <strong>Dorëzimi:</strong> {req.dropoff_address}</div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={busyActionId === req.id}
                    onClick={() => handleAccept(req.id)}
                    className="tastio-courier-touch-btn success"
                    style={{ flex: 2 }}
                  >
                    <CheckCircle2 size={18} />
                    <span>Prano Dërgesën</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyActionId === req.id}
                    onClick={() => setRejectModal({ open: true, deliveryId: req.id, reason: '' })}
                    className="tastio-courier-touch-btn danger-outline"
                    style={{ flex: 1 }}
                  >
                    <XCircle size={18} />
                    <span>Refuzo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Switcher: Aktive vs Historiku */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '10px', fontSize: '13.5px' }}
          >
            <Truck size={15} />
            <span>Dërgesat Aktive ({activeDeliveries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '10px', fontSize: '13.5px' }}
          >
            <History size={15} />
            <span>Historiku ({recentHistory.length})</span>
          </button>
        </div>

        {/* Lista e Dërgesave Aktive */}
        {activeTab === 'active' && (
          activeDeliveries.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
              <Truck size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#18181b' }}>
                Nuk keni asnjë dërgesë aktive aktualisht
              </div>
              <p style={{ fontSize: '13.5px', maxWidth: '380px', margin: '6px auto 0' }}>
                Sigurohuni që statusi juaj të jetë Online për të marrë automatikisht kërkesat e reja të dërgesës.
              </p>
            </div>
          ) : (
            activeDeliveries.map((delivery) => {
              const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === delivery.status);
              const nextAction = NEXT_ACTION_MAP[delivery.status];

              return (
                <div key={delivery.id} className="tastio-courier-active-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#18181b' }}>
                          #{delivery.order?.order_number}
                        </span>
                        {delivery.priority === 'urgent' && (
                          <span className="badge badge-danger">URGJENTE</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                        Pagesa: <strong>{delivery.order?.payment_method === 'cash_on_delivery' ? `Para në dorë (€${Number(delivery.order?.total_price || 0).toFixed(2)})` : 'E Paguar Online'}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-primary" style={{ fontSize: '12px' }}>
                        {LIFECYCLE_STEPS[currentStepIdx]?.label || delivery.status}
                      </span>
                      {delivery.eta_minutes !== null && delivery.eta_minutes !== undefined && (
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0066ff', marginTop: '4px' }}>
                          ETA ~{delivery.eta_minutes} min
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="tastio-courier-stepper">
                    {LIFECYCLE_STEPS.map((st, idx) => (
                      <div
                        key={st.key}
                        className={`tastio-courier-step ${idx < currentStepIdx ? 'done' : (idx === currentStepIdx ? 'current' : '')}`}
                      >
                        <span>{idx + 1}. {st.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Adresat dhe Kontaktet */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        1. Marrja (Restoranti)
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#18181b', marginTop: '3px' }}>
                        {delivery.branch?.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                        {delivery.pickup_address || delivery.branch?.address}
                      </div>
                      {delivery.branch?.phone && (
                        <a href={`tel:${delivery.branch.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12.5px', fontWeight: 700, color: '#0066ff', textDecoration: 'none' }}>
                          <Phone size={12} /> {delivery.branch.phone}
                        </a>
                      )}
                    </div>

                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                        2. Dorëzimi (Klienti)
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#18181b', marginTop: '3px' }}>
                        {delivery.order?.customer_name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                        {delivery.dropoff_address}
                      </div>
                      {delivery.order?.customer_phone && (
                        <a href={`tel:${delivery.order.customer_phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12.5px', fontWeight: 700, color: '#15803d', textDecoration: 'none' }}>
                          <Phone size={12} /> {delivery.order.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {delivery.delivery_instructions && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', fontSize: '13px', marginBottom: '16px' }}>
                      <strong>Udhëzime:</strong> {delivery.delivery_instructions}
                    </div>
                  )}

                  {/* Harta Interaktive */}
                  <div style={{ marginBottom: '16px' }}>
                    <DeliveryMap
                      pickup={{
                        lat: delivery.pickup_latitude ?? delivery.branch?.latitude,
                        lng: delivery.pickup_longitude ?? delivery.branch?.longitude,
                        label: delivery.branch?.name || 'Restoranti',
                      }}
                      dropoff={{
                        lat: delivery.dropoff_latitude,
                        lng: delivery.dropoff_longitude,
                        label: delivery.order?.customer_name || 'Klienti',
                      }}
                      courier={{
                        lat: gpsCoords?.latitude ?? courier?.current_latitude,
                        lng: gpsCoords?.longitude ?? courier?.current_longitude,
                        label: 'Ju (Korrieri)',
                      }}
                      etaMinutes={delivery.eta_minutes}
                      height={240}
                    />
                  </div>

                  {/* Butonat Kryesorë të Veprimit */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {nextAction && (
                      <button
                        type="button"
                        disabled={busyActionId === delivery.id}
                        onClick={() => handleNextStep(delivery)}
                        className={`tastio-courier-touch-btn ${nextAction.style}`}
                        style={{ flex: 3, minWidth: '220px' }}
                      >
                        <ChevronRight size={18} />
                        <span>{nextAction.label}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busyActionId === delivery.id}
                      onClick={() => setFailModal({ open: true, deliveryId: delivery.id, incidentType: 'customer_unavailable', reason: '', notes: '' })}
                      className="tastio-courier-touch-btn danger-outline"
                      style={{ flex: 1, minWidth: '140px' }}
                    >
                      <ShieldAlert size={17} />
                      <span>Raporto Problem</span>
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* Historiku i Dërgesave */}
        {activeTab === 'history' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
            {recentHistory.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                Nuk keni ende histori të dërgesave të përfunduara.
              </div>
            ) : (
              recentHistory.map((h) => (
                <div key={h.id} style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#18181b' }}>
                      #{h.order?.order_number} • {h.branch?.name}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                      {h.dropoff_address}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${h.status === 'delivered' ? 'badge-success' : 'badge-danger'}`}>
                      {h.status === 'delivered' ? 'Dorëzuar' : (h.status === 'failed' ? 'Dështuar' : 'Anuluar')}
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#18181b', marginTop: '4px' }}>
                      €{Number(h.delivery_fee || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal: Konfirmimi i Dorëzimit (Proof) */}
        {proofModal.open && (
          <div className="kds-drawer-backdrop" onClick={() => setProofModal({ open: false, deliveryId: null, recipientName: '', notes: '', photoFile: null })}>
            <div style={{ margin: 'auto', width: '92%', maxWidth: '460px', background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>Konfirmo Dorëzimin</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                Plotësoni detajet e dorëzimit dhe opsionalisht ngarkoni një foto dëshmie.
              </p>
              <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Emri i Marrësit</label>
                  <input
                    type="text"
                    className="form-control"
                    value={proofModal.recipientName}
                    onChange={(e) => setProofModal((p) => ({ ...p, recipientName: e.target.value }))}
                    placeholder="Emri i personit që mori porosinë"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Foto Dëshmie (Opsionale)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={(e) => setProofModal((p) => ({ ...p, photoFile: e.target.files?.[0] || null }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Shënime (Opsionale)</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    value={proofModal.notes}
                    onChange={(e) => setProofModal((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="P.sh. E dorëzuar te recepsioni"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setProofModal({ open: false, deliveryId: null, recipientName: '', notes: '', photoFile: null })}>
                    Anulo
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#10b981', borderColor: '#10b981' }} disabled={busyActionId !== null}>
                    ✓ Përfundo Dorëzimin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Raporto Dështim / Incident */}
        {failModal.open && (
          <div className="kds-drawer-backdrop" onClick={() => setFailModal({ open: false, deliveryId: null, incidentType: 'customer_unavailable', reason: '', notes: '' })}>
            <div style={{ margin: 'auto', width: '92%', maxWidth: '460px', background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>Raporto Problem / Dështim</h3>
              <form onSubmit={handleSubmitFailure} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Lloji i Incidentit</label>
                  <select
                    className="form-control"
                    value={failModal.incidentType}
                    onChange={(e) => setFailModal((p) => ({ ...p, incidentType: e.target.value }))}
                  >
                    <option value="customer_unavailable">Klienti nuk u përgjigj / Mungon</option>
                    <option value="wrong_address">Adresë e pasaktë / E pagjetshme</option>
                    <option value="vehicle_issue">Problem me automjetin</option>
                    <option value="order_damaged">Porosia u dëmtua</option>
                    <option value="other">Arsye tjetër</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Arsyeja e hollësishme *</label>
                  <textarea
                    rows={3}
                    required
                    className="form-control"
                    value={failModal.reason}
                    onChange={(e) => setFailModal((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="Shkruani arsyen pse dërgesa nuk mundi të përfundohej..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setFailModal({ open: false, deliveryId: null, incidentType: 'customer_unavailable', reason: '', notes: '' })}>
                    Anulo
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#dc2626', borderColor: '#dc2626' }} disabled={busyActionId !== null}>
                    Konfirmo Dështimin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Refuzimi i Kërkesës */}
        {rejectModal.open && (
          <div className="kds-drawer-backdrop" onClick={() => setRejectModal({ open: false, deliveryId: null, reason: '' })}>
            <div style={{ margin: 'auto', width: '92%', maxWidth: '420px', background: '#fff', borderRadius: '18px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 800 }}>Refuzo Kërkesën</h3>
              <form onSubmit={handleRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  className="form-control"
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Arsyeja e refuzimit (opsionale)"
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRejectModal({ open: false, deliveryId: null, reason: '' })}>
                    Mbyll
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#dc2626', borderColor: '#dc2626' }}>
                    Refuzo
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
