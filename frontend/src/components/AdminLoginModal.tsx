import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, X, AlertCircle, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';
import { adminLogin, supabaseAdminVerify } from '../services/api';
import { supabase } from '../services/supabase';

const AUTHORIZED_ADMIN_EMAIL = 'preetsagal7@gmail.com';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'password' | 'magic_link'>('password');
  const [email, setEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Direct login with Gmail + Master Password (100% reliable, zero email/SMTP issues)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      setError(`Access Denied: Only ${AUTHORIZED_ADMIN_EMAIL} is authorized as Administrator.`);
      setLoading(false);
      return;
    }

    try {
      const res = await adminLogin(cleanEmail, password);
      localStorage.setItem('admin_token', res.access_token);
      localStorage.setItem('admin_id', res.admin_id);
      onClose();
      navigate('/admin');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid password. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Supabase Magic Link handler
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: AUTHORIZED_ADMIN_EMAIL,
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: true,
        },
      });

      if (otpError) throw otpError;
      setMagicLinkSent(true);
    } catch (err: any) {
      console.error('Magic link error:', err);
      setError(err.message || 'Failed to send login email. Please use direct password sign-in instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: AUTHORIZED_ADMIN_EMAIL,
        token: otp.trim(),
        type: 'email',
      });

      if (verifyError || !data.session) throw verifyError || new Error('Invalid code.');
      const res = await supabaseAdminVerify(AUTHORIZED_ADMIN_EMAIL, data.session.access_token);
      localStorage.setItem('admin_token', res.access_token);
      localStorage.setItem('admin_id', res.admin_id);
      onClose();
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Verification failed. Try direct password sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59,130,246,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue)',
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <div className="modal__title">Administrator Access</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Authorized Gmail Portal
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal__close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Auth Method Selector */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            borderRadius: '8px',
            padding: '4px',
            margin: '16px 20px 0',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMethod('password');
              setError(null);
            }}
            className={`btn btn--xs ${authMethod === 'password' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
          >
            Direct Gmail Sign-In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('magic_link');
              setError(null);
            }}
            className={`btn btn--xs ${authMethod === 'magic_link' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
          >
            Email Link / OTP
          </button>
        </div>

        <div className="modal__body">
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: '8px',
                color: 'var(--crimson)',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {authMethod === 'password' ? (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                Sign in directly with your authorized Gmail. Zero email waiting or rate limits.
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">
                  <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Authorized Admin Gmail
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="preetsagal7@gmail.com"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label">
                  <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Admin Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in with {AUTHORIZED_ADMIN_EMAIL}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div>
              {!magicLinkSent ? (
                <form onSubmit={handleSendMagicLink}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                    Send a 1-click login link to <strong>{AUTHORIZED_ADMIN_EMAIL}</strong>.
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">
                      <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={AUTHORIZED_ADMIN_EMAIL}
                      disabled
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn--primary btn--full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={15} className="spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <span>Send Magic Link to Gmail</span>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div
                    style={{
                      background: 'rgba(59,130,246,0.08)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Check your Gmail and click <strong>"Sign in"</strong>, or enter the code below:
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">
                      <KeyRound size={14} style={{ display: 'inline', marginRight: '6px' }} />
                      6-Digit Code (if provided)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\s+/g, ''))}
                      maxLength={8}
                      style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn--primary btn--full"
                    disabled={loading || !otp.trim()}
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
