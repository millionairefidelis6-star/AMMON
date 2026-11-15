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
  deleteObject,
} from '../firebase';

export interface KycUploadResult {
  url: string;
  storagePath: string;
  provider: 'firebase-storage' | 'ammon-vault' | 'cloud-firestore-inline';
}

function blobToBase64DataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to serialize file for upload.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file for upload.'));
    reader.readAsDataURL(blob);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function tryUploadToFirebaseStorage(params: {
  blob: Blob;
  folder: 'member-passports' | 'kyc-documents';
  sessionId: string;
  fullPath: string;
  contentType: string;
}): Promise<KycUploadResult> {
  const fileRef = storageRef(storage, params.fullPath);
  const snapshot = await withTimeout(
    uploadBytes(fileRef, params.blob, {
      contentType: params.contentType,
      customMetadata: {
        folder: params.folder,
        sessionId: params.sessionId,
        app: 'AMMON-Nigeria',
        authenticated: auth.currentUser ? 'true' : 'false',
      },
    }),
    7000,
    'Firebase Storage upload'
  );
  const downloadUrl = await withTimeout(
    getDownloadURL(snapshot.ref),
    5000,
    'Firebase Storage URL lookup'
  );
  return {
    url: downloadUrl,
    storagePath: params.fullPath,
    provider: 'firebase-storage',
  };
}

async function tryUploadToAmmonVault(params: {
  folder: 'member-passports' | 'kyc-documents';
  fileName: string;
  dataUrl: string;
}): Promise<{ url: string; storagePath: string }> {
  let lastError = 'Unable to reach AMMON upload vault.';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch('/api/uploads/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: params.folder,
          fileName: params.fileName,
          dataUrl: params.dataUrl,
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as { url?: string; storagePath?: string };
        if (data?.url) {
          return {
            url: data.url,
            storagePath: data.storagePath || `ammon-kyc/${params.folder}/${params.fileName}`,
          };
        }
      } else {
        const errPayload = await resp.json().catch(() => ({} as { error?: string }));
        lastError = errPayload?.error || `Upload server returned HTTP ${resp.status}`;
        // Do not retry client errors (e.g. 404 on static preview, 400 invalid payload)
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 408 && resp.status !== 429) {
          break;
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error during upload.';
    }

    if (attempt < 1) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  throw new Error(lastError);
}

/**
 * Upload a member's KYC asset (passport photograph or government ID / business license).
 * Uses Firebase Storage (`gs://...firebasestorage.app`) when permitted or authenticated,
 * AMMON's Express Persistent Vault (`/api/uploads/kyc`) when running full-stack, and
 * falls back cleanly to compact inline Firestore-ready JPEG persistence if running on
 * static hosting where `/api/*` returns 404.
 */
export async function uploadMemberKycAsset(params: {
  blob: Blob;
  folder: 'member-passports' | 'kyc-documents';
  sessionId: string;
  fileName: string;
  contentType?: string;
  dataUrl?: string;
}): Promise<KycUploadResult> {
  const safeSession = params.sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeFile = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fullPath = `ammon-kyc/${params.folder}/${safeSession}/${Date.now()}_${safeFile}`;
  const contentType = params.contentType || params.blob.type || 'image/jpeg';

  const resolvedDataUrl = params.dataUrl || (await blobToBase64DataUrl(params.blob));

  // If user is authenticated with Firebase, try Firebase Storage first
  if (auth.currentUser) {
    try {
      return await tryUploadToFirebaseStorage({
        blob: params.blob,
        folder: params.folder,
        sessionId: safeSession,
        fullPath,
        contentType,
      });
    } catch (firebaseErr) {
      console.warn(
        'Authenticated Firebase Storage upload fallback:',
        firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
      );
    }
  }

  // Next: AMMON Express Backend Persistent Vault
  try {
    const vaultRes = await tryUploadToAmmonVault({
      folder: params.folder,
      fileName: safeFile,
      dataUrl: resolvedDataUrl,
    });
    return {
      url: vaultRes.url,
      storagePath: vaultRes.storagePath,
      provider: 'ammon-vault',
    };
  } catch (vaultErr) {
    console.warn(
      'AMMON vault upload fallback triggered:',
      vaultErr instanceof Error ? vaultErr.message : vaultErr
    );
  }

  // Next: Firebase Storage SDK (works whenever Storage rules permit public KYC uploads)
  if (!auth.currentUser) {
    try {
      return await tryUploadToFirebaseStorage({
        blob: params.blob,
        folder: params.folder,
        sessionId: safeSession,
        fullPath,
        contentType,
      });
    } catch (firebaseErr) {
      console.warn(
        'Public Firebase Storage upload note:',
        firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
      );
    }
  }

  // Final Resilient Fallback: Compact auto-fitted JPEG persisted directly in Cloud Firestore document
  if (resolvedDataUrl.length <= 650_000) {
    return {
      url: resolvedDataUrl,
      storagePath: fullPath,
      provider: 'cloud-firestore-inline',
    };
  }

  throw new Error('Image file is too large for offline fallback. Please capture a clearer smaller photo.');
}

