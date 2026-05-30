from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AssetType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"


class PermissionLevel(str, enum.Enum):
    VIEWER = "Viewer"
    EDITOR = "Editor"
    MANAGER = "Manager"


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(Enum(AssetType), nullable=False)

    sha256: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    storage_provider: Mapped[str] = mapped_column(String(32), nullable=False)  # gcs|local
    storage_bucket: Mapped[str] = mapped_column(String(256), nullable=True)
    storage_object_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    storage_url: Mapped[str] = mapped_column(Text, nullable=True)

    latest_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    versions = relationship("AssetVersion", back_populates="asset", cascade="all, delete-orphan")
    tags = relationship("AssetTag", back_populates="asset", cascade="all, delete-orphan")
    permissions = relationship("AssetPermission", back_populates="asset", cascade="all, delete-orphan")
    owner = relationship("User")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "sha256", name="uq_asset_owner_sha256"),
    )


class AssetPermission(Base):
    __tablename__ = "asset_permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    level: Mapped[PermissionLevel] = mapped_column(Enum(PermissionLevel), nullable=False, default=PermissionLevel.VIEWER)

    asset = relationship("Asset", back_populates="permissions")

    __table_args__ = (
        UniqueConstraint("asset_id", "user_id", name="uq_asset_user_permission"),
    )


class PermissionRequestStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class PermissionRequest(Base):
    __tablename__ = "permission_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True, nullable=False)
    requester_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    status: Mapped[PermissionRequestStatus] = mapped_column(Enum(PermissionRequestStatus), default=PermissionRequestStatus.PENDING)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    asset = relationship("Asset")



class AssetVersion(Base):
    __tablename__ = "asset_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)

    storage_provider: Mapped[str] = mapped_column(String(32), nullable=False)
    storage_bucket: Mapped[str] = mapped_column(String(256), nullable=True)
    storage_object_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    storage_url: Mapped[str] = mapped_column(Text, nullable=True)

    sha256: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    note: Mapped[str] = mapped_column(String(1024), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    asset = relationship("Asset", back_populates="versions")

    __table_args__ = (
        UniqueConstraint("asset_id", "version", name="uq_asset_version"),
    )


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)


class AssetTag(Base):
    __tablename__ = "asset_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True, nullable=False)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), index=True, nullable=False)

    source: Mapped[str] = mapped_column(String(32), nullable=False, default="ai")  # ai|user
    confidence: Mapped[str] = mapped_column(String(32), nullable=True)

    asset = relationship("Asset", back_populates="tags")
    tag = relationship("Tag")

    __table_args__ = (
        UniqueConstraint("asset_id", "tag_id", name="uq_asset_tag"),
    )

