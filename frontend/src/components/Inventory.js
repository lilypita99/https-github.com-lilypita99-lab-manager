import React, { useEffect, useRef, useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5003';
const CATEGORY_BUBBLE_COLORS = [
  { background: '#ecfeff', border: '#67e8f9', text: '#155e75' },
  { background: '#fef9c3', border: '#fde047', text: '#854d0e' },
  { background: '#dcfce7', border: '#4ade80', text: '#166534' },
  { background: '#fee2e2', border: '#f87171', text: '#991b1b' },
  { background: '#fce7f3', border: '#f472b6', text: '#9d174d' },
  { background: '#ede9fe', border: '#a78bfa', text: '#5b21b6' },
  { background: '#e0f2fe', border: '#60a5fa', text: '#1e3a8a' },
  { background: '#ffedd5', border: '#fb923c', text: '#9a3412' },
];

const HISTORY_MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const hashCategory = (value) => {
  const text = String(value || '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getCategoryBubbleTheme = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return { background: '#f3f4f6', border: '#d1d5db', text: '#374151' };
  }
  return CATEGORY_BUBBLE_COLORS[hashCategory(text) % CATEGORY_BUBBLE_COLORS.length];
};

const NumberStepper = ({ name, value, onChange, onKeyDown, min = 0, width = 92 }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width,
        border: '1px solid #cbd5e1',
        borderRadius: 999,
        background: '#f8fafc',
        padding: '2px 4px 2px 8px',
      }}
    >
      <input
        name={name}
        type="number"
        value={value}
        min={min}
        onChange={onChange}
        onKeyDown={onKeyDown}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          textAlign: 'right',
          lineHeight: 1,
          height: 24,
          color: '#0f172a',
          fontWeight: 600,
          padding: '0 4px',
          MozAppearance: 'textfield',
        }}
      />
    </div>
  );
};

const InlineNumberAdjuster = ({ value, onIncrease, onDecrease, onCommit, min = 0 }) => {
  const displayValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [draft, setDraft] = useState(String(displayValue));

  useEffect(() => {
    setDraft(String(displayValue));
  }, [displayValue]);

  const commitDraft = () => {
    const numeric = Number(draft);
    const next = Number.isFinite(numeric) ? Math.max(min, numeric) : displayValue;
    setDraft(String(next));
    if (onCommit) {
      onCommit(next);
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid #cbd5e1',
        borderRadius: 999,
        background: '#f8fafc',
        padding: '2px 4px 2px 8px',
      }}
    >
      <input
        type="number"
        value={draft}
        min={min}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitDraft();
          }
        }}
        style={{
          width: 44,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          textAlign: 'right',
          lineHeight: 1,
          height: 24,
          color: '#0f172a',
          fontWeight: 600,
          padding: '0 4px',
          MozAppearance: 'textfield',
        }}
      />
    </div>
  );
};

const EMPTY_NEED_FORM = { name: '', catalog_number: '', vendor: '', quantity: '', requested_by: '', lab_name: '' };

