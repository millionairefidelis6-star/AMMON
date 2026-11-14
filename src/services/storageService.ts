import {
  auth,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
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
