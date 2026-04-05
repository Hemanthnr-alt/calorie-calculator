import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useTheme, THEME_IDS } from '../context/ThemeContext.jsx';

const GOALS = [
  { id: 'cut',      icon: '🔥', label: 'Lose Weight',     desc: '-500 kcal deficit',  offset: -500 },
  { id: 'maintain', icon: '⚖️', label: 'Maintain Weight', desc: 'Stay at current',   offset: 0 },
  { id: 'bulk',     icon: '💪', label: 'Build Muscle',    desc: '+500 kcal surplus',  offset: 500 },
];
const ACTIVITIES = [
  { id: 'sedentary', icon: '🪑', label: 'Sedentary',  desc: 'Little exercise',    mult: 1.2 },
  { id: 'light',     icon: '🚶', label: 'Light',      desc: '1–3 days/week',      mult: 1.375 },
  { id: 'moderate',  icon: '🏃', label: 'Moderate',   desc: '3–5 days/week',      mult: 1.55 },
  { id: 'active',    icon: '🏋️', label: 'Active',     desc: '6–7 days/week',      mult: 1.725 },
  { id: 'extreme',   icon: '⚡', label: 'Athlete',    desc: 'Twice daily',         mult: 1.9 },
];
const THEME_BG = {
  dark: '#080810', cosmic: '#07061a', ember: '#100806',
  forest: '#060e08', arctic: '#060a10', midnight: '#05050f', light: '#f4f4f8',
};

