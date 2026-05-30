import { useEffect, useMemo, useState } from "react";
import {
  addTag,
  getAsset,
  listAssets,
  listVersions,
  newVersion,
  semanticSearch,
  uploadAsset,
  deleteAsset,
  removeTag,
  addAssetPermission,
  handlePermissionRequest,
  listAssetPermissions,
  listPermissionRequests,
  requestPermission,
  getSimilarAssets,
} from "../api/assets";
import { listTags } from "../api/tags";
import { Button } from "../components/Button.jsx";
import { Card } from "../components/Card.jsx";
import { Input } from "../components/Input.jsx";
import { Modal } from "../components/Modal.jsx";

function fmtBytes(n) {
  if (n == null) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = Number(n);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function DashboardPage({ user, onLogout }) {
  const [assets, setAssets] = useState([]);
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [semanticQ, setSemanticQ] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadIsHidden, setUploadIsHidden] = useState(false);
  const [lastUploadInfo, setLastUploadInfo] = useState(null);
  const [permRequests, setPermRequests] = useState([]);
  const [permEmail, setPermEmail] = useState("");
  const [permLevel, setPermLevel] = useState("Viewer");
  const [assetPermissions, setAssetPermissions] = useState([]);
  const [similarAssets, setSimilarAssets] = useState([]);

  const canSeePublicUrl = useMemo(() => true, []);

  const stats = useMemo(() => {
    return {
      count: assets.length,
      totalSize: assets.reduce((acc, a) => acc + (a.size_bytes || 0), 0),
    };
  }, [assets]);

  async function refresh() {
    setError("");
    try {
      const [a, t, pr] = await Promise.all([
        listAssets({ q, tag: tagFilter, type: typeFilter }),
        listTags(),
        listPermissionRequests(),
      ]);
      setAssets(a);
      setTags(t);
      setPermRequests(pr);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "failed_to_load");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => refresh(), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tagFilter, typeFilter]);

  async function handlePermission(reqId, action) {
    setBusy(true);
    setError("");
    try {
      await handlePermissionRequest(reqId, action);
      await refresh();
      if (selectedId) await openAsset(selectedId);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "failed_to_handle_request");
    } finally {
      setBusy(false);
    }
  }

  async function grantPermission() {
    if (!selectedId || !permEmail) return;
    setBusy(true);
    setError("");
    try {
      await addAssetPermission(selectedId, permEmail, permLevel);
      const p = await listAssetPermissions(selectedId);
      setAssetPermissions(p);
      setPermEmail("");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "failed_to_grant_permission");
    } finally {
      setBusy(false);
    }
  }

  async function doRequestPermission() {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      await requestPermission(selectedId);
      await refresh();
      await openAsset(selectedId);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "failed_to_request_permission");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file) {
    setUploading(true);
    setError("");
    setLastUploadInfo(null);
    try {
      const res = await uploadAsset(file, uploadIsHidden);
      setLastUploadInfo(res);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "upload_failed");
    } finally {
      setUploading(false);
    }
  }

  async function doSemanticSearch() {
    setBusy(true);
    setError("");
    try {
      const res = await semanticSearch(semanticQ, 15);
      setAssets(res.map((r) => ({ ...r.asset, _score: r.score })));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "semantic_search_failed");
    } finally {
      setBusy(false);
    }
  }

  async function doFindSimilar() {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      const res = await getSimilarAssets(selectedId);
      setSimilarAssets(res);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "find_similar_failed");
    } finally {
      setBusy(false);
    }
  }

  async function openAsset(id) {
    setSelectedId(id);
    setSelected(null);
    setSelectedVersions([]);
    setAssetPermissions([]);
    setSimilarAssets([]);
    setTagInput("");
    setPermEmail("");
    try {
      const [a, v, p] = await Promise.all([
        getAsset(id),
        listVersions(id),
        listAssetPermissions(id).catch(() => []),
      ]);
      setSelected(a);
      setSelectedVersions(v);
      setAssetPermissions(p);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "failed_to_load_asset");
    }
  }

  async function addUserTag() {
    if (!selectedId) return;
    const name = tagInput.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      await addTag(selectedId, name);
      const a = await getAsset(selectedId);
      setSelected(a);
      setTagInput("");
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "add_tag_failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadNewVersion(file) {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      await newVersion(selectedId, file, "Updated via dashboard");
      const [a, v] = await Promise.all([getAsset(selectedId), listVersions(selectedId)]);
      setSelected(a);
      setSelectedVersions(v);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "new_version_failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveTag(tagName) {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      await removeTag(selectedId, tagName);
      const a = await getAsset(selectedId);
      setSelected(a);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "remove_tag_failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    setBusy(true);
    setError("");
    try {
      await deleteAsset(selectedId);
      setSelectedId(null);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "delete_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <div className="text-sm text-slate-400">
            Upload assets to manage them efficiently
          </div>
          <div className="hidden h-4 w-px bg-slate-800 md:block"></div>
          <div className="flex gap-4 text-xs font-medium uppercase tracking-wider text-slate-500">
            <div>
              <span className="text-slate-300">{stats.count}</span> Assets
            </div>
            <div>
              <span className="text-slate-300">{fmtBytes(stats.totalSize)}</span> Used
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={refresh} disabled={busy || uploading}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <div className="mb-3 text-sm font-semibold">Upload</div>
          <input
            type="file"
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-100 hover:file:bg-slate-700"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
            disabled={uploading}
          />
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_hidden"
              checked={uploadIsHidden}
              onChange={(e) => setUploadIsHidden(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="is_hidden" className="text-xs text-slate-400 cursor-pointer">
              Mark as Hidden (Personal)
            </label>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Supports images, videos, PDFs, and text-like documents.
          </div>
          {lastUploadInfo ? (
            <div className="mt-4 rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
              <div className="font-semibold text-slate-200">Upload result</div>
              <div className="mt-2">
                Asset #{lastUploadInfo.asset?.id} •{" "}
                <span className="text-slate-400">{lastUploadInfo.asset?.asset_type}</span>
              </div>
              <div className="mt-2 text-slate-500">Asset successfully uploaded.</div>
            </div>
          ) : null}
          
          {permRequests.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Permission Requests
              </div>
              <div className="space-y-2">
                {permRequests.map(r => (
                  <div key={r.id} className="rounded-md border border-slate-800 bg-slate-900/40 p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-medium">{r.asset_name}</span>
                      <span className={`text-[10px] uppercase font-bold ${r.status === 'Pending' ? 'text-amber-500' : r.status === 'Approved' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {r.status}
                      </span>
                    </div>
                    {user?.role !== 'Admin' && r.status === 'Pending' && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => handlePermission(r.id, 'approve')} className="text-emerald-400 hover:text-emerald-300">Approve</button>
                        <button onClick={() => handlePermission(r.id, 'reject')} className="text-rose-400 hover:text-rose-300">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">Search & filter</div>
            <div className="text-xs text-slate-500">
              User: <span className="text-slate-300">{user?.email}</span>
            </div>
          </div>

      <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-slate-400">Filename contains</div>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="report, invoice…" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-400">File type</div>
              <select
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Tag</div>
              <select
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="">All Tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
            <div className="grid grid-cols-12 bg-slate-900/60 px-3 py-2 text-xs uppercase tracking-wider text-slate-400">
              <div className="col-span-4">Asset</div>
              <div className="col-span-2">Owner</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Created</div>
            </div>
            <div className="divide-y divide-slate-800">
              {assets.length === 0 ? (
                <div className="px-3 py-6 text-sm text-slate-500">No assets yet. Upload one.</div>
              ) : (
                assets.map((a) => (
                  <button
                    key={a.id}
                    className="grid w-full grid-cols-12 px-3 py-3 text-left text-sm hover:bg-slate-900/40"
                    onClick={() => openAsset(a.id)}
                  >
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-100 truncate">{a.original_filename}</div>
                        {a.is_hidden && (
                          <span className="rounded bg-rose-900/30 px-1 py-0.5 text-[10px] font-bold text-rose-400 uppercase">Hidden</span>
                        )}
                      </div>
                      {a._score != null ? (
                        <div className="text-xs text-slate-500">
                          Similarity: {Number(a._score).toFixed(3)}
                        </div>
                      ) : null}
                    </div>
                    <div className="col-span-2 text-slate-400 truncate">{a.owner_email}</div>
                    <div className="col-span-2 text-slate-300">{a.asset_type}</div>
                    <div className="col-span-2 text-slate-300">{fmtBytes(a.size_bytes)}</div>
                    <div className="col-span-2 text-slate-500 text-xs">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : "-"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(selectedId)}
        title={selected ? `Asset #${selected.id}` : "Asset"}
        onClose={() => setSelectedId(null)}
      >
        {!selected ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="grid gap-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">Details</div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>
                  <span className="text-slate-500">Filename:</span>{" "}
                  <span className="text-slate-100">{selected.original_filename}</span>
                </div>
                <div>
                  <span className="text-slate-500">Type:</span>{" "}
                  <span className="text-slate-100">{selected.asset_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Size:</span>{" "}
                  <span className="text-slate-100">{fmtBytes(selected.size_bytes)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Owner:</span>{" "}
                  <span className="text-slate-100">{selected.owner_email}</span>
                </div>
                {selected.is_hidden && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Visibility:</span>
                    <span className="rounded bg-rose-900/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider">Hidden</span>
                  </div>
                )}
                {selected.access_restricted && (
                  <div className="mt-4 rounded-md bg-amber-950/30 border border-amber-900/50 p-3">
                    <div className="text-xs text-amber-200 font-medium">{selected.message}</div>
                    {user?.role === 'Admin' && (
                      <Button variant="secondary" size="sm" className="mt-2 text-[10px]" onClick={doRequestPermission} disabled={busy}>
                        Request Permission
                      </Button>
                    )}
                  </div>
                )}
                {canSeePublicUrl && selected.storage_url ? (
                  <div className="break-all">
                    <span className="text-slate-500">URL:</span>{" "}
                    <a className="text-sky-400 hover:underline" href={selected.storage_url} target="_blank">
                      {selected.storage_url}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  className="flex-1"
                  disabled={selected.access_restricted}
                  onClick={() =>
                    window.open(
                      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/assets/${selected.id}/download`,
                      "_blank"
                    )
                  }
                >
                  Download
                </Button>
                <Button variant="secondary" className="border-rose-900/50 text-rose-400 hover:bg-rose-950/30" onClick={handleDelete} disabled={busy}>
                  Delete
                </Button>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                  Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selected.tags || []).map((t) => (
                    <span
                      key={t.name}
                      className="group relative flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200"
                    >
                      {t.name}
                      {t.source === "ai" || t.source === "dummy" ? (
                        <span className="text-[10px] uppercase text-slate-500">AI</span>
                      ) : (
                        <button
                          onClick={() => handleRemoveTag(t.name)}
                          className="ml-1 text-slate-500 hover:text-rose-400"
                          title="Remove tag"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="add tag…"
                  />
                  <Button onClick={addUserTag} disabled={busy || !tagInput.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            </Card>

            {selected.has_content_access && (
              <>
                <Card className="p-4">
                  <div className="mb-3 text-sm font-semibold">AI Similarity</div>
                  <Button variant="secondary" className="w-full" onClick={doFindSimilar} disabled={busy}>
                    Find Similar Assets
                  </Button>
                  
                  {similarAssets.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Similar Items</div>
                      <div className="grid grid-cols-1 gap-2">
                        {similarAssets.map(sa => (
                          <div 
                            key={sa.id} 
                            className="flex items-center gap-3 p-2 rounded-md border border-slate-800 bg-slate-900/50 cursor-pointer hover:bg-slate-800 transition-colors"
                            onClick={() => openAsset(sa.id)}
                          >
                            <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-xl">
                              {sa.asset_type === 'image' ? '🖼️' : sa.asset_type === 'video' ? '🎬' : '📄'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-slate-200 truncate">{sa.original_filename}</div>
                              <div className="text-[10px] text-slate-500 capitalize">{sa.asset_type}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <div className="mb-3 text-sm font-semibold">Manage Permissions</div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="User email" 
                        value={permEmail} 
                        onChange={e => setPermEmail(e.target.value)} 
                      />
                      <select
                        className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={permLevel}
                        onChange={e => setPermLevel(e.target.value)}
                      >
                        <option value="Viewer">Viewer</option>
                        <option value="Editor">Editor</option>
                        <option value="Manager">Manager</option>
                      </select>
                      <Button variant="secondary" onClick={grantPermission} disabled={busy || !permEmail}>Grant</Button>
                    </div>
                    
                    {assetPermissions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Permissions</div>
                        {assetPermissions.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span className="text-slate-300">{p.user_email}</span>
                            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{p.level}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

