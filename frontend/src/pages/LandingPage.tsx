import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Clock, Bell } from 'lucide-react';
import { getPublicEvent, getPublicAnnouncements, getPublicRounds } from '../services/api';
import { EventInfo, Announcement, Round } from '../types';
import { CyberCanvas } from '../components/CyberCanvas';
import { useStaggerReveal, useScrollReveal } from '../hooks/useScrollReveal';

export const LandingPage: React.FC = () => {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // Scroll reveal refs
  const roundsRef = useStaggerReveal('.round-card--interactive', { staggerMs: 100 });
  const scheduleRef = useScrollReveal({ threshold: 0.1 });
  const announcementsRef = useStaggerReveal('.card--sm', { staggerMs: 80 });
  const sectionTitleRef = useScrollReveal({ threshold: 0.2 });
  const scheduleTitleRef = useScrollReveal({ threshold: 0.2 });

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
          <div className="hero__orb hero__orb--4"></div>
          <div className="hero__ambient-glow"></div>
          <div className="hero__particle hero__particle--1"></div>
          <div className="hero__particle hero__particle--2"></div>
          <div className="hero__particle hero__particle--3"></div>
          <div className="hero__particle hero__particle--4"></div>
          <div className="hero__particle hero__particle--5"></div>
          <div className="hero__particle hero__particle--6"></div>
          <div className="hero__grid"></div>
          {/* Cybersecurity network canvas layer */}
          <CyberCanvas variant="nodes" nodeCount={32} />
        </div>

        <div className="hero__content">
          <div className="hero__text hero-text--animate">
            <div className="hero__badge hero-badge--animate">
              <span className="hero__badge-dot"></span>
              <span>Annual College Cybersecurity Challenge</span>
            </div>

            <h1 className="hero__title hero-title--animate">
              HACKTOBER <span className="hero__title-gradient">2026</span>
            </h1>

            <p className="hero__subtitle hero-subtitle--animate">
              Cybersecurity Quiz Challenge
            </p>

            <p className="hero__description hero-desc--animate">
              Organized by the <strong>Cyber Samurai Association</strong> of the{' '}
              <strong>Department of CSE – IoT and Cybersecurity including Blockchain Technology</strong> at{' '}
              <strong>Guru Nanak Dev Engineering College, Bidar, Karnataka</strong>.
            </p>

            <div className="hero__actions hero-actions--animate">
              <Link to="/entry" className="btn btn--primary btn--xl btn-cyber">
                <span>Enter Quiz</span>
                <ArrowRight size={20} />
              </Link>
              <Link to="/rules" className="btn btn--secondary btn--xl btn-cyber">
                <span>Official Rules</span>
              </Link>
            </div>
          </div>

          <div className="hero__visual">
            <div className="hero__logo-container">
              {/* Holographic aura ring behind the logo */}
              <div className="hero__holo-aura"></div>
              <div className="hero__holo-scan"></div>
              <div className="hero__logo-ring hero__logo-ring--1">
                <div className="hero__logo-ring-dot"></div>
              </div>
              <div className="hero__logo-ring hero__logo-ring--2"></div>
              {/* Extra orbit ring */}
              <div className="hero__logo-ring hero__logo-ring--3"></div>
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
            <div
              ref={announcementsRef as React.RefObject<HTMLDivElement>}
              className="reveal-stagger"
            >
              <div
                className="reveal-fade-up"
                data-reveal-item
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
              >
                <Bell size={20} color="var(--blue)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                  Live Announcements
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="card card--sm reveal-fade-up"
                    data-reveal-item
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
            </div>
          </section>
        )}

        {/* ─── Three Competition Rounds ─── */}
        <section style={{ margin: '60px 0' }}>
          <div
            ref={sectionTitleRef as React.RefObject<HTMLDivElement>}
            className="reveal-fade-up"
            style={{ textAlign: 'center', marginBottom: '36px' }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--electric)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Structured Tournament Format
            </div>
            <h2 className="section-heading-glow" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', marginTop: '4px' }}>
              Three Competitive Rounds
            </h2>
          </div>

          <div
            ref={roundsRef as React.RefObject<HTMLDivElement>}
            className="competition-rounds-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}
          >
            {/* Round 1 */}
            <div className="card round-card--interactive cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
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
              <div className="round-stats-grid" style={{ margin: '16px 0', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><strong>Time:</strong> 20 Mins</div>
                <div><strong>Questions:</strong> 25 MCQs</div>
                <div><strong>Max Score:</strong> 100 Pts</div>
                <div><strong>Qualify:</strong> Top 20</div>
              </div>
              <Link to="/entry" className="btn btn--primary btn--sm btn--full btn-cyber">
                Join Round 1
              </Link>
            </div>

            {/* Round 2 */}
            <div className="card round-card--interactive cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
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
              <div className="round-stats-grid" style={{ margin: '16px 0', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><strong>Time:</strong> 20 Mins</div>
                <div><strong>Questions:</strong> 15 MCQs</div>
                <div><strong>Max Score:</strong> 150 Pts</div>
                <div><strong>Qualify:</strong> Top 8 Finalists</div>
              </div>
              <Link to="/entry" className="btn btn--secondary btn--sm btn--full btn-cyber">
                Enter Portal
              </Link>
            </div>

            {/* Round 3 */}
            <div className="card round-card--interactive cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span className="badge badge--cyan">Round 3</span>
                <span className="badge badge--crimson">Grand Finale</span>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
                Cyber Masters Finale
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 }}>
                10 Advanced Scenario &amp; Incident Response questions evaluating blockchain security, smart contract vulnerabilities, and forensic analysis.
              </p>
              <div className="round-stats-grid" style={{ margin: '16px 0', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><strong>Time:</strong> 30 Mins</div>
                <div><strong>Questions:</strong> 10 Scenarios</div>
                <div><strong>Max Score:</strong> 200 Pts</div>
                <div><strong>Winner:</strong> 1st, 2nd, 3rd Rank</div>
              </div>
              <Link to="/entry" className="btn btn--secondary btn--sm btn--full btn-cyber">
                Enter Portal
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Schedule ─── */}
        <section style={{ margin: '60px 0' }} className="schedule-section">
          <div
            ref={scheduleTitleRef as React.RefObject<HTMLDivElement>}
            className="reveal-fade-up"
          >
            <div
              ref={scheduleRef as React.RefObject<HTMLDivElement>}
              className="card card--glass schedule-card-container reveal-fade-up"
              style={{ padding: '36px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Clock size={24} color="var(--blue)" />
                <h2 className="section-heading-glow" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                  Competition Event Schedule
                </h2>
              </div>

              <div className="schedule-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                {[
                  { time: '10 Mins', label: 'Check-in & Verification', sub: 'USN verification and login', color: 'var(--electric)' },
                  { time: '10 Mins', label: 'Welcome & Briefing', sub: 'Official rules review', color: 'var(--electric)' },
                  { time: '20 Mins', label: 'Round 1: Awareness', sub: '25 Questions • All participants', color: 'var(--emerald)' },
                  { time: '20 Mins', label: 'Round 2: Tech Challenge', sub: '15 Technical MCQs • Top 20', color: 'var(--amber)' },
                  { time: '30 Mins', label: 'Round 3: Grand Finale', sub: '10 Advanced Scenarios • Top 8', color: 'var(--violet)' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="schedule-item-card"
                    style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: 'var(--border-light)', animationDelay: `${i * 80}ms` }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: item.color }}>{item.time}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
