#!/usr/bin/env python3
"""
Migration script to add the is_video_link column to the resources table
"""

import sqlite3
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import ROOT_DIR

def add_video_link_column():
    """Add the is_video_link column to the resources table"""
    db_path = ROOT_DIR / "wonder_learning.db"
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(resources)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_video_link' not in columns:
            print("Adding is_video_link column to resources table...")
            
            # Add the column with a default value of False
            cursor.execute("""
                ALTER TABLE resources 
                ADD COLUMN is_video_link BOOLEAN DEFAULT 0
            """)
            
            conn.commit()
            print("✓ is_video_link column added successfully")
        else:
            print("✓ is_video_link column already exists")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(resources)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_video_link' in columns:
            print("✓ Verification successful: is_video_link column exists")
        else:
            print("✗ Verification failed: is_video_link column not found")
            return False
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    finally:
        conn.close()
    
    return True

if __name__ == "__main__":
    print("=" * 50)
    print("Adding is_video_link column to resources table")
    print("=" * 50)
    
    if add_video_link_column():
        print("=" * 50)
        print("Migration completed successfully!")
        print("=" * 50)
    else:
        print("=" * 50)
        print("Migration failed!")
        print("=" * 50)
        sys.exit(1)
