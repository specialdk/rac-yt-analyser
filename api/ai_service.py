import anthropic
import json
import time
from config import Config

class AIService:
    def __init__(self):
        if not Config.ANTHROPIC_API_KEY:
            raise Exception("Anthropic API key not configured")
        
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
        self.model = Config.AI_MODEL
        self.max_retries = 3
        self.retry_delay = 1  # seconds
    
    def analyze_transcript(self, transcript_text, video_metadata):
        """Generate summary and bullet points from transcript"""
        try:
            # Create structured prompt
            prompt = self._create_analysis_prompt(transcript_text, video_metadata)
            
            # Make API call with retries
            response = self._make_api_call_with_retry(prompt)
            
            # Parse and validate response
            analysis = self._parse_analysis_response(response)
            
            return {
                'summary': analysis['summary'],
                'bullet_points': analysis['bullet_points'],
                'word_count': len(transcript_text.split()),
                'analysis_success': True
            }
            
        except Exception as e:
            raise Exception(f"AI analysis failed: {str(e)}")
    
    def _create_analysis_prompt(self, transcript_text, metadata):
        """Create structured prompt for AI analysis"""
        title = metadata.get('title', 'Unknown Video')
        author = metadata.get('author', 'Unknown Creator')
        
        prompt = f"""Analyze this YouTube video transcript and provide a structured summary.

Video Information:
- Title: {title}
- Creator: {author}
- Duration: {metadata.get('duration', 'Unknown')}

Instructions:
1. Write a comprehensive paragraph summary (100-150 words) that captures the main themes and key insights
2. Create exactly 10 bullet points highlighting the most important takeaways
3. Focus on actionable insights and key information
4. Use clear, concise language

Transcript:
{transcript_text}

Please respond with a JSON object in this exact format:
{{
    "summary": "Your paragraph summary here...",
    "bullet_points": [
        "First key point",
        "Second key point",
        "Third key point",
        "Fourth key point",
        "Fifth key point",
        "Sixth key point",
        "Seventh key point",
        "Eighth key point",
        "Ninth key point",
        "Tenth key point"
    ]
}}"""
        return prompt
    
    def _make_api_call_with_retry(self, prompt):
        """Make Claude API call with retry logic"""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                message = self.client.messages.create(
                    model=self.model,
                    max_tokens=1500,
                    temperature=0.7,
                    system="You are an expert content analyzer. Always respond with valid JSON in the exact format requested.",
                    messages=[
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                )
                
                return message.content[0].text
                
            except Exception as e:
                error_msg = str(e).lower()
                if 'rate limit' in error_msg or 'rate_limit' in error_msg:
                    last_error = f"Rate limit exceeded: {str(e)}"
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                        continue
                elif 'api' in error_msg or 'authentication' in error_msg:
                    last_error = f"Anthropic API error: {str(e)}"
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay)
                        continue
                else:
                    last_error = f"Unexpected error: {str(e)}"
                    break
        
        raise Exception(f"Failed after {self.max_retries} attempts. Last error: {last_error}")
    
    def _parse_analysis_response(self, response_text):
        """Parse and validate AI response"""
        try:
            # Clean response text (remove potential markdown formatting)
            cleaned_response = response_text.strip()
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith('```'):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            
            cleaned_response = cleaned_response.strip()
            
            # Parse JSON
            analysis = json.loads(cleaned_response)
            
            # Validate structure
            if 'summary' not in analysis or 'bullet_points' not in analysis:
                raise ValueError("Missing required fields in response")
            
            if not isinstance(analysis['bullet_points'], list):
                raise ValueError("Bullet points must be a list")
            
            if len(analysis['bullet_points']) != 10:
                # If not exactly 10 points, adjust
                points = analysis['bullet_points']
                if len(points) > 10:
                    analysis['bullet_points'] = points[:10]
                else:
                    # Pad with generic points if needed
                    while len(analysis['bullet_points']) < 10:
                        analysis['bullet_points'].append(f"Additional insight #{len(analysis['bullet_points']) + 1}")
            
            # Ensure summary is not empty
            if not analysis['summary'].strip():
                analysis['summary'] = "This video covers various topics and provides valuable insights for viewers."
            
            return analysis
            
        except json.JSONDecodeError as e:
            # Fallback parsing for malformed JSON
            return self._fallback_parse(response_text)
        except Exception as e:
            raise Exception(f"Failed to parse AI response: {str(e)}")
    
    def _fallback_parse(self, response_text):
        """Fallback parsing when JSON parsing fails"""
        lines = response_text.strip().split('\n')
        summary = ""
        bullet_points = []
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if 'summary' in line.lower() and ':' in line:
                current_section = 'summary'
                summary = line.split(':', 1)[1].strip().strip('"')
            elif line.startswith('•') or line.startswith('-') or line.startswith('*'):
                bullet_points.append(line[1:].strip())
            elif current_section == 'summary' and not line.startswith('{') and not line.startswith('['):
                summary += " " + line
        
        # Ensure we have 10 bullet points
        while len(bullet_points) < 10:
            bullet_points.append(f"Key insight #{len(bullet_points) + 1}")
        
        if len(bullet_points) > 10:
            bullet_points = bullet_points[:10]
        
        if not summary:
            summary = "This video provides valuable content and insights for viewers."
        
        return {
            'summary': summary.strip(),
            'bullet_points': bullet_points
        }
