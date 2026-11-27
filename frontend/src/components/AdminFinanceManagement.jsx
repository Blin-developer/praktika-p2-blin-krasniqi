import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  Percent,
  RotateCcw,
  Landmark,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Banknote,
  RefreshCw,
  Plus,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AdminFinanceManagement.css';

const formatEur = (val) => `€${Number(val || 0).toFixed(2)}`;

const TXN_TYPE_LABELS = {
  customer_payment: 'Pagesë Klienti',
  cod_collection: 'Arkëtim COD',
  restaurant_commission: 'Komision TASTIO',
  refund: 'Rimbursim',
  restaurant_payout: 'Payout Restoranti',
  courier_earning: 'Fitim Korrieri',
  financial_adjustment: 'Rregullim Financiar',
};

const STATUS_LABELS = {
  pending: { label: 'Në Pritje', cls: 'warn' },
  successful: { label: 'E Suksesshme', cls: 'ok' },
  completed: { label: 'E Përfunduar', cls: 'ok' },
  paid: { label: 'E Paguar', cls: 'ok' },
  earned: { label: 'E Fituar', cls: 'ok' },
  failed: { label: 'Dështuar', cls: 'err' },
  cancelled: { label: 'Anuluar', cls: 'muted' },
  reversed: { label: 'Kthyer Mbrapsht', cls: 'err' },
  refunded: { label: 'Rimbursuar', cls: 'err' },
  partially_refunded: { label: 'Rimbursuar Pjesërisht', cls: 'warn' },
  rejected: { label: 'Refuzuar', cls: 'err' },
};

