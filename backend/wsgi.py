from app import app, create_tables_and_seed_data

with app.app_context():
    create_tables_and_seed_data()

