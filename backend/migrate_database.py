#!/usr/bin/env python3
"""
Database migration script to add missing columns to the resources table
Run this script to update the database schema for the new fields
"""

import sqlite3
import os

def migrate_database():
    """Add missing columns to the resources table"""
    
    # Database path
    db_path = "wonder_learning.db"
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found!")
        return
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(resources)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add missing columns if they don't exist
        migrations = [
            ("subject", "ALTER TABLE resources ADD COLUMN subject VARCHAR(100)"),
            ("sub_category", "ALTER TABLE resources ADD COLUMN sub_category VARCHAR(255)"),
            ("consent_to_share", "ALTER TABLE resources ADD COLUMN consent_to_share VARCHAR(10)")
        ]
        
        for column_name, alter_sql in migrations:
            if column_name not in columns:
                print(f"Adding column: {column_name}")
                cursor.execute(alter_sql)
                print(f"✅ Added {column_name} column")
            else:
                print(f"⏭️  Column {column_name} already exists")
        
        # Commit changes
        conn.commit()
        print("\n🎉 Database migration completed successfully!")
        
        # Show updated table structure
        cursor.execute("PRAGMA table_info(resources)")
        updated_columns = cursor.fetchall()
        print("\n📋 Updated resources table structure:")
        for col in updated_columns:
            print(f"  - {col[1]} ({col[2]})")
            
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