/**
 * Upload a user's dashboard profile photo / chat display picture to `profile-photos/{userId}/...`
 * in the AMMON Firebase Storage bucket, with Express persistent vault and inline fallbacks.
 */
export async function uploadProfileAvatarAsset(params: {
  blob: Blob;
  userId: string;
  fileName: string;
  dataUrl?: string;
}): Promise<KycUploadResult> {
  const safeUser = params.userId.replace(/[^a-zA-Z0-9_-]/g, '') || 'user';
  const safeFile = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'avatar.jpg';
  const fullPath = `profile-photos/${safeUser}/${Date.now()}_${safeFile}`;
  const contentType = params.blob.type || 'image/jpeg';
  const resolvedDataUrl = params.dataUrl || (await blobToBase64DataUrl(params.blob));

  // 1. Firebase Storage (`profile-photos/{userId}/...`)
  try {
    const fileRef = storageRef(storage, fullPath);
    const snapshot = await withTimeout(
      uploadBytes(fileRef, params.blob, {
        contentType,
        cacheControl: 'public, max-age=86400',
        customMetadata: {
          app: 'AMMON-Nigeria',
          folder: 'profile-photos',
          userId: safeUser,
        },
      }),
      7000,
      'Firebase Storage profile upload'
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(snapshot.ref),
      5000,
      'Firebase Storage profile URL lookup'
    );
    return {
      url: downloadUrl,
      storagePath: fullPath,
      provider: 'firebase-storage',
    };
  } catch (firebaseErr) {
    console.warn(
      'Firebase Storage profile photo upload fallback:',
      firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
    );
  }

  // 2. AMMON Express Vault (`/api/uploads/profile-photo`)
  try {
    const resp = await fetch('/api/uploads/profile-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: safeUser,
        fileName: safeFile,
        dataUrl: resolvedDataUrl,
      }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { url?: string; storagePath?: string };
      if (data?.url) {
        return {
          url: data.url,
          storagePath: data.storagePath || fullPath,
          provider: 'ammon-vault',
        };
      }
    }
  } catch (vaultErr) {
    console.warn('AMMON profile vault fallback:', vaultErr);
  }

  // 3. Compact inline JPEG fallback
  if (resolvedDataUrl.length <= 650_000) {
    return {
      url: resolvedDataUrl,
      storagePath: fullPath,
      provider: 'cloud-firestore-inline',
    };
  }

  throw new Error('Profile photo is too large. Please select a clearer smaller photo.');
}

export interface ChatMediaUploadResult {
  url: string;
  storagePath: string;
  contentType: string;
  sizeLabel: string;
  provider: 'ammon-vault' | 'firebase-storage' | 'cloud-firestore-inline';
}

export function isVideoFile(fileName?: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('video/')) return true;
  if (fileName && /\.(mp4|webm|mov|m4v|ogv|3gp|mkv)(\?|$)/i.test(fileName)) return true;
  return false;
}

export function isAudioFile(fileName?: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('audio/')) return true;
  if (fileName && /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(fileName)) return true;
  return false;
}

function formatSizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Upload video, audio, or document files shared in AMMON Social Chat.
 * Uses raw binary streaming upload to `/api/uploads/chat-media` (up to 25 MB, supports HTTP Range video seeking),
 * with Firebase Storage (`chat-media/...`) fallback and compact inline fallback for small files.
 */
