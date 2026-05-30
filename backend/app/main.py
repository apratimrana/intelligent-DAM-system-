import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.core.config import settings
from app.db.session import create_all, init_engine, init_session_factory
from app.api.routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.APP_SECRET_KEY
    app.config["JWT_SECRET_KEY"] = settings.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = settings.JWT_ACCESS_TOKEN_EXPIRES

    cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    JWTManager(app)

    init_engine(settings.DATABASE_URL)
    init_session_factory()
    if os.getenv("AUTO_CREATE_SCHEMA", "true").lower() in ("1", "true", "yes", "y"):
        create_all()

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify(
            {
                "status": "ok",
                "service": "backend",
                "env": os.getenv("FLASK_ENV", "unknown"),
            }
        )

    return app


app = create_app()

