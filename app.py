from flask import Flask, request, send_file, render_template, jsonify
import requests
import json
import os
import logging
import mimetypes

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def make_response(status, data, message=None):
    response = {
        "status": status,
        "data": data
    }
    if status == "error" and message:
        response["message"] = message
    return jsonify(response)

@app.route('/')
def index():
    try:
        audio_files = os.listdir('static/audio')
        logging.info(f"Retrieved audio files: {audio_files}")
        return render_template('index.html', audio_files=audio_files)
    except Exception as e:
        return make_response("error", None, f"Error occurred while retrieving audio files: {str(e)}")

@app.route('/synthesize', methods=['POST'])
def synthesize():
    try:
        data = request.get_json()
        text = data['text']
        voice = data.get('voice', 'alloy')
        response_format = data.get('response_format', 'mp3')
        speed = float(data.get('speed', 1))
        model = data.get('model', 'tts-1-hd')
        token = data['token']

        logging.info(f"Received synthesis request: text={text}, voice={voice}, format={response_format}, speed={speed}, model={model}")

        url = "https://api.oaifree.com/v1/audio/speech"
        payload = json.dumps({
            "model": model,
            "input": text,
            "voice": voice,
            "response_format": response_format,
            "speed": speed
        })
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }

        try:
            response = requests.post(url, data=payload, headers=headers, timeout=30)
            response.raise_for_status()
            logging.info(f"API response status: {response.status_code}, reason: {response.reason}")
            logging.info(f"API response headers: {response.headers}")
            data = response.content
        except requests.exceptions.RequestException as e:
            return make_response("error", None, f"Error occurred while sending request: {str(e)}")

        content_type = response.headers.get('Content-Type', 'audio/mpeg')
        file_ext = mimetypes.guess_extension(content_type, strict=False)
        safe_text = ''.join(c for c in text[:10] if c.isalnum() or c == ' ')
        filename = f"{safe_text}_{voice}{file_ext}"

        with open(f"static/audio/{filename}", "wb") as f:
            f.write(data)

        logging.info(f"Synthesis completed. File saved as: {filename}")
        return make_response("success", {"filename": filename})

    except Exception as e:
        return make_response("error", None, f"Error occurred while processing request: {str(e)}")

@app.route('/download/<filename>')
def download(filename):
    logging.info(f"Downloading file: {filename}")
    try:
        return send_file(f"static/audio/{filename}", as_attachment=True)
    except Exception as e:
        return make_response("error", None, f"Error occurred while downloading file: {str(e)}")

@app.route('/delete/<filename>', methods=['DELETE'])
def delete(filename):
    try:
        os.remove(f"static/audio/{filename}")
        logging.info(f"Deleted file: {filename}")
        return make_response("success", {"message": "文件删除成功"})
    except Exception as e:
        return make_response("error", None, f"Error occurred while deleting file: {str(e)}")

@app.route('/audio-list')
def audio_list():
    audio_files = os.listdir('static/audio')
    return make_response("success", audio_files)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=15432, debug=False)