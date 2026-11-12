import React, { useState } from 'react';
import { Briefcase, MapPin, Clock, ArrowRight, CheckCircle2, ChevronRight, Sparkles, Shield, HeartHandshake } from 'lucide-react';
import './PartnerPages.css';

export default function Careers() {
  const [formData, setFormData] = useState({
    position: 'Zhvillues Softueri Full-Stack',
    fullName: '',
    email: '',
    phone: '',
    city: 'Prishtinë',
    linkedinOrCvUrl: '',
    message: ''
  });

  const [derguar, setDerguar] = useState(false);
  const [dukeNgarkuar, setDukeNgarkuar] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const jobs = [
    {
      id: 'dev-fullstack',
      title: 'Zhvillues Softueri Full-Stack (React & Node.js)',
      department: 'Inxhinieri & Teknologji',
      location: 'Prishtinë (Hibrid)',
      type: 'Orar i plotë',
      description: 'Dizajnoni, zhvilloni dhe optimizoni komponentët kryesorë të platformës Tastio, nga frontend-i interaktiv deri te shërbimet e shpejta të backend-it.',
      requirements: [
        'Përvojë 2+ vjet me React, JavaScript modern dhe Node.js / Express',
        'Njohuri të thella në REST API, caching dhe arkitekturë modulare',
        'Fokus i lartë në performancë, UI të pastër dhe përvojë të përdoruesit',
        'Njohuri të mira të Git dhe metodologjive Agile'
      ]
    },
    {
      id: 'ops-manager',
      title: 'Menaxher i Operacioneve të Shpërndarjes',
      department: 'Operacione & Logjistikë',
      location: 'Prishtinë',
      type: 'Orar i plotë',
      description: 'Mbikëqyrja dhe optimizimi i operacioneve ditore të rrjetit të korrierëve për të garantuar kohë rekord të dërgesave dhe cilësi maksimale të shërbimit.',
      requirements: [
        'Përvojë e dëshmuar në menaxhim operaçõesh ose logjistikë',
        'Aftësi analitike për interpretimin e të dhënave operative',
        'Aftësi të shkëlqyera të zgjidhjes së krizave dhe komunikim me njerëzit',
        'Patentë shoferi kategoria B'
      ]
    },
    {
      id: 'partner-manager',
      title: 'Menaxher i Marrëdhënieve me Restorantet (Account Manager)',
      department: 'Partneritete & Shitje',
      location: 'Prishtinë / Terren',
      type: 'Orar i plotë',
      description: 'Zgjerimi i rrjetit të restoranteve partnere, trajnimi i stafit të restoranteve dhe këshillimi për rritjen e performancës së tyre në Tastio.',
      requirements: [
        'Përvojë në shitje B2B ose menaxhim llogarish biznesi',
        'Njohuri të shkëlqyera të sektorit të gastronomisë në Kosovë',
        'Aftësi të spikatura negociuese dhe prezantuese',
        'Qasje proaktive dhe orientim drejt rezultateve'
      ]
    },
    {
      id: 'customer-support',
      title: 'Specialist i Mbështetjes së Klientit & Operacioneve',
      department: 'Kujdesi ndaj Klientit',
      location: 'Prishtinë',
      type: 'Turne fleksibël',
      description: 'Ofroni ndihmë të menjëhershme dhe të sjellshme për konsumatorët, korrierët dhe restorantet gjatë rrjedhës së porosive ditore.',
      requirements: [
        'Aftësi të shkëlqyera komunikimi me shkrim dhe me gojë në gjuhën shqipe',
        'Qetësi dhe empati në trajtimin e kërkesave të klientëve',
        'Shkathtësi në përdorimin e mjeteve digjitale dhe chat-it mbështetës',
        'Gatishmëri për punë në orare të ndryshme (përfshirë fundjavat)'
      ]
    }
  ];

  const handleSelectJob = (jobTitle) => {
    setFormData((prev) => ({ ...prev, position: jobTitle }));
    const formEl = document.getElementById('apliko-pune');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
          <span className="tastio-partner-hero-badge">Karriera në Tastio</span>
          <h1 className="tastio-partner-hero-title">
            Ndërtoni të ardhmen e dërgesave dhe teknologjisë me ne
          </h1>
          <p className="tastio-partner-hero-desc">
            Ne jemi një ekip i përkushtuar që bashkon pasionin për teknologjinë, ushqimin dhe përvojën e jashtëzakonshme të përdoruesit. Zbuloni pozitat tona të hapura dhe bëhuni pjesë e rritjes sonë.
          </p>
          <a href="#pozitat-e-hapura" className="tastio-partner-cta-btn">
            <span>Shiko Pozitat e Disponueshme</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Vlerat dhe Kultura */}
      <section className="tastio-partner-benefits-section">
        <div className="tastio-partner-container">
          <div className="tastio-partner-section-header">
            <h2 className="tastio-partner-section-title">Pse të punoni në Tastio?</h2>
            <p className="tastio-partner-section-subtitle">
              Mjedis dinamik ku idetë dëgjohen, puna vlerësohet dhe secili ka hapësirë për zhvillim personal e profesional.
            </p>
          </div>

          <div className="tastio-partner-benefits-grid">
            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Sparkles size={24} />
              </div>
              <h3>Kulturë Inovacioni & Autonomie</h3>
              <p>Inkurajojmë nismat e pavarura, eksperimentimin me zgjidhje të reja dhe përmirësimin e vazhdueshëm të produkteve.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <HeartHandshake size={24} />
              </div>
              <h3>Paga Konkurruese & Bonuse</h3>
              <p>Kompensim mbi mesataren e tregut, bonuse sipas arritjeve dhe paketa mbështetëse për shëndetin e mirëqenien e ekipit.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Briefcase size={24} />
              </div>
              <h3>Fleksibilitet & Balancë</h3>
              <p>Mundësi pune hibride, hapësira moderne zyre në qendër të qytetit dhe orare të balancuara për jetën tuaj private.</p>
            </div>

            <div className="tastio-partner-benefit-card">
              <div className="tastio-partner-benefit-icon">
                <Shield size={24} />
              </div>
              <h3>Mundësi të Qarta Ngritjeje</h3>
              <p>Përparoni shpejt në karrierë brenda një kompanie që rritet me ritme të shpejta në tregun rajonal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pozitat e Hapura */}
      <section id="pozitat-e-hapura" style={{ padding: '60px 0 84px', background: '#f8fafc' }}>
        <div className="tastio-partner-container">
          <div className="tastio-partner-section-header">
            <h2 className="tastio-partner-section-title">Pozitat Aktuale të Hapura</h2>
            <p className="tastio-partner-section-subtitle">
              Zgjidhni pozitën që përputhet me aftësitë dhe qëllimet tuaja profesionale.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '28px 32px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
                      {job.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Briefcase size={14} color="#0865F5" /> {job.department}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} color="#0865F5" /> {job.location}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} color="#0865F5" /> {job.type}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectJob(job.title)}
                    style={{
                      background: '#0865F5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '10px 22px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span>Apliko për këtë pozitë</span>
                    <ChevronRight size={15} />
                  </button>
                </div>

                <p style={{ fontSize: '14.5px', color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
                  {job.description}
                </p>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Kërkesat kryesore:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#475569', lineHeight: 1.7 }}>
                    {job.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formular Aplikimi */}
      <section id="apliko-pune" className="tastio-partner-form-section">
        <div className="tastio-partner-container">
          <div className="tastio-partner-form-wrapper">
            {derguar ? (
              <div className="tastio-partner-success">
                <div className="tastio-partner-success-icon">
                  <CheckCircle2 size={48} color="#0865F5" />
                </div>
                <h2>Aplikimi juaj u dërgua me sukses</h2>
                <p>
                  Faleminderit për interesimin tuaj në pozitën <strong>{formData.position}</strong>. Ekipi ynë i burimeve njerëzore do të shqyrtojë aplikimin tuaj dhe do t'ju kontaktojë brenda pak ditësh.
                </p>
                <button
                  type="button"
                  className="tastio-form-submit-btn"
                  onClick={() => {
                    setDerguar(false);
                    setFormData({
                      position: 'Zhvillues Softueri Full-Stack',
                      fullName: '',
                      email: '',
                      phone: '',
                      city: 'Prishtinë',
                      linkedinOrCvUrl: '',
                      message: ''
                    });
                  }}
                  style={{ maxWidth: '280px', margin: '28px auto 0', display: 'block' }}
                >
                  Apliko për një pozitë tjetër
                </button>
              </div>
            ) : (
              <>
                <div className="tastio-partner-form-header">
                  <h2>Formulari i Aplikimit për Punë</h2>
                  <p>Plotësoni të dhënat tuaja më poshtë për të kandiduar për një nga mundësitë tona të karrierës.</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="tastio-form-group">
                    <label htmlFor="position">Zgjidh Pozitën për Aplikim *</label>
                    <select
                      id="position"
                      className="tastio-form-select"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.title}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tastio-form-row">
                    <div className="tastio-form-group">
                      <label htmlFor="fullName">Emri dhe Mbiemri *</label>
                      <input
                        type="text"
                        id="fullName"
                        className="tastio-form-input"
                        required
                        placeholder="psh. Dren Gashi"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </div>
                    <div className="tastio-form-group">
                      <label htmlFor="email">Email Adresa *</label>
                      <input
                        type="email"
                        id="email"
                        className="tastio-form-input"
                        required
                        placeholder="dren.gashi@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="tastio-form-row">
                    <div className="tastio-form-group">
                      <label htmlFor="phone">Numri i Telefonit *</label>
                      <input
                        type="tel"
                        id="phone"
                        className="tastio-form-input"
                        required
                        placeholder="+383 49 111 222"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="tastio-form-group">
                      <label htmlFor="city">Qyteti *</label>
                      <select
                        id="city"
                        className="tastio-form-select"
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
                  </div>

                  <div className="tastio-form-group">
                    <label htmlFor="linkedinOrCvUrl">Linku i Profilit LinkedIn ose CV Online (Opsionale)</label>
                    <input
                      type="url"
                      id="linkedinOrCvUrl"
                      className="tastio-form-input"
                      placeholder="https://www.linkedin.com/in/emri-juaj ose link Google Drive"
                      value={formData.linkedinOrCvUrl}
                      onChange={(e) => setFormData({ ...formData, linkedinOrCvUrl: e.target.value })}
                    />
                  </div>

                  <div className="tastio-form-group">
                    <label htmlFor="message">Pse dëshironi t'i bashkoheni Tastio? (Mesazh ose Shënime)</label>
                    <textarea
                      id="message"
                      className="tastio-form-textarea"
                      rows="4"
                      placeholder="Përshkruani shkurtimisht përvojën tuaj dhe çfarë ju motivon të aplikoni..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="tastio-form-submit-btn"
                    disabled={dukeNgarkuar}
                  >
                    {dukeNgarkuar ? 'Duke dërguar aplikimin...' : 'Dërgo Aplikimin për Punë'}
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

