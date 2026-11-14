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
  Loader2
} from 'lucide-react';
import { Member, AdminUser } from '../types';
import { signInWithGoogle, sendPasswordReset } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';
import {
  exchangeFirebaseToken,
  loginExecutive,
  setupExecutivePassword,
} from '../services/executiveApi';

interface MemberLoginModalProps {
  members: Member[];
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (member: Member) => void;
  onAdminLoginSuccess?: (admin: AdminUser) => void;
  onGoogleLoginSuccess?: (user: FirebaseUser) => void;
  onOpenRegister: () => void;
  defaultTab?: 'operator' | 'admin';
}

export const MemberLoginModal: React.FC<MemberLoginModalProps> = ({
  members,
  isOpen,
  onClose,
  onLoginSuccess,
  onAdminLoginSuccess,
  onGoogleLoginSuccess,
  onOpenRegister,
  defaultTab = 'operator',
}) => {
  const [activeTab, setActiveTab] = useState<'operator' | 'admin'>(defaultTab);

  // Operator credentials
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');

  // Admin credentials
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

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
        setResetEmail('superadmin@ammon.ng');
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

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      if (activeTab === 'admin') {
        try {
          const idToken = await user.getIdToken();
          const res = await exchangeFirebaseToken(idToken);
          if (onAdminLoginSuccess) {
            onAdminLoginSuccess(res.executive);
            return;
          }
        } catch (exchangeErr) {
          setErrorMsg(
            exchangeErr instanceof Error
              ? exchangeErr.message
              : 'This Google account is not linked to an AMMON Executive appointment.'
          );
          return;
        }
      }
      if (onGoogleLoginSuccess) {
        onGoogleLoginSuccess(user);
      }
    } catch (err: unknown) {
      console.error('Google Sign-In Failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('popup-closed-by-user')) {
        setErrorMsg('Google sign-in encountered an error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle operator authentication
  const handleOperatorLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const cleanId = identifier.trim().toLowerCase();

      const matched = members.find(
        (m) =>
          m.membershipId.toLowerCase() === cleanId ||
          m.phone.replace(/\s+/g, '').includes(cleanId.replace(/\s+/g, '')) ||
          m.email.toLowerCase() === cleanId ||
          m.fullName.toLowerCase().includes(cleanId)
      );

      if (matched) {
        onLoginSuccess(matched);
      } else {
        setErrorMsg('No matching registered operator found. Please check your Membership ID, Phone, or Email, or register as a new member.');
      }
    }, 350);
  };

  // Handle unified executive authentication across all hierarchical levels
  const authenticateExecutive = async (emailOrBadge: string, pass: string) => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await loginExecutive(emailOrBadge.trim(), pass);
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
        onAdminLoginSuccess(res.executive);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Invalid Executive credentials. Please use the demo personas below or your assigned email/password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await authenticateExecutive(adminEmail, adminPassword);
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
                        placeholder="e.g. operator@kolawole.ng or superadmin@ammon.ng"
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
                  {/* Google One-Click Authentication */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-300 shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:border-gray-400"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Google Account</span>
                  </button>

                  <div className="relative flex items-center my-1">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">or sign in with membership id</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <form onSubmit={handleOperatorLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Membership ID, Registered Phone, or Email *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="Enter Membership ID, Phone, or Email"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-gray-700">
                          Account PIN or Password *
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
                          type="password"
                          required
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="Enter 4-digit PIN or password"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] text-xs"
                        />
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

                  {/* Google Authentication for Directorate */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-300 shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:border-gray-400"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Google Single Sign-On (Officer Email)</span>
                  </button>

                  <div className="relative flex items-center my-1">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">or sign in with executive email / badge</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

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
                          type="password"
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
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

                  <div className="p-3 bg-gray-50 rounded-xl border border-[#E5E7EB] text-[11px] text-gray-600 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#176B37] shrink-0" />
                    <span>All executive accounts authenticate through one unified RBAC/LBAC backend system and route automatically to your assigned jurisdiction.</span>
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
