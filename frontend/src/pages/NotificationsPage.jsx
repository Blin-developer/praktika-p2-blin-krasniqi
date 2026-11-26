import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { useNotifications } from '../contexts/NotificationContext';
import { formatRelativeAlbanianTime, getNotificationIcon } from '../components/NotificationBell';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const { unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadPage = useCallback(async (targetPage = page, targetFilter = filter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notifications', {
        params: { page: targetPage, filter: targetFilter, per_page: 15 },
      });
      if (res.data?.success) {
        setItems(res.data.data || []);
        setMeta(res.data.meta || { current_page: 1, last_page: 1, total: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Nuk u arrit të ngarkohej historiku i njoftimeve.');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    loadPage(page, filter);
  }, [page, filter, unreadCount, loadPage]);

  const handleMarkOne = async (id) => {
    await markAsRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const handleOpen = async (item) => {
    if (!item.is_read) {
      await handleMarkOne(item.id);
    }
    if (item.action_url) {
      navigate(item.action_url);
    }
  };

  return (
    <DashboardLayout activeTab="notifications">
      <div className="tastio-notifs-page">
        <div className="tastio-notifs-hero">
          <div>
            <div className="tastio-notifs-eyebrow">Qendra e Njoftimeve • Live Sync</div>
            <h1>Njoftimet e Mia</h1>
            <p>Ndiqni në kohë reale statusin e porosive, dërgesave, pagesave dhe sinjalizimeve.</p>
          </div>

          <div className="tastio-notifs-hero-actions">
            {unreadCount > 0 && (
              <button type="button" className="btn btn-primary" onClick={handleMarkAll}>
                <CheckCheck size={16} />
                <span>Shëno të gjitha si të lexuara ({unreadCount})</span>
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => loadPage(page, filter)}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Rifresko</span>
            </button>
          </div>
        </div>

        <div className="tastio-notifs-filters">
          {[
            { key: 'all', label: 'Të gjitha' },
            { key: 'unread', label: `Të palexuara (${unreadCount})` },
            { key: 'read', label: 'Të lexuara' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tastio-notifs-filter-btn ${filter === tab.key ? 'active' : ''}`}
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="tastio-notifs-error">{error}</div>
        )}

        <div className="tastio-notifs-card">
          {loading && items.length === 0 ? (
            <div className="tastio-notifs-empty">Duke ngarkuar njoftimet...</div>
          ) : items.length === 0 ? (
            <div className="tastio-notifs-empty">
              <Bell size={36} style={{ opacity: 0.35, marginBottom: '10px' }} />
              <div style={{ fontWeight: 700, color: '#18181b', fontSize: '16px' }}>
                Nuk ka njoftime në këtë kategori
              </div>
              <p style={{ fontSize: '13.5px', color: '#64748b', marginTop: '4px' }}>
                Njoftimet e reja do të shfaqen automatikisht këtu pa pasur nevojë për rifreskim.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const { Icon, tone } = getNotificationIcon(item.type);
              return (
                <div
                  key={item.id}
                  className={`tastio-notifs-row ${!item.is_read ? 'unread' : ''}`}
                  onClick={() => handleOpen(item)}
                >
                  <div className={`tastio-notif-icon ${tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="tastio-notifs-row-body">
                    <div className="tastio-notifs-row-title">
                      <span>{item.title}</span>
                      {!item.is_read && <span className="tastio-notif-dot" />}
                    </div>
                    <p>{item.message}</p>
                    <div className="tastio-notif-meta">
                      <Clock size={12} />
                      <span>{formatRelativeAlbanianTime(item.created_at)}</span>
                      {item.payload?.order_number && (
                        <span className="tastio-notif-order-tag">#{item.payload.order_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="tastio-notifs-row-actions" onClick={(e) => e.stopPropagation()}>
                    {!item.is_read && (
                      <button
                        type="button"
                        className="tastio-notif-action-btn"
                        onClick={() => handleMarkOne(item.id)}
                        title="Shëno si të lexuar"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="tastio-notif-action-btn danger"
                      onClick={() => handleDelete(item.id)}
                      title="Fshi njoftimin"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {meta.last_page > 1 && (
          <div className="tastio-notifs-pagination">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={15} /> Mbrapa
            </button>
            <span>Faqja {meta.current_page} nga {meta.last_page}</span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            >
              Para <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
