import api from "./auth";

export async function listAssets(params = {}) {
  const res = await api.get("/assets", { params });
  return res.data;
}

export async function getAsset(id) {
  const res = await api.get(`/assets/${id}`);
  return res.data;
}

export async function uploadAsset(file, isHidden = false) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("is_hidden", isHidden);
  const res = await api.post("/assets/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

export async function listAssetPermissions(assetId) {
  const res = await api.get(`/assets/${assetId}/permissions`);
  return res.data;
}

export async function addAssetPermission(assetId, email, level) {
  const res = await api.post(`/assets/${assetId}/permissions`, { email, level });
  return res.data;
}

export async function requestPermission(assetId) {
  const res = await api.post(`/assets/${assetId}/permission-request`);
  return res.data;
}

export async function listPermissionRequests() {
  const res = await api.get("/assets/permission-requests");
  return res.data;
}

export async function handlePermissionRequest(requestId, action) {
  const res = await api.post(`/assets/permission-requests/${requestId}/handle`, { action });
  return res.data;
}


export async function listVersions(assetId) {
  const res = await api.get(`/assets/${assetId}/versions`);
  return res.data;
}

export async function newVersion(assetId, file, note = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("note", note);
  const res = await api.post(`/assets/${assetId}/versions`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

export async function addTag(assetId, name) {
  const res = await api.post(`/assets/${assetId}/tags`, { name });
  return res.data;
}

export async function removeTag(assetId, name) {
  const res = await api.delete(`/assets/${assetId}/tags/${name}`);
  return res.data;
}

export async function deleteAsset(id) {
  const res = await api.delete(`/assets/${id}`);
  return res.data;
}

export async function semanticSearch(query, k = 10) {
  const res = await api.post("/search/semantic", { query, k });
  return res.data;
}

export async function getSimilarAssets(assetId) {
  const res = await api.get(`/assets/${assetId}/similar`);
  return res.data;
}
