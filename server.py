#!/usr/bin/env python3
"""
Simple Flask server for serving static files for the drone manager POC.
"""
from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/')
def index():
    """Serve the main HTML page."""
    return render_template('index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files."""
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)

