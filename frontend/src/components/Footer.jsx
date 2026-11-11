import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Heart, Shield, ArrowUpRight } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="tastio-footer">
      <div className="tastio-footer-container">
        <div className="tastio-footer-grid">
          {/* Kolona e Brendit Tastio */}
          <div className="tastio-footer-brand">
            <Link to="/" className="tastio-footer-logo" aria-label="Tastio">
              Tastio
            </Link>
            <p className="tastio-footer-tagline">
              Platforma lider për porositjen e ushqimit cilësor direkt te dera jote. Zgjidh nga qindra restorante dhe shijo shije unike në çdo moment.
            </p>
            <div className="tastio-footer-socials">
              <a href="#instagram" className="tastio-footer-social-btn" aria-label="Instagram">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#facebook" className="tastio-footer-social-btn" aria-label="Facebook">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.6 5H18V0h-3.808C10.597 0 9 1.583 9 4.615V8z"/></svg>
              </a>
              <a href="#linkedin" className="tastio-footer-social-btn" aria-label="LinkedIn">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/></svg>
              </a>
            </div>
          </div>

          {/* Kolona 1: Për Tastio */}
          <div className="tastio-footer-col">
            <h4>Për Tastio</h4>
            <ul>
              <li><Link to="/restorante">Rreth Nesh</Link></li>
              <li><a href="#karriera">Mundësitë e Punës</a></li>
              <li><a href="#qendrueshmeria">Qëndrueshmëria</a></li>
              <li><a href="#siguria">Siguria e Ushqimit</a></li>
              <li><a href="#investitoret">Dhoma e Shtypit</a></li>
            </ul>
          </div>

          {/* Kolona 2: Partnerët */}
          <div className="tastio-footer-col">
            <h4>Partnerët</h4>
            <ul>
              <li><Link to="/restorante">Bëhu Restorant Partner</Link></li>
              <li><a href="#korrier">Bashkohu si Korrier</a></li>
              <li><a href="#biznese">Tastio për Biznese</a></li>
              <li><Link to="/admin">Portali i Menaxherit</Link></li>
              <li><Link to="/kds">Ekrani i Kuzhinës (KDS)</Link></li>
            </ul>
          </div>

          {/* Kolona 3: Ndihmë & Kontakt */}
          <div className="tastio-footer-col">
            <h4>Ndihmë & Kontakt</h4>
            <ul>
              <li><a href="#faq">Pyetje të Shpeshta</a></li>
              <li><a href="#kontakt">Na Kontaktoni</a></li>
              <li><Link to="/porosite">Statusi i Porosisë</Link></li>
              <li><a href="#tarifat">Tarifat & Dërgesa</a></li>
              <li><a href="#raportimi">Raporto një Problem</a></li>
            </ul>
          </div>

          {/* Kolona 4: Ligjore */}
          <div className="tastio-footer-col">
            <h4>Ligjore</h4>
            <ul>
              <li><a href="#kushtet">Kushtet e Përdorimit</a></li>
              <li><a href="#privatesia">Politika e Privatësisë</a></li>
              <li><a href="#cookies">Menaxhimi i Cookies</a></li>
              <li><a href="#siguria-data">Mbrojtja e të Dhënave</a></li>
              <li><a href="#licencat">Licencat Tregtare</a></li>
            </ul>
          </div>
        </div>

        <div className="tastio-footer-divider"></div>

        <div className="tastio-footer-bottom">
          <p>© 2026 Tastio Technologies. Të gjitha të drejtat e rezervuara. Praktika Profesionale 2026/27 — Projekti 02.</p>
          <div className="tastio-footer-meta">
            <span>🇦🇱 Shqipëri & Kosovë (EUR €)</span>
            <span>•</span>
            <span>Zhvilluesi: <strong>Blin Krasniqi</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
