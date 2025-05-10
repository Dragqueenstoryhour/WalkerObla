#!/usr/bin/env python3
# Animation Server for NVIDIA Audio2Face-3D Integration

import os
import json
import asyncio
import subprocess
import logging
import csv
import shutil
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from gtts import gTTS
from dotenv import load_dotenv
import tempfile
import uuid
import sys
import yaml
import glob

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
WORKSPACE_DIR = "/home/runner/workspace"
VENV_PYTHON = "python3"  # Use system Python instead of looking for a virtual environment
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
API_KEY = os.getenv("NVIDIA_API_KEY", "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")
A2F_CLIENT_SCRIPT = os.path.join(WORKSPACE_DIR, "Audio2Face-3D-Samples", "scripts", "audio2face_3d_api_client", "nim_a2f_3d_client.py")
A2F_CONFIG_DIR = os.path.join(WORKSPACE_DIR, "Audio2Face-3D-Samples", "scripts", "audio2face_3d_api_client", "config")

# Set default function IDs for each model
FUNCTION_IDS = {
    "mark": "8efc55f5-6f00-424e-afe9-26212cd2c630",  # Mark model with tongue animation
    "claire": "0961a6da-fb9e-4f2e-8491-247e5fd7bf8d",  # Claire model with tongue animation
    "james": "9327c39f-a361-4e02-bd72-e11b4c9b7b5e",  # James model with tongue animation
}

app = Flask(__name__)

# Ensure temp directory exists
os.makedirs(TEMP_DIR, exist_ok=True)

@app.route("/healthcheck", methods=["GET"])
def healthcheck():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200

