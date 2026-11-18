import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Save,
  PauseCircle,
  PlayCircle,
  Flame,
  Package,
  Search,
  Filter,
  RefreshCw,
  Store,
  ChevronDown,
  Info,
  ShieldCheck,
  Truck,
  ShoppingBag
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function RestaurantOperations({ branchId: propBranchId }) {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState(propBranchId || 1);
  const [operationsData, setOperationsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule'); // schedule, special_hours, products, prep_time
  const [notification, setNotification] = useState(null);

  // Weekly Schedule State
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Temporary Closure / Pause Modal
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('Pauzë e përkohshme operative nga menaxheri');
  const [pauseDuration, setPauseDuration] = useState('30'); // minutes or 'manual'
  const [pausingLoading, setPausingLoading] = useState(false);

  // Special Hours State
  const [specialHours, setSpecialHours] = useState([]);
  const [newSpecialHour, setNewSpecialHour] = useState({
    date: '',
    is_closed: true,
    open_time: '10:00',
    close_time: '18:00',
    reason_or_occasion: '',
  });
  const [savingSpecialHour, setSavingSpecialHour] = useState(false);

  // Products & Stock State
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all'); // all, out_of_stock, unavailable, tracked
  const [updatingProductId, setUpdatingProductId] = useState(null);

  // Prep Time & Settings State
  const [prepTimeSettings, setPrepTimeSettings] = useState({
    default_prep_time_minutes: 20,
    current_prep_time_minutes: 20,
    busy_mode: false,
    accepts_delivery: true,
    accepts_pickup: true,
  });
  const [savingPrepSettings, setSavingPrepSettings] = useState(false);

  const shfaqNjoftim = (mesazh, tipi = 'success') => {
    setNotification({ mesazh, tipi });
    setTimeout(() => setNotification(null), 4000);
  };

  const ngarkoTeDhenat = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/operations/branches/${selectedBranchId}`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setOperationsData(d);
        setWeeklySchedule(d.weekly_schedule || []);
        setSpecialHours(d.special_hours || []);
        setPrepTimeSettings({
          default_prep_time_minutes: d.branch.default_prep_time_minutes || 20,
          current_prep_time_minutes: d.branch.current_prep_time_minutes || d.branch.default_prep_time_minutes || 20,
          busy_mode: Boolean(d.branch.busy_mode),
          accepts_delivery: Boolean(d.branch.accepts_delivery),
          accepts_pickup: Boolean(d.branch.accepts_pickup),
        });
      }
    } catch (err) {
      console.error('Dështoi ngarkimi i operacioneve të degës', err);
      shfaqNjoftim(err.response?.data?.message || 'Dështoi ngarkimi i të dhënave operative.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const ngarkoProduktet = async () => {
    try {
      setProductsLoading(true);
      const params = {};
      if (productSearch.trim()) params.search = productSearch.trim();
      if (productFilter !== 'all') params.filter = productFilter;

      const res = await api.get(`/operations/branches/${selectedBranchId}/products`, { params });
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error('Dështoi ngarkimi i produkteve', err);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    ngarkoTeDhenat();
  }, [selectedBranchId]);

  useEffect(() => {
    if (activeTab === 'products') {
      ngarkoProduktet();
    }
  }, [activeTab, productSearch, productFilter, selectedBranchId]);

  // ——— Menaxhimi i Orarit Javor ———
  const handleToggleDayClosed = (dayOfWeek) => {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.day_of_week === dayOfWeek) {
          const willBeClosed = !day.is_closed;
          return {
            ...day,
            is_closed: willBeClosed,
            intervals: willBeClosed
              ? []
              : (day.intervals?.length > 0
                ? day.intervals
                : [{ open_time: '08:00', close_time: '22:00', label: 'Orar i plotë', is_overnight: false }]),
          };
        }
        return day;
      })
    );
  };

  const handleShtoInterval = (dayOfWeek) => {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.day_of_week === dayOfWeek) {
          const currentIntervals = day.intervals || [];
          return {
            ...day,
            is_closed: false,
            intervals: [
              ...currentIntervals,
              { open_time: '18:00', close_time: '23:00', label: 'Shifti 2', is_overnight: false }
            ]
          };
        }
        return day;
      })
    );
  };

  const handleFshiInterval = (dayOfWeek, index) => {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.day_of_week === dayOfWeek) {
          const filtered = day.intervals.filter((_, i) => i !== index);
          return {
            ...day,
            intervals: filtered,
            is_closed: filtered.length === 0,
          };
        }
        return day;
      })
    );
  };

  const handleNdryshoInterval = (dayOfWeek, index, field, value) => {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.day_of_week === dayOfWeek) {
          const updated = [...day.intervals];
          updated[index] = { ...updated[index], [field]: value };
          return { ...day, intervals: updated };
        }
        return day;
      })
    );
  };

  const handleRuajOrarinJavor = async () => {
    try {
      setSavingSchedule(true);
      const res = await api.put(`/operations/branches/${selectedBranchId}/opening-hours`, {
        schedule: weeklySchedule.map((d) => ({
          day_of_week: d.day_of_week,
          is_closed: d.is_closed,
          intervals: d.intervals || [],
        }))
      });
      shfaqNjoftim('Orari javor u ruajt me sukses!');
      if (res.data?.availability && operationsData) {
        setOperationsData((prev) => ({ ...prev, availability: res.data.availability }));
      }
    } catch (err) {
      shfaqNjoftim(err.response?.data?.message || 'Dështoi ruajtja e orarit.', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  // ——— Pauzimi i Përkohshëm / Rihapja ———
  const handlePauzoDegen = async () => {
    try {
      setPausingLoading(true);
      const payload = {
        action: 'pause',
        reason: pauseReason.trim(),
        duration_minutes: pauseDuration === 'manual' ? null : parseInt(pauseDuration, 10),
      };
      const res = await api.post(`/operations/branches/${selectedBranchId}/temporary-closure`, payload);
      shfaqNjoftim('Dega u vendos në pauzë të përkohshme.');
      setShowPauseModal(false);
      ngarkoTeDhenat();
    } catch (err) {
      shfaqNjoftim(err.response?.data?.message || 'Dështoi pauzimi i degës.', 'error');
    } finally {
      setPausingLoading(false);
    }
  };

  const handleRihapDegen = async () => {
    try {
      setPausingLoading(true);
      await api.post(`/operations/branches/${selectedBranchId}/temporary-closure`, {
        action: 'reopen',
      });
      shfaqNjoftim('Dega u rihap me sukses për porosi!');
      ngarkoTeDhenat();
    } catch (err) {
      shfaqNjoftim(err.response?.data?.message || 'Dështoi rihapja e degës.', 'error');
    } finally {
      setPausingLoading(false);
    }
  };

  // ——— Ditët Speciale & Festat ———
  const handleShtoSpecialHour = async (e) => {
    e.preventDefault();
    if (!newSpecialHour.date) {
      shfaqNjoftim('Ju lutem zgjidhni një datë.', 'error');
      return;
    }

    try {
      setSavingSpecialHour(true);
      await api.post(`/operations/branches/${selectedBranchId}/special-hours`, newSpecialHour);
      shfaqNjoftim('Orari festiv u ruajt me sukses.');
      setNewSpecialHour({
        date: '',
        is_closed: true,
        open_time: '10:00',
        close_time: '18:00',
        reason_or_occasion: '',
      });
      ngarkoTeDhenat();
    } catch (err) {
      shfaqNjoftim(err.response?.data?.message || 'Dështoi ruajtja e orarit festiv.', 'error');
    } finally {
      setSavingSpecialHour(false);
    }
  };

  const handleFshiSpecialHour = async (id) => {
    if (!window.confirm('A jeni të sigurt që dëshironi ta fshini këtë orar special?')) return;
    try {
      await api.delete(`/operations/branches/${selectedBranchId}/special-hours/${id}`);
      shfaqNjoftim('Orari special u fshi.');
      ngarkoTeDhenat();
    } catch (err) {
      shfaqNjoftim('Dështoi fshirja e orarit special.', 'error');
    }
  };

  // ——— Përditësimi i Disponueshmërisë së Produktit & Stokut ———
  const handleNdryshoProduktin = async (productId, updates) => {
    try {
      setUpdatingProductId(productId);
      const res = await api.patch(`/operations/products/${productId}/availability`, updates);
      if (res.data?.success && res.data?.data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? res.data.data : p))
        );
        shfaqNjoftim(`Produkti '${res.data.data.name}' u përditësua.`);
      }
    } catch (err) {
      shfaqNjoftim(err.response?.data?.message || 'Dështoi përditësimi i produktit.', 'error');
    } finally {
      setUpdatingProductId(null);
    }
  };

  // ——— Ruajtja e Cilësimeve të Kohës së Përgatitjes ———
  const handleRuajPrepSettings = async () => {
    try {
      setSavingPrepSettings(true);
      await api.post(`/operations/branches/${selectedBranchId}/prep-time`, prepTimeSettings);
      shfaqNjoftim('Cilësimet e përgatitjes u ruajtën me sukses.');
      ngarkoTeDhenat();
    } catch (err) {
      shfaqNjoftim(err.response?.data?.message || 'Dështoi ruajtja e cilësimeve.', 'error');
    } finally {
      setSavingPrepSettings(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
        <RefreshCw className="spin" size={32} style={{ margin: '0 auto 12px auto' }} />
        <div>Duke ngarkuar të dhënat e operacioneve të restorantit...</div>
      </div>
    );
  }

  const branch = operationsData?.branch;
  const availability = operationsData?.availability;

  const merrBadgeStatusi = () => {
    if (!availability) return null;
    switch (availability.status) {
      case 'open':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            Hapur • Po pranon porosi
          </span>
        );
      case 'temporarily_closed':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}>
            <PauseCircle size={14} />
            Përkohësisht i Mbyllur
          </span>
        );
      case 'scheduled_opening':
        return (
          <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}>
            <Clock size={14} />
            Hapet së Shpejti
          </span>
        );
      default:
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}>
            <XCircle size={14} />
            Mbyllur
          </span>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Njoftimi Fluturues */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '10px',
          backgroundColor: notification.tipi === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification.tipi === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.mesazh}</span>
        </div>
      )}

      {/* Titulli dhe Zgjedhësi i Degës */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Store size={16} /> Paneli i Operacioneve & Disponueshmërisë
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
            {branch?.name || 'Menaxhimi i Degës'}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {branch?.restaurant?.name} • {branch?.address}, {branch?.city}
          </div>
        </div>

        {/* Zgjedhësi i Degëve nëse përdoruesi ka qasje në shumë degë */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(parseInt(e.target.value, 10))}
            className="input"
            style={{ width: '220px', fontSize: '13px', fontWeight: 600 }}
          >
            <option value={1}>Tartine Qendër (ID: 1)</option>
            <option value={2}>Babalup Dardani (ID: 2)</option>
            <option value={3}>Proper Pizza Qendër (ID: 3)</option>
            <option value={5}>Smash Burger Bar (ID: 5)</option>
          </select>

          <button onClick={ngarkoTeDhenat} className="btn btn-outline" title="Rifresko të dhënat" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Kartela Kryesore e Statusit Operativ në Kohë Reale */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px', borderLeft: `6px solid ${availability?.is_open ? '#10b981' : (availability?.is_temporarily_closed ? '#f59e0b' : '#ef4444')}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Statusi Operativ:</h2>
              {merrBadgeStatusi()}
            </div>

            <div style={{ fontSize: '14px', color: '#4b5563', maxWidth: '650px', lineHeight: 1.5 }}>
              {availability?.is_temporarily_closed ? (
                <div>
                  <strong>Arsyeja e pauzimit:</strong> {availability.pause_reason}
                  {availability.next_opening && (
                    <div style={{ color: 'var(--color-primary)', fontWeight: 600, marginTop: '4px' }}>
                      ⏱️ {availability.next_opening.label}
                    </div>
                  )}
                </div>
              ) : availability?.is_special_day ? (
                <div>
                  <strong>Festë / Orar i Veçantë:</strong> {availability.special_day_reason}
                  <div style={{ marginTop: '4px' }}>{availability.rejection_reason || 'Orari i përshtatur aplikohet automatikisht sot.'}</div>
                </div>
              ) : (
                <div>
                  {availability?.is_open ? (
                    <span>Restoranti po pranon dhe po përpunon porosi rregullisht.</span>
                  ) : (
                    <span>{availability?.rejection_reason || 'Restoranti është i mbyllur sipas orarit javor.'}</span>
                  )}
                </div>
              )}
            </div>

            {/* Treguesit e Shërbimit */}
            <div style={{ display: 'flex', gap: '18px', marginTop: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="var(--color-primary)" />
                <span>Përgatitja: <strong>~{branch?.effective_prep_time || 20} min</strong></span>
                {branch?.busy_mode && (
                  <span className="badge badge-warning" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                    Pik i Lartë (+15 min)
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={16} color={branch?.accepts_delivery ? '#10b981' : '#9ca3af'} />
                <span>Dërgesë: <strong>{branch?.accepts_delivery ? 'E Aktivizuar' : 'E Fikur'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingBag size={16} color={branch?.accepts_pickup ? '#10b981' : '#9ca3af'} />
                <span>Marrje në Sportel: <strong>{branch?.accepts_pickup ? 'E Aktivizuar' : 'E Fikur'}</strong></span>
              </div>
            </div>
          </div>

          {/* Veprimet e Shpejta: Pauzë / Rihapje dhe Modaliteti i Pikut */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {availability?.is_temporarily_closed ? (
              <button
                onClick={handleRihapDegen}
                disabled={pausingLoading}
                className="btn btn-success"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', backgroundColor: '#10b981', color: '#fff' }}
              >
                <PlayCircle size={18} /> Rihap Pranimin e Porosive
              </button>
            ) : (
              <button
                onClick={() => setShowPauseModal(true)}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', borderColor: '#f59e0b', color: '#d97706' }}
              >
                <PauseCircle size={18} /> Pauzo Porositë e Reja
              </button>
            )}

            <button
              onClick={async () => {
                const newBusy = !prepTimeSettings.busy_mode;
                setPrepTimeSettings((prev) => ({ ...prev, busy_mode: newBusy }));
                await api.post(`/operations/branches/${selectedBranchId}/prep-time`, {
                  busy_mode: newBusy,
                });
                shfaqNjoftim(newBusy ? 'Modaliteti i pikut u aktivizua (+15 min)' : 'Modaliteti i pikut u çaktivizua');
                ngarkoTeDhenat();
              }}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                backgroundColor: prepTimeSettings.busy_mode ? '#fef3c7' : '#ffffff',
                borderColor: prepTimeSettings.busy_mode ? '#f59e0b' : 'var(--color-border)',
                color: prepTimeSettings.busy_mode ? '#b45309' : '#374151'
              }}
            >
              <Flame size={16} color={prepTimeSettings.busy_mode ? '#d97706' : '#6b7280'} />
              {prepTimeSettings.busy_mode ? 'Çaktivizo Pikun' : 'Aktivizo Pikun (Rush Hour)'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigimi i Tab-eve */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--color-border)', marginBottom: '24px', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '12px 20px',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'schedule' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'schedule' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Clock size={18} /> Orari Javor i Punës
        </button>

        <button
          onClick={() => setActiveTab('special_hours')}
          style={{
            padding: '12px 20px',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'special_hours' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'special_hours' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Calendar size={18} /> Festat & Orari Special ({specialHours.length})
        </button>

        <button
          onClick={() => setActiveTab('products')}
          style={{
            padding: '12px 20px',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'products' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'products' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Package size={18} /> Disponueshmëria e Produkteve & Stoku
        </button>

        <button
          onClick={() => setActiveTab('prep_time')}
          style={{
            padding: '12px 20px',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'prep_time' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'prep_time' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Flame size={18} /> Koha e Përgatitjes & Shërbimet
        </button>
      </div>

      {/* ——— TAB 1: ORARI JAVOR ——— */}
      {activeTab === 'schedule' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
              Konfiguroni oraret për çdo ditë të javës. Mbështeten intervale të shumëfishta (p.sh. drekë & darkë) dhe orare pas mesnatës.
            </p>
            <button
              onClick={handleRuajOrarinJavor}
              disabled={savingSchedule}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 22px' }}
            >
              <Save size={16} /> {savingSchedule ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {weeklySchedule.map((day) => (
              <div key={day.day_of_week} className="card" style={{ padding: '18px 24px', backgroundColor: day.is_closed ? '#f9fafb' : '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: day.is_closed ? 0 : '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, width: '110px' }}>{day.day_name}</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!day.is_closed}
                        onChange={() => handleToggleDayClosed(day.day_of_week)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ fontWeight: 600, color: day.is_closed ? '#9ca3af' : '#10b981' }}>
                        {day.is_closed ? 'Mbyllur gjithë ditën' : 'Hapur'}
                      </span>
                    </label>
                  </div>

                  {!day.is_closed && (
                    <button
                      type="button"
                      onClick={() => handleShtoInterval(day.day_of_week)}
                      className="btn btn-outline"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={14} /> Shto Interval (p.sh. Darkë)
                    </button>
                  )}
                </div>

                {/* Lista e Intervaleve për ditën */}
                {!day.is_closed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px dashed var(--color-border)' }}>
                    {day.intervals?.map((interval, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', width: '75px' }}>
                          Intervali {idx + 1}:
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Hapja:</span>
                          <input
                            type="time"
                            value={interval.open_time}
                            onChange={(e) => handleNdryshoInterval(day.day_of_week, idx, 'open_time', e.target.value)}
                            className="input"
                            style={{ width: '110px', padding: '6px 10px', fontSize: '13px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Mbyllja:</span>
                          <input
                            type="time"
                            value={interval.close_time}
                            onChange={(e) => handleNdryshoInterval(day.day_of_week, idx, 'close_time', e.target.value)}
                            className="input"
                            style={{ width: '110px', padding: '6px 10px', fontSize: '13px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '160px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Etiketë:</span>
                          <input
                            type="text"
                            placeholder="p.sh. Drekë, Darkë"
                            value={interval.label || ''}
                            onChange={(e) => handleNdryshoInterval(day.day_of_week, idx, 'label', e.target.value)}
                            className="input"
                            style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                          />
                        </div>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(interval.is_overnight || (interval.close_time < interval.open_time))}
                            onChange={(e) => handleNdryshoInterval(day.day_of_week, idx, 'is_overnight', e.target.checked)}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          <span>Orar nate (pas mesnate)</span>
                        </label>

                        {day.intervals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleFshiInterval(day.day_of_week, idx)}
                            className="btn btn-outline"
                            title="Fshi këtë interval"
                            style={{ padding: '6px 8px', color: '#ef4444', borderColor: '#fca5a5' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button
              onClick={handleRuajOrarinJavor}
              disabled={savingSchedule}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 28px', fontSize: '15px' }}
            >
              <Save size={18} /> {savingSchedule ? 'Duke ruajtur...' : 'Ruaj Ndryshimet e Orarit Javor'}
            </button>
          </div>
        </div>
      )}

      {/* ——— TAB 2: FESTAT & ORARI SPECIAL ——— */}
      {activeTab === 'special_hours' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '24px' }}>
          {/* Forma për Shtimin e një Dite Speciale */}
          <div className="card" style={{ padding: '24px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              + Shto Festë ose Orar Special
            </h3>

            <form onSubmit={handleShtoSpecialHour} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Data: *
                </label>
                <input
                  type="date"
                  required
                  value={newSpecialHour.date}
                  onChange={(e) => setNewSpecialHour({ ...newSpecialHour, date: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Emri i Festës / Rasti:
                </label>
                <input
                  type="text"
                  placeholder="p.sh. Dita e Pavarësisë, Viti i Ri, Mbyllje Teknike"
                  value={newSpecialHour.reason_or_occasion}
                  onChange={(e) => setNewSpecialHour({ ...newSpecialHour, reason_or_occasion: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={newSpecialHour.is_closed}
                    onChange={(e) => setNewSpecialHour({ ...newSpecialHour, is_closed: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                  />
                  <span>Ditë Pushimi (Mbyllur gjithë ditën)</span>
                </label>
              </div>

              {!newSpecialHour.is_closed && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                      Ora e Hapjes:
                    </label>
                    <input
                      type="time"
                      value={newSpecialHour.open_time}
                      onChange={(e) => setNewSpecialHour({ ...newSpecialHour, open_time: e.target.value })}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                      Ora e Mbylljes:
                    </label>
                    <input
                      type="time"
                      value={newSpecialHour.close_time}
                      onChange={(e) => setNewSpecialHour({ ...newSpecialHour, close_time: e.target.value })}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={savingSpecialHour}
                className="btn btn-primary"
                style={{ marginTop: '8px', padding: '10px', borderRadius: '8px', fontWeight: 700 }}
              >
                {savingSpecialHour ? 'Duke ruajtur...' : 'Ruaj Festën / Orarin Special'}
              </button>
            </form>
          </div>

          {/* Lista e Ditëve Speciale të Regjistruara */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              Ditët Speciale dhe Festat e Konfiguruara
            </h3>

            {specialHours.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                Nuk ka orare festive ose speciale të konfiguruara për këtë degë.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {specialHours.map((sh) => (
                  <div
                    key={sh.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--color-border)',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800 }}>📅 {sh.date}</span>
                        {sh.is_closed ? (
                          <span className="badge badge-danger" style={{ fontSize: '11px' }}>Mbyllur</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '11px' }}>
                            {sh.open_time?.substring(0, 5)} - {sh.close_time?.substring(0, 5)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#4b5563' }}>
                        {sh.reason_or_occasion || 'Orar i Veçantë'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleFshiSpecialHour(sh.id)}
                      className="btn btn-outline"
                      style={{ padding: '6px 10px', color: '#ef4444', borderColor: '#fca5a5' }}
                      title="Fshi"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ——— TAB 3: DISPONUESHMËRIA E PRODUKTEVE & STOKU ——— */}
      {activeTab === 'products' && (
        <div>
          {/* Shiriti i Filtrave të Artikujve */}
          <div className="card" style={{ padding: '18px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                <Search size={18} color="var(--color-text-muted)" />
                <input
                  type="text"
                  placeholder="Kërko artikullin sipas emrit..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="input"
                  style={{ flex: 1 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setProductFilter('all')}
                  className={`btn ${productFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  Të Gjithë ({products.length})
                </button>
                <button
                  onClick={() => setProductFilter('out_of_stock')}
                  className={`btn ${productFilter === 'out_of_stock' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  Pa Stok / E Shitur
                </button>
                <button
                  onClick={() => setProductFilter('unavailable')}
                  className={`btn ${productFilter === 'unavailable' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  Të Çaktivizuar
                </button>
                <button
                  onClick={() => setProductFilter('tracked')}
                  className={`btn ${productFilter === 'tracked' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  Me Stok të Numëruar
                </button>
              </div>
            </div>
          </div>

          {/* Tabela e Produkteve */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {productsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
                Duke ngarkuar artikujt...
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                Nuk u gjet asnjë artikull me këto kritere.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)', color: '#4b5563' }}>
                      <th style={{ padding: '14px 18px' }}>Artikulli</th>
                      <th style={{ padding: '14px 18px' }}>Kategoria</th>
                      <th style={{ padding: '14px 18px' }}>Çmimi</th>
                      <th style={{ padding: '14px 18px' }}>Koha e Përgatitjes</th>
                      <th style={{ padding: '14px 18px' }}>Disponueshmëria</th>
                      <th style={{ padding: '14px 18px' }}>Gjendja e Stokut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const isUpdating = updatingProductId === p.id;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: (!p.is_available || p.is_out_of_stock) ? 0.75 : 1 }}>
                          <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {p.image_url && (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }}
                                />
                              )}
                              <div>
                                <div>{p.name}</div>
                                {p.temporary_unavailable_reason && (
                                  <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>
                                    Arsyeja: {p.temporary_unavailable_reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px', color: '#6b7280' }}>
                            {p.menu_category?.name || 'Meny'}
                          </td>

                          <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                            €{parseFloat(p.base_price).toFixed(2)}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            ⚡ ~{p.estimated_prep_minutes || 15} min
                          </td>

                          {/* Toggle Disponueshmëria */}
                          <td style={{ padding: '14px 18px' }}>
                            <button
                              disabled={isUpdating}
                              onClick={() => handleNdryshoProduktin(p.id, { is_available: !p.is_available })}
                              className={`badge ${p.is_available ? 'badge-success' : 'badge-danger'}`}
                              style={{ cursor: 'pointer', border: 'none', padding: '6px 12px', fontSize: '12px' }}
                            >
                              {p.is_available ? '✓ Aktiv' : '✗ I Çaktivizuar'}
                            </button>
                          </td>

                          {/* Menaxhimi i Stokut */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleNdryshoProduktin(p.id, { is_out_of_stock: !p.is_out_of_stock })}
                                className={`badge ${!p.is_out_of_stock ? 'badge-primary' : 'badge-danger'}`}
                                style={{ cursor: 'pointer', border: 'none', padding: '6px 10px', fontSize: '11px' }}
                              >
                                {p.is_out_of_stock ? 'E Shitur (Out of Stock)' : 'Në Stok'}
                              </button>

                              {/* Inputi i sasisë në stok */}
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="∞"
                                  value={p.stock_quantity ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                    handleNdryshoProduktin(p.id, {
                                      track_stock: val !== null,
                                      stock_quantity: val,
                                    });
                                  }}
                                  className="input"
                                  style={{ width: '65px', padding: '4px 8px', fontSize: '12px', textAlign: 'center' }}
                                />
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>copë</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ——— TAB 4: KOHA E PËRGATITJES & SHËRBIMET ——— */}
      {activeTab === 'prep_time' && (
        <div style={{ maxWidth: '680px' }}>
          <div className="card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>
              Cilësimet e Kohës së Përgatitjes & Shërbimeve
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
                  Koha Bazë e Përgatitjes (minuta):
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={prepTimeSettings.default_prep_time_minutes}
                  onChange={(e) => setPrepTimeSettings({ ...prepTimeSettings, default_prep_time_minutes: parseInt(e.target.value, 10) })}
                  className="input"
                  style={{ width: '100%', maxWidth: '240px' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginTop: '4px' }}>
                  Koha standarde që i shfaqet klientit kur porosit gjatë orarit normal.
                </span>
              </div>

              {/* Modaliteti i Pikut */}
              <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#92400e' }}>
                  <input
                    type="checkbox"
                    checked={prepTimeSettings.busy_mode}
                    onChange={(e) => setPrepTimeSettings({ ...prepTimeSettings, busy_mode: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#d97706' }}
                  />
                  <span>Aktivizo Modalitetin e Pikut (Rush Hour Mode)</span>
                </label>
                <p style={{ fontSize: '12px', color: '#b45309', margin: '6px 0 0 28px' }}>
                  Kur aktivizohet, koha e përgatitjes zgjatet automatikisht me +15 minuta për të mbrojtur kuzhinën nga fluksi i lartë.
                </p>
              </div>

              {/* Shërbimet e Pranuara */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Llojet e Shërbimit që Pranohen:</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={prepTimeSettings.accepts_delivery}
                      onChange={(e) => setPrepTimeSettings({ ...prepTimeSettings, accepts_delivery: e.target.checked })}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span>🚚 Dërgesë me Korrier (Delivery)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={prepTimeSettings.accepts_pickup}
                      onChange={(e) => setPrepTimeSettings({ ...prepTimeSettings, accepts_pickup: e.target.checked })}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span>🛍️ Marrje në Sportel nga Klienti (Pickup)</span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={handleRuajPrepSettings}
                  disabled={savingPrepSettings}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 700 }}
                >
                  {savingPrepSettings ? 'Duke ruajtur...' : 'Ruaj Cilësimet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——— MODAL PËR PAUZIMIN E PËRKOHSHËM ——— */}
      {showPauseModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>
              ⏸️ Pauzo Pranimin e Porosive të Reja
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Gjatë pauzës, klientët nuk do të mund të vendosin porosi të reja për këtë degë dhe do të shohin arsyen e shënuar.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Kohëzgjatja e Pauzës:
                </label>
                <select
                  value={pauseDuration}
                  onChange={(e) => setPauseDuration(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="15">15 Minuta</option>
                  <option value="30">30 Minuta</option>
                  <option value="45">45 Minuta</option>
                  <option value="60">1 Orë</option>
                  <option value="120">2 Orë</option>
                  <option value="manual">Deri sa ta rihap manualisht</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Arsyeja (e dukshme për klientët):
                </label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="p.sh. Kuzhina ka ngarkesë të lartë momentale"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="btn btn-outline"
                style={{ padding: '8px 16px' }}
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={handlePauzoDegen}
                disabled={pausingLoading}
                className="btn btn-primary"
                style={{ padding: '8px 18px', backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
              >
                {pausingLoading ? 'Duke procesuar...' : 'Konfirmo Pauzën'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
