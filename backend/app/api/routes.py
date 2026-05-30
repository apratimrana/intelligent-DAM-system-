from flask import Blueprint

from app.api.routes_auth import auth_bp
from app.api.routes_assets import assets_bp
from app.api.routes_search import search_bp
from app.api.routes_tags import tags_bp


api_bp = Blueprint("api", __name__)

api_bp.register_blueprint(auth_bp, url_prefix="/auth")
api_bp.register_blueprint(assets_bp, url_prefix="/assets")
api_bp.register_blueprint(search_bp, url_prefix="/search")
api_bp.register_blueprint(tags_bp, url_prefix="/tags")

