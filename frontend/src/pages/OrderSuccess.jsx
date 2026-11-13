import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  MapPin,
  Store,
  Banknote,
  ClipboardList,
  ArrowRight,
  Home,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import './OrderSuccess.css';

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderNumber) {
      navigate('/');
      return;
    }

    async function fetchOrder() {
      try {
        const res = await api.get(`/orders/${orderNumber}/details`);
        setOrder(res.data?.data || null);
      } catch (err) {
        const statusCode = err.response?.status;
        if (statusCode === 404) {
          setError('Porosia nuk u gjet.');
        } else {
          setError('Ndodhi një gabim gjatë ngarkimit të porosisë.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [orderNumber, navigate]);

  const translateStatus = (status) => {
    switch (status) {
      case 'confirmed': return 'E Konfirmuar';
      case 'pending': return 'Në Pritje';
      case 'in_preparation': return 'Në Përgatitje';
      case 'ready_for_pickup': return 'Gati';
      case 'completed': return 'E Përfunduar';
      case 'cancelled': return 'E Anuluar';
      default: return status || 'E Konfirmuar';
    }
  };

  const translatePayment = (method) => {
    switch (method) {
      case 'cash_on_delivery': return 'Para në dorë gjatë dorëzimit';
      case 'card': return 'Kartë Bankare';
      default: return method || 'Para në dorë';
    }
  };

  const parseDeliveryAddress = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return { street: raw }; }
    }
    return raw;
  };

  if (isLoading) {
    return (
      <div className="tastio-success-loading">
        <Loader2 size={24} style={{ animation: 'tastioSpinAnim 0.8s linear infinite' }} />
        <span>Duke ngarkuar konfirmimin e porosisë...</span>
        <style>{`
          @keyframes tastioSpinAnim {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="tastio-success-page">
        <div className="tastio-success-container">
          <p style={{ color: '#ef4444', fontSize: '16px', marginBottom: '24px' }}>
            {error || 'Porosia nuk u gjet.'}
          </p>
          <Link to="/" className="tastio-success-btn-primary">
            Kthehu në Ballinë
          </Link>
        </div>
      </div>
    );
  }

  const deliveryAddress = parseDeliveryAddress(order.delivery_address);
  const restaurantName = order.branch?.restaurant?.name || 'Restoranti';

  return (
    <div className="tastio-success-page">
      <div className="tastio-success-container">
        {/* Ikona e Suksesit */}
        <div className="tastio-success-icon-wrap">
          <CheckCircle size={46} color="#16a34a" strokeWidth={2} />
        </div>

        <h1 className="tastio-success-title">Porosia u konfirmua!</h1>
        <p className="tastio-success-subtitle">
          Faleminderit! Porosia juaj u pranua dhe është dërguar te kuzhinieri.
          <br />
          Ju do të njoftoheni kur porosia të jetë gati.
        </p>

        {/* Koha e pritur */}
        <div className="tastio-success-eta">
          <div>
            <div className="tastio-success-eta-label">Koha e Pritur e Dërgesës</div>
            <div className="tastio-success-eta-value">25 — 40 min</div>
          </div>
        </div>

        {/* Karta e Detajeve */}
        <div className="tastio-success-card">
          {/* Header me numrin e porosisë */}
          <div className="tastio-success-card-header">
            <div>
              <div className="tastio-success-order-num">Numri i Porosisë</div>
              <div className="tastio-success-order-num-value">#{order.order_number}</div>
            </div>
            <span className="tastio-success-status-badge">
              {translateStatus(order.status)}
            </span>
          </div>

          {/* Restoranti */}
          <div className="tastio-success-section">
            <div className="tastio-success-section-title">Restoranti</div>
            <div className="tastio-success-section-row">
              <Store size={16} />
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{restaurantName}</div>
                {order.branch?.name && (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{order.branch.name}</div>
                )}
              </div>
            </div>
          </div>

          {/* Adresa e Dërgesës */}
          {deliveryAddress && (
            <div className="tastio-success-section">
              <div className="tastio-success-section-title">Adresa e Dërgesës</div>
              <div className="tastio-success-section-row">
                <MapPin size={16} />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {deliveryAddress.street}
                    {deliveryAddress.building ? `, ${deliveryAddress.building}` : ''}
                    {deliveryAddress.floor ? `, ${deliveryAddress.floor}` : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {deliveryAddress.city || 'Prishtinë'}
                  </div>
                  {deliveryAddress.notes && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {deliveryAddress.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Artikujt e Porosisë */}
          <div className="tastio-success-section">
            <div className="tastio-success-section-title">Artikujt e Porositur</div>
            <div className="tastio-success-items">
              {order.items?.map((item) => {
                const lineTotal = parseFloat(item.line_total || 0);
                return (
                  <div key={item.id} className="tastio-success-item">
                    <div>
                      <div className="tastio-success-item-name">{item.product_name_snapshot}</div>
                      <div className="tastio-success-item-qty">
                        {item.quantity} x €{parseFloat(item.unit_price_snapshot).toFixed(2)}
                      </div>
                    </div>
                    <div className="tastio-success-item-price">€{lineTotal.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totalet */}
          <div className="tastio-success-section">
            <div className="tastio-success-totals">
              <div className="tastio-success-total-line">
                <span>Nëntotali</span>
                <span>€{parseFloat(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="tastio-success-total-line">
                <span>Tarifa e dërgesës</span>
                <span>€{parseFloat(order.delivery_fee || 1.50).toFixed(2)}</span>
              </div>
              <div className="tastio-success-total-line grand">
                <span>Totali</span>
                <span>€{parseFloat(order.total_price || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Mënyra e Pagesës */}
          <div className="tastio-success-section">
            <div className="tastio-success-section-title">Mënyra e Pagesës</div>
            <div className="tastio-success-section-row">
              <Banknote size={16} />
              <span style={{ fontWeight: 600 }}>{translatePayment(order.payment_method)}</span>
            </div>
          </div>
        </div>

        {/* Butonat e Navigimit */}
        <div className="tastio-success-actions">
          <Link to="/porosite" className="tastio-success-btn-primary">
            <ClipboardList size={18} />
            <span>Ndiq Porosinë te Porositë e Mia</span>
            <ArrowRight size={16} />
          </Link>

          <Link to="/" className="tastio-success-btn-secondary">
            <Home size={16} />
            <span>Kthehu në Ballinë</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

