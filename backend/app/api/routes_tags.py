from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.db.session import db_session
from app.models.asset import Tag


tags_bp = Blueprint("tags", __name__)


@tags_bp.get("")
@jwt_required()
def list_tags():
    with db_session() as db:
        tags = db.query(Tag).order_by(Tag.name.asc()).limit(2000).all()
        return jsonify([{"id": t.id, "name": t.name} for t in tags])

