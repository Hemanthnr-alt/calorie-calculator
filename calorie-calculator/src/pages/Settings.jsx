import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useTheme, THEME_IDS } from '../context/ThemeContext.jsx';
import { unlockAchievement, db } from '../db/database.js';
import {
  requestPermission, getPermissionStatus, getReminders,
  addReminder, removeReminder, toggleReminder, DEFAULT_REMINDERS, initNotifications,
} from '../lib/notifications.js';

const ACTIVITIES = [
  { id: 'sedentary', label: 'Sedentary', mult: 1.2 },
  { id: 'light',     label: 'Light (1-3d/wk)',   mult: 1.375 },
  { id: 'moderate',  label: 'Moderate (3-5d/wk)', mult: 1.55 },
  { id: 'active',    label: 'Active (6-7d/wk)',   mult: 1.725 },
  { id: 'extreme',   label: 'Very Active',         mult: 1.9 },
];
const GOAL_OFFSETS = [
  { id: 'cut',      label: 'Lose Weight (-500)',  offset: -500 },
  { id: 'maintain', label: 'Maintain Weight',     offset: 0 },
  { id: 'bulk',     label: 'Gain Weight (+500)',  offset: 500 },
];
const THEME_COLORS = {
  dark:     ['#080810','#141422'], cosmic:   ['#07061a','#141232'],
  ember:    ['#100806','#221812'], forest:   ['#060e08','#122118'],
  arctic:   ['#060a10','#141e2c'], midnight: ['#05050f','#10102c'],
  light:    ['#f4f4f8','#ececf4'],
};