export default function Onboarding() {
  const { updateProfile } = useApp();
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ age: '', gender: 'male', weightKg: '', heightCm: '', activityLevel: 'moderate', goal: 'maintain' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const calcResults = () => {
    const w = +f.weightKg || 70, h = +f.heightCm || 175, a = +f.age || 25;
    const bmr    = f.gender === 'male' ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161;
    const mult   = ACTIVITIES.find(x => x.id === f.activityLevel)?.mult || 1.55;
    const off    = GOALS.find(x => x.id === f.goal)?.offset || 0;
    const tdee   = bmr * mult, target = Math.round(tdee + off);
    const protein = Math.round(w * 1.8), fat = Math.round((target * 0.25) / 9), carbs = Math.round((target - protein*4 - fat*9) / 4);
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), target, protein, carbs, fat };
  };

  const finish = async () => {
    const r = calcResults();
    await updateProfile({ age: +f.age||25, gender: f.gender, weightKg: +f.weightKg||70, heightCm: +f.heightCm||175, activityLevel: f.activityLevel, goal: f.goal, dailyCalorieGoal: r.target, dailyProteinGoal: r.protein, dailyCarbsGoal: r.carbs, dailyFatGoal: r.fat, dailyWaterGoalMl: 2500 });
  };

  const STEPS = 5;
  const results = step === 4 ? calcResults() : null;

  return (
    <div className="onboarding" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: 'var(--s-6) var(--px)', maxWidth: 'var(--max-w)', margin: '0 auto' }}>

      {/* Brand */}
      <div style={{ textAlign: 'center', paddingTop: 'var(--s-10)', marginBottom: 'var(--s-8)' }}>
        <div style={{ width: 72, height: 72, borderRadius: 'var(--r-xl)', background: 'linear-gradient(135deg, var(--accent), var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto var(--s-5)', boxShadow: '0 12px 40px var(--accent-glow)' }}>🔥</div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, background: 'linear-gradient(130deg, var(--tx-1), var(--accent-bright))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>30 Calz</h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--tx-3)', marginTop: 'var(--s-2)' }}>Set up your plan in 30 seconds</div>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--s-2)', marginBottom: 'var(--s-6)' }}>
        {Array.from({ length: STEPS }, (_, i) => (
          <div key={i} style={{ height: '4px', borderRadius: 'var(--r-full)', background: i <= step ? 'var(--accent)' : 'rgba(255,255,255,0.1)', width: i === step ? '24px' : '8px', transition: 'all 0.3s var(--ease-spring)', boxShadow: i === step ? '0 0 8px var(--accent-glow)' : 'none' }} />
        ))}
      </div>

      {/* Step content */}
      <div className="card page-enter" style={{ flex: 1, marginBottom: 'var(--s-4)' }}>
        {step === 0 && (
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 'var(--s-5)', color: 'var(--tx-1)' }}>Tell us about you 👋</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
              <div className="gender-grid">
                {[{ id: 'male', icon: '👨', label: 'Male' }, { id: 'female', icon: '👩', label: 'Female' }].map(g => (
                  <button key={g.id} className={`gender-btn${f.gender === g.id ? ' active' : ''}`} onClick={() => set('gender', g.id)}>
                    <span>{g.icon}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{g.label}</span>
                  </button>
                ))}
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Age</label><input className="input" type="number" placeholder="25" value={f.age} onChange={e => set('age', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Weight (kg)</label><input className="input" type="number" step="0.1" placeholder="70" value={f.weightKg} onChange={e => set('weightKg', e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="form-label">Height (cm)</label><input className="input" type="number" placeholder="175" value={f.heightCm} onChange={e => set('heightCm', e.target.value)} /></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 'var(--s-5)', color: 'var(--tx-1)' }}>Activity level 🏃</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              {ACTIVITIES.map(a => (
                <button key={a.id} className={`activity-btn${f.activityLevel === a.id ? ' active' : ''}`} onClick={() => set('activityLevel', a.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', flex: 1 }}>
                    <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, color: 'var(--tx-1)', fontSize: '0.9rem' }}>{a.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)' }}>{a.desc}</div>
                    </div>
                  </div>
                  {f.activityLevel === a.id && <span style={{ color: 'var(--accent-bright)' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 'var(--s-5)', color: 'var(--tx-1)' }}>Your goal 🎯</div>
            <div className="goal-grid">
              {GOALS.map(g => (
                <button key={g.id} className={`goal-btn${f.goal === g.id ? ' active' : ''}`} onClick={() => set('goal', g.id)}>
                  <div className="goal-btn-icon">{g.icon}</div>
                  <div>
                    <div className="goal-btn-label">{g.label}</div>
                    <div className="goal-btn-desc">{g.desc}</div>
                  </div>
                  {f.goal === g.id && <span style={{ color: 'var(--accent-bright)', marginLeft: 'auto' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 'var(--s-5)', color: 'var(--tx-1)' }}>Pick your theme 🎨</div>
            <div className="theme-grid">
              {THEME_IDS.map(t => (
                <button key={t.id} className={`theme-card${theme.themeId === t.id ? ' active' : ''}`} onClick={() => theme.setThemeId(t.id)}>
                  <div className="theme-card-swatch" style={{ background: THEME_BG[t.id] || '#080810', border: '2px solid', borderColor: theme.themeId === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }} />
                  <div className="theme-card-name">{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && results && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 'var(--s-5)', color: 'var(--tx-1)' }}>Your plan is ready! 🚀</div>
            <div style={{ background: 'var(--accent-fill)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s-5)', marginBottom: 'var(--s-4)' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-heading)', letterSpacing: '-0.05em', color: 'var(--accent-bright)', lineHeight: 1 }}>{results.target}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--tx-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>kcal per day</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-3)' }}>
              {[
                { label: 'Protein', val: results.protein, unit: 'g', color: 'var(--protein)' },
                { label: 'Carbs',   val: results.carbs,   unit: 'g', color: 'var(--carbs)' },
                { label: 'Fat',     val: results.fat,     unit: 'g', color: 'var(--fat)' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: 'var(--s-4)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 900, color: m.color, fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>{m.val}<span style={{ fontSize: '0.75rem' }}>{m.unit}</span></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
        {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
        {step < STEPS - 1
          ? <button className="btn btn-primary btn-block" onClick={() => setStep(s => s + 1)}>Continue →</button>
          : <button className="btn btn-primary btn-block" onClick={finish}>Start Tracking 🚀</button>
        }
      </div>
    </div>
  );
}
