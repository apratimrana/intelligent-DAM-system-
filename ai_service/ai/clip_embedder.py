from __future__ import annotations

import io
import os
import tempfile
from typing import Any

import numpy as np
import torch
from PIL import Image
from pypdf import PdfReader
from transformers import CLIPModel, CLIPProcessor


def _normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v) + 1e-12
    return (v / n).astype(np.float32)


class ClipEmbedder:
    def __init__(self, model_name: str, device: str = "cpu") -> None:
        self.device = torch.device(device)
        self.processor = CLIPProcessor.from_pretrained(model_name)
        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.model.eval()

    @torch.inference_mode()
    def embed_text(self, text: str) -> list[float]:
        inputs = self.processor(text=[text], return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        feats = self.model.get_text_features(**inputs)  # (1, d)
        vec = feats[0].detach().cpu().float().numpy()
        return _normalize(vec).tolist()

    @torch.inference_mode()
    def embed_image(self, pil_image: Image.Image) -> list[float]:
        inputs = self.processor(images=[pil_image], return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        feats = self.model.get_image_features(**inputs)  # (1, d)
        vec = feats[0].detach().cpu().float().numpy()
        return _normalize(vec).tolist()

    def embed_asset(self, *, bytes_: bytes, content_type: str) -> list[float]:
        ct = (content_type or "").lower()
        if ct.startswith("image/"):
            img = Image.open(io.BytesIO(bytes_)).convert("RGB")
            return self.embed_image(img)

        if ct.startswith("video/"):
            return self._embed_video_first_frame(bytes_)

        # Document or unknown: embed extracted text
        text = self._extract_text(bytes_=bytes_, content_type=ct)
        if not text.strip():
            text = "empty document"
        return self.embed_text(text[:10_000])

    def _embed_video_first_frame(self, bytes_: bytes) -> list[float]:
        # OpenCV needs a filename for most containers
        import cv2  # local import to keep import cost low

        with tempfile.NamedTemporaryFile(suffix=".video", delete=False) as tmp:
            tmp.write(bytes_)
            tmp_path = tmp.name

        try:
            cap = cv2.VideoCapture(tmp_path)
            ok, frame = cap.read()
            cap.release()
            if not ok or frame is None:
                return self.embed_text("unreadable video")
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(frame)
            return self.embed_image(img)
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    def _extract_text(self, *, bytes_: bytes, content_type: str) -> str:
        if "pdf" in content_type:
            try:
                reader = PdfReader(io.BytesIO(bytes_))
                parts: list[str] = []
                for page in reader.pages[:20]:
                    parts.append(page.extract_text() or "")
                return "\n".join(parts)
            except Exception:
                return ""

        # Best-effort for txt/csv/json/etc.
        try:
            return bytes_.decode("utf-8", errors="ignore")
        except Exception:
            return ""

