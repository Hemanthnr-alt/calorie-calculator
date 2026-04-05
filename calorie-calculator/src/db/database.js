/**
 * 30 Calz — Dexie (IndexedDB) Database v2
 * Offline-first. New: recipes table.
 */
import Dexie from 'dexie';
import offlineFoods from '../data/foods-offline.json';

export const db = new Dexie('CalorieLabDB');

db.version(1).stores({
  profile:      '++id',
  foods:        '++id, name, category, isCustom',
  foodLog:      '++id, date, mealType, createdAt',
  waterLog:     '++id, date, createdAt',
  workouts:     '++id, date, createdAt',
  weightLog:    '++id, date',
  achievements: '++id, key, unlockedAt',
});

db.version(2).stores({
  profile:      '++id',
  foods:        '++id, name, category, isCustom',
  foodLog:      '++id, date, mealType, createdAt',
  waterLog:     '++id, date, createdAt',
  workouts:     '++id, date, createdAt',
  weightLog:    '++id, date',
  achievements: '++id, key, unlockedAt',
  favorites:    '++id, name',
});

db.version(3).stores({
  profile:      '++id',
  foods:        '++id, name, category, isCustom',
  foodLog:      '++id, date, mealType, createdAt',
  waterLog:     '++id, date, createdAt',
  workouts:     '++id, date, createdAt',
  weightLog:    '++id, date',
  achievements: '++id, key, unlockedAt',
  favorites:    '++id, name',
  recipes:      '++id, name, createdAt',
});

