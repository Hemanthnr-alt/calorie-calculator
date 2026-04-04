import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

export default function FoodLog({ foodLog, onDeleteFood }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [footerTab, setFooterTab] = useState('nutrition');
  const [diaryNote, setDiaryNote] = useState(() => localStorage.getItem('diaryNote') || '');

  const normalizedLog = useMemo(
    () =>
      (foodLog || []).map((item) => ({
        ...item,
        food_name: item.food_name || 'Unnamed Food',
        calories: Number(item.calories || 0),
        protein: Number(item.protein || 0),
        carbs: Number(item.carbs || 0),
        fat: Number(item.fat || 0),
        date: item.date || new Date().toISOString(),
      })),
    [foodLog]
  );

  const filteredAndSortedLog = useMemo(() => {
    let filtered = [...normalizedLog];

    // Filter by time period
    const now = new Date();
    switch (filter) {
      case 'today':
        filtered = normalizedLog.filter((item) => {
          const itemDate = new Date(item.date);
          return itemDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = normalizedLog.filter((item) => new Date(item.date) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = normalizedLog.filter((item) => new Date(item.date) >= monthAgo);
        break;
      default:
        filtered = [...normalizedLog];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (normalizedSearch) {
      filtered = filtered.filter((item) => item.food_name?.toLowerCase().includes(normalizedSearch));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'calories-desc':
          return b.calories - a.calories;
        case 'calories-asc':
          return a.calories - b.calories;
        case 'name':
          return a.food_name.localeCompare(b.food_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [normalizedLog, filter, sortBy, searchTerm]);

  const total = filteredAndSortedLog.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this food entry?')) {
      onDeleteFood(id);
    }
  };

  const diaryGoal = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dailyGoals') || '{}');
      return Number(stored?.calories || 1700);
    } catch {
      return 1700;
    }
  }, []);
  const foodCalories = Number(total.calories || 0);
  const exerciseCalories = 0;
  const remainingCalories = Math.max(diaryGoal - foodCalories + exerciseCalories, 0);

  const filterLabel =
    filter === 'today'
      ? 'Today'
      : filter === 'week'
        ? 'This Week'
        : filter === 'month'
          ? 'This Month'
          : 'All Time';

  const mealBuckets = useMemo(() => {
    const buckets = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snacks: [],
    };

    filteredAndSortedLog.forEach((item) => {
      const hour = new Date(item.date).getHours();
      if (hour < 11) buckets.Breakfast.push(item);
      else if (hour < 16) buckets.Lunch.push(item);
      else if (hour < 22) buckets.Dinner.push(item);
      else buckets.Snacks.push(item);
    });

    return buckets;
  }, [filteredAndSortedLog]);

  const getSectionCalories = (items) => items.reduce((sum, item) => sum + Number(item.calories || 0), 0);

  const handleNoteChange = (value) => {
    setDiaryNote(value);
    localStorage.setItem('diaryNote', value);
  };

  return (
    <div className="page-stack diary-page-stack">
      <div className="page-header">
        <h1>Food diary</h1>
        <p>Review meals by time of day, filter the window you care about, and keep notes alongside macros.</p>
      </div>

      <div className="card diary-summary-card">
        <h2>Calories remaining</h2>
        <p className="diary-filter-meta diary-summary-lede">Based on: {filterLabel}</p>
        <div className="diary-calc-grid">
          <div>
            <strong>{diaryGoal.toFixed(0)}</strong>
            <span>Goal</span>
          </div>
          <div className="symbol">-</div>
          <div>
            <strong>{foodCalories.toFixed(0)}</strong>
            <span>Food</span>
          </div>
          <div className="symbol">+</div>
          <div>
            <strong>{exerciseCalories.toFixed(0)}</strong>
            <span>Exercise</span>
          </div>
          <div className="symbol">=</div>
          <div className="remaining-cell">
            <strong>{remainingCalories.toFixed(0)}</strong>
            <span>Remaining</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Filters & sort</h2>
        <div className="diary-filter-grid">
          <div className="diary-pill-group" role="tablist" aria-label="Time period filter">
            {[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={filter === option.value ? 'active' : ''}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="form-group diary-filter-field">
            <label className="form-label" htmlFor="diary-search">
              Search foods
            </label>
            <input
              id="diary-search"
              type="text"
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group diary-filter-field">
            <label className="form-label" htmlFor="diary-sort">
              Sort by
            </label>
            <select id="diary-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="calories-desc">Highest Calories</option>
              <option value="calories-asc">Lowest Calories</option>
              <option value="name">Food Name</option>
            </select>
          </div>
        </div>
        <p className="diary-filter-meta">
          Showing {filteredAndSortedLog.length} item{filteredAndSortedLog.length === 1 ? '' : 's'}
        </p>
      </div>

      {filteredAndSortedLog.length === 0 ? (
        <div className="card diary-empty-state">
          <h2>No entries found</h2>
          <p>Try a different filter or add your first meal for this period.</p>
          <div className="diary-add-row">
            <Link to="/meal-prep">ADD FOOD</Link>
            <Link to="/barcode">SCAN</Link>
          </div>
        </div>
      ) : null}

      <div className="diary-sections">
        {Object.entries(mealBuckets).map(([mealName, items]) => (
          <section key={mealName} className="card diary-meal-card">
            <div className="diary-section-head">
              <h3>{mealName}</h3>
              <strong>{getSectionCalories(items).toFixed(0)}</strong>
            </div>

            {items.length === 0 ? (
              <div className="diary-add-row">
                <Link to="/meal-prep">ADD FOOD</Link>
                <Link to="/barcode">SCAN</Link>
              </div>
            ) : (
              <>
                <ul className="food-log diary-list">
                  {items.map((item) => (
                    <li key={item.id} className="food-item diary-food-item">
                      <div className="food-item-content">
                        <div className="food-item-title">{item.food_name}</div>
                        <div className="food-item-macros">
                          {item.calories} kcal • {item.protein}g P • {item.carbs}g C • {item.fat}g F
                        </div>
                      </div>
                      <button className="btn btn-outline" onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="diary-add-row">
                  <Link to="/meal-prep">ADD FOOD</Link>
                  <Link to="/barcode">SCAN</Link>
                </div>
              </>
            )}
          </section>
        ))}

        <section className="card diary-meal-card">
          <div className="diary-section-head">
            <h3>Exercise</h3>
            <strong>0</strong>
          </div>
          <div className="diary-add-row">
            <Link to="/workouts">ADD EXERCISE</Link>
            <Link to="/workouts">LOG</Link>
          </div>
        </section>

        <section className="card diary-meal-card">
          <div className="diary-section-head">
            <h3>Water</h3>
            <strong>0</strong>
          </div>
          <div className="food-item" style={{ marginBottom: '0.5rem' }}>
            <div className="food-item-content">
              <div className="food-item-title">Water</div>
              <div className="food-item-date">0 cups</div>
            </div>
            <strong>-</strong>
          </div>
          <div className="diary-add-row">
            <Link to="/water">ADD WATER</Link>
            <Link to="/water">TRACK</Link>
          </div>
        </section>
      </div>

      <div className="card diary-footer-tabs">
        <button
          className={footerTab === 'nutrition' ? 'active' : ''}
          onClick={() => setFooterTab('nutrition')}
        >
          Nutrition
        </button>
        <button
          className={footerTab === 'notes' ? 'active' : ''}
          onClick={() => setFooterTab('notes')}
        >
          Notes
        </button>
      </div>

      {footerTab === 'nutrition' ? (
        <div className="summary-grid">
          <div className="summary-card">
            <h3>{Number(total.protein || 0).toFixed(1)}g</h3>
            <p>Protein</p>
          </div>
          <div className="summary-card">
            <h3>{Number(total.carbs || 0).toFixed(1)}g</h3>
            <p>Carbs</p>
          </div>
          <div className="summary-card">
            <h3>{Number(total.fat || 0).toFixed(1)}g</h3>
            <p>Fat</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Diary notes</h2>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="diary-notes">
              Private notes
            </label>
            <textarea
              id="diary-notes"
              rows={6}
              placeholder="Cravings, training, sleep, how you felt…"
              value={diaryNote}
              onChange={(e) => handleNoteChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
