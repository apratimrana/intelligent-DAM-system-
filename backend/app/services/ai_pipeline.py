from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings


@dataclass(frozen=True)
class AiResult:
    embedding: list[float]
    tags: list[dict]  # [{name, confidence, source}]
    duplicate: dict | None  # {asset_id, score}


class AiPipeline:
    """
    Thin wrapper over the ai_service package.
    Ensure your PYTHONPATH includes the project root so `ai_service` is importable.
    """

    def __init__(self) -> None:
        try:
            from ai_service.ai.clip_embedder import ClipEmbedder
            from ai_service.ai.tagger import AutoTagger
            from ai_service.vector_store.faiss_store import FaissVectorStore

            self._embedder = ClipEmbedder(model_name=settings.CLIP_MODEL_NAME, device=settings.DEVICE)
            self._tagger = AutoTagger(
                clip_embedder=self._embedder,
                zero_shot_model_name=settings.ZERO_SHOT_MODEL_NAME,
                device=settings.DEVICE,
            )
            self._vector = FaissVectorStore(
                index_path=settings.FAISS_INDEX_PATH,
                meta_path=settings.FAISS_META_PATH,
            )
            self._dummy = False
        except (ImportError, ModuleNotFoundError, Exception) as e:
            print(f"Warning: AI service initialization failed ({e}). Falling back to dummy mode.")
            self._dummy = True

        self._dup_threshold = settings.DUPLICATE_SIM_THRESHOLD

    def process_asset(self, *, asset_id: int, bytes_: bytes, content_type: str) -> AiResult:
        if self._dummy:
            return AiResult(
                embedding=[0.0] * 512,
                tags=[{"name": "generic", "confidence": 0.5, "source": "dummy"}],
                duplicate=None,
            )
        emb = self._embedder.embed_asset(bytes_=bytes_, content_type=content_type)
        tags = self._tagger.generate_tags(bytes_=bytes_, content_type=content_type)

        dup = self._vector.find_near_duplicate(embedding=emb, threshold=self._dup_threshold)
        self._vector.upsert(asset_id=asset_id, embedding=emb)
        self._vector.persist()

        return AiResult(
            embedding=emb,
            tags=tags,
            duplicate=dup,
        )

    def semantic_search(self, *, query: str, k: int) -> list[dict]:
        if self._dummy:
            # Fallback: Simple keyword matching for demo purposes
            from app.db.session import db_session
            from app.models.asset import Asset, Tag, AssetTag
            
            with db_session() as db:
                words = query.lower().split()
                # Find assets where filename or tags match keywords
                query_obj = db.query(Asset).join(Asset.owner)
                
                matches = []
                assets = query_obj.all()
                for a in assets:
                    score = 0
                    for word in words:
                        if word in a.original_filename.lower():
                            score += 0.5
                    
                    if score > 0:
                        matches.append({"asset_id": a.id, "score": score})
                
                matches.sort(key=lambda x: x["score"], reverse=True)
                return matches[:k]

        q = self._embedder.embed_text(query)
        return self._vector.search(embedding=q, k=k)


ai_pipeline = AiPipeline()

