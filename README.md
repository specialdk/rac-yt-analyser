# YouTube Transcript Analyzer

A modern web application that extracts transcripts from YouTube videos and generates AI-powered summaries with key insights. Built with Flask backend and vanilla JavaScript frontend.

## Features

✨ **Core Functionality**
- Extract transcripts from any YouTube video with captions
- Generate AI-powered paragraph summaries
- Create 10 key bullet points from video content
- Support for multiple YouTube URL formats
- Clean, modern web interface

🛠 **Technical Features**
- Robust error handling and user feedback
- Progressive loading with step-by-step progress indicators
- Copy-to-clipboard functionality for all results
- Responsive design for all devices
- API-first architecture with clean separation

🔧 **Advanced Capabilities**
- Automatic fallback for different transcript types
- Support for auto-generated and manual captions
- Graceful degradation when APIs are unavailable
- Comprehensive input validation
- Rate limiting and request optimization

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- YouTube Data API v3 key (optional but recommended)
- OpenAI API key (for AI analysis)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd youtube-transcript-analyzer
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your API keys:
   ```env
   # YouTube Data API v3 Key (get from Google Cloud Console)
   YOUTUBE_API_KEY=your_youtube_api_key_here
   
   # OpenAI API Key (get from OpenAI platform)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Flask Secret Key (generate a random string)
   SECRET_KEY=your_secret_key_here
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## API Keys Setup

### YouTube Data API v3 Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

**Note:** The YouTube API key is optional. The app will work without it but with limited video metadata.

### OpenAI API Key

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key to your `.env` file

**Note:** The OpenAI API key is required for AI-powered summaries and bullet points.

## Usage

### Basic Usage

1. **Enter YouTube URL**: Paste any YouTube video URL in the input field
2. **Click Analyze**: The app will process the video in three steps:
   - Extract video information and metadata
   - Fetch transcript and captions
   - Generate AI-powered analysis
3. **View Results**: See the summary, key points, and full transcript
4. **Copy Results**: Use individual copy buttons or copy all results at once

### Supported URL Formats

The application supports all standard YouTube URL formats:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://m.youtube.com/watch?v=VIDEO_ID`
- Direct video ID: `VIDEO_ID` (11 characters)

### API Endpoints

#### `POST /api/analyze`
Analyze a YouTube video and return transcript with AI analysis.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "video_id": "VIDEO_ID",
  "metadata": {
    "title": "Video Title",
    "author": "Channel Name",
    "publish_date": "2023-01-01",
    "duration": "10m 30s"
  },
  "transcript": {
    "text": "Full transcript text...",
    "language": "English",
    "is_generated": false,
    "word_count": 1500
  },
  "analysis": {
    "summary": "AI-generated summary...",
    "bullet_points": ["Point 1", "Point 2", ...],
    "analysis_success": true
  }
}
```

#### `GET /api/health`
Check API health and service status.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "youtube_service": true,
    "ai_service": true,
    "config_valid": true
  },
  "version": "1.0.0"
}
```

## File Structure

```
youtube-transcript-analyzer/
├── api/
│   ├── __init__.py
│   ├── youtube_service.py      # YouTube API integration
│   ├── ai_service.py           # OpenAI integration
│   └── utils.py                # Utility functions
├── static/
│   ├── css/
│   │   ├── main.css            # Main styles
│   │   └── components.css      # Component styles
│   └── js/
│       ├── app.js              # Main application logic
│       ├── urlHandler.js       # URL parsing utilities
│       └── uiComponents.js     # UI helper functions
├── templates/
│   └── index.html              # Main template
├── app.py                      # Flask application
├── config.py                   # Configuration settings
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | Optional | YouTube Data API v3 key for enhanced metadata |
| `OPENAI_API_KEY` | Required | OpenAI API key for AI analysis |
| `SECRET_KEY` | Optional | Flask secret key (auto-generated if not provided) |

### Application Settings

Edit `config.py` to customize:

- `AI_MODEL`: OpenAI model to use (default: gpt-3.5-turbo)
- `MAX_TRANSCRIPT_LENGTH`: Maximum transcript length in characters
- `MAX_REQUESTS_PER_MINUTE`: Rate limiting settings

## Troubleshooting

### Common Issues

**1. "No transcripts are available for this video"**
- The video doesn't have captions enabled
- The video is private or unavailable
- Try a different video with captions

**2. "AI analysis is currently unavailable"**
- Check your OpenAI API key in `.env` file
- Verify your OpenAI account has available credits
- Check the console for detailed error messages

**3. "Failed to fetch video metadata"**
- Your YouTube API key may be invalid or exceeded quota
- The app will work without the API key but with limited metadata

**4. Connection errors**
- Check your internet connection
- Verify API keys are correctly configured
- Some videos may be geo-restricted

### Debug Mode

Run the application in debug mode for detailed error messages:

```bash
# The app runs in debug mode by default during development
python app.py
```

Check the browser console and terminal output for detailed error information.

## Technical Details

### Architecture

- **Backend**: Flask with modular API design
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: CSS Grid/Flexbox with custom design system
- **APIs**: YouTube Data API v3, OpenAI GPT API, youtube-transcript-api

### Key Libraries

- `Flask`: Web framework
- `youtube-transcript-api`: Transcript extraction
- `openai`: AI analysis
- `requests`: HTTP client
- `python-dotenv`: Environment management

### Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### Running in Development

```bash
# Install development dependencies
pip install -r requirements.txt

# Run with auto-reload
python app.py
```

### Code Structure

- **Modular Design**: Separate services for YouTube and AI integration
- **Error Handling**: Comprehensive error handling at all levels
- **Responsive UI**: Mobile-first design approach
- **Progressive Enhancement**: Works without JavaScript for basic functionality

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review error messages in the browser console
3. Verify API key configuration
4. Create an issue on GitHub

---

**Built with ❤️ using modern web technologies**
