import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, AlertCircle, User, GraduationCap, Building } from 'lucide-react';
import { participantEntry } from '../services/api';

interface ParticipantEntryPageProps {
  onLoginSuccess: (usn: string) => void;
}

export const ParticipantEntryPage: React.FC<ParticipantEntryPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [department, setDepartment] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsn = usn.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanDept = department.trim();
    const cleanCollege = collegeName.trim();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanUsn) {
      setError('Please enter a valid USN or College Roll Number.');
      return;
    }
    if (!cleanDept) {
      setError('Please enter your department / branch.');
      return;
    }
    if (!cleanCollege) {
      setError('Please enter your college name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await participantEntry({
        usn: cleanUsn,
        name: cleanName,
        department: cleanDept,
        college_name: cleanCollege,
      });
      localStorage.setItem('participant_token', res.session_token);
      localStorage.setItem('participant_usn', res.participant.usn);
      if (res.participant.name) {
        localStorage.setItem('participant_name', res.participant.name);
      }
      onLoginSuccess(res.participant.usn);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        'Unable to enter competition. Please verify your details or contact the student coordinators.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper page-wrapper--narrow">
      <div className="card" style={{ padding: '40px', marginTop: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
            Enter your details and official USN / Roll Number to access the examination arena.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} color="var(--blue)" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={15} color="var(--blue)" />
              <span>University Seat Number (USN) / College Roll Number</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 3GN22CS001"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              required
              style={{ fontSize: '1.05rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Format is case-insensitive. Eligible registered students will be admitted immediately.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GraduationCap size={15} color="var(--blue)" />
              <span>Department / Branch</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. CSE - IoT & Cybersecurity"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={15} color="var(--blue)" />
              <span>College Name</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Guru Nanak Dev Engineering College, Bidar"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--full"
            disabled={loading}
            style={{ marginTop: '8px' }}
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
