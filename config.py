import os
from dotenv import load_dotenv

# More explicit dotenv loading
load_dotenv(dotenv_path=".env")

print(f"DEBUG: Current working directory: {os.getcwd()}")
print(f"DEBUG: .env file exists: {os.path.exists('.env')}")
print(
    f"DEBUG: YouTube API Key loaded: {'YES' if os.environ.get('YOUTUBE_API_KEY') else 'NO'}"
)


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key-change-in-production"
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

    # Rate limiting settings
    MAX_REQUESTS_PER_MINUTE = 10

    # AI settings - Using correct Sonnet 4 model name
    AI_MODEL = "claude-sonnet-4-20250514"
    MAX_TRANSCRIPT_LENGTH = 50000
    MAX_USER_TRANSCRIPT_LIMIT = 100000

    @staticmethod
    def validate_config():
        """Validate that required environment variables are set"""
        missing = []

        if not Config.YOUTUBE_API_KEY:
            missing.append("YOUTUBE_API_KEY")

        if not Config.ANTHROPIC_API_KEY:
            missing.append("ANTHROPIC_API_KEY")

        if missing:
            print(f"Warning: Missing environment variables: {', '.join(missing)}")
            print("The application may not function properly without these keys.")
            return False

        return True
