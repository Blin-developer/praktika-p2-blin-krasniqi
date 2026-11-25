import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  ChevronRight,
  RefreshCw,
  Calendar,
  Store,
  ClipboardList,
  AlertCircle,
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import RestaurantOperations from './RestaurantOperations';
import AdminDeliveryManagement from '../components/AdminDeliveryManagement';
import DashboardLayout from '../components/DashboardLayout';

export default function PaneliAdministrimit() {
  const { user } = useAuth();
  const [paneliAktiv, setPaneliAktiv] = useState('porosite'); // 'porosite' ose 'operacionet'
  const [metrikat, setMetrikat] = useState(null);
  const [metrikatLoading, setMetrikatLoading] = useState(true);

  // Orders State
  const [porosite, setPorosite] = useState([]);
  const [porositeLoading, setPorositeLoading] = useState(true);
  const [gabim, setGabim] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [summary, setSummary] = useState({ total_orders: 0, total_revenue: 0, status_counts: {} });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [orderType, setOrderType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const ngarkoMetrikat = async () => {
    try {
      setMetrikatLoading(true);
      const res = await api.get('/admin/metrics');
      setMetrikat(res.data);
    } catch (err) {
      console.error('Dështoi ngarkimi i statistikave', err);
    } finally {
      setMetrikatLoading(false);
    }
  };

  const ngarkoPorosite = async (faqe = page) => {
    try {
      setPorositeLoading(true);
      setGabim(null);
      const params = {
        page: faqe,
        per_page: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (status !== 'all') params.status = status;
      if (orderType !== 'all') params.order_type = orderType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/admin/orders', { params });
      setPorosite(res.data?.data || []);
      setMeta(res.data?.meta || { current_page: 1, last_page: 1, total: 0 });
      setSummary(res.data?.summary || { total_orders: 0, total_revenue: 0, status_counts: {} });
    } catch (err) {
      console.error('Dështoi ngarkimi i porosive në admin', err);
      setGabim(
        err.response?.data?.message ||
        'Dështoi ngarkimi i porosive. Ju lutem kontrolloni lidhjen dhe provoni sërish.'
      );
    } finally {
      setPorositeLoading(false);
    }
  };

  useEffect(() => {
    if (user && ['super_admin', 'admin', 'owner', 'branch_manager'].includes(user.role)) {
      ngarkoMetrikat();
    } else {
      setMetrikatLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && ['super_admin', 'admin', 'owner', 'branch_manager'].includes(user.role)) {
      ngarkoPorosite(page);
    } else {
      setPorositeLoading(false);
    }
  }, [user, status, orderType, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    ngarkoPorosite(1);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingStatusId(orderId);
      await api.patch(`/admin/orders/${orderId}/status`, {
        status: newStatus,
        reason: `Përditësuar nga paneli i adminit (${user?.name}).`,
      });
      await ngarkoPorosite(meta.current_page);
      await ngarkoMetrikat();
      if (selectedOrder && selectedOrder.id === orderId) {
        handleViewDetails(orderId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi përditësimi i statusit.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/admin/orders/${id}`);
      setSelectedOrder(res.data?.data || null);
    } catch (err) {
      alert('Dështoi marrja e detajeve të porosisë.');
    } finally {
      setDetailLoading(false);
    }
  };

  const perktheRolin = (r) => {
    switch (r) {
      case 'super_admin': return 'Super Administrator';
      case 'admin': return 'Administrator';
      case 'owner': return 'Pronar Restoranti';
      case 'branch_manager': return 'Menaxher Dege';
      case 'kitchen_staff': return 'Staf Kuzhine';
      case 'cashier': return 'Arkëtar Sporteli';
      case 'customer': return 'Klient';
      default: return r;
    }
  };

  const perktheStatusin = (st) => {
    switch (st) {
      case 'pending': return 'Në Pritje';
      case 'confirmed': return 'E Konfirmuar';
      case 'in_preparation': return 'Në Përgatitje';
      case 'ready_for_pickup': return 'Gati';
      case 'completed': return 'E Përfunduar';
      case 'cancelled': return 'E Anuluar';
      default: return st;
    }
  };

  const statusBadgeClass = (st) => {
    switch (st) {
      case 'confirmed': return 'badge-primary';
      case 'in_preparation': return 'badge-warning';
      case 'ready_for_pickup': return 'badge-secondary';
      case 'completed': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-outline';
    }
  };

  return (
    <DashboardLayout activeTab="admin">
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
        {/* Header Kryesor */}
        <div style={{
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-primary" style={{ fontWeight: 800 }}>
                {perktheRolin(user?.role)}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                • Tastio Merchant Control Center
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>
              Paneli Administrativ Tastio
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
              I kyçur si <strong>{user?.name}</strong> • Menaxhoni porositë, metrikat dhe performancën operacionale.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { ngarkoMetrikat(); ngarkoPorosite(meta.current_page); }}
            className="btn btn-secondary"
            style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 16px' }}
          >
            <RefreshCw size={15} />
            <span>Rifresko të Dhënat</span>
          </button>
        </div>

        {/* Wolt Segmented Switcher */}
        <div style={{
          display: 'inline-flex',
          padding: '4px',
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          marginBottom: '28px',
          border: '1px solid #e2e8f0',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setPaneliAktiv('porosite')}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: paneliAktiv === 'porosite' ? '#ffffff' : 'transparent',
              color: paneliAktiv === 'porosite' ? '#0066ff' : '#64748b',
              boxShadow: paneliAktiv === 'porosite' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <ClipboardList size={16} /> Menaxhimi i Porosive & Metrikat
          </button>

          <button
            type="button"
            onClick={() => setPaneliAktiv('dergesat')}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: paneliAktiv === 'dergesat' ? '#ffffff' : 'transparent',
              color: paneliAktiv === 'dergesat' ? '#0066ff' : '#64748b',
              boxShadow: paneliAktiv === 'dergesat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Truck size={16} /> Dërgesat, Korrierët & Zonat
          </button>

          <button
            type="button"
            onClick={() => setPaneliAktiv('operacionet')}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: paneliAktiv === 'operacionet' ? '#ffffff' : 'transparent',
              color: paneliAktiv === 'operacionet' ? '#0066ff' : '#64748b',
              boxShadow: paneliAktiv === 'operacionet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Store size={16} /> Operacionet, Orari & Stoku (Faza 3)
          </button>
        </div>

        {paneliAktiv === 'operacionet' ? (
          <RestaurantOperations isEmbedded={true} />
        ) : paneliAktiv === 'dergesat' ? (
          <AdminDeliveryManagement />
        ) : (
          <>
            {/* 4 Kartelat e Statistikave Globale (Wolt Merchant Style) */}
            {['super_admin', 'admin'].includes(user?.role) && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '18px',
                marginBottom: '32px'
              }}>
                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '22px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Përdorues në Platformë</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0066ff' }}>
                      <Users size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#0f172a' }}>
                    {metrikatLoading ? '...' : metrikat?.total_users || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>
                    RBAC e Verifikuar
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '22px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Restorante & Degë</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 102, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0066ff' }}>
                      <Building2 size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#0066ff' }}>
                    {metrikatLoading ? '...' : `${metrikat?.total_restaurants || 0} / ${metrikat?.total_branches || 0}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Rrjeti aktiv në Prishtinë
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '22px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Porosi Gjithsej</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                      <ClipboardList size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#7c3aed' }}>
                    {metrikatLoading ? '...' : metrikat?.total_orders || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Historik i auditueshëm
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '22px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Qarkullimi Total</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                      <DollarSign size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#059669' }}>
                    €{metrikatLoading ? '...' : parseFloat(metrikat?.total_revenue || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                    Pagesa të realizuara
                  </div>
                </div>
              </div>
            )}

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
                  onClick={() => ngarkoPorosite(page)}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px' }}
                >
                  Provo Përsëri
                </button>
              </div>
            )}

            {/* Seksioni i Menaxhimit të Porosive */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              marginBottom: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Menaxhimi i Porosive në Kohë Reale
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', margin: '4px 0 0' }}>
                    Filtroni, kërkoni dhe përditësoni statusin e secilës porosi me regjistrim të plotë të historikut.
                  </p>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0066ff' }}>
                  Gjithsej të gjetura: {summary.total_orders} porosi
                </div>
              </div>

              {/* Status Tabs me Counter Badges */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', scrollbarWidth: 'none' }}>
                {[
                  { id: 'all', label: 'Të Gjitha', count: summary.total_orders },
                  { id: 'confirmed', label: 'Të Konfirmuara', count: summary.status_counts?.confirmed || 0 },
                  { id: 'in_preparation', label: 'Në Përgatitje', count: summary.status_counts?.in_preparation || 0 },
                  { id: 'ready_for_pickup', label: 'Gati', count: summary.status_counts?.ready_for_pickup || 0 },
                  { id: 'completed', label: 'Të Përfunduara', count: summary.status_counts?.completed || 0 },
                  { id: 'cancelled', label: 'Të Anuluara', count: summary.status_counts?.cancelled || 0 },
                ].map((tab) => {
                  const isActive = status === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setStatus(tab.id); setPage(1); }}
                      style={{
                        fontSize: '13px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: isActive ? '#0066ff' : '#f1f5f9',
                        color: isActive ? '#ffffff' : '#475569',
                        fontWeight: isActive ? 700 : 600,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{tab.label}</span>
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        color: isActive ? '#ffffff' : '#334155',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Shiriti i Kërkimit & Filtrave */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2', minWidth: '240px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Kërko me #porosie, emër klienti, email ose telefon..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>

                <select
                  value={orderType}
                  onChange={(e) => { setOrderType(e.target.value); setPage(1); }}
                  style={{
                    height: '42px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    padding: '0 12px',
                    backgroundColor: '#ffffff',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="all">Të gjitha llojet</option>
                  <option value="delivery">Dërgesë (Delivery)</option>
                  <option value="pickup">Marrje vetë (Pickup)</option>
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  style={{
                    height: '42px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    padding: '0 12px',
                    backgroundColor: '#ffffff',
                    fontFamily: 'inherit'
                  }}
                  title="Nga data"
                />

                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  style={{
                    height: '42px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    padding: '0 12px',
                    backgroundColor: '#ffffff',
                    fontFamily: 'inherit'
                  }}
                  title="Deri në datën"
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '42px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}
                >
                  Filtro Porositë
                </button>
              </form>

              {/* Tabela e Porosive */}
              {porositeLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#0066ff', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '14.5px', fontWeight: 600 }}>Duke ngarkuar porositë nga databaza...</div>
                </div>
              ) : porosite.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ color: '#64748b', fontSize: '14.5px', margin: 0 }}>
                    Nuk u gjet asnjë porosi me këto kritere filtrimi.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 14px' }}>Porosia</th>
                        <th style={{ padding: '12px 14px' }}>Klienti</th>
                        <th style={{ padding: '12px 14px' }}>Restoranti / Dega</th>
                        <th style={{ padding: '12px 14px' }}>Totali</th>
                        <th style={{ padding: '12px 14px' }}>Statusi</th>
                        <th style={{ padding: '12px 14px' }}>Data</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Veprime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porosite.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                          <td style={{ padding: '14px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.order_number}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {p.order_type === 'delivery' ? '🚚 Dërgesë' : '🛍️ Marrje'}
                            </div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <div style={{ fontWeight: 700 }}>{p.customer_name || p.customer?.name || 'Vizitor'}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{p.customer_phone || p.customer?.phone}</div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <div style={{ fontWeight: 600 }}>{p.branch?.restaurant?.name || 'Tastio Partner'}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{p.branch?.name}</div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>€{parseFloat(p.total_price).toFixed(2)}</div>
                            <div style={{ fontSize: '11px', color: p.payment_status === 'paid' ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                              {p.payment_status === 'paid' ? '✓ E Paguar' : '⏳ Në Pritje'}
                            </div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span className={`badge ${statusBadgeClass(p.status)}`} style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                              {perktheStatusin(p.status)}
                            </span>
                          </td>
                          <td style={{ padding: '14px', fontSize: '12px', color: '#64748b' }}>
                            {new Date(p.created_at).toLocaleString('sq-AL', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleViewDetails(p.id)}
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px' }}
                                title="Shiko detajet e plota"
                              >
                                <Eye size={14} />
                              </button>

                              {p.status === 'confirmed' && (
                                <button
                                  type="button"
                                  disabled={updatingStatusId === p.id}
                                  onClick={() => handleUpdateStatus(p.id, 'in_preparation')}
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '12px', color: '#d97706', borderColor: '#fde68a', borderRadius: '6px' }}
                                  title="Fillo përgatitjen"
                                >
                                  Kuzhinë
                                </button>
                              )}
                              {p.status === 'in_preparation' && (
                                <button
                                  type="button"
                                  disabled={updatingStatusId === p.id}
                                  onClick={() => handleUpdateStatus(p.id, 'ready_for_pickup')}
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '12px', color: '#0284c7', borderColor: '#bae6fd', borderRadius: '6px' }}
                                  title="Shëno gati"
                                >
                                  Gati
                                </button>
                              )}
                              {p.status === 'ready_for_pickup' && (
                                <button
                                  type="button"
                                  disabled={updatingStatusId === p.id}
                                  onClick={() => handleUpdateStatus(p.id, 'completed')}
                                  className="btn btn-primary"
                                  style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px' }}
                                  title="Përfundo porosinë"
                                >
                                  Përfundo
                                </button>
                              )}
                              {['pending', 'confirmed'].includes(p.status) && (
                                <button
                                  type="button"
                                  disabled={updatingStatusId === p.id}
                                  onClick={() => {
                                    if (window.confirm(`Dëshironi ta anuloni porosinë #${p.order_number}?`)) {
                                      handleUpdateStatus(p.id, 'cancelled');
                                    }
                                  }}
                                  className="btn"
                                  style={{ padding: '5px 8px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px' }}
                                  title="Anulo porosinë"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {meta.last_page > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Faqja <strong>{meta.current_page}</strong> nga <strong>{meta.last_page}</strong> ({meta.total} porosi gjithsej)
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={meta.current_page <= 1}
                          onClick={() => { setPage(meta.current_page - 1); ngarkoPorosite(meta.current_page - 1); }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '8px' }}
                        >
                          Mëparshme
                        </button>
                        <button
                          type="button"
                          disabled={meta.current_page >= meta.last_page}
                          onClick={() => { setPage(meta.current_page + 1); ngarkoPorosite(meta.current_page + 1); }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '8px' }}
                        >
                          Tjetra
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal: Shfaqja e Detajeve të Thelluara */}
            {selectedOrder && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
                  maxWidth: '680px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '28px',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <span className={`badge ${statusBadgeClass(selectedOrder.status)}`} style={{ marginBottom: '8px' }}>
                        {perktheStatusin(selectedOrder.status)}
                      </span>
                      <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px' }}>Porosia #{selectedOrder.order_number}</h3>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Krijuar më: {new Date(selectedOrder.created_at).toLocaleString('sq-AL')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}
                    >
                      Mbyll ✕
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Klienti</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{selectedOrder.customer_name || selectedOrder.customer?.name}</div>
                      <div style={{ fontSize: '13px', color: '#475569' }}>{selectedOrder.customer_phone || selectedOrder.customer?.phone}</div>
                      <div style={{ fontSize: '13px', color: '#475569' }}>{selectedOrder.customer_email || selectedOrder.customer?.email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Lloji & Adresa</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                        {selectedOrder.order_type === 'delivery' ? '🚚 Dërgesë në Adresë' : '🛍️ Marrje në Sportel'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569' }}>
                        {selectedOrder.delivery_address || `${selectedOrder.branch?.name} • ${selectedOrder.branch?.address}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14.5px', fontWeight: 700, marginBottom: '10px' }}>Artikujt e Përfshirë ({selectedOrder.items?.length || 0}):</h4>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                      {selectedOrder.items?.map((it) => (
                        <div key={it.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>
                              {it.quantity}x {it.product_name_snapshot}
                            </div>
                            {it.options?.map((opt) => (
                              <div key={opt.id} style={{ fontSize: '12px', color: '#64748b', paddingLeft: '8px' }}>
                                • {opt.option_group_name_snapshot}: <strong>{opt.option_choice_name_snapshot}</strong>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontWeight: 800 }}>€{parseFloat(it.line_total).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span>Nëntotali:</span>
                      <span>€{parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span>Tarifa e dërgesës:</span>
                      <span>€{parseFloat(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      <span>Totali Përfundimtar:</span>
                      <span style={{ color: '#0066ff' }}>€{parseFloat(selectedOrder.total_price).toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '14.5px', fontWeight: 700, marginBottom: '10px' }}>Historiku i Statuseve (Audit Trail):</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedOrder.status_history?.map((hist) => (
                        <div key={hist.id} style={{ padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #0066ff', backgroundColor: '#f8fafc', fontSize: '12.5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700 }}>
                              {hist.from_status ? `${perktheStatusin(hist.from_status)} ➔ ` : ''}{perktheStatusin(hist.to_status)}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                              {new Date(hist.created_at).toLocaleString('sq-AL')}
                            </span>
                          </div>
                          <div style={{ color: '#475569', marginTop: '2px' }}>
                            {hist.reason_or_notes} {hist.changed_by && `(nga ${hist.changed_by.name})`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    {selectedOrder.status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'in_preparation')}
                        className="btn btn-secondary"
                        style={{ fontSize: '13px', borderRadius: '8px' }}
                      >
                        Kaloni në Kuzhinë
                      </button>
                    )}
                    {['confirmed', 'in_preparation'].includes(selectedOrder.status) && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'ready_for_pickup')}
                        className="btn btn-secondary"
                        style={{ fontSize: '13px', borderRadius: '8px' }}
                      >
                        Shëno Gati
                      </button>
                    )}
                    {['confirmed', 'in_preparation', 'ready_for_pickup'].includes(selectedOrder.status) && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                        className="btn btn-primary"
                        style={{ fontSize: '13px', borderRadius: '8px' }}
                      >
                        ✓ Shëno e Përfunduar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
