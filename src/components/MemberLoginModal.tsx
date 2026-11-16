import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  AlertCircle, 
  KeyRound,
  ShieldAlert,
  Crown,
  Mail,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { Member, AdminUser } from '../types';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAILS,
  db,
  logOutFirebase,
  sendPasswordReset,
  signInSuperAdminWithGoogle,
  signInWithFirebasePassword,
} from '../firebase';
import { INITIAL_EXECUTIVE_ACCOUNTS } from '../data/hierarchyData';
import {
  ExecutiveApiError,
  exchangeFirebaseToken,
  loginExecutive,
  loginMemberApi,
  setStoredExecutiveToken,
  setupExecutivePassword,
} from '../services/executiveApi';
import { updateMemberInFirestore } from '../services/firestoreService';
import { verifyMemberPasswordClient } from '../utils/passwordAuth';

interface MemberLoginModalProps {
  members: Member[];
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (member: Member) => void;
  onRequireEmailOtp?: (member: Member) => void;
  onAdminLoginSuccess?: (admin: AdminUser) => void;
  onOpenRegister: () => void;
  defaultTab?: 'operator' | 'admin';
}

export const MemberLoginModal: React.FC<MemberLoginModalProps> = ({
  members,
  isOpen,
  onClose,
  onLoginSuccess,
  onRequireEmailOtp,
  onAdminLoginSuccess,
  onOpenRegister,
  defaultTab = 'operator',
}) => {
  const [activeTab, setActiveTab] = useState<'operator' | 'admin'>(defaultTab);

  // Operator credentials
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showOperatorPassword, setShowOperatorPassword] = useState(false);

  // Admin credentials
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Mandatory First-Login Password Setup State (for Super Admin invited executives)
  const [passwordSetupChallenge, setPasswordSetupChallenge] = useState<{
    email: string;
    fullName: string;
    position: string;
    jurisdiction: string;
    inviteCodeOrTemp: string;
  } | null>(null);
  const [newPersonalPassword, setNewPersonalPassword] = useState('');
  const [confirmPersonalPassword, setConfirmPersonalPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot Password / Recovery States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleOpenForgotPassword = () => {
    setErrorMsg('');
    setResetError('');
    setResetSuccess(false);

    if (activeTab === 'admin') {
      if (adminEmail && adminEmail.includes('@')) {
        setResetEmail(adminEmail.trim());
      } else {
        setResetEmail('');
      }
    } else {
      const clean = identifier.trim().toLowerCase();
      if (clean.includes('@')) {
        setResetEmail(identifier.trim());
      } else if (clean) {
        const found = members.find(
          (m) =>
            m.membershipId.toLowerCase() === clean ||
            m.phone.replace(/\s+/g, '').includes(clean.replace(/\s+/g, '')) ||
            m.fullName.toLowerCase().includes(clean)
        );
        if (found?.email) {
          setResetEmail(found.email);
        } else {
          setResetEmail('');
        }
      } else {
        setResetEmail('');
      }
    }
    setIsForgotPassword(true);
  };

  const handleSendPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    const emailToSend = resetEmail.trim();
    if (!emailToSend || !emailToSend.includes('@')) {
      setResetError('Please enter a valid registered email address.');
      return;
    }

    setIsResetting(true);
    try {
      await sendPasswordReset(emailToSend);
      setResetSuccess(true);
    } catch (err: unknown) {
      console.error('Password reset failed:', err);
      let message = 'Unable to send password reset email. Please verify the email address or try again.';
      if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code: string }).code;
        if (code === 'auth/user-not-found') {
          message = 'No registered AMMON account found matching this email address.';
        } else if (code === 'auth/invalid-email') {
          message = 'The email address entered is not valid.';
        } else if (code === 'auth/too-many-requests') {
          message = 'Too many requests. Please wait a short moment and try again.';
        } else if (code === 'auth/network-request-failed') {
          message = 'Network connectivity issue. Please check your internet connection.';
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setResetError(message);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  // Handle strict operator authentication (password match + mandatory email OTP check)
  const handleOperatorLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId || !pin) {
      setErrorMsg('Please enter your Membership ID / Email and your account password.');
      return;
    }

    setIsLoading(true);
    try {
      const apiRes = await loginMemberApi(cleanId, pin);
      if (apiRes.status === 'OTP_VERIFICATION_REQUIRED') {
        if (onRequireEmailOtp) {
          onRequireEmailOtp(apiRes.member);
        } else {
          setErrorMsg('Email OTP verification is required before entering your dashboard.');
        }
        return;
      }
      if (apiRes.status === 'AUTHENTICATED') {
        onLoginSuccess(apiRes.member);
        return;
      }
    } catch (apiErr: unknown) {
      const errStatus =
        apiErr && typeof apiErr === 'object' && 'status' in apiErr
          ? Number((apiErr as { status: unknown }).status)
          : 0;

      // If password was reset via Firebase Auth or backend /api is unavailable (404), verify with Firebase Auth
      const cleanDigits = cleanId.replace(/\s+/g, '');
      const matched = members.find(
        (m) =>
          m.membershipId.toLowerCase() === cleanId ||
          m.email.toLowerCase() === cleanId ||
          (cleanDigits.length >= 7 && m.phone.replace(/\s+/g, '').includes(cleanDigits))
      );

      const candidateEmail = cleanId.includes('@') ? cleanId : matched?.email?.toLowerCase();
      if (candidateEmail && (errStatus === 401 || errStatus === 404 || errStatus === 0 || errStatus >= 500)) {
        try {
          await signInWithFirebasePassword(candidateEmail, pin);
          if (matched) {
            const verifiedMember: Member = { ...matched, emailVerified: true };
            if (!matched.emailVerified) {
              updateMemberInFirestore(matched.id, { emailVerified: true }).catch(() => {});
            }
            onLoginSuccess(verifiedMember);
            return;
          }
          // Check Firestore members if not yet hydrated locally
          const snap = await getDocs(
            query(collection(db, 'members'), where('email', '==', candidateEmail))
          ).catch(() => null);
          const firstDoc = snap?.docs?.[0]?.data() as Member | undefined;
          if (firstDoc) {
            const verifiedMember: Member = { ...firstDoc, emailVerified: true };
            onLoginSuccess(verifiedMember);
            return;
          }
        } catch {
          // Continue to local hash check / error reporting
        }
      }

      if (errStatus === 400 || errStatus === 401 || errStatus === 403) {
        setErrorMsg(
          apiErr instanceof Error
            ? apiErr.message
            : 'Incorrect credentials. Password must match the exact password created during sign-up.'
        );
        setIsLoading(false);
        return;
      }

      if (!matched) {
        setErrorMsg(
          'No matching registered operator found. Please check your Membership ID, Email, or Phone, or register as a new member.'
        );
        setIsLoading(false);
        return;
      }

      const passwordMatches = await verifyMemberPasswordClient(
        pin,
        matched.passwordHash,
        matched.passwordSalt
      );
      if (!passwordMatches) {
        setErrorMsg(
          'Incorrect password. Please enter the exact password created during registration.'
        );
        setIsLoading(false);
        return;
      }

      if (matched.emailVerified !== true) {
        if (onRequireEmailOtp) {
          onRequireEmailOtp(matched);
        } else {
          setErrorMsg('Please verify your registered email address with OTP before logging in.');
        }
        setIsLoading(false);
        return;
      }

      onLoginSuccess(matched);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveExecutiveFromFirebaseClient = async (
    uid: string,
    email: string
  ): Promise<AdminUser | null> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Firestore executives document by UID
    try {
      const uidDoc = await getDoc(doc(db, 'executives', uid));
      if (uidDoc.exists()) {
        const execData = uidDoc.data() as AdminUser;
        if (execData.activationStatus !== 'Suspended') {
          return { ...execData, uid };
        }
      }
    } catch {
      // Fall back to bootstrapped/seeded Super Admin & Executive definitions
    }

    // 2. Bootstrapped Super Admin access (millionairefidelis@gmail.com or superadmin@ammon.ng)
    if (BOOTSTRAPPED_SUPER_ADMIN_EMAILS.includes(cleanEmail)) {
      const superSeed = INITIAL_EXECUTIVE_ACCOUNTS.find((a) => a.id === 'exec-super');
      if (superSeed) {
        const { defaultPassword: _dp, ...safeSuper } = superSeed;
        return {
          ...safeSuper,
          uid,
          email: cleanEmail,
          role: 'Super Admin',
          level: 'super_admin',
          activationStatus: 'Active',
          requiresPasswordSetup: false,
        };
      }
    }

    // 3. Seeded hierarchy executive match by email
    const seedMatch = INITIAL_EXECUTIVE_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === cleanEmail
    );
    if (seedMatch) {
      const { defaultPassword: _dp, ...safeSeed } = seedMatch;
      return {
        ...safeSeed,
        uid,
        activationStatus: 'Active',
        requiresPasswordSetup: false,
      };
    }

    // 4. Query Firestore executives collection by email
    try {
      const qSnap = await getDocs(
        query(collection(db, 'executives'), where('email', '==', cleanEmail))
      );
      if (!qSnap.empty) {
        const docData = qSnap.docs[0].data() as AdminUser;
        if (docData.activationStatus !== 'Suspended') {
          return { ...docData, uid };
        }
      }
    } catch {
      // Not authorized or absent in Firestore
    }

    return null;
  };

  // Handle unified executive authentication across all hierarchical levels
  const authenticateExecutive = async (emailOrBadge: string, pass: string) => {
    setErrorMsg('');
    setIsLoading(true);
    const cleanInput = emailOrBadge.trim();
    const cleanLower = cleanInput.toLowerCase();

    const matchedSeed = INITIAL_EXECUTIVE_ACCOUNTS.find(
      (a) =>
        a.email.toLowerCase() === cleanLower ||
        a.badgeNumber.toLowerCase() === cleanLower ||
        (cleanLower === 'millionairefidelis@gmail.com' && a.id === 'exec-super')
    );
    const candidateEmail = cleanLower.includes('@')
      ? cleanLower
      : matchedSeed?.email.toLowerCase();

    try {
      const res = await loginExecutive(cleanInput, pass);
      if (res.status === 'PASSWORD_SETUP_REQUIRED') {
        setPasswordSetupChallenge({
          email: res.email,
          fullName: res.fullName,
          position: res.position,
          jurisdiction: res.jurisdiction,
          inviteCodeOrTemp: pass,
        });
        return;
      }
      if (res.status === 'AUTHENTICATED' && onAdminLoginSuccess) {
        if (candidateEmail) {
          signInWithFirebasePassword(candidateEmail, pass).catch(() => {});
        }
        onAdminLoginSuccess(res.executive);
        return;
      }
    } catch (err) {
      const errStatus =
        err instanceof ExecutiveApiError
          ? err.status
          : err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: unknown }).status)
          : 0;

      // Fallback to Firebase Authentication when password was reset via Forgot Password or /api returns 404
      if (candidateEmail && (errStatus === 404 || errStatus === 401 || errStatus === 0 || errStatus >= 500)) {
        try {
          const { user, idToken } = await signInWithFirebasePassword(candidateEmail, pass);
          try {
            const exchanged = await exchangeFirebaseToken(idToken);
            if (exchanged.status === 'AUTHENTICATED' && onAdminLoginSuccess) {
              onAdminLoginSuccess({
                ...exchanged.executive,
                email: candidateEmail,
              });
              return;
            }
          } catch (exchangeErr) {
            const exStatus =
              exchangeErr instanceof ExecutiveApiError ? exchangeErr.status : 0;
            if (exStatus !== 404 && exStatus !== 0 && exStatus < 500) {
              throw exchangeErr;
            }
          }

          // Static / serverless deployment fallback after verified Firebase Auth login
          const resolvedExec = await resolveExecutiveFromFirebaseClient(
            user.uid,
            user.email || candidateEmail
          );
          if (resolvedExec && onAdminLoginSuccess) {
            setStoredExecutiveToken(`firebase-session:${user.uid}`);
            onAdminLoginSuccess(resolvedExec);
            return;
          }

          setErrorMsg(
            'Your Firebase password was verified, but no AMMON Executive or Super Admin role is linked to this email.'
          );
          return;
        } catch (fbErr: unknown) {
          const fbCode =
            fbErr && typeof fbErr === 'object' && 'code' in fbErr
              ? String((fbErr as { code: unknown }).code)
              : '';
          if (
            errStatus !== 404 &&
            (fbCode === 'auth/wrong-password' ||
              fbCode === 'auth/invalid-credential' ||
              fbCode === 'auth/user-not-found')
          ) {
            setErrorMsg('Invalid executive email/badge or password. Please verify and try again.');
            return;
          }
          if (fbErr instanceof ExecutiveApiError) {
            setErrorMsg(fbErr.message);
            return;
          }
        }
      }

      // If running in static preview where /api/* returns 404, verify seeded executive credentials cleanly
      if (errStatus === 404 && matchedSeed && matchedSeed.defaultPassword === pass && onAdminLoginSuccess) {
        const { defaultPassword: _dp, ...safeExec } = matchedSeed;
        setStoredExecutiveToken(`static-preview:${matchedSeed.id}`);
        onAdminLoginSuccess({
          ...safeExec,
          ...(cleanLower === 'millionairefidelis@gmail.com' ? { email: 'millionairefidelis@gmail.com' } : {}),
        });
        return;
      }

      if (errStatus === 404) {
        setErrorMsg(
          'Invalid executive email/badge or password. If you reset your password via email, verify you are using your new password.'
        );
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Invalid Executive credentials. Please check your institutional email/badge and password.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await authenticateExecutive(adminEmail, adminPassword);
  };

  const handleGoogleSuperAdminLogin = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);
    try {
      const { user, idToken } = await signInSuperAdminWithGoogle();
      const verifiedEmail = (user.email || '').trim().toLowerCase();

      try {
        const exchanged = await exchangeFirebaseToken(idToken);
        if (exchanged.status === 'AUTHENTICATED' && onAdminLoginSuccess) {
          onAdminLoginSuccess({
            ...exchanged.executive,
            email: verifiedEmail || exchanged.executive.email,
          });
          return;
        }
      } catch (exchangeErr) {
        const exStatus =
          exchangeErr instanceof ExecutiveApiError ? exchangeErr.status : 0;
        if (exStatus === 403 || exStatus === 401 || exStatus === 400) {
          await logOutFirebase().catch(() => {});
          throw exchangeErr;
        }
        // Continue to client-verified Super Admin fallback when backend /api is unavailable (404/network)
      }

      const resolvedExec = await resolveExecutiveFromFirebaseClient(
        user.uid,
        verifiedEmail
      );
      if (
        resolvedExec &&
        (resolvedExec.level === 'super_admin' || resolvedExec.role === 'Super Admin') &&
        onAdminLoginSuccess
      ) {
        setStoredExecutiveToken(`firebase-session:${user.uid}`);
        onAdminLoginSuccess(resolvedExec);
        return;
      }

      await logOutFirebase().catch(() => {});
      setErrorMsg(
        'Access Denied: Google authentication is restricted exclusively to the AMMON Super Admin account.'
      );
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg('Google sign-in popup was closed before completing authentication.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(
          'This domain is not yet allowlisted in Firebase Authentication Authorized Domains.'
        );
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Unable to authenticate Super Admin via Google.'
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCompletePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordSetupChallenge) return;
    setErrorMsg('');

    if (newPersonalPassword.length < 8) {
      setErrorMsg('Personal password must be at least 8 characters.');
      return;
    }
    if (newPersonalPassword !== confirmPersonalPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await setupExecutivePassword(
        passwordSetupChallenge.email,
        passwordSetupChallenge.inviteCodeOrTemp,
        newPersonalPassword
      );
      setPasswordSetupChallenge(null);
      setNewPersonalPassword('');
      setConfirmPersonalPassword('');
      if (onAdminLoginSuccess) {
        onAdminLoginSuccess(res.executive);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to set personal password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Mode Switcher */}
        <div className="bg-[#176B37] text-white px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
                {isForgotPassword ? (
                  <KeyRound className="w-5 h-5 text-emerald-200" />
                ) : activeTab === 'operator' ? (
                  <Lock className="w-5 h-5 text-emerald-200" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-emerald-200" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  {isForgotPassword
                    ? 'Account Password Recovery'
                    : activeTab === 'operator'
                    ? 'Member Portal Login'
                    : 'Directorate & Executive Access'}
                </h3>
                <p className="text-xs text-emerald-100">
                  {isForgotPassword
                    ? 'Reset your password securely via Firebase Authentication'
                    : activeTab === 'operator'
                    ? 'Access your operator dashboard, digital ID card & dues receipts'
                    : 'Institutional governance, registry oversight & treasury audit'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex bg-[#14532D] p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('operator');
                setIsForgotPassword(false);
                setErrorMsg('');
                setResetError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isForgotPassword && activeTab === 'operator'
                  ? 'bg-white text-[#176B37] shadow-sm'
                  : 'text-emerald-100 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>POS Operator Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setIsForgotPassword(false);
                setErrorMsg('');
                setResetError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isForgotPassword && activeTab === 'admin'
                  ? 'bg-white text-[#176B37] shadow-sm'
                  : 'text-emerald-100 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Executive & Super Admin</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {errorMsg && !isForgotPassword && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          {/* FORGOT PASSWORD RECOVERY VIEW (FIREBASE AUTH) */}
          {isForgotPassword ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetError('');
                    setResetSuccess(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B37] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Firebase Account Recovery
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-[#252525]">
                  Recover Account Access
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Enter your registered AMMON operator or executive email address below. We will send an official
                  password reset link directly to your inbox via Firebase Authentication.
                </p>
              </div>

              {resetError && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-800 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">{resetError}</span>
                </div>
              )}

              {resetSuccess ? (
                <div className="p-4 bg-[#EAF3ED] border border-[#176B37]/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5 text-[#14532D]">
                    <div className="w-8 h-8 rounded-full bg-[#176B37] text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#14532D]">Password Reset Email Dispatched!</h5>
                      <p className="text-[11px] text-gray-600">
                        Instructions sent to <strong className="text-[#176B37] font-mono">{resetEmail}</strong>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed">
                    Firebase Authentication has dispatched a password reset link to your email. 
                    Please check your inbox (and spam/junk folder) and click the link to choose a new password, 
                    then return here to sign in.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setResetSuccess(false);
                        setResetError('');
                      }}
                      className="flex-1 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl text-center transition-colors cursor-pointer text-xs"
                    >
                      Return to Member Sign In
                    </button>
                    <button
                      type="button"
                      onClick={handleSendPasswordResetSubmit}
                      disabled={isResetting}
                      className="py-2.5 px-4 bg-white border border-[#176B37]/30 text-[#176B37] hover:bg-[#EAF3ED] font-semibold rounded-xl text-center transition-colors cursor-pointer text-xs"
                    >
                      {isResetting ? 'Resending...' : 'Resend Email'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendPasswordResetSubmit} className="space-y-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Registered Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. millionairefidelis@gmail.com or superadmin@ammon.ng"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-600 text-[11px] leading-relaxed flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#176B37] shrink-0 mt-0.5" />
                    <span>
                      Password reset security is handled and verified by Google Firebase Authentication for the Association of Mobile Money Operators of Nigeria.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full py-3 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Reset Email via Firebase...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Password Reset Email</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setResetError('');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                    >
                      Cancel and Return to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* TAB 1: POS OPERATOR LOGIN */}
              {activeTab === 'operator' && (
                <>
                  <form onSubmit={handleOperatorLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Membership ID, Registered Email, or Phone *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="Enter Membership ID, Email, or Phone"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-gray-700">
                          Account Password *
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenForgotPassword}
                          className="text-[11px] text-[#176B37] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3 text-[#176B37]" />
                          <span>Forgot Password?</span>
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showOperatorPassword ? 'text' : 'password'}
                          required
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="Enter the password created during registration"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOperatorPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                          aria-label={showOperatorPassword ? 'Hide password' : 'Show password'}
                        >
                          {showOperatorPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#176B37] rounded"
                    />
                    <span>Remember this terminal/device</span>
                  </label>

                  <span className="text-gray-400">AMMON Central Auth</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Authenticating Operator...</span>
                  ) : (
                    <>
                      <span>Sign In to Member Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

                <div className="p-3 bg-gray-50 rounded-xl border border-[#E5E7EB] text-[11px] text-gray-600 flex items-center justify-between">
                  <span>Enrolled Members Registry:</span>
                  <strong className="font-mono text-[#176B37]">
                    {members.length.toLocaleString()} {members.length === 1 ? 'Member' : 'Members'}
                  </strong>
                </div>

              {/* Register Prompt */}
              <div className="pt-3 border-t border-[#E5E7EB] text-center">
                <p className="text-gray-600 text-xs">
                  Not yet a registered AMMON operator?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRegister();
                    }}
                    className="font-bold text-[#176B37] hover:underline cursor-pointer"
                  >
                    Register Your POS Kiosk Now →
                  </button>
                </p>
              </div>
            </>
          )}

          {/* TAB 2: EXECUTIVE & SUPER ADMIN LOGIN */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              {passwordSetupChallenge ? (
                <form
                  onSubmit={handleCompletePasswordSetup}
                  className="p-4 bg-[#EAF3ED] border border-[#176B37]/40 rounded-2xl space-y-3.5 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-[#176B37]/20 pb-2">
                    <div className="flex items-center gap-2 text-[#14532D] font-bold text-xs">
                      <KeyRound className="w-4 h-4 text-[#176B37]" />
                      <span>Mandatory Personal Password Setup</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPasswordSetupChallenge(null)}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    Welcome, <strong>{passwordSetupChallenge.fullName}</strong> ({passwordSetupChallenge.position} ·{' '}
                    <strong className="text-[#176B37]">{passwordSetupChallenge.jurisdiction}</strong>). Because this is your first login with a Super Admin invitation credential, establish your personal secure password before entering your dashboard.
                  </p>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      New Personal Password (min 8 chars) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPersonalPassword}
                      onChange={(e) => setNewPersonalPassword(e.target.value)}
                      placeholder="Enter secure personal password"
                      className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Confirm Personal Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPersonalPassword}
                      onChange={(e) => setConfirmPersonalPassword(e.target.value)}
                      placeholder="Confirm personal password"
                      className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37] text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Activating Executive Account...' : 'Activate Account & Enter Dashboard'}
                  </button>
                </form>
              ) : (
                <>
                  {/* Unified Executive Sign-In Form */}
                  <form onSubmit={handleAdminLoginSubmit} className="space-y-3 pt-1">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Institutional Email or Badge ID *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="e.g. bayelsa.state@ammon.ng or AMMON-BY-001"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-gray-700">
                          Executive Password or Invite Temp Password *
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenForgotPassword}
                          className="text-[11px] text-[#176B37] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3 text-[#176B37]" />
                          <span>Forgot Password?</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showAdminPassword ? 'text' : 'password'}
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                          aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                        >
                          {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || isGoogleLoading}
                      className="w-full py-3 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span>Verifying Directorate Clearance...</span>
                      ) : (
                        <>
                          <span>Enter Executive Dashboard</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Super Admin Only Google Authentication */}
                  <div className="relative flex items-center py-1">
                    <div className="grow border-t border-[#E5E7EB]" />
                    <span className="shrink mx-3 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-600" />
                      <span>Super Admin Only</span>
                    </span>
                    <div className="grow border-t border-[#E5E7EB]" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSuperAdminLogin}
                    disabled={isLoading || isGoogleLoading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-[#E5E7EB] hover:border-[#176B37]/40 rounded-xl font-bold text-xs text-[#252525] flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGoogleLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#176B37]" />
                        <span>Verifying Super Admin Google Account...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                          />
                        </svg>
                        <span>Continue with Google (Super Admin Only)</span>
                      </>
                    )}
                  </button>

                  <div className="p-3 bg-gray-50 rounded-xl border border-[#E5E7EB] text-[11px] text-gray-600 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#176B37] shrink-0" />
                    <span>Google SSO is locked exclusively to the Super Admin account. Other executives &amp; operators sign in with email/badge and password.</span>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

        </div>
      </div>
    </div>
  );
};
