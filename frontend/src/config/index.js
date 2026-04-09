// Configuration utility for environment-specific settings

class Config {
  constructor() {
    this.environment = process.env.REACT_APP_ENVIRONMENT || 'development';
    this.domain = process.env.REACT_APP_DOMAIN || 'localhost';
    
    // Debug logging
    console.log('Config Debug - Environment:', this.environment);
    console.log('Config Debug - REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
    console.log('Config Debug - Window origin:', typeof window !== 'undefined' && window.location ? window.location.origin : 'N/A');
    
    // Priority: Environment variable > Runtime origin > Fallback
    if (process.env.REACT_APP_BACKEND_URL) {
      this.backendUrl = process.env.REACT_APP_BACKEND_URL;
    } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
      // In production, use the same origin as the frontend
      this.backendUrl = window.location.origin;
    } else {
      this.backendUrl = 'http://localhost:5000';
    }
    
    console.log('Config Debug - Final Backend URL:', this.backendUrl);
  }

  get isDevelopment() {
    return this.environment === 'development';
  }

  get isProduction() {
    return this.environment === 'production';
  }

  get frontendUrl() {
    if (this.isProduction) {
      return `https://${this.domain}`;
    } else {
      return 'http://localhost:3000';
    }
  }

  get apiBaseUrl() {
    return this.backendUrl;
  }

  get fullDomain() {
    return this.isProduction ? `https://${this.domain}` : `http://${this.domain}`;
  }

  // Helper method to get environment-specific URLs
  getUrl(path = '') {
    const baseUrl = this.isProduction ? `https://${this.domain}` : `http://localhost:3000`;
    return `${baseUrl}${path}`;
  }

  // Helper method for API URLs
  getApiUrl(path = '') {
    return `${this.backendUrl}${path}`;
  }
}

// Create a singleton instance
const config = new Config();

export default config;
