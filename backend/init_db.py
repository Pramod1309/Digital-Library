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
                print("Added contact_number column to schools table")
            except Exception as e:
                print(f"  Note: {e}")
                print("  Column might already exist or SQLite limitation encountered")

        # Check if school_watermark_texts table exists
        table_names = inspector.get_table_names()
        if 'school_watermark_texts' not in table_names:
            print("Creating school_watermark_texts table...")
            SchoolWatermarkText.__table__.create(bind=engine)
            print("Created school_watermark_texts table")
        else:
            # Add missing columns to school_watermark_texts
            text_columns = [col['name'] for col in inspector.get_columns('school_watermark_texts')]
            text_column_defs = [
                ("name_rotation", "INTEGER DEFAULT 0"),
                ("name_font", "VARCHAR(100) DEFAULT 'Arial'"),
                ("name_style", "VARCHAR(50) DEFAULT 'normal'"),
                ("name_color", "VARCHAR(20) DEFAULT '#000000'"),
                ("show_name", "INTEGER DEFAULT 1"),
                ("contact_rotation", "INTEGER DEFAULT 0"),
                ("contact_font", "VARCHAR(100) DEFAULT 'Arial'"),
                ("contact_style", "VARCHAR(50) DEFAULT 'normal'"),
                ("contact_color", "VARCHAR(20) DEFAULT '#000000'"),
                ("show_contact", "INTEGER DEFAULT 1"),
                ("address_x", "INTEGER DEFAULT 50"),
                ("address_y", "INTEGER DEFAULT 85"),
                ("address_size", "INTEGER DEFAULT 10"),
                ("address_opacity", "FLOAT DEFAULT 1.0"),
                ("address_rotation", "INTEGER DEFAULT 0"),
                ("address_font", "VARCHAR(100) DEFAULT 'Arial'"),
                ("address_style", "VARCHAR(50) DEFAULT 'normal'"),
                ("address_color", "VARCHAR(20) DEFAULT '#000000'"),
                ("show_address", "INTEGER DEFAULT 0"),
                ("address", "TEXT")
            ]
            for col_name, col_def in text_column_defs:
                if col_name not in text_columns:
                    try:
                        db.execute(text(f"ALTER TABLE school_watermark_texts ADD COLUMN {col_name} {col_def}"))
                        db.commit()
                        print(f"Added {col_name} column to school_watermark_texts")
                    except Exception as e:
                        print(f"  Note: {e}")
                        print(f"  Column {col_name} might already exist or SQLite limitation encountered")

        # Add missing columns to school_logo_positions
        if 'school_logo_positions' in table_names:
            logo_columns = [col['name'] for col in inspector.get_columns('school_logo_positions')]
            if 'rotation' not in logo_columns:
                try:
                    db.execute(text("ALTER TABLE school_logo_positions ADD COLUMN rotation INTEGER DEFAULT 0"))
                    db.commit()
                    print("Added rotation column to school_logo_positions")
                except Exception as e:
                    print(f"  Note: {e}")
                    print("  Column rotation might already exist or SQLite limitation encountered")

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