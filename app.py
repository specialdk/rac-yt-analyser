from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import traceback
import logging
from config import Config
from api.youtube_service import YouTubeService
from api.ai_service import AIService
from api.db_operations import (
    save_analysis,
    get_saved_analyses,
    delete_analysis,
    get_categories,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize services
youtube_service = YouTubeService()
ai_service = None

try:
    ai_service = AIService()
except Exception as e:
    logger.warning(f"AI Service initialization failed: {e}")


@app.route("/")
def index():
    """Serve the main application page"""
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze_video():
    """Main endpoint to analyze YouTube video"""
    try:
        data = request.get_json()

        if not data or "url" not in data:
            return jsonify({"success": False, "error": "YouTube URL is required"}), 400

        url = data["url"].strip()
        if not url:
            return (
                jsonify({"success": False, "error": "YouTube URL cannot be empty"}),
                400,
            )

        logger.info(f"Processing video URL: {url}")

        # Step 1: Process YouTube URL and get transcript (with fallback handling)
        youtube_data = youtube_service.process_youtube_url(url)

        print(f"DEBUG - YouTube data metadata: {youtube_data.get('metadata')}")

        if not youtube_data["success"]:
            return (
                jsonify({"success": False, "error": "Failed to process YouTube URL"}),
                500,
            )

        # Check if we have at least metadata or transcript
        has_metadata = youtube_data.get("metadata_success", False)
        has_transcript = youtube_data.get("transcript_success", False)

        if not has_metadata and not has_transcript:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to extract video information or transcript",
                    }
                ),
                500,
            )

        # Prepare transcript text for AI analysis
        transcript_text = ""
        transcript_available = False

        if has_transcript and youtube_data["transcript"]["text"]:
            transcript_text = youtube_data["transcript"]["text"]
            transcript_available = True

        # Step 2: Analyze with AI (if available and we have transcript)
        analysis_result = None
        print(f"DEBUG: About to check AI analysis conditions")
        print(f"DEBUG: transcript_available = {transcript_available}")
        print(f"DEBUG: transcript_text length = {len(transcript_text)}")
        print(f"DEBUG: ai_service exists = {ai_service is not None}")

        if ai_service and transcript_available:
            try:
                print("DEBUG: Starting AI analysis...")
                analysis_result = ai_service.analyze_transcript(
                    transcript_text, youtube_data["metadata"]
                )
                analysis_result["analysis_success"] = True
            except Exception as ai_error:
                logger.error(f"AI analysis failed: {ai_error}")
                analysis_result = {
                    "summary": "AI analysis failed. The video information was retrieved successfully, but AI processing encountered an error.",
                    "bullet_points": [
                        "Video metadata was retrieved successfully",
                        (
                            "Transcript extraction was successful"
                            if transcript_available
                            else "Transcript was not available for analysis"
                        ),
                        "AI analysis encountered a technical error",
                        "Check your Anthropic API key configuration",
                        "Verify API quotas and limits",
                        "Manual review of the transcript is recommended",
                        "Retry the analysis after checking configuration",
                        "Basic video information is still available",
                        "Consider checking API service status",
                        "Contact support if issues persist",
                    ],
                    "analysis_success": False,
                }
        elif ai_service and not transcript_available:
            # AI service is available but no transcript to analyze
            analysis_result = {
                "summary": "Video metadata retrieved, but transcript analysis unavailable.",
                "bullet_points": [
                    "Video information was successfully retrieved",
                    f'Transcript extraction failed: {youtube_data["transcript"].get("user_message", "Unknown error")}',
                    "AI analysis requires transcript text",
                    "Some videos may not have captions available",
                    "The video creator may not have enabled subtitles",
                    "Manual viewing of the video is recommended",
                    "Try again later as transcript availability may change",
                    "Video metadata and details are still accessible",
                    "Consider contacting the video creator about captions",
                    "This is a limitation of the source video, not the application",
                ],
                "analysis_success": False,
            }
        else:
            # No AI service configured
            analysis_result = {
                "summary": "Video information retrieved. AI analysis not available without API configuration.",
                "bullet_points": [
                    "Video metadata was successfully retrieved",
                    "Transcript extraction "
                    + ("was successful" if transcript_available else "failed"),
                    "Anthropic API key is not configured",
                    "Add ANTHROPIC_API_KEY to your .env file for AI analysis",
                    "AI analysis provides automated summaries and insights",
                    (
                        "Manual review of transcript is available"
                        if transcript_available
                        else "Manual viewing of video is recommended"
                    ),
                    "Configuration instructions are available in README",
                    "Restart application after adding API keys",
                    "Basic video information extraction is working",
                    "Full functionality requires API configuration",
                ],
                "analysis_success": False,
            }

        # Prepare warnings for the frontend
        warnings = []
        if not has_metadata:
            warnings.append(
                {
                    "type": "metadata_failed",
                    "message": "Video details could not be retrieved",
                }
            )
        if not has_transcript:
            warnings.append(
                {
                    "type": "transcript_failed",
                    "message": youtube_data["transcript"].get(
                        "user_message", "Transcript extraction failed"
                    ),
                    "details": youtube_data["transcript"].get(
                        "error_type", "unknown_error"
                    ),
                }
            )
        # Check for transcript truncation
        if has_transcript:
            transcript_text = youtube_data["transcript"].get("text", "")
            current_limit = data.get("transcript_length", Config.MAX_TRANSCRIPT_LENGTH)
            if (
                len(transcript_text) >= current_limit - 100
            ):  # Account for truncation buffer
                warnings.append(
                    {
                        "type": "transcript_truncated",
                        "message": f"Transcript may have been truncated at {current_limit:,} character limit",
                        "details": f"Current transcript: {len(transcript_text):,} characters. Full video may be longer. Consider increasing the transcript length limit to capture complete content.",
                    }
                )
        # Combine results
        result = {
            "success": True,
            "video_id": youtube_data["video_id"],
            "metadata": youtube_data["metadata"],
            "metadata_success": has_metadata,
            "transcript": {
                "text": youtube_data["transcript"].get("text", ""),
                "language": youtube_data["transcript"].get("language", "unknown"),
                "is_generated": youtube_data["transcript"].get("is_generated", False),
                "word_count": youtube_data["transcript"].get("word_count", 0),
                "transcript_type": youtube_data["transcript"].get(
                    "transcript_type", "unavailable"
                ),
                "success": has_transcript,
                "error_message": (
                    youtube_data["transcript"].get("user_message", "")
                    if not has_transcript
                    else None
                ),
                "attempts": youtube_data["transcript"].get("attempts", 0),
            },
            "transcript_success": has_transcript,
            "analysis": analysis_result,
            "warnings": warnings,
        }

        logger.info(
            f"Successfully processed video: {youtube_data['video_id']} (metadata: {has_metadata}, transcript: {has_transcript})"
        )
        return jsonify(result)

    except Exception as e:
        error_message = str(e)
        logger.error(f"Error processing request: {error_message}")
        logger.error(traceback.format_exc())

        return jsonify({"success": False, "error": error_message}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    config_status = Config.validate_config()

    return jsonify(
        {
            "status": "healthy",
            "services": {
                "youtube_service": True,
                "ai_service": ai_service is not None,
                "config_valid": config_status,
            },
            "version": "1.0.0",
        }
    )


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500


@app.route("/api/save-analysis", methods=["POST"])
def save_video_analysis():
    """Save a YouTube analysis to the database"""
    try:
        data = request.get_json()

        if not data or "video_data" not in data or "category" not in data:
            return (
                jsonify({"success": False, "error": "Missing video data or category"}),
                400,
            )

        success = save_analysis(data["video_data"], data["category"])

        if success:
            return jsonify({"success": True, "message": "Analysis saved successfully"})
        else:
            return jsonify({"success": False, "error": "Failed to save analysis"}), 500

    except Exception as e:
        logger.error(f"Error saving analysis: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/saved-analyses", methods=["GET"])
def get_saved_video_analyses():
    """Get saved analyses with optional search and filtering"""
    try:
        search_term = request.args.get("search", "")
        category = request.args.get("category", "all")

        analyses = get_saved_analyses(search_term, category)
        categories = get_categories()

        return jsonify(
            {"success": True, "analyses": analyses, "categories": categories}
        )

    except Exception as e:
        logger.error(f"Error retrieving analyses: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/delete-analysis/<video_id>", methods=["DELETE"])
def delete_video_analysis(video_id):
    """Delete a saved analysis"""
    try:
        success = delete_analysis(video_id)

        if success:
            return jsonify(
                {"success": True, "message": "Analysis deleted successfully"}
            )
        else:
            return (
                jsonify({"success": False, "error": "Failed to delete analysis"}),
                500,
            )

    except Exception as e:
        logger.error(f"Error deleting analysis: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/debug-db", methods=["GET"])
def debug_database():
    """Debug route to check database contents"""
    try:
        from api.db_operations import get_saved_analyses

        analyses = get_saved_analyses()

        return jsonify(
            {
                "success": True,
                "total_count": len(analyses),
                "analyses": [
                    {
                        "id": a["id"],
                        "title": a["title"],
                        "category": a["category"],
                        "date_saved": a["date_saved"],
                        "video_id": a["video_id"],
                    }
                    for a in analyses
                ],
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    # Validate configuration on startup
    Config.validate_config()

    print("=" * 50)
    print("YouTube Transcript Analyzer")
    print("=" * 50)
    print("Server starting on http://localhost:5000")
    print("Make sure your .env file is configured with API keys!")
    print("=" * 50)
