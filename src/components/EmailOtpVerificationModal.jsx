import { useEffect, useState } from "react";
import {
  X,
  MailCheck,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { sendEmailOtpApi, verifyEmailOtpApi } from "../services/executiveApi";
import { generateSaltHex, hashOtpClient } from "../utils/passwordAuth";
import { updateMemberInFirestore } from "../services/firestoreService";
const EmailOtpVerificationModal = ({
  member,
  isOpen,
  onClose,
  onVerified,
  initialPreviewOtp,
  initialDeliveryMode
}) => {
  const [otpInput, setOtpInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [previewOtp, setPreviewOtp] = useState(initialPreviewOtp);
  const [deliveryMode, setDeliveryMode] = useState(
    initialDeliveryMode || "in-app-relay"
  );
  const [cooldownSec, setCooldownSec] = useState(0);
  const [clientOtpState, setClientOtpState] = useState(null);
  const dispatchOtp = async () => {
    if (!member?.email) {
      setErrorMsg("No registered email address found on this member profile.");
      return;
    }
    setErrorMsg("");
    setInfoMsg("");
    setIsSending(true);
    try {
      const res = await sendEmailOtpApi({
        memberId: member.id,
        email: member.email
      });
      setDeliveryMode(res.deliveryMode);
      setPreviewOtp(res.previewOtp);
      setClientOtpState(null);
      setCooldownSec(30);
      setInfoMsg(
        res.deliveryMode === "email" ? `A 6-digit verification code has been emailed to ${res.email}.` : `6-digit OTP generated for ${res.email}. Enter the code below to confirm your email.`
      );
    } catch {
      const digits = new Uint32Array(1);
      crypto.getRandomValues(digits);
      const code = String(1e5 + digits[0] % 9e5);
      const salt = generateSaltHex(12);
      const hash = await hashOtpClient(code, member.email, salt);
      setClientOtpState({
        hash,
        salt,
        expiresAt: Date.now() + 10 * 60 * 1e3
      });
      setDeliveryMode("in-app-relay");
      setPreviewOtp(code);
      setCooldownSec(30);
      setInfoMsg(
        `6-digit OTP generated for ${member.email}. Enter the code below to confirm your email.`
      );
    } finally {
      setIsSending(false);
    }
  };
  useEffect(() => {
    if (!isOpen || !member) return;
    setOtpInput("");
    setErrorMsg("");
    setPreviewOtp(initialPreviewOtp);
    setDeliveryMode(initialDeliveryMode || "in-app-relay");
    if (!initialPreviewOtp) {
      dispatchOtp();
    } else {
      setCooldownSec(30);
      setInfoMsg(`Enter the 6-digit OTP code sent to ${member.email} to unlock your dashboard.`);
    }
  }, [isOpen, member?.id]);
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setTimeout(() => setCooldownSec((s) => Math.max(0, s - 1)), 1e3);
    return () => clearTimeout(t);
  }, [cooldownSec]);
  if (!isOpen || !member) return null;
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const cleanOtp = otpInput.replace(/\D/g, "").slice(0, 6);
    if (cleanOtp.length !== 6) {
      setErrorMsg("Please enter the 6-digit OTP verification code.");
      return;
    }
    setIsVerifying(true);
    try {
      if (clientOtpState) {
        if (Date.now() > clientOtpState.expiresAt) {
          setErrorMsg("This OTP code has expired. Click Resend Code to get a new one.");
          setIsVerifying(false);
          return;
        }
        const candidate = await hashOtpClient(cleanOtp, member.email, clientOtpState.salt);
        if (candidate !== clientOtpState.hash) {
          setErrorMsg("Invalid 6-digit OTP code. Please verify and try again.");
          setIsVerifying(false);
          return;
        }
        const nowLabel = (/* @__PURE__ */ new Date()).toISOString();
        const verifiedMember2 = {
          ...member,
          emailVerified: true,
          emailVerifiedAt: nowLabel
        };
        updateMemberInFirestore(member.id, {
          emailVerified: true,
          emailVerifiedAt: nowLabel
        }).catch(() => {
        });
        onVerified(verifiedMember2);
        return;
      }
      const res = await verifyEmailOtpApi({
        memberId: member.id,
        email: member.email,
        otp: cleanOtp
      });
      const verifiedMember = {
        ...member,
        ...res.member,
        emailVerified: true,
        emailVerifiedAt: res.member.emailVerifiedAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      updateMemberInFirestore(member.id, {
        emailVerified: true,
        emailVerifiedAt: verifiedMember.emailVerifiedAt
      }).catch(() => {
      });
      onVerified(verifiedMember);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to verify OTP code. Please double-check and try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
    className="bg-white rounded-3xl max-w-md w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col"
    onClick={(e) => e.stopPropagation()}
  >
        <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <MailCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Email OTP Verification</h3>
              <p className="text-xs text-emerald-100">Confirm email before dashboard access</p>
            </div>
          </div>
          <button
    onClick={onClose}
    className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
    aria-label="Close OTP verification"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerifySubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#EAF3ED] border border-[#176B37]/25 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#14532D]">
              <ShieldCheck className="w-4 h-4 text-[#176B37]" />
              <span>Mandatory Email Confirmation</span>
            </div>
            <p className="text-[11px] text-gray-700 leading-relaxed">
              Your account (<strong className="font-mono text-[#176B37]">{member.membershipId}</strong>) requires OTP confirmation for{" "}
              <strong className="font-mono text-[#14532D]">{member.email}</strong> before your Member Dashboard and Digital ID Card are unlocked.
            </p>
          </div>

          {deliveryMode === "in-app-relay" && previewOtp && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px]">AMMON Verification Relay Code</span>
                <span className="text-[10px] font-semibold text-amber-700">Expires in 10 mins</span>
              </div>
              <p className="text-[11px] leading-tight">
                Your 6-digit verification code:{" "}
                <strong className="font-mono text-sm tracking-widest bg-white px-2 py-0.5 rounded border border-amber-300 text-[#14532D]">
                  {previewOtp}
                </strong>
              </p>
            </div>}

          {infoMsg && !errorMsg && <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#14532D] text-[11px] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#176B37] shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>}

          {errorMsg && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>}

          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Enter 6-Digit Email OTP Code *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
    type="text"
    inputMode="numeric"
    pattern="\d{6}"
    maxLength={6}
    required
    value={otpInput}
    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
    placeholder="000000"
    className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono text-lg tracking-[0.45em] text-center font-bold text-[#14532D]"
  />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Didn&apos;t receive the code?</span>
            <button
    type="button"
    onClick={dispatchOtp}
    disabled={isSending || cooldownSec > 0}
    className="inline-flex items-center gap-1 font-bold text-[#176B37] hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
  >
              <RefreshCw className={`w-3 h-3 ${isSending ? "animate-spin" : ""}`} />
              <span>
                {isSending ? "Sending OTP..." : cooldownSec > 0 ? `Resend in ${cooldownSec}s` : "Resend OTP Code"}
              </span>
            </button>
          </div>

          <button
    type="submit"
    disabled={isVerifying || otpInput.length !== 6}
    className="w-full py-3 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-50"
  >
            {isVerifying ? <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Email OTP...</span>
              </> : <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Email &amp; Unlock Dashboard</span>
              </>}
          </button>
        </form>
      </div>
    </div>;
};
export {
  EmailOtpVerificationModal
};
