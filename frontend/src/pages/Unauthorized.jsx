import React from 'react';
import { Link } from 'react-router-dom';

export default function Paautorizuar() {
  return (
    <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
      <div className="card" style={{ padding: '40px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Qasja e Kufizuar</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Roli juaj aktual nuk ju jep leje të mjaftueshme për të hyrë në këtë faqe.
        </p>
        <Link to="/" className="btn btn-primary">
          Kthehu në Faqen Kryesore
        </Link>
      </div>
    </div>
  );
}
