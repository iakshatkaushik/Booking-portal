# backend/wsgi.py
# Import the Flask app object from app.py (since root is backend)
from app import app, create_tables_and_seed_data

# Ensure DB/tables/seeding run when the WSGI module is imported by gunicorn
with app.app_context():
    create_tables_and_seed_data()

# `app` is now ready for gunicorn: `gunicorn wsgi:app`
