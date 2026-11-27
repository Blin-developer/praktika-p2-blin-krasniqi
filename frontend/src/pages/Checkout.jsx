import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  MapPin,
  Wallet,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Loader2,
  Banknote,
  CreditCard,
  Clock,
  Calendar,
  Zap,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    items,
    subtotal,
    deliveryFee,
    grandTotal,
    activeRestaurant,
    activeBranchId,
    clearCart,
  } = useCart();

  // Ridrejto nëse shporta është bosh
  useEffect(() => {
    if (items.length === 0) {
      navigate('/restorante');
    }
  }, [items.length, navigate]);

  // ——— Fulfillment State (ASAP vs Scheduled) ———
  const [fulfillmentType, setFulfillmentType] = useState('asap'); // 'asap' | 'scheduled'
  const [dynamicWait, setDynamicWait] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); // { id, start_time, end_time, display }
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [datesLoading, setDatesLoading] = useState(false);
  const [datesError, setDatesError] = useState(null);

  // ——— Zonat e Dërgesës (Faza 6) ———
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');

  // ——— Form State ———
  const [form, setForm] = useState({
    customerName: user?.name || '',
    customerEmail: user?.email || '',
    customerPhone: user?.phone || '',
    customerNote: '',
    city: 'Prishtinë',
    street: '',
    building: '',
    floor: '',
    deliveryNotes: '',
    saveAddress: false,
    paymentMethod: 'cash_on_delivery',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Mekanizëm i brendshëm testimi (opsional përmes ?sim_outcome=declined|pending ose sessionStorage)
  const simOutcome = (() => {
    const param = new URLSearchParams(window.location.search).get('sim_outcome')
      || window.sessionStorage?.getItem('tastio_test_sim_outcome');
    return ['success', 'declined', 'pending'].includes(param) ? param : 'success';
  })();
  const [savedAddresses, setSavedAddresses] = useState([]);

  // Plotëso nga Auth nëse ndryshon useri (lazy login)
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || user.name || '',
        customerEmail: prev.customerEmail || user.email || '',
        customerPhone: prev.customerPhone || user.phone || '',
      }));
    }
  }, [user]);

  // Ngarko adresat e ruajtura
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/auth/user/addresses')
        .then((res) => {
          const list = res.data?.data || [];
          setSavedAddresses(list);
          // Plotëso adresën default nëse ekziston
          const def = list.find((a) => a.is_default);
          if (def) {
            setForm((prev) => ({
              ...prev,
              city: def.city || prev.city,
              street: def.street || '',
              building: def.building || '',
              floor: def.floor || '',
              deliveryNotes: def.notes || '',
            }));
          }
        })
        .catch(() => {
          // Heshti nëse nuk ka adresa
        });
    }
  }, [isAuthenticated]);

  // Ngarko kohën dinamike të pritjes dhe datat kur branch-i ngarkohet
  const resolvedBranchIdForSlots = activeBranchId ? parseInt(activeBranchId, 10) : 1;

  const loadAvailableDates = useCallback(() => {
    if (!resolvedBranchIdForSlots) return;
    setDatesLoading(true);
    setDatesError(null);
    const orderType = 'delivery';

    api.get(`/branches/${resolvedBranchIdForSlots}/time-slots`, { params: { order_type: orderType } })
      .then((res) => {
        if (res.data?.success) {
          const dates = res.data.dates || [];
          setAvailableDates(dates);
          if (dates.length > 0) {
            setSelectedDate(dates[0].date);
            setAvailableSlots(res.data.data?.slots || []);
          } else {
            setAvailableSlots([]);
          }
        } else {
          setDatesError(res.data?.message || 'Nuk mund të ngarkoheshin datat e planifikimit.');
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Dështoi lidhja me serverin për ngarkimin e datave të planifikimit.';
        setDatesError(msg);
      })
      .finally(() => {
        setDatesLoading(false);
      });
  }, [resolvedBranchIdForSlots]);

  useEffect(() => {
    if (!resolvedBranchIdForSlots) return;
    const orderType = 'delivery';
    api.get(`/branches/${resolvedBranchIdForSlots}/dynamic-wait-time`, { params: { order_type: orderType } })
      .then((res) => {
        if (res.data?.success) setDynamicWait(res.data.data);
      })
      .catch(() => {});

    api.get(`/branches/${resolvedBranchIdForSlots}/delivery-zones`)
      .then((res) => {
        const z = res.data?.data || [];
        setDeliveryZones(z);
        if (z.length > 0 && !selectedZoneId) {
          setSelectedZoneId(String(z[0].id));
        }
      })
      .catch(() => {});

    loadAvailableDates();
  }, [resolvedBranchIdForSlots, loadAvailableDates]);

  // Ngarko slotet kur data e zgjedhur ndryshon manualisht nga përdoruesi
  useEffect(() => {
    if (!selectedDate || fulfillmentType !== 'scheduled') return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    api.get(`/branches/${resolvedBranchIdForSlots}/time-slots`, {
      params: { date: selectedDate, order_type: 'delivery' }
    })
      .then((res) => {
        if (res.data?.success) {
          setAvailableSlots(res.data.data?.slots || []);
        }
      })
      .catch(() => {})
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, fulfillmentType, resolvedBranchIdForSlots]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (globalError) setGlobalError('');
  };

  // Zgjidh adresën e ruajtur nga lista
  const handleSelectSavedAddress = (addr) => {
    setForm((prev) => ({
      ...prev,
      city: addr.city || 'Prishtinë',
      street: addr.street || '',
      building: addr.building || '',
      floor: addr.floor || '',
      deliveryNotes: addr.notes || '',
    }));
  };

  // ——— Validimi i plotë ———
  const validateForm = useCallback(() => {
    const errors = {};

    if (!form.customerName.trim()) errors.customerName = 'Emri është i detyrueshëm.';
    if (!form.customerEmail.trim()) {
      errors.customerEmail = 'Email-i është i detyrueshëm.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      errors.customerEmail = 'Ju lutem shkruani një email të vlefshëm.';
    }
    if (!form.customerPhone.trim()) errors.customerPhone = 'Numri i telefonit është i detyrueshëm.';

    if (!form.street.trim()) errors.street = 'Rruga/Adresa është e detyrueshme.';
    if (!form.city.trim()) errors.city = 'Qyteti është i detyrueshëm.';

    if (!form.paymentMethod) errors.paymentMethod = 'Zgjidhni mënyrën e pagesës.';

    return errors;
  }, [form]);

  // ——— Dërgimi i Porosisë ———
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setGlobalError('');

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    // Ndërto payload-in e artikujve
    const orderItems = items.map((item) => ({
      product_id: item.product?.id || item.id,
      name: item.product?.name || item.name || item.product?.emri || item.emri,
      quantity: item.quantity || 1,
      selected_choices: item.selectedChoices || {},
    }));

    // Gjej degën aktive me fallback të sigurt
    let resolvedBranchId = activeBranchId ? parseInt(activeBranchId, 10) : null;
    if (!resolvedBranchId) {
      const itemWithBranch = items.find((it) => it.branchId || it.product?.branchId);
      if (itemWithBranch) {
        resolvedBranchId = parseInt(itemWithBranch.branchId || itemWithBranch.product?.branchId, 10);
      }
    }

    const selectedZone = deliveryZones.find((z) => String(z.id) === String(selectedZoneId));

    const payload = {
      branch_id: resolvedBranchId || null,
      delivery_zone_id: selectedZone ? selectedZone.id : undefined,
      order_type: 'delivery',
      fulfillment_type: fulfillmentType,
      scheduled_date: fulfillmentType === 'scheduled' ? selectedDate : undefined,
      time_slot_id: fulfillmentType === 'scheduled' && selectedSlot?.id ? selectedSlot.id : undefined,
      slot_start: fulfillmentType === 'scheduled' && selectedSlot ? selectedSlot.start_time : undefined,
      slot_end: fulfillmentType === 'scheduled' && selectedSlot ? selectedSlot.end_time : undefined,
      customer_name: form.customerName.trim(),
      customer_email: form.customerEmail.trim(),
      customer_phone: form.customerPhone.trim(),
      customer_note: form.customerNote.trim() || null,
      payment_method: form.paymentMethod,
      save_address: form.saveAddress,
      delivery_address: {
        city: form.city.trim(),
        street: form.street.trim(),
        building: form.building.trim() || null,
        floor: form.floor.trim() || null,
        notes: form.deliveryNotes.trim() || null,
      },
      items: orderItems,
    };

    try {
      const res = await api.post('/orders', payload);
      const orderNumber = res.data?.order?.order_number;

      if (form.paymentMethod === 'card' && orderNumber) {
        try {
          await api.post('/payments/simulate', {
            order_number: orderNumber,
            outcome: simOutcome,
          });
        } catch (simErr) {
          const simMsg = simErr.response?.data?.message || 'Pagesa e simuluar u refuzua.';
          setGlobalError(`Porosia #${orderNumber} u regjistrua, por: ${simMsg}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      // Pastron shportën vetëm pas suksesit
      clearCart();
      navigate(`/porosia-sukses/${orderNumber}`);
    } catch (err) {
      const statusCode = err.response?.status;
      const serverMsg = err.response?.data?.message || 'Ndodhi një gabim gjatë procesimit të porosisë.';
      const serverErrors = err.response?.data?.errors;

      if (statusCode === 422 && serverErrors) {
        const mapped = {};
        Object.entries(serverErrors).forEach(([k, msgs]) => {
          mapped[k] = Array.isArray(msgs) ? msgs[0] : msgs;
        });
        setFieldErrors(mapped);
        setGlobalError(serverMsg);
      } else {
        setGlobalError(serverMsg);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="tastio-checkout-page">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        {/* Kthehu */}
        <button type="button" className="tastio-checkout-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} strokeWidth={2.4} />
          <span>Kthehu te shporta</span>
        </button>

        <h1 className="tastio-checkout-page-title">Përfundo Porosinë</h1>
      </div>

      <div className="tastio-checkout-container">
        {/* ============================================
            KOLONA E MAJTË — Formulari
            ============================================ */}
        <div className="tastio-checkout-left">
          {/* Gabimi global */}
          {globalError && (
            <div className="tastio-checkout-error-banner">
              <AlertCircle size={18} />
              <span>{globalError}</span>
            </div>
          )}

          {/* ——— A. Informacionet e Klientit ——— */}
          <div className="tastio-checkout-card">
            <div className="tastio-checkout-card-header">
              <div className="tastio-checkout-card-step">1</div>
              <User size={18} color="#0865f5" />
              <h2 className="tastio-checkout-card-title">Informacionet e Klientit</h2>
            </div>

            <div className="tastio-checkout-card-body">
              <div className="tastio-checkout-row">
                <div className="tastio-checkout-field">
                  <label className="tastio-checkout-label">
                    Emri i plotë <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`tastio-checkout-input${fieldErrors.customerName ? ' error' : ''}`}
                    value={form.customerName}
                    onChange={(e) => handleChange('customerName', e.target.value)}
                    placeholder="p.sh. Blin Krasniqi"
                    autoComplete="name"
                  />
                  {fieldErrors.customerName && (
                    <span className="tastio-checkout-field-error">{fieldErrors.customerName}</span>
                  )}
                </div>

                <div className="tastio-checkout-field">
                  <label className="tastio-checkout-label">
                    Numri i telefonit <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    className={`tastio-checkout-input${fieldErrors.customerPhone ? ' error' : ''}`}
                    value={form.customerPhone}
                    onChange={(e) => handleChange('customerPhone', e.target.value)}
                    placeholder="+383 44 111 222"
                    autoComplete="tel"
                  />
                  {fieldErrors.customerPhone && (
                    <span className="tastio-checkout-field-error">{fieldErrors.customerPhone}</span>
                  )}
                </div>
              </div>

              <div className="tastio-checkout-field" style={{ marginTop: '16px' }}>
                <label className="tastio-checkout-label">
                  Adresa Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  className={`tastio-checkout-input${fieldErrors.customerEmail ? ' error' : ''}`}
                  value={form.customerEmail}
                  onChange={(e) => handleChange('customerEmail', e.target.value)}
                  placeholder="email@shembull.com"
                  autoComplete="email"
                />
                {fieldErrors.customerEmail && (
                  <span className="tastio-checkout-field-error">{fieldErrors.customerEmail}</span>
                )}
              </div>
            </div>
          </div>

          {/* ——— B. Adresa e Dërgesës ——— */}
          <div className="tastio-checkout-card">
            <div className="tastio-checkout-card-header">
              <div className="tastio-checkout-card-step">2</div>
              <MapPin size={18} color="#0865f5" />
              <h2 className="tastio-checkout-card-title">Adresa e Dërgesës</h2>
            </div>

            <div className="tastio-checkout-card-body">
              {/* Adresat e ruajtura */}
              {savedAddresses.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div className="tastio-checkout-label" style={{ marginBottom: '10px' }}>
                    Adresat e Ruajtura
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleSelectSavedAddress(addr)}
                        style={{
                          padding: '10px 14px',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '13px',
                          color: '#374151',
                          fontWeight: 600,
                          transition: 'border-color 0.15s',
                        }}
                      >
                        {addr.title || 'Shtëpi'} — {addr.street}, {addr.city}
                      </button>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '16px 0' }} />
                </div>
              )}

              <div className="tastio-checkout-row">
                <div className="tastio-checkout-field">
                  <label className="tastio-checkout-label">
                    Qyteti <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`tastio-checkout-input${fieldErrors.city ? ' error' : ''}`}
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="p.sh. Prishtinë"
                  />
                  {fieldErrors.city && (
                    <span className="tastio-checkout-field-error">{fieldErrors.city}</span>
                  )}
                </div>

                <div className="tastio-checkout-field">
                  <label className="tastio-checkout-label">
                    Rruga / Adresa <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`tastio-checkout-input${fieldErrors.street ? ' error' : ''}`}
                    value={form.street}
                    onChange={(e) => handleChange('street', e.target.value)}
                    placeholder="p.sh. Rruga Nëna Terezë"
                  />
                  {fieldErrors.street && (
                    <span className="tastio-checkout-field-error">{fieldErrors.street}</span>
                  )}
                </div>
              </div>

              <div className="tastio-checkout-row" style={{ marginTop: '16px' }}>
                <div className="tastio-checkout-field">
                  <label className="tastio-checkout-label">Ndërtesa / Banesa</label>
                  <input
                    type="text"
                    className="tastio-checkout-input"
                    value={form.building}
                    onChange={(e) => handleChange('building', e.target.value)}
                    placeholder="p.sh. Ndërtesa 14, Ap. 9"
                  />
                </div>

                <div className="tastio-checkout-field">
                  <label className="tastio-checkout-label">Hyrja / Kati</label>
                  <input
                    type="text"
                    className="tastio-checkout-input"
                    value={form.floor}
                    onChange={(e) => handleChange('floor', e.target.value)}
                    placeholder="p.sh. Hyrja A, Kati 3"
                  />
                </div>
              </div>

              <div className="tastio-checkout-field" style={{ marginTop: '16px' }}>
                <label className="tastio-checkout-label">Shënime për Korrierin</label>
                <textarea
                  className="tastio-checkout-textarea"
                  value={form.deliveryNotes}
                  onChange={(e) => handleChange('deliveryNotes', e.target.value)}
                  placeholder="p.sh. Bjerini ziles, mos trokisni..."
                />
              </div>

              {deliveryZones.length > 0 && (
                <div className="tastio-checkout-field" style={{ marginTop: '16px' }}>
                  <label className="tastio-checkout-label">Zona e Dërgesës</label>
                  <select
                    className="tastio-checkout-input"
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                  >
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.city}) — Tarifa: €{Number(z.delivery_fee).toFixed(2)} • ~{z.estimated_delivery_minutes} min
                        {Number(z.min_order_amount) > 0 ? ` • Min. €${Number(z.min_order_amount).toFixed(2)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isAuthenticated && (
                <label className="tastio-checkout-checkbox-row">
                  <input
                    type="checkbox"
                    className="tastio-checkout-checkbox"
                    checked={form.saveAddress}
                    onChange={(e) => handleChange('saveAddress', e.target.checked)}
                  />
                  <span className="tastio-checkout-checkbox-label">
                    Ruaj adresën për porositë e ardhshme
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* ——— C. Shënimet e porosisë ——— */}
          <div className="tastio-checkout-card">
            <div className="tastio-checkout-card-header">
              <div className="tastio-checkout-card-step">3</div>
              <ClipboardList size={18} color="#0865f5" />
              <h2 className="tastio-checkout-card-title">Shënime për Porosinë (Opsionale)</h2>
            </div>

            <div className="tastio-checkout-card-body">
              <div className="tastio-checkout-field">
                <label className="tastio-checkout-label">Kërkesa speciale</label>
                <textarea
                  className="tastio-checkout-textarea"
                  value={form.customerNote}
                  onChange={(e) => handleChange('customerNote', e.target.value)}
                  placeholder="p.sh. Pa qepë, shtoni salcë ekstra..."
                />
              </div>
            </div>
          </div>

          {/* ——— D. Koha e Dërgesës / Planifikimi ——— */}
          <div className="tastio-checkout-card">
            <div className="tastio-checkout-card-header">
              <div className="tastio-checkout-card-step">4</div>
              <Clock size={18} color="#0865f5" />
              <h2 className="tastio-checkout-card-title">Koha e Dërgesës</h2>
            </div>

            <div className="tastio-checkout-card-body">
              {/* Toggle ASAP / Scheduled */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setFulfillmentType('asap')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: `2px solid ${fulfillmentType === 'asap' ? '#0066ff' : '#e2e8f0'}`,
                    backgroundColor: fulfillmentType === 'asap' ? 'rgba(0,102,255,0.06)' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Zap size={16} color={fulfillmentType === 'asap' ? '#0066ff' : '#94a3b8'} />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: fulfillmentType === 'asap' ? '#0066ff' : '#374151' }}>
                      Menjëherë (ASAP)
                    </span>
                  </div>
                  {dynamicWait && fulfillmentType === 'asap' ? (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      ⏱ Vlerësohet: <strong style={{ color: '#0066ff' }}>{dynamicWait.display_range}</strong>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Dërgesë sa më shpejt</div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType('scheduled')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: `2px solid ${fulfillmentType === 'scheduled' ? '#0066ff' : '#e2e8f0'}`,
                    backgroundColor: fulfillmentType === 'scheduled' ? 'rgba(0,102,255,0.06)' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Calendar size={16} color={fulfillmentType === 'scheduled' ? '#0066ff' : '#94a3b8'} />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: fulfillmentType === 'scheduled' ? '#0066ff' : '#374151' }}>
                      Planifiko
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Zgjidh datën dhe orën</div>
                </button>
              </div>

              {/* Scheduled: date + slot picker */}
              {fulfillmentType === 'scheduled' && (
                <div>
                  {datesLoading ? (
                    <div style={{ color: '#0066ff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '10px' }}>
                      <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                      Duke verifikuar datat dhe oraret e disponueshme të restorantit...
                    </div>
                  ) : datesError ? (
                    <div style={{ padding: '14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px' }}>Problem gjatë ngarkimit të datave:</div>
                      <div>{datesError}</div>
                      <button
                        type="button"
                        onClick={loadAvailableDates}
                        style={{
                          marginTop: '10px',
                          padding: '6px 12px',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Provo Përsëri
                      </button>
                    </div>
                  ) : availableDates.length > 0 ? (
                    <>
                      <label className="tastio-checkout-label" style={{ marginBottom: '10px' }}>Zgjidh Datën</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {availableDates.map((d) => (
                          <button
                            key={d.date}
                            type="button"
                            onClick={() => setSelectedDate(d.date)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '10px',
                              border: `2px solid ${selectedDate === d.date ? '#0066ff' : '#e2e8f0'}`,
                              backgroundColor: selectedDate === d.date ? '#0066ff' : '#f8fafc',
                              color: selectedDate === d.date ? '#fff' : '#374151',
                              fontWeight: 600,
                              fontSize: '13px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {d.display_label}
                            <div style={{ fontSize: '11px', opacity: 0.8 }}>{d.formatted}</div>
                          </button>
                        ))}
                      </div>

                      {/* Zgjedhja e Slotit */}
                      {selectedDate && (
                        <>
                          <label className="tastio-checkout-label" style={{ marginBottom: '10px' }}>Zgjidh Orën</label>
                          {slotsLoading ? (
                            <div style={{ color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 0' }}>
                              <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                              Duke ngarkuar oraret e disponueshme...
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div style={{ color: '#ef4444', fontSize: '13px', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                              Nuk ka orar të disponueshëm për këtë ditë.
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                              {availableSlots.map((slot) => {
                                const isUnavailable = !slot.is_available;
                                const isSelected = selectedSlot?.id === slot.id;
                                const timeText = slot.time_label || `${slot.display_start || slot.start_time} – ${slot.display_end || slot.end_time}`;
                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    disabled={isUnavailable}
                                    onClick={() => setSelectedSlot(slot)}
                                    title={isUnavailable ? (slot.unavailability_reason || 'I plotësuar') : ''}
                                    style={{
                                      padding: '10px 8px',
                                      borderRadius: '10px',
                                      border: `2px solid ${isSelected ? '#0066ff' : (isUnavailable ? '#f1f5f9' : '#e2e8f0')}`,
                                      backgroundColor: isSelected ? '#0066ff' : (isUnavailable ? '#f1f5f9' : '#fff'),
                                      color: isSelected ? '#fff' : (isUnavailable ? '#94a3b8' : '#374151'),
                                      fontWeight: 600,
                                      fontSize: '13px',
                                      cursor: isUnavailable ? 'not-allowed' : 'pointer',
                                      textAlign: 'center',
                                      opacity: isUnavailable ? 0.6 : 1,
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <div>{timeText}</div>
                                    {slot.is_expired ? (
                                      <div style={{ fontSize: '10px', marginTop: '2px', color: isSelected ? '#fff' : '#94a3b8' }}>Kaluar</div>
                                    ) : isUnavailable ? (
                                      <div style={{ fontSize: '10px', marginTop: '2px', color: isSelected ? '#fff' : '#ef4444' }}>Plot</div>
                                    ) : (
                                      <div style={{ fontSize: '10px', marginTop: '2px', color: isSelected ? '#dbeafe' : '#16a34a' }}>
                                        {(slot.delivery_remaining ?? slot.remaining_capacity)} vende
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '13px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      Restoranti nuk ka orare të lira pune për planifikim në ditët në vijim.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ——— E. Mënyra e Pagesës ——— */}
          <div className="tastio-checkout-card">
            <div className="tastio-checkout-card-header">
              <div className="tastio-checkout-card-step">5</div>
              <Wallet size={18} color="#0865f5" />
              <h2 className="tastio-checkout-card-title">Mënyra e Pagesës</h2>
            </div>

            <div className="tastio-checkout-card-body">
              <div className="tastio-checkout-payment-options">
                {/* Para në dorë */}
                <div
                  className={`tastio-checkout-payment-option ${form.paymentMethod === 'cash_on_delivery' ? 'selected' : ''}`}
                  onClick={() => handleChange('paymentMethod', 'cash_on_delivery')}
                >
                  <input
                    type="radio"
                    className="tastio-checkout-payment-radio"
                    checked={form.paymentMethod === 'cash_on_delivery'}
                    onChange={() => handleChange('paymentMethod', 'cash_on_delivery')}
                    name="paymentMethod"
                    id="pay-cash"
                  />
                  <div className="tastio-checkout-payment-icon">
                    <Banknote size={20} />
                  </div>
                  <div className="tastio-checkout-payment-info">
                    <div className="tastio-checkout-payment-name">Para në dorë gjatë dorëzimit</div>
                    <div className="tastio-checkout-payment-desc">
                      Paguani korrierin kur produkti arrin te ju
                    </div>
                  </div>
                </div>

                {/* Pagesë me Kartelë */}
                <div
                  className={`tastio-checkout-payment-option ${form.paymentMethod === 'card' ? 'selected' : ''}`}
                  onClick={() => handleChange('paymentMethod', 'card')}
                >
                  <input
                    type="radio"
                    className="tastio-checkout-payment-radio"
                    checked={form.paymentMethod === 'card'}
                    onChange={() => handleChange('paymentMethod', 'card')}
                    name="paymentMethod"
                    id="pay-card"
                  />
                  <div className="tastio-checkout-payment-icon">
                    <CreditCard size={20} />
                  </div>
                  <div className="tastio-checkout-payment-info">
                    <div className="tastio-checkout-payment-name">Pagesë me Kartelë</div>
                    <div className="tastio-checkout-payment-desc">
                      Paguani në mënyrë të sigurt dhe të shpejtë me kartelë bankare.
                    </div>
                  </div>
                  <div className="tastio-checkout-card-brands" aria-hidden="true">
                    <span className="tastio-card-brand-pill visa">VISA</span>
                    <span className="tastio-card-brand-pill mc">Mastercard</span>
                  </div>
                </div>

                {form.paymentMethod === 'card' && (
                  <div className="tastio-checkout-payment-security-note">
                    <div className="tastio-checkout-security-row">
                      <ShieldCheck size={16} className="tastio-checkout-security-icon" />
                      <span>Konfirmim i menjëhershëm i pagesës dhe gjenerim automatik i referencës së transaksionit.</span>
                    </div>
                    <div className="tastio-checkout-test-env-note">
                      <Lock size={12} />
                      <span>Pagesat aktualisht përpunohen në ambient testimi dhe nuk transferohen para reale.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================
            KOLONA E DJATHTË — Përmbledhja e Porosisë
            ============================================ */}
        <div className="tastio-checkout-right">
          <div className="tastio-checkout-summary-card">
            <div className="tastio-checkout-summary-header">
              <div>
                <h3 className="tastio-checkout-summary-title">Porosia Juaj</h3>
                {activeRestaurant && (
                  <div className="tastio-checkout-summary-restaurant">
                    {activeRestaurant.name}
                  </div>
                )}
              </div>
            </div>

            {/* Lista e Artikujve */}
            <div className="tastio-checkout-summary-items">
              {items.map((item, idx) => {
                const unitPrice = parseFloat(item.unitPrice || item.finalPrice || item.product?.base_price || 0);
                const lineTotal = unitPrice * (item.quantity || 1);
                return (
                  <div key={item.fingerprint || `${item.product?.id}-${idx}`} className="tastio-checkout-summary-item">
                    <div>
                      <div className="tastio-checkout-summary-item-name">
                        {item.product?.name || 'Produkt'}
                      </div>
                      <div className="tastio-checkout-summary-item-qty">
                        {item.quantity} x €{unitPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="tastio-checkout-summary-item-price">
                      €{lineTotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Koha e Parashikuar e Dërgesës / Planifikimit */}
            <div style={{
              margin: '14px 0',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: fulfillmentType === 'scheduled' ? '#eff6ff' : '#f0fdf4',
              border: `1px solid ${fulfillmentType === 'scheduled' ? '#bfdbfe' : '#bbf7d0'}`,
              color: fulfillmentType === 'scheduled' ? '#1d4ed8' : '#15803d',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {fulfillmentType === 'scheduled' ? (
                <>
                  <Calendar size={16} color="#2563eb" />
                  <span>
                    {selectedSlot
                      ? <>Planifikuar: <strong>{availableDates.find(d => d.date === selectedDate)?.display_label} • {selectedSlot.display_start}–{selectedSlot.display_end}</strong></>
                      : 'Zgjidhni datën dhe orën e dërgesës'}
                  </span>
                </>
              ) : (
                <>
                  <Clock size={16} color="#16a34a" />
                  <span>
                    {dynamicWait
                      ? <>Koha e vlerësuar e dërgesës: <strong>{dynamicWait.display_range}</strong></>
                      : <>Koha e vlerësuar e përgatitjes: <strong>~20-30 minuta</strong></>}
                  </span>
                </>
              )}
            </div>

            {/* Totalet */}
            {(() => {
              const activeZone = deliveryZones.find((z) => String(z.id) === String(selectedZoneId));
              const effectiveFee = activeZone ? Number(activeZone.delivery_fee) : deliveryFee;
              const effectiveTotal = Number((subtotal + effectiveFee).toFixed(2));
              return (
                <div className="tastio-checkout-summary-totals">
                  <div className="tastio-checkout-summary-line">
                    <span>Nëntotali</span>
                    <span>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="tastio-checkout-summary-line">
                    <span>Tarifa e dërgesës {activeZone ? `(${activeZone.name})` : ''}</span>
                    <span>€{effectiveFee.toFixed(2)}</span>
                  </div>
                  <div className="tastio-checkout-summary-line grand-total">
                    <span>Totali</span>
                    <span>€{effectiveTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Butoni Konfirmo */}
            <div className="tastio-checkout-confirm-wrap">
              <button
                type="button"
                className={`tastio-checkout-confirm-btn${isSubmitting ? ' loading' : ''}`}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="tastio-spin" />
                    <span>Duke procesuar...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Konfirmo Porosinë — €{grandTotal.toFixed(2)}</span>
                  </>
                )}
              </button>

              <p style={{
                fontSize: '11px',
                color: '#94a3b8',
                textAlign: 'center',
                marginTop: '12px',
                lineHeight: '1.4',
              }}>
                Duke konfirmuar, pranoni kushtet e përdorimit dhe politikën e privatësisë të Tastio.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .tastio-spin {
          animation: tastioSpinAnim 0.8s linear infinite;
        }
        @keyframes tastioSpinAnim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

