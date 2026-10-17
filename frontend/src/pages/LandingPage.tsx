import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Clock, Bell } from 'lucide-react';
import { getPublicEvent, getPublicAnnouncements, getPublicRounds } from '../services/api';
import { EventInfo, Announcement, Round } from '../types';

export const LandingPage: React.FC = () => {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventData, annData, roundsData] = await Promise.all([
          getPublicEvent().catch(() => null),
          getPublicAnnouncements().catch(() => []),
          getPublicRounds().catch(() => []),
        ]);
        if (eventData) setEvent(eventData);
        setAnnouncements(annData);
        setRounds(roundsData);
      } catch (err) {
        console.error('Failed to load public data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      {/* ─── Hero Section (Spatial White Theme) ─── */}
      <section className="hero">
        <div className="hero__bg-pattern">
          <div className="hero__orb hero__orb--1"></div>
          <div className="hero__orb hero__orb--2"></div>
          <div className="hero__orb hero__orb--3"></div>
          <div className="hero__grid"></div>
        </div>

        <div className="hero__content">
          <div className="hero__text">
            <div className="hero__badge">
              <span className="hero__badge-dot"></span>
              <span>Annual College Cybersecurity Challenge</span>
            </div>

            <h1 className="hero__title">
              HACKTOBER <span className="hero__title-gradient">2026</span>
            </h1>

            <p className="hero__subtitle">
              Cybersecurity Quiz Challenge
            </p>

            <p className="hero__description">
              Organized by the <strong>Cyber Samurai Association</strong> of the{' '}
              <strong>Department of CSE – IoT and Cybersecurity including Blockchain Technology</strong> at{' '}
              <strong>Guru Nanak Dev Engineering College, Bidar, Karnataka</strong>.
            </p>

            <div className="hero__actions">
              <Link to="/entry" className="btn btn--primary btn--xl">
                <span>Enter Quiz</span>
                <ArrowRight size={20} />
              </Link>
              <Link to="/rules" className="btn btn--secondary btn--xl">
                <span>Official Rules</span>
              </Link>
            </div>
          </div>

          <div className="hero__visual">
            <div className="hero__logo-container">
              <div className="hero__logo-ring hero__logo-ring--1">
                <div className="hero__logo-ring-dot"></div>
              </div>
              <div className="hero__logo-ring hero__logo-ring--2"></div>
              <img
                src="/logo.png"
                alt="Hacktober 2026 Logo"
                className="hero__logo-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content Container ─── */}
      <div className="page-wrapper page-wrapper--wide">
        {/* ─── Announcements Banner ─── */}
        {announcements.length > 0 && (
          <section style={{ margin: '40px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Bell size={20} color="var(--blue)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                Live Announcements
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="card card--sm"
                  style={{
                    borderLeft: ann.is_pinned ? '4px solid var(--electric)' : '1px solid var(--border-light)',
                    background: ann.is_pinned ? 'rgba(59,130,246,0.03)' : 'var(--bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {ann.title}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                    {ann.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Three Competition Rounds ─── */}
        <section style={{ margin: '60px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--electric)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Structured Tournament Format
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', marginTop: '4px' }}>
              Three Competitive Rounds
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Round 1 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span className="badge badge--blue">Round 1</span>
                <span className="badge badge--emerald">All Participants</span>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
                Cyber Awareness
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 }}>
                25 Multiple Choice Questions testing cybersecurity fundamentals, phishing prevention, authentication, password safety, and network basics.
              </p>
              <div style={{ margin: '16px 0', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><strong>Time:</strong> 20 Mins</div>
                <div><strong>Questions:</strong> 25 MCQs</div>
                <div><strong>Max Score:</strong> 100 Pts</div>
                <div><strong>Qualify:</strong> Top 20</div>
              </div>
              <Link to="/entry" className="btn btn--primary btn--sm btn--full">
                Join Round 1
              </Link>
            </div>

            {/* Round 2 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span className="badge badge--violet">Round 2</span>
                <span className="badge badge--amber">Top 20 Qualifiers</span>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
                Cyber Tech Challenge
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 }}>
                15 In-depth Technical Questions on OWASP Top 10 vulnerabilities, cryptography, Linux command-line security, CVEs, and ethical hacking.
              </p>
              <div style={{ margin: '16px 0', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><strong>Time:</strong> 20 Mins</div>
                <div><strong>Questions:</strong> 15 MCQs</div>
                <div><strong>Max Score:</strong> 150 Pts</div>
                <div><strong>Qualify:</strong> Top 8 Finalists</div>
              </div>
              <Link to="/entry" className="btn btn--secondary btn--sm btn--full">
                Enter Portal
              </Link>
            </div>

            {/* Round 3 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span className="badge badge--cyan">Round 3</span>
                <span className="badge badge--crimson">Grand Finale</span>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
                Cyber Masters Finale
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 }}>
                10 Advanced Scenario & Incident Response questions evaluating blockchain security, smart contract vulnerabilities, and forensic analysis.
              </p>
              <div style={{ margin: '16px 0', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><strong>Time:</strong> 30 Mins</div>
                <div><strong>Questions:</strong> 10 Scenarios</div>
                <div><strong>Max Score:</strong> 200 Pts</div>
                <div><strong>Winner:</strong> 1st, 2nd, 3rd Rank</div>
              </div>
              <Link to="/entry" className="btn btn--secondary btn--sm btn--full">
                Enter Portal
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Schedule (Phase 16) ─── */}
        <section style={{ margin: '60px 0' }}>
          <div className="card card--glass" style={{ padding: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <Clock size={24} color="var(--blue)" />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                Competition Event Schedule
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: 'var(--border-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--electric)' }}>10 Mins</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>Check-in & Verification</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>USN verification and login</div>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: 'var(--border-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--electric)' }}>10 Mins</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>Welcome & Briefing</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Official rules review</div>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: 'var(--border-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--emerald)' }}>20 Mins</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>Round 1: Awareness</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>25 Questions • All participants</div>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: 'var(--border-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--amber)' }}>20 Mins</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>Round 2: Tech Challenge</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>15 Technical MCQs • Top 20</div>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: 'var(--border-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet)' }}>30 Mins</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>Round 3: Grand Finale</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>10 Advanced Scenarios • Top 8</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
