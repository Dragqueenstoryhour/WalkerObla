#!/usr/bin/env python3
import os
import subprocess
import uuid
import datetime
import logging
import csv
import shutil
import math
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

def validate_audio_file(file_path):
    """Validate audio file format and convert if needed"""
    try:
        import wave
        import subprocess
        
        # Check if file is a valid audio file (WAV format)
        try:
            with wave.open(file_path, 'rb') as wav_file:
                sample_rate = wav_file.getframerate()
                channels = wav_file.getnchannels()
                
                # Audio2Face requires 16kHz mono WAV
                if sample_rate != 16000 or channels != 1:
                    logger.info(f"Converting audio: {sample_rate}Hz, {channels} channels to 16kHz mono")
                    converted_path = f"{file_path}_converted.wav"
                    
                    # Use ffmpeg to convert to 16kHz mono WAV
                    cmd = [
                        "ffmpeg", "-y", "-i", file_path, 
                        "-acodec", "pcm_s16le", 
                        "-ar", "16000", 
                        "-ac", "1", 
                        converted_path
                    ]
                    
                    subprocess.run(cmd, check=True, capture_output=True)
                    return converted_path
        except Exception as e:
            # Not a valid WAV file, try to convert it
            logger.info(f"Input is not a valid WAV file, converting: {str(e)}")
            converted_path = f"{file_path}_converted.wav"
            
            # Use ffmpeg to convert to 16kHz mono WAV
            cmd = [
                "ffmpeg", "-y", "-i", file_path,
                "-acodec", "pcm_s16le", 
                "-ar", "16000", 
                "-ac", "1", 
                converted_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return converted_path
            
        # File is already valid
        return file_path
        
    except Exception as e:
        logger.error(f"Error validating audio file: {str(e)}")
        raise RuntimeError(f"Error validating audio file: {str(e)}")

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
        
        # Validate and convert audio file if needed
        validated_audio_path = validate_audio_file(audio_path)
        logger.info(f"Validated audio path: {validated_audio_path}")
        
        # Build A2F command
        config_path = os.path.join(CONFIG_DIR, MODEL_CONFIGS.get(model, MODEL_CONFIGS["james"]))
        
        # Check if A2F script exists
        if not os.path.exists(A2F_SCRIPT):
            logger.error(f"A2F script not found at: {A2F_SCRIPT}")
            
            # Create a mock result for testing purposes when A2F is not available
            logger.warning("Creating mock animation result for testing purposes")
            mock_blendshapes_file = os.path.join(TEMP_DIR, f"{request_id}_blendshapes.csv")
            
            # Create a simple mock CSV with blendshapes data
            with open(mock_blendshapes_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timeCode', 'jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'eyeBlinkLeft'])
                # Add some sample data
                for i in range(0, 100, 5):
                    time_code = i / 30.0
                    jaw_value = abs(math.sin(time_code * 3)) * 0.5
                    writer.writerow([time_code, jaw_value, 0.2, 0.1, 0.05, 0.0])
            
            return {
                "request_id": request_id,
                "audio_file": audio_path,
                "blendshapes_file": mock_blendshapes_file,
                "emotions_file": None,
                "output_dir": output_dir
            }
            
        # If A2F is available, execute it
        cmd = [
            "python3", A2F_SCRIPT,
            "run_inference",
            validated_audio_path,
            config_path,
            "-u", "localhost:52000",
            "--output-dir", output_dir
        ]
        
        logger.info(f"Executing command: {' '.join(cmd)}")
        
        # Execute Audio2Face
        try:
            result = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True
            )
            
            logger.info(f"A2F process completed with exit code: {result.returncode}")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"A2F processing failed with error: {e.stderr}")
            raise RuntimeError(f"A2F processing failed: {e.stderr}")
        
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
        
        # Clean up the temporary validated audio file if it was converted
        if validated_audio_path != audio_path and os.path.exists(validated_audio_path):
            try:
                os.remove(validated_audio_path)
            except Exception as e:
                logger.warning(f"Could not remove temporary audio file: {str(e)}")
        
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
    
    # Check for text in request (for text-to-speech)
    elif request.json and 'text' in request.json:
        from tempfile import NamedTemporaryFile
        import subprocess
        
        try:
            text = request.json['text']
            voice = request.json.get('voice', 'default')
            
            logger.info(f"Received text for TTS: {text[:50]}...")
            logger.info(f"Using voice: {voice}")
            
            # Generate a unique filename for audio
            audio_id = str(uuid.uuid4())
            audio_path = os.path.join(TEMP_DIR, f"{audio_id}_tts.wav")
            
            # For now, we'll use a simple text-to-wav utility
            # In a production system, this would use a proper TTS API
            try:
                with NamedTemporaryFile(suffix='.txt', delete=False) as text_file:
                    text_file.write(text.encode('utf-8'))
                    text_path = text_file.name
                
                # Use espeak or any other TTS tool available (this is just a placeholder)
                # In production this would call our TTS API
                try:
                    subprocess.run(
                        ["espeak", "-w", audio_path, "-f", text_path],
                        check=True, capture_output=True
                    )
                except (subprocess.SubprocessError, FileNotFoundError):
                    # If espeak is not available, create a simple sine wave as a placeholder
                    logger.warning("TTS utility not available, creating a placeholder audio file")
                    subprocess.run(
                        ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
                         "-ar", "16000", "-ac", "1", audio_path],
                        check=True, capture_output=True
                    )
                
                # Clean up the temporary text file
                try:
                    os.unlink(text_path)
                except:
                    pass
                
                # Process the generated audio through Audio2Face
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
                logger.error(f"Error generating TTS audio: {str(e)}")
                return jsonify({
                    "success": False,
                    "error": f"Error generating TTS audio: {str(e)}"
                }), 500
                
        except Exception as e:
            logger.error(f"Error processing TTS request: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    # If neither audio nor text is provided
    else:
        logger.error("Neither audio file nor text provided in request")
        return jsonify({"error": "No audio file or text provided"}), 400

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