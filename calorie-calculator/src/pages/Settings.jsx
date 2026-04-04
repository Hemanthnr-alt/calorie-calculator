import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import * as offlineStore from '../lib/offlineStore.js';
import { useTheme, THEME_IDS } from '../context/ThemeContext.jsx';

const ACCENT_PRESETS = [
  { hue: 168, label: 'Teal' },
  { hue: 200, label: 'Blue' },
  { hue: 250, label: 'Violet' },
  { hue: 135, label: 'Green' },
  { hue: 22,  label: 'Amber' },
  { hue: 340, label: 'Rose' },
];

export default function Settings({ token, userId, user, offline }) {
  const { themeId, setThemeId, accentHue, setAccentHue, radius, setRadius, density, setDensity, fontScale, setFontScale } =
    useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [motionPreset, setMotionPreset] = useState(() => localStorage.getItem('motionPreset') || 'standard');
  const [profile, setProfile] = useState({
    age: '',
    gender: 'male',
    weight_kg: '',
    height_cm: '',
    daily_calorie_goal: 1700,
    daily_protein_goal: 85,
    daily_carbs_goal: 213,
    daily_fat_goal: 57,
    daily_water_goal_ml: 2000,
  });

  useEffect(() => {
    let mounted = true;

    if (offline) {
      try {
        const dg = JSON.parse(localStorage.getItem('dailyGoals') || '{}');
        const lp = offlineStore.getLocalProfile(userId) || {};
        setProfile({
          age: lp.age ?? '',
          gender: lp.gender ?? 'male',
          weight_kg: lp.weight_kg ?? '',
          height_cm: lp.height_cm ?? '',
          daily_calorie_goal: Number(dg.calories ?? lp.daily_calorie_goal ?? 1700),
          daily_protein_goal: Number(dg.protein ?? lp.daily_protein_goal ?? 85),
          daily_carbs_goal: Number(dg.carbs ?? lp.daily_carbs_goal ?? 213),
          daily_fat_goal: Number(dg.fat ?? lp.daily_fat_goal ?? 57),
          daily_water_goal_ml: Number(lp.daily_water_goal_ml ?? 2000),
        });
      } catch {
        setError('Could not load local settings');
      } finally {
        setLoading(false);
      }
      return () => {
        mounted = false;
      };
    }

    const fetchProfile = async () => {
      try {
        const res = await apiFetch(`/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();

        if (!mounted) return;
        setProfile({
          age: data.age || '',
          gender: data.gender || 'male',
          weight_kg: data.weight_kg || '',
          height_cm: data.height_cm || '',
          daily_calorie_goal: Number(data.daily_calorie_goal || 1700),
          daily_protein_goal: Number(data.daily_protein_goal || 85),
          daily_carbs_goal: Number(data.daily_carbs_goal || 213),
          daily_fat_goal: Number(data.daily_fat_goal || 57),
          daily_water_goal_ml: Number(data.daily_water_goal_ml || 2000),
        });
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, [token, userId, offline]);

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload = {
      age: profile.age ? Number(profile.age) : null,
      gender: profile.gender || null,
      weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
      height_cm: profile.height_cm ? Number(profile.height_cm) : null,
      daily_calorie_goal: Number(profile.daily_calorie_goal || 1700),
      daily_protein_goal: Number(profile.daily_protein_goal || 85),
      daily_carbs_goal: Number(profile.daily_carbs_goal || 213),
      daily_fat_goal: Number(profile.daily_fat_goal || 57),
      daily_water_goal_ml: Number(profile.daily_water_goal_ml || 2000),
    };

    try {
      if (offline) {
        const dailyGoals = {
          calories: payload.daily_calorie_goal,
          protein: payload.daily_protein_goal,
          carbs: payload.daily_carbs_goal,
          fat: payload.daily_fat_goal,
        };
        localStorage.setItem('dailyGoals', JSON.stringify(dailyGoals));
        offlineStore.setLocalProfile(userId, {
          ...offlineStore.getLocalProfile(userId),
          age: payload.age,
          gender: payload.gender,
          weight_kg: payload.weight_kg,
          height_cm: payload.height_cm,
          daily_calorie_goal: payload.daily_calorie_goal,
          daily_protein_goal: payload.daily_protein_goal,
          daily_carbs_goal: payload.daily_carbs_goal,
          daily_fat_goal: payload.daily_fat_goal,
          daily_water_goal_ml: payload.daily_water_goal_ml,
        });
        localStorage.setItem(`water_goal_${userId}`, String(payload.daily_water_goal_ml));
        setMessage('Saved on this device.');
        return;
      }

      const res = await apiFetch(`/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      const dailyGoals = {
        calories: payload.daily_calorie_goal,
        protein: payload.daily_protein_goal,
        carbs: payload.daily_carbs_goal,
        fat: payload.daily_fat_goal,
      };
      localStorage.setItem('dailyGoals', JSON.stringify(dailyGoals));

      setMessage('Settings updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyMotionPreset = (preset) => {
    setMotionPreset(preset);
    localStorage.setItem('motionPreset', preset);
    const motionMap = { calm: 'calm', standard: 'standard', lively: 'lively' };
    document.documentElement.setAttribute('data-motion', motionMap[preset] || 'standard');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage('');
    setPasswordError('');

    if (passwordForm.new_password.length < 8) {
      setPasswordSaving(false);
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordSaving(false);
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      const res = await apiFetch(`/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to update password');

      setPasswordMessage('Password updated successfully.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card settings-loading" role="status">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Account, nutrition targets, appearance, and security in one place.</p>
      </div>

      <div className="settings-page-stack">
      <div className="card settings-hero-strip">
        <div className="settings-hero-cell">
          <span>Calorie target</span>
          <strong>{Number(profile.daily_calorie_goal || 0).toLocaleString()} kcal</strong>
        </div>
        <div className="settings-hero-cell">
          <span>Protein</span>
          <strong>{Number(profile.daily_protein_goal || 0).toFixed(0)} g / day</strong>
        </div>
        <div className="settings-hero-cell">
          <span>Hydration</span>
          <strong>{Number(profile.daily_water_goal_ml || 0).toLocaleString()} ml</strong>
        </div>
      </div>

      <div className="card settings-account-card settings-section-card">
        <h2>Account</h2>
        <div className="settings-account-grid">
          <div>
            <label htmlFor="settings-username-ro">Username</label>
            <p id="settings-username-ro">{user?.username || '—'}</p>
          </div>
          <div>
            <label htmlFor="settings-email-ro">Email</label>
            <p id="settings-email-ro">{user?.email || '—'}</p>
          </div>
        </div>
      </div>

      <form className="card settings-section-card" onSubmit={handleSubmit}>
        <h2>Body & daily targets</h2>
        <p className="settings-subcopy" style={{ marginTop: '-0.5rem' }}>
          Used on your dashboard and for logging. Save when you are done editing.
        </p>
        <h3 className="settings-subheading">Profile</h3>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="set-age">Age</label>
            <input id="set-age" type="number" value={profile.age} onChange={(e) => updateField('age', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-gender">Gender</label>
            <select id="set-gender" value={profile.gender} onChange={(e) => updateField('gender', e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-weight">Weight (kg)</label>
            <input id="set-weight" type="number" step="0.1" value={profile.weight_kg} onChange={(e) => updateField('weight_kg', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-height">Height (cm)</label>
            <input id="set-height" type="number" value={profile.height_cm} onChange={(e) => updateField('height_cm', e.target.value)} />
          </div>
        </div>

        <h3 className="settings-subheading">Daily nutrition goals</h3>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="set-kcal">Calories</label>
            <input id="set-kcal" type="number" value={profile.daily_calorie_goal} onChange={(e) => updateField('daily_calorie_goal', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-protein">Protein (g)</label>
            <input id="set-protein" type="number" step="0.1" value={profile.daily_protein_goal} onChange={(e) => updateField('daily_protein_goal', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-carbs">Carbs (g)</label>
            <input id="set-carbs" type="number" step="0.1" value={profile.daily_carbs_goal} onChange={(e) => updateField('daily_carbs_goal', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-fat">Fat (g)</label>
            <input id="set-fat" type="number" step="0.1" value={profile.daily_fat_goal} onChange={(e) => updateField('daily_fat_goal', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-water">Water (ml)</label>
            <input id="set-water" type="number" value={profile.daily_water_goal_ml} onChange={(e) => updateField('daily_water_goal_ml', e.target.value)} />
          </div>
        </div>

        {message ? <div className="helper-note">{message}</div> : null}
        {error ? <div className="inline-error">{error}</div> : null}

        <div className="settings-form-footer">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {!offline && (
      <form className="card settings-section-card" onSubmit={handlePasswordSubmit}>
        <h2>Security</h2>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="pw-current">Current password</label>
            <input
              id="pw-current"
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => updatePasswordField('current_password', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pw-new">New password</label>
            <input
              id="pw-new"
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => updatePasswordField('new_password', e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pw-confirm">Confirm new password</label>
            <input
              id="pw-confirm"
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => updatePasswordField('confirm_password', e.target.value)}
              minLength={8}
              required
            />
          </div>
        </div>

        {passwordMessage ? <div className="helper-note">{passwordMessage}</div> : null}
        {passwordError ? <div className="inline-error">{passwordError}</div> : null}

        <div className="settings-form-footer">
          <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
            {passwordSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
      )}

      <div className="card settings-section-card">
  <h2>Theme & display</h2>
  <p className="settings-subcopy">Choose a color palette, accent, and layout density. Changes apply instantly.</p>

  <h3 className="settings-subheading">Color palette</h3>
  <div className="theme-preset-grid" role="list">
    {THEME_IDS.map(t => (
      <button
        key={t.id}
        type="button"
        role="listitem"
        className={`theme-preset-btn ${themeId === t.id ? 'active' : ''}`}
        onClick={() => setThemeId(t.id)}
      >
        <strong>{t.label}</strong>
        <span>{t.hint}</span>
      </button>
    ))}
  </div>

  <h3 className="settings-subheading">Accent hue</h3>
  <div className="accent-preset-row" role="group" aria-label="Accent presets">
    {[
      { hue: 168, label: 'Teal (default)' },
      { hue: 200, label: 'Blue' },
      { hue: 250, label: 'Violet' },
      { hue: 135, label: 'Green' },
      { hue: 22,  label: 'Amber' },
      { hue: 340, label: 'Rose' },
    ].map(p => (
      <button
        key={p.hue}
        type="button"
        className={`accent-preset-btn ${accentHue === p.hue ? 'active' : ''}`}
        style={{ background: `hsl(${p.hue} 72% 50%)` }}
        title={p.label}
        aria-label={p.label}
        onClick={() => setAccentHue(p.hue)}
      />
    ))}
  </div>
  <div className="theme-accent-row">
    <label className="form-label" htmlFor="accent-hue-range">
      Fine-tune ({accentHue}°)
    </label>
    <input
      id="accent-hue-range"
      type="range"
      min="0"
      max="360"
      value={accentHue}
      onChange={e => setAccentHue(Number(e.target.value))}
    />
  </div>

  <h3 className="settings-subheading">Text size</h3>
  <div className="theme-ui-row" role="group" aria-label="Text size">
    {[
      { id: 'sm',   label: 'Small' },
      { id: 'base', label: 'Default' },
      { id: 'lg',   label: 'Large' },
    ].map(f => (
      <button
        key={f.id}
        type="button"
        className={`theme-chip ${fontScale === f.id ? 'active' : ''}`}
        onClick={() => setFontScale(f.id)}
      >
        {f.label}
      </button>
    ))}
  </div>

  <h3 className="settings-subheading">Corner style</h3>
  <div className="theme-ui-row" role="group" aria-label="Corner radius">
    {[
      { id: 'sharp',   label: 'Sharp' },
      { id: 'default', label: 'Balanced' },
      { id: 'round',   label: 'Rounded' },
    ].map(r => (
      <button
        key={r.id}
        type="button"
        className={`theme-chip ${radius === r.id ? 'active' : ''}`}
        onClick={() => setRadius(r.id)}
      >
        {r.label}
      </button>
    ))}
  </div>

  <h3 className="settings-subheading">Layout density</h3>
  <div className="theme-ui-row" role="group" aria-label="Density">
    {[
      { id: 'compact',     label: 'Compact' },
      { id: 'comfortable', label: 'Comfortable' },
      { id: 'spacious',    label: 'Spacious' },
    ].map(d => (
      <button
        key={d.id}
        type="button"
        className={`theme-chip ${density === d.id ? 'active' : ''}`}
        onClick={() => setDensity(d.id)}
      >
        {d.label}
      </button>
    ))}
  </div>

  <h3 className="settings-subheading">Motion</h3>
  <div className="motion-preset-group" role="group" aria-label="Animation speed">
    {[
      { value: 'calm',     label: 'Calm',    hint: 'Minimal transitions' },
      { value: 'standard', label: 'Standard',hint: 'Balanced feel' },
      { value: 'lively',   label: 'Lively',  hint: 'More expressive' },
    ].map(p => (
      <button
        key={p.value}
        type="button"
        className={`motion-preset-chip ${motionPreset === p.value ? 'active' : ''}`}
        onClick={() => applyMotionPreset(p.value)}
      >
        <strong>{p.label}</strong>
        <span>{p.hint}</span>
      </button>
    ))}
  </div>
</div>
      </div>
    </div>
  );
}
