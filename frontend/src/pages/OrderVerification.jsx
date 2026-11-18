import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Store,
  Truck,
  ShieldCheck,
  ChevronLeft,
  Receipt,
  Check
} from 'lucide-react';
import api from '../services/api';

export default function OrderVerification() {
  const { orderIdentifier } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function verifikoPorosine() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const res = await api.get(`/orders/${orderIdentifier}/verify`, {
          params: token ? { token } : {}
        });

        if (res.data?.success && res.data?.data) {
          setOrder(res.data.data);
        } else {
          setErrorMessage(res.data?.message || 'Verifikimi i porosisë dështoi.');
        }
      } catch (err) {
        let msg = err.response?.data?.message;
        if (!msg) {
          if (err.message && (err.message.includes('Network') || err.message.includes('ECONNREFUSED'))) {
            msg = 'Nuk mund të lidhemi me serverin e Tastio. Ju lutem sigurohuni që pajisja është e lidhur në rrjet.';
          } else {
            msg = 'Kodi i verifikimit është i pavlefshëm ose kjo porosi nuk ekziston.';
          }
        }
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    }

    if (orderIdentifier) {
      verifikoPorosine();
    }
  }, [orderIdentifier, token]);

  const perktheStatusin = (st) => {
    switch (st) {
      case 'pending': return 'Në Pritje';
      case 'confirmed': return 'E Konfirmuar';
      case 'in_preparation': return 'Në Përgatitje';
      case 'ready_for_pickup': return 'Gati për Marrje / Dërgesë';
      case 'completed': return 'E Përfunduar';
      case 'cancelled': return 'E Anuluar';
      default: return st;
    }
  };

  const merrBadgeKlase = (st) => {
    switch (st) {
      case 'completed': return 'badge badge-success';
      case 'in_preparation': return 'badge badge-warning';
      case 'ready_for_pickup': return 'badge badge-primary';
      case 'confirmed': return 'badge badge-primary';
      case 'cancelled': return 'badge badge-danger';
      default: return 'badge badge-outline';
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Duke verifikuar porosinë në Tastio...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div style={{ maxWidth: '540px', margin: '40px auto', padding: '0 20px' }}>
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center', borderTop: '4px solid #dc2626' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto'
          }}>
            <AlertCircle size={34} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
            Verifikimi Dështoi
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.5, marginBottom: '24px' }}>
            {errorMessage}
          </p>
          <Link to="/" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '10px' }}>
            Kthehu te Faqja Kryesore
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const isDelivery = order.order_type === 'delivery';

  return (
    <div style={{ maxWidth: '640px', margin: '20px auto 60px auto', padding: '0 20px' }}>
      {/* Koka Zyrtare e Verifikimit */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          borderRadius: '24px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          color: '#047857',
          fontSize: '14px',
          fontWeight: 800,
          marginBottom: '12px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <ShieldCheck size={20} color="#059669" />
          ✓ Porosi e Verifikuar në Tastio
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
          Verifikimi i Porosisë
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Kjo faqe konfirmon autenticitetin e porosisë për klientin, stafin dhe korrierin.
        </p>
      </div>

      {/* Kartela Kryesore e Porosisë */}
      <div className="card" style={{ padding: '28px', borderTop: '4px solid var(--color-primary)' }}>
        {/* Numri & Statusi */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-primary" style={{ fontSize: '13px', fontWeight: 800 }}>
                #{order.order_number}
              </span>
              <span className="badge badge-outline" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                {isDelivery ? '🚚 Dërgesë' : '🛍️ Marrje në Sportel'}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{order.restaurant_name}</h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {order.branch_name} • {order.branch_address}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className={merrBadgeKlase(order.status)} style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 700 }}>
              {perktheStatusin(order.status)}
            </span>
            {order.verification?.short_code && (
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '6px' }}>
                Kodi: {order.verification.short_code}
              </div>
            )}
          </div>
        </div>

        {/* Detajet e Klientit dhe Dërgesës (Të dhëna të mbrojtura pa ekspozim privatësie) */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          fontSize: '13px',
          border: '1px solid var(--color-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Klienti:</span>
            <span style={{ fontWeight: 700 }}>{order.customer_display_name}</span>
          </div>
          {isDelivery ? (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Adresa e dërgesës:</span>
              <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '320px' }}>
                📍 {order.delivery_address || 'Prishtinë'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Marrja në:</span>
              <span style={{ fontWeight: 600 }}>🛍️ Sporteli i Restorantit</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Mënyra e pagesës:</span>
            <span style={{ fontWeight: 600 }}>
              {order.payment_method === 'cash_on_delivery'
                ? (isDelivery ? 'Para në dorëzim te korrieri' : 'Pagesë në sportel')
                : 'Kartë Bankare / Online'}
            </span>
          </div>
        </div>

        {/* Artikujt */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px', color: '#111827' }}>
            Artikujt e Verifikuar:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {order.items?.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>
                  <strong style={{ color: 'var(--color-primary)' }}>{item.quantity}x</strong> {item.name}
                </span>
                <span style={{ fontWeight: 600 }}>€{parseFloat(item.line_total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Përmbledhja Financiare */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            <span>Nëntotali</span>
            <span>€{parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
          {isDelivery && parseFloat(order.delivery_fee) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              <span>Tarifa e dërgesës</span>
              <span>€{parseFloat(order.delivery_fee).toFixed(2)}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '17px',
            fontWeight: 800,
            marginTop: '8px',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '10px'
          }}>
            <span>Totali Përfundimtar:</span>
            <span style={{ color: 'var(--color-primary)' }}>€{parseFloat(order.total_price).toFixed(2)}</span>
          </div>
        </div>

        {/* Shënimi i Sigurisë */}
        <div style={{
          marginTop: '24px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          fontSize: '12px',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} color="#2563eb" />
          <span>Kodi QR dhe ky token janë validuar me sukses në platformën Tastio.</span>
        </div>
      </div>

      {/* Navigimi mbrapsht */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/porosite" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ChevronLeft size={16} /> Kthehu te Porositë e Mia
        </Link>
      </div>
    </div>
  );
}