@app.route("/generate-animation", methods=["POST"])
def generate_animation():
    """Generate animation from text input"""
    data = request.get_json()

    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data.get('text')
    model = data.get('model', 'claire')  # Default to Claire model

    if model not in FUNCTION_IDS:
        return jsonify({"error": f"Invalid model. Choose from: {', '.join(FUNCTION_IDS.keys())}"}), 400

    try:
        # Generate unique ID for this request
        request_id = str(uuid.uuid4())
        audio_file = os.path.join(TEMP_DIR, f"{request_id}.wav")

        # Generate speech from text
        logger.info(f"Generating speech for text: {text}")
        tts = gTTS(text=text, lang='en', slow=False)
        
        # Save the MP3 file first
        mp3_file = os.path.join(TEMP_DIR, f"{request_id}_temp.mp3")
        tts.save(mp3_file)
        logger.info(f"Speech generated and saved to {mp3_file}")
        
        # Convert MP3 to WAV with proper PCM format
        try:
            import subprocess
            # Use the full path to ffmpeg
            ffmpeg_path = "/nix/store/3zc5jbvqzrn8zmva4fx5p0nh4yy03wk4-ffmpeg-6.1.1-bin/bin/ffmpeg"
            logger.info(f"Using ffmpeg at {ffmpeg_path}")
            ffmpeg_cmd = [ffmpeg_path, "-y", "-i", mp3_file, "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", audio_file]
                
            logger.info(f"Converting MP3 to WAV with command: {' '.join(ffmpeg_cmd)}")
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
            logger.info(f"Converted audio saved to {audio_file}")
            
            # Remove temporary MP3 file
            os.remove(mp3_file)
        except Exception as e:
            logger.error(f"Error converting MP3 to WAV: {str(e)}")
            return jsonify({"error": f"Failed to convert audio: {str(e)}"}), 500

        # Call Audio2Face API to generate blendshapes
        csv_file = os.path.join(TEMP_DIR, f"{request_id}_blendshapes.csv")
        emotion_file = os.path.join(TEMP_DIR, f"{request_id}_emotions.csv")

        # Prepare Audio2Face API call
        config_file = os.path.join(A2F_CONFIG_DIR, f"config_{model}.yml")
        function_id = FUNCTION_IDS[model]

        # Execute the Audio2Face client
        try:
            cmd = [
                VENV_PYTHON, A2F_CLIENT_SCRIPT,
                audio_file, config_file,
                "--apikey", API_KEY,
                "--function-id", function_id
            ]

            logger.info(f"Executing command: {' '.join(cmd)}")
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                cwd=TEMP_DIR
            )

            logger.info(f"Audio2Face client output: {process.stdout}")

            # The Audio2Face client saves animation data in a timestamped directory
            try:
                # List files in the temp directory to look for timestamped folders
                files_in_temp = glob.glob(os.path.join(TEMP_DIR, "*"))
                logger.info(f"Files in TEMP_DIR after A2F processing: {files_in_temp}")
                
                # Find the most recent timestamped folder (starts with current date)
                timestamp_folders = sorted([f for f in files_in_temp if os.path.isdir(f) and 
                                           os.path.basename(f).startswith(f"{datetime.now().strftime('%Y%m%d')}")], 
                                           reverse=True)
                
                if timestamp_folders:
                    # Use the most recent timestamped folder
                    a2f_output_dir = timestamp_folders[0]
                    logger.info(f"Found A2F output directory: {a2f_output_dir}")
                    
                    # Check for animation_frames.csv in the output directory
                    animation_frames_path = os.path.join(a2f_output_dir, "animation_frames.csv")
                    if os.path.exists(animation_frames_path):
                        logger.info(f"Found animation_frames.csv at {animation_frames_path}")
                        
                        # Convert the NVIDIA-format CSV to our blendshapes format
                        with open(animation_frames_path, 'r') as src, open(csv_file, 'w') as dst:
                            # Read the original CSV
                            reader = csv.reader(src)
                            headers = next(reader)
                            
                            # Write the new CSV with our format
                            dst.write("name,value,timestamp\n")
                            
                            # Find indexes of key blendshape columns
                            jawOpen_idx = headers.index('blendShapes.JawOpen') if 'blendShapes.JawOpen' in headers else -1
                            mouthSmileLeft_idx = headers.index('blendShapes.MouthSmileLeft') if 'blendShapes.MouthSmileLeft' in headers else -1
                            mouthSmileRight_idx = headers.index('blendShapes.MouthSmileRight') if 'blendShapes.MouthSmileRight' in headers else -1
                            eyeBlinkLeft_idx = headers.index('blendShapes.EyeBlinkLeft') if 'blendShapes.EyeBlinkLeft' in headers else -1
                            eyeBlinkRight_idx = headers.index('blendShapes.EyeBlinkRight') if 'blendShapes.EyeBlinkRight' in headers else -1
                            timeCode_idx = headers.index('timeCode') if 'timeCode' in headers else 1  # Default to second column
                            
                            # Make sure we found all required columns
                            if jawOpen_idx == -1 or mouthSmileLeft_idx == -1 or mouthSmileRight_idx == -1 or \
                               eyeBlinkLeft_idx == -1 or eyeBlinkRight_idx == -1 or timeCode_idx == -1:
                                raise ValueError(f"Required blendshape columns not found in {animation_frames_path}")
                            
                            # Process each frame
                            for row in reader:
                                if len(row) <= 1:  # Skip empty rows
                                    continue
                                
                                timestamp = float(row[timeCode_idx]) * 1000  # Convert to milliseconds
                                
                                # Write key blendshapes
                                dst.write(f"JawOpen,{row[jawOpen_idx]},{timestamp}\n")
                                dst.write(f"MouthSmileLeft,{row[mouthSmileLeft_idx]},{timestamp}\n")
                                dst.write(f"MouthSmileRight,{row[mouthSmileRight_idx]},{timestamp}\n")
                                dst.write(f"EyeBlinkLeft,{row[eyeBlinkLeft_idx]},{timestamp}\n")
                                dst.write(f"EyeBlinkRight,{row[eyeBlinkRight_idx]},{timestamp}\n")
                                
                        logger.info(f"Converted animation_frames.csv to our format at {csv_file}")
                        
                        # Also copy the emotions file if available
                        emotion_src = os.path.join(a2f_output_dir, "a2f_smoothed_emotion_output.csv")
                        if os.path.exists(emotion_src):
                            shutil.copy(emotion_src, emotion_file)
                            logger.info(f"Emotions data copied to {emotion_file}")
                        else:
                            logger.warning(f"No emotions file found at {emotion_src}")
                    else:
                        logger.error(f"animation_frames.csv not found in {a2f_output_dir}")
                        return jsonify({"error": f"animation_frames.csv not found in {a2f_output_dir}"}), 500
                else:
                    logger.error("No timestamped output folder found from Audio2Face processing")
                    return jsonify({"error": "No timestamped output folder found from Audio2Face processing"}), 500
            except Exception as e:
                logger.error(f"Error moving output files: {str(e)}")

        except subprocess.CalledProcessError as e:
            logger.error(f"Error calling Audio2Face client: {str(e)}")
            logger.error(f"STDOUT: {e.stdout}")
            logger.error(f"STDERR: {e.stderr}")
            return jsonify({
                "error": "Failed to generate animation", 
                "details": str(e),
                "stdout": e.stdout,
                "stderr": e.stderr
            }), 500

        # Verify we have the CSV file
        if not os.path.exists(csv_file):
            return jsonify({"error": "Failed to generate blendshapes CSV file"}), 500

        # Return the results
        return jsonify({
            "success": True,
            "request_id": request_id,
            "audio_url": f"/animation/audio/{request_id}",
            "blendshapes_url": f"/animation/blendshapes/{request_id}",
            "emotions_url": f"/animation/emotions/{request_id}" if os.path.exists(emotion_file) else None
        })

    except Exception as e:
        logger.exception("Error generating animation")
        return jsonify({"error": str(e)}), 500

