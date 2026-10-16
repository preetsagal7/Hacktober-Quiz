import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';
import { getPublicRules } from '../services/api';
import { RulesVersion } from '../types';

export const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<RulesVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicRules()
      .then((data) => setRules(data))
      .catch((err) => console.error('Rules fetch error', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrapper page-wrapper--narrow">
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(59,130,246,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--blue)',
          }}
        >
          <ShieldCheck size={30} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)' }}>
          Official Competition Rules & Policy
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Hacktober 2026 • Guru Nanak Dev Engineering College, Bidar
        </p>
      </div>

      <div className="card" style={{ padding: '36px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : rules ? (
          <div
            className="rules-content"
            style={{ fontSize: '0.92rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}
            dangerouslySetInnerHTML={{ __html: rules.rules_html }}
          />
        ) : (
          <p>Unable to load competition rules at this moment.</p>
        )}

        <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'center' }}>
          <Link to="/entry" className="btn btn--primary btn--lg">
            <span>Proceed to Participant Login</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
};
