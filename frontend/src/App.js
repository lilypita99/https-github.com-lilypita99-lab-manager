import React, { useEffect, useRef, useState } from 'react';
import Inventory from './components/Inventory';
import LandingCanvas from './components/LandingCanvas';
import LabFlowLogo from './components/LabFlowLogo';
import AuthScreen from './components/AuthScreen';
import GroupHub from './components/GroupHub';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5003';
const ROLE_OVERRIDE_KEY = 'labflow_role_override';

function getStoredRoleOverride(email) {
  if (!email) {
    return null;
  }

  try {
    const rawValue = localStorage.getItem(ROLE_OVERRIDE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (parsed?.email === email && (parsed.role === 'manager' || parsed.role === 'lab')) {
      return parsed.role;
    }
  } catch {
    localStorage.removeItem(ROLE_OVERRIDE_KEY);
  }

  return null;
}

function applyStoredRoleOverride(user) {
  if (!user) {
    return user;
  }

  const overrideRole = getStoredRoleOverride(user.email);
  return overrideRole ? { ...user, role: overrideRole } : user;
}

function persistRoleOverride(email, role) {
  if (!email || (role !== 'manager' && role !== 'lab')) {
    return;
  }

  localStorage.setItem(ROLE_OVERRIDE_KEY, JSON.stringify({ email, role }));
}

function clearRoleOverride() {
  localStorage.removeItem(ROLE_OVERRIDE_KEY);
}

function HomeDashboard({ onOpenOrdering, isManager }) {
  const [now, setNow] = useState(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [dateNoteInput, setDateNoteInput] = useState('');
  const [dateNotes, setDateNotes] = useState({});
  const [todoInput, setTodoInput] = useState('');
  const [todos, setTodos] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [orderCountLoading, setOrderCountLoading] = useState(false);
  const todoCardRef = useRef(null);

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!isManager) {
      return undefined;
    }

    let cancelled = false;

    const loadPendingOrderCount = async () => {
      setOrderCountLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/inventory`);
        const data = await response.json();
        if (cancelled) {
          return;
        }

        const items = Array.isArray(data) ? data : [];
        const nextCount = items.filter((item) => Number(item.need_quantity || 0) > 0 && item.order_status !== 'in_process').length;
        setPendingOrderCount(nextCount);
      } catch {
        if (!cancelled) {
          setPendingOrderCount(0);
        }
      } finally {
        if (!cancelled) {
          setOrderCountLoading(false);
        }
      }
    };

    loadPendingOrderCount();
    return () => {
      cancelled = true;
    };
  }, [isManager]);

  const year = calendarViewDate.getFullYear();
  const monthIndex = calendarViewDate.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = calendarViewDate.toLocaleString('en-US', { month: 'long' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarCells = [];

  for (let i = 0; i < firstDay; i += 1) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(day);
  }

  const addTodo = (e) => {
    e.preventDefault();
    const text = todoInput.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: Date.now(), text }]);
    setTodoInput('');
  };

  const changeCalendarMonth = (offset) => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const dateKeyFor = (day) => {
    const month = String(monthIndex + 1).padStart(2, '0');
    const date = String(day).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const addDateNote = (e) => {
    e.preventDefault();
    if (!selectedDateKey) return;
    const note = dateNoteInput.trim();
    if (!note) return;
    setDateNotes((prev) => ({
      ...prev,
      [selectedDateKey]: [...(prev[selectedDateKey] || []), note],
    }));
    setDateNoteInput('');
  };

  const selectedDateNotes = selectedDateKey ? (dateNotes[selectedDateKey] || []) : [];

  const completeTodo = (id, event) => {
    const hostRect = todoCardRef.current?.getBoundingClientRect();
    const x = hostRect ? event.clientX - hostRect.left : 120;
    const y = hostRect ? event.clientY - hostRect.top : 120;
    const burstId = `${Date.now()}-${Math.random()}`;
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];
    const pieces = Array.from({ length: 14 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 14;
      const distance = 28 + Math.random() * 34;
      return {
        id: `${burstId}-${i}`,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        color: colors[i % colors.length],
      };
    });

    setBursts((prev) => [...prev, { id: burstId, x, y, pieces }]);
    setTodos((prev) => prev.filter((todo) => todo.id !== id));

    setTimeout(() => {
      setBursts((prev) => prev.filter((burst) => burst.id !== burstId));
    }, 900);
  };

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div style={{ background: 'linear-gradient(130deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #86efac', borderRadius: 14, padding: 16 }}>
          <p style={{ margin: '0 0 4px', color: '#166534', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Current Time</p>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#14532d' }}>{now.toLocaleTimeString()}</div>
          <div style={{ marginTop: 4, color: '#166534' }}>{now.toLocaleDateString()}</div>
        </div>

        {isManager && (
          <div style={{ background: 'linear-gradient(130deg, #fff7ed 0%, #ffedd5 100%)', border: '1px solid #fdba74', borderRadius: 14, padding: 16 }}>
            <p style={{ margin: '0 0 6px', color: '#9a3412', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Orders</p>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#7c2d12' }}>
              {orderCountLoading
                ? 'Checking your order queue...'
                : pendingOrderCount > 0
                  ? `You have ${pendingOrderCount} order${pendingOrderCount === 1 ? '' : 's'} to place`
                  : 'Great job! No new orders need to be plased'}
            </div>
            <button
              type="button"
              onClick={onOpenOrdering}
              style={{ marginTop: 10, padding: '7px 12px', borderRadius: 8, border: '1px solid #f97316', background: '#fff', color: '#c2410c', fontWeight: 700, cursor: 'pointer' }}
            >
              Open Ordering
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => changeCalendarMonth(-1)}
                style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 13, lineHeight: 1 }}
                aria-label="Previous month"
              >
                &#8592;
              </button>
              <h3 style={{ margin: 0, color: '#334155' }}>{monthName} {year}</h3>
              <button
                type="button"
                onClick={() => changeCalendarMonth(1)}
                style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 13, lineHeight: 1 }}
                aria-label="Next month"
              >
                &#8594;
              </button>
            </div>
            <span style={{ color: '#64748b', fontSize: 13 }}>Monthly Calendar</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            {dayNames.map((name) => (
              <div key={name} style={{ textAlign: 'center', fontWeight: 700 }}>{name}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {calendarCells.map((day, index) => {
              const isToday = day
                && day === now.getDate()
                && monthIndex === now.getMonth()
                && year === now.getFullYear();
              const key = day ? dateKeyFor(day) : '';
              const isSelected = day && key === selectedDateKey;
              const hasNotes = day && (dateNotes[key] || []).length > 0;
              return (
                <button
                  key={`${day || 'empty'}-${index}`}
                  type="button"
                  disabled={!day}
                  onClick={() => {
                    if (!day) return;
                    setSelectedDateKey(key);
                  }}
                  style={{
                    minHeight: 34,
                    borderRadius: 10,
                    border: day
                      ? (isSelected ? '2px solid #2563eb' : isToday ? '1px solid #60a5fa' : '1px solid #e2e8f0')
                      : '1px dashed transparent',
                    background: day ? (isSelected ? '#dbeafe' : isToday ? '#eff6ff' : '#f8fafc') : 'transparent',
                    color: day ? '#334155' : 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: isToday ? 800 : 600,
                    cursor: day ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                >
                  {day || '•'}
                  {hasNotes && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: '#f97316',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <h4 style={{ margin: '0 0 8px', color: '#334155', fontSize: 14 }}>
              {selectedDateKey ? `Notes for ${selectedDateKey}` : 'Select a date to add a note'}
            </h4>
            {selectedDateKey && (
              <form onSubmit={addDateNote} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={dateNoteInput}
                  onChange={(e) => setDateNoteInput(e.target.value)}
                  placeholder="Add note for this date"
                  style={{ flex: 1 }}
                />
                <button type="submit">Add</button>
              </form>
            )}
            {selectedDateKey && selectedDateNotes.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, color: '#334155' }}>
                {selectedDateNotes.map((note, idx) => (
                  <li key={`${selectedDateKey}-${idx}`} style={{ marginBottom: 4 }}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div ref={todoCardRef} style={{ position: 'relative', overflow: 'hidden', background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
          <style>{`@keyframes todo-confetti-pop{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.45)}}`}</style>
          <h3 style={{ margin: '0 0 10px', color: '#334155' }}>To Do</h3>
          <form onSubmit={addTodo} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              placeholder="Add a task"
              style={{ flex: 1 }}
            />
            <button type="submit">Add</button>
          </form>
          {bursts.map((burst) => (
            <div key={burst.id} style={{ position: 'absolute', left: burst.x, top: burst.y, pointerEvents: 'none', zIndex: 3 }}>
              {burst.pieces.map((piece) => (
                <span
                  key={piece.id}
                  style={{
                    '--dx': `${piece.dx}px`,
                    '--dy': `${piece.dy}px`,
                    position: 'absolute',
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    background: piece.color,
                    animation: 'todo-confetti-pop 0.9s ease-out forwards',
                  }}
                />
              ))}
            </div>
          ))}
          <div style={{ display: 'grid', gap: 8 }}>
            {todos.map((todo) => (
              <button
                key={todo.id}
                type="button"
                onClick={(event) => completeTodo(todo.id, event)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{todo.text}</span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: '2px solid #22c55e',
                    background: '#ffffff',
                    flexShrink: 0,
                  }}
                />
              </button>
            ))}
            {todos.length === 0 && (
              <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px dashed #bbf7d0', background: '#f0fdf4', color: '#166534', fontWeight: 700 }}>
                All done. Nice work!
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [showFrontPage, setShowFrontPage] = useState(true);
  const [initialTab, setInitialTab] = useState('manager');
  const [subPage, setSubPage] = useState('home'); // 'home' | 'inventory' | 'ordering' | 'lab-members'
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('labflow_token') || sessionStorage.getItem('labflow_token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [oauthError, setOauthError] = useState(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const roleMenuRef = useRef(null);

  // On mount, validate any stored token and load the user profile.
  useEffect(() => {
    // Handle OAuth redirect: ?oauth_token=...&oauth_user=...
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('oauth_token');
    const oauthUser = params.get('oauth_user');
    const oauthError = params.get('oauth_error');
    if (oauthToken && oauthUser) {
      try {
        const user = applyStoredRoleOverride(JSON.parse(atob(oauthUser.replace(/-/g, '+').replace(/_/g, '/'))));
        localStorage.setItem('labflow_token', oauthToken);
        setAuthToken(oauthToken);
        setCurrentUser(user);
        setInitialTab(user.role === 'manager' ? 'manager' : 'lab');
        setAuthChecked(true);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
        return;
      } catch {
        // fall through to normal token check
      }
    }
    if (oauthError) {
      setOauthError(oauthError);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const token = localStorage.getItem('labflow_token') || sessionStorage.getItem('labflow_token');
    if (!token) {
      setAuthChecked(true);
      return;
    }
    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          const nextUser = applyStoredRoleOverride(data.user);
          setCurrentUser(nextUser);
          setAuthToken(token);
          // Default to manager view for managers
          if (nextUser.role === 'manager') {
            setInitialTab('manager');
          } else {
            setInitialTab('lab');
          }
        } else {
          localStorage.removeItem('labflow_token');
          sessionStorage.removeItem('labflow_token');
          setAuthToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('labflow_token');
        sessionStorage.removeItem('labflow_token');
        setAuthToken(null);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!roleMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!roleMenuRef.current?.contains(event.target)) {
        setRoleMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [roleMenuOpen]);

  const handleAuth = (token, user) => {
    setAuthToken(token);
    setCurrentUser(user);
    setInitialTab(user.role === 'manager' ? 'manager' : 'lab');
  };

  const handleLogout = async () => {
    if (authToken) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem('labflow_token');
    sessionStorage.removeItem('labflow_token');
    clearRoleOverride();
    setAuthToken(null);
    setCurrentUser(null);
    setShowFrontPage(true);
  };

  const handleRoleChange = async (nextRole) => {
    if (!authToken || !currentUser || nextRole === currentUser.role || roleUpdating) {
      setRoleMenuOpen(false);
      return;
    }

    const nextUser = { ...currentUser, role: nextRole };
    persistRoleOverride(currentUser.email, nextRole);
    setCurrentUser(nextUser);
    setInitialTab(nextRole === 'manager' ? 'manager' : 'lab');
    if (nextRole !== 'manager' && subPage === 'ordering') {
      setSubPage('home');
    }
    setRoleMenuOpen(false);
    setRoleUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/me/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: nextRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        return;
      }

      const persistedUser = applyStoredRoleOverride(data.user);
      setCurrentUser(persistedUser);
      setInitialTab(persistedUser.role === 'manager' ? 'manager' : 'lab');
    } catch {
      // Keep the local override so the workspace still switches roles even if persistence fails.
    } finally {
      setRoleUpdating(false);
    }
  };

  const enter = (tab) => {
    const nextTab = currentUser?.role === 'manager' ? tab : 'lab';
    setInitialTab(nextTab);
    setSubPage('home');
    setShowFrontPage(false);
  };

  const isManager = currentUser?.role === 'manager';

  const rolePageCopy = currentUser?.role === 'manager'
    ? {
        eyebrow: 'LabFlow Manager',
        title: 'Lab Operations',
        description: 'Coordinate your lab inventory, manage the team, and control invite access from one manager workspace.',
      }
    : {
        eyebrow: 'LabFlow Member',
        title: 'Lab Member Workspace',
        description: 'Check your inventory work, review team membership, and handle invite decisions without the manager controls.',
      };
  const welcomeName = currentUser?.display_name
    ? currentUser.display_name.trim().split(/\s+/)[0]
    : (currentUser?.email || '').split('@')[0];

  // Still checking stored token
  if (!authChecked) {
    return null;
  }

  // Not logged in → show auth screen
  if (!authToken || !currentUser) {
    return <AuthScreen onAuth={handleAuth} oauthError={oauthError} />;
  }

  if (showFrontPage) {
    return (
      <div className="landing-shell">
        <LandingCanvas />
        <div className="landing-card">
          <LabFlowLogo className="labflow-mark" />

          <h1 className="landing-title">LabFlow</h1>

          <p style={{ marginBottom: 4, color: '#0f766e', fontWeight: 600, fontSize: 14 }}>
            Welcome back {welcomeName}, let's keep things flowing
          </p>

          {!isManager && <p className="landing-choose">Select a view to get started</p>}
          <div className="landing-tabs">
            {isManager ? (
              <button type="button" className="landing-tab-btn" onClick={() => enter('manager')}>
                Get Started
                <span className="landing-tab-icon">&#8594;</span>
              </button>
            ) : (
              <button type="button" className="landing-tab-btn" onClick={() => enter('lab')}>
                <span className="landing-tab-icon">&#9879;</span>
                Open Workspace
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              marginTop: 20,
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '6px 16px',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: 13,
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-hero">
        <div className="app-hero__grid" />
        <div className="app-hero__content">
          <button
            type="button"
            className="home-back-btn"
            onClick={() => setShowFrontPage(true)}
          >
            &#8592; Home
          </button>
          <p className="app-eyebrow">{rolePageCopy.eyebrow}</p>
          <h1>{rolePageCopy.title}</h1>
          <p>{rolePageCopy.description}</p>
        </div>
        {/* User chip */}
        <div
          ref={roleMenuRef}
          style={{
            position: 'absolute',
            top: 16,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setRoleMenuOpen((open) => !open)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <span>{currentUser.display_name || currentUser.email}</span>
              <span
                style={{
                  fontSize: 11,
                  opacity: 0.7,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {currentUser.role}
              </span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>{roleMenuOpen ? '▲' : '▼'}</span>
            </button>
            {roleMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 190,
                  padding: 8,
                  borderRadius: 14,
                  background: '#ffffff',
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
                  zIndex: 20,
                }}
              >
                <div style={{ padding: '4px 6px 8px', color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Switch Role
                </div>
                {[
                  { id: 'manager', label: 'Lab Manager' },
                  { id: 'lab', label: 'Team Member' },
                ].map((roleOption) => {
                  const active = currentUser.role === roleOption.id;
                  return (
                    <button
                      key={roleOption.id}
                      type="button"
                      disabled={active || roleUpdating}
                      onClick={() => handleRoleChange(roleOption.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginTop: 4,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: active ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        background: active ? '#eff6ff' : '#ffffff',
                        color: active ? '#1d4ed8' : '#1e293b',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: active ? 'default' : 'pointer',
                      }}
                    >
                      <span>{roleOption.label}</span>
                      <span style={{ fontSize: 12, color: active ? '#1d4ed8' : '#94a3b8' }}>
                        {active ? 'Current' : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              padding: '4px 12px',
              cursor: 'pointer',
              color: 'white',
              fontSize: 13,
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="app-main">
        <nav style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {[
            { id: 'home', label: 'Home' },
            { id: 'ordering', label: 'Ordering' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'lab-members', label: 'Lab Members' },
          ].map((tab) => (
            <button
              key={String(tab.id)}
              type="button"
              onClick={() => setSubPage(tab.id)}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: subPage === tab.id ? '1px solid #8bc8eb' : '1px solid #dce8f2',
                background: subPage === tab.id ? '#eef8ff' : '#ffffff',
                color: subPage === tab.id ? '#0f3b57' : '#406178',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {subPage === 'lab-members' ? (
          <GroupHub
            authToken={authToken}
            currentUser={currentUser}
            onUserUpdated={(nextUser) => setCurrentUser(nextUser)}
            fullPageTab={subPage}
          />
        ) : subPage === 'home' ? (
          <HomeDashboard onOpenOrdering={() => setSubPage('ordering')} isManager={isManager} />
        ) : subPage === 'inventory' ? (
          <Inventory initialTab={initialTab} userRole={currentUser.role} />
        ) : subPage === 'ordering' ? (
          <Inventory initialTab={initialTab} userRole={currentUser.role} view="ordering" />
        ) : (
          <Inventory initialTab={initialTab} userRole={currentUser.role} />
        )}
      </main>
    </div>
  );
}

export default App;