@app.route("/animation/audio/<request_id>", methods=["GET"])
def get_audio(request_id):
    """Get generated audio file"""
    audio_file = os.path.join(TEMP_DIR, f"{request_id}.wav")

    if not os.path.exists(audio_file):
        return jsonify({"error": "Audio file not found"}), 404

    return send_file(audio_file, mimetype="audio/wav")

@app.route("/animation/blendshapes/<request_id>", methods=["GET"])
def get_blendshapes(request_id):
    """Get generated blendshapes CSV file"""
    csv_file = os.path.join(TEMP_DIR, f"{request_id}_blendshapes.csv")

    if not os.path.exists(csv_file):
        return jsonify({"error": "Blendshapes file not found"}), 404

    return send_file(csv_file, mimetype="text/csv")

@app.route("/animation/emotions/<request_id>", methods=["GET"])
def get_emotions(request_id):
    """Get generated emotions CSV file"""
    emotion_file = os.path.join(TEMP_DIR, f"{request_id}_emotions.csv")

    if not os.path.exists(emotion_file):
        return jsonify({"error": "Emotions file not found"}), 404

    return send_file(emotion_file, mimetype="text/csv")

@app.route("/list-files", methods=["GET"])
def list_files():
    """Debug endpoint to list files in temp directory"""
    files = glob.glob(os.path.join(TEMP_DIR, "*"))
    return jsonify({"files": files})