/* ─── Profile ─────────────────────────────────────────────── */
export async function getProfile() {
  const all = await db.profile.toArray();
  return all[0] || null;
}
export async function saveProfile(data) {
  const existing = await getProfile();
  if (existing) {
    await db.profile.update(existing.id, { ...data, updatedAt: new Date().toISOString() });
  } else {
    await db.profile.add({ ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
}

/* ─── Date helpers ────────────────────────────────────────── */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ─── Food Log ────────────────────────────────────────────── */
export async function addFoodEntry(entry) {
  return db.foodLog.add({ ...entry, date: entry.date || todayStr(), createdAt: new Date().toISOString() });
}
export async function deleteFoodEntry(id) { return db.foodLog.delete(id); }
export async function getFoodLogForDate(dateStr) {
  return db.foodLog.where('date').equals(dateStr || todayStr()).reverse().sortBy('createdAt');
}
export async function getDailySummary(dateStr) {
  const entries = await getFoodLogForDate(dateStr);
  return entries.reduce((sum, e) => ({
    calories: sum.calories + Number(e.calories || 0),
    protein:  sum.protein  + Number(e.protein  || 0),
    carbs:    sum.carbs    + Number(e.carbs    || 0),
    fat:      sum.fat      + Number(e.fat      || 0),
    count:    sum.count + 1,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
}

/* ─── Weekly / Monthly ────────────────────────────────────── */
export async function getWeeklyData() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const entries = await db.foodLog.where('date').equals(ds).toArray();
    const total = entries.reduce((s, e) => s + Number(e.calories || 0), 0);
    days.push({ date: ds, label: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate(), calories: total, today: i === 0 });
  }
  return days;
}
export async function getMonthlyData() {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const entries = await db.foodLog.where('date').equals(ds).toArray();
    const total = entries.reduce((s, e) => s + Number(e.calories || 0), 0);
    days.push({ date: ds, calories: total });
  }
  return days;
}

/* ─── Streak ──────────────────────────────────────────────── */
export async function getStreak() {
  const allEntries = await db.foodLog.toArray();
  if (allEntries.length === 0) return 0;
  const days = new Set(allEntries.map(e => e.date));
  let streak = 0;
  const cursor = new Date(); cursor.setHours(12,0,0,0);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (!days.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    if (days.has(fmt(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
  }
  return streak;
}

/* ─── Water ───────────────────────────────────────────────── */
export async function addWaterEntry(amountMl, dateStr) {
  return db.waterLog.add({ amountMl, date: dateStr || todayStr(), createdAt: new Date().toISOString() });
}
export async function deleteWaterEntry(id) { return db.waterLog.delete(id); }
export async function getWaterForDate(dateStr) {
  const entries = await db.waterLog.where('date').equals(dateStr || todayStr()).toArray();
  return { entries, total: entries.reduce((s, e) => s + Number(e.amountMl || 0), 0) };
}

/* ─── Weight ──────────────────────────────────────────────── */
export async function addWeightEntry(weightKg) {
  return db.weightLog.add({ weightKg, date: todayStr() });
}
export async function getWeightHistory(limit = 30) {
  return db.weightLog.orderBy('date').reverse().limit(limit).toArray();
}

/* ─── Achievements ────────────────────────────────────────── */
const ACHIEVEMENT_DEFS = [
  { key: 'first_log',     icon: '🎯', name: 'First Log',      desc: 'Log your first meal' },
  { key: 'streak_7',      icon: '🔥', name: '7-Day Streak',   desc: 'Log 7 days in a row' },
  { key: 'streak_30',     icon: '💎', name: '30-Day Streak',  desc: 'Log 30 days in a row' },
  { key: 'streak_100',    icon: '👑', name: '100-Day Streak', desc: '100 days!' },
  { key: 'foods_50',      icon: '🍽️', name: '50 Meals',       desc: 'Log 50 entries' },
  { key: 'foods_100',     icon: '🥇', name: '100 Meals',      desc: 'Log 100 entries' },
  { key: 'foods_500',     icon: '🏆', name: '500 Meals',      desc: '500 entries!' },
  { key: 'water_goal',    icon: '💧', name: 'Hydrated',       desc: 'Hit your water goal' },
  { key: 'weight_logged', icon: '⚖️', name: 'Weigh In',       desc: 'Log your weight' },
  { key: 'custom_food',   icon: '🧑‍🍳', name: 'Chef Mode',    desc: 'Create a custom food' },
  { key: 'recipe_made',   icon: '📖', name: 'Recipe Master',  desc: 'Create your first recipe' },
  { key: 'under_goal',    icon: '✅', name: 'On Target',      desc: 'Finish under calorie goal' },
  { key: 'theme_changed', icon: '🎨', name: 'Stylist',        desc: 'Change app theme' },
];
export function getAchievementDefs() { return ACHIEVEMENT_DEFS; }
export async function getUnlockedAchievements() { return db.achievements.toArray(); }
export async function unlockAchievement(key) {
  const existing = await db.achievements.where('key').equals(key).first();
  if (existing) return null;
  await db.achievements.add({ key, unlockedAt: new Date().toISOString() });
  return ACHIEVEMENT_DEFS.find(a => a.key === key);
}
export async function checkAndUnlockAchievements() {
  const newlyUnlocked = [];
  const [streak, foodCount, weightCount, customCount, recipeCount] = await Promise.all([
    getStreak(),
    db.foodLog.count(),
    db.weightLog.count(),
    db.foods.where('isCustom').equals(1).count(),
    db.recipes.count(),
  ]);
  const tryUnlock = async (key) => { const r = await unlockAchievement(key); if (r) newlyUnlocked.push(r); };
  if (foodCount >= 1)   await tryUnlock('first_log');
  if (foodCount >= 50)  await tryUnlock('foods_50');
  if (foodCount >= 100) await tryUnlock('foods_100');
  if (foodCount >= 500) await tryUnlock('foods_500');
  if (streak >= 7)      await tryUnlock('streak_7');
  if (streak >= 30)     await tryUnlock('streak_30');
  if (streak >= 100)    await tryUnlock('streak_100');
  if (weightCount >= 1) await tryUnlock('weight_logged');
  if (customCount >= 1) await tryUnlock('custom_food');
  if (recipeCount >= 1) await tryUnlock('recipe_made');
  return newlyUnlocked;
}

/* ─── Food Search (offline-first) ─────────────────────────── */
export async function searchFoods(query, limit = 25) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  
  // Search custom foods from IndexedDB
  const localDb = await db.foods.filter(f => (f.name || '').toLowerCase().includes(q)).limit(limit).toArray();
  
  // Search the massive offline JSON database
  let results = [...localDb];
  if (results.length < limit) {
    const fromJson = offlineFoods.filter(f => (f.name && f.name.toLowerCase().includes(q))).slice(0, 150); // Get more upfront to filter
    const names = new Set(results.map(f => f.name.toLowerCase()));
    
    for (const f of fromJson) {
      if (results.length >= limit) break;
      const fName = f.name.toLowerCase();
      if (!names.has(fName)) {
        names.add(fName);
        results.push({ ...f, id: `offline-${f.name}` });
      }
    }
  }
  
  return results;
}
async function isBackendReachable() {
  if (!navigator.onLine) return false;
  try {
    const { apiFetch } = await import('../lib/api.js');
    const res = await apiFetch('/health', { method: 'HEAD', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}
export async function searchFoodsOfflineFirst(query, limit = 25, onUpdate) {
  if (!query || query.length < 2) return [];
  const localResults = await searchFoods(query, limit);
  if (typeof onUpdate === 'function') fetchBackendFoods(query, limit, localResults, onUpdate);
  return localResults;
}
async function fetchBackendFoods(query, limit, localResults, onUpdate) {
  try {
    if (!(await isBackendReachable())) return;
    const { apiFetch } = await import('../lib/api.js');
    const res = await apiFetch(`/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) return;
    const backendFoods = await res.json();
    if (!Array.isArray(backendFoods) || backendFoods.length === 0) return;
    const normalized = backendFoods.map(f => ({
      id: f.id || `api-${f.name}`,
      name: f.name || f.food_name || '',
      calories: Math.round(Number(f.calories || 0)),
      protein: Math.round(Number(f.protein || 0)),
      carbs: Math.round(Number(f.carbs || 0)),
      fat: Math.round(Number(f.fat || 0)),
      source: 'api',
    }));
    const localNames = new Set(localResults.map(f => f.name.toLowerCase()));
    const newFromApi = normalized.filter(f => !localNames.has(f.name.toLowerCase()));
    if (newFromApi.length > 0) {
      onUpdate([...localResults, ...newFromApi].slice(0, limit));
      cacheApiFoods(newFromApi);
    }
  } catch { /* silently fail */ }
}
async function cacheApiFoods(foods) {
  try {
    for (const food of foods.filter(f => f.name && f.calories > 0)) {
      const existing = await db.foods.filter(f => f.name.toLowerCase() === food.name.toLowerCase()).first();
      if (!existing) await db.foods.add({ name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, category: 'other', isCustom: 0 });
    }
  } catch { /* ignore */ }
}
export async function addCustomFood(food) { return db.foods.add({ ...food, isCustom: 1 }); }
export async function getRecentFoods(limit = 12) {
  const recent = await db.foodLog.orderBy('createdAt').reverse().limit(60).toArray();
  const seen = new Set(); const unique = [];
  for (const entry of recent) {
    const key = entry.foodName?.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push({ foodName: entry.foodName, calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat });
      if (unique.length >= limit) break;
    }
  }
  return unique;
}

/* ─── Favorites ───────────────────────────────────────────── */
export async function getFavoriteFoods() { return db.favorites.toArray(); }
export async function toggleFavorite(food) {
  const name = (food.foodName || food.name || '').toLowerCase();
  if (!name) return false;
  const existing = await db.favorites.filter(f => f.name.toLowerCase() === name).first();
  if (existing) { await db.favorites.delete(existing.id); return false; }
  await db.favorites.add({ name: food.foodName || food.name, calories: Number(food.calories||0), protein: Number(food.protein||0), carbs: Number(food.carbs||0), fat: Number(food.fat||0) });
  return true;
}

/* ─── Most Logged ─────────────────────────────────────────── */
export async function getMostLoggedFoods(limit = 8) {
  const all = await db.foodLog.toArray();
  const counts = {};
  for (const e of all) {
    const key = e.foodName?.toLowerCase();
    if (!key) continue;
    if (!counts[key]) counts[key] = { foodName: e.foodName, calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat, count: 0 };
    counts[key].count++;
  }
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, limit);
}

/* ─── Recipes ─────────────────────────────────────────────── */
export async function addRecipe(recipe) {
  return db.recipes.add({ ...recipe, createdAt: new Date().toISOString() });
}
export async function getRecipes() { return db.recipes.orderBy('createdAt').reverse().toArray(); }
export async function getRecipeById(id) { return db.recipes.get(id); }
export async function deleteRecipe(id) { return db.recipes.delete(id); }
export async function updateRecipe(id, data) { return db.recipes.update(id, data); }

/* ─── Category Breakdown ──────────────────────────────────── */
export async function getCategoryBreakdown(dateStr) {
  const entries = await getFoodLogForDate(dateStr);
  return {
    protein: entries.reduce((s, e) => s + Number(e.protein || 0), 0),
    carbs: entries.reduce((s, e) => s + Number(e.carbs || 0), 0),
    fat: entries.reduce((s, e) => s + Number(e.fat || 0), 0),
    calories: entries.reduce((s, e) => s + Number(e.calories || 0), 0),
    count: entries.length,
  };
}

export async function getTotalCaloriesBurnedToday() { return 0; }
