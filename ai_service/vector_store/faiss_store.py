from __future__ import annotations

import json
import os

import faiss
import numpy as np


class FaissVectorStore:
    def __init__(self, index_path: str, meta_path: str, dimension: int = 512):
        self.index_path = index_path
        self.meta_path = meta_path
        self.dimension = dimension

        if os.path.exists(index_path):
            try:
                self.index = faiss.read_index(index_path)
            except Exception:
                self.index = faiss.IndexFlatIP(dimension)
        else:
            self.index = faiss.IndexFlatIP(dimension)

        self.metadata: list[dict] = []
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    for line in f:
                        if line.strip():
                            self.metadata.append(json.loads(line))
            except Exception:
                self.metadata = []

    def upsert(self, asset_id: int, embedding: list[float]):
        vec = np.array([embedding], dtype=np.float32)
        # In a real app, we'd check for existing asset_id and replace.
        # Here we append for simplicity as per the pipeline's expected usage.
        self.index.add(vec)
        self.metadata.append({"asset_id": asset_id})

    def find_near_duplicate(self, embedding: list[float], threshold: float) -> dict | None:
        if self.index.ntotal == 0:
            return None
        vec = np.array([embedding], dtype=np.float32)
        D, I = self.index.search(vec, 1)
        score = float(D[0][0])
        idx = int(I[0][0])
        if idx != -1 and score >= threshold:
            return {"asset_id": self.metadata[idx]["asset_id"], "score": score}
        return None

    def search(self, embedding: list[float], k: int) -> list[dict]:
        if self.index.ntotal == 0:
            return []
        vec = np.array([embedding], dtype=np.float32)
        k = min(k, self.index.ntotal)
        D, I = self.index.search(vec, k)
        results = []
        for score, idx in zip(D[0], I[0]):
            if idx != -1:
                results.append({"asset_id": self.metadata[int(idx)]["asset_id"], "score": float(score)})
        return results

    def persist(self):
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        faiss.write_index(self.index, self.index_path)
        with open(self.meta_path, "w") as f:
            for m in self.metadata:
                f.write(json.dumps(m) + "\n")
