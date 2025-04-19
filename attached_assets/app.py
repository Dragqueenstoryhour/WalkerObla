import azure.cognitiveservices.speech as speechsdk
import sounddevice as sd
import numpy as np
import os
import json
import threading
from flask import Flask, render_template, request, jsonify
from scipy.io.wavfile import write
import random

app = Flask(__name__)

# Configuration
SPEECH_KEY = os.getenv('AZURE_SPEECH_KEY', 'dfeb3024afa5488aafaf07da48da44cf')
SERVICE_REGION = os.getenv('AZURE_SPEECH_REGION', 'westus2')
FS = 16000  # Sample rate
AUDIO_FILE = os.path.join(os.path.dirname(__file__), "recording.wav")

# Sample sentences for practice
PRACTICE_SENTENCES = [
    "The quick brown fox jumps over the lazy dog.",
    "She sells seashells by the seashore.",
    "How much wood would a woodchuck chuck?",
    "Peter Piper picked a peck of pickled peppers.",
    "All that glitters is not gold.",
    "A journey of a thousand miles begins with a single step.",
    "Practice makes perfect.",
    "The early bird catches the worm.",
    "Actions speak louder than words.",
    "Where there's a will, there's a way."
]

class AudioRecorder:
    def __init__(self):
        self.recording = False
        self.audio_data = []
        self.stream = None
        self.lock = threading.Lock()

    def start(self):
        with self.lock:
            if self.recording:
                return
            
            self.recording = True
            self.audio_data = []
            
            def callback(indata, frames, time, status):
                if self.recording:
                    self.audio_data.append(indata.copy())

            self.stream = sd.InputStream(
                samplerate=FS,
                channels=1,
                dtype='float32',
                callback=callback,
                blocksize=int(FS * 0.5)  # Added missing parenthesis here
            )
            self.stream.start()

    def stop(self):
        with self.lock:
            if not self.recording:
                return None
                
            self.recording = False
            if self.stream:
                self.stream.stop()
                self.stream.close()
                self.stream = None
            
            if not self.audio_data:
                return None
                
            try:
                audio_array = np.concatenate(self.audio_data)
                audio_array = (audio_array * 32767).astype(np.int16)
                write(AUDIO_FILE, FS, audio_array)
                return AUDIO_FILE
            except Exception as e:
                print(f"Save error: {str(e)}")
                return None

recorder = AudioRecorder()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/record/start', methods=['POST'])
def start_recording():
    try:
        recorder.start()
        return jsonify({"status": "recording started"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/record/stop', methods=['POST'])
def stop_recording():
    try:
        audio_path = recorder.stop()
        if not audio_path:
            return jsonify({"error": "No audio recorded"}), 400
        return jsonify({"status": "recording stopped", "file": audio_path})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/assess', methods=['POST'])
def assess():
    try:
        if not os.path.exists(AUDIO_FILE):
            return jsonify({"error": "No recording found"}), 400

        reference_text = request.json.get('text', '').strip()
        if not reference_text:
            return jsonify({"error": "No text provided"}), 400

        speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SERVICE_REGION)
        audio_config = speechsdk.audio.AudioConfig(filename=AUDIO_FILE)
        
        pronunciation_config = speechsdk.PronunciationAssessmentConfig(
            reference_text=reference_text,
            grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
            granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
            enable_miscue=True
        )

        recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config,
            language="en-US"
        )
        pronunciation_config.apply_to(recognizer)

        result = recognizer.recognize_once()
        
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            json_result = json.loads(result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult))
            print("Azure Response:", json.dumps(json_result, indent=2))  # Debug log
            
            if not json_result.get('NBest'):
                return jsonify({"error": "No assessment results"}), 400
                
            best = json_result['NBest'][0]
            response_data = {
                "success": True,
                "score": float(best['PronunciationAssessment']['PronScore']),
                "text": best['Display'],
                "details": {
                    "accuracy": float(best['PronunciationAssessment']['AccuracyScore']),
                    "fluency": float(best['PronunciationAssessment']['FluencyScore']),
                    "completeness": float(best['PronunciationAssessment']['CompletenessScore'])
                }
            }
            print("Sending response:", json.dumps(response_data, indent=2))  # Debug log
            return jsonify(response_data)
        else:
            error_response = {
                "success": False,
                "error": "Assessment failed",
                "details": result.reason.name
            }
            print("Error response:", json.dumps(error_response, indent=2))  # Debug log
            return jsonify(error_response), 400
            
    except Exception as e:
        error_response = {
            "success": False,
            "error": "Processing error",
            "details": str(e)
        }
        print("Exception:", str(e))  # Debug log
        return jsonify(error_response), 500

@app.route('/random-sentence')
def random_sentence():
    sentence = random.choice(PRACTICE_SENTENCES)
    return jsonify({"sentence": sentence})

if __name__ == '__main__':
    os.makedirs(os.path.dirname(AUDIO_FILE), exist_ok=True)
    app.run(port=3000, debug=True)