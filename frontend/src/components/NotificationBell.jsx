import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Package,
  Truck,
  AlertTriangle,
  CreditCard,
  UtensilsCrossed,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationBell.css';

export function formatRelativeAlbanianTime(isoString) {
  if (!isoString) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (diffSec < 60) return 'Tani';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min më parë`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} orë më parë`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Dje';
  return `${diffDays} ditë më parë`;
}

export function getNotificationIcon(type) {
  switch (type) {
    case 'delivery_assigned':
    case 'delivery_reassigned':
    case 'delivery_updated':
    case 'customer_delivery':
      return { Icon: Truck, tone: 'blue' };
    case 'kitchen_new_order':
    case 'kitchen_order_updated':
      return { Icon: UtensilsCrossed, tone: 'amber' };
    case 'payment_confirmed':
      return { Icon: CreditCard, tone: 'green' };
    case 'payment_failed':
    case 'admin_payment_failed':
    case 'admin_delivery_issue':
    case 'admin_attention_required':
    case 'kitchen_order_attention':
    case 'order_cancelled':
    case 'kitchen_order_cancelled':
    case 'delivery_cancelled':
      return { Icon: AlertTriangle, tone: 'red' };
    default:
      return { Icon: Package, tone: 'blue' };
  }
}

export default function NotificationBell({ variant = 'dark' }) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onEscape);
    };
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications();
    }
  };

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }
    setOpen(false);
    if (item.action_url) {
      navigate(item.action_url);
    }
  };

  return (
    <div className={`tastio-notif-wrapper ${variant}`} ref={wrapperRef}>
      <button
        type="button"
        className={`tastio-notif-bell-btn ${open ? 'active' : ''}`}
        onClick={handleToggle}
        aria-label={`Njoftimet${unreadCount > 0 ? ` (${unreadCount} të palexuara)` : ''}`}
        aria-expanded={open}
        title="Njoftimet"
      >
        <Bell size={19} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="tastio-notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="tastio-notif-dropdown" role="dialog" aria-label="Qendra e njoftimeve">
          <div className="tastio-notif-header">
            <div className="tastio-notif-header-left">
              <h3>Njoftimet</h3>
              {unreadCount > 0 && (
                <span className="tastio-notif-count-pill">{unreadCount} të reja</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="tastio-notif-mark-all"
                onClick={markAllAsRead}
                title="Shëno të gjitha si të lexuara"
              >
                <CheckCheck size={14} />
                <span>Lexo të gjitha</span>
              </button>
            )}
          </div>

          <div className="tastio-notif-list">
            {loading && notifications.length === 0 && (
              <div className="tastio-notif-state">Duke ngarkuar njoftimet...</div>
            )}

            {error && (
              <div className="tastio-notif-state error">{error}</div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="tastio-notif-state">
                <Bell size={28} style={{ opacity: 0.35, marginBottom: '6px' }} />
                <div>Nuk keni asnjë njoftim aktualisht.</div>
              </div>
            )}

            {notifications.slice(0, 8).map((item) => {
              const { Icon, tone } = getNotificationIcon(item.type);
              return (
                <div
                  key={item.id}
                  className={`tastio-notif-item ${!item.is_read ? 'unread' : ''}`}
                  onClick={() => handleItemClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                >
                  <div className={`tastio-notif-icon ${tone}`}>
                    <Icon size={16} />
                  </div>

                  <div className="tastio-notif-content">
                    <div className="tastio-notif-item-top">
                      <span className="tastio-notif-title">{item.title}</span>
                      {!item.is_read && <span className="tastio-notif-dot" aria-label="E palexuar" />}
                    </div>
                    <p className="tastio-notif-message">{item.message}</p>
                    <div className="tastio-notif-meta">
                      <Clock size={11} />
                      <span>{formatRelativeAlbanianTime(item.created_at)}</span>
                      {item.payload?.order_number && (
                        <span className="tastio-notif-order-tag">#{item.payload.order_number}</span>
                      )}
                    </div>
                  </div>

                  <div className="tastio-notif-item-actions" onClick={(e) => e.stopPropagation()}>
                    {!item.is_read && (
                      <button
                        type="button"
                        className="tastio-notif-action-btn"
                        onClick={() => markAsRead(item.id)}
                        title="Shëno si të lexuar"
                        aria-label="Shëno si të lexuar"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="tastio-notif-action-btn danger"
                      onClick={() => deleteNotification(item.id)}
                      title="Fshi njoftimin"
                      aria-label="Fshi njoftimin"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="tastio-notif-footer-btn"
            onClick={() => {
              setOpen(false);
              navigate('/njoftimet');
            }}
          >
            <span>Shiko të gjitha njoftimet</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
