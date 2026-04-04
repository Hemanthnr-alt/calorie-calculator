import { useMemo, useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiAward, FiCalendar, FiEdit2, FiTarget,
  FiTrendingUp, FiDroplet, FiActivity, FiLogOut,
} from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext.jsx';
import * as offlineStore from '../lib/offlineStore.js';
import { apiFetch } from '../lib/api.js';

const ACHIEVEMENTS = [
  { id: 'first_log',   name: 'First step',    desc: 'Log your first meal',          icon: '🌱', threshold: 1,  type: 'logs' },
  { id: 'week_streak', name: '7-day streak',  desc: 'Log every day for a week',     icon: '🔥', threshold: 7,  type: 'streak' },
  { id: 'logs_50',     name: 'Dedicated',     desc: '50 food entries logged',       icon: '📋', threshold: 50, type: 'logs' },
  { id: 'logs_100',    name: 'Century',       desc: '100 food entries logged',      icon: '💯', threshold: 100,type: 'logs' },
  { id: 'water_week',  name: 'Hydrated',      desc: 'Hit water goal 7 days',        icon: '💧', threshold: 7,  type: 'water' },
  { id: 'workouts_10', name: 'Athlete',       desc: '10 workouts logged',           icon: '🏋️', threshold: 10, type: 'workouts' },
];

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}

function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}

