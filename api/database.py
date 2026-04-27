import sqlite3
import json
from datetime import datetime
import os

DATABASE_PATH = "rac_knowledge_base.db"


def init_database():
    """Initialize the SQLite database with required tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Create saved_analyses table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS saved_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            author TEXT,
            category TEXT NOT NULL,
            summary TEXT,
            bullet_points TEXT,  -- JSON string
            transcript_text TEXT,
            metadata TEXT,       -- JSON string  
            date_saved DATETIME DEFAULT CURRENT_TIMESTAMP,
            duration TEXT,
            view_count TEXT,
            word_count INTEGER
        )
    """
    )

    conn.commit()
    conn.close()
    print("Database initialized successfully!")


if __name__ == "__main__":
    init_database()
