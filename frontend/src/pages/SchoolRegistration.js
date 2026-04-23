import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import config from '../config';
import '../styles/SchoolRegistration.css';

const BACKEND_URL = config.apiBaseUrl;

const SchoolRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    school_name: '',
    email: '',
    contact_number: '',
    password: '',
    confirmPassword: '',
    logo: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }));
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!formData.school_name.trim()) {
      setError('School name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.password.trim()) {
      setError('Password is required');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('school_name', formData.school_name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('contact_number', formData.contact_number);
      formDataToSend.append('password', formData.password);
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo);
      }

      const response = await api.post('/register-school', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      // Clear form
      setFormData({
        school_name: '',
        email: '',
        contact_number: '',
        password: '',
        confirmPassword: '',
        logo: null
      });
      setPreviewUrl(null);

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register school');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="registration-container">
        <div className="registration-card success-card">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          </div>
          <h2>Registration Successful!</h2>
          <p>Your school has been successfully registered and will appear in the admin dashboard.</p>
          <p>You can now login with your credentials.</p>
          <button 
            className="login-btn"
            onClick={() => navigate('/')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="registration-header">
          <img 
            src="/wonder-learning-logo.png" 
            alt="Wonder Learning India Digital Library" 
            className="registration-logo"
          />
          <h1>School Registration</h1>
          <p>Register your school to access the Wonder Learning Digital Library</p>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="school_name">School Name *</label>
            <input
              type="text"
              id="school_name"
              name="school_name"
              value={formData.school_name}
              onChange={handleInputChange}
              required
              placeholder="e.g., Gurukul International Preschool"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="school@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact_number">Contact Number</label>
            <input
              type="tel"
              id="contact_number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleInputChange}
              placeholder="e.g., +91 1234567890"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter password (min. 6 characters)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="logo">School Logo</label>
            <div className="file-upload-container">
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="logo" className="file-upload-label">
                {formData.logo ? formData.logo.name : 'Choose Logo File'}
              </label>
            </div>
            {previewUrl && (
              <div className="logo-preview">
                <img src={previewUrl} alt="School logo preview" />
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register School'}
          </button>
        </form>

        <div className="registration-footer">
          <p>Already registered? <a href="/">Go to Login</a></p>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistration;
