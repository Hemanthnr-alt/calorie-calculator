import React, { useState, useEffect, useCallback } from 'react';
import {
  getWeeklyData, getMonthlyData, getStreak, addWeightEntry, getWeightHistory,
  getAchievementDefs, getUnlockedAchievements, getDailySummary,
} from '../db/database.js';

const TABS = [
  { id: 'overview',      label: 'Overview',  icon: '📊' },
  { id: 'insights',      label: 'Insights',  icon: '💡' },
  { id: 'achievements',  label: 'Badges',    icon: '🏆' },
];

function generateInsights(streak, avgCal, weekActive, goal) {
  const tips = [];
  if (streak >= 7)  tips.push({ type: 'success', icon: '🔥', title: `${streak}-Day Streak!`, desc: `You've been tracking for ${streak} days in a row. Consistency is the key to results!` });
  if (streak < 3)   tips.push({ type: 'info', icon: '📅', title: 'Build Your Streak', desc: 'Logging daily helps you stay aware of your habits. Try to log every meal this week.' });
  if (avgCal > 0 && goal > 0) {
    const diff = avgCal - goal;
    if (Math.abs(diff) < 100) tips.push({ type: 'success', icon: '🎯', title: 'On Target', desc: `Your average of ${Math.round(avgCal)} kcal is very close to your goal of ${goal} kcal.` });
    else if (diff > 300)      tips.push({ type: 'warning', icon: '⚠️', title: 'Over Budget', desc: `You're averaging ${Math.round(diff)} kcal over your goal. Try replacing one high-calorie snack.` });
    else if (diff < -500)     tips.push({ type: 'info', icon: '🥗', title: 'Under Eating', desc: `You're averaging ${Math.round(Math.abs(diff))} kcal under goal. Make sure you're fueling your body.` });
  }
  if (weekActive < 4) tips.push({ type: 'info', icon: '💪', title: 'Log More Meals', desc: `You only tracked on ${weekActive} days this week. Try to hit 7/7 for maximum insight.` });
  tips.push({ type: 'info', icon: '💧', title: 'Hydration Matters', desc: 'Most people need 2–3L of water daily. Track your intake to ensure you\'re hydrated.' });
  tips.push({ type: 'info', icon: '🛌', title: 'Rest & Recovery', desc: 'Quality sleep improves metabolism and appetite regulation. Aim for 7–9 hours per night.' });
  return tips;
}

