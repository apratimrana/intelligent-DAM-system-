from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.db.session import db_session
from app.models.asset import Asset
from app.services.ai_pipeline import ai_pipeline


search_bp = Blueprint("search", __name__)


@search_bp.post("/semantic")
@jwt_required()
def semantic_search():
    payload = request.get_json(force=True, silent=True) or {}
    query = (payload.get("query") or "").strip()
    k = int(payload.get("k") or 10)
    k = max(1, min(k, 50))

    if not query:
        return jsonify({"error": "query_required"}), 400

    results = ai_pipeline.semantic_search(query=query, k=k)
    ids = [int(r["asset_id"]) for r in results if "asset_id" in r]

    with db_session() as db:
        assets = db.query(Asset).filter(Asset.id.in_(ids)).all() if ids else []
        by_id = {a.id: a for a in assets}

    payload_out = []
    for r in results:
        aid = int(r["asset_id"])
        a = by_id.get(aid)
        if not a:
            continue
        payload_out.append(
            {
                "asset": {
                    "id": a.id,
                    "original_filename": a.original_filename,
                    "content_type": a.content_type,
                    "asset_type": a.asset_type.value,
                    "size_bytes": a.size_bytes,
                    "storage_url": a.storage_url,
                    "latest_version": a.latest_version,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                },
                "score": r.get("score"),
            }
        )
    return jsonify(payload_out)

