-- PostgreSQL schema for Intelligent DAM

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('Admin', 'User');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assettype') THEN
        CREATE TYPE assettype AS ENUM ('image', 'video', 'document');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role userrole NOT NULL DEFAULT 'User',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id),
  original_filename VARCHAR(512) NOT NULL,
  content_type VARCHAR(128) NOT NULL,
  asset_type assettype NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_provider VARCHAR(32) NOT NULL,
  storage_bucket VARCHAR(256),
  storage_object_key VARCHAR(1024) NOT NULL,
  storage_url TEXT,
  latest_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_asset_owner_sha256 UNIQUE(owner_user_id, sha256)
);

CREATE INDEX IF NOT EXISTS ix_assets_owner_user_id ON assets(owner_user_id);
CREATE INDEX IF NOT EXISTS ix_assets_sha256 ON assets(sha256);

CREATE TABLE IF NOT EXISTS asset_versions (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storage_provider VARCHAR(32) NOT NULL,
  storage_bucket VARCHAR(256),
  storage_object_key VARCHAR(1024) NOT NULL,
  storage_url TEXT,
  sha256 VARCHAR(64) NOT NULL,
  size_bytes BIGINT NOT NULL,
  note VARCHAR(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_asset_version UNIQUE(asset_id, version)
);

CREATE INDEX IF NOT EXISTS ix_asset_versions_asset_id ON asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS ix_asset_versions_sha256 ON asset_versions(sha256);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_tags_name ON tags(name);

CREATE TABLE IF NOT EXISTS asset_tags (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  source VARCHAR(32) NOT NULL DEFAULT 'ai',
  confidence VARCHAR(32),
  CONSTRAINT uq_asset_tag UNIQUE(asset_id, tag_id)
);

CREATE INDEX IF NOT EXISTS ix_asset_tags_asset_id ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS ix_asset_tags_tag_id ON asset_tags(tag_id);