@app.route("/generate-from-audio", methods=["POST"])
def generate_from_audio():
    """Generate animation from audio file upload"""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
        
    audio_file = request.files['audio']
    model = request.form.get('model', 'claire')  # Default to Claire model
    
    if not audio_file.filename:
        return jsonify({"error": "No audio file selected"}), 400
        
    if model not in FUNCTION_IDS:
        return jsonify({"error": f"Invalid model. Choose from: {', '.join(FUNCTION_IDS.keys())}"}), 400
    
    try:
        # Generate unique ID for this request
        request_id = str(uuid.uuid4())
        temp_audio_path = os.path.join(TEMP_DIR, f"{request_id}.wav")
        
        # Save uploaded audio file
        audio_file.save(temp_audio_path)
        logger.info(f"Audio file saved to {temp_audio_path}")
        
        # Check file format and convert if needed
        try:
            import subprocess
            from scipy.io import wavfile
            
            try:
                # Try to read the file with scipy to check format
                samplerate, data = wavfile.read(temp_audio_path)
                logger.info(f"Audio file validated: {samplerate}Hz, shape: {data.shape}")
                
                # If file is not 16kHz mono, convert it
                if samplerate != 16000 or len(data.shape) > 1:
                    logger.info(f"Converting audio to 16kHz mono PCM format")
                    converted_path = os.path.join(TEMP_DIR, f"{request_id}_converted.wav")
                    
                    # Use the full path to ffmpeg
                    ffmpeg_path = "/nix/store/3zc5jbvqzrn8zmva4fx5p0nh4yy03wk4-ffmpeg-6.1.1-bin/bin/ffmpeg"
                    logger.info(f"Using ffmpeg at {ffmpeg_path}")
                    ffmpeg_cmd = [ffmpeg_path, "-y", "-i", temp_audio_path, "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", converted_path]
                    
                    logger.info(f"Converting audio with command: {' '.join(ffmpeg_cmd)}")
                    subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
                    logger.info(f"Converted audio saved to {converted_path}")
                    
                    # Replace original file with converted file
                    os.replace(converted_path, temp_audio_path)
                    logger.info(f"Replaced original audio with converted version")
            except Exception as read_error:
                # If scipy can't read the file, it's likely in an unsupported format (MP3, etc.)
                logger.warning(f"Could not read audio file with scipy: {str(read_error)}")
                logger.info(f"Converting to WAV PCM format")
                
                # Convert the audio file to a format that scipy can read
                converted_path = os.path.join(TEMP_DIR, f"{request_id}_converted.wav")
                
                # Use the full path to ffmpeg
                ffmpeg_path = "/nix/store/3zc5jbvqzrn8zmva4fx5p0nh4yy03wk4-ffmpeg-6.1.1-bin/bin/ffmpeg"
                logger.info(f"Using ffmpeg at {ffmpeg_path}")
                ffmpeg_cmd = [ffmpeg_path, "-y", "-i", temp_audio_path, "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", converted_path]
                
                logger.info(f"Converting audio with command: {' '.join(ffmpeg_cmd)}")
                subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
                logger.info(f"Converted audio saved to {converted_path}")
                
                # Replace original file with converted file
                os.replace(converted_path, temp_audio_path)
                logger.info(f"Replaced original audio with converted version")
        except Exception as e:
            logger.error(f"Error preprocessing audio file: {str(e)}")
            return jsonify({"error": f"Failed to preprocess audio: {str(e)}"}), 500
        
        # Call Audio2Face API to generate blendshapes
        csv_file = os.path.join(TEMP_DIR, f"{request_id}_blendshapes.csv")
        emotion_file = os.path.join(TEMP_DIR, f"{request_id}_emotions.csv")
        
        # Prepare Audio2Face API call
        config_file = os.path.join(A2F_CONFIG_DIR, f"config_{model}.yml")
        function_id = FUNCTION_IDS[model]
        
        # Execute the Audio2Face client
        try:
            cmd = [
                VENV_PYTHON, A2F_CLIENT_SCRIPT,
                temp_audio_path, config_file,
                "--apikey", API_KEY,
                "--function-id", function_id
            ]
            
            logger.info(f"Executing command: {' '.join(cmd)}")
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                cwd=TEMP_DIR
            )
            
            logger.info(f"Audio2Face client output: {process.stdout}")
            
            # The Audio2Face client saves animation data in a timestamped directory
            try:
                # List files in the temp directory to look for timestamped folders
                files_in_temp = glob.glob(os.path.join(TEMP_DIR, "*"))
                logger.info(f"Files in TEMP_DIR after A2F processing: {files_in_temp}")
                
                # Find the most recent timestamped folder (starts with current date)
                timestamp_folders = sorted([f for f in files_in_temp if os.path.isdir(f) and 
                                           os.path.basename(f).startswith(f"{datetime.now().strftime('%Y%m%d')}")], 
                                           reverse=True)
                
                if timestamp_folders:
                    # Use the most recent timestamped folder
                    a2f_output_dir = timestamp_folders[0]
                    logger.info(f"Found A2F output directory: {a2f_output_dir}")
                    
                    # Check for animation_frames.csv in the output directory
                    animation_frames_path = os.path.join(a2f_output_dir, "animation_frames.csv")
                    if os.path.exists(animation_frames_path):
                        logger.info(f"Found animation_frames.csv at {animation_frames_path}")
                        
                        # Convert the NVIDIA-format CSV to our blendshapes format
                        with open(animation_frames_path, 'r') as src, open(csv_file, 'w') as dst:
                            # Read the original CSV
                            reader = csv.reader(src)
                            headers = next(reader)
                            
                            # Write the new CSV with our format
                            dst.write("name,value,timestamp\n")
                            
                            # Find indexes of key blendshape columns
                            jawOpen_idx = headers.index('blendShapes.JawOpen') if 'blendShapes.JawOpen' in headers else -1
                            mouthSmileLeft_idx = headers.index('blendShapes.MouthSmileLeft') if 'blendShapes.MouthSmileLeft' in headers else -1
                            mouthSmileRight_idx = headers.index('blendShapes.MouthSmileRight') if 'blendShapes.MouthSmileRight' in headers else -1
                            eyeBlinkLeft_idx = headers.index('blendShapes.EyeBlinkLeft') if 'blendShapes.EyeBlinkLeft' in headers else -1
                            eyeBlinkRight_idx = headers.index('blendShapes.EyeBlinkRight') if 'blendShapes.EyeBlinkRight' in headers else -1
                            timeCode_idx = headers.index('timeCode') if 'timeCode' in headers else 1  # Default to second column
                            
                            # Make sure we found all required columns
                            if jawOpen_idx == -1 or mouthSmileLeft_idx == -1 or mouthSmileRight_idx == -1 or \
                               eyeBlinkLeft_idx == -1 or eyeBlinkRight_idx == -1 or timeCode_idx == -1:
                                raise ValueError(f"Required blendshape columns not found in {animation_frames_path}")
                            
                            # Process each frame
                            for row in reader:
                                if len(row) <= 1:  # Skip empty rows
                                    continue
                                
                                timestamp = float(row[timeCode_idx]) * 1000  # Convert to milliseconds
                                
                                # Write key blendshapes
                                dst.write(f"JawOpen,{row[jawOpen_idx]},{timestamp}\n")
                                dst.write(f"MouthSmileLeft,{row[mouthSmileLeft_idx]},{timestamp}\n")
                                dst.write(f"MouthSmileRight,{row[mouthSmileRight_idx]},{timestamp}\n")
                                dst.write(f"EyeBlinkLeft,{row[eyeBlinkLeft_idx]},{timestamp}\n")
                                dst.write(f"EyeBlinkRight,{row[eyeBlinkRight_idx]},{timestamp}\n")
                                
                        logger.info(f"Converted animation_frames.csv to our format at {csv_file}")
                        
                        # Also copy the emotions file if available
                        emotion_src = os.path.join(a2f_output_dir, "a2f_smoothed_emotion_output.csv")
                        if os.path.exists(emotion_src):
                            shutil.copy(emotion_src, emotion_file)
                            logger.info(f"Emotions data copied to {emotion_file}")
                        else:
                            logger.warning(f"No emotions file found at {emotion_src}")
                    else:
                        logger.error(f"animation_frames.csv not found in {a2f_output_dir}")
                        return jsonify({"error": f"animation_frames.csv not found in {a2f_output_dir}"}), 500
                else:
                    logger.error("No timestamped output folder found from Audio2Face processing")
                    return jsonify({"error": "No timestamped output folder found from Audio2Face processing"}), 500
            except Exception as e:
                logger.error(f"Error moving output files: {str(e)}")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Error calling Audio2Face client: {str(e)}")
            logger.error(f"STDOUT: {e.stdout}")
            logger.error(f"STDERR: {e.stderr}")
            return jsonify({
                "error": "Failed to generate animation", 
                "details": str(e),
                "stdout": e.stdout,
                "stderr": e.stderr
            }), 500
            
        # Verify we have the CSV file
        if not os.path.exists(csv_file):
            return jsonify({"error": "Failed to generate blendshapes CSV file"}), 500
            
        # Return the results
        return jsonify({
            "success": True,
            "request_id": request_id,
            "audio_url": f"/animation/audio/{request_id}",
            "blendshapes_url": f"/animation/blendshapes/{request_id}",
            "emotions_url": f"/animation/emotions/{request_id}" if os.path.exists(emotion_file) else None
        })
        
    except Exception as e:
        logger.exception("Error generating animation from audio")
        return jsonify({"error": str(e)}), 500


@app.route("/cleanup", methods=["POST"])
def cleanup():
    """Clean up temporary files"""
    try:
        files = glob.glob(os.path.join(TEMP_DIR, "*"))
        for file in files:
            os.remove(file)
        return jsonify({"success": True, "message": f"Removed {len(files)} files"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("ANIMATION_PORT", 5050))
    app.run(host="0.0.0.0", port=port, debug=True)