import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import * as offlineStore from '../lib/offlineStore.js';

export default function Workouts({ token, userId, offline }) {
  const [workouts, setWorkouts] = useState([]);
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0);
  const [formData, setFormData] = useState({
    exercise_name: '',
    duration_minutes: '',
    calories_burned: '',
    intensity: 'moderate',
  });
  const [, setLoading] = useState(true);

  const refreshLocal = useCallback(() => {
    const bundle = offlineStore.getWorkoutsBundle(userId);
    setWorkouts(bundle.workouts || []);
    setTotalCaloriesBurned(bundle.total_calories_burned || 0);
  }, [userId]);

  useEffect(() => {
    if (offline) {
      refreshLocal();
      setLoading(false);
      return;
    }

    const fetchWorkouts = async () => {
      try {
        const res = await apiFetch(`/workouts/${userId}`);
        const data = await res.json();
        setWorkouts(data.workouts || []);
        setTotalCaloriesBurned(data.total_calories_burned || 0);
      } catch (err) {
        console.error('Error fetching workouts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkouts();
  }, [userId, offline, refreshLocal]);

  const addWorkout = async (e) => {
    e.preventDefault();
    if (!formData.exercise_name || !formData.duration_minutes) {
      alert('Please fill in all fields');
      return;
    }

    const payload = {
      user_id: userId,
      exercise_name: formData.exercise_name,
      duration_minutes: parseInt(formData.duration_minutes, 10),
      calories_burned: parseInt(formData.calories_burned, 10) || 0,
      intensity: formData.intensity,
      date: new Date().toISOString(),
    };

    if (offline) {
      offlineStore.addWorkout(userId, payload);
      setFormData({ exercise_name: '', duration_minutes: '', calories_burned: '', intensity: 'moderate' });
      refreshLocal();
      return;
    }

    try {
      const res = await apiFetch('/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          ...formData,
          duration_minutes: parseInt(formData.duration_minutes, 10),
          calories_burned: parseInt(formData.calories_burned, 10) || 0,
        }),
      });
      await res.json();
      setFormData({ exercise_name: '', duration_minutes: '', calories_burned: '', intensity: 'moderate' });
      const r = await apiFetch(`/workouts/${userId}`);
      const data = await r.json();
      setWorkouts(data.workouts || []);
      setTotalCaloriesBurned(data.total_calories_burned || 0);
    } catch (err) {
      console.error('Error adding workout:', err);
    }
  };

  const deleteWorkout = async (id) => {
    if (offline) {
      offlineStore.deleteWorkout(userId, id);
      refreshLocal();
      return;
    }
    try {
      await apiFetch(`/workouts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const r = await apiFetch(`/workouts/${userId}`);
      const data = await r.json();
      setWorkouts(data.workouts || []);
      setTotalCaloriesBurned(data.total_calories_burned || 0);
    } catch (err) {
      console.error('Error deleting workout:', err);
    }
  };

  const exercises = [
    { name: 'Running (6 mph)', caloriesPerMinute: 10 },
    { name: 'Cycling', caloriesPerMinute: 8 },
    { name: 'Swimming', caloriesPerMinute: 11 },
    { name: 'Walking', caloriesPerMinute: 5 },
    { name: 'Weight Training', caloriesPerMinute: 6 },
    { name: 'HIIT', caloriesPerMinute: 12 },
    { name: 'Yoga', caloriesPerMinute: 3 },
    { name: 'Basketball', caloriesPerMinute: 9 }
  ];

  const handleExerciseChange = (exerciseName) => {
    const exercise = exercises.find(e => e.name === exerciseName);
    setFormData({
      ...formData,
      exercise_name: exerciseName,
      calories_burned: exercise && formData.duration_minutes ? (exercise.caloriesPerMinute * parseInt(formData.duration_minutes)) : ''
    });
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Workouts</h1>
        <p>Log sessions with duration and effort — burn estimates update your diary context.</p>
      </div>

      <div className="stat-hero-card">
        <div className="stat-hero-value">{totalCaloriesBurned}</div>
        <div className="stat-hero-label">kcal logged today</div>
      </div>

      <div className="card">
        <h2>Add session</h2>
        <p className="settings-subcopy" style={{ marginTop: '-0.35rem' }}>
          Pick a template exercise or overwrite calories if you wear a dedicated tracker.
        </p>
        <form onSubmit={addWorkout}>
          <div className="form-group">
            <label className="form-label" htmlFor="wo-exercise">
              Exercise
            </label>
            <select
              id="wo-exercise"
              value={formData.exercise_name}
              onChange={(e) => handleExerciseChange(e.target.value)}
              required
            >
              <option value="">Select type</option>
              {exercises.map((ex) => (
                <option key={ex.name} value={ex.name}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="wo-duration">
                Duration (min)
              </label>
              <input
                id="wo-duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => {
                  const duration = e.target.value;
                  const exercise = exercises.find((ex) => ex.name === formData.exercise_name);
                  setFormData({
                    ...formData,
                    duration_minutes: duration,
                    calories_burned:
                      exercise && duration ? exercise.caloriesPerMinute * parseInt(duration, 10) : '',
                  });
                }}
                placeholder="45"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="wo-cal">
                Calories burn
              </label>
              <input
                id="wo-cal"
                type="number"
                value={formData.calories_burned}
                onChange={(e) => setFormData({ ...formData, calories_burned: e.target.value })}
                placeholder="Auto"
              />
            </div>
          </div>
          <p className="form-hint-inline">Estimated from exercise + duration until you edit the value.</p>

          <div className="form-group">
            <label className="form-label" htmlFor="wo-intensity">
              Intensity
            </label>
            <select
              id="wo-intensity"
              value={formData.intensity}
              onChange={(e) => setFormData({ ...formData, intensity: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="very-high">Very high</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Log workout
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Recent sessions</h2>
        {workouts.length === 0 ? (
          <p className="empty-inline">No workouts yet — your next session starts with the form above.</p>
        ) : (
          <div className="water-log-list">
            {workouts.map((workout) => (
              <div key={workout.id} className="water-log-row">
                <div className="food-item-content">
                  <strong>{workout.exercise_name}</strong>
                  <div className="food-item-macros">
                    {workout.duration_minutes} min · {workout.intensity}
                  </div>
                  <div className="food-item-date">{new Date(workout.date).toLocaleTimeString()}</div>
                </div>
                <div className="barcode-queue-actions">
                  <div className="workout-kcal-pill">
                    <div className="workout-kcal-val">{workout.calories_burned}</div>
                    <div className="workout-kcal-unit">kcal</div>
                  </div>
                  <button type="button" className="btn btn-outline btn-compact" onClick={() => deleteWorkout(workout.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
