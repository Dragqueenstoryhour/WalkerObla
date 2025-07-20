#!/usr/bin/env python3
import os
import uuid
import datetime
import logging
import csv
import shutil
import math
import json
import requests
from tempfile import NamedTemporaryFile, TemporaryDirectory
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import subprocess # Keep subprocess for ffmpeg calls

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(BASE_DIR))  # Project root directory
TEMP_DIR = os.path.join(BASE_DIR, "temp")

# Define constants for audio processing
FFMPEG_SAMPLE_RATE = 16000
FFMPEG_CHANNELS = 1

# Define models for viseme animation
MODEL_CONFIGS = {
    "claire": "en-US-JennyNeural",
    "mark": "en-US-GuyNeural",
    "james": "en-US-DavisNeural"
}

# Node.js Viseme API endpoint (configurable via environment variable)
VISEME_API_ENDPOINT = os.environ.get("VISEME_API_ENDPOINT", "http://localhost:5000/api/visemes/generate")
TTS_API_ENDPOINT = os.environ.get("TTS_API_ENDPOINT", "http://localhost:5000/api/speech/synthesize")


def run_ffmpeg_conversion(input_path, output_path, sample_rate=FFMPEG_SAMPLE_RATE, channels=FFMPEG_CHANNELS):
    """Converts audio to specified WAV format using ffmpeg."""
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-acodec", "pcm_s16le",
        "-ar", str(sample_rate),
        "-ac", str(channels),
        output_path
    ]
    logger.info(f"Running ffmpeg command: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        logger.info(f"FFmpeg conversion successful: {input_path} -> {output_path}")
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg conversion failed for {input_path}: {e.stderr.decode()}")
        raise RuntimeError(f"FFmpeg conversion failed: {e.stderr.decode()}")
    except FileNotFoundError:
        logger.error("FFmpeg not found. Please ensure it is installed and in your PATH.")
        raise RuntimeError("FFmpeg not found. Please install it or ensure it's in your PATH.")

def convert_animation_data(source_csv, target_csv):
    """Convert the A2F output animation CSV to a simplified format for our frontend."""
    logger.info(f"Found animation_frames.csv at {source_csv}")
    
    with open(source_csv, 'r') as src, open(target_csv, 'w', newline='') as dest:
        reader = csv.reader(src)
        writer = csv.writer(dest)
        
        # Write header
        header = next(reader)
        writer.writerow(header)
        
        # Write data rows
        for row in reader:
            writer.writerow(row)
    
    logger.info(f"Converted animation_frames.csv to our format at {target_csv}")
    return True

def validate_audio_file(file_path):
    """Validate audio file format and convert if needed"""
    try:
        # Use a temporary file for conversion output
        with NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav_file:
            converted_path = temp_wav_file.name
        
        try:
            # Attempt to convert to 16kHz mono WAV
            run_ffmpeg_conversion(file_path, converted_path, FFMPEG_SAMPLE_RATE, FFMPEG_CHANNELS)
            return converted_path
        except RuntimeError as e:
            logger.warning(f"Initial audio validation/conversion failed: {e}. Attempting direct pass-through.")
            # If conversion fails, return original path and let downstream handle it
            return file_path
            
    except Exception as e:
        logger.error(f"Error during audio validation process: {str(e)}")
        raise RuntimeError(f"Error validating audio file: {str(e)}")

def process_audio(audio_path, model="james"):
    try:
        # Generate a unique ID for this request
        request_id = str(uuid.uuid4())

        # Create a temporary directory for processing
        # This ensures all related files for a request are grouped and cleaned up together
        with TemporaryDirectory(dir=TEMP_DIR) as temp_output_dir:
            logger.info(f"Created temporary output directory: {temp_output_dir}")

            # Validate and convert audio file if needed
            validated_audio_path = validate_audio_file(audio_path)

            # Get the appropriate voice based on model
            voice_name = MODEL_CONFIGS.get(model, MODEL_CONFIGS["james"])
            logger.info(f"Using Azure voice: {voice_name}")

            # Call the Node.js Azure Viseme API using requests
            try:
                with open(validated_audio_path, 'rb') as f:
                    files = {'audio': (os.path.basename(validated_audio_path), f, 'audio/wav')}
                    data = {
                        'voice': voice_name,
                        'format': 'blendshapes',
                        'text': 'placeholder text for viseme generation' # Viseme API expects text
                    }
                    logger.info(f"Calling Azure Viseme API at {VISEME_API_ENDPOINT} with voice {voice_name}")
                    response = requests.post(VISEME_API_ENDPOINT, files=files, data=data)
                    response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
                
                response_data = response.json()
                
                if not response_data.get("success"):
                    error_msg = response_data.get('error', 'Unknown error from Viseme API')
                    logger.error(f"Azure Viseme API returned error: {error_msg}")
                    raise RuntimeError(f"Azure Viseme processing failed: {error_msg}")
                    
                # Create the blendshapes file
                blendshapes_file = os.path.join(temp_output_dir, f"{request_id}_blendshapes.csv")
                with open(blendshapes_file, 'w') as f:
                    f.write(response_data.get("blendshapesCsv", ""))
                
                logger.info(f"Saved blendshapes file to {blendshapes_file}")
                
                # Save the audio file if provided
                audio_output_path = os.path.join(temp_output_dir, f"{request_id}.wav")
                if response_data.get("audioBuffer"): # Node.js API returns audioBuffer as base64
                    import base64
                    audio_data = base64.b64decode(response_data.get("audioBuffer"))
                    with open(audio_output_path, 'wb') as f:
                        f.write(audio_data)
                    logger.info(f"Saved audio file to {audio_output_path}")
                else:
                    # If no audio data returned, use the validated input audio
                    shutil.copy(validated_audio_path, audio_output_path)
                    logger.info(f"No audio data from Viseme API, copied validated input audio to {audio_output_path}")
                
            except requests.exceptions.RequestException as e:
                logger.error(f"HTTP request to Viseme API failed: {e}")
                raise RuntimeError(f"Failed to connect to Viseme API: {e}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Viseme API response: {e}. Response text: {response.text[:200]}...")
                raise RuntimeError(f"Failed to parse Viseme API response: {e}")
            except Exception as e:
                logger.error(f"Unexpected error during Viseme API call: {str(e)}")
                raise RuntimeError(f"Viseme API call failed: {str(e)}")
            
            finally:
                # Clean up the temporary validated audio file if it was converted
                if validated_audio_path != audio_path and os.path.exists(validated_audio_path):
                    try:
                        os.remove(validated_audio_path)
                        logger.info(f"Cleaned up temporary validated audio file: {validated_audio_path}")
                    except Exception as e:
                        logger.warning(f"Could not remove temporary audio file {validated_audio_path}: {str(e)}")
            
            return {
                "request_id": request_id,
                "audio_file": audio_output_path,
                "blendshapes_file": blendshapes_file,
                "emotions_file": None,  # Azure Viseme doesn't currently provide emotions data
                "output_dir": temp_output_dir # Return the temporary directory path
            }
    
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise

@app.route('/generate-from-audio', methods=['POST'])
@app.route('/generate-animation', methods=['POST'])
def generate_animation():
    """Process audio file or text and generate animation data"""
    model = request.form.get('model', 'james')
    
    # Check for audio file in request
    if 'audio' in request.files:
        audio_file = request.files['audio']
        if not audio_file.filename:
            logger.error("Empty audio filename")
            return jsonify({"error": "No audio file selected"}), 400
        
        try:
            # Create unique filename for the audio in a temporary directory
            with NamedTemporaryFile(suffix=".wav", delete=False, dir=TEMP_DIR) as temp_audio_file:
                audio_path = temp_audio_file.name
                audio_file.save(audio_path)
            logger.info(f"Saved uploaded audio file to {audio_path}")
            
            # Process through Audio2Face
            result = process_audio(audio_path, model)
            
            response_data = {
                "success": True,
                "request_id": result["request_id"],
                "audio_url": f"/animation/audio/{os.path.basename(result['audio_file'])}", # Use basename for URL
                "blendshapes_url": f"/animation/blendshapes/{os.path.basename(result['blendshapes_file'])}", # Use basename for URL
            }
            
            if result.get("emotions_file"):
                response_data["emotions_url"] = f"/animation/emotions/{os.path.basename(result['emotions_file'])}"
            
            return jsonify(response_data)
        
        except Exception as e:
            logger.error(f"Error generating animation: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    # Check for text in request (for text-to-speech)
    elif request.json and 'text' in request.json:
        try:
            text = request.json['text']
            voice = request.json.get('voice', 'default')
            
            logger.info(f"Received text for TTS: {text[:50]}...")
            logger.info(f"Using voice: {voice}")
            
            # Generate a unique filename for audio in a temporary directory
            with NamedTemporaryFile(suffix=".wav", delete=False, dir=TEMP_DIR) as temp_tts_audio_file:
                audio_path = temp_tts_audio_file.name
            
            # Call the Node.js TTS API
            try:
                tts_payload = {
                    "text": text,
                    "voice": voice,
                    "speed": 1.0 # Default speed for TTS
                }
                logger.info(f"Calling Node.js TTS API at {TTS_API_ENDPOINT}")
                tts_response = requests.post(TTS_API_ENDPOINT, json=tts_payload)
                tts_response.raise_for_status()
                
                # Save the audio content from the response
                with open(audio_path, 'wb') as f:
                    f.write(tts_response.content)
                logger.info(f"Saved TTS audio from Node.js API to {audio_path}")

            except requests.exceptions.RequestException as e:
                logger.warning(f"Node.js TTS API call failed: {e}. Falling back to local ffmpeg sine wave.")
                # Fallback: If Node.js TTS API is not available, create a simple sine wave
                try:
                    run_ffmpeg_conversion(
                        "sine=frequency=440:duration=3", # ffmpeg lavfi input
                        audio_path,
                        FFMPEG_SAMPLE_RATE,
                        FFMPEG_CHANNELS
                    )
                    logger.info("Created placeholder audio file using ffmpeg.")
                except Exception as ffmpeg_e:
                    logger.error(f"Failed to create placeholder audio with ffmpeg: {ffmpeg_e}")
                    raise RuntimeError(f"Failed to generate TTS audio: {ffmpeg_e}")
                
            # Process the generated audio through Audio2Face
            result = process_audio(audio_path, model)
            
            response_data = {
                "success": True,
                "request_id": result["request_id"],
                "audio_url": f"/animation/audio/{os.path.basename(result['audio_file'])}",
                "blendshapes_url": f"/animation/blendshapes/{os.path.basename(result['blendshapes_file'])}",
            }
            
            if result.get("emotions_file"):
                response_data["emotions_url"] = f"/animation/emotions/{os.path.basename(result['emotions_file'])}"
            
            return jsonify(response_data)
                
        except Exception as e:
            logger.error(f"Error generating TTS audio: {str(e)}")
            return jsonify({
                "success": False,
                "error": f"Error generating TTS audio: {str(e)}"
            }), 500
    
    # If neither audio nor text is provided
    else:
        logger.error("Neither audio file nor text provided in request")
        return jsonify({"error": "No audio file or text provided"}), 400

@app.route('/animation/audio/<filename>')
def get_animation_audio(filename):
    """Retrieve audio file for a specific animation request"""
    file_path = os.path.join(TEMP_DIR, filename)
    if os.path.exists(file_path) and filename.endswith('.wav'):
        return send_file(file_path, mimetype='audio/wav')
    
    return jsonify({"error": "Audio file not found"}), 404

@app.route('/animation/blendshapes/<filename>')
def get_animation_blendshapes(filename):
    """Retrieve blendshapes data for a specific animation request"""
    file_path = os.path.join(TEMP_DIR, filename)
    
    if os.path.exists(file_path) and filename.endswith('.csv') and '_blendshapes' in filename:
        return send_file(file_path, mimetype='text/csv')
    
    return jsonify({"error": "Blendshapes file not found"}), 404

@app.route('/animation/emotions/<filename>')
def get_animation_emotions(filename):
    """Retrieve emotions data for a specific animation request"""
    file_path = os.path.join(TEMP_DIR, filename)
    
    if os.path.exists(file_path) and filename.endswith('.csv') and '_emotions' in filename:
        return send_file(file_path, mimetype='text/csv')
    
    return jsonify({"error": "Emotions file not found"}), 404

@app.route('/status')
def get_status():
    """Check if the animation server is running"""
    return jsonify({
        "status": "ok",
        "version": "1.0.0",
        "models": list(MODEL_CONFIGS.keys())
    })

import threading
import time

def clean_temp_job():
    """Clean up temporary files older than 24 hours - runs as a background job"""
    while True:
        logger.info("Starting temp directory cleanup job...")
        counter = 0
        now = datetime.datetime.now()
        
        # Iterate through items in TEMP_DIR
        for item_name in os.listdir(TEMP_DIR):
            item_path = os.path.join(TEMP_DIR, item_name)
            
            # Check if it's a file
            if os.path.isfile(item_path):
                file_creation_time = datetime.datetime.fromtimestamp(os.path.getctime(item_path))
                if (now - file_creation_time).days >= 1:
                    os.remove(item_path)
                    counter += 1
                    logger.info(f"Removed old temporary file: {item_path}")
            # Check if it's a directory (e.g., from TemporaryDirectory)
            elif os.path.isdir(item_path):
                dir_creation_time = datetime.datetime.fromtimestamp(os.path.getctime(item_path))
                if (now - dir_creation_time).days >= 1:
                    shutil.rmtree(item_path)
                    counter += 1
                    logger.info(f"Removed old temporary directory: {item_path}")
        logger.info(f"Finished temp directory cleanup. Removed {counter} items.")
        time.sleep(24 * 60 * 60) # Run once every 24 hours

if __name__ == '__main__':
    # Create temp directory if it doesn't exist
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    # Start the background cleanup job
    cleanup_thread = threading.Thread(target=clean_temp_job, daemon=True)
    cleanup_thread.start()

    # Check if port 5050 is available, otherwise use an alternative
    import socket
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    port = 5050
    if is_port_in_use(port):
        logger.warning(f"Port {port} is already in use, trying alternative port")
        port = 5051
        if is_port_in_use(port):
            logger.warning(f"Port {port} is also in use, using random available port")
            port = 0  # Using 0 lets the OS choose an available port
    
    logger.info(f"Starting animation server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)