import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AdminLoginModal } from './components/AdminLoginModal';
import { LandingPage } from './pages/LandingPage';
import { RulesPage } from './pages/RulesPage';
import { ParticipantEntryPage } from './pages/ParticipantEntryPage';
import { ParticipantDashboardPage } from './pages/ParticipantDashboardPage';
import { QuizArenaPage } from './pages/QuizArenaPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { supabase } from './services/supabase';
import { supabaseAdminVerify } from './services/api';

const AUTHORIZED_ADMIN_EMAIL = 'preetsagal7@gmail.com';

export const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [participantUSN, setParticipantUSN] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    const savedUsn = localStorage.getItem('participant_usn');
    if (savedUsn) {
      setParticipantUSN(savedUsn);
    }

    const handleAdminSession = async (session: any) => {
      const userEmail = session?.user?.email;
      if (userEmail && userEmail.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
        try {
          const res = await supabaseAdminVerify(userEmail, session.access_token);
          localStorage.setItem('admin_token', res.access_token);
          localStorage.setItem('admin_id', res.admin_id);
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          navigate('/admin');
        } catch (err) {
          console.error('Failed to verify magic link session:', err);
        }
      }
    };

    // 1. Check if token is in URL hash directly (from magic link redirect)
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashToken = hashParams.get('access_token');
      if (hashToken) {
        supabaseAdminVerify(AUTHORIZED_ADMIN_EMAIL, hashToken)
          .then((res) => {
            localStorage.setItem('admin_token', res.access_token);
            localStorage.setItem('admin_id', res.admin_id);
            window.history.replaceState(null, '', '/admin');
            navigate('/admin');
          })
          .catch((err) => {
            console.error('Hash token verification failed:', err);
          });
      }
    }

    // 2. Check getSession on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleAdminSession(session);
      }
    });

    // 3. Listen for all auth state changes (INITIAL_SESSION, SIGNED_IN, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        handleAdminSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('participant_token');
    localStorage.removeItem('participant_usn');
    setParticipantUSN(null);
  };

  // Hide general Navbar and Footer on Quiz Exam mode and Admin dashboard
  const isExamMode = location.pathname.startsWith('/quiz/');
  const isAdminDashboard = location.pathname.startsWith('/admin');

  return (
    <div className="app-container">
      {!isExamMode && !isAdminDashboard && (
        <Navbar
          participantUSN={participantUSN}
          onLogout={handleLogout}
        />
      )}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route
          path="/entry"
          element={<ParticipantEntryPage onLoginSuccess={(usn) => setParticipantUSN(usn)} />}
        />
        <Route path="/dashboard" element={<ParticipantDashboardPage />} />
        <Route path="/quiz/:roundId" element={<QuizArenaPage />} />
        <Route path="/results" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>

      {!isExamMode && !isAdminDashboard && (
        <Footer onOpenAdminLogin={() => setIsAdminModalOpen(true)} />
      )}

      {/* Phase 5 — Unobtrusive Admin Login modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
};

export default App;
