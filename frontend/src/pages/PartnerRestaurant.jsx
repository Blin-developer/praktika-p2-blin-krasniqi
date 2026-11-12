import React, { useState } from 'react';
import { Store, TrendingUp, Users, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import './PartnerPages.css';

export default function PartnerRestaurant() {
  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: 'Prishtinë',
    cuisine: 'Pica',
    address: '',
    notes: ''
  });

  const [derguar, setDerguar] = useState(false);
  const [dukeNgarkuar, setDukeNgarkuar] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setDukeNgarkuar(true);

    // Simulim i ruajtjes së aplikimit me feedback real
    setTimeout(() => {
      setDukeNgarkuar(false);
      setDerguar(true);
    }, 800);
  };

  return (
    <div className="tastio-partner-page">
      {/* Hero Section */}
      <section className="tastio-partner-hero">
        <div className="tastio-partner-hero-inner">
          <span className="tastio-partner-hero-badge">Partneritet me Restorante</span>
          <h1 className="tastio-partner-hero-title">
            Rritni biznesin tuaj dhe arrini mijëra klientë të rinj me Tastio
          </h1>
          <p className="tastio-partner-hero-desc">
            Bashkohuni me platformën kryesore të porosive online. Fitoni shikueshmëri maksimale, menaxhoni porositë me sistemin më të avancuar KDS dhe rrisni xhiron ditore.
          </p>
          <a href="#apliko-restorant" className="tastio-partner-cta-btn">
            <span>Apliko si Partner Restoranti</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Avantazhet */}
      <section className="tastio-partner-benefits-section">
        <div className="tastio-partner-container">
          <div className="tastio-partner-section-header">
            <h2 className="tastio-partner-section-title">Pse restorantet më të mira zgjedhin Tastio?</h2>
            <p className="tastio-partner-section-subtitle">
              Teknologji e thjeshtë, mbështetje e dedikuar dhe kushte transparente bashkëpunimi.
            </p>
          </div>

          <div className="tastio-partner-benefits-grid">
            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <TrendingUp size={24} />
              </div>
              <h3>+35% Rritje në Porosi</h3>
              <p>Zgjeroni bazën e klientëve tuaj përtej tavolinave fizike dhe shërbeni porosi të vazhdueshme marrjeje dhe dërgese.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Store size={24} />
              </div>
              <h3>Sistem i Avancuar KDS</h3>
              <p>Platforma jonë përfshin ekranin e kuzhinës (Kitchen Display System) për koordinim të përsosur të porosive.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Users size={24} />
              </div>
              <h3>Mbi 50,000 Klientë Aktivë</h3>
              <p>Ekspononi menynë tuaj para mijëra konsumatorëve që kërkojnë ushqim çdo ditë në Tiranë dhe Prishtinë.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <ShieldCheck size={24} />
              </div>
              <h3>Pagesa të Rregullta Javore</h3>
              <p>Raporte financiare të kristalta, faturim automatik dhe transferta bankare të garantuara çdo javë.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Formulari i Aplikimit */}
      <section id="apliko-restorant" className="tastio-partner-form-section">
        <div className="tastio-partner-container">
          <div className="tastio-partner-form-wrapper">
            <div className="tastio-partner-form-header">
              <h2>Aplikoni për Partneritet Restoranti</h2>
              <p>Plotësoni të dhënat e biznesit tuaj dhe ekipi ynë do t'ju kontaktojë brenda 24 orëve.</p>
            </div>

            {derguar ? (
              <div className="tastio-form-success-banner">
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <h3>Aplikimi u dërgua me sukses!</h3>
                <p>Faleminderit që zgjodhët Tastio. Menaxheri ynë i partneriteteve do t'ju kontaktojë së shpejti në numrin tuaj të telefonit.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="tastio-form-row">
                  <div className="tastio-form-group">
                    <label>Emri i Restorantit / Biznesit *</label>
                    <input
                      type="text"
                      required
                      className="tastio-form-input"
                      placeholder="p.sh. Pasticeri & Pizzeria Napoli"
                      value={formData.restaurantName}
                      onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                    />
                  </div>
                  <div className="tastio-form-group">
                    <label>Emri dhe Mbiemri i Pronarit / Menaxherit *</label>
                    <input
                      type="text"
                      required
                      className="tastio-form-input"
                      placeholder="p.sh. Agim Berisha"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="tastio-form-row">
                  <div className="tastio-form-group">
                    <label>Emaili Zyrtar *</label>
                    <input
                      type="email"
                      required
                      className="tastio-form-input"
                      placeholder="kontakt@restoranti.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="tastio-form-group">
                    <label>Numri i Telefonit *</label>
                    <input
                      type="tel"
                      required
                      className="tastio-form-input"
                      placeholder="+383 4X XXX XXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="tastio-form-row">
                  <div className="tastio-form-group">
                    <label>Qyteti *</label>
                    <select
                      className="tastio-form-select"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    >
                      <option value="Prishtinë">Prishtinë</option>
                      <option value="Tiranë">Tiranë</option>
                      <option value="Durrës">Durrës</option>
                      <option value="Vlorë">Vlorë</option>
                      <option value="Shkodër">Shkodër</option>
                    </select>
                  </div>
                  <div className="tastio-form-group">
                    <label>Lloji Kryesor i Kuzhinës *</label>
                    <select
                      className="tastio-form-select"
                      value={formData.cuisine}
                      onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                    >
                      <option value="Pica">Pica & Furrë</option>
                      <option value="Burger">Burger & Fast Food</option>
                      <option value="Sushi">Sushi & Aziatike</option>
                      <option value="Pasta">Pasta & Italiane</option>
                      <option value="Zgarë">Zgarë & Tradicionale</option>
                      <option value="Ëmbëlsira">Ëmbëlsira & Kafe</option>
                      <option value="Tjetër">Tjetër</option>
                    </select>
                  </div>
                </div>

                <div className="tastio-form-group">
                  <label>Adresa e Restorantit / Vendndodhja *</label>
                  <input
                    type="text"
                    required
                    className="tastio-form-input"
                    placeholder="Rruga, numri i objektit, zona"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="tastio-form-group">
                  <label>Shënime apo pyetje shtesë (opsionale)</label>
                  <textarea
                    rows={3}
                    className="tastio-form-textarea"
                    placeholder="Na tregoni më shumë për oraret tuaja, numrin e degëve apo kërkesa specifike..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={dukeNgarkuar}
                  className="tastio-form-submit-btn"
                >
                  {dukeNgarkuar ? 'Duke dërguar aplikimin...' : 'Dërgo Aplikimin për Restorant'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

