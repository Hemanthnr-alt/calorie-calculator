/**
 * Seed the foods database from the bundled JSON.
 * The JSON is imported at build-time so it's always available offline.
 */
import { db } from './database.js';
import offlineFoods from '../data/foods-offline.json';

const SEED_KEY = 'calorielab_foods_seeded_v4';

export async function seedFoods() {
  if (localStorage.getItem(SEED_KEY)) return;

  try {
    const count = await db.foods.count();
    if (count > 1500) {
      localStorage.setItem(SEED_KEY, '1');
      return; // already have full data
    }

    let rawFoods = Array.isArray(offlineFoods) ? offlineFoods : [];

    // Fallback: hardcode a minimal set if the JSON import is empty
    if (rawFoods.length === 0) {
      rawFoods = getMinimalFoodDb();
    }

    const foods = rawFoods
      .filter(f => f.name && f.calories > 0)
      .map(f => ({
        name: String(f.name).trim(),
        calories: Math.round(Number(f.calories || 0)),
        protein: Math.round(Number(f.protein || 0)),
        carbs: Math.round(Number(f.carbs || 0)),
        fat: Math.round(Number(f.fat || 0)),
        category: categorize(f.name),
        isCustom: 0,
      }));

    if (foods.length > 0) {
      await db.foods.bulkAdd(foods);
    }

    localStorage.setItem(SEED_KEY, '1');
    console.log(`[CalorieLab] Seeded ${foods.length} foods from offline bundle`);
  } catch (err) {
    console.warn('[CalorieLab] Seed error:', err);
  }
}

function categorize(name) {
  const n = (name || '').toLowerCase();
  if (/chicken|egg|fish|meat|beef|pork|lamb|turkey|shrimp|salmon|tuna|paneer|tofu/i.test(n)) return 'protein';
  if (/rice|bread|roti|naan|pasta|cereal|oat|wheat|chapati|dosa|idli/i.test(n)) return 'grain';
  if (/milk|curd|yogurt|cheese|butter|cream|ghee/i.test(n)) return 'dairy';
  if (/apple|banana|mango|orange|grape|berry|fruit|watermelon/i.test(n)) return 'fruit';
  if (/spinach|carrot|potato|onion|tomato|broccoli|salad|vegetable|dal|lentil|bean/i.test(n)) return 'vegetable';
  if (/cookie|cake|chocolate|candy|ice cream|sweet|sugar|jalebi|gulab/i.test(n)) return 'sweet';
  if (/coffee|tea|juice|soda|cola|water|smoothie|shake|lassi/i.test(n)) return 'beverage';
  return 'other';
}

