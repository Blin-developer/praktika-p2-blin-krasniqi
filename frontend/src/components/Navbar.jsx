import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin,
  ChevronDown,
  Menu,
  X,
  Store,
  Truck,
  Building2,
  User,
  LogOut,
  Navigation,
  Receipt,
  UtensilsCrossed,
  LayoutDashboard,
  Settings,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItemsCount, toggleCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedCity, setSelectedCity] = useState('Prishtinë');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [partnersDropdownOpen, setPartnersDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePartnersOpen, setMobilePartnersOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cityDropdownRef = useRef(null);
  const partnersDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
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
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
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
        setUserDropdownOpen(false);
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
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Shfaq shiritin e kërkimit kur përdoruesi zbret poshtë (> 80px)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mbajtja hapur e dropdown-it të Partnerëve me hover të butë
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
    setUserDropdownOpen(false);
  };

  // Emri i shfaqur në Navbar:
  // Nëse është Admin dhe ka emrin default "Super Administratori", shfaqim "Admin".
  // Kur administratori e ndryshon te Cilësimet e Llogarisë, shfaqet emri i ri i përditësuar.
  const merrEmrinPerNavbar = () => {
    if (!user) return '';
    if (['super_admin', 'admin'].includes(user.role)) {
      if (!user.name || user.name === 'Super Administratori') {
        return 'Admin';
      }
      return user.name;
    }
    return user.name || 'Klient';
  };

  const isAdmin = user && ['super_admin', 'admin'].includes(user.role);
  const isManagerOrOwner = user && ['owner', 'branch_manager'].includes(user.role);
  const isKitchenStaff = user && user.role === 'kitchen_staff';

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
            Pjesa e Djathtë: Partnerët, Punë, dhe Llogaria / Autentifikimi
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

          {/* ==========================================================
              Llogaria e Kyçur (Dropdown Minimalist & Elegant)
              ========================================================== */}
          {isAuthenticated ? (
            <div className="tastio-nav-item" ref={userDropdownRef}>
              {/* Ikona e Shportës me badge */}
              <button
                type="button"
                className="tastio-cart-nav-btn"
                onClick={toggleCart}
                aria-label={`Shporta${totalItemsCount > 0 ? ` (${totalItemsCount} artikuj)` : ''}`}
                title="Shikoni shportën"
              >
                <ShoppingBag size={19} strokeWidth={2} />
                {totalItemsCount > 0 && (
                  <span className="tastio-cart-nav-badge">{totalItemsCount}</span>
                )}
              </button>
              <button
                type="button"
                className={`tastio-admin-dropdown-btn ${userDropdownOpen ? 'active' : ''}`}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setUserDropdownOpen(!userDropdownOpen);
                  }
                }}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                aria-label={`Menyja e përdoruesit ${merrEmrinPerNavbar()}`}
              >
                <div className="tastio-admin-avatar">
                  <User size={15} />
                </div>
                <span className="tastio-admin-name">{merrEmrinPerNavbar()}</span>
                <ChevronDown
                  size={15}
                  strokeWidth={2.4}
                  className={`tastio-nav-chevron ${userDropdownOpen ? 'open' : ''}`}
                />
              </button>

              {userDropdownOpen && (
                <div className="tastio-dropdown-menu right-aligned tastio-user-dropdown" role="menu">
                  {/* 1. Porositë e Mia */}
                  <Link
                    to="/porosite"
                    className="tastio-dropdown-item tastio-user-dropdown-item"
                    role="menuitem"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Receipt size={16} className="tastio-menu-icon" />
                    <span>Porositë e Mia</span>
                  </Link>

                  {/* 2. Kuzhina (KDS) - Vetëm për Admin dhe Staf */}
                  {(isAdmin || isManagerOrOwner || isKitchenStaff) && (
                    <Link
                      to="/kds"
                      className="tastio-dropdown-item tastio-user-dropdown-item"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <UtensilsCrossed size={16} className="tastio-menu-icon" />
                      <span>Kuzhina (KDS)</span>
                    </Link>
                  )}

                  {/* 3. Paneli Admin - Vetëm për Admin dhe Pronar/Menaxher */}
                  {(isAdmin || isManagerOrOwner) && (
                    <Link
                      to="/admin"
                      className="tastio-dropdown-item tastio-user-dropdown-item"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <LayoutDashboard size={16} className="tastio-menu-icon" />
                      <span>Paneli Admin</span>
                    </Link>
                  )}

                  {/* 4. Cilësimet e Llogarisë */}
                  <Link
                    to="/cilesimet"
                    className="tastio-dropdown-item tastio-user-dropdown-item"
                    role="menuitem"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Settings size={16} className="tastio-menu-icon" />
                    <span>Cilësimet e Llogarisë</span>
                  </Link>

                  <div className="tastio-dropdown-divider" />

                  {/* 5. Dil nga llogaria */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="tastio-dropdown-item tastio-user-dropdown-item logout"
                    role="menuitem"
                  >
                    <LogOut size={16} className="tastio-menu-icon logout" />
                    <span>Dil nga llogaria</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="tastio-nav-auth-group">
              {/* Cart Button për vizitorët gjithashtu */}
              <button
                type="button"
                className="tastio-cart-nav-btn"
                onClick={toggleCart}
                aria-label={`Shporta${totalItemsCount > 0 ? ` (${totalItemsCount} artikuj)` : ''}`}
                title="Shikoni shportën"
              >
                <ShoppingBag size={19} strokeWidth={2} />
                {totalItemsCount > 0 && (
                  <span className="tastio-cart-nav-badge">{totalItemsCount}</span>
                )}
              </button>
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
              <div className="tastio-mobile-auth">
                {/* Header për llogarinë në Mobile */}
                <div className="tastio-mobile-user-header">
                  <div className="tastio-admin-avatar">
                    <User size={15} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff' }}>
                    {merrEmrinPerNavbar()}
                  </span>
                </div>

                {/* 1. Porositë e Mia */}
                <Link
                  to="/porosite"
                  className="tastio-mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Receipt size={16} style={{ color: '#00c2e8' }} />
                    <span>Porositë e Mia</span>
                  </span>
                </Link>

                {/* 2. Kuzhina KDS */}
                {(isAdmin || isManagerOrOwner || isKitchenStaff) && (
                  <Link
                    to="/kds"
                    className="tastio-mobile-nav-link"
                    style={{ color: '#00c2e8' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <UtensilsCrossed size={16} />
                      <span>Kuzhina (KDS)</span>
                    </span>
                  </Link>
                )}

                {/* 3. Paneli Admin */}
                {(isAdmin || isManagerOrOwner) && (
                  <Link
                    to="/admin"
                    className="tastio-mobile-nav-link"
                    style={{ color: '#38bdf8' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <LayoutDashboard size={16} />
                      <span>Paneli Admin</span>
                    </span>
                  </Link>
                )}

                {/* 4. Cilësimet e Llogarisë */}
                <Link
                  to="/cilesimet"
                  className="tastio-mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Settings size={16} style={{ color: '#cbd5e1' }} />
                    <span>Cilësimet e Llogarisë</span>
                  </span>
                </Link>

                {/* 5. Dil nga llogaria */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="tastio-mobile-logout-btn"
                >
                  <LogOut size={16} />
                  <span>Dil nga llogaria</span>
                </button>
              </div>
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
