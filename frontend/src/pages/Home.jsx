import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Navigation, 
  ArrowRight, 
  Star, 
  Clock, 
  Bike, 
  UtensilsCrossed, 
  ChevronRight,
  Sparkles,
  Store,
  Heart,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [adresa, setAdresa] = useState('');
  const [lokacioniAktiv, setLokacioniAktiv] = useState(false);
  const [shfaqSugjerimet, setShfaqSugjerimet] = useState(false);
  const [kategoriaAktive, setKategoriaAktive] = useState('te-gjitha');
  const [tePreferuarat, setTePreferuarat] = useState({});

  const sugjerimet = [
    'Prishtinë, Bulevardi Nënë Tereza',
    'Tiranë, Sheshi Skënderbej',
    'Prishtinë, Bregu i Diellit',
    'Tiranë, Ish-Blloku',
    'Durrës, Shëtitorja Taulantia',
    'Prishtinë, Dardania'
  ];

  const trajtoKerko = (e) => {
    e.preventDefault();
    if (adresa.trim()) {
      navigate(`/restorante?adresa=${encodeURIComponent(adresa)}`);
    } else {
      navigate('/restorante');
    }
  };

  const zgjidhSugjerim = (sugjerim) => {
    setAdresa(sugjerim);
    setShfaqSugjerimet(false);
  };

  const merrLokacioninAktual = () => {
    setLokacioniAktiv(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setAdresa('Prishtinë, Qendër (Lokacioni yt)');
          setLokacioniAktiv(false);
        },
        () => {
          setAdresa('Prishtinë, Bulevardi Nënë Tereza');
          setLokacioniAktiv(false);
        }
      );
    } else {
      setAdresa('Tiranë, Blloku');
      setLokacioniAktiv(false);
    }
  };

  const toggleFavorite = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setTePreferuarat(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Kategoritë e Ushqimit me Fotografi Reale
  const kategorite = [
    {
      id: 'burger',
      emri: 'Burger',
      restorante: '32 Restorante',
      foto: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'pizza',
      emri: 'Pizza',
      restorante: '45 Restorante',
      foto: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'sushi',
      emri: 'Sushi',
      restorante: '14 Restorante',
      foto: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'pasta',
      emri: 'Pasta',
      restorante: '28 Restorante',
      foto: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'fast-food',
      emri: 'Fast Food',
      restorante: '50 Restorante',
      foto: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'embelsira',
      emri: 'Ëmbëlsira',
      restorante: '22 Restorante',
      foto: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'grill',
      emri: 'Grill',
      restorante: '38 Restorante',
      foto: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'pije',
      emri: 'Pije & Kafe',
      restorante: '40 Lokale',
      foto: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'tradicionale',
      emri: 'Tradicionale',
      restorante: '19 Restorante',
      foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
    },
  ];

  // Restorantet më të Pëlqyera
  const restorantetKryesore = [
    {
      id: 1,
      slug: 'proper-pizza-prishtine',
      emri: 'Proper Pizza Prishtinë',
      kategoriTag: 'pizza',
      kategoria: 'Pica • Italiane • Brumosura',
      vleresimi: '4.9',
      rishikime: '540+',
      koha: '20–30 min',
      tarifa: 'Dërgesa Falas',
      bejxhi: 'Më i porosituri',
      foto: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      slug: 'smash-burger-bar',
      emri: 'Smash Burger Bar',
      kategoriTag: 'burger',
      kategoria: 'Burger • Fast Food • Qepë Karamelizuar',
      vleresimi: '4.8',
      rishikime: '380+',
      koha: '15–25 min',
      tarifa: 'Dërgesa 0.99 €',
      bejxhi: 'Oferta speciale',
      foto: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 3,
      slug: 'sushico-tirana',
      emri: 'Sushico Tirana',
      kategoriTag: 'sushi',
      kategoria: 'Sushi • Aziatike • Poke Bowl',
      vleresimi: '4.9',
      rishikime: '290+',
      koha: '30–40 min',
      tarifa: 'Dërgesa Falas',
      bejxhi: 'Top Cilësi',
      foto: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 4,
      slug: 'tartine-deli-pasta',
      emri: 'Tartine Artisan Deli',
      kategoriTag: 'pasta',
      kategoria: 'Pasta e Freskët • Sallata • Sanduiçë',
      vleresimi: '4.7',
      rishikime: '210+',
      koha: '25–35 min',
      tarifa: 'Dërgesa 0.99 €',
      bejxhi: 'Ushqim i Shëndetshëm',
      foto: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 5,
      slug: 'pasticeri-reka',
      emri: 'Pasticeri Reka',
      kategoriTag: 'embelsira',
      kategoria: 'Ëmbëlsira • Torta • Cheesecakes',
      vleresimi: '4.9',
      rishikime: '410+',
      koha: '20–30 min',
      tarifa: 'Dërgesa Falas',
      bejxhi: 'Zgjedhja e Javës',
      foto: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 6,
      slug: 'taverna-tirona-grill',
      emri: 'Taverna Tradicionale',
      kategoriTag: 'grill',
      kategoria: 'Mish në Zgarë • Tavë Dheu • Qebapa',
      vleresimi: '4.8',
      rishikime: '350+',
      koha: '30–45 min',
      tarifa: 'Dërgesa 1.20 €',
      bejxhi: 'Shije Autentike',
      foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const restorantetFiltruar = kategoriaAktive === 'te-gjitha' 
    ? restorantetKryesore 
    : restorantetKryesore.filter(r => r.kategoriTag === kategoriaAktive);

  // Ushqimet Reale të Ndryshme për Marquee Showcase (Frymëzuar nga Wolt me Shije Autentike)
  const ushqimetShowcaseRreshti1 = [
    { emri: 'Pica Napolitane', foto: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=pizza' },
    { emri: 'Smash Burger', foto: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=burger' },
    { emri: 'Sushi Roll', foto: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=sushi' },
    { emri: 'Krahë Pule Kërcitës', foto: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=fast-food' },
    { emri: 'Pasta Carbonara', foto: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=pasta' },
    { emri: 'Qebapa & Zgarë', foto: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=grill' },
    { emri: 'Taco Meksikane', foto: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=fast-food' },
    { emri: 'Cheesecake Luleshtrydhe', foto: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=embelsira' },
    { emri: 'Patate të Skuqura', foto: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=fast-food' },
    { emri: 'Kafe & Latte Art', foto: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=pije' },
    { emri: 'Sanduiç Artizanal', foto: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=fast-food' },
    { emri: 'Poke Bowl me Salmon', foto: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=sushi' },
  ];

  const ushqimetShowcaseRreshti2 = [
    { emri: 'Doner Kebab Special', foto: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=fast-food' },
    { emri: 'Biftek në Zgarë', foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=grill' },
    { emri: 'Sufle Çokollate', foto: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=embelsira' },
    { emri: 'Brioshë & Furrë', foto: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=embelsira' },
    { emri: 'Kalcone Italiane', foto: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=pizza' },
    { emri: 'Fruta Deti & Kallamar', foto: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=tradicionale' },
    { emri: 'Ramen Japonez', foto: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=sushi' },
    { emri: 'Smuthi me Fruta', foto: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=pije' },
    { emri: 'Sallatë Mediterane', foto: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=tradicionale' },
    { emri: 'Pite Tradicionale', foto: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=tradicionale' },
    { emri: 'Hot Dog Gurmet', foto: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=fast-food' },
    { emri: 'Akullore Artizanale', foto: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=260&auto=format&fit=crop&q=80', link: '/restorante?kategoria=embelsira' },
  ];

  return (
    <div className="tastio-home">
      {/* ==========================================================
          1. HERO SECTION (I zmadhuar dhe dominues sipas fotos së Wolt)
          ========================================================== */}
      <section className="tastio-hero">
        <div className="tastio-hero-glow-1"></div>
        <div className="tastio-hero-glow-2"></div>

        <div className="tastio-hero-inner">
          {/* Floating Widget Majtas */}
          <div className="tastio-floating-widget tastio-widget-left">
            <span className="tastio-pulse-dot"></span>
            <span>⚡ Dërgesë ekspres • 24 min</span>
          </div>

          {/* Floating Widget Djathtas */}
          <div className="tastio-floating-widget tastio-widget-right">
            <span>⭐ 4.9/5 (12,400+ Porosi)</span>
          </div>

          {/* Bejxhi lart me animacion */}
          <div className="tastio-hero-badge" onClick={() => navigate('/restorante')}>
            <Sparkles size={16} />
            <span>🌱 Shijo më shumë, prit më pak</span>
            <ChevronRight size={16} />
          </div>

          {/* Titulli Gjigant me Tipografi të Theksuar */}
          <h1 className="tastio-hero-headline">
            GJITHÇKA QË DËSHIRON.<br />DIREKT TE DERA JOTE.
          </h1>

          {/* Nëntitulli sqarues */}
          <p className="tastio-hero-subtitle">
            Ushqimi yt i preferuar, restorantet më të mira dhe gjithçka që të duhet, vetëm disa klikime larg.
          </p>

          {/* Shiriti i Kërkimit të Adresës me Sugjerime Autocomplete */}
          <div className="tastio-search-box-wrapper">
            <form className="tastio-hero-search" onSubmit={trajtoKerko}>
              <MapPin size={24} className="tastio-search-pin" />
              <input
                type="text"
                className="tastio-search-input"
                placeholder="Vendos adresën e dërgesës..."
                value={adresa}
                onChange={(e) => setAdresa(e.target.value)}
                onFocus={() => setShfaqSugjerimet(true)}
                aria-label="Adresa e dërgesës"
              />
              <button
                type="button"
                className="tastio-search-locate-btn"
                onClick={merrLokacioninAktual}
                title="Përdor lokacionin tim aktual"
                aria-label="Përdor lokacionin aktual"
              >
                <Navigation size={20} className={lokacioniAktiv ? 'spin' : ''} />
              </button>
              <button type="submit" className="tastio-search-cta-btn">
                Gjej ushqimin
              </button>
            </form>

            {/* Dropdown i sugjerimeve interaktive */}
            {shfaqSugjerimet && (
              <div className="tastio-search-suggestions">
                <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Lokacione të shpeshta
                </div>
                {sugjerimet.map((s, idx) => (
                  <div 
                    key={idx} 
                    className="tastio-suggestion-item"
                    onClick={() => zgjidhSugjerim(s)}
                  >
                    <MapPin size={16} color="#0865F5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linku i Adresave të Ruajtura */}
          <Link to="/kyqja" className="tastio-hero-saved-link">
            <span>Kyçu për adresat e ruajtura</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ==========================================================
          2. RESTAURANT & FOOD SHOWCASE (Ushqime Reale me Hierarki dhe Animacion Marquee)
          ========================================================== */}
      <section className="tastio-brands-showcase" aria-label="Shijet dhe ushqimet partnere">
        {/* Rreshti 1: Marquee me ushqime reale me cilësi të lartë */}
        <div className="tastio-marquee-track">
          {[...ushqimetShowcaseRreshti1, ...ushqimetShowcaseRreshti1].map((u, idx) => (
            <Link key={idx} to={u.link} className="tastio-real-brand-card">
              <img 
                src={u.foto} 
                alt={u.emri} 
                className="tastio-food-bg-img" 
                loading="lazy"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=300&auto=format&fit=crop&q=80'; }}
              />
              <div className="tastio-food-gradient-overlay"></div>
              <span className="tastio-food-title">{u.emri}</span>
            </Link>
          ))}
        </div>

        {/* Rreshti 2: Marquee në drejtim të kundërt */}
        <div className="tastio-marquee-track reverse">
          {[...ushqimetShowcaseRreshti2, ...ushqimetShowcaseRreshti2].map((u, idx) => (
            <Link key={idx} to={u.link} className="tastio-real-brand-card">
              <img 
                src={u.foto} 
                alt={u.emri} 
                className="tastio-food-bg-img" 
                loading="lazy"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=300&auto=format&fit=crop&q=80'; }}
              />
              <div className="tastio-food-gradient-overlay"></div>
              <span className="tastio-food-title">{u.emri}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ==========================================================
          3. KATEGORITË E USHQIMIT ME FILTRIM DINAMIK
          ========================================================== */}
      <section className="tastio-categories-section">
        <div className="tastio-container">
          <div className="tastio-section-header">
            <div>
              <h2 className="tastio-section-title">Çfarë ke dëshirë të hash sot?</h2>
              <p className="tastio-section-subtitle">Kliko një kategori për të filtruar restorantet menjëherë</p>
            </div>
            <Link to="/restorante" className="tastio-btn-view-all">
              <span>Shiko të gjitha</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="tastio-categories-grid">
            {kategorite.map((kat) => (
              <div
                key={kat.id}
                className={`tastio-category-card ${kategoriaAktive === kat.id ? 'active' : ''}`}
                onClick={() => setKategoriaAktive(kategoriaAktive === kat.id ? 'te-gjitha' : kat.id)}
              >
                <div className="tastio-category-img-wrap">
                  <img src={kat.foto} alt={kat.emri} className="tastio-category-img" loading="lazy" />
                </div>
                <span className="tastio-category-title">{kat.emri}</span>
                <span className="tastio-category-count">{kat.restorante}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================================
          4. RESTORANTET MË TË PËLQYERA
          ========================================================== */}
      <section className="tastio-restaurants-section">
        <div className="tastio-container">
          <div className="tastio-section-header">
            <div>
              <h2 className="tastio-section-title">Restorantet më të pëlqyera</h2>
              <p className="tastio-section-subtitle">
                {kategoriaAktive !== 'te-gjitha' 
                  ? `Duke shfaqur restorantet për: ${kategoriaAktive.toUpperCase()}`
                  : 'Vlerësuar me notat më të larta nga mijëra klientë të kënaqur'}
              </p>
            </div>
            <Link to="/restorante" className="tastio-btn-view-all">
              <span>Eksploro të gjitha</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="tastio-restaurants-grid">
            {restorantetFiltruar.map((rest) => (
              <Link
                key={rest.id}
                to={`/restorante/${rest.slug}`}
                className="tastio-restaurant-card"
              >
                <div className="tastio-rest-cover-wrap">
                  <img src={rest.foto} alt={rest.emri} className="tastio-rest-cover" loading="lazy" />
                  
                  {/* Butoni Zemër Favorite */}
                  <button 
                    type="button" 
                    className={`tastio-fav-btn ${tePreferuarat[rest.id] ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(e, rest.id)}
                    aria-label="Shto tek të preferuarat"
                  >
                    <Heart size={16} fill={tePreferuarat[rest.id] ? '#ef4444' : 'none'} />
                  </button>

                  <span className={`tastio-rest-badge ${rest.bejxhi === 'Oferta speciale' ? 'orange' : ''}`}>
                    {rest.bejxhi}
                  </span>
                  
                  <div className="tastio-rest-delivery-time">
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {rest.koha}
                  </div>
                </div>

                <div className="tastio-rest-content">
                  <div className="tastio-rest-top">
                    <h3 className="tastio-rest-title">{rest.emri}</h3>
                    <div className="tastio-rest-rating">
                      <Star size={13} fill="#854d0e" />
                      <span>{rest.vleresimi}</span>
                    </div>
                  </div>
                  <p className="tastio-rest-cuisine">{rest.kategoria}</p>
                  <div className="tastio-rest-footer">
                    <span className="tastio-rest-fee">
                      <Bike size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      {rest.tarifa}
                    </span>
                    <span>{rest.rishikime} vlerësime</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================================
          5. OFERTAT DHE PROMOVIMET SPECIALE
          ========================================================== */}
      <section className="tastio-offers-section">
        <div className="tastio-container">
          <div className="tastio-section-header">
            <div>
              <h2 className="tastio-section-title">Oferta dhe Kursime Ekskluzive</h2>
              <p className="tastio-section-subtitle">Zbulo zbritjet e ditës dhe shijo pjatat më të mira me çmime speciale</p>
            </div>
          </div>

          <div className="tastio-offers-grid">
            <div className="tastio-offer-card bg-blue">
              <span className="tastio-offer-tag">🔥 Ofertat e Javës</span>
              <div>
                <h3 className="tastio-offer-title">Zbritje deri në 30%</h3>
                <p className="tastio-offer-desc">Shijo zbritje të menjëhershme në mbi 40 restorante partnere këtë javë.</p>
              </div>
              <Link to="/restorante" className="tastio-offer-btn">
                Zbulo ofertat
              </Link>
            </div>

            <div className="tastio-offer-card bg-teal">
              <span className="tastio-offer-tag">⚡ Dërgesa Falas</span>
              <div>
                <h3 className="tastio-offer-title">0 € Tarifa e Dërgesës</h3>
                <p className="tastio-offer-desc">Për të gjitha porositë e para mbi 10 € në restorantet e shënuara.</p>
              </div>
              <Link to="/restorante" className="tastio-offer-btn">
                Porosit tani
              </Link>
            </div>

            <div className="tastio-offer-card bg-purple">
              <span className="tastio-offer-tag">💎 Tastio Plus</span>
              <div>
                <h3 className="tastio-offer-title">Kurse me çdo porosi</h3>
                <p className="tastio-offer-desc">Përfito kuponë promocionalë dhe pikë shpërblyese me çdo blerje.</p>
              </div>
              <Link to="/restorante" className="tastio-offer-btn">
                Mëso më shumë
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          6. SI FUNKSIONON TASTIO (POROSIT NË VETËM 3 HAPA)
          ========================================================== */}
      <section className="tastio-how-section">
        <div className="tastio-container">
          <h2 className="tastio-section-title" style={{ textAlign: 'center' }}>Porosit në vetëm 3 hapa</h2>
          <p className="tastio-section-subtitle" style={{ textAlign: 'center' }}>
            Procesi më i thjeshtë, më i shpejtë dhe më i sigurt për të shijuar ushqimin tënd të preferuar
          </p>

          <div className="tastio-steps-grid">
            <div className="tastio-step-card">
              <span className="tastio-step-number">01</span>
              <div className="tastio-step-icon-wrap">
                <MapPin size={36} />
              </div>
              <h3 className="tastio-step-title">Zgjedh lokacionin</h3>
              <p className="tastio-step-desc">
                Vendos adresën tënde në Prishtinë, Tiranë apo kudo që ndodhesh për të parë restorantet më të afërta.
              </p>
            </div>

            <div className="tastio-step-card">
              <span className="tastio-step-number">02</span>
              <div className="tastio-step-icon-wrap">
                <UtensilsCrossed size={36} />
              </div>
              <h3 className="tastio-step-title">Zgjedh ushqimin</h3>
              <p className="tastio-step-desc">
                Eksploro menytë e detajuara, zgjidh opsionet e tua të personalizuara dhe vendos porosinë në shportë.
              </p>
            </div>

            <div className="tastio-step-card">
              <span className="tastio-step-number">03</span>
              <div className="tastio-step-icon-wrap">
                <Bike size={36} />
              </div>
              <h3 className="tastio-step-title">Prano porosinë</h3>
              <p className="tastio-step-desc">
                Ushqimi përgatitet menjëherë nga kuzhina dhe korrieri ta sjell të ngrohtë dhe të freskët te dera jote.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          7. PSE TË ZGJIDHNI TASTIO?
          ========================================================== */}
      <section className="tastio-why-section">
        <div className="tastio-container">
          <h2 className="tastio-section-title" style={{ textAlign: 'center' }}>Pse të zgjidhni Tastio?</h2>
          <p className="tastio-section-subtitle" style={{ textAlign: 'center' }}>
            Standardi më i lartë i shërbimit, shpejtësisë dhe besueshmërisë në treg
          </p>

          <div className="tastio-why-grid">
            <div className="tastio-why-card">
              <span className="tastio-why-icon">⚡</span>
              <h3 className="tastio-why-title">Porositje e lehtë dhe e shpejtë</h3>
              <p className="tastio-why-desc">Porosit në më pak se 60 sekonda falë ndërfaqes intuitive dhe të optimizuar.</p>
            </div>

            <div className="tastio-why-card">
              <span className="tastio-why-icon">🍽️</span>
              <h3 className="tastio-why-title">Larmishmëri Restorantesh</h3>
              <p className="tastio-why-desc">Qindra restorante vendore dhe brende ndërkombëtare në një platformë të vetme.</p>
            </div>

            <div className="tastio-why-card">
              <span className="tastio-why-icon">📍</span>
              <h3 className="tastio-why-title">Ndjekje në Kohë Reale</h3>
              <p className="tastio-why-desc">Shiko statusin e përgatitjes në kuzhinë dhe arritjen e korrierit me pass digjital me kod QR.</p>
            </div>

            <div className="tastio-why-card">
              <span className="tastio-why-icon">🔒</span>
              <h3 className="tastio-why-title">Pagesë e Sigurt</h3>
              <p className="tastio-why-desc">Paguaj me para në dorë gjatë marrjes, me kartelë bankare apo POS terminal.</p>
            </div>

            <div className="tastio-why-card">
              <span className="tastio-why-icon">✨</span>
              <h3 className="tastio-why-title">Përvojë Premium</h3>
              <p className="tastio-why-desc">Kujdes i vazhdueshëm për klientin dhe mbështetje e shpejtë në çdo hap.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          8. BËHU PJESË E TASTIO (PARTNER SECTION)
          ========================================================== */}
      <section className="tastio-partner-section">
        <div className="tastio-container">
          <div className="tastio-partner-banner">
            <div className="tastio-partner-content">
              <span className="tastio-partner-badge">🤝 Mundësi Bashkëpunimi</span>
              <h2 className="tastio-partner-headline">Bëhu pjesë e Tastio!</h2>
              <p className="tastio-partner-desc">
                A keni një restorant apo biznes ushqimor? Rritni shitjet tuaja dhe arrini mijëra klientë të rinj me teknologjinë moderne dhe sistemin inteligjent të menaxhimit të Tastio.
              </p>
              <div className="tastio-partner-actions">
                <Link to="/restorante" className="tastio-btn-partner-primary">
                  <Store size={18} />
                  <span>Bashkohu si partner</span>
                </Link>
                <a href="#korrier" className="tastio-btn-partner-secondary" onClick={(e) => e.preventDefault()}>
                  <Bike size={18} />
                  <span>Bëhu Korrier</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          9. APLIKACIONI CELULAR TASTIO (COMING SOON MOCKUP)
          ========================================================== */}
      <section className="tastio-app-section">
        <div className="tastio-container">
          <div className="tastio-app-container">
            <div className="tastio-app-content">
              <span className="tastio-hero-badge" style={{ background: 'rgba(8, 101, 245, 0.1)', color: '#0865F5', borderColor: 'rgba(8, 101, 245, 0.2)' }}>
                📱 Përvojë Celulare
              </span>
              <h2 className="tastio-app-title">Merre Tastio me vete kudo që shkon</h2>
              <p className="tastio-app-desc">
                Së shpejti do të mund të shkarkoni aplikacionin zyrtar të Tastio në iOS dhe Android për njoftime të menjëhershme, kuponë ekskluzivë celularë dhe porositje me një prekje.
              </p>
              
              <div className="tastio-app-badges">
                <div className="tastio-store-badge">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.67-.82 1.13-1.96 1-3.1-.98.04-2.16.66-2.85 1.48-.6.7-1.13 1.83-.99 2.95 1.09.08 2.21-.56 2.84-1.33z"/></svg>
                  <div className="tastio-store-text">
                    <span className="tastio-store-small">Së shpejti në</span>
                    <span className="tastio-store-name">App Store</span>
                  </div>
                </div>

                <div className="tastio-store-badge">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.61-.918V2.732c.162-.353.376-.666.609-.918zm11.39 11.39l2.766 2.766-12.012 6.837 9.246-9.603zm0-2.408L5.753.193 17.765 7.03 15 9.796zm1.204 1.204l3.198-1.819c.966-.549.966-1.443 0-1.992l-3.198-1.819-2.002 2.815 2.002 2.815z"/></svg>
                  <div className="tastio-store-text">
                    <span className="tastio-store-small">Së shpejti në</span>
                    <span className="tastio-store-name">Google Play</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smartphone Mockup */}
            <div className="tastio-phone-mockup">
              <div className="tastio-phone-frame">
                <div className="tastio-phone-notch"></div>
                <div className="tastio-phone-screen">
                  <div className="tastio-screen-header">
                    <div style={{ fontSize: '16px', fontWeight: 900, fontStyle: 'italic' }}>Tastio</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>📍 Prishtinë • Dërgesa në 25 min</div>
                  </div>
                  <div className="tastio-screen-content">
                    <div className="tastio-screen-card" style={{ background: '#e0f2fe' }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#0369a1' }}>🎁 Oferta e Ditës</div>
                      <div style={{ fontSize: '11px', color: '#0284c7' }}>20% Zbritje në Smash Burgers</div>
                    </div>
                    <div className="tastio-screen-card">
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>🍕 Proper Pizza</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>⭐ 4.9 • 20-30 min</div>
                    </div>
                    <div className="tastio-screen-card">
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>🍔 Smash Burger Bar</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>⭐ 4.8 • 15-25 min</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
