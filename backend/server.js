const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 34567;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'calorie_calculator',
});

/** pg often throws AggregateError (e.g. ECONNREFUSED) with an empty .message */
function serverErrorMessage(err) {
  if (!err) return 'Internal server error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  const nested = Array.isArray(err.errors) && err.errors.find((e) => e && e.message);
  if (nested) return nested.message;
  if (err.code === 'ECONNREFUSED') {
    return 'Cannot reach database. Start PostgreSQL and check DB_HOST / DB_PORT in backend/.env, then run migrations (backend/migrations/001_sync_schema.sql).';
  }
  if (err.code) return `Database error (${err.code})`;
  return 'Internal server error';
}

// ─────────────────────────────────── AUTH MIDDLEWARE ───────────────────────────────────
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// ─────────────────────────────────── AUTHENTICATION ───────────────────────────────────
// User Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ user: result.rows[0], token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That username or email is already registered' });
    }
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── USER PROFILE ───────────────────────────────────
// Get user profile
app.get('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, age, gender, weight_kg, height_cm, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, daily_water_goal_ml FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Update user profile
app.put('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const { age, gender, weight_kg, height_cm, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, daily_water_goal_ml } = req.body;
    const result = await pool.query(
      `UPDATE users SET age=$1, gender=$2, weight_kg=$3, height_cm=$4, daily_calorie_goal=$5, daily_protein_goal=$6, daily_carbs_goal=$7, daily_fat_goal=$8, daily_water_goal_ml=$9, updated_at=CURRENT_TIMESTAMP 
      WHERE id = $10 RETURNING id, username, email, age, gender, weight_kg, height_cm, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, daily_water_goal_ml`,
      [age, gender, weight_kg, height_cm, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, daily_water_goal_ml, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Update user password
app.put('/api/users/:id/password', verifyToken, async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    if (Number(req.user.id) !== targetUserId) {
      return res.status(403).json({ error: 'You can only change your own password' });
    }

    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [targetUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = userResult.rows[0].password_hash;
    if (!passwordHash) {
      return res.status(400).json({ error: 'Password cannot be changed for this account' });
    }

    const validPassword = await bcrypt.compare(current_password, passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, targetUserId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── FOOD LOG ───────────────────────────────────
app.post('/api/food-log', verifyToken, async (req, res) => {
  try {
    const { user_id, food_name, calories, protein, carbs, fat, date } = req.body;
    const result = await pool.query(
      'INSERT INTO food_log (user_id, food_name, calories, protein, carbs, fat, date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_id, food_name, calories, protein, carbs, fat, date || new Date()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.get('/api/food-log/:userId', async (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM food_log WHERE user_id = $1';
    let params = [req.params.userId];

    if (date) {
      query += ' AND DATE(date) = $2';
      params.push(date);
    }

    query += ' ORDER BY date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.delete('/api/food-log/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM food_log WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Food log entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── DAILY SUMMARY & ANALYTICS ───────────────────────────────────
app.get('/api/daily-summary/:userId', async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein), 0) as total_protein,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COALESCE(SUM(fat), 0) as total_fat,
        COUNT(*) as food_count
      FROM food_log 
      WHERE user_id = $1 AND DATE(date) = $2`,
      [req.params.userId, queryDate]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Weekly analytics
app.get('/api/analytics/weekly/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE(date) as date, 
        COALESCE(SUM(calories), 0)::float as total_calories,
        COALESCE(SUM(protein), 0)::float as total_protein,
        COALESCE(SUM(carbs), 0)::float as total_carbs,
        COALESCE(SUM(fat), 0)::float as total_fat
      FROM food_log 
      WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(date)
      ORDER BY DATE(date)`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Monthly analytics
app.get('/api/analytics/monthly/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE_TRUNC('day', date)::date as date, 
        COALESCE(SUM(calories), 0)::float as total_calories,
        COALESCE(SUM(protein), 0)::float as total_protein,
        COALESCE(SUM(carbs), 0)::float as total_carbs,
        COALESCE(SUM(fat), 0)::float as total_fat,
        COALESCE(AVG(calories), 0)::float as avg_calories
      FROM food_log 
      WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', date)
      ORDER BY date`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── WATER INTAKE ───────────────────────────────────
app.post('/api/water-intake', verifyToken, async (req, res) => {
  try {
    const { user_id, amount_ml, date } = req.body;
    const result = await pool.query(
      'INSERT INTO water_intake (user_id, amount_ml, date) VALUES ($1, $2, $3) RETURNING *',
      [user_id, amount_ml, date || new Date()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.get('/api/water-intake/:userId', async (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM water_intake WHERE user_id = $1';
    let params = [req.params.userId];

    if (date) {
      query += ' AND DATE(date) = $2';
      params.push(date);
    }

    query += ' ORDER BY date DESC';
    const result = await pool.query(query, params);
    const total = result.rows.reduce((sum, item) => sum + item.amount_ml, 0);
    res.json({ total, entries: result.rows });
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.delete('/api/water-intake/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM water_intake WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Water intake entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── WORKOUTS ───────────────────────────────────
app.post('/api/workouts', verifyToken, async (req, res) => {
  try {
    const { user_id, exercise_name, duration_minutes, calories_burned, intensity, date } = req.body;
    const result = await pool.query(
      'INSERT INTO workouts (user_id, exercise_name, duration_minutes, calories_burned, intensity, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, exercise_name, duration_minutes, calories_burned, intensity, date || new Date()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.get('/api/workouts/:userId', async (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM workouts WHERE user_id = $1';
    let params = [req.params.userId];

    if (date) {
      query += ' AND DATE(date) = $2';
      params.push(date);
    }

    query += ' ORDER BY date DESC';
    const result = await pool.query(query, params);
    const totalCaloriesBurned = result.rows.reduce((sum, item) => sum + (item.calories_burned || 0), 0);
    res.json({ total_calories_burned: totalCaloriesBurned, workouts: result.rows });
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.delete('/api/workouts/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM workouts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Workout not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── SHOPPING LIST ───────────────────────────────────
app.post('/api/shopping-list', verifyToken, async (req, res) => {
  try {
    const { user_id, item_name, quantity, unit } = req.body;
    const result = await pool.query(
      'INSERT INTO shopping_list (user_id, item_name, quantity, unit) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, item_name, quantity, unit]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.get('/api/shopping-list/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM shopping_list WHERE user_id = $1 ORDER BY checked ASC, created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.put('/api/shopping-list/:id', verifyToken, async (req, res) => {
  try {
    const { checked } = req.body;
    const result = await pool.query(
      'UPDATE shopping_list SET checked = $1 WHERE id = $2 RETURNING *',
      [checked, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shopping list item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

app.delete('/api/shopping-list/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM shopping_list WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shopping list item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── BARCODE PRODUCTS ───────────────────────────────────
app.post('/api/barcode-products', async (req, res) => {
  try {
    const { barcode, name, calories, protein, carbs, fat, serving_size, brand } = req.body;
    const result = await pool.query(
      'INSERT INTO barcode_products (barcode, name, calories, protein, carbs, fat, serving_size, brand) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (barcode) DO UPDATE SET name=$2 RETURNING *',
      [barcode, name, calories, protein, carbs, fat, serving_size, brand]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── BARCODE PRODUCTS ───────────────────────────────────
// IMPORTANT: Specific routes must come BEFORE generic :barcode route (Express route order)

// Search barcode products by name or brand
app.get('/api/barcode-products/search', async (req, res) => {
  try {
    const { q, brand, limit = 20 } = req.query;
    if (!q) return res.json([]);

    let query = 'SELECT * FROM barcode_products WHERE 1=1';
    let params = [];

    // Search by name or brand
    query += ` AND (LOWER(name) LIKE LOWER($${params.length + 1}) OR LOWER(brand) LIKE LOWER($${params.length + 2}))`;
    params.push(`%${q}%`, `%${q}%`);

    // Optional brand filter
    if (brand) {
      query += ` AND LOWER(brand) LIKE LOWER($${params.length + 1})`;
      params.push(`%${brand}%`);
    }

    query += ` ORDER BY brand, name LIMIT $${params.length + 1}`;
    params.push(Math.min(limit, 100));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Get popular/most common products from barcode database
app.get('/api/barcode-products/popular', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await pool.query(
      `SELECT * FROM barcode_products 
       WHERE calories IS NOT NULL AND protein IS NOT NULL
       ORDER BY RANDOM() 
       LIMIT $1`,
      [Math.min(limit, 100)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Get unique brands from barcode products
app.get('/api/barcode-products/brands', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    let query = 'SELECT DISTINCT brand FROM barcode_products WHERE brand IS NOT NULL';
    let params = [];

    if (q) {
      query += ' AND LOWER(brand) LIKE LOWER($1)';
      params.push(`%${q}%`);
    }

    query += ` ORDER BY brand LIMIT $${params.length + 1}`;
    params.push(Math.min(limit, 50));

    const result = await pool.query(query, params);
    res.json(result.rows.map(r => r.brand));
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Get product by barcode (MUST come AFTER specific routes like /search, /popular, /brands)
app.get('/api/barcode-products/:barcode', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM barcode_products WHERE barcode = $1', [req.params.barcode]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── FOOD DATABASE ───────────────────────────────────
app.get('/api/foods/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const result = await pool.query(
      `SELECT id, name, calories, protein, carbs, fat
       FROM foods
       WHERE to_tsvector('english', name) @@ plainto_tsquery('english', $1)
       AND calories > 10
       ORDER BY 
         CASE 
           WHEN name ILIKE '%paneer%' OR name ILIKE '%dal%' OR name ILIKE '%roti%' 
             OR name ILIKE '%biryani%' OR name ILIKE '%idli%' OR name ILIKE '%dosa%' 
           THEN 1 
           ELSE 2 
         END,
         calories DESC
       LIMIT 20`,
      [q]
    );

    // ✅ THIS PART WAS MISSING
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/foods', async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat } = req.body;
    const result = await pool.query(
      'INSERT INTO foods (name, calories, protein, carbs, fat) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, calories, protein, carbs, fat]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── MEAL RECOMMENDATIONS ───────────────────────────────────
app.get('/api/meal-recommendations/:userId', async (req, res) => {
  try {
    // Simple recommendation algorithm based on remaining macros
    const userResult = await pool.query('SELECT daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal FROM users WHERE id = $1', [req.params.userId]);
    const user = userResult.rows[0] || { daily_calorie_goal: 2000, daily_protein_goal: 150, daily_carbs_goal: 200, daily_fat_goal: 65 };
    const toPositiveOr = (value, fallback, minAllowed) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < minAllowed) return fallback;
      return parsed;
    };

    const goals = {
      calories: toPositiveOr(user.daily_calorie_goal, 2000, 500),
      protein: toPositiveOr(user.daily_protein_goal, 120, 20),
      carbs: toPositiveOr(user.daily_carbs_goal, 220, 20),
      fat: toPositiveOr(user.daily_fat_goal, 65, 10),
    };

    const today = new Date().toISOString().split('T')[0];
    const summaryResult = await pool.query(
      'SELECT COALESCE(SUM(calories), 0)::float as total_calories, COALESCE(SUM(protein), 0)::float as total_protein, COALESCE(SUM(carbs), 0)::float as total_carbs, COALESCE(SUM(fat), 0)::float as total_fat FROM food_log WHERE user_id = $1 AND DATE(date) = $2',
      [req.params.userId, today]
    );
    const consumed = summaryResult.rows[0];

    const remaining = {
      calories: Math.max(goals.calories - Number(consumed.total_calories || 0), 0),
      protein: Math.max(goals.protein - Number(consumed.total_protein || 0), 0),
      carbs: Math.max(goals.carbs - Number(consumed.total_carbs || 0), 0),
      fat: Math.max(goals.fat - Number(consumed.total_fat || 0), 0),
    };

    // If user has already met calorie target, do not suggest more meals.
    if (remaining.calories <= 0) {
      return res.json({
        remaining,
        recommendations: [],
      });
    }

    // Use realistic nutrition ranges to avoid noisy imported values.
    const targetMealCalories = Math.max(Math.min(remaining.calories, 650), 120);
    const lowerCalorieBound = Math.max(targetMealCalories * 0.35, 40);
    const upperCalorieBound = Math.min(targetMealCalories * 1.15, 900);

    const foodsResult = await pool.query(
      `SELECT id, name, calories, protein, carbs, fat
       FROM foods
       WHERE calories BETWEEN $1 AND $2
         AND protein BETWEEN 0 AND 100
         AND carbs BETWEEN 0 AND 150
         AND fat BETWEEN 0 AND 100
       ORDER BY ABS(calories - $3) ASC
       LIMIT 120`,
      [lowerCalorieBound, upperCalorieBound, targetMealCalories]
    );

    const scoredFoods = foodsResult.rows
      .map((food) => {
        const normalized = {
          ...food,
          calories: Number(food.calories || 0),
          protein: Number(food.protein || 0),
          carbs: Number(food.carbs || 0),
          fat: Number(food.fat || 0),
        };

        const proteinFit = remaining.protein > 0 ? 1 - Math.abs(normalized.protein - remaining.protein) / Math.max(remaining.protein, 1) : 0;
        const carbsFit = remaining.carbs > 0 ? 1 - Math.abs(normalized.carbs - remaining.carbs) / Math.max(remaining.carbs, 1) : 0;
        const fatFit = remaining.fat > 0 ? 1 - Math.abs(normalized.fat - remaining.fat) / Math.max(remaining.fat, 1) : 0;
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

    res.json({
      remaining,
      recommendations: scoredFoods,
    });
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Search foods database
app.get('/api/foods/autocomplete', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) return res.json([]);

    const result = await pool.query(
      `SELECT * FROM foods 
       WHERE LOWER(name) LIKE LOWER($1) 
       ORDER BY name 
       LIMIT $2`,
      [`%${q}%`, Math.min(limit, 50)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Get nutrition info for a specific food (by ID or name)
app.get('/api/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM foods WHERE id = $1 OR LOWER(name) = LOWER($2) LIMIT 1',
      [isNaN(id) ? -1 : id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Food not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// Get database statistics
app.get('/api/database-stats', async (req, res) => {
  try {
    const barcodeCount = await pool.query('SELECT COUNT(*) as count FROM barcode_products WHERE calories IS NOT NULL');
    const foodCount = await pool.query('SELECT COUNT(*) as count FROM foods WHERE calories IS NOT NULL');
    const avgCalories = await pool.query('SELECT AVG(calories) as avg FROM barcode_products WHERE calories IS NOT NULL');

    res.json({
      barcode_products_total: barcodeCount.rows[0].count,
      foods_total: foodCount.rows[0].count,
      average_calories_per_100g: Math.round(avgCalories.rows[0].avg),
    });
  } catch (err) {
    res.status(500).json({ error: serverErrorMessage(err) });
  }
});

// ─────────────────────────────────── HEALTH CHECK ───────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server running' });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`30 Cal API running on http://localhost:${PORT}`);
});
