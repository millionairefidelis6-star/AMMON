import { getApp, getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore,
  Firestore,
  doc, 
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  getMetadata,
  deleteObject,
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const viteEnv = (import.meta as { env?: Record<string, string | undefined> })?.env || {};

const resolvedConfig = {
  projectId: viteEnv.VITE_AMMON_FIREBASE_PROJECT_ID?.trim() || firebaseConfig.projectId,
  appId: viteEnv.VITE_AMMON_FIREBASE_APP_ID?.trim() || firebaseConfig.appId,
  apiKey: viteEnv.VITE_AMMON_FIREBASE_API_KEY?.trim() || firebaseConfig.apiKey,
  authDomain: viteEnv.VITE_AMMON_FIREBASE_AUTH_DOMAIN?.trim() || firebaseConfig.authDomain,
  messagingSenderId:
    viteEnv.VITE_AMMON_FIREBASE_MESSAGING_SENDER_ID?.trim() || firebaseConfig.messagingSenderId,
  measurementId:
    viteEnv.VITE_AMMON_FIREBASE_MEASUREMENT_ID?.trim() || firebaseConfig.measurementId,
  firestoreDatabaseId:
    viteEnv.VITE_AMMON_FIRESTORE_DATABASE_ID?.trim() || firebaseConfig.firestoreDatabaseId,
  storageBucket:
    viteEnv.VITE_AMMON_STORAGE_BUCKET?.trim() || firebaseConfig.storageBucket || '',
};

const AMMON_APP_NAME = 'ammon-app';

// Initialize isolated AMMON Firebase App instance
const app: FirebaseApp =
  getApps().find((a) => a.name === AMMON_APP_NAME) ||
  initializeApp(
    {
      projectId: resolvedConfig.projectId,
      appId: resolvedConfig.appId,
      apiKey: resolvedConfig.apiKey,
      authDomain: resolvedConfig.authDomain,
      messagingSenderId: resolvedConfig.messagingSenderId,
      measurementId: resolvedConfig.measurementId,
      storageBucket: resolvedConfig.storageBucket,
    },
    AMMON_APP_NAME
  );

// CRITICAL: Must pass firestoreDatabaseId; force long-polling to avoid 10s WebChannel stalls in iframes/mobile networks
function createFirestoreClient(): Firestore {
  try {
    return initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      resolvedConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, resolvedConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreClient();
export const auth = getAuth(app);
export const STORAGE_BUCKET = resolvedConfig.storageBucket;
export const storage = getStorage(
  app,
  STORAGE_BUCKET ? `gs://${STORAGE_BUCKET}` : undefined
);
export {
  onAuthStateChanged,
  sendPasswordResetEmail,
  storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  getMetadata,
  deleteObject,
  type FirebaseUser,
};

// Standard Error Handler per Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p: { providerId: string; email: string | null }) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on Boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status:', error.message);
    }
  }
}
testFirestoreConnection();

export async function logOutFirebase(): Promise<void> {
  await signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export const BOOTSTRAPPED_SUPER_ADMIN_EMAILS = [
  'millionairefidelis@gmail.com',
  'superadmin@ammon.ng',
];

export async function signInWithFirebasePassword(
  email: string,
  password: string
): Promise<{ user: FirebaseUser; idToken: string }> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const idToken = await cred.user.getIdToken(true);
  return { user: cred.user, idToken };
}

export async function signInSuperAdminWithGoogle(): Promise<{
  user: FirebaseUser;
  idToken: string;
}> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const email = (cred.user.email || '').trim().toLowerCase();
  if (!BOOTSTRAPPED_SUPER_ADMIN_EMAILS.includes(email)) {
    await signOut(auth);
    throw new Error(
      `Access Denied: Google authentication is restricted exclusively to the Super Admin account. "${
        cred.user.email || 'Selected Google account'
      }" is not authorized.`
    );
  }
  const idToken = await cred.user.getIdToken(true);
  return { user: cred.user, idToken };
}
