import {
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

/**
 * Upload a member's KYC asset (passport photograph or government ID / business license)
 * directly to Firebase Storage, with automatic fallback to AMMON's backend vault if
 * preview storage rules or bucket policies reject unauthenticated browser uploads.
 */
export async function uploadMemberKycAsset(params: {
  blob: Blob;
  folder: 'member-passports' | 'kyc-documents';
  sessionId: string;
  fileName: string;
  contentType?: string;
}): Promise<KycUploadResult> {
  const safeSession = params.sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeFile = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fullPath = `ammon-kyc/${params.folder}/${safeSession}/${Date.now()}_${safeFile}`;
  const contentType = params.contentType || params.blob.type || 'image/jpeg';

  // Primary: Firebase Storage SDK upload
  try {
    const fileRef = storageRef(storage, fullPath);
    const snapshot = await withTimeout(
      uploadBytes(fileRef, params.blob, {
        contentType,
        customMetadata: {
          folder: params.folder,
          sessionId: safeSession,
          app: 'AMMON-Nigeria',
        },
      }),
      10000,
      'Firebase Storage upload'
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(snapshot.ref),
      8000,
      'Firebase Storage URL lookup'
    );
    return {
      url: downloadUrl,
      storagePath: fullPath,
      provider: 'firebase-storage',
    };
  } catch (firebaseErr) {
    console.warn(
      'Firebase Storage upload fallback triggered:',
      firebaseErr instanceof Error ? firebaseErr.message : firebaseErr
    );
  }

  // Resilient Fallback: AMMON Express Backend Secure Upload Vault
  const dataUrl = await blobToBase64DataUrl(params.blob);
  const resp = await fetch('/api/uploads/kyc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder: params.folder,
      fileName: safeFile,
      dataUrl,
    }),
  });

  if (!resp.ok) {
    const errPayload = await resp.json().catch(() => ({}));
    throw new Error(errPayload.error || 'Failed to securely store KYC image asset.');
  }

  const data = (await resp.json()) as { url: string; storagePath: string };
  return {
    url: data.url,
    storagePath: data.storagePath,
    provider: 'ammon-vault',
  };
}
