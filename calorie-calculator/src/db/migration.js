/**
 * Migration: localStorage → IndexedDB
 * Runs once on first load to preserve existing user data.
 */
import { db, todayStr } from './database.js';

const MIGRATION_KEY = 'calorielab_migrated_v2';

export async function migrateFromLocalStorage() {
  if (localStorage.getItem(MIGRATION_KEY)) return;

  try {
    // Find all offline user IDs
    const offlineUserId = localStorage.getItem('offline_user_id');
    const userIds = new Set();
    if (offlineUserId) userIds.add(offlineUserId);

    // Scan for cc_v1_* keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cc_v1_')) {
        const parts = key.split('_');
        // cc_v1_{userId}_{name}
        if (parts.length >= 4) {
          const uid = parts.slice(2, -1).join('_');
          userIds.add(uid);
        }
      }
    }

    for (const userId of userIds) {
      // Migrate food log
      const foodLogRaw = readLs(`cc_v1_${userId}_food_log`);
      if (Array.isArray(foodLogRaw)) {
        const entries = foodLogRaw.map(e => ({
          foodName: e.food_name || e.foodName || 'Unknown',
          calories: Number(e.calories || 0),
          protein: Number(e.protein || 0),
          carbs: Number(e.carbs || 0),
          fat: Number(e.fat || 0),
          mealType: 'other',
          date: extractDate(e.date),
          createdAt: e.date || new Date().toISOString(),
        }));
        if (entries.length > 0) await db.foodLog.bulkAdd(entries);
      }

      // Migrate water
      const waterRaw = readLs(`cc_v1_${userId}_water`);
      if (Array.isArray(waterRaw)) {
        const entries = waterRaw.map(e => ({
          amountMl: Number(e.amount_ml || e.amountMl || 0),
          date: extractDate(e.date),
          createdAt: e.date || new Date().toISOString(),
        }));
        if (entries.length > 0) await db.waterLog.bulkAdd(entries);
      }

      // Migrate workouts
      const workoutsRaw = readLs(`cc_v1_${userId}_workouts`);
      if (Array.isArray(workoutsRaw)) {
        const entries = workoutsRaw.map(e => ({
          exerciseName: e.exercise_name || e.exerciseName || 'Unknown',
          durationMin: Number(e.duration_minutes || e.durationMin || 0),
          caloriesBurned: Number(e.calories_burned || e.caloriesBurned || 0),
          intensity: e.intensity || 'moderate',
          date: extractDate(e.date),
          createdAt: e.date || new Date().toISOString(),
        }));
        if (entries.length > 0) await db.workouts.bulkAdd(entries);
      }

      // Migrate profile
      const profileRaw = readLs(`cc_v1_${userId}_profile`);
      if (profileRaw && typeof profileRaw === 'object') {
        await db.profile.add({
          age: profileRaw.age || 25,
          gender: profileRaw.gender || 'male',
          weightKg: profileRaw.weight_kg || profileRaw.weightKg || 70,
          heightCm: profileRaw.height_cm || profileRaw.heightCm || 175,
          activityLevel: 'moderate',
          goal: 'maintain',
          dailyCalorieGoal: profileRaw.daily_calorie_goal || 2000,
          dailyProteinGoal: profileRaw.daily_protein_goal || 120,
          dailyCarbsGoal: profileRaw.daily_carbs_goal || 220,
          dailyFatGoal: profileRaw.daily_fat_goal || 65,
          dailyWaterGoalMl: profileRaw.daily_water_goal_ml || 2500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Also migrate dailyGoals from plain localStorage
    const dailyGoals = readLs('dailyGoals');
    if (dailyGoals && typeof dailyGoals === 'object') {
      const existing = await db.profile.toArray();
      if (existing.length === 0) {
        await db.profile.add({
          age: 25, gender: 'male', weightKg: 70, heightCm: 175,
          activityLevel: 'moderate', goal: 'maintain',
          dailyCalorieGoal: Number(dailyGoals.calories || 2000),
          dailyProteinGoal: Number(dailyGoals.protein || 120),
          dailyCarbsGoal: Number(dailyGoals.carbs || 220),
          dailyFatGoal: Number(dailyGoals.fat || 65),
          dailyWaterGoalMl: 2500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    localStorage.setItem(MIGRATION_KEY, '1');
    console.log('[CalorieLab] Migration from localStorage complete');
  } catch (err) {
    console.warn('[CalorieLab] Migration error:', err);
    localStorage.setItem(MIGRATION_KEY, '1'); // Don't retry
  }
}

function readLs(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function extractDate(d) {
  if (!d) return todayStr();
  try {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  } catch { return todayStr(); }
}
