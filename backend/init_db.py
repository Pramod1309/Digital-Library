"""
Initialize database and create tables
"""
import os
import warnings
from dotenv import load_dotenv
from pathlib import Path
from database import Base, engine, Admin, SessionLocal, SchoolWatermarkText
from passlib.context import CryptContext

# Suppress bcrypt version warning
warnings.filterwarnings("ignore", message=".*bcrypt.*")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_database():
    """Create database if it doesn't exist - SQLite auto-creates"""
    print("Using SQLite database - auto-created on first connection")
    return True

def create_tables():
    """Create all tables"""
    try:
        Base.metadata.create_all(bind=engine)
        print("All tables created successfully")
        return True
    except Exception as e:
        print(f"Error creating tables: {e}")
        return False

def migrate_database():
    """Migrate existing database to add new columns and tables"""
    db = SessionLocal()
    try:
        # Check if contact_number column exists in schools table
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('schools')]
        
        if 'contact_number' not in columns:
            print("Migrating database to add contact_number field to schools table...")
            try:
                # For SQLite, we use ALTER TABLE
                db.execute(text("ALTER TABLE schools ADD COLUMN contact_number VARCHAR(20)"))
                db.commit()
                print("✓ Added contact_number column to schools table")
            except Exception as e:
                print(f"  Note: {e}")
                print("  Column might already exist or SQLite limitation encountered")
        
        # Check if school_watermark_texts table exists
        table_names = inspector.get_table_names()
        if 'school_watermark_texts' not in table_names:
            print("Creating school_watermark_texts table...")
            SchoolWatermarkText.__table__.create(bind=engine)
            print("✓ Created school_watermark_texts table")
        
        print("Database migration completed successfully!")
        
    except Exception as e:
        print(f"Migration error: {e}")
        db.rollback()
    finally:
        db.close()

def seed_admin():
    """Seed the admin user"""
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(Admin).filter(Admin.email == "pramodjadhav1876@gmail.com").first()
        
        if not existing_admin:
            admin_password = "Pramod@1309"
            admin_password_hash = pwd_context.hash(admin_password)
            
            admin = Admin(
                email="pramodjadhav1876@gmail.com",
                password_plain=admin_password,
                password_hash=admin_password_hash
            )
            
            db.add(admin)
            db.commit()
            print("✓ Admin user seeded successfully")
        else:
            print("✓ Admin user already exists")
    except Exception as e:
        print(f"Error seeding admin: {e}")
        db.rollback()
    finally:
        db.close()

def init_database():
    """Main initialization function"""
    print("=" * 50)
    print("Starting database initialization...")
    print("=" * 50)
    
    if create_database():
        if create_tables():
            migrate_database()  # Run migrations
            seed_admin()
            print("=" * 50)
            print("Database initialization completed successfully!")
            print("=" * 50)
        else:
            print("Failed to create tables")
    else:
        print("Failed to create database")

if __name__ == "__main__":
    init_database()