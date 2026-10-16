import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, X, KeyRound, AlertCircle } from 'lucide-react';
import { adminLogin, changePassword } from '../services/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forced password change state
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (requirePasswordChange) {
        if (newPassword.length < 8) {
          setError('New password must be at least 8 characters long.');
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        await changePassword(password, newPassword);
        onClose();
        navigate('/admin');
        return;
      }

      const res = await adminLogin(adminId.trim(), password);
      localStorage.setItem('admin_token', res.access_token);
      localStorage.setItem('admin_id', res.admin_id);

      if (res.must_change_password) {
        setRequirePasswordChange(true);
      } else {
        onClose();
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid administrator credentials. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
              <div className="modal__title">
                {requirePasswordChange ? 'Set New Password' : 'Administrator Access'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Hacktober 2026 Competition Control
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal__close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {!requirePasswordChange ? (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <User size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Admin ID
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Quiz@Cyber26"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Admin Password
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  This account is using the initial bootstrap credentials. You must set a new secure password before proceeding.
                </p>

                <div className="form-group">
                  <label className="form-label">
                    <KeyRound size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div className="modal__footer">
            <button type="button" onClick={onClose} className="btn btn--secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Authenticating...' : requirePasswordChange ? 'Update Password' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
