import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getProfile, saveProfile, todayStr } from '../db/database.js';

const AppContext = createContext(null);

const DEFAULT_PROFILE = {
  age: 25, gender: 'male', weightKg: 70, heightCm: 175,
  activityLevel: 'moderate', goal: 'maintain',
  dailyCalorieGoal: 2000, dailyProteinGoal: 120,
  dailyCarbsGoal: 220, dailyFatGoal: 65, dailyWaterGoalMl: 2500,
};

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupDone, setSetupDone] = useState(false);
  const [toast, setToast] = useState(null);
  const [targetDate, setTargetDate] = useState(todayStr());

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (p) {
        setProfile(p);
        setSetupDone(true);
      }
      setLoading(false);
    })();
  }, []);

  const updateProfile = useCallback(async (data) => {
    const merged = { ...DEFAULT_PROFILE, ...profile, ...data };
    await saveProfile(merged);
    const fresh = await getProfile();
    setProfile(fresh);
    setSetupDone(true);
    return fresh;
  }, [profile]);

  const showToast = useCallback((message, icon = '✅') => {
    setToast({ message, icon, id: Date.now() });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const goals = useMemo(() => ({
    calories: profile?.dailyCalorieGoal || DEFAULT_PROFILE.dailyCalorieGoal,
    protein:  profile?.dailyProteinGoal || DEFAULT_PROFILE.dailyProteinGoal,
    carbs:    profile?.dailyCarbsGoal   || DEFAULT_PROFILE.dailyCarbsGoal,
    fat:      profile?.dailyFatGoal     || DEFAULT_PROFILE.dailyFatGoal,
    water:    profile?.dailyWaterGoalMl || DEFAULT_PROFILE.dailyWaterGoalMl,
  }), [profile]);

  const value = useMemo(() => ({
    profile, goals, loading, setupDone, toast, targetDate,
    updateProfile, showToast, setTargetDate,
  }), [profile, goals, loading, setupDone, toast, targetDate, updateProfile, showToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export default AppContext;
