import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PlayCircle,
  HelpCircle,
  ShieldAlert,
  FileCheck,
  Megaphone,
  LogOut,
  Upload,
  Search,
  Check,
  X,
  Play,
  Pause,
  StopCircle,
  Award,
  Plus,
  Trash2,
  AlertCircle,
  Edit2,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import {
  getAdminDashboard,
  getAdminRounds,
  openRound,
  relaunchRound,
  resetRoundAttempts,
  closeRound,
  pauseRound,
  publishRoundResults,
  getAdminParticipants,
  importParticipantsCSV,
  updateParticipantEligibility,
  deleteParticipant,
  getAdminQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAdminViolations,
  clearViolations,
  resetTestData,
  getAdminAppeals,
  respondAppeal,
  createAnnouncement,
  adminLogout,
} from '../services/api';
import { supabase } from '../services/supabase';
import {
  DashboardStats,
  Round,
  Participant,
  AdminQuestion,
  Appeal,
} from '../types';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'rounds' | 'participants' | 'questions' | 'violations' | 'appeals' | 'announcements'
  >('overview');

  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // Participants Tab State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [partSearch, setPartSearch] = useState('');
  const [partPage, setPartPage] = useState(1);
  const [partTotal, setPartTotal] = useState(0);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [partError, setPartError] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Questions Tab State
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [selectedRoundFilter, setSelectedRoundFilter] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [newQText, setNewQText] = useState('');
  const [newQRoundId, setNewQRoundId] = useState('');
  const [newQTopic, setNewQTopic] = useState('');
  const [newQPoints, setNewQPoints] = useState(4);
  const [newQOptions, setNewQOptions] = useState([
    { label: 'A', text: '', correct: true },
    { label: 'B', text: '', correct: false },
    { label: 'C', text: '', correct: false },
    { label: 'D', text: '', correct: false },
  ]);

  // Edit Question State
  const [editQText, setEditQText] = useState('');
  const [editQRoundId, setEditQRoundId] = useState('');
  const [editQTopic, setEditQTopic] = useState('');
  const [editQPoints, setEditQPoints] = useState(4);
  const [editQOptions, setEditQOptions] = useState([
    { label: 'A', text: '', correct: true },
    { label: 'B', text: '', correct: false },
    { label: 'C', text: '', correct: false },
    { label: 'D', text: '', correct: false },
  ]);

  // Violations & Appeals
  const [violations, setViolations] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [appealReply, setAppealReply] = useState<{ id: string; response: string }>({ id: '', response: '' });

  // Announcement
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annSuccess, setAnnSuccess] = useState<string | null>(null);

  const checkAuthAndLoad = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/');
      return;
    }

    try {
      const [sData, rData] = await Promise.all([
        getAdminDashboard(),
        getAdminRounds(),
      ]);
      setStats(sData);
      setRounds(rData);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const loadParticipants = async (page = partPage, search = partSearch) => {
    setLoadingParticipants(true);
    setPartError(null);
    try {
      const res = await getAdminParticipants(page, 25, search);
      setParticipants(res.items || []);
      setPartTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load participants', err);
      setPartError(err.response?.data?.detail || 'Failed to load participants from server.');
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Tab data loader
  useEffect(() => {
    if (activeTab === 'participants') {
      loadParticipants(partPage, partSearch);
    } else if (activeTab === 'questions') {
      getAdminQuestions(selectedRoundFilter || undefined).then((res) => {
        setQuestions(res);
      });
    } else if (activeTab === 'violations') {
      getAdminViolations().then((res) => setViolations(Array.isArray(res) ? res : (res as any).items ?? []));
    } else if (activeTab === 'appeals') {
      getAdminAppeals().then((res) => setAppeals(res));
    }
  }, [activeTab, partPage, partSearch, selectedRoundFilter]);

  const handleLogout = async () => {
    try {
      await adminLogout().catch(() => {});
    } catch {}
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {}
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_id');
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    navigate('/');
  };

  // Round actions
  const handleOpenRound = async (id: string, isRelaunch = false) => {
    try {
      if (isRelaunch) {
        if (!confirm('Relaunch this round? This will reopen the round and reset participant attempts so students can retake it.')) {
          return;
        }
        await relaunchRound(id, true);
        alert('Round relaunched successfully!');
      } else {
        await openRound(id, false);
      }
      checkAuthAndLoad();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to launch round.');
    }
  };

  const handleResetRoundAttempts = async (id: string) => {
    if (!confirm('Reset all participant attempts for this round? Students will be able to start the quiz again.')) {
      return;
    }
    try {
      const res = await resetRoundAttempts(id);
      alert(res.message);
      checkAuthAndLoad();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset attempts.');
    }
  };

  const handlePauseRound = async (id: string) => {
    try {
      await pauseRound(id);
      checkAuthAndLoad();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to pause round.');
    }
  };

  const handleCloseRound = async (id: string) => {
    if (confirm('Are you sure you want to close this round? Active timers will be finalized.')) {
      try {
        await closeRound(id);
        checkAuthAndLoad();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to close round.');
      }
    }
  };

  const handlePublishResults = async (id: string) => {
    if (confirm('Publish official results and leaderboard for this round? This will compute qualifications and release rankings.')) {
      try {
        const res = await publishRoundResults(id);
        alert(res.message || 'Results have been published and are now visible on the public leaderboard.');
        checkAuthAndLoad();
        getAdminRounds().then(setRounds);
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to publish results.');
      }
    }
  };

  const handleResetOverviewData = async () => {
    if (confirm('Reset entire tournament data? All participants, attempts, answers, violations, and appeals will be cleared to 0 and rounds reset to PENDING.')) {
      try {
        const res = await resetTestData();
        alert(res.message);
        setParticipants([]);
        setPartTotal(0);
        setViolations([]);
        setAppeals([]);
        checkAuthAndLoad();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to reset data.');
      }
    }
  };

  const handleClearViolationsLog = async () => {
    if (confirm('Clear all live proctoring violations?')) {
      try {
        await clearViolations();
        setViolations([]);
        alert('Violation logs cleared.');
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to clear logs.');
      }
    }
  };

  // CSV Import
  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    try {
      const res = await importParticipantsCSV(csvFile);
      setImportResult(`Import successful: ${res.imported} imported, ${res.updated} updated.`);
      setCsvFile(null);
      getAdminParticipants(1, 25).then((r) => {
        setParticipants(r.items);
        setPartTotal(r.total);
      });
      getAdminDashboard().then(setStats);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'CSV Import failed. Check CSV format.');
    }
  };

  // Toggle Eligibility (Revoke / Restore Access)
  const handleToggleEligibility = async (p: Participant) => {
    const nextStatus = !p.is_eligible;
    const action = nextStatus ? 'Restore' : 'Revoke';
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} examination access for USN: ${p.usn}?`)) return;
    const reason = nextStatus ? 'Re-enabled by admin' : 'Access revoked by committee';
    try {
      await updateParticipantEligibility(p.id, nextStatus, reason);
      setParticipants(
        participants.map((item) => (item.id === p.id ? { ...item, is_eligible: nextStatus } : item))
      );
      getAdminDashboard().then(setStats);
      alert(`Access has been ${nextStatus ? 'restored' : 'revoked'} for USN ${p.usn}.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update participant eligibility.');
    }
  };

  // Delete Participant
  const handleDeleteParticipant = async (p: Participant) => {
    if (!confirm(`Are you sure you want to permanently delete participant ${p.usn} (${p.name || 'Student'}) and all their quiz data?`)) return;
    try {
      await deleteParticipant(p.id);
      setParticipants(participants.filter((item) => item.id !== p.id));
      setPartTotal((prev) => Math.max(0, prev - 1));
      getAdminDashboard().then(setStats);
      alert(`Participant ${p.usn} deleted successfully.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete participant.');
    }
  };

  // Start Editing a Question
  const startEditingQuestion = (q: AdminQuestion) => {
    setEditingQuestion(q);
    setEditQText(q.question_text);
    setEditQRoundId(q.round_id || rounds[0]?.id || '');
    setEditQTopic(q.topic || '');
    setEditQPoints(q.point_value || 4);
    if (q.options && q.options.length > 0) {
      setEditQOptions(
        q.options.map((o) => ({
          label: o.option_label,
          text: o.option_text,
          correct: Boolean(o.is_correct),
        }))
      );
    } else {
      setEditQOptions([
        { label: 'A', text: '', correct: true },
        { label: 'B', text: '', correct: false },
        { label: 'C', text: '', correct: false },
        { label: 'D', text: '', correct: false },
      ]);
    }
  };

  // Save Edited Question
  const handleSaveEditedQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      const updated = await updateQuestion(editingQuestion.id, {
        round_id: editQRoundId,
        question_text: editQText,
        topic: editQTopic || 'General Security',
        point_value: editQPoints,
        options: editQOptions.map((o, idx) => ({
          option_label: o.label,
          option_text: o.text,
          is_correct: o.correct,
          display_order: idx,
        })),
      });
      setQuestions(questions.map((q) => (q.id === editingQuestion.id ? updated : q)));
      setEditingQuestion(null);
      alert('Question updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update question.');
    }
  };

  // Add Question
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRound = newQRoundId || selectedRoundFilter || rounds[0]?.id;
    if (!targetRound) {
      alert('Please select a target round first.');
      return;
    }
    try {
      await createQuestion({
        round_id: targetRound,
        question_text: newQText,
        topic: newQTopic || 'General Security',
        point_value: newQPoints,
        options: newQOptions.map((o, idx) => ({
          option_label: o.label,
          option_text: o.text,
          is_correct: o.correct,
          display_order: idx,
        })),
      });
      setShowAddQuestion(false);
      setNewQText('');
      getAdminQuestions(selectedRoundFilter || undefined).then((res) => setQuestions(res));
      alert('Question added successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add question.');
    }
  };

  // Post Announcement
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAnnouncement(annTitle, annBody, true);
      setAnnSuccess('Announcement published to public landing page!');
      setAnnTitle('');
      setAnnBody('');
    } catch (err: any) {
      alert('Failed to publish announcement.');
    }
  };

  // Respond to Appeal
  const handleRespondAppeal = async (appealId: string, status: 'resolved' | 'rejected') => {
    const responseText = appealReply.response.trim();
    if (!responseText) {
      alert('Please enter a response message.');
      return;
    }
    try {
      await respondAppeal(appealId, status, responseText);
      setAppeals(
        appeals.map((a) =>
          a.id === appealId ? { ...a, status, admin_response: responseText } : a
        )
      );
      setAppealReply({ id: '', response: '' });
      alert(`Appeal marked as ${status}.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update appeal status.');
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
    <div className="admin-layout">
      {/* ─── Sidebar ─── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '28px', height: '28px' }} />
            <div>
              <div className="admin-sidebar__title">Hacktober 2026</div>
              <div className="admin-sidebar__subtitle">Control Center</div>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav__label">Main</div>
          <button
            onClick={() => setActiveTab('overview')}
            className={`admin-nav__item ${activeTab === 'overview' ? 'admin-nav__item--active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('rounds')}
            className={`admin-nav__item ${activeTab === 'rounds' ? 'admin-nav__item--active' : ''}`}
          >
            <PlayCircle size={18} />
            <span>Round Control</span>
          </button>

          <div className="admin-nav__label">Competition</div>
          <button
            onClick={() => setActiveTab('participants')}
            className={`admin-nav__item ${activeTab === 'participants' ? 'admin-nav__item--active' : ''}`}
          >
            <Users size={18} />
            <span>Participants</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`admin-nav__item ${activeTab === 'questions' ? 'admin-nav__item--active' : ''}`}
          >
            <HelpCircle size={18} />
            <span>Question Bank</span>
          </button>

          <button
            onClick={() => setActiveTab('violations')}
            className={`admin-nav__item ${activeTab === 'violations' ? 'admin-nav__item--active' : ''}`}
          >
            <ShieldAlert size={18} />
            <span>Violations Log</span>
          </button>

          <button
            onClick={() => setActiveTab('appeals')}
            className={`admin-nav__item ${activeTab === 'appeals' ? 'admin-nav__item--active' : ''}`}
          >
            <FileCheck size={18} />
            <span>Appeals Review</span>
          </button>

          <div className="admin-nav__label">System</div>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`admin-nav__item ${activeTab === 'announcements' ? 'admin-nav__item--active' : ''}`}
          >
            <Megaphone size={18} />
            <span>Announcements</span>
          </button>

          <div className="admin-nav__separator"></div>

          <button onClick={handleLogout} className="admin-nav__item" style={{ color: 'var(--crimson)' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      {/* ─── Content ─── */}
      <main className="admin-content">
        {/* ─── TAB: OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                Tournament Overview & Health
              </h1>
              <button
                onClick={handleResetOverviewData}
                className="btn btn--secondary btn--sm"
                title="Clears test attempts/violations and resets rounds to PENDING"
              >
                <RotateCcw size={15} />
                <span>Reset Live Counters</span>
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card__label">Eligible Participants</div>
                <div className="stat-card__value">{stats?.total_eligible_participants ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Active Exam Attempts</div>
                <div className="stat-card__value" style={{ color: 'var(--blue)' }}>
                  {stats?.active_attempts ?? 0}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Submitted Attempts</div>
                <div className="stat-card__value" style={{ color: 'var(--emerald)' }}>
                  {stats?.submitted_attempts ?? 0}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Terminated Violations</div>
                <div className="stat-card__value" style={{ color: 'var(--crimson)' }}>
                  {stats?.terminated_attempts ?? 0}
                </div>
              </div>
            </div>

            {/* Rounds status overview */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '16px' }}>
              Rounds State
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {rounds.map((r) => (
                <div key={r.id} className="card card--sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge--blue">Round {r.round_number}</span>
                    <span
                      className={`badge ${
                        r.status === 'open'
                          ? 'badge--emerald'
                          : r.status === 'paused'
                          ? 'badge--amber'
                          : 'badge--default'
                      }`}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--navy)' }}>{r.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {r.question_count} Questions • {r.duration_minutes} Mins • Policy: {r.violation_policy}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: ROUNDS CONTROL ─── */}
        {activeTab === 'rounds' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '24px' }}>
              Round Lifecycle & Controls
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {rounds.map((r) => (
                <div key={r.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="badge badge--blue">Round {r.round_number}</span>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                          {r.name}
                        </h3>
                        <span
                          className={`badge ${
                            r.status === 'open'
                              ? 'badge--emerald'
                              : r.status === 'paused'
                              ? 'badge--amber'
                              : 'badge--default'
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        Duration: <strong>{r.duration_minutes}m</strong> | Questions: <strong>{r.question_count}</strong> | Correct: <strong>+{r.points_correct}</strong> | Policy: <strong>{r.violation_policy}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(r.status === 'closed' || r.status === 'results_published') && (
                        <>
                          <button onClick={() => handleOpenRound(r.id, true)} className="btn btn--success btn--sm">
                            <RotateCcw size={15} />
                            <span>Relaunch Round</span>
                          </button>
                          <button onClick={() => handleResetRoundAttempts(r.id)} className="btn btn--secondary btn--sm">
                            <RefreshCw size={14} />
                            <span>Reset Attempts</span>
                          </button>
                        </>
                      )}
                      {(r.status === 'pending' || r.status === 'paused') && (
                        <button onClick={() => handleOpenRound(r.id, false)} className="btn btn--success btn--sm">
                          <Play size={15} />
                          <span>{r.status === 'paused' ? 'Resume Round' : 'Launch Round'}</span>
                        </button>
                      )}
                      {r.status === 'open' && (
                        <>
                          <button onClick={() => handlePauseRound(r.id)} className="btn btn--secondary btn--sm">
                            <Pause size={15} />
                            <span>Pause</span>
                          </button>
                          <button onClick={() => handleCloseRound(r.id)} className="btn btn--danger btn--sm">
                            <StopCircle size={15} />
                            <span>Close Round</span>
                          </button>
                        </>
                      )}
                      <button onClick={() => handlePublishResults(r.id)} className="btn btn--primary btn--sm">
                        <Award size={15} />
                        <span>Publish Results</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: PARTICIPANTS ─── */}
        {activeTab === 'participants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                  Participant Management
                </h1>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Total enrolled: {partTotal} students (Uncapped capacity)
                </div>
              </div>

              {/* Bulk CSV Upload (Phase 2) */}
              <form onSubmit={handleCSVUpload} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn--secondary btn--sm" disabled={!csvFile}>
                  <Upload size={14} />
                  <span>Import CSV</span>
                </button>
              </form>
            </div>

            {importResult && (
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(5,150,105,0.08)',
                  borderRadius: '8px',
                  color: 'var(--emerald)',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                {importResult}
              </div>
            )}

            {partError && (
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(220,38,38,0.08)',
                  borderRadius: '8px',
                  color: 'var(--crimson)',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{partError}</span>
              </div>
            )}

            <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search participants by USN..."
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value.toUpperCase())}
                style={{ maxWidth: '360px' }}
              />
              <button
                onClick={() => loadParticipants(1, partSearch)}
                className="btn btn--secondary btn--sm"
                disabled={loadingParticipants}
                title="Refresh participants list"
              >
                <RefreshCw size={14} className={loadingParticipants ? 'spin' : ''} />
                <span>{loadingParticipants ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>USN</th>
                    <th>Name</th>
                    <th>Department & College</th>
                    <th>Marks / Score</th>
                    <th>Eligibility</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.usn}</td>
                      <td>{p.name || 'Registered Student'}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.department || 'Not specified'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.college_name || 'Guru Nanak Dev Engineering College'}
                        </div>
                      </td>
                      <td>
                        {p.scores && p.scores.length > 0 ? (
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.95rem' }}>
                              {p.total_score ?? 0} Pts
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {p.scores.map((sc) => (
                                <span
                                  key={sc.round_id}
                                  className="badge badge--blue"
                                  style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                  title={`Round ${sc.round_number}: ${sc.correct_count} correct, ${sc.incorrect_count} incorrect (${sc.status})`}
                                >
                                  R{sc.round_number}: {sc.score} pts
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            No exam taken
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${p.is_eligible ? 'badge--emerald' : 'badge--crimson'}`}>
                          {p.is_eligible ? 'Eligible' : 'Ineligible'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleToggleEligibility(p)}
                            className={`btn btn--xs ${p.is_eligible ? 'btn--danger' : 'btn--success'}`}
                            title={p.is_eligible ? 'Revoke participant examination access' : 'Restore participant examination access'}
                          >
                            {p.is_eligible ? 'Revoke Access' : 'Restore Access'}
                          </button>
                          <button
                            onClick={() => handleDeleteParticipant(p)}
                            className="btn btn--ghost btn--xs"
                            style={{ color: 'var(--crimson)' }}
                            title="Permanently remove participant"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {loadingParticipants ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        <RefreshCw size={18} className="spin" style={{ display: 'inline', marginRight: '8px' }} />
                        Loading participants from server...
                      </td>
                    </tr>
                  ) : participants.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No participants registered yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: QUESTIONS ─── */}
        {activeTab === 'questions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                Question Bank
              </h1>

              <div style={{ display: 'flex', gap: '12px' }}>
                <select
                  className="form-input"
                  style={{ width: '220px' }}
                  value={selectedRoundFilter}
                  onChange={(e) => setSelectedRoundFilter(e.target.value)}
                >
                  <option value="">All Rounds</option>
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      Round {r.round_number}: {r.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAddQuestion(!showAddQuestion)}
                  className="btn btn--primary btn--sm"
                >
                  <Plus size={15} />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Add Question Form */}
            {showAddQuestion && (
              <div className="card" style={{ padding: '24px', marginBottom: '24px', borderColor: 'var(--blue)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '14px' }}>
                  Create New Question
                </h3>
                <form onSubmit={handleCreateQuestion}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Round</label>
                      <select
                        className="form-input"
                        value={newQRoundId || selectedRoundFilter || rounds[0]?.id || ''}
                        onChange={(e) => setNewQRoundId(e.target.value)}
                        required
                      >
                        {rounds.map((r) => (
                          <option key={r.id} value={r.id}>
                            Round {r.round_number}: {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Topic</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Cryptography"
                        value={newQTopic}
                        onChange={(e) => setNewQTopic(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Question Text</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={newQText}
                      onChange={(e) => setNewQText(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: '200px' }}>
                    <label className="form-label">Points</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newQPoints}
                      onChange={(e) => setNewQPoints(Number(e.target.value))}
                    />
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <label className="form-label">Options (Mark correct answer)</label>
                    {newQOptions.map((opt, i) => (
                      <div key={opt.label} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, width: '20px' }}>{opt.label}</span>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={`Option ${opt.label} text`}
                          value={opt.text}
                          onChange={(e) => {
                            const updated = [...newQOptions];
                            updated[i].text = e.target.value;
                            setNewQOptions(updated);
                          }}
                          required
                        />
                        <input
                          type="radio"
                          name="correct-opt"
                          checked={opt.correct}
                          onChange={() => {
                            setNewQOptions(newQOptions.map((o, idx) => ({ ...o, correct: idx === i })));
                          }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Correct</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button type="button" onClick={() => setShowAddQuestion(false)} className="btn btn--secondary btn--sm">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn--primary btn--sm">
                      Save Question
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit Question Form */}
            {editingQuestion && (
              <div className="card" style={{ padding: '24px', marginBottom: '24px', borderColor: 'var(--emerald)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                    Edit Question #{editingQuestion.id.slice(0, 8)}
                  </h3>
                  <button type="button" onClick={() => setEditingQuestion(null)} className="btn btn--ghost btn--xs">
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleSaveEditedQuestion}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Round</label>
                      <select
                        className="form-input"
                        value={editQRoundId}
                        onChange={(e) => setEditQRoundId(e.target.value)}
                        required
                      >
                        {rounds.map((r) => (
                          <option key={r.id} value={r.id}>
                            Round {r.round_number}: {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Topic</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editQTopic}
                        onChange={(e) => setEditQTopic(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Question Text</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={editQText}
                      onChange={(e) => setEditQText(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: '200px' }}>
                    <label className="form-label">Points</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editQPoints}
                      onChange={(e) => setEditQPoints(Number(e.target.value))}
                    />
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <label className="form-label">Options (Mark correct answer)</label>
                    {editQOptions.map((opt, i) => (
                      <div key={opt.label} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, width: '20px' }}>{opt.label}</span>
                        <input
                          type="text"
                          className="form-input"
                          value={opt.text}
                          onChange={(e) => {
                            const updated = [...editQOptions];
                            updated[i].text = e.target.value;
                            setEditQOptions(updated);
                          }}
                          required
                        />
                        <input
                          type="radio"
                          name="edit-correct-opt"
                          checked={opt.correct}
                          onChange={() => {
                            setEditQOptions(editQOptions.map((o, idx) => ({ ...o, correct: idx === i })));
                          }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Correct</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button type="button" onClick={() => setEditingQuestion(null)} className="btn btn--secondary btn--sm">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn--primary btn--sm">
                      Update Question
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {questions.map((q, idx) => {
                const roundObj = rounds.find((r) => r.id === q.round_id);
                const roundLabel = q.round_name || (roundObj ? `Round ${roundObj.round_number}` : 'Round 1');
                return (
                  <div key={q.id} className="card card--sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <span className="badge badge--emerald" style={{ marginRight: '8px' }}>
                          {roundLabel}
                        </span>
                        <span className="badge badge--blue" style={{ marginRight: '8px' }}>
                          {q.topic || 'General'}
                        </span>
                        <span className="badge badge--default">+{q.point_value} pts</span>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy)', marginTop: '8px' }}>
                          {idx + 1}. {q.question_text}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => startEditingQuestion(q)}
                          className="btn btn--secondary btn--xs"
                          title="Edit this question"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this question?')) {
                              await deleteQuestion(q.id);
                              setQuestions(questions.filter((item) => item.id !== q.id));
                            }
                          }}
                          className="btn btn--ghost btn--xs"
                          style={{ color: 'var(--crimson)' }}
                          title="Delete question"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px' }}>
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          style={{
                            fontSize: '0.85rem',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: opt.is_correct ? 'rgba(5,150,105,0.08)' : 'var(--bg-surface)',
                            border: opt.is_correct ? '1px solid var(--emerald)' : 'var(--border-light)',
                            color: opt.is_correct ? 'var(--emerald)' : 'var(--text-secondary)',
                            fontWeight: opt.is_correct ? 600 : 400,
                          }}
                        >
                          <strong>{opt.option_label}:</strong> {opt.option_text} {opt.is_correct && '✓'}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {questions.length === 0 && (
                <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No questions found in this view. Select another round or add a question.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: VIOLATIONS LOG ─── */}
        {activeTab === 'violations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                Live Proctoring Violations Log
              </h1>
              {violations.length > 0 && (
                <button onClick={handleClearViolationsLog} className="btn btn--secondary btn--sm">
                  <Trash2 size={14} />
                  <span>Clear Logs</span>
                </button>
              )}
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Participant USN</th>
                    <th>Violation Event</th>
                    <th>Strict Termination</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v) => {
                    const timeStr = v.received_at_server || v.received_at;
                    const dateFormatted = timeStr ? new Date(timeStr).toLocaleString() : 'Just now';
                    const usnVal = v.participant_usn || v.usn || 'N/A';
                    const isTerm = Boolean(v.resulted_in_termination ?? v.terminated);
                    return (
                      <tr key={v.id}>
                        <td>{dateFormatted}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{usnVal}</td>
                        <td>
                          <span className="badge badge--crimson">{v.violation_type}</span>
                        </td>
                        <td>
                          {isTerm ? (
                            <span style={{ color: 'var(--crimson)', fontWeight: 700 }}>TERMINATED</span>
                          ) : (
                            <span style={{ color: 'var(--amber)' }}>Warning Recorded</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {violations.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No violations recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: APPEALS ─── */}
        {activeTab === 'appeals' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '24px' }}>
              Participant Appeals & Dispute Review
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {appeals.map((a) => (
                <div key={a.id} className="card card--sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1.05rem' }}>
                        {a.subject}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        From: <strong style={{ color: 'var(--blue)' }}>{a.name || 'Participant'}</strong> (USN: <span style={{ fontFamily: 'var(--font-mono)' }}>{a.usn || 'N/A'}</span>) • {a.created_at ? new Date(a.created_at).toLocaleString() : 'Recent'}
                      </div>
                    </div>
                    <span className={`badge ${a.status === 'resolved' ? 'badge--emerald' : a.status === 'rejected' ? 'badge--crimson' : 'badge--amber'}`}>
                      {a.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '10px', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '8px' }}>
                    {a.description}
                  </div>

                  {(a.status === 'pending' || a.status === 'submitted' || a.status === 'under_review') ? (
                    <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Write committee resolution response message..."
                        value={appealReply.id === a.id ? appealReply.response : ''}
                        onChange={(e) => setAppealReply({ id: a.id, response: e.target.value })}
                        style={{ marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleRespondAppeal(a.id, 'resolved')}
                          className="btn btn--success btn--xs"
                        >
                          Resolve & Accept
                        </button>
                        <button
                          onClick={() => handleRespondAppeal(a.id, 'rejected')}
                          className="btn btn--danger btn--xs"
                        >
                          Reject Appeal
                        </button>
                      </div>
                    </div>
                  ) : a.admin_response ? (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: 'rgba(59,130,246,0.06)',
                        borderLeft: '3px solid var(--blue)',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                      }}
                    >
                      <strong>Committee Response:</strong> {a.admin_response}
                    </div>
                  ) : null}
                </div>
              ))}
              {appeals.length === 0 && (
                <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No pending student appeals.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: ANNOUNCEMENTS ─── */}
        {activeTab === 'announcements' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '24px' }}>
              Publish Announcement
            </h1>

            {annSuccess && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(5,150,105,0.08)',
                  borderRadius: '8px',
                  color: 'var(--emerald)',
                  marginBottom: '20px',
                }}
              >
                {annSuccess}
              </div>
            )}

            <div className="card" style={{ maxWidth: '600px', padding: '28px' }}>
              <form onSubmit={handlePostAnnouncement}>
                <div className="form-group">
                  <label className="form-label">Headline / Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Round 1 is now open for all students!"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Announcement Details</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Provide details, timing, or urgent notices..."
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn--primary">
                  Publish to Landing Page
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
