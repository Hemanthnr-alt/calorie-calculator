import React, { useEffect, useState, useContext, Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, AuthContext, OFFLINE_TOKEN } from '../context/AuthContext.jsx';
import * as offlineStore from '../lib/offlineStore.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import Navbar from '../components/Navbar.jsx';
import Home from '../pages/Home.jsx';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import CalorieCalculator from '../pages/CalorieCalculator.jsx';
import MealPrep from '../pages/MealPrep.jsx';
import FoodLog from '../pages/FoodLog.jsx';
import WaterIntake from '../pages/WaterIntake.jsx';
import ShoppingList from '../pages/ShoppingList.jsx';
import BarcodeScanner from '../pages/BarcodeScanner.jsx';
import More from '../pages/More.jsx';
import Settings from '../pages/Settings.jsx';
import Profile from '../pages/Profile.jsx';
import { apiFetch } from '../lib/api.js';

const Analytics          = lazy(() => import('../pages/Analytics.jsx'));
const Workouts           = lazy(() => import('../pages/Workouts.jsx'));
const MealRecommendations = lazy(() => import('../pages/MealRecommendations.jsx'));

function LoadingFallback() {
  return (
    <div className="page-skeleton" role="status" aria-live="polite">
      <div className="skeleton-row short" />
      <div className="skeleton-row" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

// ─── Route tree ───────────────────────────────────────────────────────────────
function AppRoutes({
  userId, weight, height, age, gender, calculated,
  setWeight, setHeight, setAge, setGender, setCalculated,
  foodName, calories, protein, carbs, fat,
  setFoodName, setCalories, setProtein, setCarbs, setFat,
  addFood, summary, error, foodLog, deleteFood,
  token, refreshNutritionData, user, offline,
}) {
  const location = useLocation();

  return (
    <div key={location.pathname} className="route-transition">
      <Routes location={location}>
        {/* Core */}
        <Route path="/"    element={<Home userId={userId} summary={summary} foodLog={foodLog} />} />
        <Route path="/login"    element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        {/* Profile — new */}
        <Route
          path="/profile"
          element={
            <Profile
              token={token}
              userId={userId}
              user={user}
              offline={offline}
              foodLog={foodLog}
            />
          }
        />

        {/* BMR calculator */}
        <Route
          path="/bmr"
          element={
            <CalorieCalculator
              weight={weight} height={height} age={age} gender={gender}
              calculated={calculated}
              setWeight={setWeight} setHeight={setHeight}
              setAge={setAge} setGender={setGender}
              setCalculated={setCalculated}
            />
          }
        />

        {/* Log food */}
        <Route
          path="/meal-prep"
          element={
            <MealPrep
              foodName={foodName} calories={calories} protein={protein}
              carbs={carbs} fat={fat}
              setFoodName={setFoodName} setCalories={setCalories}
              setProtein={setProtein} setCarbs={setCarbs} setFat={setFat}
              onAddFood={addFood} summary={summary} error={error} offline={offline}
            />
          }
        />

        {/* Diary */}
        <Route
          path="/food-log"
          element={<FoodLog foodLog={foodLog} onDeleteFood={deleteFood} summary={summary} />}
        />

        {/* Health & lifestyle */}
        <Route path="/water"    element={<WaterIntake token={token} userId={userId} offline={offline} />} />
        <Route
          path="/workouts"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Workouts token={token} userId={userId} offline={offline} />
            </Suspense>
          }
        />
        <Route path="/shopping" element={<ShoppingList token={token} userId={userId} offline={offline} />} />

        {/* Analytics */}
        <Route
          path="/analytics"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Analytics token={token} userId={userId} offline={offline} />
            </Suspense>
          }
        />

        {/* Tools */}
        <Route
          path="/barcode"
          element={
            <BarcodeScanner
              token={token}
              userId={userId}
              onAddFood={refreshNutritionData}
              offline={offline}
            />
          }
        />
        <Route
          path="/recommendations"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <MealRecommendations
                token={token}
                userId={userId}
                onAddFood={refreshNutritionData}
                offline={offline}
              />
            </Suspense>
          }
        />

        {/* Settings & more */}
        <Route path="/more"     element={<More />} />
        <Route path="/settings" element={<Settings token={token} userId={userId} user={user} offline={offline} />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// ─── App content ──────────────────────────────────────────────────────────────
function AppContent() {
  const { user, token, loading } = useContext(AuthContext);
  const userId        = user?.id;
  const isOfflineUser = Boolean(user?.offline && token === OFFLINE_TOKEN);
  const online        = useOnlineStatus();

  // Apply motion preset from localStorage on mount
  useEffect(() => {
    const preset = localStorage.getItem('motionPreset') || 'standard';
    document.documentElement.setAttribute('data-motion', preset);
  }, []);

  // ── State ──
  const [weight, setWeight]     = useState('');
  const [height, setHeight]     = useState('');
  const [age,    setAge]        = useState('');
  const [gender, setGender]     = useState('male');
  const [calculated, setCalculated] = useState(null);

  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein,  setProtein]  = useState('');
  const [carbs,    setCarbs]    = useState('');
  const [fat,      setFat]      = useState('');
  const [foodLog,  setFoodLog]  = useState([]);
  const [summary,  setSummary]  = useState({
    total_calories: 0, total_protein: 0,
    total_carbs: 0,    total_fat: 0, food_count: 0,
  });
  const [error, setError] = useState(null);

  // ── Data fetching ──
  const refreshNutritionData = async () => {
    if (isOfflineUser && userId) {
      setFoodLog(offlineStore.getFoodLog(userId));
      setSummary(offlineStore.getDailySummary(userId));
      return;
    }
    if (!userId) return;
    try {
      const [logRes, sumRes] = await Promise.all([
        apiFetch(`/food-log/${userId}`),
        apiFetch(`/daily-summary/${userId}`),
      ]);
      if (logRes.ok) setFoodLog(await logRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!userId) return;

    if (isOfflineUser) {
      setFoodLog(offlineStore.getFoodLog(userId));
      setSummary(offlineStore.getDailySummary(userId));
      setError(null);
      return;
    }

    const controller = new AbortController();
    Promise.all([
      apiFetch(`/food-log/${userId}`,        { signal: controller.signal }),
      apiFetch(`/daily-summary/${userId}`,   { signal: controller.signal }),
    ])
      .then(async ([logRes, sumRes]) => {
        if (!logRes.ok || !sumRes.ok) throw new Error('Fetch failed');
        const [log, sum] = await Promise.all([logRes.json(), sumRes.json()]);
        setFoodLog(log);
        setSummary(sum);
        setError(null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      });

    return () => controller.abort();
  }, [userId, isOfflineUser]);

  // ── Add food ──
  const addFood = async (ev) => {
    ev.preventDefault();
    if (!foodName.trim() || !calories) return;

    const payload = {
      user_id:   userId,
      food_name: foodName.trim(),
      calories:  Number(calories),
      protein:   Number(protein  || 0),
      carbs:     Number(carbs    || 0),
      fat:       Number(fat      || 0),
      date:      new Date().toISOString(),
    };

    try {
      if (isOfflineUser) {
        offlineStore.addFoodLogEntry(userId, payload);
        setFoodLog(offlineStore.getFoodLog(userId));
        setSummary(offlineStore.getDailySummary(userId));
      } else {
        const res = await apiFetch('/food-log', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to add food entry');
        await refreshNutritionData();
      }
      setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Delete food ──
  const deleteFood = async (id) => {
    try {
      if (isOfflineUser) {
        offlineStore.deleteFoodLogEntry(userId, id);
        setFoodLog(offlineStore.getFoodLog(userId));
        setSummary(offlineStore.getDailySummary(userId));
      } else {
        const res = await apiFetch(`/food-log/${id}`, {
          method:  'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete food entry');
        await refreshNutritionData();
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-inner">
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(52,211,153,0.2)',
            borderTop: '3px solid #34d399',
            borderRadius: '50%',
            animation: 'statSpin 0.9s linear infinite',
          }} />
          <span>Loading…</span>
          <style>{`@keyframes statSpin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  // ── Logged-out: show auth routes only ──
  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*"         element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // ── Logged-in shell ──
  return (
    <Router>
      <div className="app">
        <Navbar user={user} offline={isOfflineUser} />

        {!online && (
          <div className="offline-banner" role="status">
            <span className="offline-banner-dot" aria-hidden />
            You are offline. Your diary is still saved on this device.
          </div>
        )}
        {isOfflineUser && online && (
          <div className="offline-mode-banner" role="status">
            Local mode — data stays on this device. Sign in to sync to the server.
          </div>
        )}

        <main>
          <AppRoutes
            userId={userId}
            weight={weight}   height={height}   age={age}   gender={gender}
            calculated={calculated}
            setWeight={setWeight} setHeight={setHeight}
            setAge={setAge}       setGender={setGender}
            setCalculated={setCalculated}
            foodName={foodName}   calories={calories} protein={protein}
            carbs={carbs}         fat={fat}
            setFoodName={setFoodName} setCalories={setCalories}
            setProtein={setProtein}   setCarbs={setCarbs} setFat={setFat}
            addFood={addFood}
            summary={summary}
            error={error}
            foodLog={foodLog}
            deleteFood={deleteFood}
            token={token}
            refreshNutritionData={refreshNutritionData}
            user={user}
            offline={isOfflineUser}
          />
        </main>
      </div>
    </Router>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
