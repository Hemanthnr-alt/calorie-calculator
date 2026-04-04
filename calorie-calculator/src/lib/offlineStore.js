/**
 * Local-first storage for offline / guest mode (no server).
 * Keys are scoped per user id (including local guest ids).
 */

function storageKey(userId, name) {
  return `cc_v1_${userId}_${name}`;
}

function readJson(k, fallback) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function localDay(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getFoodLog(userId) {
  return readJson(storageKey(userId, 'food_log'), []);
}

export function setFoodLog(userId, entries) {
  localStorage.setItem(storageKey(userId, 'food_log'), JSON.stringify(entries));
}

export function addFoodLogEntry(userId, entry) {
  const id = entry.id || `local-${crypto.randomUUID()}`;
  const row = {
    ...entry,
    id,
    user_id: userId,
    date: entry.date || new Date().toISOString(),
  };
  const all = getFoodLog(userId);
  all.unshift(row);
  setFoodLog(userId, all);
  return row;
}

export function deleteFoodLogEntry(userId, id) {
  const all = getFoodLog(userId).filter((e) => String(e.id) !== String(id));
  setFoodLog(userId, all);
}

export function getDailySummary(userId, dateStr) {
  const log = getFoodLog(userId);
  const day = dateStr || localDay(new Date());
  const filtered = log.filter((e) => localDay(e.date) === day);
  return filtered.reduce(
    (sum, e) => ({
      total_calories: sum.total_calories + Number(e.calories || 0),
      total_protein: sum.total_protein + Number(e.protein || 0),
      total_carbs: sum.total_carbs + Number(e.carbs || 0),
      total_fat: sum.total_fat + Number(e.fat || 0),
      food_count: sum.food_count + 1,
    }),
    { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0, food_count: 0 }
  );
}

export function getWaterState(userId) {
  const entries = readJson(storageKey(userId, 'water'), []);
  const today = localDay(new Date());
  const filtered = entries.filter((e) => localDay(e.date) === today);
  const total = filtered.reduce((s, e) => s + Number(e.amount_ml || 0), 0);
  return { entries: filtered, total };
}

export function addWaterEntry(userId, amount_ml, date = new Date().toISOString()) {
  const all = readJson(storageKey(userId, 'water'), []);
  const row = { id: `local-${crypto.randomUUID()}`, user_id: userId, amount_ml, date };
  all.unshift(row);
  localStorage.setItem(storageKey(userId, 'water'), JSON.stringify(all));
  return row;
}

export function deleteWaterEntry(userId, id) {
  const all = readJson(storageKey(userId, 'water'), []).filter((e) => String(e.id) !== String(id));
  localStorage.setItem(storageKey(userId, 'water'), JSON.stringify(all));
}

export function getShoppingList(userId) {
  return readJson(storageKey(userId, 'shopping'), []);
}

export function addShoppingItem(userId, item) {
  const all = getShoppingList(userId);
  const row = {
    id: `local-${crypto.randomUUID()}`,
    user_id: userId,
    checked: false,
    created_at: new Date().toISOString(),
    ...item,
  };
  all.unshift(row);
  localStorage.setItem(storageKey(userId, 'shopping'), JSON.stringify(all));
  return row;
}

export function updateShoppingItem(userId, id, patch) {
  const all = getShoppingList(userId).map((i) =>
    String(i.id) === String(id) ? { ...i, ...patch } : i
  );
  localStorage.setItem(storageKey(userId, 'shopping'), JSON.stringify(all));
}

export function deleteShoppingItem(userId, id) {
  const all = getShoppingList(userId).filter((i) => String(i.id) !== String(id));
  localStorage.setItem(storageKey(userId, 'shopping'), JSON.stringify(all));
}

export function getWorkoutsBundle(userId) {
  const all = readJson(storageKey(userId, 'workouts'), []);
  const total_calories_burned = all.reduce((s, w) => s + Number(w.calories_burned || 0), 0);
  return { workouts: all, total_calories_burned };
}

export function addWorkout(userId, payload) {
  const all = readJson(storageKey(userId, 'workouts'), []);
  const row = {
    id: `local-${crypto.randomUUID()}`,
    user_id: userId,
    ...payload,
    date: payload.date || new Date().toISOString(),
  };
  all.unshift(row);
  localStorage.setItem(storageKey(userId, 'workouts'), JSON.stringify(all));
  return row;
}

export function deleteWorkout(userId, id) {
  const all = readJson(storageKey(userId, 'workouts'), []).filter((w) => String(w.id) !== String(id));
  localStorage.setItem(storageKey(userId, 'workouts'), JSON.stringify(all));
}

export function getWeeklyAggregates(userId) {
  const log = getFoodLog(userId);
  const byDate = new Map();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  for (const e of log) {
    const d = new Date(e.date);
    if (d < cutoff) continue;
    const ds = localDay(e.date);
    const cur = byDate.get(ds) || {
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
    };
    cur.total_calories += Number(e.calories || 0);
    cur.total_protein += Number(e.protein || 0);
    cur.total_carbs += Number(e.carbs || 0);
    cur.total_fat += Number(e.fat || 0);
    byDate.set(ds, cur);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));
}

export function getMonthlyAggregates(userId) {
  const log = getFoodLog(userId);
  const byDate = new Map();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  for (const e of log) {
    const d = new Date(e.date);
    if (d < cutoff) continue;
    const ds = localDay(e.date);
    const cur = byDate.get(ds) || {
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
      count: 0,
    };
    cur.total_calories += Number(e.calories || 0);
    cur.total_protein += Number(e.protein || 0);
    cur.total_carbs += Number(e.carbs || 0);
    cur.total_fat += Number(e.fat || 0);
    cur.count += 1;
    byDate.set(ds, cur);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      total_calories: v.total_calories,
      total_protein: v.total_protein,
      total_carbs: v.total_carbs,
      total_fat: v.total_fat,
      avg_calories: v.count ? v.total_calories / v.count : 0,
    }));
}

export function getLocalProfile(userId) {
  return readJson(storageKey(userId, 'profile'), null);
}

export function setLocalProfile(userId, profile) {
  localStorage.setItem(storageKey(userId, 'profile'), JSON.stringify(profile));
}

export function getLogStreak(userId) {
  const log = getFoodLog(userId);
  if (log.length === 0) return 0;
  const days = new Set(log.map((e) => localDay(e.date)));
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  const todayStr = localDay(cursor);
  if (!days.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 400; i += 1) {
    const ds = localDay(cursor);
    if (days.has(ds)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
