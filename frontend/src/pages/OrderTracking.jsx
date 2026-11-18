import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Search, AlertCircle, XCircle, CheckCircle2, Clock, Truck, Store, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getOrderVerificationUrl } from '../utils/orderQr';

export default function NdjekjaPorosive() {
  const { user } = useAuth();
  const [porosite, setPorosite] = useState([]);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);
  const [kerkoTekst, setKerkoTekst] = useState('');
  const [statusFiltri, setStatusFiltri] = useState('all');
  const [anuloModal, setAnuloModal] = useState({ hapur: false, orderNumber: null, arsyeja: '' });
  const [dukeAnuluar, setDukeAnuluar] = useState(false);

  const ngarkoPorosite = async (overrideSearch) => {
    try {
      setDukeNgarkuar(true);
      const params = {};
      if (statusFiltri !== 'all') params.status = statusFiltri;

      const searchValue = overrideSearch !== undefined ? overrideSearch : kerkoTekst;
      if (searchValue && searchValue.trim()) {
        params.search = searchValue.trim();
      }

      const res = await api.get('/orders/my-orders', { params });
      setPorosite(res.data.data || []);
    } catch (err) {
      console.error('Dështoi ngarkimi i porosive', err);
    } finally {
      setDukeNgarkuar(false);
    }
  };

  useEffect(() => {
    ngarkoPorosite();
  }, [statusFiltri]);

  const handleKerkimSubmit = (e) => {
    e.preventDefault();
    ngarkoPorosite();
  };

  const handlePastroKerkimin = () => {
    setKerkoTekst('');
    ngarkoPorosite('');
  };

  const handleAnuloPorosine = async (e) => {
    e.preventDefault();
    if (!anuloModal.orderNumber) return;

    try {
      setDukeAnuluar(true);
      await api.post(`/orders/${anuloModal.orderNumber}/cancel`, {
        reason: anuloModal.arsyeja.trim() || 'Anuluar nga klienti.',
      });
      setAnuloModal({ hapur: false, orderNumber: null, arsyeja: '' });
      await ngarkoPorosite();
    } catch (err) {
      alert(err.response?.data?.message || 'Dështoi anulimi i porosisë.');
    } finally {
      setDukeAnuluar(false);
    }
  };

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
      case 'pending':
      default:
        return 'badge badge-outline';
    }
  };

  // Pastron dhe formaton adresën duke parandaluar duplikime si "Ndërtesa Ndertesa 12"
  const formatoAdresen = (deliveryAddress) => {
    if (!deliveryAddress) return 'Prishtinë';

    let addressObj = null;
    if (typeof deliveryAddress === 'string') {
      try {
        addressObj = JSON.parse(deliveryAddress);
      } catch {
        // Nëse është string i thjeshtë, heqim përsëritjet e mundshme
        return deliveryAddress.replace(/nd[ëe]rtesa\s+nd[ëe]rtesa/gi, 'Ndërtesa');
      }
    } else {
      addressObj = deliveryAddress;
    }

    if (!addressObj) return 'Prishtinë';

    const parts = [];
    if (addressObj.street) {
      parts.push(addressObj.street);
    }

    if (addressObj.building) {
      const cleanBld = String(addressObj.building).replace(/^(nd[ëe]rtesa|objekti|banesa)\s*[:#-]?\s*/i, '').trim();
      if (cleanBld) {
        parts.push(`Ndërtesa ${cleanBld}`);
      }
    }

    if (addressObj.floor) {
      const floorStr = String(addressObj.floor).trim();
      if (/hyrja|kati/i.test(floorStr)) {
        parts.push(floorStr);
      } else {
        parts.push(`Hyrja/Kati: ${floorStr}`);
      }
    }

    if (addressObj.city) {
      parts.push(addressObj.city);
    } else {
      parts.push('Prishtinë');
    }

    return parts.join(', ');
  };

  // Hartëzimi i niveleve të statusit për stepperin vizual
  const STATUS_LEVELS = {
    pending: 0,
    confirmed: 1,
    in_preparation: 2,
    ready_for_pickup: 3,
    completed: 4,
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Porositë e Mia & Pass-i Digjital</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Ndiqni përgatitjen e porosisë në kohë reale dhe paraqisni kodin tuaj QR në sportel ose prisni korrierin.
        </p>
      </div>

      {/* Shiriti i Kërkimit & Filtrave */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <form onSubmit={handleKerkimSubmit} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Kërko sipas numrit të porosisë, restorantit ose artikullit..."
              value={kerkoTekst}
              onChange={(e) => setKerkoTekst(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: '38px', paddingRight: kerkoTekst ? '38px' : '12px', height: '42px', borderRadius: '10px' }}
            />
            <Search size={17} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            {kerkoTekst && (
              <button
                type="button"
                onClick={handlePastroKerkimin}
                style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8', cursor: 'pointer' }}
                title="Pastro kërkimin"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', borderRadius: '10px' }}>
            Kërko
          </button>
        </form>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', emri: 'Të Gjitha' },
            { id: 'pending', emri: 'Në Pritje' },
            { id: 'confirmed', emri: 'Të Konfirmuara' },
            { id: 'in_preparation', emri: 'Në Përgatitje' },
            { id: 'ready_for_pickup', emri: 'Gati' },
            { id: 'completed', emri: 'Të Përfunduara' },
            { id: 'cancelled', emri: 'Të Anuluara' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFiltri(tab.id)}
              className={`btn ${statusFiltri === tab.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}
            >
              {tab.emri}
            </button>
          ))}
        </div>
      </div>

      {duke_ngarkuar ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
          Duke ngarkuar porositë...
        </div>
      ) : porosite.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>
            {statusFiltri !== 'all' || kerkoTekst
              ? 'Nuk u gjet asnjë porosi me këto kritere kërkimi.'
              : 'Nuk keni kryer ende asnjë porosi.'}
          </p>
          {(statusFiltri !== 'all' || kerkoTekst) && (
            <button
              type="button"
              onClick={() => { setStatusFiltri('all'); handlePastroKerkimin(); }}
              className="btn btn-primary"
              style={{ marginTop: '16px', fontSize: '13px' }}
            >
              Shiko të gjitha porositë
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {porosite.map((porosia) => {
            const isDelivery = porosia.order_type === 'delivery';
            const isCancelled = porosia.status === 'cancelled';
            const currentLevel = STATUS_LEVELS[porosia.status] ?? 0;

            // Payload dhe kod verifikimi për Pass-in Digjital (URL absolute dhe e vlefshme për skanim)
            const qrPayload = getOrderVerificationUrl(porosia);
            const shortCode = porosia.pickup_token?.short_code || String(porosia.order_number).replace(/^TASTIO-/, '');

            return (
              <div key={porosia.id} className="card" style={{ padding: '24px' }}>
                {/* Header i Kartelës së Porosisë */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                        Porosia #{porosia.order_number}
                      </span>
                      <span className="badge badge-outline" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                        {isDelivery ? '🚚 Dërgesë' : '🛍️ Marrje në Sportel'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
                      {porosia.branch?.restaurant?.name || porosia.branch?.name || 'Restorant Tastio'}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {isDelivery ? (
                        <span>📍 Adresa: {formatoAdresen(porosia.delivery_address)}</span>
                      ) : (
                        <span>📍 Marrja te {porosia.branch?.name} • {porosia.branch?.address}</span>
                      )}
                    </div>
                  </div>

                  <span className={merrBadgeKlase(porosia.status)} style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 700 }}>
                    {perktheStatusin(porosia.status)}
                  </span>
                </div>

                {/* Stepper Vizual Dinamik i Sinkronizuar me Backend-in */}
                {isCancelled ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    color: '#991b1b',
                  }}>
                    <XCircle size={22} color="#dc2626" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Porosia është Anuluar</div>
                      <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                        Kjo porosi nuk është më aktive dhe procesi i përgatitjes ose dërgesës është anuluar.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    marginBottom: '24px',
                    border: '1px solid var(--color-border-subtle)',
                  }}>
                    {/* Hapi 1: Konfirmuar */}
                    <div style={{ textAlign: 'center', minWidth: '90px' }}>
                      <div style={{
                        fontWeight: currentLevel >= 1 ? 700 : 500,
                        fontSize: '13px',
                        color: currentLevel > 1 ? '#16a34a' : (currentLevel === 1 ? 'var(--color-primary)' : '#94a3b8'),
                      }}>
                        {currentLevel > 1 ? '✓ E Konfirmuar' : (currentLevel === 1 ? '● E Konfirmuar' : '○ Në Pritje')}
                      </div>
                    </div>

                    {/* Vija 1 -> 2 */}
                    <div style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: currentLevel >= 2 ? '#16a34a' : '#cbd5e1',
                      margin: '0 8px',
                      transition: 'background-color 0.3s ease',
                    }} />

                    {/* Hapi 2: Në Kuzhinë */}
                    <div style={{ textAlign: 'center', minWidth: '90px' }}>
                      <div style={{
                        fontWeight: currentLevel >= 2 ? 700 : 500,
                        fontSize: '13px',
                        color: currentLevel > 2 ? '#16a34a' : (currentLevel === 2 ? 'var(--color-primary)' : '#94a3b8'),
                      }}>
                        {currentLevel > 2 ? '✓ Në Kuzhinë' : (currentLevel === 2 ? '● Në Kuzhinë' : '○ Në Kuzhinë')}
                      </div>
                    </div>

                    {/* Vija 2 -> 3 */}
                    <div style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: currentLevel >= 3 ? '#16a34a' : '#cbd5e1',
                      margin: '0 8px',
                      transition: 'background-color 0.3s ease',
                    }} />

                    {/* Hapi 3: Gati / Në Rrugë */}
                    <div style={{ textAlign: 'center', minWidth: '110px' }}>
                      <div style={{
                        fontWeight: currentLevel >= 3 ? 700 : 500,
                        fontSize: '13px',
                        color: currentLevel > 3 ? '#16a34a' : (currentLevel === 3 ? 'var(--color-primary)' : '#94a3b8'),
                      }}>
                        {isDelivery
                          ? (currentLevel > 3 ? '✓ Në Rrugë' : (currentLevel === 3 ? '● Në Rrugë' : '○ Në Rrugë'))
                          : (currentLevel > 3 ? '✓ Gati për Marrje' : (currentLevel === 3 ? '● Gati për Marrje' : '○ Gati për Marrje'))
                        }
                      </div>
                    </div>

                    {/* Vija 3 -> 4 */}
                    <div style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: currentLevel >= 4 ? '#16a34a' : '#cbd5e1',
                      margin: '0 8px',
                      transition: 'background-color 0.3s ease',
                    }} />

                    {/* Hapi 4: E Dorëzuar / Përfunduar */}
                    <div style={{ textAlign: 'center', minWidth: '95px' }}>
                      <div style={{
                        fontWeight: currentLevel >= 4 ? 700 : 500,
                        fontSize: '13px',
                        color: currentLevel >= 4 ? '#16a34a' : '#94a3b8',
                      }}>
                        {isDelivery
                          ? (currentLevel >= 4 ? '✓ E Dorëzuar' : '○ E Dorëzuar')
                          : (currentLevel >= 4 ? '✓ E Përfunduar' : '○ E Përfunduar')
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Pass-i Digjital & Kodi QR (Funksional dhe i pranishëm për të gjitha porositë) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '18px 22px',
                  border: isDelivery ? '1px solid #bfdbfe' : '2px dashed var(--color-primary)',
                  borderRadius: '12px',
                  backgroundColor: isDelivery ? '#eff6ff' : '#fff7ed',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '10px',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}>
                    <QRCodeSVG value={qrPayload} size={105} />
                    <Link
                      to={`/orders/${porosia.id}/verify?token=${encodeURIComponent(porosia.pickup_token?.short_code || porosia.order_number)}`}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isDelivery ? '#1e40af' : 'var(--color-primary)',
                        textDecoration: 'underline',
                      }}
                      title="Hap faqen e verifikimit"
                    >
                      Verifiko ↗
                    </Link>
                  </div>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: isDelivery ? '#1e40af' : 'var(--color-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {isDelivery ? 'Pass Digjital & Dëshmi e Dërgesës' : 'Pass Digjital Zyrtar për Marrje në Sportel'}
                    </div>
                    <div style={{ fontSize: '19px', fontWeight: 800, marginTop: '3px' }}>
                      Kodi: <span style={{ color: isDelivery ? '#2563eb' : 'var(--color-primary)' }}>{shortCode}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: isDelivery ? '#1e3a8a' : '#7c2d12', marginTop: '4px', lineHeight: 1.4 }}>
                      {isDelivery
                        ? 'Dëshmi digjitale e porosisë tuaj. Paguani korrierin me para në dorëzim (€' + parseFloat(porosia.total_price).toFixed(2) + '). Koha e përafërt: 25–40 min.'
                        : 'Paraqisni këtë kod QR ose kodin e shkurtër në sportel gjatë marrjes dhe kryerjes së pagesës.'}
                    </p>
                  </div>
                </div>

                {/* Përmbledhja e Artikujve */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Artikujt e Porosisë:</div>
                  {porosia.items?.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                      <span>{item.quantity}x {item.product_name_snapshot}</span>
                      <span style={{ fontWeight: 600 }}>€{parseFloat(item.line_total).toFixed(2)}</span>
                    </div>
                  ))}

                  {isDelivery && parseFloat(porosia.delivery_fee || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                      <span>Tarifa e dërgesës</span>
                      <span>€{parseFloat(porosia.delivery_fee).toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '16px',
                    fontWeight: 800,
                    marginTop: '12px',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '8px',
                  }}>
                    <span>Shuma Totale {isDelivery ? '(Para në Dorëzim)' : '(Pagesë në Sportel)'}</span>
                    <span style={{ color: 'var(--color-primary)' }}>€{parseFloat(porosia.total_price).toFixed(2)}</span>
                  </div>

                  {/* Butoni i Anulimit vetëm për statuset e lejuara nga backend-i: pending dhe confirmed */}
                  {['pending', 'confirmed'].includes(porosia.status) && (
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setAnuloModal({ hapur: true, orderNumber: porosia.order_number, arsyeja: '' })}
                        className="btn"
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          fontSize: '13px',
                          fontWeight: 700,
                          padding: '6px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Anulo Porosinë
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal për Anulimin e Porosisë */}
      {anuloModal.hapur && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#111827' }}>
              Anuloni Porosinë #{anuloModal.orderNumber}?
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              Jeni të sigurt që dëshironi të anuloni këtë porosi? Porosia mund të anulohet vetëm para fillimit të përgatitjes në kuzhinë.
            </p>
            <form onSubmit={handleAnuloPorosine}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', color: '#374151' }}>
                  Arsyeja e anulimit (opsionale):
                </label>
                <textarea
                  value={anuloModal.arsyeja}
                  onChange={(e) => setAnuloModal({ ...anuloModal, arsyeja: e.target.value })}
                  placeholder="Shkruani arsyen e anulimit..."
                  rows={3}
                  className="input"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAnuloModal({ hapur: false, orderNumber: null, arsyeja: '' })}
                  className="btn btn-outline"
                  style={{ fontSize: '14px' }}
                >
                  Mbyll
                </button>
                <button
                  type="submit"
                  disabled={dukeAnuluar}
                  className="btn"
                  style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '14px', fontWeight: 700 }}
                >
                  {dukeAnuluar ? 'Duke anuluar...' : 'Konfirmo Anulimin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
