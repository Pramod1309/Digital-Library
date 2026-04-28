"""
Initialize database and create tables
"""
import os
import warnings
from dotenv import load_dotenv
from pathlib import Path
from database import (
    Base,
    engine,
    Admin,
    SessionLocal,
    SchoolPasswordResetOTP,
    SchoolWatermarkText,
    Resource,
)
from passlib.context import CryptContext

# Suppress bcrypt version warning
warnings.filterwarnings("ignore", message=".*bcrypt.*")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
load_dotenv(ROOT_DIR.parent / '.env')

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
        from sqlalchemy import inspect, text

        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        columns = [col['name'] for col in inspector.get_columns('schools')] if 'schools' in table_names else []

        school_column_defs = [
            ("contact_number", "VARCHAR(20)"),
            ("logo_path", "VARCHAR(500)"),
            ("welcome_email_sent_at", "DATETIME"),
        ]
        for col_name, col_def in school_column_defs:
            if col_name not in columns:
                print(f"Migrating database to add {col_name} field to schools table...")
                try:
                    db.execute(text(f"ALTER TABLE schools ADD COLUMN {col_name} {col_def}"))
                    db.commit()
                    print(f"Added {col_name} column to schools table")
                except Exception as e:
                    print(f"  Note: {e}")
                    print("  Column might already exist or SQLite limitation encountered")

        if 'school_watermark_texts' not in table_names:
            print("Creating school_watermark_texts table...")
            SchoolWatermarkText.__table__.create(bind=engine)
            print("Created school_watermark_texts table")
        else:
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

        if 'school_password_reset_otps' not in table_names:
            print("Creating school_password_reset_otps table...")
            SchoolPasswordResetOTP.__table__.create(bind=engine)
            print("Created school_password_reset_otps table")

        if 'resources' not in table_names:
            print("Creating resources table...")
            Resource.__table__.create(bind=engine)
            print("Created resources table")
        else:
            resource_columns = [col['name'] for col in inspector.get_columns('resources')]
            resource_column_defs = [
                ("class_level", "VARCHAR(100)"),
                ("subject", "VARCHAR(100)"),
                ("sub_category", "VARCHAR(255)"),
                ("consent_to_share", "VARCHAR(10)"),
                ("tags", "TEXT DEFAULT ''"),
                ("uploaded_by_type", "VARCHAR(50) DEFAULT 'admin'"),
                ("uploaded_by_id", "VARCHAR(100)"),
                ("uploaded_by_name", "VARCHAR(255)"),
                ("approval_status", "VARCHAR(50) DEFAULT 'approved'"),
                ("download_count", "INTEGER DEFAULT 0"),
                ("is_video_link", "BOOLEAN DEFAULT 0"),
            ]
            for col_name, col_def in resource_column_defs:
                if col_name not in resource_columns:
                    try:
                        db.execute(text(f"ALTER TABLE resources ADD COLUMN {col_name} {col_def}"))
                        db.commit()
                        print(f"Added {col_name} column to resources")
                    except Exception as e:
                        print(f"  Note: {e}")
                        print(f"  Column {col_name} might already exist or SQLite limitation encountered")

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

        if 'support_tickets' in table_names:
            ticket_columns = [col['name'] for col in inspector.get_columns('support_tickets')]
            ticket_column_defs = [
                ("admin_updated_at", "DATETIME"),
                ("school_last_viewed_at", "DATETIME")
            ]
            for col_name, col_def in ticket_column_defs:
                if col_name not in ticket_columns:
                    try:
                        db.execute(text(f"ALTER TABLE support_tickets ADD COLUMN {col_name} {col_def}"))
                        db.commit()
                        print(f"Added {col_name} column to support_tickets")
                    except Exception as e:
                        print(f"  Note: {e}")
                        print(f"  Column {col_name} might already exist or SQLite limitation encountered")

        print("Database migration completed successfully!")

    except Exception as e:
        print(f"Migration error: {e}")
        db.rollback()
    finally:
        db.close()


def seed_admin():
    """Seed the admin users"""
    db = SessionLocal()
    try:
        admin_credentials = [
            {
                "email": "pramodjadhav1876@gmail.com",
                "password": "Pramod@1309"
            },
            {
                "email": "wli.sonam2025@gmail.com",
                "password": "Sonam@2026"
            },
            {
                "email": "wli.dipali2025@gmail.com",
                "password": "Dipali@2026"
            },
            {
                "email": "darshanap@wonderlearning.in",
                "password": "Darshana@2026"
            }
        ]

        for admin_creds in admin_credentials:
            existing_admin = db.query(Admin).filter(Admin.email == admin_creds["email"]).first()

            if not existing_admin:
                admin_password_hash = pwd_context.hash(admin_creds["password"])
                admin = Admin(
                    email=admin_creds["email"],
                    password_plain=admin_creds["password"],
                    password_hash=admin_password_hash
                )
                db.add(admin)
                print(f"[ok] Admin user {admin_creds['email']} seeded successfully")
            else:
                print(f"[ok] Admin user {admin_creds['email']} already exists")

        db.commit()
        print("[ok] All admin users processed successfully")

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
            migrate_database()
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
