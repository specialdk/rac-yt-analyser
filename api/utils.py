import re
from urllib.parse import urlparse, parse_qs

def extract_video_id(url):
    """
    Extract YouTube video ID from various URL formats
    Supports:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://m.youtube.com/watch?v=VIDEO_ID
    """
    if not url:
        return None
    
    # Remove whitespace
    url = url.strip()
    
    # Direct video ID (11 characters)
    if len(url) == 11 and re.match(r'^[a-zA-Z0-9_-]+$', url):
        return url
    
    # Parse URL
    parsed = urlparse(url)
    
    # Standard youtube.com URLs
    if parsed.hostname in ['www.youtube.com', 'youtube.com', 'm.youtube.com']:
        if parsed.path == '/watch':
            return parse_qs(parsed.query).get('v', [None])[0]
        elif parsed.path.startswith('/embed/'):
            return parsed.path.split('/')[2]
    
    # Shortened youtu.be URLs
    elif parsed.hostname == 'youtu.be':
        return parsed.path[1:]  # Remove leading slash
    
    return None

def truncate_text(text, max_length=8000):
    """Truncate text to maximum length while preserving word boundaries"""
    if len(text) <= max_length:
        return text
    
    # Find the last space within the limit
    truncated = text[:max_length]
    last_space = truncated.rfind(' ')
    
    if last_space > 0:
        return truncated[:last_space] + "..."
    else:
        return truncated + "..."

def format_duration(seconds):
    """Convert seconds to human-readable duration"""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"

def validate_transcript_data(transcript_data):
    """Validate transcript data structure"""
    if not transcript_data or not isinstance(transcript_data, list):
        return False
    
    for item in transcript_data:
        if not isinstance(item, dict):
            return False
        if 'text' not in item or 'start' not in item:
            return False
    
    return True
