import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Play, CheckCircle2, Clock, AlertTriangle, FileText, Send, User } from 'lucide-react';
import {
  getParticipantMe,
  getParticipantRounds,
  getCurrentRules,
  submitAppeal,
  getMyAppeals,
} from '../services/api';
import { Participant, Round, RulesVersion, Appeal } from '../types';
import { RulesModal } from '../components/RulesModal';

export const ParticipantDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [rules, setRules] = useState<RulesVersion | null>(null);
  const [needsRulesModal, setNeedsRulesModal] = useState(false);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  // Appeal state
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealSubject, setAppealSubject] = useState('');
  const [appealDesc, setAppealDesc] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [pData, rData, rulesData, appealsData] = await Promise.all([
        getParticipantMe(),
        getParticipantRounds().catch(() => []),
        getCurrentRules().catch(() => null),
        getMyAppeals().catch(() => []),
      ]);

      setParticipant(pData);
      setRounds(rData);
      setRules(rulesData);
      setAppeals(appealsData);

      // Check if rules acceptance is needed
      const token = localStorage.getItem('participant_token');
      if (token && rulesData) {
        // If the server rejected previous quiz calls or flagged rules, we prompt
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Not logged in or rules not accepted
        if (err.response?.data?.detail?.includes('rules')) {
          setNeedsRulesModal(true);
        } else {
          navigate('/entry');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subject = appealSubject.trim();
    const desc = appealDesc.trim();
    if (!subject || !desc) {
      alert('Please provide both a subject and a description for your appeal.');
      return;
    }
    setAppealSubmitting(true);
    setAppealSuccess(null);
    try {
      const newAppeal = await submitAppeal(subject, desc);
      setAppeals((prev) => [newAppeal, ...prev]);
      setAppealSubject('');
      setAppealDesc('');
      setShowAppealForm(false);
      setAppealSuccess('Your appeal has been submitted for administrative review.');
    } catch (err: any) {
      let errorMsg = 'Failed to submit appeal. Please try again.';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          errorMsg = detail
            .map((item: any) => item.msg || (typeof item === 'string' ? item : JSON.stringify(item)))
            .join('\n');
        } else if (typeof detail === 'object') {
          errorMsg = detail.msg || JSON.stringify(detail);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      alert(errorMsg);
    } finally {
      setAppealSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper page-wrapper--centered">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-wrapper page-wrapper--wide">
      {/* ─── Participant Header ─── */}
      <div
        className="card"
        style={{
          padding: '28px 32px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'var(--grad-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: 'var(--shadow-glow-blue)',
            }}
          >
            <User size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--electric)', textTransform: 'uppercase' }}>
              Participant Verified
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', margin: '2px 0 4px' }}>
              {participant?.name || `USN: ${participant?.usn}`}
            </h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {participant?.name && <span><strong>USN:</strong> {participant.usn} • </span>}
              {participant?.email && <span>{participant.email} • </span>}
              {participant?.department && <span>{participant.department} • </span>}
              <span>{participant?.college_name || 'Guru Nanak Dev Engineering College, Bidar'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setNeedsRulesModal(true)}
            className="btn btn--secondary btn--sm"
          >
            <FileText size={16} />
            <span>Review Rules</span>
          </button>
          <button
            onClick={() => setShowAppealForm(!showAppealForm)}
            className="btn btn--ghost btn--sm"
          >
            <AlertTriangle size={16} />
            <span>Submit Appeal</span>
          </button>
        </div>
      </div>

      {appealSuccess && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(5,150,105,0.08)',
            border: '1px solid rgba(5,150,105,0.25)',
            borderRadius: '10px',
            color: 'var(--emerald)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{appealSuccess}</span>
        </div>
      )}

      {/* ─── Appeal Form ─── */}
      {showAppealForm && (
        <div className="card" style={{ padding: '24px', marginBottom: '32px', borderColor: 'var(--electric)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
            Submit an Appeal or Report a Technical Issue
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            If you experienced an inadvertent window blur, connection drop, or wish to dispute a proctoring decision, submit the details below. Decisions by the organizing committee are final.
          </p>
          <form onSubmit={handleAppealSubmit}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Browser crash during Round 1"
                value={appealSubject}
                onChange={(e) => setAppealSubject(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Provide a clear description of what occurred..."
                value={appealDesc}
                onChange={(e) => setAppealDesc(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAppealForm(false)}
                className="btn btn--secondary btn--sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={appealSubmitting}
              >
                <Send size={15} />
                <span>{appealSubmitting ? 'Submitting...' : 'Send Appeal'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Available Rounds ─── */}
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '20px' }}>
        Competition Examination Rounds
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {rounds.map((round) => {
          const isOpen = round.status === 'open';
          const isClosed = round.status === 'closed' || round.status === 'results_published';
          const attemptStatus = round.my_attempt_status;
          const isCompleted = attemptStatus === 'submitted' || attemptStatus === 'timed_out' || attemptStatus === 'terminated';
          const isInProgress = attemptStatus === 'in_progress';

          return (
            <div
              key={round.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: isCompleted
                  ? '2px solid rgba(16,185,129,0.3)'
                  : isInProgress
                  ? '2px solid rgba(245,158,11,0.4)'
                  : isOpen
                  ? '2px solid rgba(59,130,246,0.4)'
                  : 'var(--border-light)',
                boxShadow: isOpen ? 'var(--shadow-glow-blue)' : 'var(--shadow-nm-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="badge badge--blue">Round {round.round_number}</span>
                <span
                  className={`badge ${
                    isCompleted
                      ? 'badge--emerald'
                      : isInProgress
                      ? 'badge--amber'
                      : isOpen
                      ? 'badge--emerald'
                      : round.status === 'paused'
                      ? 'badge--amber'
                      : 'badge--default'
                  }`}
                >
                  {isCompleted
                    ? 'COMPLETED'
                    : isInProgress
                    ? 'IN PROGRESS'
                    : round.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
                {round.name}
              </h3>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 }}>
                {round.description}
              </p>

              <div
                style={{
                  margin: '18px 0',
                  padding: '14px',
                  background: 'var(--bg-surface)',
                  borderRadius: '10px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  <strong>Duration:</strong> {round.duration_minutes} Mins
                </div>
                <div>
                  <strong>Questions:</strong> {round.question_count}
                </div>
                <div>
                  <strong>Points:</strong> +{round.points_correct} / -{round.points_incorrect}
                </div>
                <div>
                  <strong>Max Score:</strong> {round.max_score} pts
                </div>
              </div>

              {isCompleted ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="btn btn--secondary btn--full" disabled style={{ opacity: 0.9, cursor: 'default' }}>
                    <CheckCircle2 size={16} color="var(--emerald)" />
                    <span>Test Completed</span>
                  </button>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    One test attempt per USN allowed. Your responses have been recorded.
                  </div>
                </div>
              ) : isInProgress ? (
                <button
                  onClick={() => navigate(`/quiz/${round.id}`)}
                  className="btn btn--primary btn--full"
                >
                  <Play size={16} />
                  <span>Resume Examination</span>
                </button>
              ) : isOpen ? (
                <button
                  onClick={() => navigate(`/quiz/${round.id}`)}
                  className="btn btn--primary btn--full"
                >
                  <Play size={16} />
                  <span>Enter Examination Arena</span>
                </button>
              ) : isClosed ? (
                <button
                  onClick={() => navigate('/results')}
                  className="btn btn--secondary btn--full"
                >
                  <span>View Leaderboard</span>
                </button>
              ) : (
                <button className="btn btn--secondary btn--full" disabled>
                  <span>Round Not Started Yet</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Appeals History ─── */}
      {appeals.length > 0 && (
        <div style={{ marginTop: '48px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '16px' }}>
            Your Submitted Appeals
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {appeals.map((a) => (
              <div key={a.id} className="card card--sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.subject}</div>
                  <span className={`badge ${a.status === 'resolved' ? 'badge--emerald' : 'badge--amber'}`}>
                    {a.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  {a.description}
                </div>
                {a.admin_response && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      background: 'rgba(59,130,246,0.05)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--blue)',
                    }}
                  >
                    <strong>Committee Response:</strong> {a.admin_response}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Mandatory Rules Modal ─── */}
      <RulesModal
        isOpen={needsRulesModal}
        rules={rules}
        onConsentAccepted={() => {
          setNeedsRulesModal(false);
          loadData();
        }}
      />
    </div>
  );
};
