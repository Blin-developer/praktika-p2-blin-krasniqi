import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function PaneliAdministrimit() {
  const { user } = useAuth();
  const [metrikat, setMetrikat] = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);

  useEffect(() => {
    async function ngarkoMetrikat() {
      try {
        setDukeNgarkuar(true);
        const res = await api.get('/admin/metrics');
        setMetrikat(res.data);
      } catch (err) {
        console.error('Dështoi ngarkimi i statistikave', err);
      } finally {
        setDukeNgarkuar(false);
      }
    }

    if (user?.role === 'super_admin') {
      ngarkoMetrikat();
    } else {
      setDukeNgarkuar(false);
    }
  }, [user]);

  const perktheRolin = (r) => {
    switch (r) {
      case 'super_admin': return 'Super Administrator';
      case 'owner': return 'Pronar Restoranti';
      case 'branch_manager': return 'Menaxher Dege';
      case 'kitchen_staff': return 'Staf Kuzhine';
      case 'cashier': return 'Arkëtar Sporteli';
      case 'customer': return 'Klient';
      default: return r;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>Paneli Administrativ i Platformës</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          I kyçur si <strong>{user?.name}</strong> • Roli: <span className="badge badge-primary">{perktheRolin(user?.role)}</span>
        </p>
      </div>

      {user?.role === 'super_admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Përdorues në Platformë</div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--color-text-main)' }}>
              {duke_ngarkuar ? '...' : metrikat?.total_users || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>Në 5 role të dallueshme RBAC</div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Restorante Aktive</div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--color-primary)' }}>
              {duke_ngarkuar ? '...' : metrikat?.total_restaurants || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Tartine, Babalup</div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Degë Përgjegjëse</div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--color-secondary)' }}>
              {duke_ngarkuar ? '...' : metrikat?.total_branches || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Prishtinë Qendër, Dardani</div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Porosi të Përpunuara</div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: '#8b5cf6' }}>
              {duke_ngarkuar ? '...' : metrikat?.total_orders || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Me historik të pandryshueshëm</div>
          </div>
        </div>
      )}

      {/* Kartelat e Veprimeve të Shpejta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>🏬 Restorantet & Degët</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Konfigurimi i adresave, gjeolokacionit, orareve javore dhe kapacitetit për dritare 15-minutëshe.
          </p>
          <button className="btn btn-outline" style={{ fontSize: '13px' }}>Menaxho Degët</button>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>🍔 Menytë & Modifikuesit</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Konfigurimi i grupeve të opsioneve, kufijve min/max, shtesave të çmimit dhe stacioneve të kuzhinës.
          </p>
          <button className="btn btn-outline" style={{ fontSize: '13px' }}>Ndrysho Menytë</button>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>👥 Stafi & Stacionet</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Caktimi i menaxherëve, shefave të linjës së kuzhinës dhe arkëtarëve në stacione përkatëse.
          </p>
          <button className="btn btn-outline" style={{ fontSize: '13px' }}>Menaxho Stafin</button>
        </div>
      </div>
    </div>
  );
}
