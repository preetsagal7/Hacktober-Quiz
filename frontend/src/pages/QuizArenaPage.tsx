import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Save,
  Send,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  getAttemptStatus,
  getAttemptAnswers,
  reportViolation,
  getParticipantRound,
} from '../services/api';
import { Round, Question, SubmitAttemptResponse } from '../types';

export const QuizArenaPage: React.FC = () => {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();

  // Round & Attempt state
  const [round, setRound] = useState<Round | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Examination lifecycle
  const [hasStarted, setHasStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreExamModal, setShowPreExamModal] = useState(true);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmitAttemptResponse | null>(null);

  // Proctoring & Termination state
  const [violationTerminated, setViolationTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);

  // Timer & Autosave state
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number>(1200); // default 20m
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const timerRef = useRef<any>(null);
  const attemptIdRef = useRef<string | null>(null);
  attemptIdRef.current = attemptId;

  // Load round information
  useEffect(() => {
    if (!roundId) return;
    getParticipantRound(roundId)
      .then((r) => {
        setRound(r);
        setTotalSeconds(r.duration_minutes * 60);
      })
      .catch((err) => {
        alert(err.response?.data?.detail || 'Failed to load round details.');
        navigate('/dashboard');
      });
  }, [roundId, navigate]);

  // Handle Fullscreen & Start
  const handleStartExam = async () => {
    if (!roundId) return;

    try {
      // 1. Request full-screen if supported and required
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {
          console.warn('Fullscreen request denied by user or browser');
        });
      }

      // 2. Start attempt on backend
      const res = await startAttempt(roundId);
      setAttemptId(res.attempt_id);
      setQuestions(res.questions);

      // Compute remaining seconds from server deadline
      const deadline = new Date(res.deadline_at).getTime();
      const serverTime = new Date(res.server_time).getTime();
      const remaining = Math.max(0, Math.floor((deadline - serverTime) / 1000));
      setSecondsRemaining(remaining);

      // If resuming attempt, fetch previously saved answers
      try {
        const savedRes = await getAttemptAnswers(res.attempt_id);
        if (savedRes.answers) {
          setSelectedAnswers(savedRes.answers);
        }
      } catch (err) {
        console.warn('Could not fetch existing answers', err);
      }

      setShowPreExamModal(false);
      setHasStarted(true);
      setIsFullscreen(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Unable to start round. Ensure the round is open.');
      navigate('/dashboard');
    }
  };

  // Synchronized countdown timer
  useEffect(() => {
    if (!hasStarted || secondsRemaining === null || violationTerminated || submissionResult) {
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [hasStarted, secondsRemaining, violationTerminated, submissionResult]);

  // Violation handler
  const triggerViolation = useCallback(
    async (type: 'fullscreen_exit' | 'tab_switch' | 'window_blur') => {
      const currentAttempt = attemptIdRef.current;
      if (!currentAttempt || violationTerminated || !hasStarted || submissionResult) {
        return;
      }

      try {
        const res = await reportViolation(currentAttempt, type);
        if (res.resulted_in_termination) {
          setViolationTerminated(true);
          setTerminationReason(
            type === 'fullscreen_exit'
              ? 'Full-screen mode was exited during strict examination policy.'
              : type === 'tab_switch'
              ? 'Tab visibility change detected during strict examination policy.'
              : 'Window lost focus during strict examination policy.'
          );
        }
      } catch (err) {
        console.error('Failed to report violation', err);
      }
    },
    [hasStarted, violationTerminated, submissionResult]
  );

  // Proctoring listeners
  useEffect(() => {
    if (!hasStarted || violationTerminated || submissionResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('tab_switch');
      }
    };

    const handleBlur = () => {
      triggerViolation('window_blur');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        triggerViolation('fullscreen_exit');
      } else {
        setIsFullscreen(true);
      }
    };

    // Prevent right click and copy/paste
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
    };
  }, [hasStarted, violationTerminated, submissionResult, triggerViolation]);

  // Answer selection and autosave
  const handleSelectOption = async (optionId: string) => {
    if (!attemptId || violationTerminated || submissionResult) return;
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    // Optimistic UI update
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }));

    setSaveStatus('saving');
    try {
      await saveAnswer(attemptId, currentQ.id, optionId);
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  // Submit attempt
  const handleAutoSubmit = async () => {
    if (!attemptId || submissionResult || violationTerminated) return;
    setIsSubmitting(true);
    try {
      const res = await submitAttempt(attemptId);
      setSubmissionResult(res);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Failed auto submit', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!attemptId) return;
    setIsSubmitting(true);
    setShowConfirmSubmit(false);
    try {
      const res = await submitAttempt(attemptId);
      setSubmissionResult(res);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit examination.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;

  // ─── Render: Pre-Exam Modal ───
  if (showPreExamModal) {
    return (
      <div className="modal-backdrop">
        <div className="modal" style={{ maxWidth: '640px', width: '92%' }}>
          <div className="modal__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(59,130,246,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--blue)',
                }}
              >
                <Maximize2 size={22} />
              </div>
              <div>
                <div className="modal__title">Proctored Examination Mode</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {round?.name || 'Quiz Challenge'}
                </div>
              </div>
            </div>
          </div>

          <div className="modal__body">
            <div
              style={{
                padding: '16px',
                background: 'rgba(217,119,6,0.08)',
                border: '1px solid rgba(217,119,6,0.25)',
                borderRadius: '10px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px' }}>
                <AlertTriangle size={18} />
                <span>Strict Proctoring Rules Apply</span>
              </div>
              <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.6', margin: 0 }}>
                <li>This round requires mandatory full-screen mode on a laptop or desktop computer.</li>
                <li><strong>Exiting full-screen</strong> will result in immediate termination of your attempt.</li>
                <li><strong>Switching tabs or minimizing the browser window</strong> is strictly logged and causes instant termination.</li>
                <li>Answers are automatically saved after each selection.</li>
                <li>Once submitted or terminated, attempts cannot be re-opened without administrative appeal.</li>
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div className="card card--xs" style={{ background: 'var(--bg-surface)' }}>
                <strong>Questions:</strong> {round?.question_count} MCQs
              </div>
              <div className="card card--xs" style={{ background: 'var(--bg-surface)' }}>
                <strong>Time Allowed:</strong> {round?.duration_minutes} Minutes
              </div>
              <div className="card card--xs" style={{ background: 'var(--bg-surface)' }}>
                <strong>Marking:</strong> +{round?.points_correct} / -{round?.points_incorrect}
              </div>
              <div className="card card--xs" style={{ background: 'var(--bg-surface)' }}>
                <strong>Max Points:</strong> {round?.max_score} Pts
              </div>
            </div>
          </div>

          <div className="modal__footer">
            <button onClick={() => navigate('/dashboard')} className="btn btn--secondary">
              Back to Dashboard
            </button>
            <button onClick={handleStartExam} className="btn btn--primary">
              <Maximize2 size={16} />
              <span>Enter Fullscreen & Begin Exam</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Termination Notice (Phase 9) ───
  if (violationTerminated) {
    return (
      <div className="violation-modal">
        <div className="violation-modal__card">
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(220,38,38,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--crimson)',
            }}
          >
            <ShieldAlert size={36} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--crimson)', marginBottom: '10px' }}>
            Attempt Terminated
          </h2>

          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
            {terminationReason || 'A detectable proctoring violation was recorded by the server.'}
          </p>

          <div
            style={{
              padding: '12px',
              background: 'var(--bg-surface)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
            }}
          >
            All answers received by the server prior to this event have been preserved. If this was an inadvertent error or hardware fault, you may file an appeal.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn--primary btn--full">
              Go to Dashboard & Submit Appeal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Submission Confirmation Result ───
  if (submissionResult) {
    return (
      <div className="page-wrapper page-wrapper--narrow">
        <div className="card" style={{ padding: '40px', marginTop: '40px', textAlign: 'center' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(5,150,105,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--emerald)',
            }}
          >
            <CheckCircle2 size={40} />
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>
            Examination Submitted!
          </h1>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '28px' }}>
            {submissionResult.message || 'Your quiz responses have been securely recorded and scored.'}
          </p>

          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '32px',
              border: '1px solid rgba(5,150,105,0.2)',
            }}
          >
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--emerald)', marginBottom: '8px' }}>
              Responses Recorded Successfully
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
              Your answers have been securely submitted and logged on the server. The official results and evaluations will be announced by the event organizers after review.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn--primary">
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Active Quiz Arena ───
  const isTimeDanger = secondsRemaining !== null && secondsRemaining < 120;
  const isTimeWarning = secondsRemaining !== null && secondsRemaining < 300 && !isTimeDanger;

  return (
    <div className="exam-mode">
      {/* ─── Sticky Exam Header ─── */}
      <header className="exam-header">
        <div className="exam-header__top-row">
          <div className="exam-header__brand">
            <img src="/logo.png" alt="Logo" className="exam-header__logo" />
            <div className="exam-header__info">
              <div className="exam-header__title">
                {round?.name}
              </div>
              <div className="exam-header__college">
                Hacktober 2026 • GNDEC Bidar
              </div>
            </div>
          </div>

          <div className="exam-header__actions">
            <div
              className={`save-indicator ${
                saveStatus === 'saving'
                  ? 'save-indicator--saving'
                  : saveStatus === 'saved'
                  ? 'save-indicator--saved'
                  : saveStatus === 'error'
                  ? 'save-indicator--error'
                  : ''
              }`}
            >
              <Save size={13} />
              <span className="save-indicator__text">
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : saveStatus === 'saved'
                  ? 'Saved ✓'
                  : saveStatus === 'error'
                  ? 'Error!'
                  : 'Autosave'}
              </span>
            </div>

            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="btn btn--success btn--sm exam-submit-btn"
            >
              <Send size={14} />
              <span>Finish & Submit</span>
            </button>
          </div>
        </div>

        {/* Server Countdown Timer & Progress Pill */}
        <div className="exam-header__timer-bar">
          <div
            className={`exam-timer ${
              isTimeDanger ? 'exam-timer--danger' : isTimeWarning ? 'exam-timer--warning' : ''
            }`}
          >
            <Clock size={15} />
            <div className="exam-timer__display">
              {secondsRemaining !== null ? formatTime(secondsRemaining) : '--:--'}
            </div>
          </div>

          <div className="exam-header__question-pill">
            <span className="exam-header__q-text">Q {currentIndex + 1} of {questions.length}</span>
            <span className="exam-header__dot">•</span>
            <span className="exam-header__count-text">{answeredCount} answered</span>
          </div>
        </div>
      </header>

      {/* ─── Main Question Content ─── */}
      <main className="exam-main">
        {currentQuestion ? (
          <div className="question-card">
            <div className="question-card__meta-bar">
              <span className="question-card__number">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div className="question-card__tags">
                {currentQuestion.topic && (
                  <span className="badge badge--blue question-topic-badge">{currentQuestion.topic}</span>
                )}
                <span className="badge badge--default question-points-badge">+{currentQuestion.point_value} pts</span>
              </div>
            </div>

            <div className="question-card__text">{currentQuestion.question_text}</div>

            {currentQuestion.code_snippet && (
              <pre className="question-card__code">
                <code>{currentQuestion.code_snippet}</code>
              </pre>
            )}

            {/* Answer Options */}
            <div className="options-grid">
              {currentQuestion.options.map((opt, optIndex) => {
                const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                const displayLabel = String.fromCharCode(65 + optIndex);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt.id)}
                    className={`option-btn ${isSelected ? 'option-btn--selected' : ''}`}
                  >
                    <div className="option-label">{displayLabel}</div>
                    <div className="option-text">{opt.option_text}</div>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="question-nav-actions">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn btn--secondary btn--sm question-nav-action-btn"
              >
                <ArrowLeft size={16} />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="btn btn--primary btn--sm question-nav-action-btn"
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
            No questions found for this round.
          </div>
        )}

        {/* Question Navigator Palette */}
        <div className="question-palette-section">
          <div className="question-palette-header">
            <div className="question-palette-title">
              Question Navigator
            </div>
            <div className="question-palette-status">
              <span className="badge badge--emerald">{answeredCount} / {questions.length} Answered</span>
            </div>
          </div>

          <div className="question-palette-progress-bar">
            <div
              className="question-palette-progress-fill"
              style={{ width: `${(answeredCount / Math.max(1, questions.length)) * 100}%` }}
            />
          </div>

          <div className="question-nav">
            {questions.map((q, idx) => {
              const isAnswered = !!selectedAnswers[q.id];
              const isActive = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`question-nav-btn ${
                    isActive ? 'question-nav-btn--active' : isAnswered ? 'question-nav-btn--answered' : ''
                  }`}
                  aria-label={`Question ${idx + 1}${isAnswered ? ', answered' : ''}${isActive ? ', current' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="question-palette-legend">
            <div className="palette-legend-item">
              <span className="palette-legend-dot palette-legend-dot--active"></span>
              <span>Current</span>
            </div>
            <div className="palette-legend-item">
              <span className="palette-legend-dot palette-legend-dot--answered"></span>
              <span>Answered</span>
            </div>
            <div className="palette-legend-item">
              <span className="palette-legend-dot palette-legend-dot--unanswered"></span>
              <span>Not Answered</span>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Submit Confirmation Modal ─── */}
      {showConfirmSubmit && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '480px', width: '90%' }}>
            <div className="modal__header">
              <div className="modal__title">Submit Examination?</div>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.
              </p>
              {answeredCount < questions.length && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(217,119,6,0.08)',
                    borderRadius: '8px',
                    color: 'var(--amber)',
                    fontSize: '0.85rem',
                    marginTop: '10px',
                  }}
                >
                  Warning: You have {questions.length - answeredCount} unanswered questions which will be marked 0.
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="btn btn--secondary"
                disabled={isSubmitting}
              >
                Continue Quiz
              </button>
              <button
                type="button"
                onClick={handleManualSubmit}
                className="btn btn--success"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Finalize & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
