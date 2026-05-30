from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.core.config import settings
from app.db.session import db_session
from app.models.user import User, UserRole
from app.utils.security import hash_password, verify_password


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    payload = request.get_json(force=True, silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    role = payload.get("role") or UserRole.USER.value
    access_key = payload.get("access_key") or ""

    if not email or not password:
        return jsonify({"error": "email_and_password_required"}), 400
    
    # Check if role is valid
    try:
        user_role = UserRole(role)
    except ValueError:
        return jsonify({"error": "invalid_role"}), 400

    # Restrict Admin/Manager roles with an access key
    if user_role in (UserRole.ADMIN, UserRole.MANAGER):
        if access_key != settings.ADMIN_ACCESS_KEY:
            return jsonify({"error": "forbidden", "message": "Special access key required for Admin/Manager signup"}), 403

    with db_session() as db:
        existing = db.query(User).filter(User.email == email).one_or_none()
        if existing:
            return jsonify({"error": "email_already_registered"}), 409

        user = User(email=email, password_hash=hash_password(password), role=UserRole(role))
        db.add(user)
        db.flush()

        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value, "email": user.email},
        )
        return jsonify(
            {
                "access_token": token,
                "user": {"id": user.id, "email": user.email, "role": user.role.value},
            }
        )


@auth_bp.post("/login")
def login():
    payload = request.get_json(force=True, silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email_and_password_required"}), 400

    with db_session() as db:
        user = db.query(User).filter(User.email == email).one_or_none()
        if not user or not verify_password(password, user.password_hash):
            return jsonify({"error": "invalid_credentials"}), 401

        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value, "email": user.email},
        )
        return jsonify(
            {
                "access_token": token,
                "user": {"id": user.id, "email": user.email, "role": user.role.value},
            }
        )


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    with db_session() as db:
        user = db.query(User).filter(User.id == user_id).one_or_none()
        if not user:
            return jsonify({"error": "not_found"}), 404
        return jsonify({"id": user.id, "email": user.email, "role": user.role.value})

