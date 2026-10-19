import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, KeyRound, X, AlertCircle, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { supabaseAdminVerify } from '../services/api';

const AUTHORIZED_ADMIN_EMAIL = 'preetsagal7@gmail.com';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'enter_email' | 'enter_otp'>('enter_email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setInfoMsg(null);
      setOtp('');
      setLoading(false);
      setStep('enter_email');
      setEmail(AUTHORIZED_ADMIN_EMAIL);
    }
  }, [isOpen]);

  // Listen for Magic Link clicks in Gmail that redirect back to the app
  useEffect(() => {
    if (!isOpen) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.email) {
        if (session.user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
          try {
            setLoading(true);
            const res = await supabaseAdminVerify(session.user.email, session.access_token);
            localStorage.setItem('admin_token', res.access_token);
            localStorage.setItem('admin_id', res.admin_id);
            onClose();
            navigate('/admin');
          } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to authorize admin session with server.');
          } finally {
            setLoading(false);
          }
        } else {
          setError(`Access denied. ${session.user.email} is not authorized.`);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, navigate, onClose]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      setError(`Access Denied: Only ${AUTHORIZED_ADMIN_EMAIL} is authorized as Administrator.`);
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setStep('enter_otp');
      setInfoMsg(`A 6-digit login code and magic link have been sent to ${cleanEmail}. Check your inbox!`);
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'Failed to send login code. Please verify Supabase settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError('Please enter the 6-digit code sent to your Gmail.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanOtp,
        type: 'email',
      });

      if (verifyError || !data.session) {
        throw verifyError || new Error('Invalid or expired code.');
      }

      // Verify session with FastAPI backend and retrieve admin access JWT
      const res = await supabaseAdminVerify(data.user?.email || email, data.session.access_token);
      localStorage.setItem('admin_token', res.access_token);
      localStorage.setItem('admin_id', res.admin_id);

      onClose();
      navigate('/admin');
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setError(err.response?.data?.detail || err.message || 'Invalid or expired code. Please try again.');
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
                Passwordless Gmail Verification
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal__close" aria-label="Close">
            <X size={18} />
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

          {infoMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: 'rgba(5,150,105,0.08)',
                border: '1px solid rgba(5,150,105,0.2)',
                borderRadius: '8px',
                color: 'var(--emerald)',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{infoMsg}</span>
            </div>
          )}

          {step === 'enter_email' ? (
            <form onSubmit={handleSendOtp}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                Admin access is secured with <strong>Supabase Passwordless Email</strong>. Only your registered Gmail is authorized.
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">
                  <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Authorized Admin Gmail
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
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
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Login Code to Gmail</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                Enter the <strong>6-digit code</strong> sent to <strong>{email}</strong>:
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">
                  <KeyRound size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Verification Code (OTP)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\s+/g, ''))}
                  maxLength={8}
                  style={{
                    letterSpacing: '4px',
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={loading}
                style={{ marginBottom: '12px' }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify & Enter Admin Portal</span>
                )}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep('enter_email');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="btn btn--ghost btn--xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Change Email
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="btn btn--ghost btn--xs"
                  disabled={loading}
                  style={{ color: 'var(--blue)' }}
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
