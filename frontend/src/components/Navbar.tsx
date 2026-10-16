import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, LogOut, Award, BookOpen, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  participantUSN?: string | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ participantUSN, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('participant_token');
      localStorage.removeItem('participant_usn');
      navigate('/');
    }
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <img src="/logo.png" alt="GNDEC Bidar Logo" className="navbar__logo" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="navbar__title">HACKTOBER 2026</span>
            <span className="navbar__subtitle">Cybersecurity Quiz Challenge • GNDEC Bidar</span>
          </div>
        </Link>

        <nav className="navbar__nav">
          <Link to="/" className="navbar__link">Home</Link>
          <Link to="/rules" className="navbar__link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={15} /> Rules
          </Link>
          <Link to="/results" className="navbar__link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={15} /> Leaderboard
          </Link>

          {participantUSN ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
              <Link to="/dashboard" className="btn btn--secondary btn--sm">
                <LayoutDashboard size={15} />
                <span>{participantUSN}</span>
              </Link>
              <button onClick={handleLogout} className="btn btn--ghost btn--sm" title="Log Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/entry" className="btn btn--primary btn--sm" style={{ marginLeft: '6px' }}>
              <User size={15} />
              <span>Participant Login</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
