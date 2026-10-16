import React, { useState } from 'react';
import { ShieldCheck, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { RulesVersion } from '../types';
import { recordConsent } from '../services/api';

interface RulesModalProps {
  isOpen: boolean;
  rules: RulesVersion | null;
  onConsentAccepted: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, rules, onConsentAccepted }) => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !rules) return null;

  const handleAccept = async () => {
    if (!agreed) {
      setError('You must check the agreement box before proceeding.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await recordConsent(rules.id);
      onConsentAccepted();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record rules acceptance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '720px', width: '92%' }}>
        <div className="modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(59,130,246,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue)',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="modal__title">Mandatory Competition Rules</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Official Guidelines • Version {rules.version}
              </div>
            </div>
          </div>
        </div>

        <div className="modal__body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          <div
            className="rules-content"
            style={{ fontSize: '0.9rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}
            dangerouslySetInnerHTML={{ __html: rules.rules_html }}
          />

          <div
            style={{
              marginTop: '20px',
              padding: '14px 16px',
              background: 'rgba(217,119,6,0.06)',
              border: '1px solid rgba(217,119,6,0.2)',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={20} color="var(--amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <strong>Strict Proctoring in Effect:</strong> Leaving full-screen mode, switching browser tabs, or minimizing the window during an active round will immediately terminate your attempt with zero score.
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: '8px',
                color: 'var(--crimson)',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div className="modal__footer" style={{ flexDirection: 'column', gap: '14px', alignItems: 'stretch' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '8px 4px',
            }}
            onClick={() => setAgreed(!agreed)}
          >
            <div style={{ color: agreed ? 'var(--blue)' : 'var(--text-muted)', marginTop: '2px' }}>
              {agreed ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            {/* Phase 6 exact text requirement */}
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              I have read, understood, and agree to follow the official Hacktober 2026 Cybersecurity Quiz Challenge rules.
            </span>
          </label>

          <button
            onClick={handleAccept}
            className="btn btn--primary btn--full"
            disabled={!agreed || loading}
          >
            {loading ? 'Recording Consent...' : 'Accept & Proceed to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
