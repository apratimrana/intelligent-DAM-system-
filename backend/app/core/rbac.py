from __future__ import annotations

from functools import wraps
from typing import Callable, TypeVar

from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from sqlalchemy import or_, and_, exists, true
from sqlalchemy.orm import Session

from app.models.user import UserRole
from app.models.asset import Asset, AssetPermission, PermissionRequest, PermissionRequestStatus


F = TypeVar("F", bound=Callable)


def require_roles(*roles: str) -> Callable[[F], F]:
    def decorator(fn: F) -> F:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role not in roles:
                return jsonify({"error": "forbidden", "required_roles": list(roles)}), 403
            return fn(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator


def get_asset_visibility_filter(user_id: int, user_role: str):
    """
    Returns a SQLAlchemy filter for assets based on user role and permissions.
    """
    # 1. User can see their own assets
    own_assets = Asset.owner_user_id == user_id
    
    # 2. User can see assets where they have explicit permission
    has_permission = exists().where(
        and_(
            AssetPermission.asset_id == Asset.id,
            AssetPermission.user_id == user_id
        )
    )

    if user_role == UserRole.ADMIN:
        # Admin can see EVERYTHING (but content access is restricted later)
        return true()
    
    if user_role == UserRole.MANAGER:
        # Manager can see all NON-HIDDEN assets OR their own/permitted assets
        return or_(
            own_assets,
            has_permission,
            Asset.is_hidden == False
        )
    
    # Regular User: only own or permitted
    return or_(
        own_assets,
        has_permission
    )


def can_access_asset_content(db: Session, asset: Asset, user_id: int, user_role: str) -> bool:
    """
    Checks if a user can access the actual content (download/view) of an asset.
    """
    # Owner always has access
    if asset.owner_user_id == user_id:
        return True
    
    # Check for explicit permission
    permission = db.query(AssetPermission).filter(
        AssetPermission.asset_id == asset.id,
        AssetPermission.user_id == user_id
    ).first()
    if permission:
        return True

    if user_role == UserRole.ADMIN:
        # Admin can access non-hidden data
        if not asset.is_hidden:
            return True
        # For hidden data, Admin needs an approved permission request
        req = db.query(PermissionRequest).filter(
            PermissionRequest.asset_id == asset.id,
            PermissionRequest.requester_user_id == user_id,
            PermissionRequest.status == PermissionRequestStatus.APPROVED
        ).first()
        return req is not None
    
    if user_role == UserRole.MANAGER:
        # Manager can access non-hidden data
        return not asset.is_hidden
    
    return False


def get_user_content_right(db: Session, asset: Asset, user_id: int, user_role: str) -> str | None:
    """
    Returns the highest content right a user has for an asset.
    Returns: "Manager", "Editor", "Viewer", or None.
    """
    if asset.owner_user_id == user_id or user_role == UserRole.ADMIN:
        return "Manager"
    
    permission = db.query(AssetPermission).filter(
        AssetPermission.asset_id == asset.id,
        AssetPermission.user_id == user_id
    ).first()
    
    if permission:
        return permission.level.value
    
    if user_role == UserRole.MANAGER and not asset.is_hidden:
        return "Viewer"
    
    return None



