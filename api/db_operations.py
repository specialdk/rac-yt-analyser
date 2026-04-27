import sqlite3
import json
from datetime import datetime

DATABASE_PATH = "rac_knowledge_base.db"


def save_analysis(video_data, category):
    """Save a YouTube analysis to the database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()

        # Extract data from the analysis result
        metadata = video_data.get("metadata", {})
        transcript = video_data.get("transcript", {})
        analysis = video_data.get("analysis", {})

        cursor.execute(
            """
            INSERT OR REPLACE INTO saved_analyses 
            (video_id, title, author, category, summary, bullet_points, 
             transcript_text, metadata, duration, view_count, word_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                video_data.get("video_id"),
                metadata.get("title", "Unknown Title"),
                metadata.get("author", "Unknown Author"),
                category,
                analysis.get("summary", ""),
                json.dumps(analysis.get("bullet_points", [])),
                transcript.get("text", ""),
                json.dumps(metadata),
                metadata.get("duration", ""),
                metadata.get("view_count", ""),
                transcript.get("word_count", 0),
            ),
        )

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"Error saving analysis: {e}")
        return False


def get_saved_analyses(search_term=None, category=None):
    """Retrieve saved analyses with optional search and category filtering"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()

        query = "SELECT * FROM saved_analyses"
        params = []

        conditions = []

        if category and category != "all":
            conditions.append("category = ?")
            params.append(category)

        if search_term:
            conditions.append("(title LIKE ? OR summary LIKE ? OR category LIKE ?)")
            search_pattern = f"%{search_term}%"
            params.extend([search_pattern, search_pattern, search_pattern])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY date_saved DESC"

        cursor.execute(query, params)
        results = cursor.fetchall()

        # Convert to list of dictionaries
        columns = [description[0] for description in cursor.description]
        analyses = []

        for row in results:
            analysis = dict(zip(columns, row))
            # Parse JSON fields
            analysis["bullet_points"] = json.loads(analysis["bullet_points"])
            analysis["metadata"] = json.loads(analysis["metadata"])
            analyses.append(analysis)

        conn.close()
        return analyses

    except Exception as e:
        print(f"Error retrieving analyses: {e}")
        return []


def delete_analysis(video_id):
    """Delete a saved analysis"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM saved_analyses WHERE video_id = ?", (video_id,))

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"Error deleting analysis: {e}")
        return False


def get_categories():
    """Get list of all categories used"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT DISTINCT category FROM saved_analyses ORDER BY category")
        categories = [row[0] for row in cursor.fetchall()]

        conn.close()
        return categories

    except Exception as e:
        print(f"Error getting categories: {e}")
        return []
