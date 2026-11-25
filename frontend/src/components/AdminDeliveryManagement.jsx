import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck,
  Users,
  MapPin,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  UserPlus,
  Eye,
  Edit3,
  Trash2,
  X,
  Power,
  Navigation,
  Search
} from 'lucide-react';
import api from '../services/api';
import DeliveryMap from './DeliveryMap';

export default function AdminDeliveryManagement() {
  const [subTab, setSubTab] = useState('dispatch'); // 'dispatch' | 'couriers' | 'zones'
  const [deliveries, setDeliveries] = useState([]);
  const [summary, setSummary] = useState({});
  const [couriers, setCouriers] = useState([]);
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  // Filtrat e Dërgesave
  const [statusFilter, setStatusFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [assignModal, setAssignModal] = useState({ open: false, delivery: null, selectedCourierId: '', forceReassign: false });
  const [detailModal, setDetailModal] = useState({ open: false, delivery: null });
  const [newCourierModal, setNewCourierModal] = useState(false);
  const [courierForm, setCourierForm] = useState({
    name: '', email: '', password: '', phone: '', branch_id: '', vehicle_type: 'scooter', license_plate: '', max_concurrent_deliveries: 2
  });
  const [zoneModal, setZoneModal] = useState({ open: false, editing: null });
  const [zoneForm, setZoneForm] = useState({
    branch_id: '', name: '', city: 'Prishtinë', description: '', delivery_fee: '1.50', min_order_amount: '5.00', estimated_delivery_minutes: 30, is_active: true
  });

  const lastSyncRef = useRef(null);

  const loadAll = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (courierFilter) params.courier_id = courierFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (search.trim()) params.search = search.trim();

      const [resDel, resCouriers, resZones, resBranches] = await Promise.all([
        api.get('/admin/deliveries', { params }),
        api.get('/admin/couriers'),
        api.get('/admin/delivery-zones'),
        api.get('/branches').catch(() => ({ data: { data: [] } })),
      ]);

      setDeliveries(resDel.data?.data || []);
      setSummary(resDel.data?.summary || {});
      setCouriers(resCouriers.data?.data || []);
      setZones(resZones.data?.data || []);
      const bList = resBranches.data?.data || resBranches.data || [];
      setBranches(Array.isArray(bList) ? bList : []);
    } catch (err) {
      console.error('Dështoi ngarkimi i modulit të dërgesave', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, courierFilter, dateFrom, search]);

  useEffect(() => {
    loadAll();
    const timer = setInterval(async () => {
      try {
        const res = await api.get('/admin/deliveries/sync');
        const cs = res.data?.data?.checksum;
        if (cs && lastSyncRef.current && cs !== lastSyncRef.current) {
          loadAll(true);
        }
        if (cs) lastSyncRef.current = cs;
      } catch {
        // Hesht
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [loadAll]);

  const handleAutoAssign = async (deliveryId) => {
    try {
      setBusyId(deliveryId);
      await api.post(`/admin/deliveries/${deliveryId}/auto-assign`);
      await loadAll(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Nuk u gjet korrier i lirë për caktim automatik.');
    } finally {
      setBusyId(null);
    }
  };

  const handleManualAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignModal.delivery || !assignModal.selectedCourierId) return;
    try {
      setBusyId(assignModal.delivery.id);
      await api.post(`/admin/deliveries/${assignModal.delivery.id}/assign`, {
        courier_id: Number(assignModal.selectedCourierId),
        force_reassign: assignModal.forceReassign,
      });
      setAssignModal({ open: false, delivery: null, selectedCourierId: '', forceReassign: false });
      await loadAll(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi caktimi manual.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateCourier = async (e) => {
    e.preventDefault();
    try {
      setBusyId('new-courier');
      await api.post('/admin/couriers', {
        ...courierForm,
        branch_id: courierForm.branch_id ? Number(courierForm.branch_id) : null,
      });
      setNewCourierModal(false);
      setCourierForm({ name: '', email: '', password: '', phone: '', branch_id: '', vehicle_type: 'scooter', license_plate: '', max_concurrent_deliveries: 2 });
      await loadAll(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi regjistrimi i korrierit.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleCourierActive = async (c) => {
    try {
      setBusyId(`c-${c.id}`);
      await api.patch(`/admin/couriers/${c.id}`, { is_active: !c.is_active });
      await loadAll(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi përditësimi i korrierit.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    try {
      setBusyId('zone-save');
      if (zoneModal.editing) {
        await api.put(`/admin/delivery-zones/${zoneModal.editing.id}`, zoneForm);
      } else {
        await api.post('/admin/delivery-zones', {
          ...zoneForm,
          branch_id: Number(zoneForm.branch_id || branches[0]?.id || 1),
        });
      }
      setZoneModal({ open: false, editing: null });
      await loadAll(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi ruajtja e zonës.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('A jeni të sigurt që dëshironi ta fshini këtë zonë dërgese?')) return;
    try {
      await api.delete(`/admin/delivery-zones/${zoneId}`);
      await loadAll(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi fshirja e zonës.');
    }
  };

  const statusBadge = (st) => {
    const map = {
      pending_assignment: { label: 'Pa Korrier', cls: 'badge-warning' },
      assigned: { label: 'Caktuar (Pret Pranim)', cls: 'badge-primary' },
      accepted: { label: 'Pranuar', cls: 'badge-primary' },
      heading_to_restaurant: { label: 'Drejt Restorantit', cls: 'badge-primary' },
      arrived_at_restaurant: { label: 'Në Restorant', cls: 'badge-primary' },
      picked_up: { label: 'Marrë', cls: 'badge-primary' },
      heading_to_customer: { label: 'Drejt Klientit', cls: 'badge-primary' },
      arrived_at_customer: { label: 'Te Klienti', cls: 'badge-primary' },
      delivered: { label: 'Dorëzuar', cls: 'badge-success' },
      failed: { label: 'Dështuar', cls: 'badge-danger' },
      cancelled: { label: 'Anuluar', cls: 'badge-danger' },
    };
    const info = map[st] || { label: st, cls: 'badge-outline' };
    return <span className={`badge ${info.cls}`}>{info.label}</span>;
  };

  return (
    <div>
      {/* KPI Cards */}
      <div className="tastio-kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="tastio-kpi-card">
          <div className="tastio-kpi-label">Pa Korrier (Dispeçim)</div>
          <div className="tastio-kpi-value" style={{ color: '#d97706' }}>{summary.pending_assignment ?? 0}</div>
        </div>
        <div className="tastio-kpi-card">
          <div className="tastio-kpi-label">Dërgesa Aktive në Rrugë</div>
          <div className="tastio-kpi-value" style={{ color: '#0066ff' }}>{summary.active_in_transit ?? 0}</div>
        </div>
        <div className="tastio-kpi-card">
          <div className="tastio-kpi-label">Korrierë të Lirë / Zënë</div>
          <div className="tastio-kpi-value">
            <span style={{ color: '#10b981' }}>{summary.available_couriers ?? 0}</span>
            <span style={{ fontSize: '15px', color: '#94a3b8', margin: '0 4px' }}>/</span>
            <span style={{ color: '#f59e0b' }}>{summary.busy_couriers ?? 0}</span>
          </div>
        </div>
        <div className="tastio-kpi-card">
          <div className="tastio-kpi-label">Dorëzuar Sot</div>
          <div className="tastio-kpi-value" style={{ color: '#10b981' }}>{summary.delivered_today ?? 0}</div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setSubTab('dispatch')} className={`btn ${subTab === 'dispatch' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '10px' }}>
            <Truck size={15} />
            <span>Dispeçimi & Dërgesat</span>
          </button>
          <button type="button" onClick={() => setSubTab('couriers')} className={`btn ${subTab === 'couriers' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '10px' }}>
            <Users size={15} />
            <span>Korrierët ({couriers.length})</span>
          </button>
          <button type="button" onClick={() => setSubTab('zones')} className={`btn ${subTab === 'zones' ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '10px' }}>
            <MapPin size={15} />
            <span>Zonat e Dërgesës ({zones.length})</span>
          </button>
        </div>

        <button type="button" onClick={() => loadAll()} className="btn btn-secondary" style={{ borderRadius: '10px' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Rifresko</span>
        </button>
      </div>

      {/* =======================================================
          TAB 1: DISPEÇIMI & DËRGESAT
          ======================================================= */}
      {subTab === 'dispatch' && (
        <div className="tastio-panel-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: '240px' }}
              placeholder="Kërko nr. porosie, klient, adresë..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="form-control" style={{ maxWidth: '180px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Të gjitha statuset</option>
              <option value="active">Vetëm Aktive</option>
              <option value="pending_assignment">Pa Korrier</option>
              <option value="assigned">Të Caktuara</option>
              <option value="picked_up">Të Marra</option>
              <option value="heading_to_customer">Drejt Klientit</option>
              <option value="delivered">Të Dorëzuara</option>
              <option value="failed">Të Dështuara</option>
            </select>
            <select className="form-control" style={{ maxWidth: '180px' }} value={courierFilter} onChange={(e) => setCourierFilter(e.target.value)}>
              <option value="">Të gjithë korrierët</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>{c.user?.name}</option>
              ))}
            </select>
            <input type="date" className="form-control" style={{ maxWidth: '160px' }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="tastio-table">
              <thead>
                <tr>
                  <th>Porosia</th>
                  <th>Restoranti & Klienti</th>
                  <th>Korrieri</th>
                  <th>Statusi</th>
                  <th>Tarifa</th>
                  <th style={{ textAlign: 'right' }}>Veprime</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      Nuk u gjet asnjë dërgesë për filtrat e zgjedhur.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((del) => (
                    <tr key={del.id}>
                      <td>
                        <strong>#{del.order?.order_number}</strong>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {new Date(del.created_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{del.branch?.name}</div>
                        <div style={{ fontSize: '12px', color: '#475569' }}>
                          {del.order?.customer_name} • {del.dropoff_address}
                        </div>
                      </td>
                      <td>
                        {del.courier?.user ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{del.courier.user.name}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{del.courier.vehicle_type}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#d97706', fontWeight: 700, fontSize: '12.5px' }}>Pa korrier</span>
                        )}
                      </td>
                      <td>{statusBadge(del.status)}</td>
                      <td><strong>€{Number(del.delivery_fee || 0).toFixed(2)}</strong></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {del.status === 'pending_assignment' && (
                            <button
                              type="button"
                              disabled={busyId === del.id}
                              onClick={() => handleAutoAssign(del.id)}
                              className="btn btn-primary"
                              style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '8px' }}
                              title="Cakto automatikisht korrierin më të përshtatshëm"
                            >
                              <Zap size={13} />
                              <span>Auto</span>
                            </button>
                          )}
                          {!['delivered', 'cancelled'].includes(del.status) && (
                            <button
                              type="button"
                              onClick={() => setAssignModal({
                                open: true,
                                delivery: del,
                                selectedCourierId: del.courier_id ? String(del.courier_id) : '',
                                forceReassign: !!del.courier_id,
                              })}
                              className="btn btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '8px' }}
                            >
                              {del.courier_id ? 'Ricakto' : 'Cakto'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await api.get(`/admin/deliveries/${del.id}`);
                              setDetailModal({ open: true, delivery: res.data?.data || del });
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '8px' }}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================
          TAB 2: KORRIERËT
          ======================================================= */}
      {subTab === 'couriers' && (
        <div className="tastio-panel-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Lista e Korrierëve</h3>
            <button type="button" onClick={() => setNewCourierModal(true)} className="btn btn-primary" style={{ borderRadius: '10px', fontSize: '13px' }}>
              <UserPlus size={15} />
              <span>Shto Korrier</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="tastio-table">
              <thead>
                <tr>
                  <th>Korrieri</th>
                  <th>Automjeti</th>
                  <th>Disponueshmëria</th>
                  <th>Ngarkesa Aktive</th>
                  <th>Performanca</th>
                  <th style={{ textAlign: 'right' }}>Statusi</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.user?.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{c.user?.phone} • {c.user?.email}</div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{c.vehicle_type}</span>
                      {c.license_plate && <div style={{ fontSize: '11.5px', color: '#64748b' }}>{c.license_plate}</div>}
                    </td>
                    <td>
                      <span className={`badge ${c.availability_status === 'available' ? 'badge-success' : (c.availability_status === 'busy' ? 'badge-warning' : 'badge-outline')}`}>
                        {c.availability_status === 'available' ? 'I Lirë' : (c.availability_status === 'busy' ? 'Në Dërgesë' : 'Offline')}
                      </span>
                    </td>
                    <td>
                      <strong>{c.active_deliveries_count ?? 0}</strong> / {c.max_concurrent_deliveries}
                    </td>
                    <td>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{c.successful_deliveries} ✓</span>
                      {' • '}
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{c.failed_deliveries} ✕</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        disabled={busyId === `c-${c.id}`}
                        onClick={() => handleToggleCourierActive(c)}
                        className={`btn ${c.is_active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '8px' }}
                      >
                        <Power size={13} />
                        <span>{c.is_active ? 'Çaktivizo' : 'Aktivizo'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================
          TAB 3: ZONAT E DËRGESËS
          ======================================================= */}
      {subTab === 'zones' && (
        <div className="tastio-panel-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Zonat & Tarifat e Dërgesës</h3>
            <button
              type="button"
              onClick={() => {
                setZoneForm({
                  branch_id: branches[0]?.id ? String(branches[0].id) : '1',
                  name: '', city: 'Prishtinë', description: '', delivery_fee: '1.50', min_order_amount: '5.00', estimated_delivery_minutes: 30, is_active: true
                });
                setZoneModal({ open: true, editing: null });
              }}
              className="btn btn-primary"
              style={{ borderRadius: '10px', fontSize: '13px' }}
            >
              <Plus size={15} />
              <span>Shto Zonë të Re</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="tastio-table">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Dega</th>
                  <th>Tarifa</th>
                  <th>Porosia Min.</th>
                  <th>Koha (ETA)</th>
                  <th>Statusi</th>
                  <th style={{ textAlign: 'right' }}>Veprime</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id}>
                    <td>
                      <strong>{z.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{z.city} {z.description ? `• ${z.description}` : ''}</div>
                    </td>
                    <td>{z.branch?.name || `Dega #${z.branch_id}`}</td>
                    <td><strong>€{Number(z.delivery_fee).toFixed(2)}</strong></td>
                    <td>€{Number(z.min_order_amount).toFixed(2)}</td>
                    <td>~{z.estimated_delivery_minutes} min</td>
                    <td>
                      <span className={`badge ${z.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {z.is_active ? 'Aktive' : 'Joaktive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setZoneForm({
                            branch_id: String(z.branch_id),
                            name: z.name,
                            city: z.city,
                            description: z.description || '',
                            delivery_fee: String(z.delivery_fee),
                            min_order_amount: String(z.min_order_amount),
                            estimated_delivery_minutes: z.estimated_delivery_minutes,
                            is_active: z.is_active,
                          });
                          setZoneModal({ open: true, editing: z });
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '5px 8px', marginRight: '6px' }}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteZone(z.id)}
                        className="btn btn-secondary"
                        style={{ padding: '5px 8px', color: '#dc2626' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Caktim Manual i Korrierit */}
      {assignModal.open && (
        <div className="kds-drawer-backdrop" onClick={() => setAssignModal({ open: false, delivery: null, selectedCourierId: '', forceReassign: false })}>
          <div style={{ margin: 'auto', width: '92%', maxWidth: '460px', background: '#fff', borderRadius: '18px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>
              Cakto Korrierin — #{assignModal.delivery?.order?.order_number}
            </h3>
            <form onSubmit={handleManualAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
              <select
                required
                className="form-control"
                value={assignModal.selectedCourierId}
                onChange={(e) => setAssignModal((p) => ({ ...p, selectedCourierId: e.target.value }))}
              >
                <option value="">Zgjidh korrierin...</option>
                {couriers.filter((c) => c.is_active && c.availability_status !== 'offline').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user?.name} ({c.availability_status === 'available' ? 'I lirë' : 'I zënë'}) — {c.active_deliveries_count}/{c.max_concurrent_deliveries} aktive
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAssignModal({ open: false, delivery: null, selectedCourierId: '', forceReassign: false })}>
                  Anulo
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={busyId !== null}>
                  Konfirmo Caktimin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detajet dhe Harta Live */}
      {detailModal.open && detailModal.delivery && (
        <div className="kds-drawer-backdrop" onClick={() => setDetailModal({ open: false, delivery: null })}>
          <div style={{ margin: 'auto', width: '94%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '18px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                Detajet e Dërgesës #{detailModal.delivery.order?.order_number}
              </h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setDetailModal({ open: false, delivery: null })}>
                <X size={16} />
              </button>
            </div>

            <DeliveryMap
              pickup={{
                lat: detailModal.delivery.pickup_latitude ?? detailModal.delivery.branch?.latitude,
                lng: detailModal.delivery.pickup_longitude ?? detailModal.delivery.branch?.longitude,
                label: detailModal.delivery.branch?.name || 'Restoranti',
              }}
              dropoff={{
                lat: detailModal.delivery.dropoff_latitude,
                lng: detailModal.delivery.dropoff_longitude,
                label: detailModal.delivery.order?.customer_name || 'Klienti',
              }}
              courier={{
                lat: detailModal.delivery.courier?.current_latitude,
                lng: detailModal.delivery.courier?.current_longitude,
                label: detailModal.delivery.courier?.user?.name || 'Korrieri',
              }}
              etaMinutes={detailModal.delivery.eta_minutes}
              height={240}
            />

            {detailModal.delivery.failure_reason && (
              <div style={{ marginTop: '14px', padding: '10px 14px', background: '#fef2f2', borderRadius: '10px', color: '#991b1b', fontSize: '13px' }}>
                <strong>Arsyeja e Incidentit:</strong> {detailModal.delivery.failure_reason}
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <strong style={{ fontSize: '13.5px' }}>Historiku i Statuseve</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(detailModal.delivery.status_history || []).map((h) => (
                  <div key={h.id} style={{ fontSize: '12.5px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>{h.to_status}</strong> — {h.notes}</span>
                    <span style={{ color: '#64748b' }}>{new Date(h.created_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Shto Korrier të Ri */}
      {newCourierModal && (
        <div className="kds-drawer-backdrop" onClick={() => setNewCourierModal(false)}>
          <div style={{ margin: 'auto', width: '92%', maxWidth: '480px', background: '#fff', borderRadius: '18px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '18px', fontWeight: 800 }}>Regjistro Korrier të Ri</h3>
            <form onSubmit={handleCreateCourier} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input required className="form-control" placeholder="Emri i plotë" value={courierForm.name} onChange={(e) => setCourierForm((p) => ({ ...p, name: e.target.value }))} />
              <input required type="email" className="form-control" placeholder="Email" value={courierForm.email} onChange={(e) => setCourierForm((p) => ({ ...p, email: e.target.value }))} />
              <input required type="password" minLength={8} className="form-control" placeholder="Fjalëkalimi (min. 8 karaktere)" value={courierForm.password} onChange={(e) => setCourierForm((p) => ({ ...p, password: e.target.value }))} />
              <input required className="form-control" placeholder="Telefoni (+383...)" value={courierForm.phone} onChange={(e) => setCourierForm((p) => ({ ...p, phone: e.target.value }))} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="form-control" value={courierForm.vehicle_type} onChange={(e) => setCourierForm((p) => ({ ...p, vehicle_type: e.target.value }))}>
                  <option value="scooter">Skuter / Motoçikletë</option>
                  <option value="bicycle">Biçikletë</option>
                  <option value="car">Automobil</option>
                  <option value="on_foot">Në këmbë</option>
                </select>
                <input className="form-control" placeholder="Targa (opsionale)" value={courierForm.license_plate} onChange={(e) => setCourierForm((p) => ({ ...p, license_plate: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setNewCourierModal(false)}>Anulo</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={busyId === 'new-courier'}>Regjistro Korrierin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Krijo / Edito Zonë Dërgese */}
      {zoneModal.open && (
        <div className="kds-drawer-backdrop" onClick={() => setZoneModal({ open: false, editing: null })}>
          <div style={{ margin: 'auto', width: '92%', maxWidth: '480px', background: '#fff', borderRadius: '18px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '18px', fontWeight: 800 }}>
              {zoneModal.editing ? 'Përditëso Zonën e Dërgesës' : 'Shto Zonë të Re Dërgese'}
            </h3>
            <form onSubmit={handleSaveZone} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!zoneModal.editing && branches.length > 0 && (
                <select className="form-control" value={zoneForm.branch_id} onChange={(e) => setZoneForm((p) => ({ ...p, branch_id: e.target.value }))}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              <input required className="form-control" placeholder="Emri i zonës (p.sh. Qendër & Ulpianë)" value={zoneForm.name} onChange={(e) => setZoneForm((p) => ({ ...p, name: e.target.value }))} />
              <input required className="form-control" placeholder="Qyteti" value={zoneForm.city} onChange={(e) => setZoneForm((p) => ({ ...p, city: e.target.value }))} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Tarifa (€)</label>
                  <input required type="number" step="0.10" min="0" className="form-control" value={zoneForm.delivery_fee} onChange={(e) => setZoneForm((p) => ({ ...p, delivery_fee: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Min. Porosia (€)</label>
                  <input required type="number" step="0.50" min="0" className="form-control" value={zoneForm.min_order_amount} onChange={(e) => setZoneForm((p) => ({ ...p, min_order_amount: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>ETA (min)</label>
                  <input required type="number" min="5" className="form-control" value={zoneForm.estimated_delivery_minutes} onChange={(e) => setZoneForm((p) => ({ ...p, estimated_delivery_minutes: Number(e.target.value) }))} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input type="checkbox" checked={zoneForm.is_active} onChange={(e) => setZoneForm((p) => ({ ...p, is_active: e.target.checked }))} />
                Zona është aktive
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setZoneModal({ open: false, editing: null })}>Anulo</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={busyId === 'zone-save'}>Ruaj Zonën</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
