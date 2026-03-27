import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/LoginPage.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoginPage = ({ setUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = activeTab === 'admin' ? '/admin/login' : '/school/login';
      const response = await axios.post(`${API}${endpoint}`, {
        email,
        password
      });

      const userData = response.data;
      // Store user data in sessionStorage and update state
      sessionStorage.setItem('token', userData.access_token);
      sessionStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Navigate to appropriate dashboard
      if (userData.user_type === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/school', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/forgot-password`, {
        email,
        user_type: activeTab
      });
      alert(response.data.message + '\n\nDemo Token: ' + response.data.demo_token);
      setShowForgotPassword(false);
    } catch (err) {
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" data-testid="login-page">
      <div className="login-left" data-testid="login-info-section">
        <div className="login-info">
          <div className="logo-container">
            <img src="/wonder-learning-logo.png" alt="Wonder Learning Logo" className="company-logo" />
          </div>
          <h1 className="library-title" data-testid="library-title">Wonder Learning Digital Library</h1>
          <div className="info-content">
            <p className="info-subtitle">Empowering Schools Through Digital Education</p>
            <div className="info-points">
              <div className="info-point">
                <svg className="icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Access to thousands of digital resources</span>
              </div>
              <div className="info-point">
                <svg className="icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure and easy-to-use platform</span>
              </div>
              <div className="info-point">
                <svg className="icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Designed specifically for schools</span>
              </div>
              <div className="info-point">
                <svg className="icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>24/7 access to educational materials</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right" data-testid="login-form-section">
        <div className="login-box">
          {!showForgotPassword ? (
            <>
              <h2 className="login-title" data-testid="login-form-title">Login to Your Account</h2>
              
              <div className="tabs" data-testid="login-tabs">
                <button
                  data-testid="admin-tab"
                  className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('admin');
                    setError('');
                    setEmail('');
                    setPassword('');
                  }}
                >
                  Admin Login
                </button>
                <button
                  data-testid="school-tab"
                  className={`tab ${activeTab === 'school' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('school');
                    setError('');
                    setEmail('');
                    setPassword('');
                  }}
                >
                  School Login
                </button>
              </div>

              <form onSubmit={handleLogin} data-testid={`${activeTab}-login-form`}>
                {error && <div className="error-message" data-testid="error-message">{error}</div>}
                
                <div className="form-group">
                  <label htmlFor="email" data-testid="email-label">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    data-testid="email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" data-testid="password-label">Password</label>
                  <input
                    type="password"
                    id="password"
                    data-testid="password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                  />
                </div>

                <button 
                  type="submit" 
                  className="login-btn" 
                  data-testid="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>

                <button
                  type="button"
                  className="forgot-password-link"
                  data-testid="forgot-password-link"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="login-title" data-testid="forgot-password-title">Reset Password</h2>
              <p className="forgot-subtitle">Enter your email to receive a password reset link</p>
              
              <form onSubmit={handleForgotPassword} data-testid="forgot-password-form">
                {error && <div className="error-message" data-testid="error-message">{error}</div>}
                
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    data-testid="forgot-password-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <button 
                  type="submit" 
                  className="login-btn"
                  data-testid="forgot-password-submit-btn" 
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  className="forgot-password-link"
                  data-testid="back-to-login-btn"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                  }}
                >
                  Back to Login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;