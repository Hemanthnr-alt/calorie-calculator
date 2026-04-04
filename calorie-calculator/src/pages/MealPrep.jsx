import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiBookOpen,
  FiGrid,
  FiChevronDown,
  FiPlus,
  FiSearch,
  FiSettings,
  FiSliders,
  FiTarget,
} from 'react-icons/fi';
import { LuScanLine } from 'react-icons/lu';
import { apiFetch } from '../lib/api.js';
import foodsOffline from '../data/foods-offline.json';

const PORTION_PRESETS = [0.5, 1, 1.5, 2];

export default function MealPrep({
  foodName,
  calories,
  protein,
  carbs,
  fat,
  setFoodName,
  setCalories,
  setProtein,
  setCarbs,
  setFat,
  onAddFood,
  summary,
  error,
  offline,
}) {
  const [quickFoods, setQuickFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [listExpanded, setListExpanded] = useState(true);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 67,
  });

  useEffect(() => {
     const savedGoals = localStorage.getItem('dailyGoals');
    if (savedGoals) {
      try {
        const parsed = JSON.parse(savedGoals);
        setDailyGoals((prev) => ({
          ...prev,
          calories: Number(parsed.calories ?? prev.calories),
          protein: Number(parsed.protein ?? prev.protein),
          carbs: Number(parsed.carbs ?? prev.carbs),
          fat: Number(parsed.fat ?? prev.fat),
        }));
      } catch {
        /* ignore */
      }
    }

    const loadPopularFoods = async () => {
      if (offline) {
        setQuickFoods(foodsOffline.slice(0, 12).map((f) => ({ ...f, id: f.name })));
        return;
      }
      try {
        const res = await apiFetch('/barcode-products/popular?limit=12');
        if (!res.ok) {
          setQuickFoods(foodsOffline.slice(0, 12).map((f) => ({ ...f, id: f.name })));
          return;
        }
        const data = await res.json();
        setQuickFoods(data.length ? data : foodsOffline.slice(0, 12).map((f) => ({ ...f, id: f.name })));
      } catch {
        setQuickFoods(foodsOffline.slice(0, 12).map((f) => ({ ...f, id: f.name })));
      }
    };

    loadPopularFoods();
  }, [offline]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      const q = searchTerm.trim().toLowerCase();
      if (offline) {
        const filtered = foodsOffline
          .filter((f) => f.name.toLowerCase().includes(q))
          .slice(0, 20)
          .map((f) => ({ ...f, id: f.name }));
        setSearchResults(filtered);
        return;
      }

      try {
        const res = await apiFetch(
          `/foods/autocomplete?q=${encodeURIComponent(searchTerm.trim())}&limit=14`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      }
    }, 240);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm, offline]);

  const quickAddFood = (food) => {
    const multiplier = Math.max(servingMultiplier, 0.1);
    setFoodName(food.name);
    setCalories((Number(food.calories || 0) * multiplier).toFixed(0));
    setProtein((Number(food.protein || 0) * multiplier).toFixed(1));
    setCarbs((Number(food.carbs || 0) * multiplier).toFixed(1));
    setFat((Number(food.fat || 0) * multiplier).toFixed(1));
  };

  const clearForm = () => {
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const updateGoals = (newGoals) => {
    setDailyGoals(newGoals);
    localStorage.setItem('dailyGoals', JSON.stringify(newGoals));
  };

  const getProgressPercentage = (current, goal) => {
    if (!goal) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const todayTargets = useMemo(
    () => [
      { label: 'Calories', current: Number(summary.total_calories || 0), goal: Number(dailyGoals.calories || 0), unit: 'kcal' },
      { label: 'Protein', current: Number(summary.total_protein || 0), goal: Number(dailyGoals.protein || 0), unit: 'g' },
      { label: 'Carbs', current: Number(summary.total_carbs || 0), goal: Number(dailyGoals.carbs || 0), unit: 'g' },
      { label: 'Fat', current: Number(summary.total_fat || 0), goal: Number(dailyGoals.fat || 0), unit: 'g' },
    ],
    [summary, dailyGoals]
  );

  const isSearchMode = searchTerm.trim().length >= 2;
  const quickList = isSearchMode ? searchResults : quickFoods;
  const listHeading = isSearchMode ? `Matches (${quickList.length})` : 'Popular picks';
  const visibleList = listExpanded ? quickList.slice(0, 12) : quickList.slice(0, 5);

  return (
    <div className="page-stack meal-prep-page">
      <div className="page-header">
        <h1>Log food</h1>
        <p>Search your food database, load macros into the form, then save to your diary.</p>
      </div>

      <div className="card meal-prep-shortcuts">
        <h2 className="meal-prep-card-title">Shortcuts</h2>
        <div className="meal-prep-shortcut-grid">
          <Link to="/food-log" className="meal-prep-shortcut">
            <FiBookOpen aria-hidden />
            <span>Diary</span>
          </Link>
          <Link to="/barcode" className="meal-prep-shortcut">
            <LuScanLine aria-hidden />
            <span>Barcode</span>
          </Link>
          <Link to="/analytics" className="meal-prep-shortcut">
            <FiActivity aria-hidden />
            <span>Analytics</span>
          </Link>
          <Link to="/bmr" className="meal-prep-shortcut">
            <FiTarget aria-hidden />
            <span>Calculator</span>
          </Link>
          <Link to="/recommendations" className="meal-prep-shortcut">
            <FiGrid aria-hidden />
            <span>Ideas</span>
          </Link>
          <Link to="/settings" className="meal-prep-shortcut">
            <FiSettings aria-hidden />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      <div className="card meal-prep-progress-card">
        <div className="meal-prep-progress-head">
          <h2 className="meal-prep-card-title">Today vs targets</h2>
          <button type="button" className="btn btn-ghost btn-compact" onClick={() => navigate('/food-log')}>
            Open diary
          </button>
        </div>
        <div className="targets-grid meal-prep-targets">
          {todayTargets.map((target) => (
            <div key={target.label} className="target-tile">
              <div className="target-row">
                <strong>{target.label}</strong>
                <span>
                  {target.current.toFixed(0)} / {target.goal.toFixed(0)} {target.unit}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage(target.current, target.goal)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="meal-prep-details">
          <summary>
            <FiSliders aria-hidden />
            Adjust daily targets
            <FiChevronDown className="meal-prep-details-chevron" aria-hidden />
          </summary>
          <div className="meal-prep-goals-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="tg-cal">Calories</label>
              <input
                id="tg-cal"
                type="number"
                value={dailyGoals.calories}
                onChange={(e) => updateGoals({ ...dailyGoals, calories: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tg-prot">Protein (g)</label>
              <input
                id="tg-prot"
                type="number"
                value={dailyGoals.protein}
                onChange={(e) => updateGoals({ ...dailyGoals, protein: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tg-carb">Carbs (g)</label>
              <input
                id="tg-carb"
                type="number"
                value={dailyGoals.carbs}
                onChange={(e) => updateGoals({ ...dailyGoals, carbs: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tg-fat">Fat (g)</label>
              <input
                id="tg-fat"
                type="number"
                value={dailyGoals.fat}
                onChange={(e) => updateGoals({ ...dailyGoals, fat: Number(e.target.value) })}
              />
            </div>
          </div>
          <p className="meal-prep-details-hint">Saved on this device. For synced goals, use Settings when signed in.</p>
        </details>
      </div>

      <div className="card meal-prep-database">
        <h2 className="meal-prep-card-title">Food database</h2>
        <p className="meal-prep-lede">
          {offline ? 'Offline list from built-in foods. Connect to search the full catalog.' : 'Search imported Open Food Facts and popular products.'}
        </p>

        <div className="meal-prep-search-row">
          <div className="meal-prep-search-field">
            <label className="form-label" htmlFor="food-search">
              <FiSearch aria-hidden /> Find by name
            </label>
            <input
              id="food-search"
              ref={searchInputRef}
              type="search"
              autoComplete="off"
              placeholder={offline ? 'Search offline foods…' : 'Try: yogurt, rice, protein bar…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="meal-prep-portion-block">
            <span className="form-label">Portion ×</span>
            <div className="meal-prep-portion-inputs">
              <input
                type="number"
                min="0.1"
                step="0.1"
                aria-label="Portion multiplier"
                value={servingMultiplier}
                onChange={(e) => setServingMultiplier(Number(e.target.value) || 1)}
              />
              <div className="meal-prep-chips" role="group" aria-label="Quick portions">
                {PORTION_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`theme-chip ${servingMultiplier === p ? 'active' : ''}`}
                    onClick={() => setServingMultiplier(p)}
                  >
                    ×{p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="meal-prep-toolbar">
          <button type="button" className="btn btn-secondary btn-compact" onClick={clearSearch} disabled={!searchTerm}>
            Clear search
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setListExpanded((v) => !v)}
          >
            {listExpanded ? 'Compact list' : 'Show more rows'}
          </button>
          <button type="button" className="btn btn-ghost btn-compact" onClick={() => searchInputRef.current?.focus()}>
            Focus search
          </button>
        </div>

        <div className="meal-prep-list-head">
          <h3>{listHeading}</h3>
          {!isSearchMode && <span className="meal-prep-muted">Tap “Use in form”, then “Add to log” below.</span>}
        </div>

        {quickList.length === 0 ? (
          <p className="meal-prep-empty">{isSearchMode ? 'No foods match that search.' : 'No popular foods loaded yet.'}</p>
        ) : (
          <ul className="meal-prep-result-list">
            {visibleList.map((food, index) => (
              <li key={`${food.id || food.barcode || food.name}-${index}`} className="meal-prep-result-row">
                <div className="meal-prep-result-main">
                  <span className="meal-prep-result-name">{food.name}</span>
                  <span className="meal-prep-kcal-pill">{Number(food.calories || 0).toFixed(0)} kcal</span>
                </div>
                <dl className="meal-prep-macro-dl">
                  <div>
                    <dt>Protein</dt>
                    <dd>{Number(food.protein || 0).toFixed(1)} g</dd>
                  </div>
                  <div>
                    <dt>Carbs</dt>
                    <dd>{Number(food.carbs || 0).toFixed(1)} g</dd>
                  </div>
                  <div>
                    <dt>Fat</dt>
                    <dd>{Number(food.fat || 0).toFixed(1)} g</dd>
                  </div>
                </dl>
                <button type="button" className="btn btn-primary meal-prep-use-btn" onClick={() => quickAddFood(food)}>
                  <FiPlus aria-hidden />
                  Use in form
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card meal-prep-custom">
        <h2 className="meal-prep-card-title">Manual entry</h2>
        <p className="meal-prep-lede">Edit values, then add to today&apos;s diary.</p>

        <form onSubmit={onAddFood} className="meal-prep-form">
          <div className="form-group">
            <label className="form-label" htmlFor="custom-name">Food name</label>
            <input
              id="custom-name"
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g. Grilled chicken salad"
              required
            />
          </div>

          <div className="meal-prep-macro-inputs">
            <div className="form-group">
              <label className="form-label" htmlFor="custom-cal">Calories</label>
              <input
                id="custom-cal"
                type="number"
                step="1"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="250"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="custom-p">Protein (g)</label>
              <input
                id="custom-p"
                type="number"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="custom-c">Carbs (g)</label>
              <input
                id="custom-c"
                type="number"
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="20"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="custom-f">Fat (g)</label>
              <input
                id="custom-f"
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>

          <div className="meal-prep-form-actions">
            <button type="submit" className="btn btn-primary">
              Add to log
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearForm}>
              Clear form
            </button>
            <Link to="/food-log" className="btn btn-ghost">
              View diary
            </Link>
          </div>
        </form>

        {error ? (
          <div className="inline-error" style={{ marginTop: '1rem' }}>
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
