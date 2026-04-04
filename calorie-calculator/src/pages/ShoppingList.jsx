import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import * as offlineStore from '../lib/offlineStore.js';

function sortShoppingItems(list) {
  return [...list].sort((a, b) => {
    if (Boolean(a.checked) !== Boolean(b.checked)) return a.checked ? 1 : -1;
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
}

export default function ShoppingList({ token, userId, offline }) {
  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState({ item_name: '', quantity: '', unit: 'qty' });
  const [, setLoading] = useState(true);

  const refreshLocal = useCallback(() => {
    setItems(sortShoppingItems(offlineStore.getShoppingList(userId)));
  }, [userId]);

  useEffect(() => {
    if (offline) {
      refreshLocal();
      setLoading(false);
      return;
    }

    const fetchShoppingList = async () => {
      try {
        const res = await apiFetch(`/shopping-list/${userId}`);
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error('Error fetching shopping list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShoppingList();
  }, [userId, offline, refreshLocal]);

  const addItem = async (e) => {
    e.preventDefault();
    if (!itemForm.item_name) return;

    if (offline) {
      offlineStore.addShoppingItem(userId, itemForm);
      setItemForm({ item_name: '', quantity: '', unit: 'qty' });
      refreshLocal();
      return;
    }

    try {
      await apiFetch('/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, ...itemForm }),
      });
      setItemForm({ item_name: '', quantity: '', unit: 'qty' });
      const res = await apiFetch(`/shopping-list/${userId}`);
      setItems(await res.json());
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const toggleItem = async (id, checked) => {
    if (offline) {
      offlineStore.updateShoppingItem(userId, id, { checked: !checked });
      refreshLocal();
      return;
    }
    try {
      await apiFetch(`/shopping-list/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ checked: !checked }),
      });
      const res = await apiFetch(`/shopping-list/${userId}`);
      setItems(await res.json());
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  const deleteItem = async (id) => {
    if (offline) {
      offlineStore.deleteShoppingItem(userId, id);
      refreshLocal();
      return;
    }
    try {
      await apiFetch(`/shopping-list/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await apiFetch(`/shopping-list/${userId}`);
      setItems(await res.json());
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const uncheckedCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.filter((i) => i.checked).length;
  const openItems = items.filter((i) => !i.checked);
  const doneItems = items.filter((i) => i.checked);

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Shopping list</h1>
        <p>Capture quantities and units, check items off as you shop, and clear lines you no longer need.</p>
      </div>

      <div className="stat-strip">
        <div className="stat-hero-card">
          <div className="stat-hero-value" style={{ color: 'var(--color-brand-warning)' }}>
            {uncheckedCount}
          </div>
          <div className="stat-hero-label">Still to buy</div>
        </div>
        <div className="stat-hero-card">
          <div className="stat-hero-value" style={{ color: 'var(--color-brand-accent)' }}>
            {checkedCount}
          </div>
          <div className="stat-hero-label">In basket</div>
        </div>
      </div>

      <div className="card">
        <h2>Add item</h2>
        <form onSubmit={addItem} className="shopping-add-form">
          <div className="form-group">
            <label className="form-label" htmlFor="shop-item">
              Item
            </label>
            <input
              id="shop-item"
              type="text"
              value={itemForm.item_name}
              onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
              placeholder="e.g. Chicken breast"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="shop-qty">
              Qty
            </label>
            <input
              id="shop-qty"
              type="text"
              value={itemForm.quantity}
              onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
              placeholder="2"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="shop-unit">
              Unit
            </label>
            <select
              id="shop-unit"
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
            >
              <option value="qty">Qty</option>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="l">L</option>
              <option value="cups">cups</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Your list</h2>

        {items.length === 0 ? (
          <p className="empty-inline">No items yet — add what you need for the week above.</p>
        ) : (
          <>
            {openItems.length > 0 && (
              <>
                {openItems.map((item) => (
                  <div key={item.id} className="shop-row">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id, item.checked)}
                      aria-label={`Mark ${item.item_name} as done`}
                    />
                    <div className="food-item-content" style={{ flex: 1 }}>
                      <strong>{item.item_name}</strong>
                      <div className="shop-row-meta">
                        {item.quantity} {item.unit}
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline btn-compact" onClick={() => deleteItem(item.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </>
            )}

            {doneItems.length > 0 && (
              <>
                <div className="shop-section-label">Completed</div>
                {doneItems.map((item) => (
                  <div key={item.id} className="shop-row shop-row--done">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id, item.checked)}
                      aria-label={`Uncheck ${item.item_name}`}
                    />
                    <div className="food-item-content" style={{ flex: 1 }}>
                      <strong className="shop-row-title">{item.item_name}</strong>
                      <div className="shop-row-meta">
                        {item.quantity} {item.unit}
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline btn-compact" onClick={() => deleteItem(item.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