export async function uploadChatMediaAsset(
  file: File,
  channelId: string
): Promise<ChatMediaUploadResult> {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('File exceeds the 25 MB upload limit. Please trim or compress the video first.');
  }

  const resolvedMime =
    file.type ||
    (isVideoFile(file.name)
      ? 'video/mp4'
      : isAudioFile(file.name)
      ? 'audio/mpeg'
      : 'application/octet-stream');

  const safeChannel = channelId.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'media.bin';
  const sizeLabel = formatSizeLabel(file.size);

  // 1. Primary: AMMON Express Binary Upload Vault (supports HTTP 206 Range seeking for <video>)
  try {
    const resp = await fetch('/api/uploads/chat-media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-file-name': safeName,
        'x-mime-type': resolvedMime,
      },
      body: file,
    });

    if (resp.ok) {
      const data = (await resp.json()) as {
        url?: string;
        storagePath?: string;
        contentType?: string;
      };
      if (data?.url) {
        return {
          url: data.url,
          storagePath: data.storagePath || `chat-media/${safeName}`,
          contentType: data.contentType || resolvedMime,
          sizeLabel,
          provider: 'ammon-vault',
        };
      }
    }
  } catch (err) {
    console.warn('Chat media vault upload fallback:', err instanceof Error ? err.message : err);
  }

  // 2. Fallback: Firebase Storage (strictly namespaced under ammon-chat-media/ for isolation)
  try {
    const fullPath = `ammon-chat-media/${safeChannel}/${Date.now()}_${safeName}`;
    const ref = storageRef(storage, fullPath);
    const snapshot = await withTimeout(
      uploadBytes(ref, file, { contentType: resolvedMime }),
      15000,
      'Firebase Storage media upload'
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(snapshot.ref),
      6000,
      'Firebase Storage URL lookup'
    );
    return {
      url: downloadUrl,
      storagePath: fullPath,
      contentType: resolvedMime,
      sizeLabel,
      provider: 'firebase-storage',
    };
  } catch (firebaseErr) {
    console.warn(
      'Firebase Storage chat media fallback:',
      firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
    );
  }

  // 3. Last resort inline fallback for small clips/files (< 700 KB) so Firestore 1MB doc limit is respected
  if (file.size <= 680 * 1024) {
    const dataUrl = await blobToBase64DataUrl(file);
    if (dataUrl.length <= 920_000) {
      return {
        url: dataUrl,
        storagePath: `inline/${safeName}`,
        contentType: resolvedMime,
        sizeLabel,
        provider: 'cloud-firestore-inline',
      };
    }
  }

  throw new Error(
    'Unable to upload large video because media vault and cloud storage are unavailable. Please upload a clip under 700 KB or reconnect to the AMMON server.'
  );
}

export interface MeetingRecordingUploadResult {
  url: string;
  storagePath: string;
  bucketName: string;
  mimeType: string;
  sizeLabel: string;
  provider: 'firebase-storage' | 'ammon-vault';
}

export interface BucketRecordingItem {
  id: string;
  title: string;
  meetingId: string;
  url: string;
  storagePath: string;
  bucketName: string;
  mimeType: string;
  sizeLabel: string;
  recordedAt: string;
  createdAtMs: number;
  provider: 'firebase-storage' | 'ammon-vault';
}

/**
 * Upload a recorded AMMON online meeting video to the dedicated `recordings/` folder path
 * inside AMMON's Firebase Storage bucket (`recordings/{meetingId}/{timestamp}_{fileName}`),
 * with optimized cache headers, progress reporting, and resilient Express vault fallback.
 */
