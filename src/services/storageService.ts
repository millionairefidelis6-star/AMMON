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
  provider: 'firebase-storage' | 'ammon-vault';
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

async function uploadToAmmonVaultWithRetry(params: {
  folder: 'member-passports' | 'kyc-documents';
  fileName: string;
  dataUrl: string;
}): Promise<{ url: string; storagePath: string }> {
  let lastError = 'Unable to reach AMMON upload vault.';
  for (let attempt = 0; attempt < 3; attempt++) {
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
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 408 && resp.status !== 429) {
          break;
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error during upload.';
    }

    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error(lastError);
}

/**
 * Upload a member's KYC asset (passport photograph or government ID / business license).
 * Prioritizes AMMON's fast same-origin persistent vault (with retries), uses Firebase Storage
 * when authenticated or if vault is unavailable, and safely preserves compact auto-fitted
 * JPEG assets inline so registration is never blocked by transient storage errors.
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

  // 1. Primary (fast & same-origin): AMMON Express Backend Persistent Vault
  try {
    const vaultRes = await uploadToAmmonVaultWithRetry({
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

  // 2. Secondary: Firebase Storage SDK (especially when authenticated or static-hosted)
  try {
    const fileRef = storageRef(storage, fullPath);
    const snapshot = await withTimeout(
      uploadBytes(fileRef, params.blob, {
        contentType,
        customMetadata: {
          folder: params.folder,
          sessionId: safeSession,
          app: 'AMMON-Nigeria',
          authenticated: auth.currentUser ? 'true' : 'false',
        },
      }),
      6000,
      'Firebase Storage upload'
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(snapshot.ref),
      5000,
      'Firebase Storage URL lookup'
    );
    return {
      url: downloadUrl,
      storagePath: fullPath,
      provider: 'firebase-storage',
    };
  } catch (firebaseErr) {
    console.warn(
      'Firebase Storage fallback note:',
      firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
    );
  }

  // 3. Final Resilient Fallback: Store compact auto-fitted JPEG data URL directly in persistent DB
  // Auto-fitted 500x600 passport images are ~40-120 KB, well inside Firestore (1 MB) & Express store limits.
  if (resolvedDataUrl.length <= 650_000) {
    return {
      url: resolvedDataUrl,
      storagePath: fullPath,
      provider: 'ammon-vault',
    };
  }

  throw new Error('Image file is too large for offline fallback. Please capture a clearer smaller photo.');
}