export default function Insights() {
  const [tab, setTab]               = useState('overview');
  const [streak, setStreak]         = useState(0);
  const [weekly, setWeekly]         = useState([]);
  const [monthly, setMonthly]       = useState([]);
  const [weights, setWeights]       = useState([]);
  const [newWeight, setNewWeight]   = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [unlockedKeys, setUnlockedKeys] = useState(new Set());
  const [todaySummary, setTodaySummary] = useState({ calories: 0 });
  const [goal, setGoal]             = useState(2000);

  const load = useCallback(async () => {
    const [st, wk, mn, wh, todayS] = await Promise.all([
      getStreak(), getWeeklyData(), getMonthlyData(), getWeightHistory(), getDailySummary()
    ]);
    const unlockedArr = await getUnlockedAchievements();
    setStreak(st); setWeekly(wk); setMonthly(mn); setWeights(wh);
    setTodaySummary(todayS);
    setAchievements(getAchievementDefs());
    setUnlockedKeys(new Set(unlockedArr.map(a => a.key)));
    const storedGoal = Number(localStorage.getItem('thirtycal_calGoal')) || 2000;
    setGoal(storedGoal);
  }, []);

  useEffect(() => { load(); }, [load]);

  const logWeight = async (e) => {
    e.preventDefault();
    if (!newWeight) return;
    await addWeightEntry(+newWeight);
    setNewWeight('');
    load();
  };

  const monthAvg = Math.round(
    monthly.filter(d => d.calories > 0).reduce((s, d) => s + d.calories, 0) /
    (monthly.filter(d => d.calories > 0).length || 1)
  );
  const activeDays = monthly.filter(d => d.calories > 0);
  const maxW = Math.max(...weekly.map(d => d.calories), 1);

  // Heatmap
  const heatmap = monthly.map(d => ({
    date: d.date,
    active: d.calories > 0,
    today: d.date === new Date().toISOString().slice(0, 10),
    intensity: d.calories > 2000 ? 3 : d.calories > 1200 ? 2 : d.calories > 0 ? 1 : 0,
  }));

  // Weight SVG sparkline
  const weightPoints = weights.length > 1 ? (() => {
    const vals = weights.slice(-12).reverse().map(w => w.weightKg);
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    return vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
  })() : null;

  const insights = generateInsights(streak, monthAvg, weekly.filter(d => d.calories > 0).length, goal);

  return (
    <div className="page page-enter">
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Insights</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--tx-3)', marginTop: '2px' }}>Your nutrition analytics</div>
        </div>
        {streak > 0 && (
          <div style={{
            background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.2)',
            padding: '8px 14px', borderRadius: 'var(--r-full)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ filter: 'drop-shadow(0 0 6px rgba(255,165,0,0.8))' }}>🔥</span>
            <span style={{ fontWeight: 800, color: '#fb923c', fontSize: '0.95rem' }}>{streak}d</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="insights-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`insights-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {/* Stats grid */}
          <div className="insights-stat-grid">
            {[
              { label: 'Day Streak',   val: streak,          icon: '🔥', color: '#fb923c' },
              { label: 'Days Logged',  val: activeDays.length, icon: '📅', color: 'var(--accent-bright)' },
              { label: 'Avg Calories', val: monthAvg,         icon: '⚡', color: 'var(--protein)' },
              { label: 'Consistency',  val: `${Math.round((activeDays.length/30)*100)}%`, icon: '🎯', color: 'var(--green)' },
            ].map((s, i) => (
              <div key={i} className="insights-stat-card">
                <span className="insights-stat-icon">{s.icon}</span>
                <div className="insights-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="insights-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 28-day heatmap */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 'var(--s-4)' }}>
              <h2>28-Day Activity</h2>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center', fontSize: '0.62rem', color: 'var(--tx-3)', fontWeight: 600 }}>
                Less
                {[0,1,2,3].map(l => (
                  <div key={l} style={{ width: '10px', height: '10px', borderRadius: '2px', background: l === 0 ? 'rgba(255,255,255,0.04)' : `rgba(74,222,128,${l/3})`, border: l===0 ? '1px solid var(--border)' : 'none' }} />
                ))}
                More
              </div>
            </div>
            <div className="heatmap">
              {heatmap.map(d => (
                <div key={d.date}
                  className={`heat-cell${d.today ? ' today' : ''}`}
                  style={{ background: d.active ? `rgba(74,222,128,${d.intensity/3})` : undefined, border: d.active ? 'none' : undefined, boxShadow: d.active ? `0 0 ${d.intensity*2}px rgba(74,222,128,0.3)` : undefined }}
                  title={d.date}
                />
              ))}
            </div>
          </div>

          {/* Weekly bar chart */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 'var(--s-5)' }}>
              <h2>This Week</h2>
              <span className="pill pill-accent">{monthAvg} avg</span>
            </div>
            <div className="week-bars">
              {weekly.map(d => {
                const h = d.calories > 0 ? Math.max((d.calories / maxW) * 100, 8) : 0;
                return (
                  <div key={d.date} className="week-bar-wrap" onClick={() => setSelectedDay(selectedDay === d.date ? null : d.date)}>
                    <div className="week-bar-track">
                      <div className="week-bar-fill" style={{ height: `${h}%` }} />
                    </div>
                    <div className={`week-bar-label${d.today ? ' today' : ''}`}>{d.label}</div>
                    {selectedDay === d.date && d.calories > 0 && (
                      <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-toast)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 'var(--r-sm)', whiteSpace: 'nowrap', border: '1px solid var(--bd-accent)', zIndex: 10 }}>
                        {Math.round(d.calories)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weight tracker */}
          <div className="card">
            <h2 style={{ marginBottom: 'var(--s-4)' }}>⚖️ Weight Trend</h2>
            <form onSubmit={logWeight} style={{ display: 'flex', gap: 'var(--s-3)', marginBottom: weights.length > 0 ? 'var(--s-4)' : 0 }}>
              <input type="number" step="0.1" className="input" placeholder="Log weight (kg)" value={newWeight} onChange={e => setNewWeight(e.target.value)} />
              <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Log</button>
            </form>
            {weightPoints && (
              <div className="weight-chart-wrap" style={{ marginBottom: 'var(--s-3)' }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="80">
                  <defs><linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.2" /><stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" /></linearGradient></defs>
                  <polygon points={`0,100 ${weightPoints} 100,100`} fill="url(#wtGrad)" />
                  <polyline points={weightPoints} fill="none" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 3px rgba(0,200,220,0.5))' }} />
                </svg>
              </div>
            )}
            {weights.length > 0 ? (
              <div className="diary-meal-items">
                {weights.slice(0, 5).map((w, i) => (
                  <div key={i} className="diary-food-item">
                    <div className="diary-food-info"><div className="diary-food-name">{w.weightKg} kg</div></div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--tx-3)' }}>{w.date}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--s-5)', fontSize: '0.85rem', color: 'var(--tx-3)' }}>No weight entries yet</div>
            )}
          </div>
        </div>
      )}

      {/* ═══ INSIGHTS ═══ */}
      {tab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {insights.map((item, i) => {
            const color = item.type === 'warning' ? 'var(--danger)' : item.type === 'success' ? 'var(--green)' : 'var(--accent-bright)';
            const bg    = item.type === 'warning' ? 'rgba(239,68,68,0.07)' : item.type === 'success' ? 'rgba(74,222,128,0.07)' : 'var(--accent-fill)';
            return (
              <div key={i} className="insight-item">
                <div className="insight-left-bar" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                <div className="insight-icon-wrap" style={{ background: bg, border: `1px solid ${color}33`, marginLeft: 'var(--s-2)' }}>{item.icon}</div>
                <div>
                  <div className="insight-title">{item.title}</div>
                  <div className="insight-desc">{item.desc}</div>
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: '0.68rem', color: 'var(--tx-3)', textAlign: 'center', padding: 'var(--s-2)' }}>Generated locally — no data leaves your device.</div>
        </div>
      )}

      {/* ═══ ACHIEVEMENTS ═══ */}
      {tab === 'achievements' && (
        <div>
          <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--s-3)' }}>
              <h3>Trophy Room</h3>
              <span style={{ fontWeight: 800, color: 'var(--accent-bright)', fontSize: '0.9rem' }}>{unlockedKeys.size}/{achievements.length}</span>
            </div>
            <div className="progress-track" style={{ height: '8px' }}>
              <div className="progress-bar progress-accent" style={{ width: `${achievements.length > 0 ? (unlockedKeys.size / achievements.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="achievement-grid">
            {achievements.map(a => {
              const unlocked = unlockedKeys.has(a.key);
              return (
                <div key={a.key} className={`ach-card${unlocked ? ' unlocked' : ' locked'}`}>
                  <div className="ach-icon" style={{ filter: unlocked ? 'none' : 'grayscale(100%)', fontSize: '2rem' }}>{a.icon}</div>
                  <div className="ach-name">{a.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
