import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { participantEntry } from '../services/api';

interface ParticipantEntryPageProps {
  onLoginSuccess: (usn: string) => void;
}

export const ParticipantEntryPage: React.FC<ParticipantEntryPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [usn, setUsn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsn = usn.trim().toUpperCase();
    if (!cleanUsn) {
      setError('Please enter a valid USN or College Roll Number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await participantEntry(cleanUsn);
      localStorage.setItem('participant_token', res.session_token);
      localStorage.setItem('participant_usn', res.participant.usn);
      onLoginSuccess(res.participant.usn);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        'Unable to enter competition. Please verify your USN or contact the student coordinators.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper page-wrapper--narrow">
      <div className="card" style={{ padding: '40px', marginTop: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(59,130,246,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--blue)',
            }}
          >
            <Shield size={32} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>
            Participant Portal
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Enter your official GNDEC University Seat Number (USN) or Roll Number to access the examination arena.
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.25)',
              borderRadius: '8px',
              color: 'var(--crimson)',
              fontSize: '0.9rem',
              marginBottom: '24px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.9rem' }}>
              University Seat Number (USN) / College Roll Number
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 3GN22CS001"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              autoFocus
              required
              style={{ fontSize: '1.1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Format is case-insensitive. Eligible registered students will be admitted immediately.
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--full"
            disabled={loading}
            style={{ marginTop: '24px' }}
          >
            {loading ? (
              <span>Validating Eligibility...</span>
            ) : (
              <>
                <span>Access Participant Arena</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Organized by Department of CSE – IoT & Cybersecurity, GNDEC Bidar
        </div>
      </div>
    </div>
  );
};
