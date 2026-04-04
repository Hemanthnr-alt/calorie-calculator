import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import * as offlineStore from '../lib/offlineStore.js';
import foodsOffline from '../data/foods-offline.json';

function buildOfflineRecommendations(userId) {
  let goals;
  try {
    const dg = JSON.parse(localStorage.getItem('dailyGoals') || '{}');
    goals = {
      calories: Number(dg.calories || 2000),
      protein: Number(dg.protein || 120),
      carbs: Number(dg.carbs || 220),
      fat: Number(dg.fat || 65),
    };
  } catch {
    goals = { calories: 2000, protein: 120, carbs: 220, fat: 65 };
  }

  const consumed = offlineStore.getDailySummary(userId);
  const remaining = {
    calories: Math.max(goals.calories - Number(consumed.total_calories || 0), 0),
    protein: Math.max(goals.protein - Number(consumed.total_protein || 0), 0),
    carbs: Math.max(goals.carbs - Number(consumed.total_carbs || 0), 0),
    fat: Math.max(goals.fat - Number(consumed.total_fat || 0), 0),
  };

  if (remaining.calories <= 0) {
    return { remaining, recommendations: [] };
  }

  const targetMealCalories = Math.max(Math.min(remaining.calories, 650), 120);
  const lowerCalorieBound = Math.max(targetMealCalories * 0.35, 40);
  const upperCalorieBound = Math.min(targetMealCalories * 1.15, 900);

  const pool = foodsOffline.filter((f) => {
    const c = Number(f.calories);
    return c >= lowerCalorieBound && c <= upperCalorieBound;
  });

  const scored = pool
    .map((food) => {
      const normalized = {
        id: food.name,
        name: food.name,
        calories: Number(food.calories || 0),
        protein: Number(food.protein || 0),
        carbs: Number(food.carbs || 0),
        fat: Number(food.fat || 0),
      };
      const proteinFit =
        remaining.protein > 0
          ? 1 - Math.abs(normalized.protein - remaining.protein) / Math.max(remaining.protein, 1)
          : 0;
      const carbsFit =
        remaining.carbs > 0 ? 1 - Math.abs(normalized.carbs - remaining.carbs) / Math.max(remaining.carbs, 1) : 0;
      const fatFit =
        remaining.fat > 0 ? 1 - Math.abs(normalized.fat - remaining.fat) / Math.max(remaining.fat, 1) : 0;
      const calorieFit = 1 - Math.abs(normalized.calories - targetMealCalories) / Math.max(targetMealCalories, 1);
      const matchScore = Math.max(
        0,
        Math.min(1, proteinFit) * 0.35 +
          Math.min(1, carbsFit) * 0.25 +
          Math.min(1, fatFit) * 0.25 +
          Math.min(1, calorieFit) * 0.15
      );
      return { ...normalized, matchScore };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  return { remaining, recommendations: scored };
}

export default function MealRecommendations({ token, userId, onAddFood, offline }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedScoreId, setExpandedScoreId] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    if (offline) {
      setRecommendations(buildOfflineRecommendations(userId));
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch(`/meal-recommendations/${userId}`);
      if (!res.ok) {
        throw new Error('Failed to load meal recommendations');
      }
      const data = await res.json();
      const normalized = {
        ...data,
        remaining: {
          calories: Math.max(Number(data?.remaining?.calories || 0), 0),
          protein: Math.max(Number(data?.remaining?.protein || 0), 0),
          carbs: Math.max(Number(data?.remaining?.carbs || 0), 0),
          fat: Math.max(Number(data?.remaining?.fat || 0), 0),
        },
        recommendations: (data?.recommendations || []).map((food) => ({
          ...food,
          calories: Number(food.calories || 0),
          protein: Number(food.protein || 0),
          carbs: Number(food.carbs || 0),
          fat: Number(food.fat || 0),
          matchScore: Number(food.matchScore || 0),
        })),
      };
      setRecommendations(normalized);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  }, [userId, offline]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const addFoodToLog = async (food) => {
    const body = {
      user_id: userId,
      food_name: food.name,
      calories: Number(food.calories || 0),
      protein: Number(food.protein || 0),
      carbs: Number(food.carbs || 0),
      fat: Number(food.fat || 0),
      date: new Date().toISOString(),
    };

    if (offline) {
      offlineStore.addFoodLogEntry(userId, body);
      alert(`${food.name} added to food log!`);
      fetchRecommendations();
      if (onAddFood) onAddFood();
      return;
    }

    try {
      const res = await apiFetch('/food-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(`${food.name} added to food log!`);
        fetchRecommendations();
        if (onAddFood) onAddFood();
      }
    } catch (err) {
      console.error('Error adding food:', err);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading card">
        <h1>Loading recommendations…</h1>
        <p>Crunching foods that fit your remaining macros.</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Meal ideas</h1>
        <p>Items ranked against what you still need today for calories and macros.</p>
      </div>

      {recommendations && (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <h3>{recommendations.remaining.calories.toFixed(0)}</h3>
              <p>Calories remaining</p>
            </div>
            <div className="summary-card">
              <h3>{recommendations.remaining.protein.toFixed(1)}g</h3>
              <p>Protein remaining</p>
            </div>
            <div className="summary-card">
              <h3>{recommendations.remaining.carbs.toFixed(1)}g</h3>
              <p>Carbs remaining</p>
            </div>
            <div className="summary-card">
              <h3>{recommendations.remaining.fat.toFixed(1)}g</h3>
              <p>Fat remaining</p>
            </div>
          </div>

          <div className="card">
            <h2>Recommended foods</h2>
            <p className="settings-subcopy" style={{ marginBottom: '1.25rem' }}>
              Tap Add to log a suggestion. Match score reflects how well it fits your remaining macros.
            </p>

            {recommendations.recommendations && recommendations.recommendations.length > 0 ? (
              <div className="recommendation-grid">
                {recommendations.recommendations.map((food) => (
                  <div key={food.id} className="recommendation-card">
                    <h4>{food.name}</h4>
                    <div className="recommendation-macros">
                      <span>{food.calories} kcal</span>
                      <span>P {food.protein}g</span>
                      <span>C {food.carbs}g</span>
                      <span>F {food.fat}g</span>
                    </div>
                    <div className="recommendation-actions">
                      <button type="button" className="btn btn-primary" onClick={() => addFoodToLog(food)}>
                        Add
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setExpandedScoreId(expandedScoreId === food.id ? null : food.id)}
                      >
                        Score {(food.matchScore * 100).toFixed(0)}%
                      </button>
                    </div>
                    {expandedScoreId === food.id && (
                      <p className="recommendation-score-hint">
                        Score blends protein, carbs, fat, and calorie fit with your remaining goals.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state-title">You&apos;re on target</p>
                <p className="empty-state-message">No extra suggestions right now — log another meal if you still need energy.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
