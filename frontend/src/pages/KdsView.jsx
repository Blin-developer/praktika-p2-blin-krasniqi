import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import kdsAudio from '../utils/kdsAudio';
import './KdsView.css';
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
  Volume2,
  VolumeX,
  Moon,
  Sun,
  RotateCcw,
  History,
  X,
  ChevronDown,
  AlertTriangle,
  Check,
  Calendar,
  Layers,
  ChefHat,
  Filter
} from 'lucide-react';

export default function SistemiKuzhinesKDS() {
  const { user } = useAuth();

  // Gjendja kryesore
  const [biletat, setBiletat] = useState([]);
  const [dukeNgarkuar, setDukeNgarkuar] = useState(true);
  const [gabim, setGabim] = useState(null);
  const [stacioniZgjedhur, setStacioniZgjedhur] = useState('ALL');
  const [veprimId, setVeprimId] = useState(null);

  // Audio dhe Tema
  const [isMuted, setIsMuted] = useState(kdsAudio.isSoundMuted());
  const [showAudioUnlock, setShowAudioUnlock] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('tastio_kds_theme') === 'dark';
  });

  // Drawer për Recall (Porositë e Përfunduara)
  const [showRecallDrawer, setShowRecallDrawer] = useState(false);
  const [bumpedOrders, setBumpedOrders] = useState([]);
  const [loadingBumped, setLoadingBumped] = useState(false);

  // Statistikat dhe stacionet
  const [stats, setStats] = useState({
    active_orders: 0,
    in_preparation: 0,
    urgent_orders: 0,
    completed_today: 0,
  });
  const [stationCounts, setStationCounts] = useState({
    ALL: 0,
    GRILL: 0,
    SALAD: 0,
    DRINKS: 0,
    PACKING: 0,
  });

  // Kohëmatës real-time (ticking çdo 1 sekondë)
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Referencë për checksum të fundit për zbulim porosie të re
  const lastSyncChecksum = useRef(null);
  const prevActiveCount = useRef(null);

  // Ndërrimi i temës dark/light
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('tastio_kds_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Ndërrimi i zërit (Mute/Unmute)
  const handleToggleMute = async () => {
    await kdsAudio.unlockAudio();
    const muted = kdsAudio.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      kdsAudio.playNewOrderSound();
    }
    setShowAudioUnlock(false);
  };

  // Zhbllokimi i zërit nga baneri i shfletuesit
  const handleUnlockAudio = async () => {
    const success = await kdsAudio.unlockAudio();
    if (success) {
      setShowAudioUnlock(false);
      kdsAudio.playNewOrderSound();
    }
  };

  // Ngarkimi i plotë i biletave
  const ngarkoBiletat = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setDukeNgarkuar(true);
      setGabim(null);

      const params = {};
      if (stacioniZgjedhur && stacioniZgjedhur !== 'ALL') {
        params.station = stacioniZgjedhur;
      }

      const [resTickets, resStats, resStations] = await Promise.all([
        api.get('/kds/tickets', { params }),
        api.get('/kds/stats').catch(() => ({ data: { data: {} } })),
        api.get('/kds/stations').catch(() => ({ data: { data: {} } }))
      ]);

      const newTickets = resTickets.data?.data || [];
      setBiletat(newTickets);

      if (resStats.data?.data) {
        setStats(resStats.data.data);
      }
      if (resStations.data?.data?.counts) {
        setStationCounts(resStations.data.data.counts);
      }
    } catch (err) {
      console.error('Dështoi ngarkimi i biletave KDS', err);
      if (!isSilent) {
        setGabim(
          err.response?.data?.message ||
          'Dështoi lidhja me sistemin KDS. Ju lutem kontrolloni serverin dhe provoni sërish.'
        );
      }
    } finally {
      if (!isSilent) setDukeNgarkuar(false);
    }
  }, [stacioniZgjedhur]);

  // Ngarkimi i porosive të bump-uara për drawer
  const ngarkoBumpedOrders = async () => {
    try {
      setLoadingBumped(true);
      const res = await api.get('/kds/bumped?limit=25');
      setBumpedOrders(res.data?.data || []);
    } catch (err) {
      console.error('Dështoi ngarkimi i porosive të bump-uara', err);
    } finally {
      setLoadingBumped(false);
    }
  };

  // Smart Sync Polling (çdo 3.5 sekonda)
  const syncKds = useCallback(async () => {
    try {
      const res = await api.get('/kds/sync');
      const syncData = res.data?.data;
      if (!syncData) return;

      const newChecksum = syncData.checksum;
      const currentCount = syncData.active_count;

      if (lastSyncChecksum.current && lastSyncChecksum.current !== newChecksum) {
        // Kontrollo nëse u shtua porosi e re
        if (prevActiveCount.current !== null && currentCount > prevActiveCount.current) {
          kdsAudio.playNewOrderSound();
        }
        // Rifresko të dhënat në mënyrë të qetë
        ngarkoBiletat(true);
      }

      lastSyncChecksum.current = newChecksum;
      prevActiveCount.current = currentCount;
    } catch (e) {
      // Ignoro gabimet e shkurtra të rrjetit gjatë polling
    }
  }, [ngarkoBiletat]);

  // Efekti kryesor i montimit dhe intervaleve
  useEffect(() => {
    ngarkoBiletat();

    // Timer për sekondat (përditësim i orës dhe kohëmatësve MM:SS)
    const secondTimer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);

    // Smart sync çdo 3.5 sekonda
    const syncInterval = setInterval(syncKds, 3500);

    return () => {
      clearInterval(secondTimer);
      clearInterval(syncInterval);
    };
  }, [ngarkoBiletat, syncKds]);

  // Hapja e drawer-it të Recall
  const handleOpenRecallDrawer = () => {
    setShowRecallDrawer(true);
    ngarkoBumpedOrders();
  };

  // Ndryshimi i statusit të një artikulli individual (pending -> preparing -> ready)
  const handleToggleItemStatus = async (item, orderId) => {
    let nextStatus = 'preparing';
    if (item.item_status === 'pending') {
      nextStatus = 'preparing';
    } else if (item.item_status === 'preparing') {
      nextStatus = 'ready';
    } else {
      nextStatus = 'pending';
    }

    // Përditësim optimist në gjendje
    setBiletat((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const updatedItems = order.items.map((it) => {
          if (it.id === item.id) {
            return { ...it, item_status: nextStatus };
          }
          return it;
        });

        const allReady = updatedItems.every((it) => it.item_status === 'ready');
        return {
          ...order,
          items: updatedItems,
          is_fully_ready: allReady,
          status: allReady ? 'ready_for_pickup' : (order.status === 'confirmed' ? 'in_preparation' : order.status)
        };
      })
    );

    try {
      await api.patch(`/kds/items/${item.id}/status`, { status: nextStatus });
    } catch (err) {
      console.error('Dështoi përditësimi i artikullit', err);
      ngarkoBiletat(true); // Rivendos nga serveri në rast gabimi
    }
  };

  // Veprimi Bump (Përfundo Biletën)
  const handleBumpTicket = async (orderId) => {
    try {
      setVeprimId(orderId);
      kdsAudio.playBumpSound();

      // Largim optimist nga lista aktive
      setBiletat((prev) => prev.filter((o) => o.id !== orderId));

      await api.post(`/kds/tickets/${orderId}/bump`, {
        reason: 'Përfunduar dhe Bump-uar nga stafi i kuzhinës.'
      });

      // Përditëso statistikat
      setStats((prev) => ({
        ...prev,
        active_orders: Math.max(0, prev.active_orders - 1),
        completed_today: prev.completed_today + 1
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Ndodhi një gabim gjatë largimit të biletës.');
      ngarkoBiletat(true);
    } finally {
      setVeprimId(null);
    }
  };

  // Veprimi Recall (Rikthe Biletën në ekran)
  const handleRecallTicket = async (orderId) => {
    try {
      setVeprimId(orderId);
      await api.post(`/kds/tickets/${orderId}/recall`, {
        reason: 'Rikthyer në ekranin e kuzhinës (Recall).'
      });
      setShowRecallDrawer(false);
      await ngarkoBiletat();
      kdsAudio.playNewOrderSound();
    } catch (err) {
      alert(err.response?.data?.message || 'Ndodhi një gabim gjatë rikthimit të biletës.');
    } finally {
      setVeprimId(null);
    }
  };

  // Ndryshimi i prioritetit të porosisë
  const handleSetPriority = async (orderId, priority) => {
    try {
      setBiletat((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, priority } : o))
      );
      await api.patch(`/kds/tickets/${orderId}/priority`, { priority });
      if (priority === 'urgent') {
        kdsAudio.playUrgentSound();
      }
    } catch (err) {
      console.error('Dështoi ndryshimi i prioritetit', err);
      ngarkoBiletat(true);
    }
  };

  // Formatimi i orës dhe kohëmatësit MM:SS
  const formatTimer = (order) => {
    const startTimestamp = order.started_preparing_at
      ? Math.floor(new Date(order.started_preparing_at).getTime() / 1000)
      : Math.floor(new Date(order.created_at).getTime() / 1000);

    const elapsedSeconds = Math.max(0, nowSec - startTimestamp);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');

    const estimatedMinutes = order.estimated_prep_time_minutes || 15;
    const isDelayed = minutes >= estimatedMinutes;
    const delayMinutes = isDelayed ? minutes - estimatedMinutes : 0;

    let urgencyLevel = 'normal';
    if (order.priority === 'urgent' || isDelayed) {
      urgencyLevel = 'urgent';
    } else if (order.priority === 'high' || minutes >= Math.floor(estimatedMinutes * 0.7)) {
      urgencyLevel = 'warning';
    }

    return {
      formatted: `${pad(minutes)}:${pad(seconds)}`,
      minutes,
      seconds,
      isDelayed,
      delayFormatted: `+${delayMinutes}m vonesë`,
      urgencyLevel,
    };
  };

  // Stacionet e disponueshme
  const stacionetList = [
    { kodi: 'ALL', emri: 'Të Gjitha', ikona: Layers },
    { kodi: 'GRILL', emri: 'Grill', ikona: Flame },
    { kodi: 'SALAD', emri: 'Sallatë', ikona: UtensilsCrossed },
    { kodi: 'DRINKS', emri: 'Pije', ikona: Sparkles },
    { kodi: 'PACKING', emri: 'Paketim', ikona: ShoppingBag },
  ];

  return (
    <DashboardLayout activeTab="kds">
      <div className={`kds-container ${isDarkMode ? 'kds-theme-dark' : 'kds-theme-light'}`}>
        {/* Baneri për zhbllokimin e zërit nëse shfletuesi e kërkon */}
        {showAudioUnlock && !isMuted && (
          <div className="kds-audio-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={16} />
              <span>Aktivizoni sinjalet zanore për njoftime të menjëhershme të porosive të reja në kuzhinë.</span>
            </div>
            <button
              type="button"
              onClick={handleUnlockAudio}
              className="kds-btn kds-btn-primary"
              style={{ padding: '4px 12px', fontSize: '12px' }}
            >
              Aktivizo Zërin
            </button>
          </div>
        )}

        {/* Header KDS */}
        <header className="kds-header">
          <div className="kds-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span className="kds-live-badge">
                <span className="kds-live-dot" />
                KDS LIVE
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.75 }}>
                {new Date(nowSec * 1000).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <h1>
              <ChefHat size={28} style={{ color: '#0066ff' }} />
              Sistemi i Shfaqjes në Kuzhinë (KDS)
            </h1>
          </div>

          <div className="kds-controls">
            {/* Butoni i Temës Dark/Light */}
            <button
              type="button"
              onClick={toggleTheme}
              className="kds-btn kds-btn-outline"
              title={isDarkMode ? 'Kalo në Temë të Çelët' : 'Kalo në Temë të Errët Kuzhine'}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span>{isDarkMode ? 'E Çelët' : 'Dark Mode'}</span>
            </button>

            {/* Butoni i Zërit */}
            <button
              type="button"
              onClick={handleToggleMute}
              className="kds-btn kds-btn-outline"
              title={isMuted ? 'Aktivizo Tingujt' : 'Çaktivizo Tingujt'}
              style={{ color: isMuted ? '#ef4444' : '#10b981' }}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isMuted ? 'Pa Zë' : 'Zëri Aktiv'}</span>
            </button>

            {/* Porositë e Përfunduara / Recall */}
            <button
              type="button"
              onClick={handleOpenRecallDrawer}
              className="kds-btn kds-btn-outline"
              title="Shiko porositë e bump-uara dhe ktheji nëse nevojitet"
            >
              <History size={16} />
              <span>Recall / Të Përfunduara</span>
            </button>

            {/* Rifresko Manualisht */}
            <button
              type="button"
              onClick={() => ngarkoBiletat()}
              className="kds-btn kds-btn-outline"
              disabled={dukeNgarkuar}
              title="Rifresko Biletat"
            >
              <RefreshCw size={15} className={dukeNgarkuar ? 'spin' : ''} />
              <span>Rifresko</span>
            </button>
          </div>
        </header>

        {/* Shirit me Statistikat në Kohë Reale */}
        <div className="kds-stats-ribbon">
          <div className="kds-stat-card">
            <div>
              <div className="kds-stat-label">Bileta Aktive</div>
              <div className="kds-stat-value" style={{ color: '#0066ff' }}>{biletat.length}</div>
            </div>
            <Layers size={22} color="#0066ff" opacity={0.7} />
          </div>

          <div className="kds-stat-card">
            <div>
              <div className="kds-stat-label">Në Përgatitje</div>
              <div className="kds-stat-value" style={{ color: '#f59e0b' }}>
                {biletat.filter((b) => b.status === 'in_preparation').length}
              </div>
            </div>
            <Flame size={22} color="#f59e0b" opacity={0.7} />
          </div>

          <div className="kds-stat-card">
            <div>
              <div className="kds-stat-label">Urgjente / Vonesë</div>
              <div className="kds-stat-value" style={{ color: '#ef4444' }}>
                {biletat.filter((b) => {
                  const t = formatTimer(b);
                  return t.urgencyLevel === 'urgent';
                }).length}
              </div>
            </div>
            <AlertTriangle size={22} color="#ef4444" opacity={0.7} />
          </div>

          <div className="kds-stat-card">
            <div>
              <div className="kds-stat-label">Përfunduar Sot</div>
              <div className="kds-stat-value" style={{ color: '#10b981' }}>{stats.completed_today || 0}</div>
            </div>
            <CheckCircle2 size={22} color="#10b981" opacity={0.7} />
          </div>
        </div>

        {/* Tab-et e Stacioneve */}
        <nav className="kds-stations-bar">
          <span style={{ fontSize: '13px', fontWeight: 700, padding: '0 8px', opacity: 0.7 }}>
            Stacioni:
          </span>
          {stacionetList.map((st) => {
            const isActive = stacioniZgjedhur === st.kodi;
            const count = stationCounts[st.kodi] ?? 0;
            const Icon = st.ikona;

            return (
              <button
                key={st.kodi}
                type="button"
                onClick={() => setStacioniZgjedhur(st.kodi)}
                className={`kds-station-tab ${isActive ? 'active' : ''}`}
              >
                <Icon size={15} />
                <span>{st.emri}</span>
                <span className="kds-tab-badge">{count}</span>
              </button>
            );
          })}
        </nav>

        {/* Mesazhi i Gabimit */}
        {gabim && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: '#dc2626',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} />
              <span>{gabim}</span>
            </div>
            <button
              type="button"
              onClick={() => ngarkoBiletat()}
              className="kds-btn kds-btn-outline"
            >
              Provo Përsëri
            </button>
          </div>
        )}

        {/* Gjendja Kur Nuk Ka Porosi */}
        {dukeNgarkuar && biletat.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.65 }}>
            <RefreshCw size={32} className="spin" style={{ color: '#0066ff', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Duke ngarkuar biletat e kuzhinës...</div>
          </div>
        ) : biletat.length === 0 ? (
          <div style={{
            padding: '80px 20px',
            textAlign: 'center',
            borderRadius: '16px',
            border: isDarkMode ? '1px dashed #272c36' : '1px dashed #cbd5e1',
            margin: '20px 0'
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
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>
              Kuzhina është e pastër!
            </h3>
            <p style={{ fontSize: '14px', opacity: 0.75, maxWidth: '420px', margin: '0 auto' }}>
              {stacioniZgjedhur === 'ALL'
                ? 'Nuk ka asnjë biletë aktive në pritje për përgatitje për momentin.'
                : `Nuk ka artikuj aktivë në pritje për stacionin ${stacioniZgjedhur}.`}
            </p>
          </div>
        ) : (
          /* Rrjeti Kryesor i Biletave (Ticket Grid) */
          <div className="kds-grid">
            {biletat.map((bileta) => {
              const timer = formatTimer(bileta);

              // Artikujt që do të shfaqen sipas stacionit
              const displayedItems = bileta.station_filtered_items || bileta.items || [];
              const totalItemsInTicket = bileta.items?.length || 0;
              const readyItemsInTicket = bileta.items?.filter((it) => it.item_status === 'ready').length || 0;
              const progressPercent = totalItemsInTicket > 0
                ? Math.round((readyItemsInTicket / totalItemsInTicket) * 100)
                : 0;

              return (
                <div
                  key={bileta.id}
                  className={`kds-ticket kds-ticket-${timer.urgencyLevel}`}
                >
                  {/* Kreu i Biletës */}
                  <div className="kds-ticket-header">
                    <div>
                      <h2 className="kds-order-number">
                        #{bileta.order_number}
                        {bileta.priority === 'urgent' && (
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: 800 }}>
                            URGJENTE
                          </span>
                        )}
                      </h2>
                      <div className="kds-ticket-meta">
                        <strong>{bileta.customer_name || bileta.customer?.name || 'Klient'}</strong>
                        {bileta.customer_phone ? ` • ${bileta.customer_phone}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      {/* Timer Pill */}
                      <div className={`kds-timer-pill kds-timer-${timer.urgencyLevel}`}>
                        <Clock size={13} />
                        <span>{timer.formatted}</span>
                        {timer.isDelayed && (
                          <span style={{ fontSize: '10px', marginLeft: '2px' }}>
                            ({timer.delayFormatted})
                          </span>
                        )}
                      </div>

                      {/* Lloji i porosisë */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: bileta.order_type === 'delivery' ? '#eff6ff' : '#f0fdf4',
                          color: bileta.order_type === 'delivery' ? '#1d4ed8' : '#15803d'
                        }}>
                          {bileta.order_type === 'delivery' ? '🚚 Dërgesë' : '🛍️ Marrje'}
                        </span>

                        {bileta.is_scheduled && bileta.scheduled_for && (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#fef3c7',
                            color: '#b45309'
                          }}>
                            📅 {new Date(bileta.scheduled_for).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shiriti i Progresit të Artikujve */}
                  <div className="kds-progress-wrap" title={`${readyItemsInTicket}/${totalItemsInTicket} artikuj gati`}>
                    <div className="kds-progress-bar" style={{ width: `${progressPercent}%` }} />
                  </div>

                  {/* Trupi me Artikujt (Item-Level Tracking) */}
                  <div className="kds-ticket-items">
                    {displayedItems.map((item) => {
                      const isReady = item.item_status === 'ready';
                      const isPreparing = item.item_status === 'preparing';

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItemStatus(item, bileta.id)}
                          className={`kds-item-row ${isReady ? 'is-ready' : ''}`}
                          title="Kliko për të ndryshuar statusin e artikullit (Në pritje -> Përgatitje -> Gati)"
                        >
                          {/* Checkbox interaktiv */}
                          <div className={`kds-item-checkbox ${isReady ? 'checked' : (isPreparing ? 'preparing' : '')}`}>
                            {isReady && <Check size={13} strokeWidth={3} />}
                            {isPreparing && <Flame size={12} />}
                          </div>

                          <div className="kds-item-content">
                            <div className="kds-item-title">
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="kds-item-qty">{item.quantity}x</span>
                                <span className={isReady ? 'line-through' : ''}>{item.product_name_snapshot}</span>
                              </span>
                              <span className="kds-station-badge">
                                {item.station?.code || 'GRILL'}
                              </span>
                            </div>

                            {/* Opsionet & Modifikuesit */}
                            {item.options && item.options.length > 0 && (
                              <div className="kds-item-options">
                                {item.options.map((opt) => (
                                  <div key={opt.id}>
                                    • {opt.option_group_name_snapshot}: <strong>{opt.option_choice_name_snapshot}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Shënimi Special i Klientit */}
                    {bileta.customer_note && (
                      <div className="kds-note-box">
                        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span><strong>Shënim Klienti:</strong> {bileta.customer_note}</span>
                      </div>
                    )}
                  </div>

                  {/* Butonat dhe Veprimet e Biletës */}
                  <div className="kds-ticket-footer">
                    {/* Ndërrimi i prioritetit */}
                    <button
                      type="button"
                      onClick={() => handleSetPriority(bileta.id, bileta.priority === 'urgent' ? 'normal' : 'urgent')}
                      className="kds-btn kds-btn-outline"
                      style={{
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: bileta.priority === 'urgent' ? '#dc2626' : 'inherit'
                      }}
                      title="Ndrysho nivelin e urgjencës"
                    >
                      <AlertTriangle size={15} />
                    </button>

                    {/* Butoni Bump (Largim nga ekrani) */}
                    <button
                      type="button"
                      disabled={veprimId === bileta.id}
                      onClick={() => handleBumpTicket(bileta.id)}
                      className={`kds-bump-btn ${bileta.is_fully_ready ? 'all-ready' : ''}`}
                      title={bileta.is_fully_ready ? 'Të gjithë artikujt janë gati! BUMP' : 'Përfundo dhe largo nga ekrani'}
                    >
                      <CheckCircle2 size={16} />
                      <span>{bileta.is_fully_ready ? '✓ BUMP (Gati)' : 'Përfundo (Bump)'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Drawer për Porositë e Bump-uara / Recall */}
        {showRecallDrawer && (
          <div className="kds-drawer-backdrop" onClick={() => setShowRecallDrawer(false)}>
            <div className="kds-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="kds-drawer-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                    Porositë e Përfunduara (Recall)
                  </h3>
                  <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '2px' }}>
                    Ktheni biletat mbrapsht në ekranin aktiv në rast nevoje.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecallDrawer(false)}
                  className="kds-btn kds-btn-outline"
                  style={{ padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="kds-drawer-body">
                {loadingBumped ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <RefreshCw size={24} className="spin" style={{ color: '#0066ff' }} />
                  </div>
                ) : bumpedOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
                    Nuk ka porosi të larguara së fundmi.
                  </div>
                ) : (
                  bumpedOrders.map((order) => (
                    <div key={order.id} className="kds-bumped-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '15px' }}>#{order.order_number}</strong>
                          <div style={{ fontSize: '12px', opacity: 0.75 }}>
                            {order.customer_name || 'Klient'} • {order.items?.length || 0} artikuj
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#ecfdf5',
                          color: '#059669'
                        }}>
                          ✓ Bump-uar
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {order.items?.map((it) => `${it.quantity}x ${it.product_name_snapshot}`).join(', ')}
                      </div>

                      <button
                        type="button"
                        disabled={veprimId === order.id}
                        onClick={() => handleRecallTicket(order.id)}
                        className="kds-btn kds-btn-outline"
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          fontSize: '12.5px',
                          borderColor: '#0066ff',
                          color: '#0066ff',
                          fontWeight: 700
                        }}
                      >
                        <RotateCcw size={14} />
                        <span>Rikthe në KDS (Recall)</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