function getMinimalFoodDb() {
  return [
    { name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
    { name: 'White Rice (1 cup cooked)', calories: 206, protein: 4, carbs: 45, fat: 0 },
    { name: 'Egg (1 large)', calories: 72, protein: 6, carbs: 0, fat: 5 },
    { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
    { name: 'Whole Wheat Roti', calories: 120, protein: 4, carbs: 20, fat: 3 },
    { name: 'Dal (1 cup)', calories: 198, protein: 14, carbs: 34, fat: 1 },
    { name: 'Paneer (100g)', calories: 265, protein: 18, carbs: 4, fat: 20 },
    { name: 'Apple', calories: 95, protein: 0, carbs: 25, fat: 0 },
    { name: 'Milk (1 cup)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    { name: 'Curd/Yogurt (1 cup)', calories: 98, protein: 11, carbs: 6, fat: 4 },
    { name: 'Idli (2 pieces)', calories: 150, protein: 4, carbs: 30, fat: 1 },
    { name: 'Dosa (1 plain)', calories: 168, protein: 4, carbs: 28, fat: 4 },
    { name: 'Oats (1 cup cooked)', calories: 154, protein: 6, carbs: 27, fat: 3 },
    { name: 'Salmon (100g)', calories: 208, protein: 20, carbs: 0, fat: 13 },
    { name: 'Almonds (28g)', calories: 164, protein: 6, carbs: 6, fat: 14 },
    { name: 'Peanut Butter (2 tbsp)', calories: 188, protein: 8, carbs: 6, fat: 16 },
    { name: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fat: 2 },
    { name: 'Sweet Potato (medium)', calories: 103, protein: 2, carbs: 24, fat: 0 },
    { name: 'Avocado (half)', calories: 161, protein: 2, carbs: 9, fat: 15 },
    { name: 'Broccoli (1 cup)', calories: 55, protein: 4, carbs: 11, fat: 1 },
    { name: 'Tuna (100g canned)', calories: 116, protein: 26, carbs: 0, fat: 1 },
    { name: 'Greek Yogurt (1 cup)', calories: 130, protein: 22, carbs: 9, fat: 1 },
    { name: 'Protein Shake', calories: 120, protein: 24, carbs: 3, fat: 2 },
    { name: 'Biryani (1 plate)', calories: 490, protein: 18, carbs: 65, fat: 16 },
    { name: 'Samosa (1 piece)', calories: 260, protein: 4, carbs: 30, fat: 14 },
    { name: 'Chapati', calories: 100, protein: 3, carbs: 18, fat: 2 },
    { name: 'Rajma (1 cup)', calories: 210, protein: 14, carbs: 36, fat: 1 },
    { name: 'Poha (1 cup)', calories: 180, protein: 4, carbs: 32, fat: 5 },
    { name: 'Upma (1 cup)', calories: 210, protein: 6, carbs: 30, fat: 8 },
    { name: 'Paratha (1 plain)', calories: 260, protein: 5, carbs: 36, fat: 10 },
    { name: 'Chole (1 cup)', calories: 240, protein: 13, carbs: 40, fat: 4 },
    { name: 'Mixed Vegetables (1 cup)', calories: 80, protein: 3, carbs: 16, fat: 1 },
    { name: 'Chicken Curry (1 cup)', calories: 320, protein: 28, carbs: 10, fat: 18 },
    { name: 'Fish Curry (1 cup)', calories: 280, protein: 24, carbs: 8, fat: 16 },
    { name: 'Tea with Milk', calories: 35, protein: 1, carbs: 4, fat: 1 },
    { name: 'Coffee with Milk', calories: 40, protein: 2, carbs: 4, fat: 2 },
    { name: 'Orange Juice (1 glass)', calories: 110, protein: 2, carbs: 26, fat: 0 },
    { name: 'Toast (2 slices)', calories: 140, protein: 4, carbs: 24, fat: 2 },
    { name: 'Pasta (1 cup cooked)', calories: 220, protein: 8, carbs: 43, fat: 1 },
    { name: 'Pizza Slice', calories: 285, protein: 12, carbs: 36, fat: 10 },
    { name: 'Burger', calories: 354, protein: 20, carbs: 29, fat: 17 },
    { name: 'French Fries (medium)', calories: 365, protein: 4, carbs: 48, fat: 17 },
    { name: 'Ice Cream (1 scoop)', calories: 137, protein: 2, carbs: 16, fat: 7 },
    { name: 'Chocolate (1 bar)', calories: 235, protein: 3, carbs: 26, fat: 13 },
    { name: 'Gulab Jamun (2 pieces)', calories: 300, protein: 4, carbs: 40, fat: 14 },
    { name: 'Rasgulla (2 pieces)', calories: 186, protein: 4, carbs: 36, fat: 3 },
    { name: 'Coconut Water (1 glass)', calories: 46, protein: 2, carbs: 9, fat: 0 },
    { name: 'Mango', calories: 135, protein: 1, carbs: 35, fat: 1 },
    { name: 'Watermelon (2 cups)', calories: 92, protein: 2, carbs: 23, fat: 0 },
    { name: 'Puri (2 pieces)', calories: 200, protein: 4, carbs: 24, fat: 10 },
  ];
}
