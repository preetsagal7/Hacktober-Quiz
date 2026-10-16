import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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

export const App: React.FC = () => {
  const location = useLocation();
  const [participantUSN, setParticipantUSN] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    const savedUsn = localStorage.getItem('participant_usn');
    if (savedUsn) {
      setParticipantUSN(savedUsn);
    }
  }, []);

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
