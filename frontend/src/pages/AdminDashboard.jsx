import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCircle2, Clock, Truck, XCircle, ChevronRight, RefreshCw, Calendar, Store, ClipboardList } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import RestaurantOperations from './RestaurantOperations';

export default function PaneliAdministrimit() {
  const { user } = useAuth();
  const [paneliAktiv, setPaneliAktiv] = useState('porosite'); // 'porosite' ose 'operacionet'
  const [metrikat, setMetrikat] = useState(null);
  const [metrikatLoading, setMetrikatLoading] = useState(true);

  // Orders State
  const [porosite, setPorosite] = useState([]);
  const [porositeLoading, setPorositeLoading] = useState(true);
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
    } finally {
      setPorositeLoading(false);
    }
  };

  useEffect(() => {
    if (['super_admin', 'owner', 'branch_manager'].includes(user?.role)) {
      ngarkoMetrikat();
    }
  }, [user]);

  useEffect(() => {
    if (['super_admin', 'owner', 'branch_manager'].includes(user?.role)) {
      ngarkoPorosite(1);
    }
  }, [status, orderType, page]);

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
    <div style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Paneli Administrativ Tastio</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            I kyçur si <strong>{user?.name}</strong> • Roli: <span className="badge badge-primary">{perktheRolin(user?.role)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => { ngarkoMetrikat(); ngarkoPorosite(meta.current_page); }}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 16px' }}
        >
          <RefreshCw size={15} />
          <span>Rifresko të Dhënat</span>
        </button>
      </div>

      {/* Segmented Switcher për Tab-et Kryesore të Adminit */}
      <div style={{
        display: 'inline-flex',
        padding: '4px',
        backgroundColor: '#f1f5f9',
        borderRadius: '12px',
        marginBottom: '28px',
        border: '1px solid var(--color-border)',
        gap: '4px'
      }}>
        <button
          type="button"
          onClick={() => setPaneliAktiv('porosite')}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            backgroundColor: paneliAktiv === 'porosite' ? '#ffffff' : 'transparent',
            color: paneliAktiv === 'porosite' ? 'var(--color-primary)' : 'var(--color-text-muted)',
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
          onClick={() => setPaneliAktiv('operacionet')}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            backgroundColor: paneliAktiv === 'operacionet' ? '#ffffff' : 'transparent',
            color: paneliAktiv === 'operacionet' ? 'var(--color-primary)' : 'var(--color-text-muted)',
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
        <RestaurantOperations />
      ) : (
        <>
          {/* 4 Kartelat e Statistikave Globale */}
          {user?.role === 'super_admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px', marginBottom: '32px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Përdorues në Platformë</div>
            <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: 'var(--color-text-main)' }}>
              {metrikatLoading ? '...' : metrikat?.total_users || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>RBAC aktive</div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Restorante & Degë</div>
            <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: 'var(--color-primary)' }}>
              {metrikatLoading ? '...' : `${metrikat?.total_restaurants || 0} / ${metrikat?.total_branches || 0}`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Prishtinë & qytete</div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Porosi Gjithsej</div>
            <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: '#8b5cf6' }}>
              {metrikatLoading ? '...' : metrikat?.total_orders || 0}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Historik i auditueshëm</div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Qarkullimi Total (I Paguar)</div>
            <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: '#059669' }}>
              €{metrikatLoading ? '...' : parseFloat(metrikat?.total_revenue || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>Pagesa të realizuara</div>
          </div>
        </div>
      )}

      {/* ==============================================================
          SEKSIONI I MENAXHIMIT TË POROSIVE (FAZA 2)
          ============================================================== */}
      <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Menaxhimi i Porosive në Kohë Reale</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Filtroni, kërkoni dhe përditësoni statusin e secilës porosi me regjistrim të plotë të historikut.
            </p>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
            Gjithsej të gjetura: {summary.total_orders} porosi
          </div>
        </div>

        {/* Status Pills / Tabs me numra */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
          {[
            { id: 'all', label: 'Të Gjitha', count: summary.total_orders },
            { id: 'confirmed', label: 'Të Konfirmuara', count: summary.status_counts?.confirmed || 0 },
            { id: 'in_preparation', label: 'Në Përgatitje', count: summary.status_counts?.in_preparation || 0 },
            { id: 'ready_for_pickup', label: 'Gati', count: summary.status_counts?.ready_for_pickup || 0 },
            { id: 'completed', label: 'Të Përfunduara', count: summary.status_counts?.completed || 0 },
            { id: 'cancelled', label: 'Të Anuluara', count: summary.status_counts?.cancelled || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setStatus(tab.id); setPage(1); }}
              className={`btn ${status === tab.id ? 'btn-primary' : 'btn-outline'}`}
              style={{
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: status === tab.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: status === tab.id ? '#ffffff' : '#334155',
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800,
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Shiriti i Kërkimit & Filtrave të Avancuar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {/* Input Kërkimi */}
          <div style={{ gridColumn: 'span 2', minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Kërko me #porosie, emër klienti, email ose telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: '36px', height: '40px', borderRadius: '8px', fontSize: '13px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
          </div>

          {/* Lloji i porosisë */}
          <select
            value={orderType}
            onChange={(e) => { setOrderType(e.target.value); setPage(1); }}
            className="input"
            style={{ height: '40px', borderRadius: '8px', fontSize: '13px' }}
          >
            <option value="all">Të gjitha llojet</option>
            <option value="delivery">Dërgesë (Delivery)</option>
            <option value="pickup">Marrje vetë (Pickup)</option>
          </select>

          {/* Data Filluese */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="input"
            style={{ height: '40px', borderRadius: '8px', fontSize: '13px' }}
            title="Nga data"
          />

          {/* Data Mbaruese */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="input"
            style={{ height: '40px', borderRadius: '8px', fontSize: '13px' }}
            title="Deri në datën"
          />

          {/* Butoni Kërko */}
          <button type="submit" className="btn btn-primary" style={{ height: '40px', borderRadius: '8px', fontSize: '13px' }}>
            Filtro Porositë
          </button>
        </form>

        {/* Tabela e Porosive */}
        {porositeLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            Duke ngarkuar porositë nga databaza...
          </div>
        ) : porosite.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
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
                      <span className={`badge ${statusBadgeClass(p.status)}`} style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                        {perktheStatusin(p.status)}
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#64748b' }}>
                      {new Date(p.created_at).toLocaleString('sq-AL', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* Shiko Detajet */}
                        <button
                          type="button"
                          onClick={() => handleViewDetails(p.id)}
                          className="btn btn-outline"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          title="Shiko detajet e plota"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Butoni i Shpejtë i Ndryshimit të Statusit */}
                        {p.status === 'confirmed' && (
                          <button
                            type="button"
                            disabled={updatingStatusId === p.id}
                            onClick={() => handleUpdateStatus(p.id, 'in_preparation')}
                            className="btn btn-outline"
                            style={{ padding: '5px 10px', fontSize: '12px', color: '#d97706', borderColor: '#fde68a' }}
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
                            className="btn btn-outline"
                            style={{ padding: '5px 10px', fontSize: '12px', color: '#0284c7', borderColor: '#bae6fd' }}
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
                            style={{ padding: '5px 10px', fontSize: '12px' }}
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
                            style={{ padding: '5px 8px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#dc2626' }}
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
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '13px' }}
                  >
                    Mëparshme
                  </button>
                  <button
                    type="button"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => { setPage(meta.current_page + 1); ngarkoPorosite(meta.current_page + 1); }}
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '13px' }}
                  >
                    Tjetra
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==============================================================
          MODAL: SHFAQJA E DETAJEVE TË THELLUARA TË POROSISË
          ============================================================== */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
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
                <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Porosia #{selectedOrder.order_number}</h3>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Krijuar më: {new Date(selectedOrder.created_at).toLocaleString('sq-AL')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn btn-outline"
                style={{ padding: '6px 12px', fontSize: '14px' }}
              >
                Mbyll ✕
              </button>
            </div>

            {/* Informacionet e Klientit & Dërgesës */}
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

            {/* Artikujt e Porosisë */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>Artikujt e Përfshirë ({selectedOrder.items?.length || 0}):</h4>
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

            {/* Përmbledhja Financiare */}
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
                <span style={{ color: 'var(--color-primary)' }}>€{parseFloat(selectedOrder.total_price).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Mënyra e Pagesës: <strong>{selectedOrder.payment_method === 'cash_on_delivery' ? 'Para në dorëzim (Cash)' : selectedOrder.payment_method}</strong> ({selectedOrder.payment_status === 'paid' ? 'Paguar' : 'E papaguar'})
              </div>
            </div>

            {/* Historiku i Statuseve (Audit Trail) */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>Historiku i Statuseve (Audit Trail):</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedOrder.status_history?.map((hist) => (
                  <div key={hist.id} style={{ padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)', backgroundColor: '#fafafa', fontSize: '12.5px' }}>
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

            {/* Veprime për Ndryshimin e Statusit nga Modali */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              {selectedOrder.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'in_preparation')}
                  className="btn btn-outline"
                  style={{ fontSize: '13px' }}
                >
                  ⏳ Kaloni në Kuzhinë (Në Përgatitje)
                </button>
              )}
              {['confirmed', 'in_preparation'].includes(selectedOrder.status) && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'ready_for_pickup')}
                  className="btn btn-outline"
                  style={{ fontSize: '13px' }}
                >
                  📦 Shëno Gati për Marrje / Korrier
                </button>
              )}
              {['confirmed', 'in_preparation', 'ready_for_pickup'].includes(selectedOrder.status) && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                  className="btn btn-primary"
                  style={{ fontSize: '13px' }}
                >
                  ✅ Shëno e Përfunduar (Dorëzuar)
                </button>
              )}
              {['pending', 'confirmed'].includes(selectedOrder.status) && (
                <button
                  type="button"
                  onClick={() => {
                    const arsyeja = prompt('Shkruani arsyen e anulimit:');
                    if (arsyeja !== null) {
                      handleUpdateStatus(selectedOrder.id, 'cancelled');
                    }
                  }}
                  className="btn"
                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '13px' }}
                >
                  ✕ Anulo Porosinë
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
