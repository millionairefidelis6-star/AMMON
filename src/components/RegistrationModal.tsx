import React, { useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Camera,
  Upload,
  FileCheck2,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Member, MembershipCategory } from '../types';
import { NIGERIAN_STATES } from '../data/mockData';
import { resolveZoneForState } from '../data/hierarchyData';
import { registerMemberApi } from '../services/executiveApi';
import {
  processKycDocumentImage,
  processPassportPhoto,
} from '../utils/imageProcessor';
import { uploadMemberKycAsset } from '../services/storageService';
import { KycCameraCapture } from './KycCameraCapture';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (member: Member) => void;
}

interface UploadedAssetState {
  previewDataUrl: string;
  hostedUrl?: string;
  storagePath?: string;
  provider?: 'firebase-storage' | 'ammon-vault';
  blob: Blob;
  dimensions: string;
  sizeKb: number;
  uploading: boolean;
  error?: string;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sessionId, setSessionId] = useState(
    () => `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  // Form fields
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('Bayelsa');
  const [lga, setLga] = useState('Yenagoa');
  const [ward, setWard] = useState('');
  const [community, setCommunity] = useState('');
  const [category, setCategory] = useState<MembershipCategory>('POS Agents');
  const [terminalProvider, setTerminalProvider] = useState('Moniepoint');
  const [terminalSerial, setTerminalSerial] = useState('');
  const [bvn, setBvn] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Compulsory Passport Photo & KYC Camera Document states
  const [passportAsset, setPassportAsset] = useState<UploadedAssetState | null>(null);
  const [kycDocType, setKycDocType] = useState<'Government ID' | 'Business License'>('Government ID');
  const [kycDocAsset, setKycDocAsset] = useState<UploadedAssetState | null>(null);
  const [activeCameraMode, setActiveCameraMode] = useState<'passport' | 'document' | null>(null);

  const [stepError, setStepError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regError, setRegError] = useState('');

  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const docFallbackInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setStep(1);
    setSessionId(`reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    setFullName('');
    setBusinessName('');
    setEmail('');
    setPhone('');
    setState('Bayelsa');
    setLga('Yenagoa');
    setWard('');
    setCommunity('');
    setCategory('POS Agents');
    setTerminalProvider('Moniepoint');
    setTerminalSerial('');
    setBvn('');
    setCacNumber('');
    setAgreedTerms(true);
    setPassportAsset(null);
    setKycDocAsset(null);
    setActiveCameraMode(null);
    setStepError('');
    setRegError('');
  };

  const handleProcessAndUploadPassport = async (
    source: File | Blob | HTMLCanvasElement
  ) => {
    setStepError('');
    setActiveCameraMode(null);
    try {
      const processed = await processPassportPhoto(source);
      const initialState: UploadedAssetState = {
        previewDataUrl: processed.dataUrl,
        blob: processed.blob,
        dimensions: `${processed.width}×${processed.height}px (Auto-fitted from ${processed.originalWidth}×${processed.originalHeight}px)`,
        sizeKb: processed.sizeKb,
        uploading: true,
      };
      setPassportAsset(initialState);

      const uploaded = await uploadMemberKycAsset({
        blob: processed.blob,
        dataUrl: processed.dataUrl,
        folder: 'member-passports',
        sessionId,
        fileName: 'passport.jpg',
        contentType: 'image/jpeg',
      });

      setPassportAsset((prev) =>
        prev
          ? {
              ...prev,
              hostedUrl: uploaded.url,
              storagePath: uploaded.storagePath,
              provider: uploaded.provider,
              uploading: false,
            }
          : null
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to process passport photograph.';
      setPassportAsset((prev) =>
        prev ? { ...prev, uploading: false, error: msg } : null
      );
      setStepError(msg);
    }
  };

  const handleProcessAndUploadKycDoc = async (
    source: File | Blob | HTMLCanvasElement
  ) => {
    setStepError('');
    setActiveCameraMode(null);
    try {
      const processed = await processKycDocumentImage(source);
      const slug = kycDocType === 'Government ID' ? 'gov_id.jpg' : 'business_license.jpg';
      const initialState: UploadedAssetState = {
        previewDataUrl: processed.dataUrl,
        blob: processed.blob,
        dimensions: `${processed.width}×${processed.height}px`,
        sizeKb: processed.sizeKb,
        uploading: true,
      };
      setKycDocAsset(initialState);

      const uploaded = await uploadMemberKycAsset({
        blob: processed.blob,
        dataUrl: processed.dataUrl,
        folder: 'kyc-documents',
        sessionId,
        fileName: slug,
        contentType: 'image/jpeg',
      });

      setKycDocAsset((prev) =>
        prev
          ? {
              ...prev,
              hostedUrl: uploaded.url,
              storagePath: uploaded.storagePath,
              provider: uploaded.provider,
              uploading: false,
            }
          : null
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to process or upload KYC document.';
      setKycDocAsset((prev) =>
        prev ? { ...prev, uploading: false, error: msg } : null
      );
      setStepError(msg);
    }
  };

  const handleContinueStep = () => {
    setStepError('');
    if (step === 1) {
      if (!fullName.trim()) {
        setStepError('Please enter your Full Legal Name to continue.');
        return;
      }
      if (!businessName.trim()) {
        setStepError('Please enter your Registered Business / Kiosk Name.');
        return;
      }
      if (!phone.trim()) {
        setStepError('Please enter an active WhatsApp Phone Number.');
        return;
      }
      if (!lga.trim()) {
        setStepError('Please enter your Local Government Area (LGA).');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
    }
  };

  const handleCompleteRegistration = async () => {
    setStepError('');
    setRegError('');

    if (!passportAsset) {
      setStepError(
        'Passport photograph upload is compulsory. Please upload or capture your passport photo to generate your official AMMON Digital ID Card.'
      );
      return;
    }
    if (passportAsset.uploading || kycDocAsset?.uploading) {
      setStepError('Please wait for your photo upload to complete.');
      return;
    }
    if (!agreedTerms) {
      setStepError('Please agree to the AMMON Constitution and CBN guidelines.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPassportUrl = passportAsset.hostedUrl;
      let finalPassportPath = passportAsset.storagePath;
      if (!finalPassportUrl) {
        const uploaded = await uploadMemberKycAsset({
          blob: passportAsset.blob,
          dataUrl: passportAsset.previewDataUrl,
          folder: 'member-passports',
          sessionId,
          fileName: 'passport.jpg',
          contentType: 'image/jpeg',
        });
        finalPassportUrl = uploaded.url;
        finalPassportPath = uploaded.storagePath;
      }

      let finalKycUrl = kycDocAsset?.hostedUrl;
      let finalKycPath = kycDocAsset?.storagePath;
      if (kycDocAsset && !finalKycUrl) {
        const slug = kycDocType === 'Government ID' ? 'gov_id.jpg' : 'business_license.jpg';
        const uploaded = await uploadMemberKycAsset({
          blob: kycDocAsset.blob,
          dataUrl: kycDocAsset.previewDataUrl,
          folder: 'kyc-documents',
          sessionId,
          fileName: slug,
          contentType: 'image/jpeg',
        });
        finalKycUrl = uploaded.url;
        finalKycPath = uploaded.storagePath;
      }

      const zone = resolveZoneForState(state);
      const stateCode = state.slice(0, 3).toUpperCase();
      const created = await registerMemberApi({
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        zone,
        state,
        lga: lga.trim(),
        ward: ward.trim() || undefined,
        community: community.trim() || undefined,
        category,
        tier: 'Tier 1 Standard Agent',
        terminalSerialNumber:
          terminalSerial.trim() || `POS-${stateCode}-${Math.floor(10000 + Math.random() * 90000)}`,
        terminalProvider,
        bvnVerified: bvn.trim().length === 11,
        photoUrl: finalPassportUrl,
        passportStoragePath: finalPassportPath,
        kycDocumentType: kycDocAsset ? kycDocType : undefined,
        kycDocumentUrl: finalKycUrl,
        kycDocumentStoragePath: finalKycPath,
        duesAmount: 0,
        amountPaid: 0,
        duesPaid: true,
        paymentStatus: 'Paid',
        freeEnrollment: true,
      });

      onRegistered(created.member);
      resetForm();
      onClose();
    } catch (err) {
      setRegError(
        err instanceof Error
          ? err.message
          : 'Registration could not be saved. Please retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">New Member Registration</h3>
            <p className="text-xs text-emerald-100">
              Step {step} of 3:{' '}
              {step === 1
                ? 'Personal & Chapter Details'
                : step === 2
                ? 'Agent Banking Info'
                : 'Passport Photo, KYC Camera & Free Enrollment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#EAF3ED] h-1.5">
          <div
            className="bg-[#14532D] h-1.5 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {(stepError || regError) && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{stepError || regError}</span>
            </div>
          )}

          {/* STEP 1: Personal & Business */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Full Legal Name (as registered with BVN / Bank) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Registered Business / Kiosk Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter registered business or POS kiosk name"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Phone Number (WhatsApp Active) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@example.ng"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    State Chapter *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Local Government Area (LGA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder="e.g. Yenagoa, Ikeja, AMAC"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Ward (Optional)
                  </label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="Enter ward name"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Community / Market Hub
                  </label>
                  <input
                    type="text"
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    placeholder="Enter community or market hub"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Agent Banking details */}
          {step === 2 && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Membership Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MembershipCategory)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  <option value="POS Agents">POS Agents (Retail operators / kiosks)</option>
                  <option value="Super Agents">Super Agents (Aggregators 50+ terminals)</option>
                  <option value="Fintech Companies">Fintech Companies (Licensed MMO / PSB)</option>
                  <option value="Distributors">Distributors (Terminal hardware vendors)</option>
                  <option value="Corporate Members">Corporate Members (Commercial Banks)</option>
                  <option value="Other Stakeholders">Other Stakeholders</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Primary Mobile Money Provider / Partner Aggregator *
                </label>
                <select
                  value={terminalProvider}
                  onChange={(e) => setTerminalProvider(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  <option value="Moniepoint">Moniepoint (TeamApt)</option>
                  <option value="OPay">OPay Merchant Services</option>
                  <option value="PalmPay">PalmPay Agent Banking</option>
                  <option value="Access Closa">Access Closa (Access Bank)</option>
                  <option value="Firstmonie">Firstmonie (FirstBank)</option>
                  <option value="Nomba">Nomba (formerly Kudi)</option>
                  <option value="Kuda">Kuda Microfinance Bank</option>
                  <option value="Other">Other CBN Licensed MMO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  POS Terminal Serial Number (Found on back of device)
                </label>
                <input
                  type="text"
                  value={terminalSerial}
                  onChange={(e) => setTerminalSerial(e.target.value)}
                  placeholder="Enter terminal serial number"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono"
                />
              </div>

              <div className="bg-[#EAF3ED] p-3 rounded-xl border border-[#176B37]/20 flex items-center gap-2.5 text-gray-700">
                <ShieldCheck className="w-5 h-5 text-[#176B37] shrink-0" />
                <p className="text-[11px] leading-tight">
                  Membership registration is currently open with zero registration fee. Complete your passport photograph &amp; KYC verification in the next step to receive your official Digital ID Card.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Compulsory Passport Photo + Camera ID/License Capture + Identity Verification */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Live Camera Panel when active */}
              {activeCameraMode === 'passport' && (
                <KycCameraCapture
                  mode="passport"
                  initialFacingMode="user"
                  title="Capture Compulsory Passport Photograph"
                  subtitle="Auto-resized & fitted into your AMMON Digital ID Card frame"
                  onCaptureCanvas={(canvas) => handleProcessAndUploadPassport(canvas)}
                  onFallbackFileSelect={(file) => handleProcessAndUploadPassport(file)}
                  onCancel={() => setActiveCameraMode(null)}
                />
              )}

              {activeCameraMode === 'document' && (
                <KycCameraCapture
                  mode="document"
                  initialFacingMode="environment"
                  title={`Capture ${kycDocType}`}
                  subtitle="Photo will be hosted securely on Firebase Storage"
                  onCaptureCanvas={(canvas) => handleProcessAndUploadKycDoc(canvas)}
                  onFallbackFileSelect={(file) => handleProcessAndUploadKycDoc(file)}
                  onCancel={() => setActiveCameraMode(null)}
                />
              )}

              {/* 1. COMPULSORY PASSPORT PHOTOGRAPH */}
              <div className="p-4 rounded-2xl border-2 border-[#176B37]/30 bg-[#EAF3ED]/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#176B37]" />
                    <span className="font-bold text-xs text-[#14532D]">
                      1. Member Passport Photograph (Compulsory) *
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#176B37] text-white">
                    Used Automatically on ID Card
                  </span>
                </div>

                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Upload any image format (JPG, PNG, WebP) or take a passport selfie. The system automatically resizes, normalizes background, and fits it directly into the 5:6 ID card passport frame.
                </p>

                <input
                  ref={passportInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessAndUploadPassport(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Live ID Card Passport Frame Preview */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-[#176B37] bg-white shadow-sm relative flex items-center justify-center">
                      {passportAsset ? (
                        <>
                          <img
                            src={passportAsset.previewDataUrl}
                            alt="Auto-fitted Passport Preview"
                            className="w-full h-full object-cover object-top"
                          />
                          <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#176B37] text-white flex items-center justify-center text-[7px] font-extrabold border border-white">
                            ✓
                          </div>
                        </>
                      ) : (
                        <div className="text-center px-1.5 text-[9px] font-semibold text-gray-400 leading-tight">
                          ID Card Frame (5:6)
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-[#176B37] mt-1">
                      {passportAsset ? 'Auto-Fitted Preview' : 'Required *'}
                    </span>
                  </div>

                  {/* Upload & Status Controls */}
                  <div className="flex-1 space-y-2.5 min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => passportInputRef.current?.click()}
                        className="px-3.5 py-2 bg-[#176B37] hover:bg-[#14532D] text-white font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{passportAsset ? 'Replace Passport Photo' : 'Upload Passport Photo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveCameraMode('passport')}
                        className="px-3.5 py-2 bg-white hover:bg-[#EAF3ED] text-[#176B37] border border-[#176B37] font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Take Selfie Camera</span>
                      </button>
                    </div>

                    {passportAsset && (
                      <div className="text-[11px] space-y-1 bg-white/80 p-2.5 rounded-xl border border-[#176B37]/20">
                        <div className="flex items-center gap-1.5 font-semibold text-[#14532D]">
                          {passportAsset.uploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#176B37]" />
                              <span>Uploading passport to persistent storage...</span>
                            </>
                          ) : passportAsset.error ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-red-700">{passportAsset.error}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#176B37]" />
                              <span>
                                Ready for ID Card (
                                {passportAsset.provider === 'firebase-storage'
                                  ? 'Hosted on Firebase Storage'
                                  : 'Hosted on AMMON Persistent Vault'}
                                )
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {passportAsset.dimensions} · {passportAsset.sizeKb} KB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. GOVERNMENT ID / BUSINESS LICENSE CAMERA CAPTURE */}
              <div className="p-4 rounded-2xl border border-[#E5E7EB] bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#176B37]" />
                    <span className="font-bold text-xs text-[#252525]">
                      2. Government-Issued ID or Business License (Camera KYC)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#176B37]">
                    Firebase Storage
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['Government ID', 'Business License'] as const).map((docOption) => (
                    <button
                      key={docOption}
                      type="button"
                      onClick={() => setKycDocType(docOption)}
                      className={`py-2 px-3 rounded-xl text-[11px] font-semibold border text-left transition-all cursor-pointer ${
                        kycDocType === docOption
                          ? 'bg-[#EAF3ED] border-[#176B37] text-[#14532D]'
                          : 'bg-gray-50 border-[#E5E7EB] text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {docOption === 'Government ID'
                        ? 'Government-Issued ID (NIN / PVC / DL)'
                        : 'Business License (CAC / CBN Permit)'}
                    </button>
                  ))}
                </div>

                <input
                  ref={docFallbackInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessAndUploadKycDoc(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                {!kycDocAsset ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveCameraMode('document')}
                      className="px-3.5 py-2 bg-[#14532D] hover:bg-[#176B37] text-white font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo with Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => docFallbackInputRef.current?.click()}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Document Photo</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-[#E5E7EB]">
                    <div className="w-24 h-16 rounded-lg overflow-hidden border border-[#176B37]/40 bg-white shrink-0">
                      <img
                        src={kycDocAsset.previewDataUrl}
                        alt={kycDocType}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[11px] text-[#252525] truncate">
                          {kycDocType} Captured
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveCameraMode('document')}
                          className="text-[10px] font-semibold text-[#176B37] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retake</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {kycDocAsset.uploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#176B37]" />
                            <span className="text-gray-600">Uploading to persistent storage...</span>
                          </>
                        ) : kycDocAsset.error ? (
                          <span className="text-red-700">{kycDocAsset.error}</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#176B37]" />
                            <span className="text-[#14532D] font-medium">
                              {kycDocAsset.provider === 'firebase-storage'
                                ? 'Secured in Firebase Storage'
                                : 'Secured in AMMON Persistent Vault'}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {kycDocAsset.dimensions} · {kycDocAsset.sizeKb} KB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. BVN / NIN & CAC Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    BVN / NIN (11 digits)
                  </label>
                  <input
                    type="password"
                    maxLength={11}
                    value={bvn}
                    onChange={(e) => setBvn(e.target.value)}
                    placeholder="Enter 11-digit BVN or NIN"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono tracking-widest"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Protected under CBN &amp; NDPR data standards.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    CAC Registration No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={cacNumber}
                    onChange={(e) => setCacNumber(e.target.value)}
                    placeholder="e.g. BN-2993810"
                    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="w-4 h-4 text-[#176B37] rounded"
                />
                <label htmlFor="terms" className="text-[11px] text-gray-700 cursor-pointer">
                  I agree to abide by the AMMON Constitution, unified tariff schedules, and CBN guidelines.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-[#E5E7EB] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setStepError('');
                setActiveCameraMode(null);
                setStep((prev) => (prev - 1) as 1 | 2 | 3);
              }}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleContinueStep}
              className="px-5 py-2 text-xs font-semibold bg-[#176B37] hover:bg-[#14532D] text-white rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteRegistration}
              disabled={
                isSubmitting ||
                Boolean(passportAsset?.uploading) ||
                Boolean(kycDocAsset?.uploading)
              }
              className="px-5 py-2.5 text-xs font-bold bg-[#176B37] hover:bg-[#14532D] text-white rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Completing Registration...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Free Registration</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
