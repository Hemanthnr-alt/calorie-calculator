import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { getWaterForDate, addWaterEntry, deleteWaterEntry, todayStr } from '../db/database.js';

const PRESETS = [
  { ml: 150,  icon: '🥛', label: 'Small' },
  { ml: 250,  icon: '🥤', label: 'Glass' },
  { ml: 330,  icon: '🍺', label: 'Can' },
  { ml: 500,  icon: '💧', label: 'Bottle' },
  { ml: 750,  icon: '🚰', label: 'Large' },
  { ml: 1000, icon: '🪣', label: '1L' },
];

export default function Water() {
  const { goals, updateProfile, showToast, targetDate, setTargetDate } = useApp();
  const [water, setWater]             = useState({ entries: [], total: 0 });
  const [customMl, setCustomMl]       = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal]         = useState('');
  const [animating, setAnimating]     = useState(null); // track the last added ml for animation

  const refresh = useCallback(async () => {
    const w = await getWaterForDate(targetDate);
    setWater(w);
  }, [targetDate]);

  useEffect(() => { refresh(); }, [refresh]);

  const addWater = async (ml) => {
    setAnimating(ml);
    setTimeout(() => setAnimating(null), 600);
    await addWaterEntry(ml, targetDate);
    refresh();
    // toast only if hitting/exceeding goal
    const newTotal = water.total + ml;
    if (newTotal >= goals.water && water.total < goals.water) {
      showToast('🎉 Daily water goal reached!', '💧');
    }
  };

  const handleCustom = async (e) => {
    e.preventDefault();
    const ml = +customMl;
    if (!ml || ml <= 0) return;
    await addWater(ml);
    setCustomMl('');
  };

  const handleDeleteEntry = async (id) => {
    await deleteWaterEntry(id);
    refresh();
  };

  const saveGoal = async () => {
    const val = +newGoal;
    if (!val || val < 100) { setEditingGoal(false); return; }
    await updateProfile({ dailyWaterGoalMl: val });
    showToast('Water goal updated!', '🎯');
    setEditingGoal(false);
  };

  const total = water.total;
  const goal  = goals.water || 2500;
  const pct   = Math.min((total / goal) * 100, 100);
  const cups  = Math.round(total / 250); // cups of 250ml
  const goalCups = Math.ceil(goal / 250);

  // SVG ring
  const R    = 54;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - pct / 100);

  const timeStr = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Date navigator helpers
  const today = todayStr();
  const [ty, tm, td] = targetDate.split('-');
  const displayDate = new Date(ty, tm - 1, td);
  let dateStr = displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (targetDate === today) dateStr = 'Today';
  else {
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    if (targetDate === `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`) dateStr = 'Yesterday';
  }

  const changeDate = (offset) => {
    const d = new Date(ty, tm - 1, td);
    d.setDate(d.getDate() + offset);
    setTargetDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  };

  return (
    <div className="page page-enter" style={{ gap: 'var(--s-5)' }}>
      {/* Date Navigator */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-var(--s-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', background: 'linear-gradient(145deg, rgba(0,180,220,0.06), rgba(0,100,150,0.02))', border: '1px solid rgba(0,200,230,0.12)', borderRadius: 'var(--r-full)', padding: '4px 8px' }}>
          <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', color: 'var(--water)', cursor: 'pointer', padding: '0 8px', fontSize: '1.2rem', fontWeight: 300 }}>&lsaquo;</button>
          <button onClick={() => setTargetDate(today)} style={{ background: 'none', border: 'none', color: 'var(--water)', fontSize: '0.85rem', fontWeight: 800, minWidth: '90px', textAlign: 'center', cursor: targetDate === today ? 'default' : 'pointer' }}>{dateStr}</button>
          <button onClick={() => changeDate(1)} disabled={targetDate === today} style={{ background: 'none', border: 'none', color: 'var(--water)', cursor: 'pointer', padding: '0 8px', fontSize: '1.2rem', fontWeight: 300, opacity: targetDate === today ? 0.3 : 1 }}>&rsaquo;</button>
        </div>
      </div>

      {/* ─── Header ─── */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Hydration</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--tx-3)' }}>Stay hydrated, feel great</div>
        </div>
        {/* Editable goal badge */}
        <button
          onClick={() => { setEditingGoal(true); setNewGoal(String(goal)); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--water-fill)', border: '1px solid rgba(0,200,230,0.25)', borderRadius: 'var(--r-full)', padding: '6px 14px', cursor: 'pointer', color: 'var(--water)', fontSize: '0.8rem', fontWeight: 700 }}
        >
          🎯 {goal} ml
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>

      {/* ─── Goal edit sheet ─── */}
      {editingGoal && (
        <>
          <div className="modal-backdrop" onClick={() => setEditingGoal(false)} />
          <div className="modal-sheet">
            <div className="modal-handle" />
            <h3 style={{ marginBottom: 'var(--s-4)' }}>Set Daily Water Goal</h3>
            <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
              <label className="form-label">Goal (ml)</label>
              <input
                type="number"
                className="input"
                placeholder="e.g. 2500"
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
              {[1500, 2000, 2500, 3000, 3500, 4000].map(v => (
                <button key={v} className={`btn btn-sm ${+newGoal === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setNewGoal(String(v))}>
                  {v} ml
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
              <button className="btn btn-secondary btn-block" onClick={() => setEditingGoal(false)}>Cancel</button>
              <button className="btn btn-primary btn-block" onClick={saveGoal}>Save Goal</button>
            </div>
          </div>
        </>
      )}

      {/* ─── Main Progress Card ─── */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(0,190,230,0.07), rgba(0,100,160,0.03))',
        border: '1px solid rgba(0,200,240,0.15)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--s-6)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--s-4)',
      }}>
        {/* Glow blob */}
        <div style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', width: 200, height: 100, background: 'radial-gradient(ellipse, hsla(195,90%,50%,0.12), transparent 70%)', pointerEvents: 'none' }} />

        {/* Circular ring */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx="74" cy="74" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
            {/* Fill arc */}
            <circle
              cx="74" cy="74" r={R} fill="none"
              stroke="url(#wGrad)" strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1)', filter: 'drop-shadow(0 0 6px rgba(0,200,230,0.5))' }}
            />
            <defs>
              <linearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(195,90%,52%)" />
                <stop offset="100%" stopColor="hsl(175,90%,48%)" />
              </linearGradient>
            </defs>
          </svg>
          {/* Center label */}
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--water)', lineHeight: 1 }}>
              {Math.round(pct)}%
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>of goal</div>
          </div>
        </div>

        {/* Amount display */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 900, color: 'var(--water)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {total} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--tx-3)' }}>ml</span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--tx-3)', marginTop: '4px' }}>
            {Math.round((goal - total) / 1000 * 10) / 10}L remaining · {cups}/{goalCups} glasses
          </div>
        </div>

        {/* Cup indicators */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: 280 }}>
          {Array.from({ length: Math.min(goalCups, 12) }, (_, i) => {
            const filled = i < Math.floor(total / 250);
            return (
              <button
                key={i}
                onClick={() => addWater(250)}
                style={{
                  width: '40px', height: '40px',
                  borderRadius: 'var(--r-md)',
                  background: filled ? 'rgba(0,200,230,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${filled ? 'rgba(0,200,230,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s var(--ease-spring)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: filled ? '0 0 10px rgba(0,200,230,0.2)' : 'none',
                  transform: filled ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {filled ? '💧' : '○'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Quick Add Presets ─── */}
      <div className="card">
        <h2 style={{ marginBottom: 'var(--s-4)' }}>Quick Add</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
          {PRESETS.map(p => (
            <button
              key={p.ml}
              onClick={() => addWater(p.ml)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                padding: 'var(--s-4) var(--s-2)',
                borderRadius: 'var(--r-lg)',
                background: animating === p.ml ? 'rgba(0,200,230,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${animating === p.ml ? 'rgba(0,200,230,0.3)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s var(--ease-spring)',
                transform: animating === p.ml ? 'scale(0.95)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{p.icon}</span>
              <span style={{ fontWeight: 800, color: 'var(--water)', fontSize: '0.95rem', fontFamily: 'var(--font-heading)' }}>{p.ml}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--tx-3)', fontWeight: 600 }}>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <form onSubmit={handleCustom} style={{ display: 'flex', gap: 'var(--s-3)', marginTop: 'var(--s-4)' }}>
          <input
            type="number"
            className="input"
            placeholder="Custom amount (ml)"
            value={customMl}
            onChange={e => setCustomMl(e.target.value)}
            min="1"
          />
          <button className="btn btn-outline" type="submit" style={{ flexShrink: 0 }}>+ Add</button>
        </form>
      </div>

      {/* ─── Today's Log ─── */}
      {water.entries.length > 0 && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 'var(--s-4)' }}>
            <h2>Today's Log</h2>
            <span style={{ fontWeight: 800, color: 'var(--water)', fontSize: '0.85rem' }}>{total} ml</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {[...water.entries].reverse().map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', padding: 'var(--s-3)', borderRadius: 'var(--r-md)', background: 'rgba(0,200,230,0.04)', border: '1px solid rgba(0,200,230,0.08)' }}>
                <span style={{ fontSize: '1.1rem' }}>💧</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--tx-1)' }}>{e.amountMl} ml</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)' }}>{timeStr(e.createdAt)}</div>
                </div>
                <button
                  onClick={() => handleDeleteEntry(e.id)}
                  style={{ background: 'rgba(239,68,68,0.08)', border: 'none', color: '#f87171', width: '28px', height: '28px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7 }}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 'var(--s-4)' }} />
    </div>
  );
}
