import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDocFromServer
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  getMetadata,
  deleteObject
} from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";
const viteEnv = import.meta?.env || {};
const resolvedConfig = {
  projectId: viteEnv.VITE_AMMON_FIREBASE_PROJECT_ID?.trim() || firebaseConfig.projectId,
  appId: viteEnv.VITE_AMMON_FIREBASE_APP_ID?.trim() || firebaseConfig.appId,
  apiKey: viteEnv.VITE_AMMON_FIREBASE_API_KEY?.trim() || firebaseConfig.apiKey,
  authDomain: viteEnv.VITE_AMMON_FIREBASE_AUTH_DOMAIN?.trim() || firebaseConfig.authDomain,
  messagingSenderId: viteEnv.VITE_AMMON_FIREBASE_MESSAGING_SENDER_ID?.trim() || firebaseConfig.messagingSenderId,
  measurementId: viteEnv.VITE_AMMON_FIREBASE_MEASUREMENT_ID?.trim() || firebaseConfig.measurementId,
  firestoreDatabaseId: viteEnv.VITE_AMMON_FIRESTORE_DATABASE_ID?.trim() || firebaseConfig.firestoreDatabaseId,
  storageBucket: viteEnv.VITE_AMMON_STORAGE_BUCKET?.trim() || firebaseConfig.storageBucket || ""
};
const AMMON_APP_NAME = "ammon-app";
const app = getApps().find((a) => a.name === AMMON_APP_NAME) || initializeApp(
  {
    projectId: resolvedConfig.projectId,
    appId: resolvedConfig.appId,
    apiKey: resolvedConfig.apiKey,
    authDomain: resolvedConfig.authDomain,
    messagingSenderId: resolvedConfig.messagingSenderId,
    measurementId: resolvedConfig.measurementId,
    storageBucket: resolvedConfig.storageBucket
  },
  AMMON_APP_NAME
);
function createFirestoreClient() {
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
const db = createFirestoreClient();
const auth = getAuth(app);
const STORAGE_BUCKET = resolvedConfig.storageBucket;
const storage = getStorage(
  app,
  STORAGE_BUCKET ? `gs://${STORAGE_BUCKET}` : void 0
);
const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write"
};
function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore offline status:", error.message);
    }
  }
}
testFirestoreConnection();
async function logOutFirebase() {
  await signOut(auth);
}
async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}
const BOOTSTRAPPED_SUPER_ADMIN_EMAILS = [
  "millionairefidelis@gmail.com",
  "superadmin@ammon.ng"
];
async function signInWithFirebasePassword(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const idToken = await cred.user.getIdToken(true);
  return { user: cred.user, idToken };
}
async function signInSuperAdminWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  const email = (cred.user.email || "").trim().toLowerCase();
  if (!BOOTSTRAPPED_SUPER_ADMIN_EMAILS.includes(email)) {
    await signOut(auth);
    throw new Error(
      `Access Denied: Google authentication is restricted exclusively to the Super Admin account. "${cred.user.email || "Selected Google account"}" is not authorized.`
    );
  }
  const idToken = await cred.user.getIdToken(true);
  return { user: cred.user, idToken };
}
export {
  BOOTSTRAPPED_SUPER_ADMIN_EMAILS,
  OperationType,
  STORAGE_BUCKET,
  auth,
  db,
  deleteObject,
  getDownloadURL,
  getMetadata,
  handleFirestoreError,
  listAll,
  logOutFirebase,
  onAuthStateChanged,
  sendPasswordReset,
  sendPasswordResetEmail,
  signInSuperAdminWithGoogle,
  signInWithFirebasePassword,
  storage,
  storageRef,
  testFirestoreConnection,
  uploadBytes,
  uploadBytesResumable
};
