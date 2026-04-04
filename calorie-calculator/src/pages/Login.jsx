import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { Card, Button } from '../components/ui/index.jsx';
import { BrandLogo } from '../components/layout/BrandLogo.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, continueOffline } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOffline = () => {
    continueOffline();
    navigate('/');
  };

  return (
    <div className="auth-page">
      <div className="auth-card-wrap">
        <div className="auth-header">
          <BrandLogo to={null} size="lg" />
          <p className="auth-subtitle">Track calories and macros — online or on device.</p>
        </div>

        <Card className="auth-card">
          <form onSubmit={handleLogin} className="auth-form">
            {error && <div className="auth-alert">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <Button type="button" variant="secondary" className="auth-offline-btn" onClick={handleOffline}>
            Continue without account
          </Button>
          <p className="auth-offline-hint">Works fully offline. Data stays in this browser until you sign in.</p>

          <p className="auth-footer">
            <span>Need an account?</span>{' '}
            <Link to="/register" className="auth-link">
              Create one
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
