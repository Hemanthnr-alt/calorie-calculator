import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import FoodSearchModal from '../components/FoodSearchModal.jsx';
import {
  getDailySummary, getWaterForDate, getStreak, getFoodLogForDate,
  addFoodEntry, deleteFoodEntry, addWaterEntry, checkAndUnlockAchievements,
  getMostLoggedFoods, getFavoriteFoods, todayStr
} from '../db/database.js';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'lunch',     label: 'Lunch',     icon: '☀️' },
  { id: 'dinner',    label: 'Dinner',    icon: '🌙' },
  { id: 'snack',     label: 'Snacks',    icon: '🍿' },
];

function CalorieRing({ value, max, size = 140 }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ * (1 - pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="url(#ringGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--cyan)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Dashboard() {
  const { goals, showToast, targetDate, setTargetDate } = useApp();
  const [summary, setSummary]   = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
  const [entries, setEntries]   = useState([]);
  const [street, setStreak]     = useState(0);
  const [water, setWater]       = useState({ total: 0 });
  const [ready, setReady]       = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState('snack');
  const [quickFoods, setQuickFoods] = useState([]);
  const [selectedFoodToLog, setSelectedFoodToLog] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const refresh = useCallback(async () => {
    const [s, wa, st, e] = await Promise.all([
      getDailySummary(targetDate), getWaterForDate(targetDate), getStreak(), getFoodLogForDate(targetDate),
    ]);
    setSummary(s); setWater(wa); setStreak(st); setEntries(e); setReady(true);
    const [favs, most] = await Promise.all([getFavoriteFoods(), getMostLoggedFoods(6)]);
    const combined = [
      ...favs.map(f => ({ foodName: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, isFav: true })),
      ...most.map(f => ({ ...f, isFav: false })),
    ];
    const seen = new Set(); const unique = [];
    for (const f of combined) { const key = f.foodName?.toLowerCase(); if (key && !seen.has(key)) { seen.add(key); unique.push(f); } }
    setQuickFoods(unique.slice(0, 8));
  }, [targetDate]);

  useEffect(() => { refresh(); }, [refresh]);

  const openSearchFor = (mealType) => { setActiveMeal(mealType); setSearchOpen(true); };

  const handleSelect = (food) => { setSelectedFoodToLog({ ...food, foodName: food.foodName || food.name }); setQuantity(1); };

  const commitLog = async () => {
    if (!selectedFoodToLog) return;
    const q = Number(quantity) || 1;
    await addFoodEntry({
      foodName: selectedFoodToLog.foodName,
      calories: Math.round(+selectedFoodToLog.calories * q),
      protein:  Math.round(+(selectedFoodToLog.protein || 0) * q),
      carbs:    Math.round(+(selectedFoodToLog.carbs || 0) * q),
      fat:      Math.round(+(selectedFoodToLog.fat || 0) * q),
      mealType: activeMeal,
      date: targetDate,
    });
    showToast(`Added ${selectedFoodToLog.foodName}`, '✅');
    setSelectedFoodToLog(null);
    refresh();
    const ach = await checkAndUnlockAchievements();
    if (ach.length > 0) showToast(`🎉 ${ach[0].name}!`, ach[0].icon);
  };

  const grouped = {};
  for (const e of entries) { const t = e.mealType || 'snack'; if (!grouped[t]) grouped[t] = []; grouped[t].push(e); }

  const remaining = Math.max(goals.calories - summary.calories, 0);
  const waterPct = goals.water > 0 ? Math.min((water.total / goals.water) * 100, 100) : 0;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  // Date navigator helpers
  const today = todayStr();
  const [ty, tm, td] = targetDate.split('-');
  const displayDate = new Date(ty, tm - 1, td);
  let dateStr = displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
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

  if (!ready) return (
    <div className="page stagger">
      <div className="skel skel-block" style={{ height: 200 }} />
      <div className="skel skel-line" />
      <div className="skel skel-line short" />
    </div>
  );

  return (
    <div className="page page-enter">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-greeting" style={{ marginBottom: '4px' }}>{greeting} 👋</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
            <button onClick={() => changeDate(-1)} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--tx-1)', cursor: 'pointer', padding: '4px 10px', fontSize: '1rem' }}>&lsaquo;</button>
            <button onClick={() => setTargetDate(today)} style={{ margin: 0, minWidth: '100px', textAlign: 'center', background: 'none', border: 'none', color: 'var(--tx-1)', cursor: targetDate === today ? 'default' : 'pointer', fontSize: '1rem', fontWeight: 600 }}>{dateStr}</button>
            <button onClick={() => changeDate(1)} disabled={targetDate === today} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--tx-1)', cursor: 'pointer', padding: '4px 10px', fontSize: '1rem', opacity: targetDate === today ? 0.3 : 1 }}>&rsaquo;</button>
          </div>
        </div>
        {street > 0 && (
          <div style={{
            background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.2)',
            padding: '8px 14px', borderRadius: 'var(--r-full)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ filter: 'drop-shadow(0 0 6px rgba(255,165,0,0.8))' }}>🔥</span>
            <span style={{ fontWeight: 800, color: '#fb923c', fontSize: '0.95rem' }}>{street}</span>
          </div>
        )}
      </div>

      {/* Calorie Hero Card */}
      <div className="calorie-hero">
        <div className="calorie-hero-ring">
          <CalorieRing value={summary.calories} max={goals.calories} size={130} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
            <div className="calorie-ring-num">{Math.round(remaining)}</div>
            <div className="calorie-ring-sub">left</div>
          </div>
        </div>
        <div className="calorie-hero-stats">
          <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Calories</div>
          <div className="calorie-eq">
            <div className="eq-item"><div className="eq-value">{goals.calories}</div><div className="eq-label">Goal</div></div>
            <div className="eq-op">−</div>
            <div className="eq-item"><div className="eq-value">{Math.round(summary.calories)}</div><div className="eq-label">Eaten</div></div>
            <div className="eq-op">=</div>
            <div className="eq-item eq-remaining"><div className="eq-value">{Math.round(remaining)}</div><div className="eq-label">Left</div></div>
          </div>
          {/* Macro chips */}
          <div className="macro-cards">
            {[
              { label: 'Protein', val: summary.protein, goal: goals.protein, color: 'var(--protein)' },
              { label: 'Carbs',   val: summary.carbs,   goal: goals.carbs,   color: 'var(--carbs)' },
              { label: 'Fat',     val: summary.fat,     goal: goals.fat,     color: 'var(--fat)' },
            ].map(m => (
              <div key={m.label} className="macro-chip" style={{ borderColor: `${m.color}22` }}>
                <div className="macro-chip-val" style={{ color: m.color }}>{Math.round(m.val)}g</div>
                <div className="macro-chip-label" style={{ color: m.color }}>{m.label}</div>
                <div className="progress-track" style={{ height: '3px' }}>
                  <div className="progress-bar" style={{
                    width: `${Math.min((m.val / m.goal) * 100, 100)}%`,
                    background: m.color, boxShadow: `0 0 4px ${m.color}66`,
                  }} />
                </div>
                <div className="macro-chip-goal">/ {m.goal}g</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Add Chips */}
      {quickFoods.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 'var(--s-3)' }}>⚡ Quick Add</h2>
          <div className="quick-chips">
            {quickFoods.map((f, i) => (
              <button key={i} className="quick-chip" onClick={() => { setActiveMeal('snack'); handleSelect(f); }}>
                {f.isFav && <span className="quick-chip-fav">♥</span>}
                <span className="quick-chip-name">{f.foodName}</span>
                <span className="quick-chip-cal">{f.calories}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Food Diary */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 'var(--s-4)' }}>
          <h2>🍽️ Food Diary</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--tx-3)' }}>{entries.length} items</span>
        </div>
        {MEAL_TYPES.map(meal => {
          const items = grouped[meal.id] || [];
          const mealCals = items.reduce((s, e) => s + Number(e.calories), 0);
          return (
            <div key={meal.id} className="diary-meal-section">
              <div className="diary-meal-header">
                <div className="diary-meal-left">
                  <span className="diary-meal-icon">{meal.icon}</span>
                  <span className="diary-meal-name">{meal.label}</span>
                  {mealCals > 0 && <span className="diary-meal-cals">{Math.round(mealCals)} kcal</span>}
                </div>
                <button className="diary-add-btn" onClick={() => openSearchFor(meal.id)}>+ ADD</button>
              </div>
              {items.length > 0 && (
                <div className="diary-meal-items">
                  {items.map(e => (
                    <div key={e.id} className="diary-food-item">
                      <div className="diary-food-info">
                        <div className="diary-food-name">{e.foodName}</div>
                        <div className="diary-food-macros">P:{e.protein}g · C:{e.carbs}g · F:{e.fat}g</div>
                      </div>
                      <div className="diary-food-cal">{e.calories}</div>
                      <button className="diary-food-delete" onClick={() => { deleteFoodEntry(e.id); showToast('Removed', '🗑️'); refresh(); }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Water Quick */}
      <Link to="/water" style={{ textDecoration: 'none' }}>
        <div className="card" style={{ background: 'linear-gradient(145deg, rgba(0,180,220,0.06), rgba(0,100,150,0.02))', borderColor: 'rgba(0,200,230,0.12)' }}>
          <div className="flex-between">
            <div>
              <h2 style={{ marginBottom: 'var(--s-2)' }}>💧 Water</h2>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--water)' }}>{water.total} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--tx-3)' }}>/ {goals.water} ml</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--s-2)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--water)' }}>{Math.round(waterPct)}%</div>
              <div className="water-glasses-mini">
                {Array.from({ length: Math.min(Math.ceil(goals.water / 250), 10) }, (_, i) => (
                  <div key={i} className={`water-glass-dot${i < Math.floor(water.total / 250) ? ' filled' : ''}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="progress-track" style={{ marginTop: 'var(--s-3)', height: '5px' }}>
            <div className="progress-bar progress-sky" style={{ width: `${waterPct}%` }} />
          </div>
        </div>
      </Link>

      {/* Modals */}
      <FoodSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={handleSelect} />

      {selectedFoodToLog && (
        <>
          <div className="modal-backdrop" onClick={() => setSelectedFoodToLog(null)} />
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div style={{ marginBottom: 'var(--s-2)', fontSize: '0.78rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logging to {activeMeal}</div>
            <h3 style={{ marginBottom: 'var(--s-4)', fontSize: '1.1rem' }}>{selectedFoodToLog.foodName}</h3>

            <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
              <label className="form-label">Quantity / Servings Multiplier</label>
              <input type="number" step="0.1" min="0.1" className="input" value={quantity} onChange={e => setQuantity(e.target.value)} autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s-2)', marginBottom: 'var(--s-5)' }}>
              {[
                { label: 'Calories', val: Math.round(+selectedFoodToLog.calories * (Number(quantity)||1)), color: 'var(--accent-bright)' },
                { label: 'Protein', val: `${Math.round(+(selectedFoodToLog.protein||0) * (Number(quantity)||1))}g`, color: 'var(--protein)' },
                { label: 'Carbs',   val: `${Math.round(+(selectedFoodToLog.carbs||0) * (Number(quantity)||1))}g`, color: 'var(--carbs)' },
                { label: 'Fat',     val: `${Math.round(+(selectedFoodToLog.fat||0) * (Number(quantity)||1))}g`, color: 'var(--fat)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: 'var(--s-3)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, color: s.color, fontSize: '0.95rem' }}>{s.val}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--tx-3)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
              <button className="btn btn-secondary btn-block" onClick={() => setSelectedFoodToLog(null)}>Cancel</button>
              <button className="btn btn-primary btn-block" onClick={commitLog}>Log Food</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
