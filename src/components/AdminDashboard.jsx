import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;

async function adminFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

export default function AdminDashboard() {
  const { user } = useWorld();
  const [tabs, setTabs] = useState('overview');
  const [data, setData] = useState({
    gameState: null,
    rounds: [],
    users: [],
    flags: [],
    stats: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newRound, setNewRound] = useState({
    day: 1,
    name: '',
    prompt: '',
    place_type: '',
    lat: '',
    lng: '',
    radius_m: 100,
    survival_cap: 25,
    opens_at: '',
    closes_at: '',
    status: 'scheduled',
  });
  const [submittingRound, setSubmittingRound] = useState(false);

  const isAdmin = user?.address && ADMIN_TOKEN;

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [gameState, rounds, users, flags, stats] = await Promise.all([
        adminFetch('/api/game/state'),
        adminFetch('/api/admin/rounds'),
        adminFetch('/api/cohort/roster'),
        adminFetch('/api/admin/flags'),
        adminFetch('/api/stats'),
      ]);
      setData({ gameState, rounds: rounds.rounds || [], users: users.roster || [], flags: flags.flags || [], stats });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRound = async (e) => {
    e.preventDefault();
    setSubmittingRound(true);
    try {
      const payload = {
        day: Number(newRound.day),
        name: newRound.name,
        prompt: newRound.prompt,
        place_type: newRound.place_type || newRound.name,
        lat: newRound.lat ? Number(newRound.lat) : null,
        lng: newRound.lng ? Number(newRound.lng) : null,
        radius_m: Number(newRound.radius_m),
        survival_cap: Number(newRound.survival_cap),
        opens_at: newRound.opens_at,
        closes_at: newRound.closes_at,
        status: newRound.status,
      };
      const res = await adminFetch('/api/admin/round', { method: 'POST', body: JSON.stringify(payload) });
      if (res.ok) {
        setNewRound({ ...newRound, day: newRound.day + 1, name: '', prompt: '', place_type: '', lat: '', lng: '', opens_at: '', closes_at: '' });
        loadAll();
      } else {
        setError(res.error || 'Failed to create round');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmittingRound(false);
    }
  };

  const handleCloseDay = async (day) => {
    if (!confirm(`Close day ${day}? This will eliminate non-survivors.`)) return;
    try {
      const res = await adminFetch('/api/admin/close-day', { method: 'POST', body: JSON.stringify({ day }) });
      if (res.ok) loadAll();
      else setError(res.error || 'Failed to close day');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleTriggerRounds = async () => {
    try {
      const res = await adminFetch('/api/admin/trigger-rounds', { method: 'POST' });
      if (res.ok) loadAll();
      else setError(res.error || 'Failed to trigger rounds');
    } catch (e) {
      setError(e.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-ash flex flex-col items-center justify-center px-5 py-10 font-body">
        <div className="text-center">
          <p className="font-display text-4xl text-bone mb-4">🔒 Admin Only</p>
          <p className="text-dim font-mono text-sm">Set VITE_ADMIN_TOKEN in your environment to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      <div className="px-5 pt-8 pb-4 border-b border-ember">
        <h1 className="font-display text-3xl text-bone tracking-wide">ADMIN DASHBOARD</h1>
        <p className="text-dim font-mono text-xs mt-1">Manage rounds, view players, monitor anti-cheat flags</p>
      </div>

      {error && (
        <div className="mx-5 mt-4 bg-blood/10 border border-blood/30 rounded-xl p-3 text-blood text-xs font-mono">
          {error}
        </div>
      )}

      <div className="px-5 py-4 border-b border-ember flex gap-2 overflow-x-auto">
        {['overview', 'rounds', 'players', 'flags', 'actions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setTabs(tab)}
            className={`px-4 py-2 rounded-xl font-mono text-sm whitespace-nowrap ${tabs === tab ? 'bg-blood text-bone' : 'bg-smoke border border-ember text-dim'}`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

       <div className="flex-1 overflow-auto px-5 py-4">
         {loading ? (
           <div className="text-center py-12 text-dim font-mono">Loading…</div>
         ) : tabs === 'overview' ? (
           <OverviewPanel data={data} />
         ) : tabs === 'rounds' ? (
           <RoundsPanel data={data} newRound={newRound} setNewRound={setNewRound} onSubmit={handleCreateRound} submitting={submittingRound} />
         ) : tabs === 'players' ? (
           <PlayersPanel users={data.users} />
         ) : tabs === 'flags' ? (
           <FlagsPanel flags={data.flags} />
         ) : tabs === 'actions' ? (
           <ActionsPanel gameState={data.gameState} onCloseDay={handleCloseDay} onTriggerRounds={handleTriggerRounds} />
         ) : null}
       </div>
    </div>
  );
}

function OverviewPanel({ data }) {
  const { gameState, stats, users, flags } = data;
  const totalPlayers = users.length;
  const activePlayers = users.filter(u => !u.eliminated).length;
  const verifiedPlayers = users.filter(u => u.world_id_verified || u.humanity_nullifier).length;
  const eliminatedPlayers = users.filter(u => u.eliminated).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Phase" value={gameState?.phase ?? '—'} />
        <StatCard label="Current Day" value={gameState?.currentDay ?? '—'} />
        <StatCard label="Prize Pool" value={stats?.prizePool?.balanceWld ? `${stats.prizePool.balanceWld.toFixed(2)} WLD` : '—'} />
        <StatCard label="Cohort Fill" value={gameState?.reservedCount ? `${gameState.reservedCount}/${gameState.cohortSize}` : '—'} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Players" value={totalPlayers} />
        <StatCard label="Active" value={activePlayers} className="text-neon" />
        <StatCard label="Eliminated" value={eliminatedPlayers} className="text-blood" />
        <StatCard label="Verified Humans" value={verifiedPlayers} className="text-amber" />
      </div>
      <div className="bg-smoke border border-ember rounded-2xl p-4">
        <h3 className="font-display text-lg text-bone mb-3">Anti-Cheat Flags (Recent)</h3>
        {flags.length === 0 ? (
          <p className="text-dim font-mono text-sm">No flags</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {flags.slice(0, 10).map((f) => (
              <div key={f.id} className="bg-ash rounded-xl p-3 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-blood">{f.reason}</span>
                  <span className="text-dim">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                <div className="text-dim mt-1">Submission: {f.submission_id}</div>
                {f.metadata && <pre className="text-[10px] mt-2 overflow-auto">{JSON.stringify(f.metadata, null, 2)}</pre>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, className = '' }) {
  return (
    <div className="bg-smoke border border-ember rounded-2xl p-4">
      <p className="text-dim text-xs font-mono uppercase tracking-wide">{label}</p>
      <p className={`font-display text-2xl text-bone mt-1 ${className}`}>{value}</p>
    </div>
  );
}

function RoundsPanel({ data, newRound, setNewRound, onSubmit, submitting }) {
  const { rounds } = data;
  return (
    <div className="space-y-4">
      <div className="bg-smoke border border-ember rounded-2xl p-4">
        <h3 className="font-display text-lg text-bone mb-4">Create / Schedule Round</h3>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Day" type="number" value={newRound.day} onChange={e => setNewRound({...newRound, day: e.target.value})} min={1} required />
            <Input label="Name (Theme)" value={newRound.name} onChange={e => setNewRound({...newRound, name: e.target.value})} placeholder="AT A CAFÉ" required />
          </div>
          <Input label="Prompt" value={newRound.prompt} onChange={e => setNewRound({...newRound, prompt: e.target.value})} placeholder="Show us your café — anywhere in the world" />
          <Input label="Place Type" value={newRound.place_type} onChange={e => setNewRound({...newRound, place_type: e.target.value})} placeholder="AT A CAFÉ" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Lat (optional)" type="number" step="any" value={newRound.lat} onChange={e => setNewRound({...newRound, lat: e.target.value})} placeholder="40.7033" />
            <Input label="Lng (optional)" type="number" step="any" value={newRound.lng} onChange={e => setNewRound({...newRound, lng: e.target.value})} placeholder="-73.9881" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Radius (m)" type="number" value={newRound.radius_m} onChange={e => setNewRound({...newRound, radius_m: e.target.value})} min={1} />
            <Input label="Survival Cap" type="number" value={newRound.survival_cap} onChange={e => setNewRound({...newRound, survival_cap: e.target.value})} min={1} />
            <select value={newRound.status} onChange={e => setNewRound({...newRound, status: e.target.value})} className="bg-smoke border border-ember rounded-xl px-4 py-3 text-bone font-mono text-sm" required>
              <option value="scheduled">Scheduled</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Opens At (ISO)" type="datetime-local" value={newRound.opens_at} onChange={e => setNewRound({...newRound, opens_at: e.target.value})} required />
            <Input label="Closes At (ISO)" type="datetime-local" value={newRound.closes_at} onChange={e => setNewRound({...newRound, closes_at: e.target.value})} required />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-2xl bg-blood text-bone font-display text-xl tracking-widest active:scale-95 disabled:opacity-50">
            {submitting ? 'CREATING…' : 'CREATE ROUND'}
          </button>
        </form>
      </div>

      <div className="bg-smoke border border-ember rounded-2xl p-4">
        <h3 className="font-display text-lg text-bone mb-3">Existing Rounds</h3>
        {rounds.length === 0 ? (
          <p className="text-dim font-mono text-sm">No rounds configured</p>
        ) : (
          <div className="space-y-2">
            {rounds.map((r) => (
              <div key={r.day} className="bg-ash rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl text-bone">Day {r.day}</span>
                  <span className="font-mono text-xs px-2 py-1 rounded-full bg-amber/10 text-amber border border-amber/30">{r.status}</span>
                  <span className="text-bone font-mono text-sm">{r.name}</span>
                </div>
                <div className="text-dim text-xs font-mono flex flex-wrap gap-4">
                  <span>Opens: {r.opens_at ? new Date(r.opens_at).toLocaleString() : '—'}</span>
                  <span>Closes: {r.closes_at ? new Date(r.closes_at).toLocaleString() : '—'}</span>
                  <span>Cap: {r.survival_cap}</span>
                  <span>Radius: {r.radius_m}m</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayersPanel({ users }) {
  return (
    <div className="bg-smoke border border-ember rounded-2xl p-4">
      <h3 className="font-display text-lg text-bone mb-3">Cohort Roster ({users.length})</h3>
      {users.length === 0 ? (
        <p className="text-dim font-mono text-sm">No players yet</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {users.map((u) => (
            <div key={u.address} className="bg-ash rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-dim">{u.address.slice(0, 8)}…</span>
                {u.username && <span className="text-bone font-mono text-sm">@{u.username}</span>}
                {u.world_id_verified && <span className="px-2 py-1 rounded-full bg-neon/10 text-neon border border-neon/30 font-mono text-xs">Verified</span>}
                {u.humanity_nullifier && !u.world_id_verified && <span className="px-2 py-1 rounded-full bg-amber/10 text-amber border border-amber/30 font-mono text-xs">Self Protocol</span>}
                {u.eliminated && <span className="px-2 py-1 rounded-full bg-blood/10 text-blood border border-blood/30 font-mono text-xs">Eliminated Day {u.eliminated_at_day}</span>}
                {!u.eliminated && !u.world_id_verified && !u.humanity_nullifier && <span className="px-2 py-1 rounded-full bg-ember text-dim border border-ember font-mono text-xs">Provisional</span>}
              </div>
              <div className="text-dim text-xs font-mono flex gap-4">
                <span>Refs: {u.referral_count || 0}</span>
                <span>Joined: {u.reserved_at ? new Date(u.reserved_at).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlagsPanel({ flags }) {
  return (
    <div className="bg-smoke border border-ember rounded-2xl p-4">
      <h3 className="font-display text-lg text-bone mb-3">Anti-Cheat Flags ({flags.length})</h3>
      {flags.length === 0 ? (
        <p className="text-dim font-mono text-sm">No flags detected</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {flags.map((f) => (
            <div key={f.id} className="bg-ash rounded-xl p-3">
              <div className="flex justify-between items-start">
                <span className="text-blood font-mono text-sm">{f.reason}</span>
                <span className="text-dim font-mono text-xs">{new Date(f.created_at).toLocaleString()}</span>
              </div>
              <div className="text-dim text-xs font-mono mt-1">Submission ID: {f.submission_id}</div>
              {f.metadata && (
                <details className="mt-2">
                  <summary className="text-dim text-xs font-mono cursor-pointer">Metadata</summary>
                  <pre className="text-[10px] mt-2 overflow-auto bg-ash p-2 rounded">{JSON.stringify(f.metadata, null, 2)}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionsPanel({ gameState, onCloseDay, onTriggerRounds }) {
  const currentDay = gameState?.currentDay;
  return (
    <div className="space-y-4">
      <div className="bg-smoke border border-ember rounded-2xl p-4">
        <h3 className="font-display text-lg text-bone mb-3">Dangerous Actions</h3>
        <p className="text-dim text-xs font-mono mb-4">These actions are irreversible. Use with caution.</p>
        <div className="space-y-3">
          {currentDay && (
            <button
              onClick={() => onCloseDay(currentDay)}
              className="w-full py-3 rounded-2xl bg-blood/10 border border-blood/40 text-blood font-display text-lg tracking-widest active:scale-95"
            >
              CLOSE DAY {currentDay} (Eliminate non-survivors)
            </button>
          )}
          <button
            onClick={onTriggerRounds}
            className="w-full py-3 rounded-2xl bg-amber/10 border border-amber/40 text-amber font-display text-lg tracking-widest active:scale-95"
          >
            TRIGGER ROUND SCHEDULER MANUALLY
          </button>
        </div>
      </div>

      <div className="bg-smoke border border-ember rounded-2xl p-4">
        <h3 className="font-display text-lg text-bone mb-3">Game State Debug</h3>
        <pre className="text-[10px] font-mono text-dim overflow-auto bg-ash p-3 rounded">{JSON.stringify(gameState, null, 2)}</pre>
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, required, min, step }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-dim text-xs font-mono">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="bg-smoke border border-ember rounded-xl px-4 py-3 text-bone font-mono text-sm placeholder:text-dim/50 outline-none focus:border-amber transition-colors"
      />
    </div>
  );
}