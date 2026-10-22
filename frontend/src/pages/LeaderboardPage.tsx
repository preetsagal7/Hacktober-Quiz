import React, { useEffect, useState } from 'react';
import { Award, Trophy, Medal, AlertCircle, Clock } from 'lucide-react';
import { getPublicRounds, getPublicLeaderboard } from '../services/api';
import { Round, RoundLeaderboard } from '../types';

export const LeaderboardPage: React.FC = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<RoundLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicRounds()
      .then((rList) => {
        setRounds(rList);
        if (rList.length > 0) {
          setSelectedRoundId(rList[0].id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRoundId) return;
    setLoading(true);
    setError(null);
    getPublicLeaderboard(selectedRoundId)
      .then((data) => setLeaderboard(data))
      .catch((err) => {
        setLeaderboard(null);
        setError(err.response?.data?.detail || 'Results for this round have not been published yet.');
      })
      .finally(() => setLoading(false));
  }, [selectedRoundId]);

  return (
    <div className="page-wrapper page-wrapper--wide">
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
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
          <Trophy size={30} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)' }}>
          Competition Leaderboard & Results
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Hacktober 2026 • Official Standing • Guru Nanak Dev Engineering College, Bidar
        </p>
      </div>

      {/* ─── Round Selector Tabs ─── */}
      <div className="leaderboard-round-tabs">
        {rounds.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoundId(r.id)}
            className={`btn ${selectedRoundId === r.id ? 'btn--primary' : 'btn--secondary'}`}
          >
            <span>Round {r.round_number}: {r.name.split('—')[1] || r.name}</span>
          </button>
        ))}
      </div>

      {/* ─── Table Content ─── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div
          className="card"
          style={{
            padding: '40px',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '0 auto',
            borderColor: 'var(--border-light)',
          }}
        >
          <Clock size={40} color="var(--amber)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
            Results Pending Publication
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {error}
          </p>
        </div>
      ) : leaderboard && leaderboard.entries.length > 0 ? (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Participant USN</th>
                <th>Name</th>
                <th>Questions Solved</th>
                <th>Total Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.entries.map((entry) => (
                <tr key={entry.participant_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {entry.rank === 1 ? (
                        <Medal size={20} color="#eab308" />
                      ) : entry.rank === 2 ? (
                        <Medal size={20} color="#94a3b8" />
                      ) : entry.rank === 3 ? (
                        <Medal size={20} color="#d97706" />
                      ) : null}
                      <span style={{ fontWeight: 700 }}>#{entry.rank}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{entry.usn}</td>
                  <td>{entry.name || 'Student Participant'}</td>
                  <td>{entry.correct_count} correct</td>
                  <td style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '1rem' }}>
                    {entry.score} pts
                  </td>
                  <td>
                    {entry.is_qualified ? (
                      <span className="badge badge--emerald">Qualified</span>
                    ) : (
                      <span className="badge badge--default">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          No entries found for this round yet.
        </div>
      )}
    </div>
  );
};
