import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

export default function Home({ foodLog }) {
  const [goalsOpen, setGoalsOpen] = useState(false);
  const navigate = useNavigate();

  const dailyGoals = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('dailyGoals') || '{}');
      return {
        calories: Number(parsed?.calories || 1700),
        protein: Number(parsed?.protein || 85),
        carbs: Number(parsed?.carbs || 213),
        fat: Number(parsed?.fat || 57),
      };
    } catch {
      return { calories: 1700, protein: 85, carbs: 213, fat: 57 };
    }
  }, []);

  const todayTotals = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const entries = Array.isArray(foodLog) ? foodLog : [];

    return entries
      .filter((entry) => new Date(entry.date).toDateString() === todayStr)
      .reduce(
        (sum, entry) => ({
          count: sum.count + 1,
          calories: sum.calories + Number(entry.calories || 0),
          protein: sum.protein + Number(entry.protein || 0),
          carbs: sum.carbs + Number(entry.carbs || 0),
          fat: sum.fat + Number(entry.fat || 0),
        }),
        { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
  }, [foodLog]);

  const todayCount = Number(todayTotals.count || 0);
  const calories = Number(todayTotals.calories || 0);
  const protein = Number(todayTotals.protein || 0);
  const carbs = Number(todayTotals.carbs || 0);
  const fat = Number(todayTotals.fat || 0);
  const dailyGoal = Number(dailyGoals.calories || 1700);
  const proteinGoal = Number(dailyGoals.protein || 85);
  const carbsGoal = Number(dailyGoals.carbs || 213);
  const fatGoal = Number(dailyGoals.fat || 57);
  const caloriePct = dailyGoal > 0 ? Math.min(Math.round((calories / dailyGoal) * 100), 100) : 0;
  const nowHour = new Date().getHours();
  const dayPart = nowHour < 12 ? 'Morning' : nowHour < 18 ? 'Afternoon' : 'Evening';
  const remainingCalories = Math.max(dailyGoal - calories, 0);

  const logStreak = useMemo(() => {
    const entries = Array.isArray(foodLog) ? foodLog : [];
    if (entries.length === 0) return 0;
    const dayKey = (d) => {
      const x = new Date(d);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    };
    const days = new Set(entries.map((e) => dayKey(e.date)));
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    if (!days.has(dayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    for (let i = 0; i < 400; i += 1) {
      const ds = dayKey(cursor);
      if (days.has(ds)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [foodLog]);

  const lastSevenDays = useMemo(() => {
    const entries = Array.isArray(foodLog) ? foodLog : [];
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const key = day.toDateString();
      const total = entries
        .filter((entry) => new Date(entry.date).toDateString() === key)
        .reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
      days.push({
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        total,
      });
    }
    return days;
  }, [foodLog]);

  const maxWeekly = Math.max(...lastSevenDays.map((d) => d.total), 1);

  const snapshotRows = [
    { name: 'Calories', value: `${calories.toFixed(0)} / ${dailyGoal} kcal` },
    { name: 'Protein', value: `${protein.toFixed(0)} / ${proteinGoal} g` },
    { name: 'Carbs', value: `${carbs.toFixed(0)} / ${carbsGoal} g` },
    { name: 'Fat', value: `${fat.toFixed(0)} / ${fatGoal} g` },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="home-welcome-row">
          <div>
            <h1>{dayPart} overview</h1>
            <p>Your nutrition at a glance. Update goals anytime in Settings.</p>
          </div>
          <div className="home-header-pills">
            <span className="status-pill">{todayCount} logs today</span>
            <span className="status-pill">{remainingCalories.toFixed(0)} kcal left</span>
            {logStreak > 0 && <span className="status-pill status-pill-streak">{logStreak}-day streak</span>}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card hero-card macros-card">
          <h2>Macros</h2>
          <div className="macro-ring-grid">
            <div className="macro-ring-block carbs">
              <p>Carbohydrates</p>
              <div className="macro-circle">
                <strong>{carbs.toFixed(0)}</strong>
                <span>/{carbsGoal}g</span>
              </div>
              <small>{Math.max(carbsGoal - carbs, 0).toFixed(0)}g left</small>
            </div>
            <div className="macro-ring-block fat">
              <p>Fat</p>
              <div className="macro-circle">
                <strong>{fat.toFixed(0)}</strong>
                <span>/{fatGoal}g</span>
              </div>
              <small>{Math.max(fatGoal - fat, 0).toFixed(0)}g left</small>
            </div>
            <div className="macro-ring-block protein">
              <p>Protein</p>
              <div className="macro-circle">
                <strong>{protein.toFixed(0)}</strong>
                <span>/{proteinGoal}g</span>
              </div>
              <small>{Math.max(proteinGoal - protein, 0).toFixed(0)}g left</small>
            </div>
          </div>
        </div>

        <div className="card hero-card overview-card">
          <div className="hero-row">
            <div>
              <p className="hero-kicker">Today</p>
              <h2>{calories.toFixed(0)} kcal</h2>
              <p className="hero-subtitle">{todayCount} entries logged</p>
              <p className="hero-progress-copy">{remainingCalories.toFixed(0)} kcal remaining toward your target.</p>
            </div>
            <div className="goal-ring" style={{ '--goal-pct': `${caloriePct}%` }}>
              <strong>{caloriePct}%</strong>
              <span>of goal</span>
            </div>
          </div>
          <div className="macro-grid">
            <div className="macro-chip protein">Protein {protein.toFixed(1)}g</div>
            <div className="macro-chip carbs">Carbs {carbs.toFixed(1)}g</div>
            <div className="macro-chip fat">Fat {fat.toFixed(1)}g</div>
          </div>
        </div>

        <div className="card quick-actions-card">
          <h2>Next steps</h2>
          <ul className="home-menu">
            <li>
              <Link to="/meal-prep">
                <strong>Log a meal</strong>
                <span className="home-menu-desc">Search foods and add to your diary</span>
              </Link>
            </li>
            <li>
              <Link to="/barcode">
                <strong>Scan a product</strong>
                <span className="home-menu-desc">Use barcode lookup when packaging is handy</span>
              </Link>
            </li>
            <li>
              <Link to="/settings">
                <strong>Adjust targets</strong>
                <span className="home-menu-desc">Calories, macros, water, and appearance</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="card insight-card">
        <div className="insight-card-header">
          <h2>Today vs goals</h2>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setGoalsOpen((o) => !o)}
          >
            {goalsOpen ? 'Hide detail' : 'Show detail'}
          </button>
        </div>
        <div className="insight-rows">
          {(goalsOpen ? snapshotRows : snapshotRows.slice(0, 2)).map((item) => (
            <div key={item.name} className="insight-row">
              <span>{item.name}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <p className="insight-footnote">
          <button type="button" className="link-inline" onClick={() => navigate('/bmr')}>
            Open calorie calculator
          </button>
          {' · '}
          <Link to="/settings">Edit daily goals</Link>
        </p>
      </div>

      <div className="card chart-card-home">
        <div className="chart-card-head">
          <h2>Seven-day calories</h2>
          <button type="button" className="btn btn-ghost btn-compact" onClick={() => navigate('/analytics')}>
            View analytics
          </button>
        </div>
        <div className="weekly-bars">
          {lastSevenDays.map((day) => (
            <div key={day.label} className="day-bar-wrap">
              <div className="day-bar-track">
                <div
                  className="day-bar-fill"
                  style={{ height: `${day.total > 0 ? Math.max((day.total / maxWeekly) * 100, 4) : 0}%` }}
                />
              </div>
              <strong>{day.label}</strong>
              <span>{day.total.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
