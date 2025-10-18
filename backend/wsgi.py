# backend/wsgi.py
# Import the Flask app object from backend/app.py
from backend.app import app

if __name__ == "__main__":
    app.run()