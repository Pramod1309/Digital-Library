import os
from typing import List

class Config:
    """Configuration class for environment-specific settings"""
    
    def __init__(self):
        self.load_env()
    
    def load_env(self):
        """Load environment variables"""
        from dotenv import load_dotenv
        load_dotenv()
    
    @property
    def environment(self) -> str:
        """Get current environment (development/production)"""
        return os.getenv("ENVIRONMENT", "development")
    
    @property
    def domain(self) -> str:
        """Get domain based on environment"""
        return os.getenv("DOMAIN", "localhost")
    
    @property
    def frontend_url(self) -> str:
        """Get frontend URL based on environment"""
        return os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    @property
    def backend_url(self) -> str:
        """Get backend URL based on environment"""
        if self.environment == "production":
            return f"https://{self.domain}/api"
        else:
            return "http://localhost:5000"
    
    @property
    def allowed_origins(self) -> List[str]:
        """Get allowed CORS origins"""
        origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
        return [origin.strip() for origin in origins.split(",")]
    
    @property
    def database_url(self) -> str:
        """Get database URL"""
        return os.getenv("DATABASE_URL", "sqlite:///wonder_learning.db")
    
    @property
    def upload_dir(self) -> str:
        """Get upload directory"""
        return os.getenv("UPLOAD_DIR", "uploads")
    
    @property
    def max_file_size(self) -> int:
        """Get max file size in bytes"""
        return int(os.getenv("MAX_FILE_SIZE", "104857600"))  # 100MB default
    
    @property
    def secret_key(self) -> str:
        """Get JWT secret key"""
        return os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

# Create a global config instance
config = Config()