export default function Settings() {
  const { profile, goals, updateProfile, showToast } = useApp();
  const theme = useTheme();
  const [section, setSection] = useState(null);
  const [form, setForm]   = useState({ dailyCalorieGoal: goals.calories, dailyProteinGoal: goals.protein, dailyCarbsGoal: goals.carbs, dailyFatGoal: goals.fat, dailyWaterGoalMl: goals.water });
  const [calc, setCalc]   = useState({ weight: profile?.weightKg || '', height: profile?.heightCm || '', age: profile?.age || '', gender: profile?.gender || 'male', activity: 'moderate', goal: 'maintain' });
  const [calcResult, setCalcResult] = useState(null);
  const [notifPerm, setNotifPerm]   = useState(getPermissionStatus());
  const [reminders, setReminders]   = useState(getReminders());
  const [newRemHour, setNewRemHour] = useState('12');
  const [newRemMin, setNewRemMin]   = useState('00');
  const [newRemLabel, setNewRemLabel] = useState('');

  const toggle = (s) => setSection(section === s ? null : s);
  const setF   = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setC   = (k, v) => setCalc(p => ({ ...p, [k]: v }));

  const saveGoals = async () => {
    await updateProfile({ dailyCalorieGoal: +form.dailyCalorieGoal||2000, dailyProteinGoal: +form.dailyProteinGoal||120, dailyCarbsGoal: +form.dailyCarbsGoal||220, dailyFatGoal: +form.dailyFatGoal||65, dailyWaterGoalMl: +form.dailyWaterGoalMl||2500 });
    showToast('Goals saved', '✅');
  };

  const calculate = (e) => {
    e.preventDefault();
    const w = +calc.weight||70, h = +calc.height||175, a = +calc.age||25;
    const bmr    = calc.gender === 'male' ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161;
    const mult   = ACTIVITIES.find(x => x.id === calc.activity)?.mult || 1.55;
    const off    = GOAL_OFFSETS.find(x => x.id === calc.goal)?.offset || 0;
    const tdee   = bmr * mult, target = tdee + off;
    const protein = Math.round(w * 1.8), fat = Math.round((target*0.25)/9), carbs = Math.round((target - protein*4 - fat*9)/4);
    setCalcResult({ bmr: Math.round(bmr), tdee: Math.round(tdee), target: Math.round(target), protein, carbs, fat });
  };

  const applyCalc = async () => {
    if (!calcResult) return;
    await updateProfile({ weightKg: +calc.weight||70, heightCm: +calc.height||175, age: +calc.age||25, gender: calc.gender, dailyCalorieGoal: calcResult.target, dailyProteinGoal: calcResult.protein, dailyCarbsGoal: calcResult.carbs, dailyFatGoal: calcResult.fat });
    setForm(p => ({ ...p, dailyCalorieGoal: calcResult.target, dailyProteinGoal: calcResult.protein, dailyCarbsGoal: calcResult.carbs, dailyFatGoal: calcResult.fat }));
    showToast('Goals applied!', '✅');
  };

  const changeTheme = async (id) => {
    theme.setThemeId(id);
    const r = await unlockAchievement('theme_changed');
    if (r) showToast(`🎉 ${r.name}!`, r.icon);
  };

  const enableNotifications = async () => {
    const result = await requestPermission(); setNotifPerm(result);
    if (result === 'granted') {
      if (getReminders().length === 0) { for (const r of DEFAULT_REMINDERS) addReminder(r.label, r.hour, r.minute); setReminders(getReminders()); }
      initNotifications(); showToast('Notifications enabled', '🔔');
    }
  };

  const clearData = async () => {
    if (!window.confirm('Delete ALL data? This cannot be undone.')) return;
    await db.delete(); localStorage.clear(); window.location.reload();
  };

  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';

  const MENU = [
    { id: 'goals',         icon: '🎯', label: 'Daily Goals',       desc: `${goals.calories} kcal · ${goals.protein}g Protein` },
    { id: 'calculator',    icon: '🧮', label: 'TDEE Calculator',   desc: 'Calculate your ideal intake' },
    { id: 'appearance',    icon: '🎨', label: 'Appearance',        desc: `${THEME_IDS.find(t => t.id === theme.themeId)?.label || 'Dark'} theme` },
    { id: 'notifications', icon: '🔔', label: 'Notifications',     desc: notifPerm === 'granted' ? `${reminders.filter(r => r.enabled).length} active` : 'Tap to enable' },
    { id: 'data',          icon: '🗃️', label: 'Data & Privacy',   desc: 'All data stored locally' },
  ];

  return (
    <div className="page page-enter">
      {/* Profile card */}
      <div className="profile-card">
        <div className="profile-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="profile-name">{profile?.weightKg ? `${profile.weightKg} kg · ${profile.heightCm} cm` : '30 Calz User'}</div>
          <div className="profile-meta">Member since {memberSince}</div>
          <div className="profile-stats">
            <div className="profile-stat"><div className="profile-stat-val">{goals.calories}</div><div className="profile-stat-label">Goal</div></div>
            <div className="profile-stat"><div className="profile-stat-val">{goals.protein}g</div><div className="profile-stat-label">Protein</div></div>
            <div className="profile-stat"><div className="profile-stat-val">{goals.carbs}g</div><div className="profile-stat-label">Carbs</div></div>
            <div className="profile-stat"><div className="profile-stat-val">{goals.fat}g</div><div className="profile-stat-label">Fat</div></div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        {MENU.map(item => (
          <div key={item.id}>
            <button className={`settings-item${section === item.id ? ' open' : ''}`} style={{ display: 'flex', width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }} onClick={() => toggle(item.id)}>
              <div className="settings-item-icon">{item.icon}</div>
              <div className="settings-item-body">
                <div className="settings-item-label">{item.label}</div>
                <div className="settings-item-desc">{item.desc}</div>
              </div>
              <div className={`settings-arrow${section === item.id ? ' open' : ''}`}>›</div>
            </button>

            {section === item.id && (
              <div className="card page-enter" style={{ marginTop: 'var(--s-2)', marginBottom: 'var(--s-2)' }}>
                {/* Goals */}
                {item.id === 'goals' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Calories</label><input className="input" type="number" value={form.dailyCalorieGoal} onChange={e => setF('dailyCalorieGoal', e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Protein (g)</label><input className="input" type="number" value={form.dailyProteinGoal} onChange={e => setF('dailyProteinGoal', e.target.value)} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Carbs (g)</label><input className="input" type="number" value={form.dailyCarbsGoal} onChange={e => setF('dailyCarbsGoal', e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Fat (g)</label><input className="input" type="number" value={form.dailyFatGoal} onChange={e => setF('dailyFatGoal', e.target.value)} /></div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Water Goal (ml)</label>
                      <input className="input" type="number" value={form.dailyWaterGoalMl} onChange={e => setF('dailyWaterGoalMl', e.target.value)} />
                    </div>
                    <button className="btn btn-primary btn-block" onClick={saveGoals}>Save Goals</button>
                  </div>
                )}

                {/* TDEE Calculator */}
                {item.id === 'calculator' && (
                  <div>
                    <form onSubmit={calculate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Weight (kg)</label><input className="input" type="number" step="0.1" value={calc.weight} onChange={e => setC('weight', e.target.value)} required /></div>
                        <div className="form-group"><label className="form-label">Height (cm)</label><input className="input" type="number" value={calc.height} onChange={e => setC('height', e.target.value)} required /></div>
                      </div>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Age</label><input className="input" type="number" value={calc.age} onChange={e => setC('age', e.target.value)} required /></div>
                        <div className="form-group"><label className="form-label">Gender</label><select className="input" value={calc.gender} onChange={e => setC('gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></div>
                      </div>
                      <div className="form-group"><label className="form-label">Activity Level</label><select className="input" value={calc.activity} onChange={e => setC('activity', e.target.value)}>{ACTIVITIES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">Goal</label><select className="input" value={calc.goal} onChange={e => setC('goal', e.target.value)}>{GOAL_OFFSETS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
                      <button className="btn btn-secondary btn-block" type="submit">Calculate</button>
                    </form>
                    {calcResult && (
                      <div className="page-enter" style={{ marginTop: 'var(--s-4)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
                          {[
                            { label: 'BMR',    val: calcResult.bmr,     unit: 'kcal' },
                            { label: 'Target', val: calcResult.target,  unit: 'kcal' },
                            { label: 'Protein',val: calcResult.protein, unit: 'g' },
                            { label: 'Carbs',  val: calcResult.carbs,   unit: 'g' },
                          ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center', padding: 'var(--s-4)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                              <div style={{ fontWeight: 900, fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--accent-bright)' }}>{s.val}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)', fontWeight: 600 }}>{s.label} ({s.unit})</div>
                            </div>
                          ))}
                        </div>
                        <button className="btn btn-primary btn-block" onClick={applyCalc}>Apply as My Goals</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Appearance */}
                {item.id === 'appearance' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s-3)' }}>Theme</div>
                      <div className="theme-grid">
                        {THEME_IDS.map(t => (
                          <button key={t.id} className={`theme-card${theme.themeId === t.id ? ' active' : ''}`} onClick={() => changeTheme(t.id)}>
                            <div className="theme-card-swatch" style={{ background: THEME_COLORS[t.id] ? `linear-gradient(135deg, ${THEME_COLORS[t.id][0]}, ${THEME_COLORS[t.id][1]})` : '#080810' }} />
                            <div className="theme-card-name">{t.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s-3)' }}>Display</div>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Corners</label><select className="input" value={theme.radius} onChange={e => theme.setRadius(e.target.value)}><option value="sharp">Sharp</option><option value="default">Default</option><option value="round">Round</option></select></div>
                        <div className="form-group"><label className="form-label">Font Size</label><select className="input" value={theme.fontScale} onChange={e => theme.setFontScale(e.target.value)}><option value="sm">Small</option><option value="base">Default</option><option value="lg">Large</option></select></div>
                      </div>
                  </div>
                )}

                {/* Notifications */}
                {item.id === 'notifications' && (
                  <div>
                    {notifPerm !== 'granted' ? (
                      <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx-2)', marginBottom: 'var(--s-4)', lineHeight: 1.5 }}>Get meal reminders to stay on track with your nutrition goals.</p>
                        <button className="btn btn-primary btn-block" onClick={enableNotifications}>🔔 Enable Notifications</button>
                        {notifPerm === 'denied' && <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 'var(--s-2)', textAlign: 'center' }}>Blocked — enable in browser settings</p>}
                      </div>
                    ) : (
                      <div>
                        <div className="diary-meal-items" style={{ marginBottom: 'var(--s-4)' }}>
                          {reminders.map(r => (
                            <div key={r.id} className="diary-food-item">
                              <div className="diary-food-info">
                                <div className="diary-food-name">{r.label}</div>
                                <div className="diary-food-macros">{String(r.hour).padStart(2,'0')}:{String(r.minute).padStart(2,'0')}</div>
                              </div>
                              <button className={`toggle${r.enabled ? ' on' : ''}`} onClick={() => setReminders(toggleReminder(r.id))} />
                              <button className="diary-food-delete" style={{ opacity: 1 }} onClick={() => setReminders(removeReminder(r.id))}>✕</button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'flex-end' }}>
                          <div className="form-group" style={{ flex: 1 }}><label className="form-label">Label</label><input className="input" placeholder="Lunch reminder" value={newRemLabel} onChange={e => setNewRemLabel(e.target.value)} /></div>
                          <div className="form-group" style={{ width: 56 }}><label className="form-label">Hr</label><input className="input" type="number" min="0" max="23" value={newRemHour} onChange={e => setNewRemHour(e.target.value)} /></div>
                          <div className="form-group" style={{ width: 56 }}><label className="form-label">Min</label><input className="input" type="number" min="0" max="59" value={newRemMin} onChange={e => setNewRemMin(e.target.value)} /></div>
                          <button className="btn btn-primary btn-sm" onClick={() => { if (!newRemLabel.trim()) return; setReminders(addReminder(newRemLabel.trim(), parseInt(newRemHour), parseInt(newRemMin))); setNewRemLabel(''); }}>+</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Data & Privacy */}
                {item.id === 'data' && (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--tx-2)', marginBottom: 'var(--s-2)', lineHeight: 1.5 }}>All data is stored locally in IndexedDB on your device. Nothing is sent to any server.</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginBottom: 'var(--s-5)' }}>30 Calz v4.0 · Offline-first PWA · Built for privacy</p>
                    <button className="btn btn-danger btn-block" onClick={clearData}>🗑️ Delete All Data</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
