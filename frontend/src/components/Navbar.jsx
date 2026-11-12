import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ChevronDown, Menu, X, Briefcase, Store, Truck, Building2, User, LogOut, Navigation, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedCity, setSelectedCity] = useState('Prishtinë');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [partnersDropdownOpen, setPartnersDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePartnersOpen, setMobilePartnersOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cityDropdownRef = useRef(null);
  const partnersDropdownRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const cities = ['Prishtinë', 'Tirana', 'Prizren', 'Pejë', 'Ferizaj', 'Durrës'];

  // Mbyll dropdowns kur klikohet jashtë
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

  // Mbyll me tastin Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setCityDropdownOpen(false);
        setPartnersDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mbyll menytë kur ndryshon faqja
  useEffect(() => {
    setCityDropdownOpen(false);
    setPartnersDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Shfaq shiritin e kërkimit kur përdoruesi zbret poshtë (> 80px)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mbajtja hapur e dropdown-it me hover të butë (pa u zhdukur)
  const handlePartnerMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setPartnersDropdownOpen(true);
  };

  const handlePartnerMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setPartnersDropdownOpen(false);
    }, 180);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/restorante?kategoria=${encodeURIComponent(searchQuery.trim())}`);
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
            Pjesa e Majtë: Emri Tastio dhe Vendndodhja (Prishtinë)
            ========================================================== */}
        <div className="tastio-navbar-left">
          <Link to="/" className="tastio-wordmark" aria-label="Tastio Ballina">
            Tastio
          </Link>

          {/* Butoni rrethor i vendndodhjes */}
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
              placeholder="Vendos adresën e dërgesës ose ushqimin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Kërko adresën e dërgesës"
            />
            <button type="submit" className="tastio-search-icon-right" aria-label="Kërko">
              <Navigation size={18} strokeWidth={2} />
            </button>
          </form>
        </div>

        {/* ==========================================================
            Pjesa e Djathtë: Partnerët, Punë, Kyçu, Regjistrohu
            ========================================================== */}
        <nav className="tastio-navbar-right" aria-label="Navigimi kryesor">
          {/* Dropdown Menu e Partnerëve me hover dhe click */}
          <div
            className="tastio-nav-item"
            ref={partnersDropdownRef}
            onMouseEnter={handlePartnerMouseEnter}
            onMouseLeave={handlePartnerMouseLeave}
          >
            <button
              type="button"
              className={`tastio-nav-link tastio-nav-dropdown-trigger ${partnersDropdownOpen ? 'active' : ''}`}
              onClick={() => setPartnersDropdownOpen(!partnersDropdownOpen)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPartnersDropdownOpen(!partnersDropdownOpen);
                }
              }}
              aria-expanded={partnersDropdownOpen}
              aria-haspopup="true"
            >
              <span>Partnerët</span>
              <ChevronDown
                size={15}
                strokeWidth={2.4}
                className={`tastio-nav-chevron ${partnersDropdownOpen ? 'open' : ''}`}
              />
            </button>

            {partnersDropdownOpen && (
              <div
                className="tastio-dropdown-menu right-aligned tastio-partners-dropdown"
                role="menu"
              >
                <Link
                  to="/partner-restoranti"
                  className="tastio-dropdown-item tastio-partner-item"
                  role="menuitem"
                  onClick={() => setPartnersDropdownOpen(false)}
                >
                  <div className="tastio-partner-item-icon">
                    <Store size={18} />
                  </div>
                  <div className="tastio-partner-item-content">
                    <span className="tastio-partner-item-title">Bëhu Partner Restoranti</span>
                    <span className="tastio-partner-item-subtitle">Rritni porositë dhe shitjet ditore me Tastio</span>
                  </div>
                </Link>

                <Link
                  to="/behu-korrier"
                  className="tastio-dropdown-item tastio-partner-item"
                  role="menuitem"
                  onClick={() => setPartnersDropdownOpen(false)}
                >
                  <div className="tastio-partner-item-icon">
                    <Truck size={18} />
                  </div>
                  <div className="tastio-partner-item-content">
                    <span className="tastio-partner-item-title">Bëhu Korrier</span>
                    <span className="tastio-partner-item-subtitle">Fito me orar fleksibël dhe liri të plotë</span>
                  </div>
                </Link>

                <Link
                  to="/tastio-per-biznese"
                  className="tastio-dropdown-item tastio-partner-item"
                  role="menuitem"
                  onClick={() => setPartnersDropdownOpen(false)}
                >
                  <div className="tastio-partner-item-icon">
                    <Building2 size={18} />
                  </div>
                  <div className="tastio-partner-item-content">
                    <span className="tastio-partner-item-title">Tastio për Biznese</span>
                    <span className="tastio-partner-item-subtitle">Zgjidhje korporative për dreka dhe ngjarje</span>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Punë */}
          <Link to="/pune" className={`tastio-nav-link ${location.pathname === '/pune' ? 'active' : ''}`}>
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
                <LogOut size={14} style={{ marginRight: '6px' }} />
                <span>Çkyçu</span>
              </button>
            </div>
          ) : (
            <div className="tastio-nav-auth-group">
              {/* Kyçu */}
              <Link to="/kyqja" className="tastio-nav-link tastio-nav-login">
                Kyçu
              </Link>

              {/* Regjistrohu me sfond të kaltër (#0865F5) dhe cepa të rrumbullakosur */}
              <Link to="/regjistrim" className="tastio-btn-signup">
                Regjistrohu
              </Link>
            </div>
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
              className="tastio-mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Restorantet Partnere
            </Link>

            {/* Seksioni i Partnerëve me Accordion në Mobile */}
            <div className="tastio-mobile-accordion">
              <button
                type="button"
                className="tastio-mobile-nav-link tastio-mobile-accordion-btn"
                onClick={() => setMobilePartnersOpen(!mobilePartnersOpen)}
              >
                <span>Partnerët</span>
                <ChevronDown
                  size={16}
                  className={`tastio-mobile-chevron ${mobilePartnersOpen ? 'open' : ''}`}
                />
              </button>

              {mobilePartnersOpen && (
                <div className="tastio-mobile-submenu">
                  <Link
                    to="/partner-restoranti"
                    className="tastio-mobile-sublink"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Store size={16} />
                    <span>Bëhu Partner Restoranti</span>
                  </Link>

                  <Link
                    to="/behu-korrier"
                    className="tastio-mobile-sublink"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Truck size={16} />
                    <span>Bëhu Korrier</span>
                  </Link>

                  <Link
                    to="/tastio-per-biznese"
                    className="tastio-mobile-sublink"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Building2 size={16} />
                    <span>Tastio për Biznese</span>
                  </Link>
                </div>
              )}
            </div>

            <Link
              to="/pune"
              className="tastio-mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Punë
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/porosite"
                  className="tastio-mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Porositë e Mia
                </Link>

                {user && (user.role === 'kitchen_staff' || user.role === 'branch_manager' || user.role === 'super_admin') && (
                  <Link
                    to="/kds"
                    className="tastio-mobile-nav-link"
                    style={{ color: '#00c2e8' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Kuzhina (KDS)
                  </Link>
                )}

                {user && (user.role === 'owner' || user.role === 'branch_manager' || user.role === 'super_admin') && (
                  <Link
                    to="/admin"
                    className="tastio-mobile-nav-link"
                    style={{ color: '#38bdf8' }}
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
                  className="tastio-mobile-nav-link"
                  style={{ textAlign: 'center', justifyContent: 'center' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Kyçu
                </Link>
                <Link
                  to="/regjistrim"
                  className="tastio-btn-signup"
                  style={{ textAlign: 'center', justifyContent: 'center', display: 'flex' }}
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
