import {
  auth,
  storage,
  STORAGE_BUCKET,
  storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  getMetadata,
  deleteObject
} from "../firebase";
function blobToBase64DataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to serialize file for upload."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file for upload."));
    reader.readAsDataURL(blob);
  });
}
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then((val) => {
      clearTimeout(timer);
      resolve(val);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
async function tryUploadToFirebaseStorage(params) {
  const fileRef = storageRef(storage, params.fullPath);
  const snapshot = await withTimeout(
    uploadBytes(fileRef, params.blob, {
      contentType: params.contentType,
      customMetadata: {
        folder: params.folder,
        sessionId: params.sessionId,
        app: "AMMON-Nigeria",
        authenticated: auth.currentUser ? "true" : "false"
      }
    }),
    7e3,
    "Firebase Storage upload"
  );
  const downloadUrl = await withTimeout(
    getDownloadURL(snapshot.ref),
    5e3,
    "Firebase Storage URL lookup"
  );
  return {
    url: downloadUrl,
    storagePath: params.fullPath,
    provider: "firebase-storage"
  };
}
async function tryUploadToAmmonVault(params) {
  let lastError = "Unable to reach AMMON upload vault.";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch("/api/uploads/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: params.folder,
          fileName: params.fileName,
          dataUrl: params.dataUrl
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.url) {
          return {
            url: data.url,
            storagePath: data.storagePath || `ammon-kyc/${params.folder}/${params.fileName}`
          };
        }
      } else {
        const errPayload = await resp.json().catch(() => ({}));
        lastError = errPayload?.error || `Upload server returned HTTP ${resp.status}`;
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 408 && resp.status !== 429) {
          break;
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error during upload.";
    }
    if (attempt < 1) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  throw new Error(lastError);
}
async function uploadMemberKycAsset(params) {
  const safeSession = params.sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeFile = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `ammon-kyc/${params.folder}/${safeSession}/${Date.now()}_${safeFile}`;
  const contentType = params.contentType || params.blob.type || "image/jpeg";
  const resolvedDataUrl = params.dataUrl || await blobToBase64DataUrl(params.blob);
  if (auth.currentUser) {
    try {
      return await tryUploadToFirebaseStorage({
        blob: params.blob,
        folder: params.folder,
        sessionId: safeSession,
        fullPath,
        contentType
      });
    } catch (firebaseErr) {
      console.warn(
        "Authenticated Firebase Storage upload fallback:",
        firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
      );
    }
  }
  try {
    const vaultRes = await tryUploadToAmmonVault({
      folder: params.folder,
      fileName: safeFile,
      dataUrl: resolvedDataUrl
    });
    return {
      url: vaultRes.url,
      storagePath: vaultRes.storagePath,
      provider: "ammon-vault"
    };
  } catch (vaultErr) {
    console.warn(
      "AMMON vault upload fallback triggered:",
      vaultErr instanceof Error ? vaultErr.message : vaultErr
    );
  }
  if (!auth.currentUser) {
    try {
      return await tryUploadToFirebaseStorage({
        blob: params.blob,
        folder: params.folder,
        sessionId: safeSession,
        fullPath,
        contentType
      });
    } catch (firebaseErr) {
      console.warn(
        "Public Firebase Storage upload note:",
        firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
      );
    }
  }
  if (resolvedDataUrl.length <= 65e4) {
    return {
      url: resolvedDataUrl,
      storagePath: fullPath,
      provider: "cloud-firestore-inline"
    };
  }
  throw new Error("Image file is too large for offline fallback. Please capture a clearer smaller photo.");
}
async function uploadProfileAvatarAsset(params) {
  const safeUser = params.userId.replace(/[^a-zA-Z0-9_-]/g, "") || "user";
  const safeFile = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "avatar.jpg";
  const fullPath = `profile-photos/${safeUser}/${Date.now()}_${safeFile}`;
  const contentType = params.blob.type || "image/jpeg";
  const resolvedDataUrl = params.dataUrl || await blobToBase64DataUrl(params.blob);
  try {
    const fileRef = storageRef(storage, fullPath);
    const snapshot = await withTimeout(
      uploadBytes(fileRef, params.blob, {
        contentType,
        cacheControl: "public, max-age=86400",
        customMetadata: {
          app: "AMMON-Nigeria",
          folder: "profile-photos",
          userId: safeUser
        }
      }),
      7e3,
      "Firebase Storage profile upload"
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(snapshot.ref),
      5e3,
      "Firebase Storage profile URL lookup"
    );
    return {
      url: downloadUrl,
      storagePath: fullPath,
      provider: "firebase-storage"
    };
  } catch (firebaseErr) {
    console.warn(
      "Firebase Storage profile photo upload fallback:",
      firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
    );
  }
  try {
    const resp = await fetch("/api/uploads/profile-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: safeUser,
        fileName: safeFile,
        dataUrl: resolvedDataUrl
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.url) {
        return {
          url: data.url,
          storagePath: data.storagePath || fullPath,
          provider: "ammon-vault"
        };
      }
    }
  } catch (vaultErr) {
    console.warn("AMMON profile vault fallback:", vaultErr);
  }
  if (resolvedDataUrl.length <= 65e4) {
    return {
      url: resolvedDataUrl,
      storagePath: fullPath,
      provider: "cloud-firestore-inline"
    };
  }
  throw new Error("Profile photo is too large. Please select a clearer smaller photo.");
}
function isVideoFile(fileName, mimeType) {
  if (mimeType && mimeType.toLowerCase().startsWith("video/")) return true;
  if (fileName && /\.(mp4|webm|mov|m4v|ogv|3gp|mkv)(\?|$)/i.test(fileName)) return true;
  return false;
}
function isAudioFile(fileName, mimeType) {
  if (mimeType && mimeType.toLowerCase().startsWith("audio/")) return true;
  if (fileName && /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(fileName)) return true;
  return false;
}
function formatSizeLabel(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}
async function uploadChatMediaAsset(file, channelId) {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("File exceeds the 25 MB upload limit. Please trim or compress the video first.");
  }
  const resolvedMime = file.type || (isVideoFile(file.name) ? "video/mp4" : isAudioFile(file.name) ? "audio/mpeg" : "application/octet-stream");
  const safeChannel = channelId.replace(/[^a-zA-Z0-9_-]/g, "") || "general";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "media.bin";
  const sizeLabel = formatSizeLabel(file.size);
  try {
    const resp = await fetch("/api/uploads/chat-media", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-file-name": safeName,
        "x-mime-type": resolvedMime
      },
      body: file
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.url) {
        return {
          url: data.url,
          storagePath: data.storagePath || `chat-media/${safeName}`,
          contentType: data.contentType || resolvedMime,
          sizeLabel,
          provider: "ammon-vault"
        };
      }
    }
  } catch (err) {
    console.warn("Chat media vault upload fallback:", err instanceof Error ? err.message : err);
  }
  try {
    const fullPath = `ammon-chat-media/${safeChannel}/${Date.now()}_${safeName}`;
    const ref = storageRef(storage, fullPath);
    const snapshot = await withTimeout(
      uploadBytes(ref, file, { contentType: resolvedMime }),
      15e3,
      "Firebase Storage media upload"
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(snapshot.ref),
      6e3,
      "Firebase Storage URL lookup"
    );
    return {
      url: downloadUrl,
      storagePath: fullPath,
      contentType: resolvedMime,
      sizeLabel,
      provider: "firebase-storage"
    };
  } catch (firebaseErr) {
    console.warn(
      "Firebase Storage chat media fallback:",
      firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
    );
  }
  if (file.size <= 680 * 1024) {
    const dataUrl = await blobToBase64DataUrl(file);
    if (dataUrl.length <= 92e4) {
      return {
        url: dataUrl,
        storagePath: `inline/${safeName}`,
        contentType: resolvedMime,
        sizeLabel,
        provider: "cloud-firestore-inline"
      };
    }
  }
  throw new Error(
    "Unable to upload large video because media vault and cloud storage are unavailable. Please upload a clip under 700 KB or reconnect to the AMMON server."
  );
}
async function uploadMeetingRecordingAsset(params) {
  const safeMeetingId = params.meetingId.replace(/[^a-zA-Z0-9_-]/g, "") || "meeting";
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "ammon-session.webm";
  const resolvedMime = (params.mimeType || params.blob.type || "video/webm").split(";")[0];
  const fullPath = `recordings/${safeMeetingId}/${Date.now()}_${safeName}`;
  const sizeLabel = formatSizeLabel(params.blob.size);
  const bucketName = STORAGE_BUCKET || "ammon-firebase-storage";
  try {
    const fileRef = storageRef(storage, fullPath);
    const snapshot = await new Promise(
      (resolve, reject) => {
        const task = uploadBytesResumable(fileRef, params.blob, {
          contentType: resolvedMime,
          cacheControl: "public, max-age=31536000, immutable",
          customMetadata: {
            app: "AMMON-Nigeria",
            folder: "recordings",
            meetingId: safeMeetingId,
            meetingTitle: (params.meetingTitle || safeName).slice(0, 120),
            recordedBy: (params.recordedBy || "AMMON Host").slice(0, 80),
            bucket: bucketName
          }
        });
        let lastTransferred = 0;
        const stallTimer = setInterval(() => {
          const transferred = task.snapshot.bytesTransferred;
          if (transferred === lastTransferred && transferred === 0) {
            clearInterval(stallTimer);
            task.cancel();
            reject(new Error("Firebase Storage upload timed out starting transfer."));
          }
          lastTransferred = transferred;
        }, 12e3);
        task.on(
          "state_changed",
          (snap) => {
            if (snap.totalBytes > 0) {
              const pct = Math.min(99, Math.round(snap.bytesTransferred / snap.totalBytes * 100));
              params.onProgress?.(pct);
            }
          },
          (err) => {
            clearInterval(stallTimer);
            reject(err);
          },
          () => {
            clearInterval(stallTimer);
            params.onProgress?.(100);
            resolve(task.snapshot);
          }
        );
      }
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(snapshot.ref),
      8e3,
      "Firebase Storage recording URL lookup"
    );
    return {
      url: downloadUrl,
      storagePath: fullPath,
      bucketName,
      mimeType: resolvedMime,
      sizeLabel,
      provider: "firebase-storage"
    };
  } catch (firebaseErr) {
    console.warn(
      "Firebase Storage recordings/ upload fallback:",
      firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
    );
  }
  if (params.blob.size <= 200 * 1024 * 1024) {
    try {
      params.onProgress?.(60);
      const resp = await fetch("/api/uploads/recordings", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-file-name": safeName,
          "x-mime-type": resolvedMime,
          "x-meeting-id": safeMeetingId
        },
        body: params.blob
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.url) {
          params.onProgress?.(100);
          return {
            url: data.url,
            storagePath: data.storagePath || fullPath,
            bucketName,
            mimeType: data.contentType || resolvedMime,
            sizeLabel,
            provider: "ammon-vault"
          };
        }
      }
    } catch (vaultErr) {
      console.warn("AMMON recording vault fallback failed:", vaultErr);
    }
  }
  throw new Error(
    "Unable to save meeting recording to AMMON Firebase Storage (recordings/). Please verify storage rules and network connectivity."
  );
}
async function listSavedRecordingsFromBucket() {
  const results = [];
  const bucketName = STORAGE_BUCKET || "ammon-firebase-storage";
  try {
    const rootRef = storageRef(storage, "recordings");
    const rootListing = await withTimeout(listAll(rootRef), 7e3, "Firebase Storage recordings list");
    const fileRefs = [...rootListing.items];
    for (const prefix of rootListing.prefixes.slice(0, 30)) {
      try {
        const sub = await withTimeout(listAll(prefix), 5e3, "Firebase Storage subfolder list");
        fileRefs.push(...sub.items);
      } catch {
      }
    }
    await Promise.all(
      fileRefs.slice(0, 60).map(async (itemRef) => {
        try {
          const [url, meta] = await Promise.all([
            getDownloadURL(itemRef),
            getMetadata(itemRef)
          ]);
          const createdMs = meta.timeCreated ? new Date(meta.timeCreated).getTime() : Date.now();
          const pathParts = itemRef.fullPath.split("/");
          const inferredMeetingId = pathParts.length >= 3 ? pathParts[1] : "general";
          results.push({
            id: `fb-${itemRef.fullPath}`,
            title: meta.customMetadata?.meetingTitle || itemRef.name.replace(/^\d+_/, "").replace(/\.(webm|mp4)$/i, "").replace(/_/g, " "),
            meetingId: meta.customMetadata?.meetingId || inferredMeetingId,
            url,
            storagePath: itemRef.fullPath,
            bucketName: meta.bucket || bucketName,
            mimeType: meta.contentType || "video/webm",
            sizeLabel: formatSizeLabel(meta.size || 0),
            recordedAt: new Date(createdMs).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            }),
            createdAtMs: createdMs,
            provider: "firebase-storage"
          });
        } catch {
        }
      })
    );
  } catch {
  }
  try {
    const resp = await fetch("/api/uploads/recordings");
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.recordings)) {
        for (const item of data.recordings) {
          results.push({
            id: `vault-${item.filename}`,
            title: item.filename.replace(/^\d+_[a-f0-9]+_/, "").replace(/\.(webm|mp4)$/i, "").replace(/_/g, " "),
            meetingId: "ammon-vault",
            url: item.url,
            storagePath: item.storagePath,
            bucketName,
            mimeType: item.mimeType || "video/webm",
            sizeLabel: formatSizeLabel(item.size || 0),
            recordedAt: new Date(item.createdAtMs || Date.now()).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            }),
            createdAtMs: item.createdAtMs || Date.now(),
            provider: "ammon-vault"
          });
        }
      }
    }
  } catch {
  }
  return results.sort((a, b) => b.createdAtMs - a.createdAtMs);
}
async function deleteMeetingRecordingAsset(storagePath, url) {
  if (storagePath && !url?.startsWith("/api/uploads/")) {
    try {
      await deleteObject(storageRef(storage, storagePath));
      return;
    } catch {
    }
  }
  if (url && url.startsWith("/api/uploads/recordings/")) {
    const filename = url.split("/").pop();
    if (filename) {
      await fetch(`/api/uploads/recordings/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      }).catch(() => {
      });
    }
  }
}
async function deleteChatMediaAsset(attachmentData, attachmentStoragePath) {
  try {
    if (attachmentStoragePath && attachmentStoragePath.startsWith("ammon-chat-media/")) {
      await deleteObject(storageRef(storage, attachmentStoragePath));
      return;
    }
    if (attachmentData && attachmentData.includes("firebasestorage.googleapis.com") && attachmentData.includes("ammon-chat-media")) {
      const match = attachmentData.match(/\/o\/([^?]+)/);
      if (match && match[1]) {
        const decodedPath = decodeURIComponent(match[1]);
        if (decodedPath.startsWith("ammon-chat-media/")) {
          await deleteObject(storageRef(storage, decodedPath));
        }
      }
    }
  } catch (err) {
    console.warn("Chat media Firebase Storage delete note:", err instanceof Error ? err.message : err);
  }
}
export {
  deleteChatMediaAsset,
  deleteMeetingRecordingAsset,
  isAudioFile,
  isVideoFile,
  listSavedRecordingsFromBucket,
  uploadChatMediaAsset,
  uploadMeetingRecordingAsset,
  uploadMemberKycAsset,
  uploadProfileAvatarAsset
};
