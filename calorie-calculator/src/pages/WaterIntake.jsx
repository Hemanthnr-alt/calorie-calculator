import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import * as offlineStore from '../lib/offlineStore.js';

export default function WaterIntake({ token, userId, offline }) {
  const [water, setWater] = useState([]);
  const [totalWater, setTotalWater] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [, setLoading] = useState(true);

  const refreshLocal = useCallback(() => {
    const w = offlineStore.getWaterState(userId);
    setWater(w.entries);
    setTotalWater(w.total);
  }, [userId]);

  useEffect(() => {
    if (offline) {
      const storedGoal = localStorage.getItem(`water_goal_${userId}`);
      const fromProfile = offlineStore.getLocalProfile(userId)?.daily_water_goal_ml;
      setDailyGoal(Number(storedGoal || fromProfile || 2000));
      refreshLocal();
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const res = await apiFetch(`/water-intake/${userId}`);
        const data = await res.json();
        setWater(data.entries || []);
        setTotalWater(data.total || 0);
      } catch (err) {
        console.error('Error fetching water intake:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userId, offline, refreshLocal]);

  const addWater = async (amount) => {
    if (offline) {
      offlineStore.addWaterEntry(userId, amount);
      refreshLocal();
      return;
    }
    try {
      const res = await apiFetch('/water-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, amount_ml: amount }),
      });
      await res.json();
      const r = await apiFetch(`/water-intake/${userId}`);
      const data = await r.json();
      setWater(data.entries || []);
      setTotalWater(data.total || 0);
    } catch (err) {
      console.error('Error adding water:', err);
    }
  };

  const deleteWater = async (id) => {
    if (offline) {
      offlineStore.deleteWaterEntry(userId, id);
      refreshLocal();
      return;
    }
    try {
      await apiFetch(`/water-intake/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const r = await apiFetch(`/water-intake/${userId}`);
      const data = await r.json();
      setWater(data.entries || []);
      setTotalWater(data.total || 0);
    } catch (err) {
      console.error('Error deleting water:', err);
    }
  };

  const onGoalChange = (value) => {
    const n = parseInt(value, 10);
    setDailyGoal(Number.isFinite(n) ? n : 2000);
    if (offline) {
      localStorage.setItem(`water_goal_${userId}`, String(n));
      const prev = offlineStore.getLocalProfile(userId) || {};
      offlineStore.setLocalProfile(userId, { ...prev, daily_water_goal_ml: n });
    }
  };

  const percentage = Math.min((totalWater / Math.max(dailyGoal, 1)) * 100, 100);

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Water intake</h1>
        <p>Quick-add common amounts, tune your goal, and review today&apos;s log in one place.</p>
      </div>

      <div className="stat-hero-card">
        <div className="stat-hero-value">{totalWater} ml</div>
        <div className="stat-hero-label">of {dailyGoal} ml daily goal</div>
        <div className="water-progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percentage}%` }} />
          </div>
        </div>
        <div className="stat-hero-sub">{percentage.toFixed(0)}% of goal</div>
      </div>

      <div className="card">
        <h2>Quick add</h2>
        <p className="settings-subcopy" style={{ marginTop: '-0.35rem' }}>
          Tap a preset — entries are timestamped for today.
        </p>
        <div className="stat-chip-grid">
          <button type="button" className="btn btn-primary" onClick={() => addWater(250)}>
            +250 ml
          </button>
          <button type="button" className="btn btn-primary" onClick={() => addWater(500)}>
            +500 ml
          </button>
          <button type="button" className="btn btn-primary" onClick={() => addWater(750)}>
            +750 ml
          </button>
          <button type="button" className="btn btn-primary" onClick={() => addWater(1000)}>
            +1 L
          </button>
        </div>

        <div className="form-group" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
          <label className="form-label" htmlFor="water-goal">
            Daily goal (ml)
          </label>
          <input
            id="water-goal"
            className="input"
            type="number"
            value={dailyGoal}
            onChange={(e) => onGoalChange(e.target.value)}
            placeholder="e.g. 2000"
          />
        </div>
      </div>

      <div className="card">
        <div className="meal-prep-progress-head">
          <h2>Today&apos;s log</h2>
          <Link to="/settings" className="btn btn-ghost btn-compact">
            Edit in settings
          </Link>
        </div>
        {water.length === 0 ? (
          <p className="empty-inline">No water logged yet — use quick add above.</p>
        ) : (
          <div className="water-log-list">
            {water.map((entry) => (
              <div key={entry.id} className="water-log-row">
                <div>
                  <strong className="water-log-amount">{entry.amount_ml} ml</strong>
                  <div className="shop-row-meta">{new Date(entry.date).toLocaleTimeString()}</div>
                </div>
                <button type="button" className="btn btn-outline btn-compact" onClick={() => deleteWater(entry.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
