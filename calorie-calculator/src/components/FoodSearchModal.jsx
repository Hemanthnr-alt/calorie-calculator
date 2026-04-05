import React, { useState, useEffect, useRef } from 'react';
import { searchFoodsOfflineFirst, getRecentFoods } from '../db/database.js';

export default function FoodSearchModal({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recents, setRecents] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const inputRef = useRef(null);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery(''); setResults([]);
      getRecentFoods(10).then(setRecents);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const localResults = await searchFoodsOfflineFirst(query, 25, (merged) => setResults(merged));
      setResults(localResults);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  if (!open) return null;

  const select = (f) => {
    onSelect({
      foodName: f.foodName || f.name,
      calories: f.calories || 0,
      protein: f.protein || 0,
      carbs: f.carbs || 0,
      fat: f.fat || 0,
    });
    onClose();
  };

  const showRecents = query.length < 2 && recents.length > 0;
  const showResults = query.length >= 2;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet">
        <div className="modal-handle" />

        {/* Search box */}
        <div style={{ position: 'relative', marginBottom: 'var(--s-4)' }}>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search foods…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          <div style={{
            position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '0.68rem', fontWeight: 700,
            color: isOnline ? 'var(--green)' : 'var(--tx-3)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? 'var(--green)' : 'var(--tx-3)', display: 'block' }} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Recent foods */}
        {showRecents && (
          <div>
            <div className="section-label">Recently eaten</div>
            <div className="search-results">
              {recents.map((f, i) => (
                <div key={i} className="search-item" onClick={() => select(f)}>
                  <div>
                    <div className="search-item-name">{f.foodName}</div>
                    <div className="search-item-macros">P: {f.protein}g · C: {f.carbs}g · F: {f.fat}g</div>
                  </div>
                  <div className="search-item-cal">{f.calories}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div className="search-results">
            {results.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--s-8)' }}>
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No results for "{query}"</div>
                <div className="empty-desc">Try a different spelling or add a custom food</div>
              </div>
            ) : results.map((f, i) => (
              <div key={f.id || i} className="search-item" onClick={() => select(f)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="search-item-name">
                    {f.name}
                    {f.source === 'api' && (
                      <span style={{
                        fontSize: '0.6rem', marginLeft: '6px', padding: '1px 6px',
                        borderRadius: '4px', background: 'var(--accent-fill)',
                        color: 'var(--accent-bright)', fontWeight: 700, verticalAlign: 'middle',
                      }}>ONLINE</span>
                    )}
                  </div>
                  <div className="search-item-macros">P: {f.protein}g · C: {f.carbs}g · F: {f.fat}g</div>
                </div>
                <div className="search-item-cal">{f.calories}</div>
              </div>
            ))}
          </div>
        )}

        {/* Empty initial state */}
        {!showRecents && !showResults && (
          <div className="empty-state" style={{ padding: 'var(--s-8)' }}>
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">Search for a food</div>
            <div className="empty-desc">Type at least 2 characters to search</div>
          </div>
        )}

        <button className="btn btn-secondary btn-block" style={{ marginTop: 'var(--s-5)' }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </>
  );
}
