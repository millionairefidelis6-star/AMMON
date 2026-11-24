import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Film,
  Play,
  Download,
  RefreshCw,
  Search,
  FolderOpen,
  HardDrive,
  Clock,
  User,
  Calendar,
  Copy,
  Check,
  Trash2,
  Video,
  X,
  ExternalLink
} from "lucide-react";
import { STORAGE_BUCKET } from "../../firebase";
import {
  deleteMeetingRecordingAsset,
  listSavedRecordingsFromBucket
} from "../../services/storageService";
const SavedRecordingsWorkspace = ({
  executive,
  meetings,
  onUpdateMeeting,
  onOpenMeetings
}) => {
  const [bucketItems, setBucketItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activePlayer, setActivePlayer] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const syncBucket = useCallback(async () => {
    setIsSyncing(true);
    try {
      const items = await listSavedRecordingsFromBucket();
      setBucketItems(items);
    } finally {
      setIsSyncing(false);
    }
  }, []);
  useEffect(() => {
    syncBucket();
  }, [syncBucket, meetings.length]);
  const allRecordings = useMemo(() => {
    const byKey = /* @__PURE__ */ new Map();
    for (const mtg of meetings) {
      if (!Array.isArray(mtg.recordings)) continue;
      for (const rec of mtg.recordings) {
        const dedupKey = rec.storagePath || rec.url || rec.id;
        byKey.set(dedupKey, {
          id: rec.id,
          title: rec.title || `${mtg.title} — Session Recording`,
          meetingId: mtg.id,
          meetingTitle: mtg.title,
          meetingCategory: mtg.category,
          meetingCode: mtg.meetingCode,
          url: rec.url,
          storagePath: rec.storagePath || `recordings/${mtg.id}/${rec.id}.webm`,
          bucketName: rec.bucketName || STORAGE_BUCKET || "ammon-firebase-storage",
          mimeType: rec.mimeType || "video/webm",
          sizeLabel: rec.sizeLabel || "Video",
          durationLabel: rec.durationLabel || "Recorded",
          recordedBy: rec.recordedBy || mtg.hostName,
          recordedAt: rec.recordedAt || mtg.scheduledDate,
          createdAtMs: rec.createdAtMs || mtg.createdAtMs || 0,
          source: "firestore-meeting"
        });
      }
    }
    for (const item of bucketItems) {
      const alreadyLinked = Array.from(byKey.values()).some(
        (existing) => existing.storagePath === item.storagePath || existing.url === item.url
      );
      if (!alreadyLinked) {
        byKey.set(item.storagePath || item.url || item.id, {
          id: item.id,
          title: item.title || "AMMON Meeting Recording",
          meetingId: item.meetingId,
          meetingCategory: "Bucket Archive",
          url: item.url,
          storagePath: item.storagePath,
          bucketName: item.bucketName,
          mimeType: item.mimeType,
          sizeLabel: item.sizeLabel,
          durationLabel: "Video Archive",
          recordedBy: "AMMON Host",
          recordedAt: item.recordedAt,
          createdAtMs: item.createdAtMs,
          source: "storage-bucket"
        });
      }
    }
    return Array.from(byKey.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [meetings, bucketItems]);
  const filteredRecordings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRecordings.filter((rec) => {
      const matchesCat = categoryFilter === "All" || (rec.meetingCategory || "Bucket Archive") === categoryFilter;
      if (!matchesCat) return false;
      if (!q) return true;
      return rec.title.toLowerCase().includes(q) || (rec.meetingTitle || "").toLowerCase().includes(q) || (rec.meetingCode || "").toLowerCase().includes(q) || rec.recordedBy.toLowerCase().includes(q) || rec.storagePath.toLowerCase().includes(q);
    });
  }, [allRecordings, searchQuery, categoryFilter]);
  const categories = useMemo(() => {
    const cats = /* @__PURE__ */ new Set(["All"]);
    for (const rec of allRecordings) {
      if (rec.meetingCategory) cats.add(rec.meetingCategory);
    }
    return Array.from(cats);
  }, [allRecordings]);
  const canManageRecordings = executive.level === "super_admin" || executive.role === "Super Admin" || Boolean(executive.permissions?.canManageMeetings);
  const handleCopyUrl = async (rec) => {
    const absoluteUrl = rec.url.startsWith("/") ? `${window.location.origin}${rec.url}` : rec.url;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId((prev) => prev === rec.id ? null : prev), 2e3);
    } catch {
    }
  };
  const handleDeleteRecording = async (rec) => {
    setDeletingId(rec.id);
    try {
      await deleteMeetingRecordingAsset(rec.storagePath, rec.url);
      if (rec.meetingId && onUpdateMeeting) {
        const parent = meetings.find((m) => m.id === rec.meetingId);
        if (parent && Array.isArray(parent.recordings)) {
          onUpdateMeeting(parent.id, {
            recordings: parent.recordings.filter(
              (r) => r.id !== rec.id && r.storagePath !== rec.storagePath && r.url !== rec.url
            )
          });
        }
      }
      setBucketItems(
        (prev) => prev.filter((b) => b.storagePath !== rec.storagePath && b.url !== rec.url)
      );
      if (activePlayer?.id === rec.id) {
        setActivePlayer(null);
      }
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };
  const bucketDisplay = STORAGE_BUCKET || "gen-lang-client-0586261814.firebasestorage.app";
  return <div className="space-y-5 animate-in fade-in duration-150">
      {
    /* Header & Storage Bucket Info */
  }
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#176B37] text-white font-bold text-[10px] tracking-wider uppercase flex items-center gap-1">
              <Film className="w-3 h-3" />
              <span>Saved Recordings</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF3ED] text-[#14532D] font-mono font-semibold text-[10px] border border-[#176B37]/25 flex items-center gap-1 truncate max-w-full">
              <FolderOpen className="w-3 h-3 text-[#176B37] shrink-0" />
              <span className="truncate">gs://{bucketDisplay}/recordings/</span>
            </span>
          </div>

          <h3 className="text-lg font-extrabold text-[#252525]">
            AMMON Meeting Archive &amp; Saved Recordings
          </h3>
          <p className="text-xs text-gray-600">
            Centralized playback and download library for online meetings stored under the dedicated{" "}
            <code className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-[11px] text-[#14532D]">
              recordings/
            </code>{" "}
            folder in the AMMON Firebase Storage bucket.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
    type="button"
    onClick={syncBucket}
    disabled={isSyncing}
    className="px-3.5 py-2 rounded-xl border border-[#E5E7EB] hover:border-[#176B37] text-[#252525] hover:text-[#176B37] bg-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
  >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#176B37]" : ""}`} />
            <span>{isSyncing ? "Syncing Bucket..." : "Sync Bucket"}</span>
          </button>

          {onOpenMeetings && <button
    type="button"
    onClick={onOpenMeetings}
    className="px-4 py-2 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
  >
              <Video className="w-3.5 h-3.5" />
              <span>Open Online Meetings</span>
            </button>}
        </div>
      </div>

      {
    /* Metrics Strip */
  }
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Total Saved Recordings
          </span>
          <div className="text-2xl font-black text-[#176B37] font-mono tabular-nums mt-1">
            {allRecordings.length}
          </div>
          <span className="text-[10px] text-gray-500">Available for replay &amp; download</span>
        </div>

        <div className="bg-[#EAF3ED] p-4 rounded-2xl border border-[#176B37]/25 shadow-xs">
          <span className="text-[10px] font-bold text-[#14532D] uppercase tracking-wider block">
            Storage Folder Path
          </span>
          <div className="text-sm font-black text-[#176B37] font-mono mt-1.5 truncate">
            /recordings/{"{meetingId}"}/
          </div>
          <span className="text-[10px] text-[#14532D]">Compressed VP9/VP8 + Opus video stream</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            AMMON Storage Bucket
          </span>
          <div className="text-xs font-bold text-[#252525] font-mono mt-2 truncate" title={bucketDisplay}>
            {bucketDisplay}
          </div>
          <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
            <HardDrive className="w-3 h-3" /> Isolated AMMON archive
          </span>
        </div>
      </div>

      {
    /* Inline Video Theater Modal */
  }
      {activePlayer && <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{activePlayer.title}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {activePlayer.storagePath} • {activePlayer.durationLabel} • {activePlayer.sizeLabel}
              </p>
            </div>
            <button
    type="button"
    onClick={() => setActivePlayer(null)}
    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
    aria-label="Close video player"
  >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-black flex items-center justify-center max-h-[440px]">
            <video
    key={activePlayer.url}
    src={activePlayer.url}
    controls
    autoPlay
    playsInline
    className="w-full max-h-[440px] object-contain"
  />
          </div>
        </div>}

      {
    /* Search & Filter Toolbar */
  }
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search recordings by meeting title, code, host name, or storage path..."
    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-hidden focus:border-[#176B37]"
  />
        </div>

        <select
    value={categoryFilter}
    onChange={(e) => setCategoryFilter(e.target.value)}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#252525] focus:outline-hidden focus:border-[#176B37]"
  >
          {categories.map((cat) => <option key={cat} value={cat}>
              {cat === "All" ? "All Meeting Categories" : cat}
            </option>)}
        </select>
      </div>

      {
    /* Saved Recordings List */
  }
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-[#F9FBFA]">
          <h4 className="text-xs font-bold text-[#14532D] uppercase tracking-wider flex items-center gap-1.5">
            <Film className="w-4 h-4 text-[#176B37]" />
            <span>Saved Recordings ({filteredRecordings.length})</span>
          </h4>
          <span className="text-[10px] font-mono text-gray-500">Folder: recordings/</span>
        </div>

        {filteredRecordings.length === 0 ? <div className="p-10 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF3ED] text-[#176B37] flex items-center justify-center mx-auto">
              <Film className="w-6 h-6" />
            </div>
            <h5 className="font-bold text-sm text-[#252525]">
              {allRecordings.length === 0 ? "No meeting recordings saved yet" : "No recordings match your search"}
            </h5>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {allRecordings.length === 0 ? 'Start an Online Meeting and click "Record Session". Saved videos are stored automatically under recordings/{meetingId}/ in AMMON Firebase Storage and appear here for quick replay.' : "Try clearing the search query or selecting All Meeting Categories."}
            </p>
            {allRecordings.length === 0 && onOpenMeetings && <button
    type="button"
    onClick={onOpenMeetings}
    className="mt-2 px-4 py-2 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
  >
                <Video className="w-3.5 h-3.5" />
                <span>Go to Online Meetings</span>
              </button>}
          </div> : <div className="divide-y divide-gray-100">
            {filteredRecordings.map((rec) => {
    const isConfirming = confirmDeleteId === rec.id;
    const isDeleting = deletingId === rec.id;
    const isPlaying = activePlayer?.id === rec.id;
    return <div
      key={rec.id}
      className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${isPlaying ? "bg-[#EAF3ED]/50" : "hover:bg-[#F9FBFA]"}`}
    >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
      type="button"
      onClick={() => setActivePlayer(rec)}
      className="w-11 h-11 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-colors"
      title="Play saved recording"
    >
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-bold text-sm text-[#252525] truncate">{rec.title}</h5>
                        {rec.meetingCategory && <span className="px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#176B37] text-[10px] font-bold">
                            {rec.meetingCategory}
                          </span>}
                        {rec.meetingCode && <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {rec.meetingCode}
                          </span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-[#176B37]" />
                          <span>{rec.recordedBy}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#176B37]" />
                          <span>{rec.recordedAt}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-[#176B37]" />
                          <span>{rec.durationLabel}</span>
                        </span>
                        <span className="font-mono text-gray-600 font-semibold">{rec.sizeLabel}</span>
                      </div>

                      <p className="text-[10px] font-mono text-gray-400 truncate" title={rec.storagePath}>
                        Path: {rec.storagePath}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
      type="button"
      onClick={() => setActivePlayer(rec)}
      className="px-3 py-1.5 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{isPlaying ? "Playing" : "Watch"}</span>
                    </button>

                    <a
      href={rec.url}
      download={`${rec.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.webm`}
      className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] hover:border-[#176B37] text-[#252525] hover:text-[#176B37] bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>

                    <button
      type="button"
      onClick={() => handleCopyUrl(rec)}
      className="px-2.5 py-1.5 rounded-xl border border-[#E5E7EB] hover:bg-gray-100 text-gray-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
      title="Copy recording share link"
    >
                      {copiedId === rec.id ? <>
                          <Check className="w-3.5 h-3.5 text-[#176B37]" />
                          <span className="text-[#176B37]">Copied</span>
                        </> : <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </>}
                    </button>

                    <a
      href={rec.url}
      target="_blank"
      rel="noopener noreferrer"
      className="p-1.5 rounded-xl border border-[#E5E7EB] hover:bg-gray-100 text-gray-500 hover:text-[#176B37]"
      title="Open direct video URL"
    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {canManageRecordings && !isConfirming && <button
      type="button"
      onClick={() => setConfirmDeleteId(rec.id)}
      className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
      title="Delete saved recording"
    >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>}

                    {canManageRecordings && isConfirming && <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-1 rounded-xl">
                        <button
      type="button"
      disabled={isDeleting}
      onClick={() => handleDeleteRecording(rec)}
      className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer disabled:opacity-50"
    >
                          {isDeleting ? "Deleting..." : "Confirm"}
                        </button>
                        <span className="text-red-300">|</span>
                        <button
      type="button"
      onClick={() => setConfirmDeleteId(null)}
      className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
    >
                          Cancel
                        </button>
                      </div>}
                  </div>
                </div>;
  })}
          </div>}
      </div>
    </div>;
};
export {
  SavedRecordingsWorkspace
};
