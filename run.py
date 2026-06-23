"""
AcuSight AI — FastAPI Backend Entry Point
Run with: python run.py   OR   uvicorn run:app --reload
"""
import os
import sys

# Add the project root to path so 'backend.app' resolves correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Ensure static directories exist before app starts
os.makedirs("static/uploads/original", exist_ok=True)
os.makedirs("static/uploads/heatmap", exist_ok=True)
os.makedirs("static/uploads/reports", exist_ok=True)

from backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("run:app", host="0.0.0.0", port=8000, reload=True)
