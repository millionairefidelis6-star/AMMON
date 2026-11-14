import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  RotateCw, 
  ShieldCheck, 
  CheckCircle, 
  Copy, 
  Share2,
  Calendar,
  MapPin,
  Smartphone,
  Building
} from 'lucide-react';
import { Member } from '../types';
import { QRCodeSvg } from './QRCodeSvg';
import { AmmonLogo } from './AmmonLogo';
import { downloadDigitalCardPng, printDigitalCardDocument } from '../utils/documentGenerators';

interface DigitalMembershipCardModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onOpenVerify: (id: string) => void;
}

export const DigitalMembershipCardModal: React.FC<DigitalMembershipCardModalProps> = ({
  member,
  isOpen,
  onClose,
  onOpenVerify,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(member.membershipId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    printDigitalCardDocument(member);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadDigitalCardPng(member);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#176B37] rounded-full" />
            <h3 className="font-bold text-base text-[#252525]">
              Official Digital Membership Card
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Action Bar Above Card */}
          <div className="flex items-center justify-between text-xs text-gray-500 pb-1">
            <span className="flex items-center gap-1.5 text-[#176B37] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#176B37]" />
              CBN & AMMON Authorized Identity
            </span>
            <button
              onClick={() => setFlipped(!flipped)}
              className="inline-flex items-center gap-1.5 font-semibold text-[#176B37] hover:text-[#14532D] cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Flip Card ({flipped ? 'Front' : 'Back'})</span>
            </button>
          </div>

          {/* THE CARD CONTAINER */}
          <div id="printable-membership-card" className="perspective-1000 flex justify-center">
            
            {/* FRONT OF THE CARD */}
            {!flipped ? (
              <div className="w-full max-w-md aspect-85/54 rounded-2xl overflow-hidden shadow-xl border border-[#176B37]/30 bg-gradient-to-br from-white via-[#EAF3ED]/30 to-white relative flex flex-col justify-between p-5 text-[#252525] select-none">
                
                {/* Background watermark security pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#176B37_1px,transparent_1px)] [background-size:12px_12px]" />
                
                {/* Card Top Band */}
                <div className="flex items-start justify-between border-b border-[#176B37]/15 pb-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-white p-0.5 border border-[#176B37]/20 flex items-center justify-center shrink-0 shadow-2xs">
                      <AmmonLogo variant="compact" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-wider text-[#176B37] uppercase leading-none">
                        AMMON NIGERIA
                      </h4>
                      <p className="text-[9px] text-gray-500 font-medium leading-tight">
                        Association of Mobile Money Operators
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-[#176B37] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                      {member.status}
                    </span>
                    <p className="text-[9px] font-mono text-gray-500 mt-1">
                      EXP: {member.expiryDate}
                    </p>
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="grid grid-cols-12 gap-3 items-center py-2 relative z-10">
                  {/* Photo & Hologram Seal */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-[#176B37] shadow-sm relative bg-slate-50 shrink-0">
                      <img
                        src={member.photoUrl || '/assets/images/ammon_hero_pos_agent_1794380620175.jpg'}
                        alt={member.fullName}
                        onError={(e) => {
                          e.currentTarget.src = '/assets/images/ammon_hero_pos_agent_1794380620175.jpg';
                        }}
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                      />
                      {/* Holographic Security Overlay */}
                      <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#176B37]/90 text-white flex items-center justify-center text-[7px] font-extrabold border border-white">
                        ✓
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-[#176B37] uppercase tracking-wider mt-1 text-center">
                      Verified Agent
                    </span>
                  </div>

                  {/* Member Details */}
                  <div className="col-span-8 space-y-1.5 pl-1">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        Full Legal Name
                      </p>
                      <h5 className="text-sm font-extrabold text-[#252525] leading-tight">
                        {member.fullName}
                      </h5>
                    </div>

                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        Registered Business Outlet
                      </p>
                      <p className="text-xs font-semibold text-[#14532D] leading-tight truncate">
                        {member.businessName}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                      <div>
                        <p className="text-[8px] text-gray-400 uppercase font-semibold">
                          Membership No.
                        </p>
                        <p className="text-[11px] font-mono font-bold text-[#176B37]">
                          {member.membershipId}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-400 uppercase font-semibold">
                          State Chapter
                        </p>
                        <p className="text-[10px] font-bold text-gray-800 truncate">
                          {member.state} ({member.lga})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: QR Code & Terminal ID */}
                <div className="border-t border-[#176B37]/15 pt-2 flex items-center justify-between relative z-10">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-[9px] text-gray-600">
                      <Smartphone className="w-3 h-3 text-[#176B37]" />
                      <span>Terminal: <strong className="font-mono text-gray-800">{member.terminalSerialNumber}</strong></span>
                    </div>
                    <p className="text-[8px] text-gray-400">
                      Scan QR code to verify operator authentication
                    </p>
                  </div>

                  {/* High fidelity SVG QR code in primary green */}
                  <div className="p-1 bg-white rounded border border-[#176B37]/20 shadow-2xs">
                    <QRCodeSvg
                      value={`https://ammon.ng/verify?id=${member.membershipId}`}
                      size={44}
                      fgColor="#176B37"
                    />
                  </div>
                </div>

              </div>
            ) : (
              /* BACK OF THE CARD */
              <div className="w-full max-w-md aspect-85/54 rounded-2xl overflow-hidden shadow-xl border border-[#176B37]/30 bg-gradient-to-br from-[#14532D] to-[#176B37] text-white p-5 flex flex-col justify-between select-none">
                
                {/* Back Top: Magnetic stripe simulation & notice */}
                <div>
                  <div className="w-full h-8 bg-black/60 rounded-sm mb-3 flex items-center px-3 justify-end text-[9px] font-mono tracking-widest text-white/70">
                    AMMON · CBN · NIBSS COMPLIANT
                  </div>

                  <h5 className="text-[11px] font-bold tracking-wider text-emerald-100 uppercase">
                    Terms & Association Protection
                  </h5>
                  <p className="text-[9px] text-emerald-50/90 leading-tight mt-1">
                    This card is the official property of the Association of Mobile Money Operators of Nigeria. 
                    The authorized holder is a vetted agent banking operator recognized under Central Bank of Nigeria 
                    regulatory frameworks.
                  </p>
                </div>

                {/* Back Middle: Emergency Assistance */}
                <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 space-y-1">
                  <div className="text-[9px] font-bold text-amber-200 uppercase">
                    Official Protection Clause:
                  </div>
                  <p className="text-[8px] text-white/90 leading-tight">
                    By Federal High Court directive, registered POS agents are exempt from illegal municipal ticketing 
                    and harassment. In case of emergency or unlawful extortion, contact the AMMON Legal Quick-Response Desk.
                  </p>
                </div>

                {/* Back Bottom: Signatures and Hotline */}
                <div className="flex items-end justify-between border-t border-white/15 pt-2 text-[8px] text-emerald-100">
                  <div>
                    <p className="font-semibold">AMMON Legal &amp; HQ Desk:</p>
                    <p className="font-mono font-bold text-white text-[10px]">07045900900 · ammonngr@gmail.com</p>
                  </div>
                  <div className="text-right">
                    <p className="italic font-serif text-[10px] text-white/90">Babaginda O. S.</p>
                    <p className="text-[7px] text-emerald-200">National Secretary General</p>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Quick Details & Action Buttons */}
          <div className="bg-[#EAF3ED] p-4 rounded-xl border border-[#176B37]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Membership ID:</span>
              <span className="font-mono font-bold text-[#176B37]">{member.membershipId}</span>
              <button
                onClick={handleCopyId}
                className="p-1 hover:bg-white rounded text-gray-500 hover:text-[#176B37] transition-colors cursor-pointer"
                title="Copy ID"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-[#176B37]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={() => onOpenVerify(member.membershipId)}
              className="text-xs font-semibold text-[#176B37] hover:underline cursor-pointer"
            >
              Verify on Public Registry →
            </button>
          </div>

          {/* Card Management Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Member ID</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Generating PNG...' : 'Download Digital ID (PNG)'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