export default function AdminFinanceManagement() {
  const { user } = useAuth();
  const isSuperAdmin = ['super_admin', 'admin'].includes(user?.role);

  const [subTab, setSubTab] = useState('overview'); // overview | transactions | commissions | refunds | payouts
  const [period, setPeriod] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Dashboard data
  const [adminDash, setAdminDash] = useState(null);
  const [restDash, setRestDash] = useState(null);
  const [restaurants, setRestaurants] = useState([]);

  // Transactions state
  const [txns, setTxns] = useState([]);
  const [txnMeta, setTxnMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [txnFilters, setTxnFilters] = useState({ type: 'all', status: 'all', payment_method: 'all', search: '', page: 1 });

  // Commissions state
  const [commissions, setCommissions] = useState([]);
  const [defaultRate, setDefaultRate] = useState('15.00');
  const [rateEdits, setRateEdits] = useState({});

  // Refunds state
  const [refunds, setRefunds] = useState([]);
  const [refundForm, setRefundForm] = useState({ order_id: '', amount: '', type: 'full', reason: '' });

  // Payouts state
  const [payouts, setPayouts] = useState([]);
  const [balances, setBalances] = useState([]);
  const [payoutForm, setPayoutForm] = useState({ restaurant_id: '', amount: '', notes: '' });
  const [adjForm, setAdjForm] = useState({ restaurant_id: '', amount: '', reason: '' });

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = period === 'custom' ? { date_from: dateFrom, date_to: dateTo } : { period };

      if (isSuperAdmin) {
        const res = await api.get('/admin/finance/dashboard', { params });
        setAdminDash(res.data?.data || null);
        setRestaurants(res.data?.restaurants || []);
      } else {
        const res = await api.get('/admin/finance/restaurant-dashboard', { params });
        setRestDash(res.data?.data || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Nuk u arrit të ngarkohen të dhënat financiare.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, period, dateFrom, dateTo]);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...txnFilters,
        ...(period === 'custom' ? { date_from: dateFrom, date_to: dateTo } : { period }),
      };
      const res = await api.get('/admin/finance/transactions', { params });
      setTxns(res.data?.data || []);
      setTxnMeta(res.data?.meta || { current_page: 1, last_page: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Gabim gjatë ngarkimit të transaksioneve.');
    } finally {
      setLoading(false);
    }
  }, [txnFilters, period, dateFrom, dateTo]);

  const loadCommissions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/finance/commissions');
      setCommissions(res.data?.data || []);
      setDefaultRate(String(res.data?.default_commission_rate ?? '15.00'));
      if (res.data?.restaurants?.length) {
        setRestaurants(res.data.restaurants);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gabim gjatë ngarkimit të komisioneve.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRefunds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/finance/refunds');
      setRefunds(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gabim gjatë ngarkimit të rimbursimeve.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/finance/payouts');
      setPayouts(res.data?.data || []);
      setBalances(res.data?.balances || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gabim gjatë ngarkimit të payouts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'overview') loadOverview();
    else if (subTab === 'transactions') loadTransactions();
    else if (subTab === 'commissions') loadCommissions();
    else if (subTab === 'refunds') loadRefunds();
    else if (subTab === 'payouts') loadPayouts();
  }, [subTab, loadOverview, loadTransactions, loadCommissions, loadRefunds, loadPayouts]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleSaveDefaultRate = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/admin/finance/commissions/settings', { default_commission_rate: defaultRate });
      showNotice('Norma standarde e komisionit u përditësua.');
      loadCommissions();
    } catch (err) {
      setError(err.response?.data?.message || 'Dështoi përditësimi i normës.');
    }
  };

  const handleSaveRestaurantRate = async (restaurantId) => {
    try {
      const val = rateEdits[restaurantId];
      await api.patch('/admin/finance/commissions/settings', {
        restaurant_id: restaurantId,
        restaurant_commission_rate: val === '' ? null : val,
      });
      showNotice('Norma e komisionit për restorantin u ruajt.');
      loadCommissions();
    } catch (err) {
      setError(err.response?.data?.message || 'Dështoi ruajtja e normës.');
    }
  };

  const handleCreateRefund = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.post('/admin/finance/refunds', refundForm);
      setRefundForm({ order_id: '', amount: '', type: 'full', reason: '' });
      showNotice('Rimbursimi i simuluar u regjistrua me sukses.');
      loadRefunds();
    } catch (err) {
      setError(err.response?.data?.message || 'Dështoi regjistrimi i rimbursimit.');
    }
  };

  const handleRefundDecision = async (id, decision) => {
    try {
      await api.post(`/admin/finance/refunds/${id}/decision`, { decision });
      showNotice(decision === 'approve' ? 'Rimbursimi u miratua.' : 'Rimbursimi u refuzua.');
      loadRefunds();
    } catch (err) {
      setError(err.response?.data?.message || 'Dështoi vendimi i rimbursimit.');
    }
  };

  const handleCreatePayout = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.post('/admin/finance/payouts', payoutForm);
      setPayoutForm({ restaurant_id: '', amount: '', notes: '' });
      showNotice('Payout-i i simuluar u krijua (në pritje).');
      loadPayouts();
    } catch (err) {
      setError(err.response?.data?.message || 'Dështoi krijimi i payout-it.');
    }
  };

  const handlePayoutAction = async (id, action) => {
    try {
      await api.post(`/admin/finance/payouts/${id}/${action}`);
      showNotice(action === 'complete' ? 'Payout-i u shënua i përfunduar.' : 'Payout-i u anulua.');
      loadPayouts();
    } catch (err) {
      setError(err.response?.data?.message || 'Dështoi veprimi mbi payout.');
    }
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/finance/adjustments', adjForm);
      setAdjForm({ restaurant_id: '', amount: '', reason: '' });
      showNotice('Rregullimi financiar u regjistrua.');
      loadPayouts();
    } catch (err) {
      setError(err.response?.data?.message || 'Dështoi rregullimi financiar.');
    }
  };

  const summary = isSuperAdmin ? adminDash?.summary : restDash?.summary;
  const chartData = isSuperAdmin ? (adminDash?.daily_chart || []) : (restDash?.daily_chart || []);
  const maxChartVal = Math.max(1, ...chartData.map((d) => Number(d.sales ?? d.revenue ?? 0)));

  return (
    <div className="tastio-fin-root">
      <div className="tastio-fin-banner">
        <div>
          <span className="tastio-fin-badge-demo">Mjedis Lokal Demonstrues • EUR</span>
          <h2>{isSuperAdmin ? 'Qendra Financiare e Platformës TASTIO' : 'Financat & Fitimet e Restorantit'}</h2>
          <p>Pagesat online, arkëtimet COD, komisionet dhe payouts janë të simuluara lokalisht me ruajtje reale në MySQL.</p>
        </div>

        <div className="tastio-fin-periods">
          {[
            { k: 'today', l: 'Sot' },
            { k: '7d', l: '7 Ditë' },
            { k: '30d', l: '30 Ditë' },
            { k: 'month', l: 'Ky Muaj' },
            { k: 'custom', l: 'Personalizuar' },
          ].map((p) => (
            <button
              key={p.k}
              type="button"
              className={`tastio-fin-period-btn ${period === p.k ? 'active' : ''}`}
              onClick={() => setPeriod(p.k)}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="tastio-fin-custom-dates">
          <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span>deri më</span>
          <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button type="button" className="btn btn-primary" onClick={loadOverview}>Apliko</button>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="tastio-fin-tabs">
        {[
          { id: 'overview', label: 'Përmbledhja', Icon: TrendingUp },
          { id: 'transactions', label: 'Transaksionet', Icon: Wallet },
          { id: 'commissions', label: 'Komisionet', Icon: Percent },
          { id: 'refunds', label: 'Rimbursimet', Icon: RotateCcw },
          { id: 'payouts', label: 'Payouts', Icon: Landmark },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tastio-fin-tab ${subTab === t.id ? 'active' : ''}`}
            onClick={() => setSubTab(t.id)}
          >
            <t.Icon size={15} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {notice && <div className="tastio-fin-alert ok"><CheckCircle2 size={16} /> {notice}</div>}
      {error && <div className="tastio-fin-alert err"><AlertCircle size={16} /> {error}</div>}

      {/* 1. OVERVIEW */}
      {subTab === 'overview' && (
        loading && !summary ? (
          <div className="tastio-fin-empty">Duke ngarkuar të dhënat financiare...</div>
        ) : isSuperAdmin && summary ? (
          <>
            <div className="tastio-fin-kpi-grid">
              <div className="tastio-fin-kpi">
                <span>Shitjet Totale të Platformës (GMV)</span>
                <strong>{formatEur(summary.total_platform_sales)}</strong>
                <small>Vlera bruto e porosive të paguara</small>
              </div>
              <div className="tastio-fin-kpi highlight">
                <span>Të Ardhurat nga Komisionet (TASTIO)</span>
                <strong>{formatEur(summary.total_platform_commissions)}</strong>
                <small>Norma standarde: {summary.default_commission_rate}%</small>
              </div>
              <div className="tastio-fin-kpi">
                <span>Fitimet Neto të Restoranteve</span>
                <strong>{formatEur(summary.total_restaurant_earnings)}</strong>
                <small>Pas zbritjes së komisionit</small>
              </div>
              <div className="tastio-fin-kpi">
                <span>Fitimet e Korrierëve</span>
                <strong>{formatEur(summary.total_courier_earnings)}</strong>
                <small>Kompensimi i dërgesave</small>
              </div>
              <div className="tastio-fin-kpi">
                <span>Pagesa të Suksesshme / COD Arkëtuar</span>
                <strong>{formatEur(summary.total_successful_payments)}</strong>
                <small>COD: {formatEur(summary.total_cod_collections)}</small>
              </div>
              <div className="tastio-fin-kpi">
                <span>Në Pritje / Dështime / Rimbursime</span>
                <strong>{formatEur(summary.pending_payments_amount)}</strong>
                <small>{summary.failed_payments_count} dështime • Rimb: {formatEur(summary.total_refunds)}</small>
              </div>
              <div className="tastio-fin-kpi">
                <span>Payouts në Pritje</span>
                <strong>{formatEur(summary.pending_payouts)}</strong>
                <small>Përfunduara: {formatEur(summary.completed_payouts)}</small>
              </div>
            </div>

            <div className="tastio-fin-two-col">
              <div className="tastio-fin-card">
                <h3>Performanca Ditore e Shitjeve</h3>
                {chartData.length === 0 ? (
                  <div className="tastio-fin-empty">Nuk ka të dhëna për këtë periudhë.</div>
                ) : (
                  <div className="tastio-fin-bars">
                    {chartData.map((d) => {
                      const val = Number(d.sales ?? d.revenue ?? 0);
                      const pct = Math.max(6, Math.round((val / maxChartVal) * 100));
                      return (
                        <div key={d.date} className="tastio-fin-bar-col" title={`${d.date}: ${formatEur(val)}`}>
                          <div className="tastio-fin-bar" style={{ height: `${pct}%` }} />
                          <span>{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="tastio-fin-card">
                <h3>Top Restorantet sipas të Hyrave</h3>
                {(adminDash?.top_restaurants || []).length === 0 ? (
                  <div className="tastio-fin-empty">Ende nuk ka komisione të regjistruara.</div>
                ) : (
                  <table className="tastio-fin-table">
                    <thead>
                      <tr>
                        <th>Restoranti</th>
                        <th>Porosi</th>
                        <th>Bruto</th>
                        <th>Komision</th>
                        <th>Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminDash.top_restaurants.map((r) => (
                        <tr key={r.restaurant_id}>
                          <td><strong>{r.restaurant?.name || `#${r.restaurant_id}`}</strong></td>
                          <td>{r.orders_count}</td>
                          <td>{formatEur(r.gross_sales)}</td>
                          <td style={{ color: '#0066ff', fontWeight: 700 }}>{formatEur(r.commissions)}</td>
                          <td style={{ color: '#059669', fontWeight: 700 }}>{formatEur(r.net_earnings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : summary ? (
          <>
            <div className="tastio-fin-kpi-grid">
              <div className="tastio-fin-kpi">
                <span>Shitjet Totale (Nëntotali)</span>
                <strong>{formatEur(summary.total_sales)}</strong>
                <small>{summary.paid_orders_count} porosi të paguara</small>
              </div>
              <div className="tastio-fin-kpi highlight">
                <span>Fitimi Neto i Restorantit</span>
                <strong>{formatEur(summary.net_earnings)}</strong>
                <small>Komisionet TASTIO: {formatEur(summary.tastio_commissions)}</small>
              </div>
              <div className="tastio-fin-kpi">
                <span>Bilanci i Disponueshëm</span>
                <strong>{formatEur(summary.available_balance)}</strong>
                <small>Payouts në pritje: {formatEur(summary.pending_payouts)}</small>
              </div>
              <div className="tastio-fin-kpi">
                <span>Payouts të Përfunduara</span>
                <strong>{formatEur(summary.completed_payouts)}</strong>
                <small>Vlera mesatare: {formatEur(summary.average_order_value)}</small>
              </div>
              <div className="tastio-fin-kpi">
                <span>Rimbursimet Totale</span>
                <strong>{formatEur(summary.refund_totals)}</strong>
                <small>Të hyra bruto: {formatEur(summary.gross_revenue)}</small>
              </div>
            </div>

            <div className="tastio-fin-card">
              <h3>Grafiku Ditor i të Hyrave</h3>
              {chartData.length === 0 ? (
                <div className="tastio-fin-empty">Nuk ka të dhëna për këtë periudhë.</div>
              ) : (
                <div className="tastio-fin-bars">
                  {chartData.map((d) => {
                    const val = Number(d.revenue ?? 0);
                    const pct = Math.max(6, Math.round((val / maxChartVal) * 100));
                    return (
                      <div key={d.date} className="tastio-fin-bar-col" title={`${d.date}: ${formatEur(val)}`}>
                        <div className="tastio-fin-bar" style={{ height: `${pct}%` }} />
                        <span>{d.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null
      )}

      {/* 2. TRANSACTIONS */}
      {subTab === 'transactions' && (
        <div className="tastio-fin-card">
          <div className="tastio-fin-filters">
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '34px' }}
                placeholder="Kërko sipas referencës TXN ose #porosisë..."
                value={txnFilters.search}
                onChange={(e) => setTxnFilters((p) => ({ ...p, search: e.target.value, page: 1 }))}
              />
            </div>
            <select
              className="form-control"
              value={txnFilters.type}
              onChange={(e) => setTxnFilters((p) => ({ ...p, type: e.target.value, page: 1 }))}
            >
              <option value="all">Të gjitha llojet</option>
              {Object.entries(TXN_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select
              className="form-control"
              value={txnFilters.status}
              onChange={(e) => setTxnFilters((p) => ({ ...p, status: e.target.value, page: 1 }))}
            >
              <option value="all">Të gjitha statuset</option>
              <option value="successful">E Suksesshme</option>
              <option value="pending">Në Pritje</option>
              <option value="failed">Dështuar</option>
              <option value="cancelled">Anuluar</option>
            </select>
          </div>

          {txns.length === 0 ? (
            <div className="tastio-fin-empty">Nuk u gjet asnjë transaksion.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tastio-fin-table">
                <thead>
                  <tr>
                    <th>Referenca</th>
                    <th>Lloji</th>
                    <th>Porosia / Restoranti</th>
                    <th>Metoda</th>
                    <th>Statusi</th>
                    <th>Shuma</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => {
                    const st = STATUS_LABELS[t.status] || { label: t.status, cls: 'muted' };
                    return (
                      <tr key={t.id}>
                        <td><code>{t.reference}</code></td>
                        <td>{TXN_TYPE_LABELS[t.type] || t.type}</td>
                        <td>
                          {t.order?.order_number ? `#${t.order.order_number}` : '—'}
                          {t.restaurant?.name ? ` • ${t.restaurant.name}` : ''}
                        </td>
                        <td>{t.payment_method === 'card' ? 'Online (Sim.)' : (t.payment_method === 'cash_on_delivery' ? 'COD' : 'Sistem')}</td>
                        <td><span className={`tastio-fin-pill ${st.cls}`}>{st.label}</span></td>
                        <td><strong>{formatEur(t.amount)}</strong></td>
                        <td>{new Date(t.created_at).toLocaleString('sq-AL')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {txnMeta.last_page > 1 && (
            <div className="tastio-fin-pagination">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={txnMeta.current_page <= 1}
                onClick={() => setTxnFilters((p) => ({ ...p, page: p.page - 1 }))}
              >
                <ChevronLeft size={14} /> Mbrapa
              </button>
              <span>Faqja {txnMeta.current_page} / {txnMeta.last_page}</span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={txnMeta.current_page >= txnMeta.last_page}
                onClick={() => setTxnFilters((p) => ({ ...p, page: p.page + 1 }))}
              >
                Para <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. COMMISSIONS */}
      {subTab === 'commissions' && (
        <div className="tastio-fin-stack">
          {isSuperAdmin && (
            <div className="tastio-fin-card">
              <h3>Konfigurimi i Normave të Komisionit</h3>
              <form onSubmit={handleSaveDefaultRate} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 700, fontSize: '13.5px' }}>Norma Standarde (%):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  className="form-control"
                  style={{ width: '120px' }}
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Ruaj Normën Standarde</button>
              </form>

              <div className="tastio-fin-rate-list">
                {restaurants.map((r) => (
                  <div key={r.id} className="tastio-fin-rate-row">
                    <span><strong>{r.name}</strong></span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="50"
                        placeholder={`Standard (${defaultRate}%)`}
                        className="form-control"
                        style={{ width: '150px' }}
                        value={rateEdits[r.id] ?? (r.commission_rate ?? '')}
                        onChange={(e) => setRateEdits((p) => ({ ...p, [r.id]: e.target.value }))}
                      />
                      <button type="button" className="btn btn-secondary" onClick={() => handleSaveRestaurantRate(r.id)}>
                        Ruaj
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="tastio-fin-card">
            <h3>Historiku i Komisioneve</h3>
            {commissions.length === 0 ? (
              <div className="tastio-fin-empty">Nuk ka komisione të regjistruara ende.</div>
            ) : (
              <table className="tastio-fin-table">
                <thead>
                  <tr>
                    <th>Porosia</th>
                    <th>Restoranti</th>
                    <th>Nëntotali</th>
                    <th>Norma</th>
                    <th>Komisioni TASTIO</th>
                    <th>Neto Restorant</th>
                    <th>Statusi</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => {
                    const st = STATUS_LABELS[c.status] || { label: c.status, cls: 'muted' };
                    return (
                      <tr key={c.id}>
                        <td>#{c.order?.order_number || c.order_id}</td>
                        <td>{c.restaurant?.name}</td>
                        <td>{formatEur(c.gross_subtotal)}</td>
                        <td>{c.commission_rate}%</td>
                        <td style={{ color: '#0066ff', fontWeight: 700 }}>{formatEur(c.commission_amount)}</td>
                        <td style={{ color: '#059669', fontWeight: 700 }}>{formatEur(c.restaurant_net_earnings)}</td>
                        <td><span className={`tastio-fin-pill ${st.cls}`}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 4. REFUNDS */}
      {subTab === 'refunds' && (
        <div className="tastio-fin-stack">
          <div className="tastio-fin-card">
            <h3>Krijo Rimbursim të Simuluar</h3>
            <form onSubmit={handleCreateRefund} className="tastio-fin-form-grid">
              <input
                type="number"
                required
                className="form-control"
                placeholder="ID e Porosisë"
                value={refundForm.order_id}
                onChange={(e) => setRefundForm((p) => ({ ...p, order_id: e.target.value }))}
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="form-control"
                placeholder="Shuma (€)"
                value={refundForm.amount}
                onChange={(e) => setRefundForm((p) => ({ ...p, amount: e.target.value }))}
              />
              <select
                className="form-control"
                value={refundForm.type}
                onChange={(e) => setRefundForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="full">Rimbursim i Plotë</option>
                <option value="partial">Rimbursim i Pjesshëm</option>
              </select>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Arsyeja e rimbursimit"
                value={refundForm.reason}
                onChange={(e) => setRefundForm((p) => ({ ...p, reason: e.target.value }))}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={15} /> {isSuperAdmin ? 'Aprovo Rimbursimin' : 'Dërgo Kërkesën'}
              </button>
            </form>
          </div>

          <div className="tastio-fin-card">
            <h3>Lista e Rimbursimeve (E Simuluar)</h3>
            {refunds.length === 0 ? (
              <div className="tastio-fin-empty">Nuk ka rimbursime të regjistruara.</div>
            ) : (
              <table className="tastio-fin-table">
                <thead>
                  <tr>
                    <th>Referenca</th>
                    <th>Porosia</th>
                    <th>Shuma</th>
                    <th>Lloji</th>
                    <th>Arsyeja</th>
                    <th>Statusi</th>
                    {isSuperAdmin && <th>Veprime</th>}
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => {
                    const st = STATUS_LABELS[r.status] || { label: r.status, cls: 'muted' };
                    return (
                      <tr key={r.id}>
                        <td><code>{r.reference}</code></td>
                        <td>#{r.order?.order_number || r.order_id}</td>
                        <td><strong>{formatEur(r.amount)}</strong></td>
                        <td>{r.type === 'full' ? 'I Plotë' : 'I Pjesshëm'}</td>
                        <td>{r.reason}</td>
                        <td><span className={`tastio-fin-pill ${st.cls}`}>{st.label}</span></td>
                        {isSuperAdmin && (
                          <td>
                            {r.status === 'pending' && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="button" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleRefundDecision(r.id, 'approve')}>Mirato</button>
                                <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleRefundDecision(r.id, 'reject')}>Refuzo</button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 5. PAYOUTS */}
      {subTab === 'payouts' && (
        <div className="tastio-fin-stack">
          {isSuperAdmin && (
            <>
              <div className="tastio-fin-card">
                <h3>Bilancet e Restoranteve & Krijimi i Payout-it të Simuluar</h3>
                <div className="tastio-fin-balances-grid">
                  {balances.map((b) => (
                    <div key={b.restaurant_id} className="tastio-fin-balance-box">
                      <strong>{b.name}</strong>
                      <div>Disponueshëm: <strong style={{ color: '#059669' }}>{formatEur(b.available_balance)}</strong></div>
                      <small>Neto: {formatEur(b.net_earnings)} • Përfunduar: {formatEur(b.completed_payouts)}</small>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleCreatePayout} className="tastio-fin-form-grid" style={{ marginTop: '14px' }}>
                  <select
                    required
                    className="form-control"
                    value={payoutForm.restaurant_id}
                    onChange={(e) => setPayoutForm((p) => ({ ...p, restaurant_id: e.target.value }))}
                  >
                    <option value="">Zgjidh restorantin...</option>
                    {balances.map((b) => (
                      <option key={b.restaurant_id} value={b.restaurant_id}>{b.name} (Disp: {formatEur(b.available_balance)})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="form-control"
                    placeholder="Shuma (€)"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Shënime (opsionale)"
                    value={payoutForm.notes}
                    onChange={(e) => setPayoutForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                  <button type="submit" className="btn btn-primary">Krijo Payout (Simuluar)</button>
                </form>
              </div>

              <div className="tastio-fin-card">
                <h3>Rregullim Financiar Manual</h3>
                <form onSubmit={handleCreateAdjustment} className="tastio-fin-form-grid">
                  <select
                    required
                    className="form-control"
                    value={adjForm.restaurant_id}
                    onChange={(e) => setAdjForm((p) => ({ ...p, restaurant_id: e.target.value }))}
                  >
                    <option value="">Zgjidh restorantin...</option>
                    {balances.map((b) => <option key={b.restaurant_id} value={b.restaurant_id}>{b.name}</option>)}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-control"
                    placeholder="Shuma (+ ose - €)"
                    value={adjForm.amount}
                    onChange={(e) => setAdjForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Arsyeja e rregullimit"
                    value={adjForm.reason}
                    onChange={(e) => setAdjForm((p) => ({ ...p, reason: e.target.value }))}
                  />
                  <button type="submit" className="btn btn-secondary">Regjistro Rregullim</button>
                </form>
              </div>
            </>
          )}

          <div className="tastio-fin-card">
            <h3>Historiku i Payouts (Të Simuluara)</h3>
            {payouts.length === 0 ? (
              <div className="tastio-fin-empty">Nuk ka payouts të regjistruara.</div>
            ) : (
              <table className="tastio-fin-table">
                <thead>
                  <tr>
                    <th>Referenca</th>
                    <th>Restoranti</th>
                    <th>Shuma</th>
                    <th>Statusi</th>
                    <th>Data</th>
                    {isSuperAdmin && <th>Veprime</th>}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => {
                    const st = STATUS_LABELS[p.status] || { label: p.status, cls: 'muted' };
                    return (
                      <tr key={p.id}>
                        <td><code>{p.reference}</code></td>
                        <td>{p.restaurant?.name}</td>
                        <td><strong>{formatEur(p.amount)}</strong></td>
                        <td><span className={`tastio-fin-pill ${st.cls}`}>{st.label}</span></td>
                        <td>{new Date(p.created_at).toLocaleString('sq-AL')}</td>
                        {isSuperAdmin && (
                          <td>
                            {p.status === 'pending' && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="button" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handlePayoutAction(p.id, 'complete')}>Përfundo</button>
                                <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handlePayoutAction(p.id, 'cancel')}>Anulo</button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
