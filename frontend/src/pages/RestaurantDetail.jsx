import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../contexts/CartContext';

export default function DetajetRestorantit() {
  const { slug } = useParams();
  const [restoranti, setRestoranti] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);
  const [artikulliAktiv, setArtikulliAktiv] = useState(null);
  const [zgjedhjetOpsioneve, setZgjedhjetOpsioneve] = useState({});
  const { addItem } = useCart();

  useEffect(() => {
    async function merreRestorantin() {
      try {
        setDukeNgarkuar(true);
        const res = await api.get(`/public/restaurants/${slug}`);
        setRestoranti(res.data.data);
      } catch (err) {
        console.error('Dështoi ngarkimi i detajeve të restorantit', err);
      } finally {
        setDukeNgarkuar(false);
      }
    }
    merreRestorantin();
  }, [slug]);

  const handleHapModifikuesin = (produkti) => {
    setArtikulliAktiv(produkti);
    const zgjedhjetFillestare = {};
    produkti.option_groups?.forEach((grupi) => {
      if (grupi.is_required && grupi.choices?.length > 0) {
        if (grupi.max_selection === 1) {
          zgjedhjetFillestare[grupi.id] = [grupi.choices[0].id];
        } else {
          zgjedhjetFillestare[grupi.id] = [];
        }
      } else {
        zgjedhjetFillestare[grupi.id] = [];
      }
    });
    setZgjedhjetOpsioneve(zgjedhjetFillestare);
  };

  const handleNdryshoZgjedhjen = (grupiId, zgjedhjaId, maxZgjedhje) => {
    setZgjedhjetOpsioneve((prev) => {
      const aktualet = prev[grupiId] || [];
      if (maxZgjedhje === 1) {
        return { ...prev, [grupiId]: [zgjedhjaId] };
      } else {
        const ekziston = aktualet.includes(zgjedhjaId);
        if (ekziston) {
          return { ...prev, [grupiId]: aktualet.filter((id) => id !== zgjedhjaId) };
        } else {
          if (aktualet.length < maxZgjedhje) {
            return { ...prev, [grupiId]: [...aktualet, zgjedhjaId] };
          }
          return prev;
        }
      }
    });
  };

  const llogaritCmiminTotal = () => {
    if (!artikulliAktiv) return 0;
    let totali = parseFloat(artikulliAktiv.base_price);
    artikulliAktiv.option_groups?.forEach((grupi) => {
      const zgjedhjet = zgjedhjetOpsioneve[grupi.id] || [];
      grupi.choices?.forEach((opsioni) => {
        if (zgjedhjet.includes(opsioni.id)) {
          totali += parseFloat(opsioni.additional_price || 0);
        }
      });
    });
    return totali;
  };

  const handleShtoNeShporte = () => {
    if (!artikulliAktiv) return;
    const cmimiPerfundimtar = llogaritCmiminTotal();
    addItem({
      product: artikulliAktiv,
      selectedChoices: zgjedhjetOpsioneve,
      finalPrice: cmimiPerfundimtar,
      quantity: 1,
      branchId: restoranti.branches?.[0]?.id,
      restaurant: {
        id: restoranti.id,
        name: restoranti.name,
        slug: restoranti.slug,
        banner_url: restoranti.banner_url,
      },
    });
    setArtikulliAktiv(null);
  };

  if (duke_ngarkuar) {
    return <div style={{ textAlign: 'center', padding: '60px 0' }}>Duke ngarkuar menynë...</div>;
  }

  if (!restoranti) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Restoranti nuk u gjet</h3>
        <Link to="/restorante" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Kthehu te Restorantet
        </Link>
      </div>
    );
  }

  const branch = restoranti?.branches?.[0];
  const availability = branch?.availability;

  const merrBadgeStatusi = () => {
    if (!availability) {
      return <span className="badge badge-success" style={{ fontSize: '13px' }}>Hapur</span>;
    }
    switch (availability.status) {
      case 'open':
        return <span className="badge badge-success" style={{ fontSize: '13px' }}>✓ Hapur</span>;
      case 'temporarily_closed':
        return <span className="badge badge-warning" style={{ fontSize: '13px' }}>⏸️ Përkohësisht i Mbyllur</span>;
      case 'scheduled_opening':
        return <span className="badge badge-primary" style={{ fontSize: '13px' }}>⏱️ Hapet së Shpejti</span>;
      default:
        return <span className="badge badge-danger" style={{ fontSize: '13px' }}>✗ Mbyllur</span>;
    }
  };

  const merrTekstinEOraritSot = () => {
    if (availability?.today_schedule && availability.today_schedule.length > 0) {
      return availability.today_schedule
        .map((int) => `${int.open} - ${int.close}${int.label ? ` (${int.label})` : ''}`)
        .join(', ');
    }
    return '08:00 - 22:30';
  };

  return (
    <div>
      {/* Njoftim nëse Restoranti është i Mbyllur ose i Pauzuar */}
      {availability && !availability.can_accept_orders && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '12px',
          backgroundColor: availability.status === 'temporarily_closed' ? '#fef3c7' : '#fee2e2',
          border: `1px solid ${availability.status === 'temporarily_closed' ? '#fde68a' : '#fecaca'}`,
          marginBottom: '20px',
          color: availability.status === 'temporarily_closed' ? '#92400e' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <strong>⚠️ {availability.status_label}:</strong> {availability.rejection_reason || 'Porositë janë të çaktivizuara për momentin.'}
            {availability.next_opening && (
              <div style={{ marginTop: '4px', fontWeight: 600 }}>
                🕒 {availability.next_opening.label}
              </div>
            )}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.7)' }}>
            Shfletimi i Menysë është i Hapur
          </span>
        </div>
      )}

      {/* Baneri Kryesor */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ height: '260px', position: 'relative' }}>
          <img
            src={restoranti.banner_url}
            alt={restoranti.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '32px'
          }}>
            <div style={{ color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 800 }}>{restoranti.name}</h1>
                {merrBadgeStatusi()}
                {availability?.is_special_day && (
                  <span className="badge badge-outline" style={{ fontSize: '12px', color: '#fff', borderColor: '#fff' }}>
                    🎉 {availability.special_day_reason}
                  </span>
                )}
              </div>
              <p style={{ maxWidth: '600px', fontSize: '15px', opacity: 0.9 }}>
                {restoranti.description}
              </p>
            </div>
          </div>
        </div>

        {/* Shiriti i Informacioneve të Degës */}
        <div style={{ padding: '16px 32px', backgroundColor: '#f8fafc', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '32px', fontSize: '13px', flexWrap: 'wrap' }}>
          <div>📍 <strong>Dega Përgjegjëse:</strong> {branch?.name || 'Prishtinë'}</div>
          <div>🕒 <strong>Orari Sot:</strong> {merrTekstinEOraritSot()}</div>
          <div>
            ⚡ <strong>Koha e Përgatitjes:</strong> ~{branch?.current_prep_time_minutes || branch?.default_prep_time_minutes || 20} min
            {branch?.busy_mode && (
              <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '10px' }}>
                Fluks i Lartë
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kategoritë e Menysë dhe Artikujt */}
      <div>
        {restoranti.menu_categories?.map((kat) => (
          <div key={kat.id} style={{ marginBottom: '40px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>{kat.name}</h2>
              {kat.description && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{kat.description}</p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {kat.products?.map((prod) => {
                const isOutOfStock = prod.is_out_of_stock || (prod.track_stock && prod.stock_quantity !== null && prod.stock_quantity <= 0);
                const isUnavailable = !prod.is_available || isOutOfStock;

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (!isUnavailable) {
                        handleHapModifikuesin(prod);
                      }
                    }}
                    className="card"
                    style={{
                      padding: '16px',
                      cursor: isUnavailable ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      gap: '16px',
                      transition: 'transform 0.15s ease',
                      opacity: isUnavailable ? 0.6 : 1,
                      position: 'relative'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{prod.name}</h3>
                        {isUnavailable && (
                          <span className="badge badge-danger" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                            {isOutOfStock ? 'E Shitur' : 'Jo Aktiv'}
                          </span>
                        )}
                      </div>

                      <p style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '13px',
                        marginBottom: '12px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {prod.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                          €{parseFloat(prod.base_price).toFixed(2)}
                        </span>
                        <button
                          disabled={isUnavailable}
                          className={`btn ${isUnavailable ? 'btn-outline' : 'btn-outline'}`}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          {isUnavailable ? 'E Shitur' : '+ Personalizo'}
                        </button>
                      </div>
                    </div>

                    {prod.image_url && (
                      <div style={{ width: '96px', height: '96px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                        <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modali i Personalizimit të Produktit */}
      {artikulliAktiv && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{artikulliAktiv.name}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{artikulliAktiv.description}</p>
              </div>
              <button
                onClick={() => setArtikulliAktiv(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Grupet e Modifikuesve */}
            {artikulliAktiv.option_groups?.map((grupi) => (
              <div key={grupi.id} style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{grupi.name}</h4>
                  <span className={`badge ${grupi.is_required ? 'badge-primary' : 'badge-outline'}`} style={{ fontSize: '11px' }}>
                    {grupi.is_required ? 'E Detyrueshme' : 'Opsionale (Maks. ' + grupi.max_selection + ')'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {grupi.choices?.map((opsioni) => {
                    const eshteZgjedhur = (zgjedhjetOpsioneve[grupi.id] || []).includes(opsioni.id);
                    return (
                      <div
                        key={opsioni.id}
                        onClick={() => handleNdryshoZgjedhjen(grupi.id, opsioni.id, grupi.max_selection)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: eshteZgjedhur ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: eshteZgjedhur ? '#f0f9ff' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: eshteZgjedhur ? 600 : 400 }}>{opsioni.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {parseFloat(opsioni.additional_price) > 0 ? `+€${parseFloat(opsioni.additional_price).toFixed(2)}` : 'Përfshirë'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Çmimi dhe Butoni i Shtimit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Çmimi Total</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)' }}>
                  €{llogaritCmiminTotal().toFixed(2)}
                </div>
              </div>
              <button
                onClick={handleShtoNeShporte}
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: '15px' }}
              >
                Shto në Shportë
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
