import React, { useState } from 'react';
import { Truck, Clock, DollarSign, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';
import './PartnerPages.css';

export default function PartnerCourier() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: 'Prishtinë',
    vehicle: 'Motoçikletë',
    hasExperience: 'Po',
    availability: 'Orar i Plotë'
  });

  const [derguar, setDerguar] = useState(false);
  const [dukeNgarkuar, setDukeNgarkuar] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setDukeNgarkuar(true);

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
          <span className="tastio-partner-hero-badge">Bëhu Korrier Tastio</span>
          <h1 className="tastio-partner-hero-title">
            Fito me orar fleksibël dhe liri të plotë në çdo dërgesë
          </h1>
          <p className="tastio-partner-hero-desc">
            Bëhu shef i vetes tënde. Zgjidh orarin kur dëshiron të punosh, shpërndaj porosi me aplikacionin tonë modern dhe përfito pagesa javore të sigurta me 100% të bakshisheve.
          </p>
          <a href="#apliko-korrier" className="tastio-partner-cta-btn">
            <span>Apliko Tani si Korrier</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Përfitimet e Korrierit */}
      <section className="tastio-partner-benefits-section">
        <div className="tastio-partner-container">
          <div className="tastio-partner-section-header">
            <h2 className="tastio-partner-section-title">Përfitimet kryesore si korrier Tastio</h2>
            <p className="tastio-partner-section-subtitle">
              Gjithçka që ju nevojitet për të punuar me komoditet dhe për të maksimizuar të ardhurat tuaja.
            </p>
          </div>

          <div className="tastio-partner-benefits-grid">
            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Clock size={24} />
              </div>
              <h3>Orar 100% Fleksibël</h3>
              <p>Punoni kur të dëshironi: disa orë në mbrëmje, vetëm gjatë fundjavave apo me orar të plotë ditor.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <DollarSign size={24} />
              </div>
              <h3>Të Ardhurat & Bakshishet</h3>
              <p>Tarifa konkurruese për çdo kilometër, bonuse gjatë orareve të pikut dhe të gjitha bakshishet 100% për ju.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Truck size={24} />
              </div>
              <h3>Mjeti yt i Preferuar</h3>
              <p>Zgjidhni vetë me çfarë dëshironi të shpërndani: me biçikletë, skuter elektrik, motoçikletë apo me veturë.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Smartphone size={24} />
              </div>
              <h3>Aplikacion i Thjeshtë Navigimi</h3>
              <p>Aplikacioni ynë ju udhëzon automatikisht në rrugët më të shpejta drejt restorantit dhe klientit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Formulari i Aplikimit për Korrier */}
      <section id="apliko-korrier" className="tastio-partner-form-section">
        <div className="tastio-partner-container">
          <div className="tastio-partner-form-wrapper">
            <div className="tastio-partner-form-header">
              <h2>Formulari i Aplikimit për Korrier</h2>
              <p>Plotësoni të dhënat dhe ekipi ynë i logjistikës do t'ju ftojë për trajnim brenda 48 orëve.</p>
            </div>

            {derguar ? (
              <div className="tastio-form-success-banner">
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <h3>Aplikimi u dërgua me sukses!</h3>
                <p>Faleminderit për interesimin. Do t'ju dërgojmë një SMS dhe email me hapat e radhës për marrjen e çantës termike dhe fillimin e punës.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="tastio-form-row">
                  <div className="tastio-form-group">
                    <label>Emri dhe Mbiemri *</label>
                    <input
                      type="text"
                      required
                      className="tastio-form-input"
                      placeholder="p.sh. Dardan Krasniqi"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                    <label>Adresa e Emailit *</label>
                    <input
                      type="email"
                      required
                      className="tastio-form-input"
                      placeholder="emri@shembull.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="tastio-form-group">
                    <label>Qyteti ku dëshironi të shpërndani *</label>
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
                </div>

                <div className="tastio-form-row">
                  <div className="tastio-form-group">
                    <label>Mjeti i Transportit *</label>
                    <select
                      className="tastio-form-select"
                      value={formData.vehicle}
                      onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    >
                      <option value="Motoçikletë">Motoçikletë / Skuter</option>
                      <option value="Biçikletë">Biçikletë / Elektrike</option>
                      <option value="Veturë">Veturë</option>
                    </select>
                  </div>
                  <div className="tastio-form-group">
                    <label>Disponueshmëria e dëshiruar *</label>
                    <select
                      className="tastio-form-select"
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    >
                      <option value="Orar i Plotë">Orar i Plotë (Full-Time)</option>
                      <option value="Gjysmë Orari">Gjysmë Orari (Part-Time)</option>
                      <option value="Fundjava">Vetëm gjatë Fundjavave</option>
                    </select>
                  </div>
                </div>

                <div className="tastio-form-group">
                  <label>A keni eksperiencë të mëparshme me dërgesa?</label>
                  <select
                    className="tastio-form-select"
                    value={formData.hasExperience}
                    onChange={(e) => setFormData({ ...formData, hasExperience: e.target.value })}
                  >
                    <option value="Po">Po, kam punuar më herët si korrier</option>
                    <option value="Jo">Jo, kjo është hera ime e parë (kërkoj trajnim)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={dukeNgarkuar}
                  className="tastio-form-submit-btn"
                >
                  {dukeNgarkuar ? 'Duke dërguar aplikimin...' : 'Dërgo Aplikimin për Korrier'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

