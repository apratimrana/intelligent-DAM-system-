from __future__ import annotations

import io

import numpy as np
from PIL import Image
from transformers import pipeline

from ai_service.ai.clip_embedder import ClipEmbedder


DEFAULT_CANDIDATE_TAGS = [
    "invoice",
    "receipt",
    "contract",
    "presentation",
    "spreadsheet",
    "report",
    "resume",
    "id card",
    "screenshot",
    "diagram",
    "chart",
    "photo",
    "portrait",
    "landscape",
    "logo",
    "product",
    "food",
    "vehicle",
    "building",
    "animal",
    "sports",
    "nature",
    "meeting",
    "code",
    "document",
    "video",
]


class AutoTagger:
    def __init__(
        self,
        *,
        clip_embedder: ClipEmbedder,
        zero_shot_model_name: str,
        device: str = "cpu",
        candidate_tags: list[str] | None = None,
    ) -> None:
        self._clip = clip_embedder
        self._candidate_tags = candidate_tags or list(DEFAULT_CANDIDATE_TAGS)

        # Transformers pipeline device: -1 cpu, 0.. cuda
        pipe_device = -1 if device == "cpu" else 0
        self._zero_shot = pipeline("zero-shot-classification", model=zero_shot_model_name, device=pipe_device)

    def generate_tags(self, *, bytes_: bytes, content_type: str) -> list[dict]:
        ct = (content_type or "").lower()
        if ct.startswith("image/") or ct.startswith("video/"):
            return self._tags_for_visual(bytes_=bytes_, content_type=ct)
        return self._tags_for_text(bytes_=bytes_, content_type=ct)

    def _tags_for_visual(self, *, bytes_: bytes, content_type: str) -> list[dict]:
        # For videos, ClipEmbedder already uses first frame; use embeddings directly here as well
        if content_type.startswith("image/"):
            img = Image.open(io.BytesIO(bytes_)).convert("RGB")
            image_vec = np.array(self._clip.embed_image(img), dtype=np.float32)
        else:
            image_vec = np.array(self._clip.embed_asset(bytes_=bytes_, content_type=content_type), dtype=np.float32)

        prompts = [f"a photo of {t}" for t in self._candidate_tags]
        text_vecs = np.array([self._clip.embed_text(p) for p in prompts], dtype=np.float32)
        sims = text_vecs @ image_vec  # cosine since both normalized
        top_idx = sims.argsort()[-5:][::-1]
        out: list[dict] = []
        for i in top_idx:
            out.append({"name": self._candidate_tags[int(i)], "confidence": float(sims[int(i)]), "source": "ai"})
        return out

    def _tags_for_text(self, *, bytes_: bytes, content_type: str) -> list[dict]:
        text = self._extract_text(bytes_=bytes_, content_type=content_type)
        if not text.strip():
            return [{"name": "document", "confidence": 0.5, "source": "ai"}]

        res = self._zero_shot(text[:4_000], candidate_labels=self._candidate_tags, multi_label=True)
        labels = res.get("labels") or []
        scores = res.get("scores") or []
        pairs = list(zip(labels, scores))[:5]
        return [{"name": str(l).lower(), "confidence": float(s), "source": "ai"} for (l, s) in pairs]

    def _extract_text(self, *, bytes_: bytes, content_type: str) -> str:
        # Delegate to ClipEmbedder's logic for consistency
        try:
            return self._clip._extract_text(bytes_=bytes_, content_type=content_type)  # type: ignore[attr-defined]
        except Exception:
            try:
                return bytes_.decode("utf-8", errors="ignore")
            except Exception:
                return ""

