import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Round, OptionKey } from '@choose-your-path/contracts';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function getOrCreateVoterId(): string {
  const key = 'choose-your-path-voter-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function formatCountdown(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return 'Voting closed';
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s remaining`;
}

export default function App(): React.ReactElement {
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState<OptionKey | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const voterId = useRef<string>(getOrCreateVoterId());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/current`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { round: Round };
      setRound(data.round);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void fetchCurrent();
    pollingRef.current = setInterval(() => { void fetchCurrent(); }, 1000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchCurrent]);

  useEffect(() => {
    if (!round) return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(round.closesAt));
    }, 1000);
    setCountdown(formatCountdown(round.closesAt));
    return () => clearInterval(interval);
  }, [round?.closesAt]);

  const handleVote = async (optionKey: OptionKey) => {
    if (!round || voted) return;
    setVoteError(null);
    try {
      const res = await fetch(`${API_BASE}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: voterId.current, optionKey }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setVoted(optionKey);
      void fetchCurrent();
    } catch (e) {
      setVoteError((e as Error).message);
    }
  };

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1>Choose Your Path</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  if (!round) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1>Choose Your Path</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Choose Your Path</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: 24 }}>{round.sceneText}</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => { void handleVote('A'); }}
          disabled={!!voted || round.status === 'CLOSED'}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '1rem',
            background: voted === 'A' ? '#4CAF50' : '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: voted || round.status === 'CLOSED' ? 'not-allowed' : 'pointer',
          }}
        >
          {round.optionA}
        </button>
        <button
          onClick={() => { void handleVote('B'); }}
          disabled={!!voted || round.status === 'CLOSED'}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '1rem',
            background: voted === 'B' ? '#4CAF50' : '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: voted || round.status === 'CLOSED' ? 'not-allowed' : 'pointer',
          }}
        >
          {round.optionB}
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>Votes:</strong> A: {round.votesA} | B: {round.votesB}
      </div>

      {round.status === 'CLOSED' && (
        <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginBottom: 16 }}>
          <strong>Round closed!</strong> Winner: Option {round.winnerKey}
        </div>
      )}

      {round.status === 'OPEN' && (
        <div style={{ color: '#666' }}>{countdown}</div>
      )}

      {voteError && <p style={{ color: 'red' }}>{voteError}</p>}
      {voted && <p style={{ color: '#4CAF50' }}>You voted for Option {voted}!</p>}
    </div>
  );
}