function calcStreak(foodLog) {
  if (!foodLog.length) return 0;
  const days = new Set(foodLog.map(e => dayKey(e.date)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12,0,0,0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate()-1);
  for (let i = 0; i < 400; i++) {
    if (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
    else break;
  }
  return streak;
}

export default function Profile({ token, userId, user, offline, foodLog = [] }) {
  const { logout } = useContext(AuthContext);
  const navigate   = useNavigate();
  const [profile, setProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [water, setWater] = useState(0);

  const displayName = user?.username || 'You';
  const initials    = getInitials(displayName);

  useEffect(() => {
    if (offline) {
      const p = offlineStore.getLocalProfile(userId);
      setProfile(p);
      const wb = offlineStore.getWorkoutsBundle(userId);
      setWorkouts(wb.workouts || []);
      const ws = offlineStore.getWaterState(userId);
      setWater(ws.total || 0);
      return;
    }
    apiFetch(`/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : null).then(d => { if (d) setProfile(d); }).catch(() => {});
    apiFetch(`/workouts/${userId}`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setWorkouts(d.workouts || []);
    }).catch(() => {});
  }, [userId, token, offline]);

  const streak      = useMemo(() => calcStreak(foodLog), [foodLog]);
  const totalLogs   = foodLog.length;
  const totalDays   = useMemo(() => new Set(foodLog.map(e => dayKey(e.date))).size, [foodLog]);
  const totalCalories = useMemo(() => foodLog.reduce((s, e) => s + Number(e.calories || 0), 0), [foodLog]);

  const dailyGoals = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('dailyGoals') || '{}'); } catch { return {}; }
  }, []);

  const goals = [
    {
      label: 'Calories',
      current: useMemo(() => {
        const today = new Date().toDateString();
        return foodLog.filter(e => new Date(e.date).toDateString() === today).reduce((s,e)=>s+Number(e.calories||0),0);
      }, [foodLog]),
      goal: Number(profile?.daily_calorie_goal || dailyGoals.calories || 2000),
      unit: 'kcal',
      color: 'var(--accent-bright)',
    },
    {
      label: 'Protein',
      current: useMemo(() => {
        const today = new Date().toDateString();
        return foodLog.filter(e => new Date(e.date).toDateString() === today).reduce((s,e)=>s+Number(e.protein||0),0);
      }, [foodLog]),
      goal: Number(profile?.daily_protein_goal || dailyGoals.protein || 150),
      unit: 'g',
      color: 'var(--rose)',
    },
    {
      label: 'Water',
      current: water / 1000,
      goal: (profile?.daily_water_goal_ml || 2000) / 1000,
      unit: 'L',
      color: 'var(--info)',
    },
  ];

  const unlocked = useMemo(() => {
    const set = new Set();
    if (totalLogs >= 1)   set.add('first_log');
    if (streak >= 7)      set.add('week_streak');
    if (totalLogs >= 50)  set.add('logs_50');
    if (totalLogs >= 100) set.add('logs_100');
    if (workouts.length >= 10) set.add('workouts_10');
    return set;
  }, [totalLogs, streak, workouts]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="page-stack profile-page">
      {/* ── Hero ────────────────────────────────────────── */}
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-info">
          <h1 className="profile-name">{displayName}</h1>
          <p className="profile-email">{user?.email || ''}</p>
          <div className="profile-badges">
            {offline && (
              <span className="profile-badge" style={{ background:'hsla(250,60%,50%,0.12)', borderColor:'hsla(250,60%,55%,0.28)', color:'#c4b5fd' }}>
                Local mode
              </span>
            )}
            {streak >= 7 && <span className="profile-badge gold">🔥 {streak}-day streak</span>}
            {totalLogs >= 100 && <span className="profile-badge">🏆 Century club</span>}
            <span className="profile-badge">{totalDays} days tracked</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display:'flex', gap:'var(--s-2)', flexWrap:'wrap' }}>
          <Link to="/settings" className="btn btn-secondary btn-sm">
            <FiEdit2 /> Edit profile
          </Link>
          <button onClick={handleLogout} className="btn btn-outline btn-sm btn-logout">
            <FiLogOut /> Sign out
          </button>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────── */}
      <div className="profile-stats-strip">
        <div className="profile-stat">
          <div className="profile-stat-val">{streak}</div>
          <div className="profile-stat-lbl">Day streak</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-val">{totalLogs}</div>
          <div className="profile-stat-lbl">Food entries</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-val">{totalDays}</div>
          <div className="profile-stat-lbl">Days active</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-val">{workouts.length}</div>
          <div className="profile-stat-lbl">Workouts</div>
        </div>
      </div>

      {/* ── Goals + Quick actions ────────────────────────── */}
      <div className="profile-section-grid">
        <div className="card">
          <h2><FiTarget /> Today's progress</h2>
          <div className="profile-goal-list">
            {goals.map(g => {
              const pct = g.goal > 0 ? Math.min((g.current / g.goal) * 100, 100) : 0;
              return (
                <div className="profile-goal-row" key={g.label}>
                  <div className="profile-goal-head">
                    <span>{g.label}</span>
                    <strong style={{ color: g.color }}>
                      {g.current.toFixed(g.unit === 'kcal' ? 0 : 1)}{g.unit} / {g.goal}{g.unit}
                    </strong>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg, ${g.color}, ${g.color}aa)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2><FiTrendingUp /> All-time stats</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--s-3)' }}>
            {[
              { icon: <FiActivity />, label: 'Total calories logged', val: `${totalCalories.toLocaleString()} kcal` },
              { icon: <FiCalendar />, label: 'Days with entries',     val: `${totalDays} days` },
              { icon: <FiDroplet />, label: 'Water tracked today',    val: `${(water/1000).toFixed(1)}L` },
              { icon: <FiAward />,   label: 'Achievements earned',    val: `${unlocked.size} / ${ACHIEVEMENTS.length}` },
            ].map(item => (
              <div key={item.label} style={{
                display:'flex', alignItems:'center', gap:'var(--s-3)',
                padding:'11px 14px',
                border:'1px solid var(--bd-1)',
                borderRadius:'var(--r-lg)',
                background:'var(--bg-raised)',
                fontSize:'0.86rem',
              }}>
                <span style={{ color:'var(--accent-bright)', fontSize:'1rem' }}>{item.icon}</span>
                <span style={{ flex:1, color:'var(--tx-mid)' }}>{item.label}</span>
                <strong>{item.val}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body info ───────────────────────────────────── */}
      {(profile?.weight_kg || profile?.height_cm || profile?.age) && (
        <div className="card">
          <h2>Body info</h2>
          <div className="summary-grid">
            {profile.age && (
              <div className="summary-card">
                <h3>{profile.age}</h3>
                <p>Age</p>
              </div>
            )}
            {profile.weight_kg && (
              <div className="summary-card">
                <h3>{profile.weight_kg}</h3>
                <p>Weight (kg)</p>
              </div>
            )}
            {profile.height_cm && (
              <div className="summary-card">
                <h3>{profile.height_cm}</h3>
                <p>Height (cm)</p>
              </div>
            )}
            {profile.gender && (
              <div className="summary-card">
                <h3 style={{ fontSize:'1.1rem', textTransform:'capitalize' }}>{profile.gender}</h3>
                <p>Gender</p>
              </div>
            )}
          </div>
          <p style={{ marginTop:'var(--s-3)', fontSize:'0.78rem', color:'var(--tx-low)' }}>
            Update in <Link to="/settings" className="link-inline">Settings</Link>
          </p>
        </div>
      )}

      {/* ── Achievements ─────────────────────────────────── */}
      <div className="card">
        <h2><FiAward /> Achievements</h2>
        <div className="achievement-grid">
          {ACHIEVEMENTS.map(a => {
            const isUnlocked = unlocked.has(a.id);
            return (
              <div key={a.id} className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                <span className="achievement-icon">{a.icon}</span>
                <div className="achievement-name">{a.name}</div>
                <div className="achievement-desc">{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Danger zone ──────────────────────────────────── */}
      <div className="card" style={{ borderColor:'hsla(4,80%,62%,0.2)' }}>
        <h2 style={{ borderBottomColor:'hsla(4,80%,62%,0.18)' }}>Account</h2>
        <p style={{ fontSize:'0.86rem', color:'var(--tx-mid)', marginBottom:'var(--s-4)' }}>
          {offline
            ? 'You are in local mode. Your data is stored only on this device.'
            : `Signed in as ${user?.email}. Your data syncs with the server.`}
        </p>
        <div style={{ display:'flex', gap:'var(--s-3)', flexWrap:'wrap' }}>
          <Link to="/settings" className="btn btn-secondary btn-sm">
            <FiEdit2 /> Account settings
          </Link>
          <button onClick={handleLogout} className="btn btn-danger btn-sm">
            <FiLogOut /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
