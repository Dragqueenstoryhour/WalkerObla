#!/usr/bin/env python3
# Animation Server for NVIDIA Audio2Face-3D Integration

import os
import json
import asyncio
import subprocess
import logging
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
        tts.save(audio_file)
        logger.info(f"Speech generated and saved to {audio_file}")

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

            # The Audio2Face client saves blendshapes.csv and emotions.csv in TEMP_DIR
            try:
                if os.path.exists(os.path.join(TEMP_DIR, "blendshapes.csv")):
                    os.rename(os.path.join(TEMP_DIR, "blendshapes.csv"), csv_file)
                    logger.info(f"Blendshapes saved to {csv_file}")
                else:
                    logger.error("blendshapes.csv not found after A2F processing")
                    return jsonify({"error": "blendshapes.csv not found after A2F processing"}), 500

                if os.path.exists(os.path.join(TEMP_DIR, "emotions.csv")):
                    os.rename(os.path.join(TEMP_DIR, "emotions.csv"), emotion_file)
                    logger.info(f"Emotions saved to {emotion_file}")
                else:
                    logger.warning("emotions.csv not found after A2F processing")
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