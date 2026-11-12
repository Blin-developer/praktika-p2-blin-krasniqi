import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, Menu, X, Briefcase, Store, Truck, Building2, User, LogOut, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState('Tirana');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [partnersDropdownOpen, setPartnersDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cityDropdownRef = useRef(null);
  const partnersDropdownRef = useRef(null);

  const cities = ['Tirana', 'Prishtinë', 'Durrës', 'Vlorë', 'Shkodër'];

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setCityDropdownOpen(false);
      }
      if (partnersDropdownRef.current && !partnersDropdownRef.current.contains(event.target)) {
        setPartnersDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show search bar when user scrolls down > 80px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/restorante?adresa=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const merrEmrinERolit = (r) => {
    switch (r) {
      case 'super_admin': return 'Krye-Admin';
      case 'owner': return 'Pronar';
      case 'branch_manager': return 'Menaxher';
      case 'kitchen_staff': return 'Kuzhinë';
      case 'cashier': return 'Arkëtar';
      case 'customer': return 'Klient';
      default: return r;
    }
  };

  return (
    <header className="tastio-navbar-header">
      <div className="tastio-navbar-container">
        {/* ==========================================================
            Pjesa e Majtë: Emri Tastio dhe Vendndodhja (Tirana)
            ========================================================== */}
        <div className="tastio-navbar-left">
          {/* Vetëm teksti Tastio pa asnjë logo, ikonë apo imazh */}
          <Link to="/" className="tastio-wordmark" aria-label="Tastio Ballina">
            Tastio
          </Link>

          {/* Butoni rrethor i vendndodhjes me pin dhe qytetin me shigjetë */}
          <div className="tastio-location-wrapper" ref={cityDropdownRef}>
            <button
              type="button"
              className="tastio-location-btn"
              onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
              aria-label="Zgjidh qytetin"
              aria-expanded={cityDropdownOpen}
            >
              <div className="tastio-location-circle">
                <MapPin size={18} strokeWidth={2.5} />
              </div>
              <span className="tastio-location-text">{selectedCity}</span>
              <ChevronDown
                size={16}
                strokeWidth={2.5}
                className={`tastio-location-chevron ${cityDropdownOpen ? 'open' : ''}`}
              />
            </button>

            {cityDropdownOpen && (
              <div className="tastio-dropdown-menu">
                {cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className={`tastio-dropdown-item ${selectedCity === city ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCity(city);
                      setCityDropdownOpen(false);
                    }}
                  >
                    <MapPin size={15} />
                    <span>{city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ==========================================================
            Qendra: Search Bar që shfaqet kur scrollohet (> 80px)
            ========================================================== */}
        <div className={`tastio-navbar-search-wrap ${scrolled ? 'visible' : ''}`}>
          <form className="tastio-navbar-search-form" onSubmit={handleSearchSubmit}>
            <MapPin size={18} className="tastio-search-icon-left" strokeWidth={2} />
            <input
              type="text"
              className="tastio-navbar-search-input"
              placeholder="Vendos adresën e dërgesës..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Kërko adresën e dërgesës"
            />
            <button type="submit" className="tastio-search-icon-right" aria-label="Zbulo vendndodhjen">
              <Navigation size={18} strokeWidth={2} />
            </button>
          </form>
        </div>

        {/* ==========================================================
            Pjesa e Djathtë: Partnerët, Punë, Kyçu, Regjistrohu
            ========================================================== */}
        <nav className="tastio-navbar-right" aria-label="Navigimi kryesor">
          {/* Partnerët me shigjetë dropdown */}
          <div className="tastio-nav-item" ref={partnersDropdownRef}>
            <button
              type="button"
              className="tastio-nav-link"
              onClick={() => setPartnersDropdownOpen(!partnersDropdownOpen)}
              aria-expanded={partnersDropdownOpen}
            >
              <span>Partnerët</span>
              <ChevronDown
                size={16}
                strokeWidth={2.2}
                className={`tastio-nav-chevron ${partnersDropdownOpen ? 'open' : ''}`}
              />
            </button>

            {partnersDropdownOpen && (
              <div className="tastio-dropdown-menu right-aligned">
                <Link
                  to="/restorante"
                  className="tastio-dropdown-item"
                  onClick={() => setPartnersDropdownOpen(false)}
                >
                  <Store size={16} />
                  <span>Bëhu Partner Restoranti</span>
                </Link>
                <a
                  href="#korrier"
                  className="tastio-dropdown-item"
                  onClick={(e) => {
                    e.preventDefault();
                    setPartnersDropdownOpen(false);
                  }}
                >
                  <Truck size={16} />
                  <span>Bëhu Korrier Tastio</span>
                </a>
                <a
                  href="#biznese"
                  className="tastio-dropdown-item"
                  onClick={(e) => {
                    e.preventDefault();
                    setPartnersDropdownOpen(false);
                  }}
                >
                  <Building2 size={16} />
                  <span>Tastio për Biznese</span>
                </a>
              </div>
            )}
          </div>

          {/* Punë */}
          <Link to="/restorante" className="tastio-nav-link">
            Punë
          </Link>

          {/* Autentifikimi / Llogaria */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Link to="/porosite" className="tastio-nav-link" style={{ fontSize: '14px' }}>
                Porositë e Mia
              </Link>

              {user && (user.role === 'kitchen_staff' || user.role === 'branch_manager' || user.role === 'super_admin') && (
                <Link to="/kds" className="tastio-nav-link" style={{ color: '#00c2e8', fontSize: '14px' }}>
                  Kuzhina (KDS)
                </Link>
              )}

              {user && (user.role === 'owner' || user.role === 'branch_manager' || user.role === 'super_admin') && (
                <Link to="/admin" className="tastio-nav-link" style={{ color: '#38bdf8', fontSize: '14px' }}>
                  Paneli Admin
                </Link>
              )}

              <div className="tastio-user-badge">
                <User size={14} />
                <span>{user?.name} ({merrEmrinERolit(user?.role)})</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="tastio-btn-logout"
                title="Çkyçu nga llogaria"
              >
                Çkyçu
              </button>
            </div>
          ) : (
            <>
              {/* Kyçu */}
              <Link to="/kyqja" className="tastio-nav-link">
                Kyçu
              </Link>

              {/* Regjistrohu me sfond të kaltër dhe cepa të rrumbullakosur (#0865F5) */}
              <Link to="/regjistrim" className="tastio-btn-signup">
                Regjistrohu
              </Link>
            </>
          )}
        </nav>

        {/* Butoni Mobile Hamburger */}
        <button
          type="button"
          className="tastio-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Mbyll menynë' : 'Hap menynë'}
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* ==========================================================
          Menyja e Përshtatur për Pajisje Mobile / Tablet
          ========================================================== */}
      {mobileMenuOpen && (
        <div className="tastio-mobile-menu">
          <div className="tastio-mobile-links">
            <Link
              to="/restorante"
              className="tastio-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Restorantet Partnere
            </Link>

            <Link
              to="/restorante"
              className="tastio-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Punë
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/porosite"
                  className="tastio-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Porositë e Mia
                </Link>

                {user && (user.role === 'kitchen_staff' || user.role === 'branch_manager' || user.role === 'super_admin') && (
                  <Link
                    to="/kds"
                    className="tastio-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Kuzhina (KDS)
                  </Link>
                )}

                {user && (user.role === 'owner' || user.role === 'branch_manager' || user.role === 'super_admin') && (
                  <Link
                    to="/admin"
                    className="tastio-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Paneli Admin
                  </Link>
                )}

                <div className="tastio-mobile-auth">
                  <div className="tastio-user-badge" style={{ justifyContent: 'center' }}>
                    <User size={14} />
                    <span>{user?.name} ({merrEmrinERolit(user?.role)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="tastio-btn-logout"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    Çkyçu
                  </button>
                </div>
              </>
            ) : (
              <div className="tastio-mobile-auth">
                <Link
                  to="/kyqja"
                  className="tastio-nav-link"
                  style={{ textAlign: 'center', justifyContent: 'center' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Kyçu
                </Link>
                <Link
                  to="/regjistrim"
                  className="tastio-btn-signup"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Regjistrohu
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

