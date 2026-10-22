import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  User,
  LogOut,
  Award,
  BookOpen,
  LayoutDashboard,
  Home,
  Menu,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  participantUSN?: string | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ participantUSN, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('participant_token');
      localStorage.removeItem('participant_usn');
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="navbar">
        <div className="navbar__inner">
          <Link to="/" className="navbar__brand" onClick={() => setMobileMenuOpen(false)}>
            <img src="/logo.png" alt="GNDEC Bidar Logo" className="navbar__logo" />
            <div className="navbar__brand-text">
              <span className="navbar__title">HACKTOBER 2026</span>
              <span className="navbar__subtitle">Cybersecurity Quiz Challenge • GNDEC Bidar</span>
            </div>
          </Link>

          {/* Desktop Navigation (Untouched for desktop screens) */}
          <nav className="navbar__nav">
            <Link
              to="/"
              className={`navbar__link ${isActive('/') ? 'navbar__link--active' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/rules"
              className={`navbar__link ${isActive('/rules') ? 'navbar__link--active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <BookOpen size={15} /> Rules
            </Link>
            <Link
              to="/results"
              className={`navbar__link ${isActive('/results') ? 'navbar__link--active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
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

          {/* Mobile Hamburger Toggle (Visible only on mobile <= 768px) */}
          <button
            type="button"
            className="navbar__mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`mobile-nav-backdrop ${mobileMenuOpen ? 'mobile-nav-backdrop--active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      />

      {/* Mobile Drawer Menu */}
      <aside
        className={`mobile-nav-drawer ${mobileMenuOpen ? 'mobile-nav-drawer--open' : ''}`}
        aria-label="Mobile Navigation"
      >
        <div className="mobile-nav-drawer__header">
          <div className="mobile-nav-drawer__brand">
            <img src="/logo.png" alt="GNDEC Logo" className="mobile-nav-drawer__logo" />
            <div>
              <div className="mobile-nav-drawer__title">HACKTOBER 2026</div>
              <div className="mobile-nav-drawer__subtitle">GNDEC Bidar • Cyber Challenge</div>
            </div>
          </div>
          <button
            type="button"
            className="mobile-nav-drawer__close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mobile-nav-drawer__body">
          {/* Participant Quick Status Banner */}
          {participantUSN ? (
            <div className="mobile-nav-user-card">
              <div className="mobile-nav-user-card__icon">
                <Shield size={20} />
              </div>
              <div className="mobile-nav-user-card__info">
                <span className="mobile-nav-user-card__label">Logged In Participant</span>
                <span className="mobile-nav-user-card__usn">{participantUSN}</span>
              </div>
            </div>
          ) : (
            <div className="mobile-nav-cta-card">
              <div className="mobile-nav-cta-card__badge">
                <Sparkles size={13} />
                <span>Student Challenge</span>
              </div>
              <p className="mobile-nav-cta-card__text">
                Enter with your USN to attempt competition rounds.
              </p>
              <Link
                to="/entry"
                className="btn btn--primary btn--sm btn--full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={16} />
                <span>Participant Login</span>
              </Link>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="mobile-nav-links">
            <Link
              to="/"
              className={`mobile-nav-link ${isActive('/') ? 'mobile-nav-link--active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="mobile-nav-link__icon">
                <Home size={19} />
              </div>
              <span className="mobile-nav-link__text">Home</span>
              <ArrowRight size={16} className="mobile-nav-link__arrow" />
            </Link>

            <Link
              to="/rules"
              className={`mobile-nav-link ${isActive('/rules') ? 'mobile-nav-link--active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="mobile-nav-link__icon">
                <BookOpen size={19} />
              </div>
              <span className="mobile-nav-link__text">Official Rules</span>
              <ArrowRight size={16} className="mobile-nav-link__arrow" />
            </Link>

            <Link
              to="/results"
              className={`mobile-nav-link ${isActive('/results') ? 'mobile-nav-link--active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="mobile-nav-link__icon">
                <Award size={19} />
              </div>
              <span className="mobile-nav-link__text">Leaderboard & Results</span>
              <ArrowRight size={16} className="mobile-nav-link__arrow" />
            </Link>

            {participantUSN && (
              <Link
                to="/dashboard"
                className={`mobile-nav-link ${isActive('/dashboard') ? 'mobile-nav-link--active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="mobile-nav-link__icon">
                  <LayoutDashboard size={19} />
                </div>
                <span className="mobile-nav-link__text">My Quiz Arena & Dashboard</span>
                <ArrowRight size={16} className="mobile-nav-link__arrow" />
              </Link>
            )}
          </nav>
        </div>

        {/* Drawer Footer */}
        <div className="mobile-nav-drawer__footer">
          {participantUSN ? (
            <button
              onClick={handleLogout}
              className="btn btn--secondary btn--full mobile-logout-btn"
            >
              <LogOut size={16} />
              <span>Sign Out ({participantUSN})</span>
            </button>
          ) : (
            <Link
              to="/entry"
              className="btn btn--primary btn--full"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Enter Competition</span>
              <ArrowRight size={16} />
            </Link>
          )}

          <div className="mobile-nav-drawer__credits">
            Dept. of CSE (IoT & Cybersecurity) • GNDEC Bidar
          </div>
        </div>
      </aside>
    </>
  );
};

