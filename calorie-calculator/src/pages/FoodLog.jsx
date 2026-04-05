import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import FoodSearchModal from '../components/FoodSearchModal.jsx';
import offlineFoods from '../data/foods-offline.json';
import {
  addFoodEntry, addCustomFood, getDailySummary, getFoodLogForDate,
  deleteFoodEntry, checkAndUnlockAchievements, getMostLoggedFoods, getFavoriteFoods, todayStr
} from '../db/database.js';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'lunch',     label: 'Lunch',     icon: '☀️' },
  { id: 'dinner',    label: 'Dinner',    icon: '🌙' },
  { id: 'snack',     label: 'Snacks',    icon: '🍿' },
];

export default function FoodLog() {
  const { goals, showToast, targetDate, setTargetDate } = useApp();
  const navigate = useNavigate();
  const [entries, setEntries]   = useState([]);
  const [summary, setSummary]   = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
  const [mealType, setMealType] = useState('snack');
  const [searchOpen, setSearchOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [quickFoods, setQuickFoods] = useState([]);
  const [custom, setCustom]     = useState({ foodName: '', calories: '', protein: '', carbs: '', fat: '' });
  const [importSearch, setImportSearch] = useState('');
  const [importResults, setImportResults] = useState([]);
  const [selectedFoodToLog, setSelectedFoodToLog] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const refresh = useCallback(async () => {
    const [e, s] = await Promise.all([getFoodLogForDate(targetDate), getDailySummary(targetDate)]);
    setEntries(e); setSummary(s);
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

  // Offline food import search
  useEffect(() => {
    if (importSearch.length > 1) {
      const q = importSearch.toLowerCase();
      setImportResults(offlineFoods.filter(f => (f.name || '').toLowerCase().includes(q)).slice(0, 6));
    } else {
      setImportResults([]);
    }
  }, [importSearch]);

  const handleSelect = (food) => {
    setSelectedFoodToLog({ foodName: food.foodName || food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat });
    setQuantity(1);
    setSearchOpen(false);
  };

  const handleQuickSelect = (food) => {
    setSelectedFoodToLog({ foodName: food.foodName, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat });
    setQuantity(1);
  };

  const commitLog = async () => {
    if (!selectedFoodToLog) return;
    const q = Number(quantity) || 1;
    await addFoodEntry({
      foodName: selectedFoodToLog.foodName,
      calories: Math.round(+selectedFoodToLog.calories * q),
      protein:  Math.round(+(selectedFoodToLog.protein || 0) * q),
      carbs:    Math.round(+(selectedFoodToLog.carbs || 0) * q),
      fat:      Math.round(+(selectedFoodToLog.fat || 0) * q),
      mealType,
      date: targetDate,
    });
    showToast(`Added ${selectedFoodToLog.foodName}`, '✅');
    setSelectedFoodToLog(null);
    refresh();
    const ach = await checkAndUnlockAchievements();
    if (ach.length > 0) showToast(`🎉 ${ach[0].name}!`, ach[0].icon);
  };

  const handleCustom = async (e) => {
    e.preventDefault();
    if (!custom.foodName.trim() || !custom.calories) return;
    await addFoodEntry({ foodName: custom.foodName.trim(), calories: +custom.calories, protein: +(custom.protein || 0), carbs: +(custom.carbs || 0), fat: +(custom.fat || 0), mealType, date: targetDate });
    await addCustomFood({ name: custom.foodName.trim(), calories: +custom.calories, protein: +(custom.protein || 0), carbs: +(custom.carbs || 0), fat: +(custom.fat || 0) });
    showToast(`Added ${custom.foodName}`, '✅');
    setCustom({ foodName: '', calories: '', protein: '', carbs: '', fat: '' });
    setCustomOpen(false);
    refresh();
  };

  const importOfflineFood = (f) => {
    setCustom({ foodName: f.name, calories: String(f.calories), protein: String(f.protein), carbs: String(f.carbs), fat: String(f.fat) });
    setImportSearch(''); setImportResults([]);
  };

  const grouped = {};
  for (const e of entries) { const t = e.mealType || 'snack'; if (!grouped[t]) grouped[t] = []; grouped[t].push(e); }
  const budgetPct = goals.calories > 0 ? Math.min((summary.calories / goals.calories) * 100, 100) : 0;

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
    <div className="page page-enter">
      {/* Date Navigator */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--s-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', padding: '4px 8px' }}>
          <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', color: 'var(--tx-1)', cursor: 'pointer', padding: '0 8px', fontSize: '1.2rem', fontWeight: 300 }}>&lsaquo;</button>
          <button onClick={() => setTargetDate(today)} style={{ background: 'none', border: 'none', color: 'var(--tx-1)', fontSize: '0.85rem', fontWeight: 700, minWidth: '90px', textAlign: 'center', cursor: targetDate === today ? 'default' : 'pointer' }}>{dateStr}</button>
          <button onClick={() => changeDate(1)} disabled={targetDate === today} style={{ background: 'none', border: 'none', color: 'var(--tx-1)', cursor: 'pointer', padding: '0 8px', fontSize: '1.2rem', fontWeight: 300, opacity: targetDate === today ? 0.3 : 1 }}>&rsaquo;</button>
        </div>
      </div>

      {/* Summary header */}
      <div className="log-header-summary">
        <div>
          <div className="log-cal-label">Calories eaten</div>
          <div className="log-cal-big">{Math.round(summary.calories)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--tx-3)', marginTop: '2px' }}>of {goals.calories} kcal</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Remaining</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: budgetPct >= 100 ? 'var(--danger)' : 'var(--accent-bright)', letterSpacing: '-0.04em' }}>
            {Math.max(Math.round(goals.calories - summary.calories), 0)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ height: '6px' }}>
        <div className={`progress-bar ${budgetPct >= 100 ? 'progress-danger' : 'progress-accent'}`} style={{ width: `${budgetPct}%` }} />
      </div>

      {/* Meal type selector */}
      <div className="meal-selector">
        {MEAL_TYPES.map(m => (
          <button key={m.id} className={`meal-sel-btn${mealType === m.id ? ' active' : ''}`} onClick={() => setMealType(m.id)}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="log-actions">
        <button className="log-action primary" onClick={() => setSearchOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search Food Database
        </button>
        <button className="log-action" onClick={() => setCustomOpen(!customOpen)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Custom
        </button>
        <button className="log-action" onClick={() => navigate('/recipes')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          My Recipes
        </button>
      </div>

      {/* Quick add chips */}
      {quickFoods.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 'var(--s-3)' }}>⚡ Quick Add</h2>
          <div className="quick-chips">
            {quickFoods.map((f, i) => (
              <button key={i} className="quick-chip" onClick={() => handleQuickSelect(f)}>
                {f.isFav && <span className="quick-chip-fav">♥</span>}
                <span className="quick-chip-name">{f.foodName}</span>
                <span className="quick-chip-cal">{f.calories}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom food form */}
      {customOpen && (
        <div className="card page-enter">
          <div className="flex-between" style={{ marginBottom: 'var(--s-4)' }}>
            <h2>Add Custom Food</h2>
            <button onClick={() => setCustomOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>

          {/* Import from offline foods */}
          <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
            <label className="form-label">Import from Food Database</label>
            <input
              className="input"
              placeholder="Search to auto-fill from database…"
              value={importSearch}
              onChange={e => setImportSearch(e.target.value)}
            />
            {importResults.length > 0 && (
              <div className="import-dropdown">
                {importResults.map((f, i) => (
                  <div key={i} className="import-dropdown-item" onClick={() => importOfflineFood(f)}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)' }}>{f.calories} kcal · P:{f.protein}g C:{f.carbs}g F:{f.fat}g</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleCustom} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <div className="form-group">
              <label className="form-label">Food Name</label>
              <input className="input" placeholder="e.g. Homemade Dal" value={custom.foodName} onChange={e => setCustom(p => ({ ...p, foodName: e.target.value }))} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Calories</label>
                <input className="input" type="number" placeholder="200" value={custom.calories} onChange={e => setCustom(p => ({ ...p, calories: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Protein (g)</label>
                <input className="input" type="number" placeholder="10" value={custom.protein} onChange={e => setCustom(p => ({ ...p, protein: e.target.value }))} />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 'var(--s-2)' }}>
              <div className="form-group">
                <label className="form-label">Carbs (g)</label>
                <input className="input" type="number" placeholder="30" value={custom.carbs} onChange={e => setCustom(p => ({ ...p, carbs: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Fat (g)</label>
                <input className="input" type="number" placeholder="5" value={custom.fat} onChange={e => setCustom(p => ({ ...p, fat: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary btn-block" type="submit">Add & Log Food</button>
          </form>
        </div>
      )}

      {/* Today's diary */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 'var(--s-4)' }}>
          <h2>Today's Log</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--tx-3)' }}>{entries.length} items</span>
        </div>
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">Nothing logged yet</div>
            <div className="empty-desc">Search for a food or add a custom entry above</div>
          </div>
        ) : (
          MEAL_TYPES.map(meal => {
            const items = grouped[meal.id];
            if (!items || items.length === 0) return null;
            const mealCals = items.reduce((s, e) => s + Number(e.calories), 0);
            return (
              <div key={meal.id} className="diary-meal-section">
                <div className="diary-meal-header">
                  <div className="diary-meal-left">
                    <span className="diary-meal-icon">{meal.icon}</span>
                    <span className="diary-meal-name">{meal.label}</span>
                    <span className="diary-meal-cals">{Math.round(mealCals)} kcal</span>
                  </div>
                </div>
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
              </div>
            );
          })
        )}
      </div>

      <FoodSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={handleSelect} />

      {/* Quantity modal */}
      {selectedFoodToLog && (
        <>
          <div className="modal-backdrop" onClick={() => setSelectedFoodToLog(null)} />
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s-2)' }}>Adding to {mealType}</div>
            <h3 style={{ marginBottom: 'var(--s-5)' }}>{selectedFoodToLog.foodName}</h3>
            <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
              <label className="form-label">Servings / Quantity Multiplier</label>
              <input type="number" step="0.1" min="0.1" className="input" value={quantity} onChange={e => setQuantity(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s-2)', marginBottom: 'var(--s-5)' }}>
              {[
                { label: 'Calories', val: Math.round(+selectedFoodToLog.calories * (Number(quantity)||1)), color: 'var(--accent-bright)' },
                { label: 'Protein',  val: `${Math.round(+(selectedFoodToLog.protein||0) * (Number(quantity)||1))}g`, color: 'var(--protein)' },
                { label: 'Carbs',    val: `${Math.round(+(selectedFoodToLog.carbs||0) * (Number(quantity)||1))}g`, color: 'var(--carbs)' },
                { label: 'Fat',      val: `${Math.round(+(selectedFoodToLog.fat||0) * (Number(quantity)||1))}g`, color: 'var(--fat)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: 'var(--s-3)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, color: s.color, fontSize: '0.95rem' }}>{s.val}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--tx-3)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
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
