// Configuration utility for environment-specific settings

class Config {
  constructor() {
    this.environment = process.env.REACT_APP_ENVIRONMENT || 'development';
    this.domain = process.env.REACT_APP_DOMAIN || 'localhost';
    this.backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
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
