import React, { useState, useEffect, useCallback } from 'react';
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
  CreditCard
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
      product_id: item.product?.id,
      quantity: item.quantity || 1,
      selected_choices: item.selectedChoices || {},
    }));

    const payload = {
      branch_id: activeBranchId ? parseInt(activeBranchId, 10) : null,
      order_type: 'delivery',
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

          {/* ——— D. Mënyra e Pagesës ——— */}
          <div className="tastio-checkout-card">
            <div className="tastio-checkout-card-header">
              <div className="tastio-checkout-card-step">4</div>
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

                {/* Kartë (jo aktive) */}
                <div className="tastio-checkout-payment-option disabled">
                  <input
                    type="radio"
                    className="tastio-checkout-payment-radio"
                    disabled
                    name="paymentMethod"
                    id="pay-card"
                  />
                  <div className="tastio-checkout-payment-icon">
                    <CreditCard size={20} />
                  </div>
                  <div className="tastio-checkout-payment-info">
                    <div className="tastio-checkout-payment-name">Kartë Bankare / Online</div>
                    <div className="tastio-checkout-payment-desc">Visa, Mastercard, Raiffeisen</div>
                  </div>
                  <span className="tastio-checkout-soon-badge">Se shpejti</span>
                </div>
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

            {/* Totalet */}
            <div className="tastio-checkout-summary-totals">
              <div className="tastio-checkout-summary-line">
                <span>Nëntotali</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="tastio-checkout-summary-line">
                <span>Tarifa e dërgesës</span>
                <span>€{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="tastio-checkout-summary-line grand-total">
                <span>Totali</span>
                <span>€{grandTotal.toFixed(2)}</span>
              </div>
            </div>

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

