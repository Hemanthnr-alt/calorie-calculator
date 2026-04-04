import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import foodsOffline from '../data/foods-offline.json';
import * as offlineStore from '../lib/offlineStore.js';

export default function BarcodeScanner({ token, userId, onAddFood, offline }) {
  const [barcode, setBarcode] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [scannedProducts, setScannedProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [servingGrams, setServingGrams] = useState({});

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setMessage('');
    if (offline) {
      setMessage('Barcode database runs on the server. Use name search below for offline foods, or sign in when online.');
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch(`/barcode-products/${encodeURIComponent(barcode.trim())}`);
      if (res.ok) {
        const product = await res.json();
        setScannedProducts((prev) => {
          const exists = prev.some((item) => item.barcode === product.barcode);
          return exists ? prev : [product, ...prev];
        });
        setServingGrams(prev => ({ ...prev, [product.barcode]: 100 }));
        setBarcode('');
        setMessage('Product found and added to your queue.');
      } else {
        setMessage('Product not found for that barcode. Try text search below.');
      }
    } catch (err) {
      console.error('Error scanning barcode:', err);
      setMessage('Could not reach barcode API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchPopular = async () => {
      if (offline) {
        const mapped = foodsOffline.slice(0, 8).map((f) => ({
          barcode: `offline-${f.name}`,
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          brand: 'Offline pack',
        }));
        if (mounted) setPopularProducts(mapped);
        return;
      }
      try {
        const res = await apiFetch('/barcode-products/popular?limit=8');
        if (!res.ok) {
          const mapped = foodsOffline.slice(0, 8).map((f) => ({
            barcode: `offline-${f.name}`,
            name: f.name,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
            brand: 'Offline pack',
          }));
          if (mounted) setPopularProducts(mapped);
          return;
        }
        const data = await res.json();
        if (mounted) setPopularProducts(data.length ? data : []);
      } catch {
        const mapped = foodsOffline.slice(0, 8).map((f) => ({
          barcode: `offline-${f.name}`,
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          brand: 'Offline pack',
        }));
        if (mounted) setPopularProducts(mapped);
      }
    };

    fetchPopular();
    return () => {
      mounted = false;
    };
  }, [offline]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      if (nameQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      const q = nameQuery.trim().toLowerCase();
      if (offline) {
        const data = foodsOffline
          .filter((f) => f.name.toLowerCase().includes(q))
          .slice(0, 10)
          .map((f) => ({
            barcode: `offline-${f.name}`,
            name: f.name,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
            brand: 'Offline pack',
          }));
        setSearchResults(data);
        return;
      }

      try {
        const res = await apiFetch(
          `/barcode-products/search?q=${encodeURIComponent(nameQuery.trim())}&limit=10`,
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
  }, [nameQuery, offline]);

  const addToQueue = (product) => {
    setScannedProducts((prev) => {
      const exists = prev.some((item) => item.barcode === product.barcode);
      return exists ? prev : [product, ...prev];
    });
    setServingGrams(prev => ({ ...prev, [product.barcode]: 100 }));
    setMessage('Product staged. Add it to your log when ready.');
  };

  const addProductToLog = async (product) => {
    const grams = servingGrams[product.barcode] || 100;
    const multiplier = grams / 100;

    if (offline) {
      offlineStore.addFoodLogEntry(userId, {
        food_name: product.name,
        calories: Number((Number(product.calories || 0) * multiplier).toFixed(0)),
        protein: Number((Number(product.protein || 0) * multiplier).toFixed(1)),
        carbs: Number((Number(product.carbs || 0) * multiplier).toFixed(1)),
        fat: Number((Number(product.fat || 0) * multiplier).toFixed(1)),
        date: new Date().toISOString(),
      });
      setScannedProducts((prev) => prev.filter((p) => p.barcode !== product.barcode));
      setServingGrams((prev) => {
        const updated = { ...prev };
        delete updated[product.barcode];
        return updated;
      });
      setMessage(`${product.name} (${grams}g) added to your local log.`);
      if (onAddFood) onAddFood();
      return;
    }

    try {
      const res = await apiFetch('/food-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          food_name: product.name,
          calories: (Number(product.calories || 0) * multiplier).toFixed(0),
          protein: (Number(product.protein || 0) * multiplier).toFixed(1),
          carbs: (Number(product.carbs || 0) * multiplier).toFixed(1),
          fat: (Number(product.fat || 0) * multiplier).toFixed(1)
        })
      });

      if (res.ok) {
        setScannedProducts((prev) => prev.filter((p) => p.barcode !== product.barcode));
        setServingGrams(prev => {
          const updated = { ...prev };
          delete updated[product.barcode];
          return updated;
        });
        setMessage(`${product.name} (${grams}g) added to food log.`);
        if (onAddFood) onAddFood();
      }
    } catch (err) {
      console.error('Error adding product:', err);
      setMessage('Could not add product to food log.');
    }
  };

  const removeProduct = (productBarcode) => {
    setScannedProducts(scannedProducts.filter(p => p.barcode !== productBarcode));
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Barcode &amp; products</h1>
        <p>Resolve packaged foods by code or name, stage them in a queue, then commit portions to your diary.</p>
        {offline && (
          <p className="helper-note" style={{ marginTop: '0.65rem' }}>
            Offline: barcode lookup needs the server. Name search below uses the built-in food list.
          </p>
        )}
      </div>

      <div className="barcode-split barcode-split--2">
        <div className="card">
          <h2>Barcode lookup</h2>
          <form onSubmit={handleScanSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="bc-code">
                Code (EAN / UPC)
              </label>
              <input
                id="bc-code"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Type or scan"
                autoFocus
              />
              <p className="form-hint-subtle">USB scanners usually type straight into the focused field.</p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching…' : 'Find product'}
            </button>
          </form>
          {message ? <p className="helper-note">{message}</p> : null}
        </div>

        <div className="card">
          <h2>Name search</h2>
          <div className="form-group">
            <label className="form-label" htmlFor="bc-name">
              Keyword
            </label>
            <input
              id="bc-name"
              type="search"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="yogurt, oats, protein bar…"
            />
          </div>
          <p className="settings-subheading" style={{ margin: '0 0 0.5rem' }}>
            {searchResults.length ? 'Results' : 'Popular'}
          </p>
          <div className="barcode-product-scroll">
            {(searchResults.length > 0 ? searchResults : popularProducts).map((product) => (
              <button key={product.barcode} type="button" className="barcode-product-tile" onClick={() => addToQueue(product)}>
                <strong>{product.name}</strong>
                <small>{Number(product.calories || 0).toFixed(0)} kcal / 100g</small>
                <small>{product.brand || 'Brand unknown'}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      {scannedProducts.length > 0 && (
        <div className="card">
          <h2>Queue · {scannedProducts.length}</h2>
          <p className="settings-subcopy" style={{ marginTop: '-0.35rem' }}>
            Set grams (nutrition values scale per 100g) then add to your diary.
          </p>
          {scannedProducts.map((product) => {
            const grams = servingGrams[product.barcode] || 100;
            const multiplier = grams / 100;
            return (
              <div key={product.barcode} className="barcode-queue-row">
                <div className="food-item-content" style={{ flex: '1 1 200px' }}>
                  <strong>{product.name}</strong>
                  <div className="food-item-macros">
                    {(Number(product.calories || 0) * multiplier).toFixed(0)} kcal ·{' '}
                    {(Number(product.protein || 0) * multiplier).toFixed(1)}g P ·{' '}
                    {(Number(product.carbs || 0) * multiplier).toFixed(1)}g C ·{' '}
                    {(Number(product.fat || 0) * multiplier).toFixed(1)}g F
                  </div>
                  {product.serving_size ? <div className="food-item-date">Serving: {product.serving_size}</div> : null}
                  {product.brand ? <div className="food-item-date">{product.brand}</div> : null}
                </div>
                <div className="barcode-queue-actions">
                  <div className="form-group" style={{ margin: 0, minWidth: '6rem' }}>
                    <label className="form-label" htmlFor={`g-${product.barcode}`}>
                      Grams
                    </label>
                    <input
                      id={`g-${product.barcode}`}
                      type="number"
                      min="1"
                      step="1"
                      value={grams}
                      onChange={(e) =>
                        setServingGrams((prev) => ({ ...prev, [product.barcode]: Number(e.target.value) || 100 }))
                      }
                    />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => addProductToLog(product)}>
                    Add to log
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => removeProduct(product.barcode)}>
                    Drop
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h2>How it works</h2>
        <ul className="barcode-help-list">
          <li>Exact matches flow straight from the barcode database.</li>
          <li>Name search fills the queue when you don&apos;t have packaging nearby.</li>
          <li>Anything staged waits here until you confirm grams and add.</li>
        </ul>
      </div>
    </div>
  );
}
