import React, { useState } from 'react';
import { Building2, Receipt, Users, Award, ArrowRight, CheckCircle2 } from 'lucide-react';
import './PartnerPages.css';

export default function PartnerBusiness() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    workEmail: '',
    phone: '',
    employeeCount: '11-50',
    serviceType: 'Dreka Ditore për Ekipin',
    city: 'Prishtinë',
    message: ''
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
          <span className="tastio-partner-hero-badge">Tastio për Biznese</span>
          <h1 className="tastio-partner-hero-title">
            Ushqim cilësor dhe menaxhim i thjeshtësuar për kompaninë tuaj
          </h1>
          <p className="tastio-partner-hero-desc">
            Motivoni stafin me dreka të freskëta ditore, katering profesional për mbledhje dhe një faturë të vetme mujore me kontroll të plotë financiar.
          </p>
          <a href="#kerko-oferte-biznes" className="tastio-partner-cta-btn">
            <span>Kërko Ofertë për Kompaninë</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Avantazhet e Tastio për Biznese */}
      <section className="tastio-partner-benefits-section">
        <div className="tastio-partner-container">
          <div className="tastio-partner-section-header">
            <h2 className="tastio-partner-section-title">Zgjidhja ideale për çdo zyrë moderne</h2>
            <p className="tastio-partner-section-subtitle">
              Optimizoni kohën e ekipit tuaj dhe shijoni ushqim cilësor me procedura të automatizuara të faturimit.
            </p>
          </div>

          <div className="tastio-partner-benefits-grid">
            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Receipt size={24} />
              </div>
              <h3>Një Faturë e Vetme Mujore</h3>
              <p>Harroni mbledhjen e kuponëve të pafundmë. Përfitoni një faturë të rregullt tatimore mujore me pasqyrë të detajuar shpenzimesh.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Users size={24} />
              </div>
              <h3>Buxhet Fleksibël për Çdo Punonjës</h3>
              <p>Caktoni limite ditore ose javore shpenzimi sipas departamenteve dhe lërini anëtarët e ekipit të zgjedhin ushqimin e preferuar.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Building2 size={24} />
              </div>
              <h3>Katering për Takime & Evente</h3>
              <p>Organizoni takime të rëndësishme biznesi apo festime kompanie me përzgjedhje speciale ushqimesh nga restorantet më të vlerësuara.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Award size={24} />
              </div>
              <h3>Menaxher i Përkushtuar Llogarie</h3>
              <p>Çdo partner korporativ ka një përfaqësues të dedikuar nga Tastio për mbështetje të menjëhershme dhe porosi të personalizuara.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Seksioni i Formularit të Aplikimit */}
      <section id="kerko-oferte-biznes" className="tastio-partner-form-section">
        <div className="tastio-partner-container">
          <div className="tastio-partner-form-card">
            {derguar ? (
              <div className="tastio-partner-success">
                <div className="tastio-partner-success-icon">
                  <CheckCircle2 size={44} color="#0865F5" />
                </div>
                <h2>Kërkesa juaj u dërgua me sukses</h2>
                <p>
                  Faleminderit që zgjodhët <strong>Tastio për Biznese</strong>. Ekipi ynë i shitjeve korporative do t'ju kontaktojë brenda 24 orëve me një ofertë të përshtatur për kompaninë <strong>{formData.companyName}</strong>.
                </p>
                <button
                  type="button"
                  className="tastio-partner-submit-btn"
                  onClick={() => {
                    setDerguar(false);
                    setFormData({
                      companyName: '',
                      contactName: '',
                      workEmail: '',
                      phone: '',
                      employeeCount: '11-50',
                      serviceType: 'Dreka Ditore për Ekipin',
                      city: 'Prishtinë',
                      message: ''
                    });
                  }}
                  style={{ maxWidth: '280px', margin: '24px auto 0' }}
                >
                  Dërgo një kërkesë tjetër
                </button>
              </div>
            ) : (
              <>
                <div className="tastio-partner-form-header">
                  <h2>Kërkoni një prezantim apo ofertë të personalizuar</h2>
                  <p>Plotësoni të dhënat e kompanisë dhe ekipi ynë B2B do t'ju përgatisë zgjidhjen më efikase për stafin tuaj.</p>
                </div>

                <form onSubmit={handleSubmit} className="tastio-partner-form">
                  <div className="tastio-form-row">
                    <div className="tastio-form-group">
                      <label htmlFor="companyName">Emri i Kompanisë *</label>
                      <input
                        type="text"
                        id="companyName"
                        required
                        placeholder="psh. Tech Solutions Sh.p.k."
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      />
                    </div>
                    <div className="tastio-form-group">
                      <label htmlFor="contactName">Emri dhe Mbiemri i Kontaktit *</label>
                      <input
                        type="text"
                        id="contactName"
                        required
                        placeholder="psh. Artan Krasniqi"
                        value={formData.contactName}
                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="tastio-form-row">
                    <div className="tastio-form-group">
                      <label htmlFor="workEmail">Email Zyrtar i Kompanisë *</label>
                      <input
                        type="email"
                        id="workEmail"
                        required
                        placeholder="artan@techsolutions.com"
                        value={formData.workEmail}
                        onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                      />
                    </div>
                    <div className="tastio-form-group">
                      <label htmlFor="phone">Numri i Telefonit *</label>
                      <input
                        type="tel"
                        id="phone"
                        required
                        placeholder="+383 44 123 456"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="tastio-form-row">
                    <div className="tastio-form-group">
                      <label htmlFor="employeeCount">Numri i Punonjësve *</label>
                      <select
                        id="employeeCount"
                        value={formData.employeeCount}
                        onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                      >
                        <option value="1-10">1 - 10 punonjës</option>
                        <option value="11-50">11 - 50 punonjës</option>
                        <option value="51-200">51 - 200 punonjës</option>
                        <option value="200+">Mbi 200 punonjës</option>
                      </select>
                    </div>
                    <div className="tastio-form-group">
                      <label htmlFor="serviceType">Shërbimi Kryesor i Interesuar *</label>
                      <select
                        id="serviceType"
                        value={formData.serviceType}
                        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      >
                        <option value="Dreka Ditore për Ekipin">Dreka Ditore për Ekipin</option>
                        <option value="Katering për Mbledhje & Evente">Katering për Mbledhje & Evente</option>
                        <option value="Kuponë dhe Vouchera Dhuratë">Kuponë dhe Vouchera Dhuratë</option>
                        <option value="Zgjidhje e Plotë e Integruar">Zgjidhje e Plotë e Integruar</option>
                      </select>
                    </div>
                  </div>

                  <div className="tastio-form-group">
                    <label htmlFor="city">Qyteti Kryesor *</label>
                    <select
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    >
                      <option value="Prishtinë">Prishtinë</option>
                      <option value="Prizren">Prizren</option>
                      <option value="Pejë">Pejë</option>
                      <option value="Ferizaj">Ferizaj</option>
                      <option value="Gjilan">Gjilan</option>
                      <option value="Gjakovë">Gjakovë</option>
                      <option value="Mitrovicë">Mitrovicë</option>
                    </select>
                  </div>

                  <div className="tastio-form-group">
                    <label htmlFor="message">Shënime ose Kërkesa Specifike (Opsionale)</label>
                    <textarea
                      id="message"
                      rows="3"
                      placeholder="Përshkruani nevojat e kompanisë tuaj, oraret e preferuara të dërgimit ose pyetje të veçanta..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="tastio-partner-submit-btn"
                    disabled={dukeNgarkuar}
                  >
                    {dukeNgarkuar ? 'Duke dërguar kërkesën...' : 'Dërgo Kërkesën për Biznes'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

