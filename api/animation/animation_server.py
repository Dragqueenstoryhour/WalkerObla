#!/usr/bin/env python3
import os
import subprocess
import uuid
import datetime
import logging
import csv
import shutil
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(BASE_DIR))  # Project root directory
A2F_DIR = os.path.join(ROOT_DIR, "Audio2Face-3D-Samples")
A2F_SCRIPT = os.path.join(A2F_DIR, "scripts/audio2face_3d_microservices_interaction_app/a2f_3d.py")
CONFIG_DIR = os.path.join(A2F_DIR, "scripts/audio2face_3d_microservices_interaction_app/config")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
MODEL_CONFIGS = {
    "claire": "config_claire.yml",
    "mark": "config_mark.yml",
    "james": "config_james.yml"
}

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

def process_audio(audio_path, model="james"):
    try:
        # Generate a unique ID for this request
        request_id = str(uuid.uuid4())
        
        # Create timestamped output directory for A2F processing
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        output_dir = os.path.join(TEMP_DIR, timestamp)
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"Processing audio file: {audio_path}")
        logger.info(f"Using model: {model}")
        logger.info(f"Output directory: {output_dir}")
        
        # Build A2F command
        config_path = os.path.join(CONFIG_DIR, MODEL_CONFIGS.get(model, MODEL_CONFIGS["james"]))
        
        cmd = [
            "python3", A2F_SCRIPT,
            "run_inference",
            audio_path,
            config_path,
            "-u", "localhost:52000",
            "--output-dir", output_dir
        ]
        
        logger.info(f"Executing command: {' '.join(cmd)}")
        
        # Execute Audio2Face
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True
        )
        
        logger.info(f"A2F process completed with exit code: {result.returncode}")
        
        # Find generated files
        animation_file = os.path.join(output_dir, "animation_frames.csv")
        emotions_file = os.path.join(output_dir, "a2f_3d_smoothed_emotion_output.csv")
        
        if not os.path.exists(animation_file):
            logger.error("Animation output file not generated")
            raise FileNotFoundError("Animation output not generated")
        
        # Create blendshapes and emotions files with the request_id as part of the filename
        blendshapes_file = os.path.join(TEMP_DIR, f"{request_id}_blendshapes.csv")
        
        # Convert the animation data to our required format
        convert_animation_data(animation_file, blendshapes_file)
        
        # Copy emotions file if it exists
        emotions_output_file = None
        if os.path.exists(emotions_file):
            emotions_output_file = os.path.join(TEMP_DIR, f"{request_id}_emotions.csv")
            shutil.copy2(emotions_file, emotions_output_file)
            logger.info(f"Emotions data copied to {emotions_output_file}")
        
        return {
            "request_id": request_id,
            "audio_file": audio_path,
            "blendshapes_file": blendshapes_file,
            "emotions_file": emotions_output_file,
            "output_dir": output_dir
        }
    
    except subprocess.CalledProcessError as e:
        logger.error(f"A2F processing failed: {e.stderr}")
        raise RuntimeError(f"A2F processing failed: {e.stderr}")
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise

@app.route('/generate-animation', methods=['POST'])
def generate_animation():
    """Process audio file and generate animation data"""
    if 'audio' not in request.files:
        logger.error("No audio file provided in request")
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    if not audio_file.filename:
        logger.error("Empty audio filename")
        return jsonify({"error": "No audio file selected"}), 400
    
    model = request.form.get('model', 'james')
    
    try:
        # Create unique filename for the audio
        audio_id = str(uuid.uuid4())
        filename = f"{audio_id}.wav"
        audio_path = os.path.join(TEMP_DIR, filename)
        
        # Save uploaded file
        audio_file.save(audio_path)
        logger.info(f"Saved audio file to {audio_path}")
        
        # Process through Audio2Face
        result = process_audio(audio_path, model)
        
        response_data = {
            "success": True,
            "request_id": result["request_id"],
            "audio_url": f"/animation/audio/{result['request_id']}",
            "blendshapes_url": f"/animation/blendshapes/{result['request_id']}",
        }
        
        if result.get("emotions_file"):
            response_data["emotions_url"] = f"/animation/emotions/{result['request_id']}"
        
        return jsonify(response_data)
    
    except Exception as e:
        logger.error(f"Error generating animation: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/animation/audio/<request_id>')
def get_animation_audio(request_id):
    """Retrieve audio file for a specific animation request"""
    # Look for any file in TEMP_DIR that matches the request_id
    for file in os.listdir(TEMP_DIR):
        if file.endswith('.wav') and request_id in file:
            return send_file(os.path.join(TEMP_DIR, file), mimetype='audio/wav')
    
    return jsonify({"error": "Audio file not found"}), 404

@app.route('/animation/blendshapes/<request_id>')
def get_animation_blendshapes(request_id):
    """Retrieve blendshapes data for a specific animation request"""
    blendshapes_file = os.path.join(TEMP_DIR, f"{request_id}_blendshapes.csv")
    
    if os.path.exists(blendshapes_file):
        return send_file(blendshapes_file, mimetype='text/csv')
    
    return jsonify({"error": "Blendshapes file not found"}), 404

@app.route('/animation/emotions/<request_id>')
def get_animation_emotions(request_id):
    """Retrieve emotions data for a specific animation request"""
    emotions_file = os.path.join(TEMP_DIR, f"{request_id}_emotions.csv")
    
    if os.path.exists(emotions_file):
        return send_file(emotions_file, mimetype='text/csv')
    
    return jsonify({"error": "Emotions file not found"}), 404

@app.route('/status')
def get_status():
    """Check if the animation server is running"""
    return jsonify({
        "status": "ok",
        "version": "1.0.0",
        "models": list(MODEL_CONFIGS.keys())
    })

@app.route('/clean-temp')
def clean_temp():
    """Clean up temporary files older than 24 hours"""
    counter = 0
    now = datetime.datetime.now()
    
    for file in os.listdir(TEMP_DIR):
        file_path = os.path.join(TEMP_DIR, file)
        if os.path.isfile(file_path):
            file_creation = datetime.datetime.fromtimestamp(os.path.getctime(file_path))
            if (now - file_creation).days >= 1:
                os.remove(file_path)
                counter += 1
    
    return jsonify({
        "success": True,
        "files_removed": counter
    })

if __name__ == '__main__':
    # Create temp directory if it doesn't exist
    os.makedirs(TEMP_DIR, exist_ok=True)
    
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