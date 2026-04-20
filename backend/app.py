import os
import sys

# Ensure package imports work when running app.py from the backend directory
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)


def load_env_file(env_path, override=True):
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()

            if not key:
                continue

            if not override and key in os.environ:
                continue

            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]

            os.environ[key] = value


load_env_file(os.path.join(root_dir, ".env"), override=True)

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from backend.routes import register_routes
from backend.models import db


def initialize_database(app):
    with app.app_context():
        db.create_all()
        # Migrate: add category column if this is an older database
        from sqlalchemy import text
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE inventory_items ADD COLUMN category VARCHAR(128)"))
                conn.commit()
        except Exception:
            pass  # Column already exists

        migration_statements = [
            "ALTER TABLE inventory_items ADD COLUMN order_status VARCHAR(32) DEFAULT 'in_stock'",
            "ALTER TABLE inventory_items ADD COLUMN in_process_quantity FLOAT DEFAULT 0",
            "ALTER TABLE inventory_items ADD COLUMN ordered_at DATETIME",
            "ALTER TABLE inventory_items ADD COLUMN received_at DATETIME",
            "ALTER TABLE inventory_items ADD COLUMN vendor VARCHAR(128)",
            "ALTER TABLE inventory_items ADD COLUMN requested_by VARCHAR(128)",
            "ALTER TABLE inventory_items ADD COLUMN lab_name VARCHAR(128)",
            "ALTER TABLE users ADD COLUMN group_id INTEGER",
        ]
        for statement in migration_statements:
            try:
                with db.engine.connect() as conn:
                    conn.execute(text(statement))
                    conn.commit()
            except Exception:
                pass  # Column already exists


def create_app():
    frontend_build_dir = os.path.join(root_dir, "frontend", "build")
    database_uri = os.environ.get("DATABASE_URL")
    if not database_uri:
        default_db_path = os.path.join(root_dir, "instance", "lab_manager.db")
        os.makedirs(os.path.dirname(default_db_path), exist_ok=True)
        database_uri = f"sqlite:///{default_db_path}"

    app = Flask(__name__, static_folder=frontend_build_dir, static_url_path="")
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=database_uri,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JSON_SORT_KEYS=False,
    )
    CORS(app)
    db.init_app(app)
    register_routes(app)

    if os.path.isdir(frontend_build_dir):
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            if path.startswith("api/"):
                return jsonify({"error": "Not found"}), 404

            asset_path = os.path.join(frontend_build_dir, path)
            if path and os.path.exists(asset_path):
                return send_from_directory(frontend_build_dir, path)
            return send_from_directory(frontend_build_dir, "index.html")

    return app


if __name__ == "__main__":
    app = create_app()
    initialize_database(app)

    # Allow custom port via CLI argument or environment variable
    port = 5003
    if len(sys.argv) > 1:
        try:
            # Handle both "python app.py 5001" and "python app.py --port 5001"
            if sys.argv[1] == "--port" and len(sys.argv) > 2:
                port = int(sys.argv[2])
            else:
                port = int(sys.argv[1])
        except (ValueError, IndexError):
            pass
    port = int(os.environ.get("PORT", port))

    app.run(host="0.0.0.0", port=port, debug=False)
