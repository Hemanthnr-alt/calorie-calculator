import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  addRecipe, getRecipes, deleteRecipe,
  addFoodEntry, checkAndUnlockAchievements, searchFoods
} from '../db/database.js';

const UNITS = [
  { label: 'g',         mult: 1/100 },
  { label: 'ml',        mult: 1/100 },
  { label: 'piece(s)',  mult: 1 },
  { label: 'tbsp',      mult: 0.15 },
  { label: 'tsp',       mult: 0.05 },
  { label: 'cup',       mult: 2.4 },
  { label: 'slice',     mult: 0.3 },
  { label: 'serving',   mult: 1 },
];

function calcIngMacros(ing) {
  // For g/ml: per 100g base. For other units: per 1 unit base.
  const isWeight = ing.unit === 'g' || ing.unit === 'ml';
  const ratio = isWeight ? ing.amount / 100 : ing.amount;
  return {
    calories: Math.round(ing.baseCalories * ratio),
    protein:  Math.round(ing.baseProtein  * ratio),
    carbs:    Math.round(ing.baseCarbs    * ratio),
    fat:      Math.round(ing.baseFat      * ratio),
  };
}

export default function Recipes() {
  const { showToast } = useApp();
  const [recipes, setRecipes]       = useState([]);
  const [mode, setMode]             = useState('list'); // 'list' | 'create' | 'view'
  const [viewRecipe, setViewRecipe] = useState(null);
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [ingSearch, setIngSearch]   = useState('');
  const [ingResults, setIngResults] = useState([]);
  const [logMealType, setLogMealType] = useState('snack');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => getRecipes().then(setRecipes), []);
  useEffect(() => { load(); }, [load]);

  // Search offline & custom foods
  useEffect(() => {
    if (ingSearch.length > 1) {
      const t = setTimeout(async () => {
        const res = await searchFoods(ingSearch, 25);
        setIngResults(res);
      }, 150);
      return () => clearTimeout(t);
    } else {
      setIngResults([]);
    }
  }, [ingSearch]);

  const addIngredient = (food) => {
    setIngredients(prev => [...prev, {
      id: Date.now(),
      name: food.name,
      amount: 100,
      unit: 'g',
      baseCalories: food.calories,
      baseProtein: food.protein || 0,
      baseCarbs: food.carbs || 0,
      baseFat: food.fat || 0,
    }]);
    setIngSearch('');
    setIngResults([]);
  };

  const updateIngredient = (id, key, value) => {
    setIngredients(prev => prev.map(ing =>
      ing.id === id ? { ...ing, [key]: key === 'amount' ? Number(value) || 0 : value } : ing
    ));
  };

  const removeIngredient = (id) => setIngredients(prev => prev.filter(i => i.id !== id));

  const totals = ingredients.reduce((acc, ing) => {
    const m = calcIngMacros(ing);
    return {
      calories: acc.calories + m.calories,
      protein:  acc.protein  + m.protein,
      carbs:    acc.carbs    + m.carbs,
      fat:      acc.fat      + m.fat,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const saveRecipe = async () => {
    if (!recipeName.trim() || ingredients.length === 0) {
      showToast('Name + at least one ingredient needed', '⚠️'); return;
    }
    const snapIngredients = ingredients.map(ing => ({ ...ing, ...calcIngMacros(ing) }));
    await addRecipe({
      name: recipeName.trim(),
      ingredients: snapIngredients,
      totalCalories: totals.calories,
      totalProtein:  totals.protein,
      totalCarbs:    totals.carbs,
      totalFat:      totals.fat,
    });
    showToast(`"${recipeName}" saved!`, '🧪');
    setRecipeName(''); setIngredients([]); setMode('list'); load();
    const ach = await checkAndUnlockAchievements();
    if (ach.length > 0) showToast(`🏆 ${ach[0].name}!`, ach[0].icon);
  };

  const logRecipe = async (recipe) => {
    await addFoodEntry({
      foodName: recipe.name,
      calories: recipe.totalCalories,
      protein:  recipe.totalProtein,
      carbs:    recipe.totalCarbs,
      fat:      recipe.totalFat,
      mealType: logMealType,
    });
    showToast(`Logged "${recipe.name}"`, '✅');
    setViewRecipe(null); setMode('list');
  };

  const handleDelete = async (id) => {
    await deleteRecipe(id);
    showToast('Recipe deleted', '🗑️');
    setConfirmDelete(null); setViewRecipe(null); setMode('list'); load();
  };

  /* ══════ RENDER ══════ */
  return (
    <div className="page page-enter">
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Recipes</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--tx-3)', marginTop: '2px' }}>Build & log your custom meals</div>
        </div>
        {mode === 'list' && (
          <button className="btn btn-primary btn-sm" onClick={() => { setMode('create'); setRecipeName(''); setIngredients([]); }}>
            + New
          </button>
        )}
        {mode !== 'list' && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setMode('list'); setViewRecipe(null); }}>
            ← Back
          </button>
        )}
      </div>

      {/* ═══ LIST ═══ */}
      {mode === 'list' && (
        recipes.length === 0 ? (
          <div className="card">
            <div className="recipes-empty">
              <div className="recipes-empty-icon">🧪</div>
              <h3>No recipes yet</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--tx-3)', lineHeight: 1.5 }}>
                Create your first recipe by combining foods from the database with custom measurements.
              </p>
              <button className="btn btn-primary" onClick={() => setMode('create')}>Create Recipe</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            {recipes.map(recipe => (
              <div key={recipe.id} className="recipe-card"
                onClick={() => { setViewRecipe(recipe); setMode('view'); }}>
                <div className="recipe-card-icon">🍲</div>
                <div className="recipe-card-body">
                  <div className="recipe-card-name">{recipe.name}</div>
                  <div className="recipe-card-meta">
                    {recipe.ingredients?.length || 0} ingredients · P:{recipe.totalProtein}g · C:{recipe.totalCarbs}g · F:{recipe.totalFat}g
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="recipe-card-cal">{recipe.totalCalories}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--tx-3)' }}>kcal</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ═══ CREATE BUILDER ═══ */}
      {mode === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {/* Macros Summary Hero */}
          <div className="card-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total Calories</div>
                <div style={{
                  fontFamily: 'var(--font-heading)', fontSize: '2.8rem', fontWeight: 900,
                  letterSpacing: '-0.05em', lineHeight: 1,
                  color: totals.calories > 0 ? 'var(--accent-bright)' : 'var(--tx-3)',
                  transition: 'color 0.2s',
                }}>
                  {totals.calories}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-4)' }}>
                {[
                  { l: 'P', v: totals.protein, c: 'var(--protein)' },
                  { l: 'C', v: totals.carbs,   c: 'var(--carbs)' },
                  { l: 'F', v: totals.fat,      c: 'var(--fat)' },
                ].map(m => (
                  <div key={m.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, color: m.c, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>{m.v}g</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--tx-3)', fontWeight: 600 }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recipe Name */}
          <div className="card">
            <div className="form-group">
              <label className="form-label">Recipe Name</label>
              <input
                className="input"
                placeholder="e.g. High Protein Bowl"
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
              />
            </div>
          </div>

          {/* Ingredient Search — FIXED dropdown positioning */}
          <div className="card">
            <h2 style={{ marginBottom: 'var(--s-4)' }}>Add Ingredients from Database</h2>

            <div className="form-group" style={{ marginBottom: 'var(--s-3)' }}>
              <label className="form-label">Search food database</label>
              <input
                className="input"
                placeholder="e.g. chicken breast, oats…"
                value={ingSearch}
                onChange={e => setIngSearch(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Results directly below input, NOT absolutely positioned */}
            {ingResults.length > 0 && (
              <div style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--r-lg)',
                overflowY: 'auto',
                maxHeight: '260px',
                marginBottom: 'var(--s-3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}>
                {ingResults.map((food, i) => (
                  <div
                    key={i}
                    onClick={() => addIngredient(food)}
                    style={{
                      padding: 'var(--s-4)',
                      borderBottom: i < ingResults.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--tx-1)' }}>{food.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)' }}>per 100g · P:{food.protein}g C:{food.carbs}g F:{food.fat}g</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent-bright)', fontSize: '0.9rem' }}>{food.calories}</span>
                      <span style={{
                        background: 'var(--accent-fill)', border: '1px solid var(--accent-border)',
                        color: 'var(--accent-bright)', fontSize: '0.65rem', fontWeight: 700,
                        padding: '2px 8px', borderRadius: 'var(--r-full)',
                      }}>+ ADD</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ingSearch.length > 1 && ingResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--s-5)', fontSize: '0.82rem', color: 'var(--tx-3)' }}>
                No results for "{ingSearch}"
              </div>
            )}

            {/* Ingredient list */}
            {ingredients.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)', marginTop: 'var(--s-2)' }}>
                  Ingredients ({ingredients.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                  {ingredients.map(ing => {
                    const m = calcIngMacros(ing);
                    return (
                      <div key={ing.id} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r-md)',
                        padding: 'var(--s-3)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s-2)' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--tx-1)', flex: 1, marginRight: 'var(--s-2)' }}>{ing.name}</div>
                          <button
                            onClick={() => removeIngredient(ing.id)}
                            style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', width: '26px', height: '26px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}
                          >✕</button>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center', marginBottom: 'var(--s-2)' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={ing.amount}
                            onChange={e => updateIngredient(ing.id, 'amount', e.target.value)}
                            style={{
                              width: '80px', height: '34px', borderRadius: 'var(--r-sm)',
                              background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
                              color: 'var(--tx-1)', padding: '0 10px', fontSize: '0.9rem', fontWeight: 700,
                            }}
                          />
                          <select
                            value={ing.unit}
                            onChange={e => updateIngredient(ing.id, 'unit', e.target.value)}
                            style={{
                              height: '34px', borderRadius: 'var(--r-sm)', fontSize: '0.8rem',
                              background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
                              color: 'var(--tx-2)', padding: '0 8px', cursor: 'pointer', flex: 1,
                            }}
                          >
                            {UNITS.map(u => <option key={u.label} value={u.label}>{u.label}</option>)}
                          </select>
                          <span style={{ fontWeight: 800, color: 'var(--accent-bright)', fontSize: '0.9rem', minWidth: '44px', textAlign: 'right' }}>{m.calories} cal</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>
                          P:{m.protein}g · C:{m.carbs}g · F:{m.fat}g
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            className="btn btn-primary btn-block"
            onClick={saveRecipe}
            style={{ opacity: (!recipeName.trim() || ingredients.length === 0) ? 0.5 : 1 }}
          >
            💾 Save Recipe
          </button>
          <div style={{ height: 'var(--s-4)' }} />
        </div>
      )}

      {/* ═══ VIEW RECIPE ═══ */}
      {mode === 'view' && viewRecipe && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {/* Macro hero */}
          <div className="card-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total Nutrition</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--accent-bright)' }}>{viewRecipe.totalCalories}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)', fontWeight: 600, marginTop: '2px' }}>kcal total</div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-5)' }}>
                {[
                  { l: 'Protein', v: viewRecipe.totalProtein, c: 'var(--protein)' },
                  { l: 'Carbs',   v: viewRecipe.totalCarbs,   c: 'var(--carbs)' },
                  { l: 'Fat',     v: viewRecipe.totalFat,     c: 'var(--fat)' },
                ].map(m => (
                  <div key={m.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, color: m.c, fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>{m.v}g</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ingredients list */}
          <div className="card">
            <h2 style={{ marginBottom: 'var(--s-4)' }}>Ingredients</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              {(viewRecipe.ingredients || []).map((ing, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--s-3)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ing.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)' }}>{ing.amount} {ing.unit} · P:{ing.protein}g C:{ing.carbs}g F:{ing.fat}g</div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-bright)', fontSize: '0.9rem' }}>{ing.calories} cal</div>
                </div>
              ))}
            </div>
          </div>

          {/* Log */}
          <div className="card">
            <h2 style={{ marginBottom: 'var(--s-3)' }}>Log This Recipe</h2>
            <div className="meal-selector" style={{ marginBottom: 'var(--s-4)' }}>
              {[
                { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
                { id: 'lunch',     label: 'Lunch',     icon: '☀️' },
                { id: 'dinner',    label: 'Dinner',    icon: '🌙' },
                { id: 'snack',     label: 'Snack',     icon: '🍿' },
              ].map(m => (
                <button key={m.id} className={`meal-sel-btn${logMealType === m.id ? ' active' : ''}`} onClick={() => setLogMealType(m.id)}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-block" onClick={() => logRecipe(viewRecipe)}>
              ✅ Log to {logMealType.charAt(0).toUpperCase() + logMealType.slice(1)}
            </button>
          </div>

          {/* Delete */}
          {confirmDelete === viewRecipe.id ? (
            <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
              <button className="btn btn-secondary btn-block" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger btn-block" onClick={() => handleDelete(viewRecipe.id)}>Confirm Delete</button>
            </div>
          ) : (
            <button className="btn btn-danger btn-sm btn-pill" style={{ alignSelf: 'center' }} onClick={() => setConfirmDelete(viewRecipe.id)}>
              🗑️ Delete Recipe
            </button>
          )}
          <div style={{ height: 'var(--s-4)' }} />
        </div>
      )}
    </div>
  );
}