function LabNeedRequestForm({ onSubmitted, existingItems }) {
  const [form, setForm] = useState(EMPTY_NEED_FORM);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [autofilled, setAutofilled] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setAutofilled(false);
  };

  const handleCatalogBlur = (e) => {
    const trimmed = e.target.value.trim().toLowerCase();
    if (!trimmed || !existingItems) return;
    const match = existingItems.find(
      (item) => (item.catalog_number || '').trim().toLowerCase() === trimmed
    );
    if (match) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || match.name || '',
        vendor: prev.vendor || match.vendor || '',
      }));
      setAutofilled(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/request-need`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          catalog_number: form.catalog_number.trim() || null,
          vendor: form.vendor.trim() || null,
          quantity: parseFloat(form.quantity) || 0,
          requested_by: form.requested_by.trim() || null,
          lab_name: form.lab_name.trim() || null,
        }),
      });
      if (res.ok) {
        setStatus('success');
        setForm(EMPTY_NEED_FORM);
        if (onSubmitted) onSubmitted();
      } else {
        const data = await res.json();
        setStatus(data.error || 'Submission failed.');
      }
    } catch {
      setStatus('Could not reach backend.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: 8, padding: 18, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
      <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>Request a New Item</h2>
      <p style={{ marginTop: 0, marginBottom: 16, color: '#4b5563', fontSize: 14 }}>
        Don't see what you need? Submit a request and it will appear in the Manager's Needs to Order queue.
      </p>
      {status === 'success' && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', color: '#166534', fontWeight: 600 }}>
          Request submitted! The manager will see it in Needs to Order.
        </div>
      )}
      {status && status !== 'success' && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#991b1b' }}>{status}</div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, maxWidth: 680 }}>
          <div>
            <label>Item Name *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g., Trypan Blue" required style={{ width: '100%' }} />
          </div>
          <div>
            <label>Catalog # (Cat #)</label>
            <input
              name="catalog_number"
              value={form.catalog_number}
              onChange={handleChange}
              onBlur={handleCatalogBlur}
              placeholder="e.g., T8154 — auto-fills if known"
              style={{ width: '100%' }}
            />
            {autofilled && (
              <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 600 }}>&#10003; Auto-filled from existing record</span>
            )}
          </div>
          <div>
            <label>Vendor</label>
            <input name="vendor" value={form.vendor} onChange={handleChange} placeholder="e.g., Sigma-Aldrich" style={{ width: '100%' }} />
          </div>
          <div>
            <label>Quantity Needed</label>
            <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleChange} placeholder="e.g., 2" style={{ width: '100%' }} />
          </div>
          <div>
            <label>Requested By</label>
            <input name="requested_by" value={form.requested_by} onChange={handleChange} placeholder="e.g., Dr. Smith" style={{ width: '100%' }} />
          </div>
          <div>
            <label>Lab / Project</label>
            <input name="lab_name" value={form.lab_name} onChange={handleChange} placeholder="e.g., Smith Lab, Project X" style={{ width: '100%' }} />
          </div>
        </div>
        <button type="submit" disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

function Inventory(props) {
  const canAccessManager = props.userRole === 'manager';
  const [items, setItems] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [activeTab, setActiveTab] = useState(
    canAccessManager ? (props.initialTab || 'manager') : 'lab'
  );
  const [managerView, setManagerView] = useState('all');
  const [managerSearch, setManagerSearch] = useState('');
  const [managerCategoryFilter, setManagerCategoryFilter] = useState('all');
  const [managerLocationFilter, setManagerLocationFilter] = useState('all');
  const [historyYearFilter, setHistoryYearFilter] = useState('all');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [editingRows, setEditingRows] = useState({});
  const [editingCategoryModes, setEditingCategoryModes] = useState({});
  const [selectedItemId, setSelectedItemId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [historyImportFile, setHistoryImportFile] = useState(null);
  const [replaceHistoryExisting, setReplaceHistoryExisting] = useState(false);
  const [isHistoryImporting, setIsHistoryImporting] = useState(false);
  const [historyImportStatus, setHistoryImportStatus] = useState('');
  const [actionMenu, setActionMenu] = useState(null);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const actionMenuRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    category: '',
    location_stored: '',
    catalog_number: '',
    vendor: '',
    actual_quantity: 0,
    desired_quantity: 0,
    need_to_order: false,
    order_quantity: 0,
  });
  const [addFormAutofilled, setAddFormAutofilled] = useState(false);

  useEffect(() => {
    loadItems();
    loadPurchaseHistory();
  }, []);

  useEffect(() => {
    if (!canAccessManager) {
      setActiveTab('lab');
      return;
    }

    if (props.initialTab) {
      setActiveTab(props.initialTab);
    }
  }, [canAccessManager, props.initialTab]);

  useEffect(() => {
    if (!actionMenu) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenu(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActionMenu(null);
      }
    };
    const closeMenu = () => setActionMenu(null);

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [actionMenu]);

  const loadItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory`);
      const data = await response.json();
      setItems(data);
      if (!selectedItemId && data.length > 0) {
        setSelectedItemId(String(data[0].id));
      }
      return data;
    } catch (error) {
      console.error('API load error', error);
      return [];
    }
  };

  const loadPurchaseHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/purchase-history`);
      const data = await response.json();
      setPurchaseHistory(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Purchase history load error', error);
      return [];
    }
  };

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    setAddFormAutofilled(false);
  };

  const handleCatalogLookup = (catNum, currentForm, setFormFn, setAutofilledFn) => {
    const trimmed = catNum.trim().toLowerCase();
    if (!trimmed) return;
    const match = items.find(
      (item) => (item.catalog_number || '').trim().toLowerCase() === trimmed
    );
    if (match) {
      setFormFn((prev) => ({
        ...prev,
        name: prev.name || match.name || '',
        category: prev.category || match.category || '',
        location_stored: prev.location_stored || match.location_stored || '',
        vendor: prev.vendor || match.vendor || '',
      }));
      if (setAutofilledFn) setAutofilledFn(true);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API_BASE_URL}/api/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        actual_quantity: Number(form.actual_quantity),
        desired_quantity: Number(form.desired_quantity),
        order_quantity: Number(form.order_quantity),
      }),
    });
    if (response.ok) {
      const item = await response.json();
      setItems((prev) => [...prev, item]);
      setMessage('Item added successfully.');
      setIsNewCategory(false);
      setNewCategory('');
      setForm({
        name: '',
        category: '',
        location_stored: '',
        catalog_number: '',
        vendor: '',
        actual_quantity: 0,
        desired_quantity: 0,
        need_to_order: false,
        order_quantity: 0,
      });
      if (!selectedItemId) {
        setSelectedItemId(String(item.id));
      }
    } else {
      setMessage('Could not add item. Please try again.');
    }
  };

  const handleTakeItem = async () => {
    if (!selectedItemId) {
      setMessage('Choose an item first.');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/inventory/${selectedItemId}/take`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const updated = await response.json();
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage('Recorded your input: 1 item used.');
    } else {
      setMessage('Could not record usage.');
    }
  };

  const handleRequestMore = async () => {
    if (!selectedItemId) {
      setMessage('Choose an item first.');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/inventory/${selectedItemId}/request-more`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const updated = await response.json();
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage('Order request recorded. It now appears in Needs to Order.');
    } else {
      setMessage('Could not submit request.');
    }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    const confirmed = window.confirm(`Delete "${itemName}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/inventory/${itemId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (String(itemId) === selectedItemId) {
        setSelectedItemId('');
      }
      setMessage('Item deleted.');
    } else {
      setMessage('Could not delete item.');
    }
  };

  const startEditItem = (item) => {
    const initialCategory = (item.category || '').trim();
    const needsCustomCategory = initialCategory !== '' && !categoryOptions.includes(initialCategory);
    setEditingRows((prev) => ({
      ...prev,
      [item.id]: {
      name: item.name || '',
      category: item.category || '',
      location_stored: item.location_stored || '',
      catalog_number: item.catalog_number || '',
      vendor: item.vendor || '',
      actual_quantity: item.actual_quantity || 0,
      desired_quantity: item.desired_quantity || 0,
      need_to_order: Boolean(item.need_to_order),
      order_quantity: item.order_quantity || 0,
      },
    }));
    setEditingCategoryModes((prev) => ({
      ...prev,
      [item.id]: {
        isNew: needsCustomCategory,
        newValue: needsCustomCategory ? initialCategory : '',
      },
    }));
  };

  const startEditMultipleRows = () => {
    const nextEditingRows = {};
    const nextCategoryModes = {};

    items.forEach((item) => {
      const initialCategory = (item.category || '').trim();
      const needsCustomCategory = initialCategory !== '' && !categoryOptions.includes(initialCategory);
      nextEditingRows[item.id] = {
        name: item.name || '',
        category: item.category || '',
        location_stored: item.location_stored || '',
        catalog_number: item.catalog_number || '',
        vendor: item.vendor || '',
        actual_quantity: item.actual_quantity || 0,
        desired_quantity: item.desired_quantity || 0,
        need_to_order: Boolean(item.need_to_order),
        order_quantity: item.order_quantity || 0,
      };
      nextCategoryModes[item.id] = {
        isNew: needsCustomCategory,
        newValue: needsCustomCategory ? initialCategory : '',
      };
    });

    setEditingRows(nextEditingRows);
    setEditingCategoryModes(nextCategoryModes);
  };

  const cancelEditItem = (itemId) => {
    setEditingRows((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setEditingCategoryModes((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const cancelAllEdits = () => {
    setEditingRows({});
    setEditingCategoryModes({});
  };

  const handleEditChange = (itemId, event) => {
    const { checked, name, type, value } = event.target;
    setEditingRows((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const handleEditKeyDown = (event, itemId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEditItem(itemId);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditItem(itemId);
    }
  };

  const updateItemRequest = async (itemId, editData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          category: String(editData.category || '').trim(),
          actual_quantity: Number(editData.actual_quantity),
          desired_quantity: Number(editData.desired_quantity),
          order_quantity: Number(editData.order_quantity),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return { ok: false, error: errorData?.error || 'Could not update item.' };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not update item. Please check backend connection.' };
    }
  };

  const saveEditItem = async (itemId) => {
    const editData = editingRows[itemId];
    if (!editData) {
      return;
    }

    const result = await updateItemRequest(itemId, editData);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    cancelEditItem(itemId);
    await loadItems();
    setMessage('Item updated successfully.');
  };

  const saveAllEdits = async () => {
    const entries = Object.entries(editingRows);
    if (entries.length === 0) {
      return;
    }

    const successIds = [];
    let failed = 0;

    for (const [itemId, editData] of entries) {
      const result = await updateItemRequest(itemId, editData);
      if (result.ok) {
        successIds.push(itemId);
      } else {
        failed += 1;
      }
    }

    if (successIds.length > 0) {
      setEditingRows((prev) => {
        const next = { ...prev };
        successIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      setEditingCategoryModes((prev) => {
        const next = { ...prev };
        successIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
    }

    await loadItems();

    if (failed === 0) {
      setMessage(`Updated ${successIds.length} item(s).`);
    } else {
      setMessage(`Updated ${successIds.length} item(s). ${failed} item(s) failed.`);
    }
  };

  const markItemOrdered = async (itemId) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/${itemId}/mark-ordered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const updated = await response.json();
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      await loadPurchaseHistory();
      setMessage('Marked as ordered. Moved to In Process.');
    } else {
      const errorData = await response.json().catch(() => null);
      setMessage(errorData?.error || 'Could not mark item as ordered.');
    }
  };

  const markItemReceived = async (itemId) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/${itemId}/mark-received`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const updated = await response.json();
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      await loadPurchaseHistory();
      setMessage('Marked as received. Inventory updated.');
    } else {
      const errorData = await response.json().catch(() => null);
      setMessage(errorData?.error || 'Could not mark item as received.');
    }
  };

  const handleDeleteHistoryEntry = async (entryId, itemName) => {
    const confirmed = window.confirm(`Delete history record for "${itemName}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/purchase-history/${entryId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setPurchaseHistory((prev) => prev.filter((entry) => entry.id !== entryId));
      setMessage('History entry deleted.');
    } else {
      setMessage('Could not delete history entry.');
    }
  };

  const fallbackOrderAgainFromHistory = async (entry) => {
    const reorderQuantity = Math.max(1, Number(entry.quantity_ordered) || 0);
    const matchingItem = items.find((item) => (
      (entry.inventory_item_id && item.id === entry.inventory_item_id)
      || (
        (item.name || '').trim().toLowerCase() === (entry.item_name || '').trim().toLowerCase()
        && ((item.catalog_number || '').trim().toLowerCase() === (entry.catalog_number || '').trim().toLowerCase())
      )
    ));

    if (matchingItem) {
      const response = await fetch(`${API_BASE_URL}/api/inventory/${matchingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...matchingItem,
          vendor: matchingItem.vendor || entry.vendor || '',
          requested_by: matchingItem.requested_by || entry.requested_by || '',
          lab_name: matchingItem.lab_name || entry.lab_name || '',
          category: matchingItem.category || entry.category || '',
          desired_quantity: Number(matchingItem.desired_quantity || 0) + reorderQuantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Could not update existing inventory item.');
      }

      await loadItems();
      setMessage(`Order again added ${entry.item_name} to Needs to Order (${reorderQuantity}).`);
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: entry.item_name || 'Untitled Item',
        category: entry.category || '',
        location_stored: '',
        catalog_number: entry.catalog_number || '',
        vendor: entry.vendor || '',
        requested_by: entry.requested_by || '',
        lab_name: entry.lab_name || '',
        actual_quantity: 0,
        desired_quantity: reorderQuantity,
        order_quantity: reorderQuantity,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Could not create a new needs-to-order item.');
    }

    await loadItems();
    setMessage(`Order again added ${entry.item_name} to Needs to Order (${reorderQuantity}).`);
  };

  const handleOrderAgainFromHistory = async (entry) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/purchase-history/${entry.id}/order-again`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        await loadItems();
        const result = await response.json().catch(() => ({}));
        setMessage(`Order again added ${entry.item_name} to Needs to Order${result.quantity ? ` (${result.quantity})` : ''}.`);
      } else {
        console.warn('Order again endpoint returned non-OK, falling back to direct inventory update.', response.status);
        await fallbackOrderAgainFromHistory(entry);
      }
    } catch (error) {
      console.error('Order again request failed', error);
      try {
        await fallbackOrderAgainFromHistory(entry);
      } catch (fallbackError) {
        console.error('Fallback order again request failed', fallbackError);
        setMessage('Could not add item back to Needs to Order.');
      }
    }
  };

  const openActionMenu = (event, payload) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 180;
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
    const top = Math.min(window.innerHeight - 8, rect.bottom + 6);
    setActionMenu({
      ...payload,
      left,
      top,
    });
  };

  const adjustNumericField = async (item, field, delta) => {
    const current = Number(item[field] || 0);
    const next = Math.max(0, current + delta);
    const payload = {
      ...item,
      [field]: next,
    };

    const result = await updateItemRequest(item.id, payload);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    await loadItems();
  };

  const setNumericField = async (item, field, nextValue) => {
    const next = Math.max(0, Number(nextValue) || 0);
    if (next === Number(item[field] || 0)) {
      return;
    }

    const payload = {
      ...item,
      [field]: next,
    };

    const result = await updateItemRequest(item.id, payload);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    await loadItems();
  };

  const handleImportExcel = async (event) => {
    event.preventDefault();
    if (!importFile) {
      setMessage('Please choose an Excel file first.');
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('replace_existing', String(replaceExisting));

    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/import`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setItems(result.items || []);
        setMessage(`Import complete: ${result.imported} added, ${result.skipped} skipped.`);
        setImportFile(null);
      } else {
        setMessage(result.error || 'Import failed.');
      }
    } catch (error) {
      setMessage('Import failed. Please check backend connection.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportHistoryExcel = async (event) => {
    event.preventDefault();
    if (!historyImportFile) {
      setMessage('Please choose a history Excel file first.');
      setHistoryImportStatus('Please choose a history Excel file first.');
      return;
    }

    setIsHistoryImporting(true);
    setHistoryImportStatus('Uploading history file...');
    const formData = new FormData();
    formData.append('file', historyImportFile);
    formData.append('replace_existing', String(replaceHistoryExisting));

    try {
      const response = await fetch(`${API_BASE_URL}/api/purchase-history/import`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setPurchaseHistory(result.entries || []);
        setHistoryImportFile(null);
        setMessage(`History import complete: ${result.imported} added, ${result.skipped} skipped.`);
        setHistoryImportStatus(`History import complete: ${result.imported} added, ${result.skipped} skipped.`);
      } else {
        setMessage(result.error || 'History import failed.');
        setHistoryImportStatus(result.error || 'History import failed.');
      }
    } catch (error) {
      setMessage('History import failed. Please check backend connection.');
      setHistoryImportStatus('History import failed. Please check backend connection.');
    } finally {
      setIsHistoryImporting(false);
    }
  };

  const selectedItem = items.find((item) => String(item.id) === selectedItemId);
  const editingIds = Object.keys(editingRows);
  const editingCount = editingIds.length;
  const editingItem = editingCount === 1 ? items.find((item) => String(item.id) === editingIds[0]) : null;
  const needsItems = items.filter((item) => Number(item.need_quantity || 0) > 0 && item.order_status !== 'in_process');
  const inProcessItems = items.filter((item) => item.order_status === 'in_process' && Number(item.in_process_quantity || 0) > 0);
  const visibleItems = managerView === 'needs' ? needsItems : managerView === 'in_process' ? inProcessItems : items;
  const locationOptions = Array.from(
    new Set(items.map((item) => (item.location_stored || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const searchNormalized = managerSearch.trim().toLowerCase();
  const filteredManagerItems = visibleItems.filter((item) => {
    const matchesSearch =
      searchNormalized === ''
      || String(item.name || '').toLowerCase().includes(searchNormalized)
      || String(item.catalog_number || '').toLowerCase().includes(searchNormalized)
      || String(item.location_stored || '').toLowerCase().includes(searchNormalized)
      || String(item.category || '').toLowerCase().includes(searchNormalized);
    const matchesCategory = managerCategoryFilter === 'all' || (item.category || '') === managerCategoryFilter;
    const matchesLocation = managerLocationFilter === 'all' || (item.location_stored || '') === managerLocationFilter;
    return matchesSearch && matchesCategory && matchesLocation;
  });
  const filteredPurchaseHistory = purchaseHistory.filter((entry) => {
    const historyDateValue = entry.ordered_at || entry.received_at;
    const parsedDate = historyDateValue ? new Date(historyDateValue) : null;
    const hasValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime());
    const entryYear = hasValidDate ? String(parsedDate.getFullYear()) : null;
    const entryMonth = hasValidDate ? String(parsedDate.getMonth() + 1) : null;

    if (searchNormalized === '') {
      // continue to year/month filtering below
    } else {
      const matchesSearch = (
        String(entry.item_name || '').toLowerCase().includes(searchNormalized)
        || String(entry.catalog_number || '').toLowerCase().includes(searchNormalized)
        || String(entry.vendor || '').toLowerCase().includes(searchNormalized)
        || String(entry.requested_by || '').toLowerCase().includes(searchNormalized)
        || String(entry.lab_name || '').toLowerCase().includes(searchNormalized)
        || String(entry.status || '').toLowerCase().includes(searchNormalized)
      );
      if (!matchesSearch) {
        return false;
      }
    }

    if (historyYearFilter !== 'all' && entryYear !== historyYearFilter) {
      return false;
    }

    if (historyMonthFilter !== 'all' && entryMonth !== historyMonthFilter) {
      return false;
    }

    return true;
  });

  const hasActiveHistoryFilter = (
    searchNormalized !== ''
    || historyYearFilter !== 'all'
    || historyMonthFilter !== 'all'
  );

  const historyYearOptions = Array.from(new Set(
    purchaseHistory
      .map((entry) => entry.ordered_at || entry.received_at)
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
      .map((date) => String(date.getFullYear()))
  )).sort((a, b) => Number(b) - Number(a));
  const tableColSpan = managerView === 'in_process' ? 10 : 9;
  const categoryOptions = Array.from(
    new Set(items.map((item) => (item.category || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const addCategoryTheme = getCategoryBubbleTheme(isNewCategory ? newCategory : form.category);

  return (
    <section style={{ paddingBottom: 140 }}>
      {message && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#eff6ff', color: '#1d4ed8' }}>
          {message}
        </div>
      )}

      {actionMenu && (
        <div
          ref={actionMenuRef}
          style={{
            position: 'fixed',
            left: actionMenu.left,
            top: actionMenu.top,
            minWidth: 150,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
            padding: 8,
            zIndex: 4000,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {actionMenu.kind === 'history' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setActionMenu(null);
                  handleOrderAgainFromHistory(actionMenu.entry);
                }}
                style={{ background: '#0f766e', color: 'white' }}
              >
                Order Again
              </button>
              {canAccessManager && (
                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    handleDeleteHistoryEntry(actionMenu.entry.id, actionMenu.entry.item_name);
                  }}
                  style={{ background: '#dc2626', color: 'white' }}
                >
                  Delete
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setActionMenu(null);
                  startEditItem(actionMenu.item);
                }}
                style={{ background: '#2563eb', color: 'white' }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionMenu(null);
                  handleDeleteItem(actionMenu.item.id, actionMenu.item.name);
                }}
                style={{ background: '#dc2626', color: 'white' }}
              >
                Delete
              </button>
              {managerView === 'needs' && (
                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    markItemOrdered(actionMenu.item.id);
                  }}
                  style={{ background: '#0f766e', color: 'white' }}
                >
                  Ordered
                </button>
              )}
              {managerView === 'in_process' && (
                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    markItemReceived(actionMenu.item.id);
                  }}
                  style={{ background: '#059669', color: 'white' }}
                >
                  It Came
                </button>
              )}
            </>
          )}
        </div>
      )}

      {props.view === 'ordering' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <LabNeedRequestForm onSubmitted={loadItems} existingItems={items} />

          {canAccessManager && (
            <>
              <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#881337' }}>Needs to Order ({needsItems.length})</h2>
                </div>
                {needsItems.length === 0 ? (
                  <p style={{ margin: 0, padding: 16, color: '#6b7280' }}>Nothing in the needs-to-order queue.</p>
                ) : (
                  <ul style={{ margin: 0, padding: '12px 16px', display: 'grid', gap: 8, listStyle: 'none' }}>
                    {needsItems.map((item) => (
                      <li key={item.id} style={{ padding: '10px 12px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#881337' }}>{item.name}</div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>{item.catalog_number || '—'} · {item.vendor || '—'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => markItemOrdered(item.id)}
                          style={{ fontSize: 13, padding: '6px 12px', background: '#0f766e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Mark Ordered
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#134e4a' }}>In Process ({inProcessItems.length})</h2>
                </div>
                {inProcessItems.length === 0 ? (
                  <p style={{ margin: 0, padding: 16, color: '#6b7280' }}>No orders in process.</p>
                ) : (
                  <ul style={{ margin: 0, padding: '12px 16px', display: 'grid', gap: 8, listStyle: 'none' }}>
                    {inProcessItems.map((item) => (
                      <li key={item.id} style={{ padding: '10px 12px', borderRadius: 8, background: '#ecfeff', border: '1px solid #99f6e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#134e4a' }}>{item.name}</div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>{item.catalog_number || '—'} · {item.vendor || '—'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => markItemReceived(item.id)}
                          style={{ fontSize: 13, padding: '6px 12px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          It Came
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div style={{ background: 'white', borderRadius: 8, overflow: 'visible', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#3730a3' }}>
                Purchase History ({purchaseHistory.length})
              </h2>
            </div>
            <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                <input
                  type="text"
                  value={managerSearch}
                  onChange={(event) => setManagerSearch(event.target.value)}
                  placeholder="Search item, catalog, vendor, requester..."
                  style={{ width: '100%' }}
                />
                <select
                  value={historyYearFilter}
                  onChange={(event) => setHistoryYearFilter(event.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="all">All Years</option>
                  {historyYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={historyMonthFilter}
                  onChange={(event) => setHistoryMonthFilter(event.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="all">All Months</option>
                  {HISTORY_MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {canAccessManager && (
              <div style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb', padding: 12 }}>
                <form onSubmit={handleImportHistoryExcel}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <input
                      type="file"
                      accept=".xlsx,.xlsm,.xltx"
                      onChange={(event) => setHistoryImportFile(event.target.files && event.target.files[0] ? event.target.files[0] : null)}
                    />
                    <label style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={replaceHistoryExisting}
                        onChange={(event) => setReplaceHistoryExisting(event.target.checked)}
                        style={{ marginRight: 8 }}
                      />
                      Replace existing history
                    </label>
                    <button type="submit" disabled={isHistoryImporting}>
                      {isHistoryImporting ? 'Importing...' : 'Import History Excel'}
                    </button>
                  </div>
                  <p style={{ margin: '8px 0 0', color: '#4b5563', fontSize: 13 }}>
                    Expected columns include Item/Name and optional fields like Catalog #, Vendor, Ordered Qty, Received Qty, Ordered On, Received On, Status.
                  </p>
                  {historyImportStatus && (
                    <p style={{ margin: '8px 0 0', color: '#1f2937', fontSize: 13, fontWeight: 600 }}>
                      {historyImportStatus}
                    </p>
                  )}
                </form>
              </div>
            )}
            {!hasActiveHistoryFilter ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                <p style={{ marginBottom: 8, fontWeight: 600 }}>Use Search, Year, or Month to view purchase history.</p>
                <p style={{ margin: 0 }}>This page is now filter-first and does not load the full history by default.</p>
              </div>
            ) : filteredPurchaseHistory.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                <p>
                  {managerSearch
                    ? 'No purchase history matches your search.'
                    : 'No purchase history yet. Items will appear here after they are ordered.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Catalog #</th>
                      <th>Vendor</th>
                      <th>Requested By</th>
                      <th>Lab</th>
                      <th>Ordered On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchaseHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td><strong>{entry.item_name}</strong></td>
                        <td>{entry.catalog_number || '—'}</td>
                        <td>{entry.vendor || '—'}</td>
                        <td>{entry.requested_by || '—'}</td>
                        <td>{entry.lab_name || '—'}</td>
                        <td>{entry.ordered_at ? new Date(entry.ordered_at).toLocaleDateString() : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: entry.status === 'received' ? '#dcfce7' : '#e0e7ff',
                              color: entry.status === 'received' ? '#166534' : '#3730a3',
                              fontWeight: 700,
                              fontSize: 12,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>
                              {entry.status}
                            </span>
                            <button
                              type="button"
                              aria-label={`Actions for ${entry.item_name}`}
                              onClick={(event) => openActionMenu(event, { kind: 'history', entry })}
                              style={{
                                minWidth: 30,
                                width: 30,
                                height: 30,
                                borderRadius: 999,
                                padding: 0,
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                fontWeight: 700,
                                lineHeight: 1,
                              }}
                            >
                              &#8942;
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!props.view && (
        <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {canAccessManager && (
          <button
            type="button"
            onClick={() => setActiveTab('manager')}
            style={{
              background: activeTab === 'manager' ? '#1d4ed8' : '#e5e7eb',
              color: activeTab === 'manager' ? 'white' : '#111827',
            }}
          >
            Manager
          </button>
        )}
      </div>

      {((canAccessManager && activeTab === 'manager') || !canAccessManager) && (
        <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
        marginBottom: 12,
      }}>
        <div style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0c4a6e', fontWeight: 700 }}>Total Items</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{items.length}</div>
        </div>
      </div>

      {canAccessManager && (
      <div style={{
        background: 'white',
        borderRadius: 8,
        padding: 18,
        marginBottom: 18,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>Add New Item</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label>Item Name *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g., Corning 96 well plates" required style={{ width: '100%' }} />
            </div>
            <div>
              <label>Category</label>
              <select
                value={isNewCategory ? '__new__' : (categoryOptions.includes(form.category) ? form.category : '')}
                onChange={(event) => {
                  const selected = event.target.value;
                  if (selected === '__new__') {
                    setIsNewCategory(true);
                    setForm((prev) => ({ ...prev, category: newCategory }));
                  } else {
                    setIsNewCategory(false);
                    setNewCategory('');
                    setForm((prev) => ({ ...prev, category: selected }));
                  }
                }}
                style={{
                  width: '100%',
                  borderRadius: 999,
                  padding: '10px 14px',
                  border: `1px solid ${addCategoryTheme.border}`,
                  background: addCategoryTheme.background,
                  color: addCategoryTheme.text,
                  fontWeight: 600,
                }}
              >
                <option value="">No category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
                <option value="__new__">+ Create new category</option>
              </select>
              {isNewCategory && (
                <input
                  value={newCategory}
                  onChange={(event) => {
                    const value = event.target.value;
                    setNewCategory(value);
                    setForm((prev) => ({ ...prev, category: value }));
                  }}
                  placeholder="Type new category"
                  style={{
                    width: '100%',
                    marginTop: 8,
                    borderRadius: 999,
                    padding: '10px 14px',
                    border: `1px solid ${addCategoryTheme.border}`,
                    background: addCategoryTheme.background,
                    color: addCategoryTheme.text,
                    fontWeight: 600,
                  }}
                />
              )}
            </div>
            <div>
              <label>Catalog Number</label>
              <input
                name="catalog_number"
                value={form.catalog_number}
                onChange={handleChange}
                onBlur={(e) => handleCatalogLookup(e.target.value, form, setForm, setAddFormAutofilled)}
                placeholder="e.g., 3599 — auto-fills if known"
                style={{ width: '100%' }}
              />
              {addFormAutofilled && (
                <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 600 }}>&#10003; Auto-filled from existing record</span>
              )}
            </div>
            <div>
              <label>Location Stored</label>
              <input name="location_stored" value={form.location_stored} onChange={handleChange} placeholder="e.g., Shelf A3, Freezer" style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ margin: 0 }}>
                <input 
                  name="need_to_order" 
                  type="checkbox" 
                  checked={form.need_to_order} 
                  onChange={handleChange}
                  style={{ marginRight: 8 }}
                />
                Need to Order
              </label>
            </div>
          </div>
          <button type="submit" style={{ marginTop: 14 }}>+ Add Item</button>
        </form>

        <div style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid #e5edf4'
        }}>
          <div style={{
            padding: 12,
            border: '1px solid #dbe7f1',
            borderRadius: 10,
            background: '#f8fbff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1f2937' }}>Bulk Add from Excel</h3>
                <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: 12 }}>
                  Upload a spreadsheet to add inventory in one step.
                </p>
              </div>
            </div>
            <form onSubmit={handleImportExcel}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) auto auto', gap: 10, alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".xlsx,.xlsm,.xltx"
                  onChange={(event) => setImportFile(event.target.files && event.target.files[0] ? event.target.files[0] : null)}
                  style={{ fontSize: 13, padding: '8px 10px' }}
                />
                <label style={{ margin: 0, fontSize: 12, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(event) => setReplaceExisting(event.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Replace existing inventory
                </label>
                <button type="submit" disabled={isImporting} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  {isImporting ? 'Importing...' : 'Import File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: 8,
        overflow: 'visible',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
              {managerView === 'needs'
                ? `Needs to Order (${needsItems.length})`
                : managerView === 'in_process'
                  ? `In Process (${inProcessItems.length})`
                  : `Inventory Items (${items.length})`}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setManagerView('all')}
                style={{
                  background: managerView === 'all' ? '#1d4ed8' : '#e5e7eb',
                  color: managerView === 'all' ? 'white' : '#111827',
                }}
              >
                All Items
              </button>
            </div>
          </div>
        </div>
        {editingCount > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            background: '#fffbeb',
            borderBottom: '1px solid #fde68a'
          }}>
            <div style={{ color: '#92400e', fontWeight: 600 }}>
              {editingCount === 1 ? `Editing: ${editingItem?.name || 'Selected item'}` : `Editing ${editingCount} items`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={saveAllEdits}
                style={{ background: '#059669', color: 'white' }}
              >
                Save All Changes
              </button>
              <button
                type="button"
                onClick={cancelAllEdits}
                style={{ background: '#6b7280', color: 'white' }}
              >
                Cancel All
              </button>
            </div>
          </div>
        )}
        <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <input
              type="text"
              value={managerSearch}
              onChange={(event) => setManagerSearch(event.target.value)}
              placeholder="Search item, catalog, location..."
              style={{ width: '100%' }}
            />
            <select
              value={managerCategoryFilter}
              onChange={(event) => setManagerCategoryFilter(event.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={managerLocationFilter}
              onChange={(event) => setManagerLocationFilter(event.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">All Locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
        </div>
        {filteredManagerItems.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
            <p>
              {managerView === 'needs'
                ? 'No items currently need ordering.'
                : managerView === 'in_process'
                  ? 'No items currently in process.'
                  : managerSearch || managerCategoryFilter !== 'all' || managerLocationFilter !== 'all'
                    ? 'No items match your filters.'
                    : 'No items yet. Add your first item above!'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Catalog #</th>
                  <th>Vendor</th>
                  <th>Location</th>
                  <th>Actual Qty</th>
                  <th>Desired Qty</th>
                  <th>Need (Desired-Actual)</th>
                  <th>Order Qty</th>
                  {managerView === 'in_process' && <th>Ordered On</th>}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const grouped = {};
                  filteredManagerItems.forEach((item) => {
                    const cat = item.category || 'Uncategorized';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(item);
                  });
                  if (managerView === 'needs') {
                    Object.keys(grouped).forEach((cat) => {
                      grouped[cat].sort((a, b) => Number(b.need_quantity || 0) - Number(a.need_quantity || 0));
                    });
                  }
                  const sortedCategories = Object.keys(grouped).sort((a, b) => {
                    if (a === 'Uncategorized') return 1;
                    if (b === 'Uncategorized') return -1;
                    return a.localeCompare(b);
                  });
                  return sortedCategories.map((category) => (
                    <React.Fragment key={category}>
                      <tr>
                        <td colSpan={tableColSpan} style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 700, fontSize: 14, padding: '8px 16px', letterSpacing: '0.03em' }}>
                          {category} ({grouped[category].length})
                        </td>
                      </tr>
                      {grouped[category].map((item) => (
                        <tr key={item.id}>
                          {(() => {
                            const rowEdit = editingRows[item.id];
                            const rowCategoryMode = editingCategoryModes[item.id] || { isNew: false, newValue: '' };
                            const rowCategoryTheme = getCategoryBubbleTheme(
                              rowCategoryMode.isNew ? rowCategoryMode.newValue : rowEdit?.category
                            );
                            return (
                              <>
                          <td>
                            {rowEdit ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input name="name" value={rowEdit.name} onChange={(event) => handleEditChange(item.id, event)} onKeyDown={(event) => handleEditKeyDown(event, item.id)} style={{ width: 180 }} />
                                <button
                                  type="button"
                                  onClick={() => saveEditItem(item.id)}
                                  style={{ background: '#059669', color: 'white' }}
                                  aria-label="Save changes"
                                >
                                  Save
                                </button>
                                <button type="button" onClick={() => cancelEditItem(item.id)} style={{ background: '#6b7280', color: 'white' }}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <strong>{item.name}</strong>
                            )}
                          </td>
                          <td>
                            {rowEdit ? (
                              <div style={{ minWidth: 180 }}>
                                <select
                                  value={rowCategoryMode.isNew ? '__new__' : (categoryOptions.includes(rowEdit.category) ? rowEdit.category : '')}
                                  onChange={(event) => {
                                    const selected = event.target.value;
                                    if (selected === '__new__') {
                                      setEditingCategoryModes((prev) => ({
                                        ...prev,
                                        [item.id]: {
                                          isNew: true,
                                          newValue: rowCategoryMode.newValue,
                                        },
                                      }));
                                      setEditingRows((prev) => ({
                                        ...prev,
                                        [item.id]: {
                                          ...prev[item.id],
                                          category: rowCategoryMode.newValue,
                                        },
                                      }));
                                    } else {
                                      setEditingCategoryModes((prev) => ({
                                        ...prev,
                                        [item.id]: {
                                          isNew: false,
                                          newValue: '',
                                        },
                                      }));
                                      setEditingRows((prev) => ({
                                        ...prev,
                                        [item.id]: {
                                          ...prev[item.id],
                                          category: selected,
                                        },
                                      }));
                                    }
                                  }}
                                  onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                                  style={{
                                    width: '100%',
                                    borderRadius: 999,
                                    padding: '10px 14px',
                                    border: `1px solid ${rowCategoryTheme.border}`,
                                    background: rowCategoryTheme.background,
                                    color: rowCategoryTheme.text,
                                    fontWeight: 600,
                                  }}
                                >
                                  <option value="">No category</option>
                                  {categoryOptions.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                  ))}
                                  <option value="__new__">+ Create new category</option>
                                </select>
                                {rowCategoryMode.isNew && (
                                  <input
                                    value={rowCategoryMode.newValue}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setEditingCategoryModes((prev) => ({
                                        ...prev,
                                        [item.id]: {
                                          isNew: true,
                                          newValue: value,
                                        },
                                      }));
                                      setEditingRows((prev) => ({
                                        ...prev,
                                        [item.id]: {
                                          ...prev[item.id],
                                          category: value,
                                        },
                                      }));
                                    }}
                                    onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                                    placeholder="Type new category"
                                    style={{
                                      width: '100%',
                                      marginTop: 6,
                                      borderRadius: 999,
                                      padding: '10px 14px',
                                      border: `1px solid ${rowCategoryTheme.border}`,
                                      background: rowCategoryTheme.background,
                                      color: rowCategoryTheme.text,
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                              </div>
                            ) : (
                              item.category || '—'
                            )}
                          </td>
                          <td>
                            {rowEdit ? (
                              <input name="catalog_number" value={rowEdit.catalog_number} onChange={(event) => handleEditChange(item.id, event)} onKeyDown={(event) => handleEditKeyDown(event, item.id)} style={{ width: 120 }} />
                            ) : (
                              item.catalog_number || '—'
                            )}
                          </td>
                          <td>
                            {rowEdit ? (
                              <input name="vendor" value={rowEdit.vendor} onChange={(event) => handleEditChange(item.id, event)} onKeyDown={(event) => handleEditKeyDown(event, item.id)} style={{ width: 140 }} />
                            ) : (
                              item.vendor || '—'
                            )}
                          </td>
                          <td>
                            {rowEdit ? (
                              <input name="location_stored" value={rowEdit.location_stored} onChange={(event) => handleEditChange(item.id, event)} onKeyDown={(event) => handleEditKeyDown(event, item.id)} style={{ width: 150 }} />
                            ) : (
                              item.location_stored || '—'
                            )}
                          </td>
                          <td>
                            {rowEdit ? (
                              <NumberStepper
                                name="actual_quantity"
                                value={rowEdit.actual_quantity}
                                onChange={(event) => handleEditChange(item.id, event)}
                                onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                                min={0}
                                width={96}
                              />
                            ) : canAccessManager ? (
                              <InlineNumberAdjuster
                                value={item.actual_quantity}
                                onIncrease={() => adjustNumericField(item, 'actual_quantity', 1)}
                                onDecrease={() => adjustNumericField(item, 'actual_quantity', -1)}
                                onCommit={(next) => setNumericField(item, 'actual_quantity', next)}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: '#1f2937' }}>{item.actual_quantity || 0}</span>
                            )}
                          </td>
                          <td>
                            {rowEdit ? (
                              <NumberStepper
                                name="desired_quantity"
                                value={rowEdit.desired_quantity}
                                onChange={(event) => handleEditChange(item.id, event)}
                                onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                                min={0}
                                width={96}
                              />
                            ) : canAccessManager ? (
                              <InlineNumberAdjuster
                                value={item.desired_quantity}
                                onIncrease={() => adjustNumericField(item, 'desired_quantity', 1)}
                                onDecrease={() => adjustNumericField(item, 'desired_quantity', -1)}
                                onCommit={(next) => setNumericField(item, 'desired_quantity', next)}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: '#1f2937' }}>{item.desired_quantity || 0}</span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#0f766e' }}>
                              {Math.max(0, Number((rowEdit ? rowEdit.desired_quantity : item.desired_quantity) || 0) - Number((rowEdit ? rowEdit.actual_quantity : item.actual_quantity) || 0))}
                            </span>
                          </td>
                          <td>
                            {rowEdit ? (
                              <span style={{ fontWeight: 600, color: '#1f2937' }}>
                                {Math.max(0, Number(rowEdit.desired_quantity || 0) - Number(rowEdit.actual_quantity || 0))}
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontWeight: 600, color: '#1f2937' }}>{item.order_quantity || 0}</span>
                                {canAccessManager && (
                                  <button
                                    type="button"
                                    aria-label={`Actions for ${item.name}`}
                                    onClick={(event) => openActionMenu(event, { kind: 'manager', item })}
                                    style={{
                                      minWidth: 30,
                                      width: 30,
                                      height: 30,
                                      borderRadius: 999,
                                      padding: 0,
                                      background: '#f3f4f6',
                                      color: '#374151',
                                      border: '1px solid #d1d5db',
                                      fontWeight: 700,
                                      lineHeight: 1,
                                    }}
                                  >
                                    &#8942;
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          {managerView === 'in_process' && (
                            <td>
                              <span style={{ color: '#0f766e', fontWeight: 600 }}>
                                {item.ordered_at ? new Date(item.ordered_at).toLocaleDateString() : '—'}
                              </span>
                            </td>
                          )}
                              </>
                            );
                          })()}
                        </tr>
                      ))}
                    </React.Fragment>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {canAccessManager && activeTab === 'lab' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Request a New Item */}
          <LabNeedRequestForm onSubmitted={loadItems} existingItems={items} />

          {/* Quick Actions */}
          <div style={{ background: 'white', borderRadius: 8, padding: 18, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Lab Quick Actions</h2>
            <p style={{ marginTop: 0, color: '#4b5563' }}>Select an item, then quickly log usage or request more stock.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 520 }}>
              <div>
                <label>Item</label>
                <select
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }}
                >
                  {(() => {
                    const grouped = {};
                    items.forEach((item) => {
                      const cat = item.category || 'Uncategorized';
                      if (!grouped[cat]) grouped[cat] = [];
                      grouped[cat].push(item);
                    });
                    const sortedCategories = Object.keys(grouped).sort((a, b) => {
                      if (a === 'Uncategorized') return 1;
                      if (b === 'Uncategorized') return -1;
                      return a.localeCompare(b);
                    });
                    return sortedCategories.map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {grouped[cat].map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.actual_quantity} in stock)
                          </option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>

              {selectedItem && (
                <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <strong>{selectedItem.name}</strong>
                  <div>Catalog: {selectedItem.catalog_number || '—'}</div>
                  <div>Location: {selectedItem.location_stored || '—'}</div>
                  <div>Current Quantity: {selectedItem.actual_quantity}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleTakeItem}>I Used This Item</button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleRequestMore}>Order More</button>
              </div>

              <p style={{ margin: 0, color: '#4b5563', fontSize: 14 }}>
                Order requests appear in Manager → Needs to Order.
              </p>
            </div>
          </div>
        </div>
      )}
      </>)}
    </section>
  );
}

export default Inventory;
