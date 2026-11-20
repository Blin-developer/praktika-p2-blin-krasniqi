import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { Shield, CheckCircle2, AlertCircle, ArrowLeft, User, Mail, Phone, Lock } from 'lucide-react';
import './AccountSettings.css';

export default function AccountSettings() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [dukeNgarkuar, setDukeNgarkuar] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [gabim, setGabim] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || (['super_admin', 'admin'].includes(user.role) ? 'Admin' : ''));
      setPhone(user.phone || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGabim(null);
    setSukses(false);

    if (!name.trim()) {
      setGabim('Emri nuk mund të lihet bosh.');
      return;
    }

    setDukeNgarkuar(true);

    try {
      const res = await api.put('/auth/profile', {
        name: name.trim(),
        phone: phone.trim() || null,
      });

      const updatedUser = res.data.user || res.data.perdoruesi;
      updateUser(updatedUser);
      setSukses(true);

      setTimeout(() => {
        setSukses(false);
      }, 4000);
    } catch (err) {
      setGabim(
        err.response?.data?.errors?.name?.[0] ||
        err.response?.data?.mesazh ||
        'Përditësimi dështoi. Ju lutem provoni përsëri.'
      );
    } finally {
      setDukeNgarkuar(false);
    }
  };

  const isAdmin = user && ['super_admin', 'admin', 'owner', 'branch_manager'].includes(user.role);

  const merrTitullRoli = (r) => {
    switch (r) {
      case 'super_admin': return 'Super Administrator';
      case 'owner': return 'Pronar Restoranti';
      case 'branch_manager': return 'Menaxher Dege';
      case 'kitchen_staff': return 'Staf Kuzhine';
      case 'cashier': return 'Arkëtar';
      case 'customer': return 'Klient';
      default: return r || 'Përdorues';
    }
  };

  return (
    <DashboardLayout activeTab="settings">
      <div className="tastio-settings-container">
        {/* Header */}
        <div className="tastio-settings-card">
          <div className="tastio-settings-header">
            <div className="tastio-settings-avatar">
              <User size={28} />
            </div>
            <div>
              <h1 className="tastio-settings-title">Cilësimet e Llogarisë</h1>
              <p className="tastio-settings-subtitle">
                Menaxhoni emrin tuaj të profilit, kontaktet dhe të dhënat e sigurisë.
              </p>
            </div>
          </div>

          {sukses && (
            <div className="tastio-settings-alert success">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>Të dhënat u përditësuan me sukses! Emri i ri u reflektua menjëherë në të gjithë platformën.</span>
            </div>
          )}

          {gabim && (
            <div className="tastio-settings-alert error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{gabim}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="tastio-settings-form">
            {/* Roli në Sistem */}
            <div className="tastio-settings-field">
              <label className="tastio-settings-label">
                <span>Roli dhe Privilegjet në Platformë</span>
                <span className="tastio-role-badge">
                  <Shield size={13} />
                  <span>{merrTitullRoli(user?.role)}</span>
                </span>
              </label>
              <div className="tastio-settings-info-box">
                <Lock size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#64748b' }} />
                <span>
                  Privilegjet tuaja administrative janë të garantuara dhe të mbrojtura nga sistemi. Ndryshimi i emrit më poshtë modifikon vetëm paraqitjen vizuale në navigim dhe komunikime.
                </span>
              </div>
            </div>

            {/* Emri i shfaqur */}
            <div className="tastio-settings-field">
              <label htmlFor="settingsName" className="tastio-settings-label">
                Emri i Shfaqur *
              </label>
              <input
                id="settingsName"
                type="text"
                className="tastio-settings-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="psh. Admin ose Emri juaj"
              />
              <span className="tastio-settings-hint">
                Ky emër shfaqet në shiritin e sipërm dhe në raportet administrative.
              </span>
            </div>

            {/* Email (Vetëm lexim) */}
            <div className="tastio-settings-field">
              <label htmlFor="settingsEmail" className="tastio-settings-label">
                Adresa e Emailit (Identifikuesi Unik)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="settingsEmail"
                  type="email"
                  className="tastio-settings-input readonly"
                  value={email}
                  disabled
                  readOnly
                />
                <Mail size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
              <span className="tastio-settings-hint">
                Email-i përdoret për identifikim të sigurt dhe njoftime operative.
              </span>
            </div>

            {/* Numri i Telefonit */}
            <div className="tastio-settings-field">
              <label htmlFor="settingsPhone" className="tastio-settings-label">
                Numri i Telefonit të Kontaktit
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="settingsPhone"
                  type="tel"
                  className="tastio-settings-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+383 4X XXX XXX"
                />
                <Phone size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            {/* Butoni Ruaj */}
            <div style={{ paddingTop: '8px' }}>
              <button
                type="submit"
                disabled={dukeNgarkuar}
                className="tastio-settings-submit-btn"
              >
                {dukeNgarkuar ? 'Duke ruajtur ndryshimet...' : 'Ruaj Ndryshimet e Profilit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
