import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useContext, useEffect } from 'react';
import {
  FiBookOpen,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMoreHorizontal,
  FiPieChart,
  FiPlusCircle,
  FiSettings,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';

// ─── Navigation structure ─────────────────────────────────────────────────────
// Desktop: 5 top-level items (no duplicates with mobile tabs)
const DESKTOP_NAV = [
  { path: '/',          label: 'Overview',  icon: <FiGrid /> },
  { path: '/meal-prep', label: 'Log food',  icon: <FiPlusCircle /> },
  { path: '/food-log',  label: 'Diary',     icon: <FiBookOpen /> },
  { path: '/analytics', label: 'Insights',  icon: <FiPieChart /> },
  { path: '/more',      label: 'More',      icon: <FiMoreHorizontal /> },
];

// Mobile bottom tab bar: 5 distinct primary destinations
const MOBILE_TABS = [
  { path: '/',          label: 'Home',    icon: <FiGrid /> },
  { path: '/meal-prep', label: 'Log',     icon: <FiPlusCircle /> },
  { path: '/food-log',  label: 'Diary',   icon: <FiBookOpen /> },
  { path: '/analytics', label: 'Insights',icon: <FiPieChart /> },
  { path: '/profile',   label: 'Profile', icon: <FiUser /> },
];

// Mobile sheet: full list
const SHEET_NAV = [
  { path: '/',               label: 'Overview',      icon: <FiGrid /> },
  { path: '/meal-prep',      label: 'Log food',      icon: <FiPlusCircle /> },
  { path: '/food-log',       label: 'Diary',         icon: <FiBookOpen /> },
  { path: '/analytics',      label: 'Insights',      icon: <FiPieChart /> },
  { path: '/water',          label: 'Water intake',  icon: null },
  { path: '/workouts',       label: 'Workouts',      icon: null },
  { path: '/shopping',       label: 'Shopping list', icon: null },
  { path: '/barcode',        label: 'Barcode scan',  icon: null },
  { path: '/recommendations',label: 'Meal ideas',    icon: null },
  { path: '/profile',        label: 'Profile',       icon: <FiUser /> },
  { path: '/settings',       label: 'Settings',      icon: <FiSettings /> },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Navbar({ user, offline }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { logout } = useContext(AuthContext);
  const isMobile  = useMediaQuery('(max-width: 767px)');

  const handleLogout = () => { logout(); navigate('/login'); };

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.mobile-nav-sheet') && !e.target.closest('.navbar-menu-btn')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <>
      {/* ── Main navbar ── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <BrandLogo to="/" />

          {/* Desktop links */}
          {!isMobile && (
            <div className="navbar-links-desktop">
              {DESKTOP_NAV.map(l => (
                <Link
                  key={l.path}
                  to={l.path}
                  className={`nav-link ${location.pathname === l.path ? 'active' : ''}`}
                >
                  {l.icon} {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Desktop right actions */}
        {!isMobile && (
          <div className="navbar-actions">
            {offline && <span className="pill pill-offline">Offline</span>}

            <Link
              to="/profile"
              className={`btn btn-icon${location.pathname === '/profile' ? ' active' : ''}`}
              title="Profile"
              aria-label="Profile"
              style={location.pathname === '/profile' ? {
                background: 'var(--accent-fill)',
                color: 'var(--accent-bright)',
                borderColor: 'var(--bd-accent)',
                border: '1px solid',
              } : {}}
            >
              <FiUser />
            </Link>

            <Link
              to="/settings"
              className={`btn btn-icon${location.pathname === '/settings' ? ' active' : ''}`}
              title="Settings"
              aria-label="Settings"
              style={location.pathname === '/settings' ? {
                background: 'var(--accent-fill)',
                color: 'var(--accent-bright)',
                border: '1px solid var(--bd-accent)',
              } : {}}
            >
              <FiSettings />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-ghost btn-sm btn-logout"
            >
              <FiLogOut /> Sign out
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="btn btn-icon navbar-menu-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        )}
      </nav>

      {/* ── Mobile slide-down sheet ── */}
      {menuOpen && isMobile && (
        <div className="mobile-nav-sheet">
          <div className="mobile-nav-sheet-inner">
            {SHEET_NAV.map(l => (
              <Link
                key={l.path}
                to={l.path}
                className={`nav-link ${location.pathname === l.path ? 'active' : ''}`}
                style={{ borderRadius: 'var(--r-lg)', padding: '10px 14px' }}
              >
                {l.icon} {l.label}
              </Link>
            ))}
            <hr className="mobile-nav-divider" />
            {offline && (
              <p style={{ padding: '6px 14px', fontSize: '0.75rem', color: 'var(--tx-low)' }}>
                Local mode — data stays on this device
              </p>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-outline btn-sm mobile-logout"
            >
              <FiLogOut /> Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      {isMobile && (
        <nav
          className="mobile-tabbar"
          role="navigation"
          aria-label="Primary navigation"
        >
          {MOBILE_TABS.map(l => (
            <Link
              key={l.path}
              to={l.path}
              className={`mobile-tabbar-link ${location.pathname === l.path ? 'active' : ''}`}
            >
              <span className="mobile-tabbar-icon">{l.icon}</span>
              <span className="mobile-tabbar-label">{l.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
