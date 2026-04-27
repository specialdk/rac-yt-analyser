import requests
import time
import random
import subprocess
import json
import tempfile
import os
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    VideoUnavailable,
    NoTranscriptFound,
)
from config import Config
from .utils import extract_video_id, truncate_text, validate_transcript_data


class YouTubeService:
    def __init__(self):
        self.api_key = Config.YOUTUBE_API_KEY
        self.base_url = "https://www.googleapis.com/youtube/v3"
        self.transcript_api = YouTubeTranscriptApi()

        # User agents to rotate through for anti-bot measures
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        ]

    def get_video_metadata(self, video_id):
        """Get video metadata using YouTube Data API v3"""
        if not self.api_key:
            return {
                "title": "Video Title Not Available",
                "author": "Channel Not Available",
                "publish_date": "Date Not Available",
                "description": "",
                "duration": "Unknown",
                "view_count": "Unknown",
            }

        try:
            url = f"{self.base_url}/videos"
            params = {
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
                "key": self.api_key,
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if not data.get("items"):
                raise Exception("Video not found")

            video = data["items"][0]
            snippet = video["snippet"]
            statistics = video.get("statistics", {})

            # Parse duration from ISO 8601 format (PT4M13S)
            duration_iso = video.get("contentDetails", {}).get("duration", "PT0S")
            duration_seconds = self._parse_duration(duration_iso)

            return {
                "title": snippet.get("title", "Unknown Title"),
                "author": snippet.get("channelTitle", "Unknown Channel"),
                "publish_date": snippet.get("publishedAt", "Unknown Date")[
                    :10
                ],  # YYYY-MM-DD
                "description": (
                    snippet.get("description", "")[:200] + "..."
                    if len(snippet.get("description", "")) > 200
                    else snippet.get("description", "")
                ),
                "duration": self._format_duration(duration_seconds),
                "view_count": statistics.get("viewCount", "Unknown"),
                "video_id": video_id,
            }

        except requests.RequestException as e:
            raise Exception(f"Failed to fetch video metadata: {str(e)}")
        except Exception as e:
            raise Exception(f"Error processing video metadata: {str(e)}")

    def get_transcript_with_retry(self, video_id, max_transcript_length=None):
        """Get video transcript with robust retry logic and anti-bot measures"""
        max_retries = 3
        base_delay = 1.0
        should_try_ytdlp = False  # Flag to trigger yt-dlp fallback

        for attempt in range(max_retries):
            try:
                # Add random delay to avoid rate limiting
                if attempt > 0:
                    delay = base_delay * (2**attempt) + random.uniform(0, 1)
                    print(
                        f"Transcript attempt {attempt + 1}/{max_retries}, waiting {delay:.1f}s..."
                    )
                    time.sleep(delay)

                # Configure requests session with rotating user agent
                session = requests.Session()
                session.headers.update(
                    {
                        "User-Agent": random.choice(self.user_agents),
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Accept-Encoding": "gzip, deflate",
                        "Connection": "keep-alive",
                        "Upgrade-Insecure-Requests": "1",
                    }
                )

                # Monkey patch the session into the transcript API
                original_get = requests.get
                requests.get = session.get

                try:
                    # Try to get transcript in preferred language order
                    transcript_list = self.transcript_api.list_transcripts(video_id)

                    # Prefer manually created transcripts over auto-generated
                    transcript = None
                    transcript_type = "manual"

                    try:
                        transcript = transcript_list.find_manually_created_transcript(
                            ["en", "en-US"]
                        )
                    except (NoTranscriptFound, Exception):
                        try:
                            transcript = transcript_list.find_generated_transcript(
                                ["en", "en-US"]
                            )
                            transcript_type = "auto-generated"
                        except (NoTranscriptFound, Exception):
                            try:
                                # Get any available transcript
                                transcript = transcript_list.find_transcript(
                                    ["en", "en-US", "es", "fr", "de", "it", "pt"]
                                )
                                transcript_type = "available"
                            except (NoTranscriptFound, Exception):
                                raise Exception(
                                    "No transcripts found in supported languages"
                                )

                    # Fetch the transcript data
                    transcript_data = transcript.fetch()

                    if not validate_transcript_data(transcript_data):
                        raise Exception("Invalid transcript data format")

                    # Format transcript text
                    formatter = TextFormatter()
                    full_text = formatter.format_transcript(transcript_data)

                    # Truncate if too long
                    transcript_limit = (
                        max_transcript_length or Config.MAX_TRANSCRIPT_LENGTH
                    )
                    original_length = len(full_text)
                    full_text = truncate_text(full_text, transcript_limit)
                    was_truncated = len(full_text) < original_length

                    return {
                        "text": full_text,
                        "language": transcript.language,
                        "is_generated": transcript.is_generated,
                        "transcript_type": transcript_type,
                        "word_count": len(full_text.split()),
                        "original_length": original_length,
                        "was_truncated": was_truncated,
                        "raw_data": transcript_data[:50],
                        "success": True,
                        "attempts": attempt + 1,
                    }

                finally:
                    # Restore original requests.get
                    requests.get = original_get
                    session.close()

            except TranscriptsDisabled:
                print(f"TranscriptsDisabled error - will try yt-dlp fallback")
                should_try_ytdlp = True
                break  # Exit retry loop and try yt-dlp
                
            except VideoUnavailable:
                return {
                    "success": False,
                    "error": "Video is unavailable or private",
                    "error_type": "video_unavailable",
                    "user_message": "This video is unavailable, private, or has been removed.",
                    "attempts": attempt + 1,
                }
            except NoTranscriptFound:
                print(f"NoTranscriptFound error - will try yt-dlp fallback")
                should_try_ytdlp = True
                break  # Exit retry loop and try yt-dlp
                
            except Exception as e:
                error_msg = str(e).lower()
                if "no element found" in error_msg or "xml" in error_msg:
                    if attempt < max_retries - 1:
                        print(
                            f"XML parsing error, retrying... (attempt {attempt + 1}/{max_retries})"
                        )
                        continue
                    else:
                        print(
                            f"XML parsing failed after {max_retries} attempts, falling back to yt-dlp"
                        )
                        should_try_ytdlp = True
                        break

                elif "429" in error_msg or "rate limit" in error_msg:
                    if attempt < max_retries - 1:
                        print(
                            f"Rate limited, retrying... (attempt {attempt + 1}/{max_retries})"
                        )
                        continue
                    else:
                        print(
                            f"Rate limiting failed after {max_retries} attempts, falling back to yt-dlp"
                        )
                        should_try_ytdlp = True
                        break
                else:
                    if attempt < max_retries - 1:
                        print(
                            f"Unexpected error: {e}, retrying... (attempt {attempt + 1}/{max_retries})"
                        )
                        continue
                    else:
                        print(
                            f"Unknown error after {max_retries} attempts, falling back to yt-dlp: {e}"
                        )
                        should_try_ytdlp = True
                        break

        # If we should try yt-dlp, do it now
        if should_try_ytdlp:
            print("Primary transcript extraction failed, trying yt-dlp fallback...")
            print(f"DEBUG: About to call yt-dlp for video_id: {video_id}")
            result = self.get_transcript_with_ytdlp(video_id, max_transcript_length)
            print(f"DEBUG: yt-dlp result success: {result.get('success')}")
            print(f"DEBUG: yt-dlp text length: {len(result.get('text', ''))}")
            return result
        
        # If we get here without triggering yt-dlp, return final error
        return {
            "success": False,
            "error": "All transcript extraction methods failed",
            "error_type": "extraction_failed",
            "user_message": "Unable to extract transcript after trying multiple methods.",
            "attempts": max_retries,
        }

    def get_transcript_with_ytdlp(self, video_id, max_transcript_length=None):
        """Fallback transcript extraction using yt-dlp"""
        try:
            # Use yt-dlp to extract subtitle information
            url = f"https://www.youtube.com/watch?v={video_id}"

            # Create temporary directory for subtitle files
            with tempfile.TemporaryDirectory() as temp_dir:
                subtitle_file = os.path.join(temp_dir, "subtitle.%(ext)s")

                # Command to extract subtitles using yt-dlp
                cmd = [
                    "python",
                    "-m",
                    "yt_dlp",
                    "--write-subs",
                    "--write-auto-subs",
                    "--sub-langs",
                    "en,en-US",
                    "--skip-download",
                    "--sub-format",
                    "vtt",
                    "--output",
                    subtitle_file,
                    "--user-agent",
                    random.choice(self.user_agents),
                    url,
                ]

                print(f"DEBUG: Running yt-dlp command: {' '.join(cmd)}")
                
                # Execute yt-dlp command
                process = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=30
                )

                if process.returncode != 0:
                    print(f"DEBUG: yt-dlp command failed")
                    print(f"DEBUG: Command: {' '.join(cmd)}")
                    print(f"DEBUG: Return code: {process.returncode}")
                    print(f"DEBUG: stderr: {process.stderr}")
                    print(f"DEBUG: stdout: {process.stdout}")
                    raise Exception(f"yt-dlp failed: {process.stderr}")

                print(f"DEBUG: yt-dlp command succeeded")
                print(f"DEBUG: Looking for subtitle files in {temp_dir}")
                
                # Look for subtitle files
                subtitle_files = []
                for file in os.listdir(temp_dir):
                    if file.endswith(".vtt"):
                        subtitle_files.append(os.path.join(temp_dir, file))
                        print(f"DEBUG: Found subtitle file: {file}")

                if not subtitle_files:
                    print(f"DEBUG: No .vtt files found in {temp_dir}")
                    print(f"DEBUG: Directory contents: {os.listdir(temp_dir)}")
                    raise Exception("No subtitle files found")

                # Read the first available subtitle file
                subtitle_file = subtitle_files[0]
                transcript_text = self._parse_vtt_file(subtitle_file)

                if not transcript_text:
                    raise Exception("Failed to parse subtitle content")

                # Truncate if too long
                transcript_limit = max_transcript_length or Config.MAX_TRANSCRIPT_LENGTH
                original_length = len(transcript_text)
                transcript_text = truncate_text(transcript_text, transcript_limit)
                was_truncated = len(transcript_text) < original_length

                print(f"DEBUG: Successfully extracted transcript via yt-dlp: {len(transcript_text)} chars")

                return {
                    "text": transcript_text,
                    "language": "en",
                    "is_generated": True,
                    "transcript_type": "yt-dlp-extracted",
                    "word_count": len(transcript_text.split()),
                    "original_length": original_length,
                    "was_truncated": was_truncated,
                    "raw_data": [],
                    "success": True,
                    "attempts": 1,
                    "method": "yt-dlp",
                }

        except subprocess.TimeoutExpired:
            print(f"DEBUG: yt-dlp subprocess timeout")
            return {
                "success": False,
                "error": "yt-dlp extraction timeout",
                "error_type": "timeout",
                "user_message": "Transcript extraction timed out. This may be due to video length or network issues.",
                "attempts": 1,
            }
        except FileNotFoundError as e:
            print(f"DEBUG: yt-dlp FileNotFoundError: {e}")
            return {
                "success": False,
                "error": "yt-dlp not found",
                "error_type": "missing_dependency",
                "user_message": "yt-dlp is not installed. Please install it for enhanced transcript extraction.",
                "attempts": 1,
            }
        except Exception as e:
            print(f"DEBUG: yt-dlp exception: {e}")
            return {
                "success": False,
                "error": f"yt-dlp extraction failed: {str(e)}",
                "error_type": "ytdlp_error",
                "user_message": "Alternative transcript extraction method also failed. This video may not have captions available.",
                "attempts": 1,
            }

    def _parse_vtt_file(self, file_path):
        """Parse VTT subtitle file and extract text"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            lines = content.split("\n")
            transcript_lines = []

            for line in lines:
                line = line.strip()
                # Skip empty lines, timestamps, and VTT headers
                if (
                    line
                    and not line.startswith("WEBVTT")
                    and not line.startswith("NOTE")
                    and not "-->" in line
                    and not line.isdigit()
                ):

                    # Remove VTT formatting tags
                    import re

                    line = re.sub(r"<[^>]+>", "", line)
                    line = re.sub(r"&[a-zA-Z]+;", "", line)

                    if line:
                        transcript_lines.append(line)

            return " ".join(transcript_lines)

        except Exception as e:
            print(f"Error parsing VTT file: {e}")
            return None

    def process_youtube_url(self, url, max_transcript_length=None):
        """Complete processing of YouTube URL - get metadata and transcript with fallback handling"""
        # Extract video ID
        video_id = extract_video_id(url)
        if not video_id:
            raise Exception(
                "Invalid YouTube URL. Please provide a valid YouTube video link."
            )

        result = {"video_id": video_id, "success": True}

        # Always try to get metadata first
        try:
            metadata = self.get_video_metadata(video_id)
            result["metadata"] = metadata
            result["metadata_success"] = True
        except Exception as e:
            print(f"Metadata extraction failed: {e}")
            result["metadata"] = {
                "title": "Unable to fetch video details",
                "author": "Unknown Channel",
                "publish_date": "Unknown Date",
                "description": "Video metadata could not be retrieved.",
                "duration": "Unknown",
                "view_count": "Unknown",
                "video_id": video_id,
            }
            result["metadata_success"] = False
            result["metadata_error"] = str(e)

        # Try to get transcript with robust error handling
        transcript_result = self.get_transcript_with_retry(
            video_id, max_transcript_length
        )

        if transcript_result["success"]:
            result["transcript"] = transcript_result
            result["transcript_success"] = True
        else:
            result["transcript"] = {
                "text": "",
                "language": "unknown",
                "is_generated": False,
                "transcript_type": "unavailable",
                "word_count": 0,
                "raw_data": [],
                "success": False,
                "error": transcript_result["error"],
                "error_type": transcript_result["error_type"],
                "user_message": transcript_result["user_message"],
                "attempts": transcript_result["attempts"],
            }
            result["transcript_success"] = False

        return result

    def _parse_duration(self, duration_iso):
        """Parse ISO 8601 duration to seconds"""
        import re

        pattern = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")
        match = pattern.match(duration_iso)

        if not match:
            return 0

        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)

        return hours * 3600 + minutes * 60 + seconds

    def _format_duration(self, seconds):
        """Format seconds to human readable duration"""
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            minutes = seconds // 60
            secs = seconds % 60
            return f"{minutes}m {secs}s"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"
