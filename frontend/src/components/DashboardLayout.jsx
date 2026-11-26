import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Receipt,
  UtensilsCrossed,
  LayoutDashboard,
  Store,
  Settings,
  Shield,
  User,
  Activity,
  ChevronRight,
  Truck,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './DashboardLayout.css';

export default function DashboardLayout({ children, activeTab }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const currentPath = location.pathname;

  const isAdmin = user && ['super_admin', 'admin'].includes(user.role);
  const isManagerOrOwner = user && ['owner', 'branch_manager'].includes(user.role);
  const isKitchenStaff = user && user.role === 'kitchen_staff';
  const isCourier = user && user.role === 'courier';

  const perktheRolin = (r) => {
    switch (r) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrator';
      case 'owner': return 'Pronar Restoranti';
      case 'branch_manager': return 'Menaxher Dege';
      case 'kitchen_staff': return 'Staf Kuzhine';
      case 'courier': return 'Korrier Tastio';
      case 'cashier': return 'Arkëtar Sporteli';
      case 'customer': return 'Klient Tastio';
      default: return r || 'Përdorues';
    }
  };

  const navItems = [
    {
      id: 'courier',
      path: '/korrieri',
      label: 'Paneli i Korrierit',
      icon: Truck,
      visible: isCourier || isAdmin,
    },
    {
      id: 'orders',
      path: '/porosite',
      label: 'Porositë e Mia',
      icon: Receipt,
      visible: true,
    },
    {
      id: 'notifications',
      path: '/njoftimet',
      label: 'Njoftimet',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      visible: true,
    },
    {
      id: 'kds',
      path: '/kds',
      label: 'Kuzhina (KDS)',
      icon: UtensilsCrossed,
      visible: isAdmin || isManagerOrOwner || isKitchenStaff,
    },
    {
      id: 'admin',
      path: '/admin',
      label: 'Paneli Admin',
      icon: LayoutDashboard,
      visible: isAdmin || isManagerOrOwner,
    },
    {
      id: 'operations',
      path: '/admin/operacionet',
      label: 'Operacionet & Orari',
      icon: Store,
      visible: isAdmin || isManagerOrOwner,
    },
    {
      id: 'settings',
      path: '/cilesimet',
      label: 'Cilësimet e Llogarisë',
      icon: Settings,
      visible: true,
    },
  ];

  const visibleItems = navItems.filter((item) => item.visible);

  const getIsActive = (item) => {
    if (activeTab) return activeTab === item.id;
    if (item.path === '/admin') return currentPath === '/admin';
    if (item.path === '/admin/operacionet') return currentPath === '/admin/operacionet' || currentPath === '/operacionet';
    if (item.path === '/cilesimet') return currentPath === '/cilesimet' || currentPath === '/profili';
    return currentPath === item.path;
  };

  return (
    <div className="tastio-dash-wrapper">
      {/* ==========================================================
          Desktop Left Sidebar (Wolt Merchant Style)
          ========================================================== */}
      <aside className="tastio-dash-sidebar" aria-label="Navigimi i Dashboard-it">
        <div className="tastio-dash-sidebar-header">
          <div className="tastio-dash-portal-title">
            <Activity size={13} style={{ color: '#0066ff' }} />
            <span>Paneli i Menaxhimit</span>
          </div>

          <div className="tastio-dash-user-card">
            <div className="tastio-dash-user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
            </div>
            <div className="tastio-dash-user-info">
              <div className="tastio-dash-user-name" title={user?.name}>
                {user?.name || 'Përdorues'}
              </div>
              <div className="tastio-dash-user-role">
                <Shield size={11} />
                <span>{perktheRolin(user?.role)}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="tastio-dash-nav">
          <div className="tastio-dash-nav-section-label">Faqet Kryesore</div>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`tastio-dash-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="tastio-dash-nav-item-left">
                  <Icon className="tastio-dash-nav-icon" size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span style={{
                    background: '#0066ff',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '1px 7px',
                    borderRadius: '9999px',
                  }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : isActive && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
              </Link>
            );
          })}
        </nav>

        <div className="tastio-dash-sidebar-footer">
          <div className="tastio-dash-live-badge">
            <span className="tastio-dash-pulse-dot" />
            <span>Sistemi Operativ • Aktiv</span>
          </div>
        </div>
      </aside>

      {/* ==========================================================
          Mobile Horizontal Sub-Navigation
          ========================================================== */}
      <div className="tastio-dash-mobile-nav">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = getIsActive(item);

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`tastio-dash-mobile-tab ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ==========================================================
          Përmbajtja Kryesore e Dashboard-it
          ========================================================== */}
      <main className="tastio-dash-main">
        <div className="tastio-dash-content-container">
          {children}
        </div>
      </main>
    </div>
  );
}
