#!/usr/bin/env python3
import os
import subprocess
import uuid
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configuration
A2F_SCRIPT = "/path/to/Audio2Face-3D-Samples/scripts/audio2face_3d_microservices_interaction_app/a2f_3d.py"
CONFIG_DIR = "/path/to/Audio2Face-3D-Samples/scripts/audio2face_3d_api_client/config"
TEMP_DIR = "/tmp/a2f_processing"
MODEL_CONFIGS = {
    "claire": "config_claire.yml",
    "mark": "config_mark.yml",
    "james": "config_james.yml"
}

def process_audio(audio_path, model):
    try:
        # Generate output directory
        output_dir = os.path.join(TEMP_DIR, str(uuid.uuid4()))
        os.makedirs(output_dir, exist_ok=True)

        # Build A2F command
        cmd = [
            "python3", A2F_SCRIPT,
            "run_inference",
            audio_path,
            os.path.join(CONFIG_DIR, MODEL_CONFIGS[model]),
            "-u", "localhost:52000",
            "--output-dir", output_dir
        ]

        # Execute Audio2Face
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True
        )

        # Find generated files
        animation_file = os.path.join(output_dir, "animation_frames.csv")
        if not os.path.exists(animation_file):
            raise FileNotFoundError("Animation output not generated")

        return animation_file

    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"A2F processing failed: {e.stderr}")

@app.route('/generate', methods=['POST'])
def generate_animation():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    model = request.form.get('model', 'claire')

    try:
        # Save uploaded file
        audio_path = os.path.join(TEMP_DIR, secure_filename(audio_file.filename))
        audio_file.save(audio_path)

        # Process through Audio2Face
        animation_file = process_audio(audio_path, model)

        return jsonify({
            "animation_url": f"/download/{os.path.basename(animation_file)}",
            "audio_url": f"/download/{os.path.basename(audio_path)}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    return send_file(os.path.join(TEMP_DIR, filename))

if __name__ == '__main__':
    os.makedirs(TEMP_DIR, exist_ok=True)
    app.run(host='0.0.0.0', port=5000)