export async function uploadMeetingRecordingAsset(params: {
  blob: Blob;
  meetingId: string;
  fileName: string;
  mimeType?: string;
  meetingTitle?: string;
  recordedBy?: string;
  onProgress?: (percent: number) => void;
}): Promise<MeetingRecordingUploadResult> {
  const safeMeetingId = params.meetingId.replace(/[^a-zA-Z0-9_-]/g, '') || 'meeting';
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'ammon-session.webm';
  const resolvedMime = (params.mimeType || params.blob.type || 'video/webm').split(';')[0];
  const fullPath = `recordings/${safeMeetingId}/${Date.now()}_${safeName}`;
  const sizeLabel = formatSizeLabel(params.blob.size);
  const bucketName = STORAGE_BUCKET || 'ammon-firebase-storage';

  // 1. Primary: Dedicated `recordings/` folder in AMMON Firebase Storage Bucket
  try {
    const fileRef = storageRef(storage, fullPath);
    const snapshot = await new Promise<import('firebase/storage').UploadTaskSnapshot>(
      (resolve, reject) => {
        const task = uploadBytesResumable(fileRef, params.blob, {
          contentType: resolvedMime,
          cacheControl: 'public, max-age=31536000, immutable',
          customMetadata: {
            app: 'AMMON-Nigeria',
            folder: 'recordings',
            meetingId: safeMeetingId,
            meetingTitle: (params.meetingTitle || safeName).slice(0, 120),
            recordedBy: (params.recordedBy || 'AMMON Host').slice(0, 80),
            bucket: bucketName,
          },
        });

        // Safety stall guard if Firebase Storage hangs in offline/blocked env
        let lastTransferred = 0;
        const stallTimer = setInterval(() => {
          const transferred = task.snapshot.bytesTransferred;
          if (transferred === lastTransferred && transferred === 0) {
            clearInterval(stallTimer);
            task.cancel();
            reject(new Error('Firebase Storage upload timed out starting transfer.'));
          }
          lastTransferred = transferred;
        }, 12000);

        task.on(
          'state_changed',
          (snap) => {
            if (snap.totalBytes > 0) {
              const pct = Math.min(99, Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
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
      8000,
      'Firebase Storage recording URL lookup'
    );

    return {
      url: downloadUrl,
      storagePath: fullPath,
      bucketName,
      mimeType: resolvedMime,
      sizeLabel,
      provider: 'firebase-storage',
    };
  } catch (firebaseErr) {
    console.warn(
      'Firebase Storage recordings/ upload fallback:',
      firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
    );
  }

  // 2. Fallback: AMMON Express Persistent Vault (`/api/uploads/recordings`)
  if (params.blob.size <= 200 * 1024 * 1024) {
    try {
      params.onProgress?.(60);
      const resp = await fetch('/api/uploads/recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-file-name': safeName,
          'x-mime-type': resolvedMime,
          'x-meeting-id': safeMeetingId,
        },
        body: params.blob,
      });

      if (resp.ok) {
        const data = (await resp.json()) as {
          url?: string;
          storagePath?: string;
          contentType?: string;
        };
        if (data?.url) {
          params.onProgress?.(100);
          return {
            url: data.url,
            storagePath: data.storagePath || fullPath,
            bucketName,
            mimeType: data.contentType || resolvedMime,
            sizeLabel,
            provider: 'ammon-vault',
          };
        }
      }
    } catch (vaultErr) {
      console.warn('AMMON recording vault fallback failed:', vaultErr);
    }
  }

  throw new Error(
    'Unable to save meeting recording to AMMON Firebase Storage (recordings/). Please verify storage rules and network connectivity.'
  );
}

/**
 * Scan the dedicated `recordings/` folder in AMMON's Firebase Storage bucket
 * (and Express vault fallback if present) so the Admin Dashboard displays every stored recording.
 */
export async function listSavedRecordingsFromBucket(): Promise<BucketRecordingItem[]> {
  const results: BucketRecordingItem[] = [];
  const bucketName = STORAGE_BUCKET || 'ammon-firebase-storage';

  // 1. Scan Firebase Storage `recordings/` root + meeting subfolders
  try {
    const rootRef = storageRef(storage, 'recordings');
    const rootListing = await withTimeout(listAll(rootRef), 7000, 'Firebase Storage recordings list');

    const fileRefs = [...rootListing.items];
    for (const prefix of rootListing.prefixes.slice(0, 30)) {
      try {
        const sub = await withTimeout(listAll(prefix), 5000, 'Firebase Storage subfolder list');
        fileRefs.push(...sub.items);
      } catch {
        // Ignore individual subfolder error
      }
    }

    await Promise.all(
      fileRefs.slice(0, 60).map(async (itemRef) => {
        try {
          const [url, meta] = await Promise.all([
            getDownloadURL(itemRef),
            getMetadata(itemRef),
          ]);
          const createdMs = meta.timeCreated ? new Date(meta.timeCreated).getTime() : Date.now();
          const pathParts = itemRef.fullPath.split('/');
          const inferredMeetingId = pathParts.length >= 3 ? pathParts[1] : 'general';
          results.push({
            id: `fb-${itemRef.fullPath}`,
            title:
              meta.customMetadata?.meetingTitle ||
              itemRef.name.replace(/^\d+_/, '').replace(/\.(webm|mp4)$/i, '').replace(/_/g, ' '),
            meetingId: meta.customMetadata?.meetingId || inferredMeetingId,
            url,
            storagePath: itemRef.fullPath,
            bucketName: meta.bucket || bucketName,
            mimeType: meta.contentType || 'video/webm',
            sizeLabel: formatSizeLabel(meta.size || 0),
            recordedAt: new Date(createdMs).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            createdAtMs: createdMs,
            provider: 'firebase-storage',
          });
        } catch {
          // Ignore single unreadable object
        }
      })
    );
  } catch {
    // Firebase Storage listing may be restricted by rules or offline; gracefully continue to vault list
  }

  // 2. Include Express server `uploads/recordings` items if available
  try {
    const resp = await fetch('/api/uploads/recordings');
    if (resp.ok) {
      const data = (await resp.json()) as {
        recordings?: {
          filename: string;
          url: string;
          storagePath: string;
          mimeType: string;
          size: number;
          createdAtMs: number;
        }[];
      };
      if (Array.isArray(data.recordings)) {
        for (const item of data.recordings) {
          results.push({
            id: `vault-${item.filename}`,
            title: item.filename
              .replace(/^\d+_[a-f0-9]+_/, '')
              .replace(/\.(webm|mp4)$/i, '')
              .replace(/_/g, ' '),
            meetingId: 'ammon-vault',
            url: item.url,
            storagePath: item.storagePath,
            bucketName,
            mimeType: item.mimeType || 'video/webm',
            sizeLabel: formatSizeLabel(item.size || 0),
            recordedAt: new Date(item.createdAtMs || Date.now()).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            createdAtMs: item.createdAtMs || Date.now(),
            provider: 'ammon-vault',
          });
        }
      }
    }
  } catch {
    // Ignore vault error on static hosts
  }

  return results.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

/**
 * Remove a stored recording object from AMMON Firebase Storage (`recordings/...`) or Express vault.
 */
export async function deleteMeetingRecordingAsset(storagePath: string, url?: string): Promise<void> {
  if (storagePath && !url?.startsWith('/api/uploads/')) {
    try {
      await deleteObject(storageRef(storage, storagePath));
      return;
    } catch {
      // Fallback below if stored in Express vault
    }
  }
  if (url && url.startsWith('/api/uploads/recordings/')) {
    const filename = url.split('/').pop();
    if (filename) {
      await fetch(`/api/uploads/recordings/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  }
}

/**
 * Permanently delete a chat message's photo, video, audio, or document attachment from Firebase Storage.
 * Express vault cleanup (`/api/uploads/chat-media/...`) is handled by the Super Admin backend endpoint.
 */
export async function deleteChatMediaAsset(
  attachmentData?: string,
  attachmentStoragePath?: string
): Promise<void> {
  try {
    if (attachmentStoragePath && attachmentStoragePath.startsWith('ammon-chat-media/')) {
      await deleteObject(storageRef(storage, attachmentStoragePath));
      return;
    }
    if (
      attachmentData &&
      attachmentData.includes('firebasestorage.googleapis.com') &&
      attachmentData.includes('ammon-chat-media')
    ) {
      const match = attachmentData.match(/\/o\/([^?]+)/);
      if (match && match[1]) {
        const decodedPath = decodeURIComponent(match[1]);
        if (decodedPath.startsWith('ammon-chat-media/')) {
          await deleteObject(storageRef(storage, decodedPath));
        }
      }
    }
  } catch (err) {
    console.warn('Chat media Firebase Storage delete note:', err instanceof Error ? err.message : err);
  }
}
