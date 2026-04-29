import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../styles/LoginPage.css';

const createInitialForgotPasswordState = () => ({
  step: 'identify',
  resetEmail: '',
  otp: '',
  requestId: '',
  resetToken: '',
  schoolName: '',
  maskedEmailAddress: '',
  newPassword: '',
  confirmPassword: '',
  resendSeconds: 0,
});

const LoginPage = ({ setUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('school');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordState, setForgotPasswordState] = useState(createInitialForgotPasswordState());

  useEffect(() => {
    if (!showForgotPassword || forgotPasswordState.resendSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setForgotPasswordState((prev) => ({
        ...prev,
        resendSeconds: prev.resendSeconds > 0 ? prev.resendSeconds - 1 : 0,
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showForgotPassword, forgotPasswordState.resendSeconds]);

  const resetForgotPasswordFlow = (overrides = {}) => {
    setForgotPasswordState({
      ...createInitialForgotPasswordState(),
      ...overrides,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const endpoint = activeTab === 'admin' ? '/admin/login' : '/school/login';
      const response = await api.post(endpoint, {
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

  const handleAdminForgotPassword = async () => {
    const response = await api.post('/forgot-password', {
      email,
      user_type: 'admin'
    });

    setSuccessMessage(response.data.message);
    setShowForgotPassword(false);
  };

  const handleSchoolForgotPasswordOtpRequest = async () => {
    const response = await api.post('/school/forgot-password/request-otp', {
      email: forgotPasswordState.resetEmail
    });

    setForgotPasswordState((prev) => ({
      ...prev,
      step: 'otp',
      requestId: response.data.request_id,
      schoolName: response.data.school_name,
      maskedEmailAddress: response.data.masked_email_address,
      resendSeconds: response.data.resend_in_seconds || 60,
      otp: '',
    }));
    setSuccessMessage(response.data.message);
  };

  const handleSchoolForgotPasswordOtpVerify = async () => {
    const response = await api.post('/school/forgot-password/verify-otp', {
      request_id: forgotPasswordState.requestId,
      email: forgotPasswordState.resetEmail,
      otp: forgotPasswordState.otp
    });

    setForgotPasswordState((prev) => ({
      ...prev,
      step: 'password',
      resetToken: response.data.reset_token,
      schoolName: response.data.school_name || prev.schoolName,
    }));
    setSuccessMessage(response.data.message);
  };

  const handleSchoolPasswordReset = async () => {
    const response = await api.post('/school/forgot-password/reset-password', {
      reset_token: forgotPasswordState.resetToken,
      new_password: forgotPasswordState.newPassword,
      confirm_password: forgotPasswordState.confirmPassword
    });

    resetForgotPasswordFlow();
    setShowForgotPassword(false);
    setPassword('');
    setSuccessMessage(
      response.data.email_sent
        ? 'Password reset successfully. A confirmation email has been sent to your registered school email.'
        : `${response.data.message}. ${response.data.email_message || ''}`.trim()
    );
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (activeTab === 'admin') {
        await handleAdminForgotPassword();
      } else if (forgotPasswordState.step === 'identify') {
        await handleSchoolForgotPasswordOtpRequest();
      } else if (forgotPasswordState.step === 'otp') {
        await handleSchoolForgotPasswordOtpVerify();
      } else {
        await handleSchoolPasswordReset();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to complete password reset request right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendSchoolOtp = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await handleSchoolForgotPasswordOtpRequest();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to resend OTP right now.');
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setError('');
    setSuccessMessage('');
    resetForgotPasswordFlow();
    setShowForgotPassword(true);
  };

  const backToLogin = () => {
    setError('');
    setSuccessMessage('');
    resetForgotPasswordFlow();
    setShowForgotPassword(false);
  };

  const forgotStepTitle = activeTab === 'school'
    ? (forgotPasswordState.step === 'password' ? 'Set New Password' : 'Reset School Password')
    : 'Reset Password';

  const forgotSubtitle = activeTab === 'school'
    ? (
      forgotPasswordState.step === 'identify'
        ? 'Enter the registered school email address to receive an OTP.'
        : forgotPasswordState.step === 'otp'
          ? 'Enter the OTP sent to your registered school email address.'
          : 'Create and confirm the new password for this school account.'
    )
    : 'Enter your admin email to receive a password reset link.';

  return (
    <div className="login-container" data-testid="login-page">
      <div className="login-left" data-testid="login-info-section">
        <div className="login-info">
          <div className="logo-container">
            <img src="/wonder-learning-logo.png" alt="Wonder Learning Logo" className="company-logo" />
          </div>
          <h1 className="library-title" data-testid="library-title">Wonder Learning Digital Library</h1>
          <div className="info-content">
            <p className="info-subtitle">"Empowering preschools through educational excellence"</p>
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
                  data-testid="school-tab"
                  className={`tab ${activeTab === 'school' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('school');
                    setError('');
                    setSuccessMessage('');
                    setEmail('');
                    setPassword('');
                  }}
                >
                  School Login
                </button>
                <button
                  data-testid="admin-tab"
                  className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('admin');
                    setError('');
                    setSuccessMessage('');
                    setEmail('');
                    setPassword('');
                  }}
                >
                  Admin Login
                </button>
              </div>

              <form onSubmit={handleLogin} data-testid={`${activeTab}-login-form`}>
                {error && <div className="error-message" data-testid="error-message">{error}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}
                
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
                  onClick={openForgotPassword}
                >
                  Forgot Password?
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="login-title" data-testid="forgot-password-title">{forgotStepTitle}</h2>
              <p className="forgot-subtitle">{forgotSubtitle}</p>
              
              <form onSubmit={handleForgotPassword} data-testid="forgot-password-form">
                {error && <div className="error-message" data-testid="error-message">{error}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}
                
                {activeTab === 'admin' ? (
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
                ) : (
                  <>
                    {forgotPasswordState.step === 'identify' && (
                      <div className="form-group">
                        <label htmlFor="resetEmail">Registered School Email</label>
                        <input
                          type="email"
                          id="resetEmail"
                          data-testid="forgot-password-email-input"
                          value={forgotPasswordState.resetEmail}
                          onChange={(e) => setForgotPasswordState((prev) => ({
                            ...prev,
                            resetEmail: e.target.value
                          }))}
                          required
                          placeholder="Enter registered school email"
                        />
                      </div>
                    )}

                    {forgotPasswordState.step === 'otp' && (
                      <>
                        <div className="forgot-helper-card">
                          <strong>{forgotPasswordState.schoolName || 'Registered School'}</strong>
                          <span>OTP sent to {forgotPasswordState.maskedEmailAddress}</span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="otp">OTP Verification Code</label>
                          <input
                            type="text"
                            id="otp"
                            inputMode="numeric"
                            maxLength={6}
                            value={forgotPasswordState.otp}
                            onChange={(e) => setForgotPasswordState((prev) => ({
                              ...prev,
                              otp: e.target.value.replace(/\D/g, '')
                            }))}
                            required
                            placeholder="Enter 6-digit OTP"
                          />
                        </div>
                      </>
                    )}

                    {forgotPasswordState.step === 'password' && (
                      <>
                        <div className="forgot-helper-card">
                          <strong>{forgotPasswordState.schoolName || 'School account verified'}</strong>
                          <span>Create the new password for this school login.</span>
                        </div>

                        <div className="form-group">
                          <label htmlFor="newPassword">New Password</label>
                          <input
                            type="password"
                            id="newPassword"
                            value={forgotPasswordState.newPassword}
                            onChange={(e) => setForgotPasswordState((prev) => ({
                              ...prev,
                              newPassword: e.target.value
                            }))}
                            required
                            placeholder="Enter new password"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="confirmPassword">Confirm New Password</label>
                          <input
                            type="password"
                            id="confirmPassword"
                            value={forgotPasswordState.confirmPassword}
                            onChange={(e) => setForgotPasswordState((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value
                            }))}
                            required
                            placeholder="Confirm new password"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                <button 
                  type="submit" 
                  className="login-btn"
                  data-testid="forgot-password-submit-btn" 
                  disabled={loading}
                >
                  {loading
                    ? 'Please wait...'
                    : activeTab === 'admin'
                      ? 'Send Reset Link'
                      : forgotPasswordState.step === 'identify'
                        ? 'Send OTP'
                        : forgotPasswordState.step === 'otp'
                          ? 'Verify OTP'
                          : 'Reset Password'}
                </button>

                {activeTab === 'school' && forgotPasswordState.step === 'otp' && (
                  <button
                    type="button"
                    className="secondary-action-btn"
                    disabled={loading || forgotPasswordState.resendSeconds > 0}
                    onClick={handleResendSchoolOtp}
                  >
                    {forgotPasswordState.resendSeconds > 0
                      ? `Resend OTP in ${forgotPasswordState.resendSeconds}s`
                      : 'Resend OTP'}
                  </button>
                )}

                <button
                  type="button"
                  className="forgot-password-link"
                  data-testid="back-to-login-btn"
                  onClick={backToLogin}
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
