import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Store,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import './CartDrawer.css';

export default function CartDrawer() {
  const {
    items,
    totalItemsCount,
    subtotal,
    deliveryFee,
    grandTotal,
    activeRestaurant,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    conflictState,
    resolveConflict,
  } = useCart();

  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // Mbyll me tastin Escape kur është e hapur
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isCartOpen) {
        closeCart();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, closeCart]);

  // Ndal scroll-in në sfond kur shporta është e hapur
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  const handleCheckoutClick = () => {
    closeCart();
    navigate('/checkout');
  };

  const handleExploreRestaurants = () => {
    closeCart();
    navigate('/restorante');
  };

  /**
   * Shfaq përshkrimin e modifikuesve të zgjedhur për artikullin
   */
  const renderOptionSummaries = (item) => {
    if (!item.selectedChoices || Object.keys(item.selectedChoices).length === 0) {
      return null;
    }

    const labels = [];
    const product = item.product;

    if (product && product.option_groups) {
      product.option_groups.forEach((group) => {
        const selectedIds = item.selectedChoices[group.id] || [];
        group.choices?.forEach((choice) => {
          if (selectedIds.includes(choice.id)) {
            const addPrice = parseFloat(choice.additional_price || 0);
            labels.push(
              `${choice.name}${addPrice > 0 ? ` (+€${addPrice.toFixed(2)})` : ''}`
            );
          }
        });
      });
    }

    if (labels.length === 0) return null;

    return <div className="tastio-cart-item-options">{labels.join(' • ')}</div>;
  };

  return (
    <>
      {/* Sfondi i Errët Transparent */}
      <div
        className={`tastio-cart-overlay ${isCartOpen ? 'open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Paneli Rrëshqitës i Shportës (Cart Drawer) */}
      <aside
        ref={drawerRef}
        className={`tastio-cart-drawer ${isCartOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shporta e blerjeve"
      >
        {/* Kreu i Shportës */}
        <div className="tastio-cart-header">
          <div className="tastio-cart-title-wrap">
            <div className="tastio-cart-title-row">
              <h2 className="tastio-cart-title">Shporta</h2>
              {totalItemsCount > 0 && (
                <span className="tastio-cart-count-badge">
                  {totalItemsCount} {totalItemsCount === 1 ? 'artikull' : 'artikuj'}
                </span>
              )}
            </div>
            {activeRestaurant && items.length > 0 && (
              <span className="tastio-cart-restaurant-name">
                {activeRestaurant.name}
              </span>
            )}
          </div>

          <button
            type="button"
            className="tastio-cart-close-btn"
            onClick={closeCart}
            aria-label="Mbyll shportën"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Trupi i Shportës */}
        <div className="tastio-cart-body">
          {items.length === 0 ? (
            /* Gjendja Bosh e Shportës */
            <div className="tastio-cart-empty">
              <div className="tastio-cart-empty-icon">
                <ShoppingBag size={38} strokeWidth={1.5} />
              </div>
              <h3 className="tastio-cart-empty-title">Shporta juaj është e zbrazët</h3>
              <p className="tastio-cart-empty-desc">
                Shtoni pjatat tuaja të preferuara nga restorantet tona për të filluar porosinë.
              </p>
              <button
                type="button"
                className="tastio-cart-empty-btn"
                onClick={handleExploreRestaurants}
              >
                Eksploro Menytë
              </button>
            </div>
          ) : (
            /* Lista e Artikujve */
            items.map((item, idx) => {
              const unitPrice = parseFloat(item.unitPrice || item.finalPrice || item.product?.base_price || 0);
              const lineTotal = unitPrice * (item.quantity || 1);
              const productImage = item.product?.image_url;

              return (
                <div key={item.fingerprint || `${item.product?.id}-${idx}`} className="tastio-cart-item">
                  {productImage && (
                    <img
                      src={productImage}
                      alt={item.product?.name || 'Produkt'}
                      className="tastio-cart-item-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}

                  <div className="tastio-cart-item-content">
                    <div className="tastio-cart-item-top">
                      <span className="tastio-cart-item-name">
                        {item.product?.name || 'Produkt'}
                      </span>
                      <button
                        type="button"
                        className="tastio-cart-item-remove-btn"
                        onClick={() => removeItem(idx)}
                        title="Hiq nga shporta"
                        aria-label={`Hiq ${item.product?.name} nga shporta`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {renderOptionSummaries(item)}

                    <div className="tastio-cart-item-bottom">
                      <span className="tastio-cart-item-price">
                        €{lineTotal.toFixed(2)}
                      </span>

                      {/* Kontrolli i Sasisë */}
                      <div className="tastio-cart-qty-controls">
                        <button
                          type="button"
                          className="tastio-cart-qty-btn"
                          onClick={() => updateQuantity(idx, -1)}
                          aria-label="Zvogëlo sasinë"
                        >
                          <Minus size={13} strokeWidth={2.5} />
                        </button>
                        <span className="tastio-cart-qty-num">{item.quantity || 1}</span>
                        <button
                          type="button"
                          className="tastio-cart-qty-btn"
                          onClick={() => updateQuantity(idx, 1)}
                          aria-label="Rrit sasinë"
                        >
                          <Plus size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pjesa e Poshtme / Përmbledhja dhe Checkout */}
        {items.length > 0 && (
          <div className="tastio-cart-footer">
            <div className="tastio-cart-summary-line">
              <span>Nëntotali</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>

            <div className="tastio-cart-summary-line">
              <span>Tarifa e dërgesës</span>
              <span>€{deliveryFee.toFixed(2)}</span>
            </div>

            <div className="tastio-cart-summary-line total">
              <span>Totali</span>
              <span>€{grandTotal.toFixed(2)}</span>
            </div>

            <button
              type="button"
              className="tastio-cart-checkout-btn"
              onClick={handleCheckoutClick}
            >
              <span>Vazhdo te Pagesa</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>€{grandTotal.toFixed(2)}</span>
                <ArrowRight size={17} strokeWidth={2.4} />
              </div>
            </button>

            <button
              type="button"
              className="tastio-cart-clear-link"
              onClick={clearCart}
            >
              Pastro të gjithë shportën
            </button>
          </div>
        )}
      </aside>

      {/* Modali i Konfliktit të Restorantit (Wolt Pattern) */}
      {conflictState.isOpen && (
        <div className="tastio-conflict-modal-overlay">
          <div className="tastio-conflict-modal" role="alertdialog" aria-modal="true">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertCircle size={22} color="#f59e0b" />
              <h3 className="tastio-conflict-title" style={{ margin: 0 }}>
                Krijoni porosi nga një restorant tjetër?
              </h3>
            </div>
            <p className="tastio-conflict-desc">
              Shporta juaj aktualisht përmban artikuj nga restoranti{' '}
              <strong>{activeRestaurant?.name || 'ekzistues'}</strong>. Porositë në Tastio mund të bëhen nga një restorant përnjëherë.
              <br /><br />
              Dëshironi të pastroni shportën ekzistuese dhe të shtoni këtë produkt të ri?
            </p>
            <div className="tastio-conflict-actions">
              <button
                type="button"
                className="tastio-conflict-btn-confirm"
                onClick={() => resolveConflict(true)}
              >
                Pastro dhe Shto Produktin e Ri
              </button>
              <button
                type="button"
                className="tastio-conflict-btn-cancel"
                onClick={() => resolveConflict(false)}
              >
                Mbaj Shportën Aktuale
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

