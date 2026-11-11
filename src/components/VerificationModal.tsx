import React, { useState } from 'react';
import { 
  X, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone, 
  MapPin, 
  CreditCard 
} from 'lucide-react';
import { Member } from '../types';

interface VerificationModalProps {
  members: Member[];
  isOpen: boolean;
  onClose: () => void;
  initialId?: string;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  members,
  isOpen,
  onClose,
  initialId = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialId || '');
  const [searched, setSearched] = useState(Boolean(initialId));

  if (!isOpen) return null;

  const foundMember = members.find(
    (m) =>
      m.membershipId.toLowerCase() === searchTerm.trim().toLowerCase() ||
      m.terminalSerialNumber.toLowerCase() === searchTerm.trim().toLowerCase() ||
      m.phone.includes(searchTerm.trim())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base">National Operator Verification</h3>
              <p className="text-xs text-emerald-100">
                Central Bank of Nigeria & AMMON Public Registry
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          <p className="text-gray-600 leading-relaxed">
            Verify the authenticity of any POS kiosk, merchant terminal, or mobile money operator across Nigeria. 
            Enter the Operator Membership ID (e.g. <strong className="font-mono text-[#176B37]">AMMON-LAG-2025-08492</strong>) 
            or Terminal Serial Number.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter Membership ID, Terminal S/N or Phone..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono text-xs"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Verify Now
            </button>
          </form>

          {/* Results */}
          {searched && (
            <div className="pt-2 animate-in fade-in duration-150">
              {foundMember ? (
                <div className="bg-[#EAF3ED] p-5 rounded-2xl border-2 border-[#176B37] space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-[#176B37]/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#176B37]" />
                      <span className="font-extrabold text-sm text-[#14532D]">
                        CERTIFIED & ACTIVE OPERATOR
                      </span>
                    </div>
                    <span className="bg-[#176B37] text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                      Legitimate
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold">Operator Name</span>
                      <p className="font-bold text-gray-900">{foundMember.fullName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold">Registered Outlet</span>
                      <p className="font-bold text-gray-900">{foundMember.businessName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold">Membership Number</span>
                      <p className="font-mono font-bold text-[#176B37]">{foundMember.membershipId}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold">Location</span>
                      <p className="font-medium text-gray-800">{foundMember.lga}, {foundMember.state} State</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold">Terminal Provider</span>
                      <p className="font-medium text-gray-800">{foundMember.terminalProvider}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold">Terminal S/N</span>
                      <p className="font-mono text-gray-800">{foundMember.terminalSerialNumber}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#176B37]/20 text-[11px] text-[#14532D] font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#176B37]" />
                    <span>Compliance Verified: Central Bank of Nigeria Regulatory Standard Met</span>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-red-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span>No Matching Registered Operator Found</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    The identifier &quot;{searchTerm}&quot; does not correspond to an authorized AMMON member. 
                    Please double-check the spelling, or report the kiosk if suspicious transactions occurred.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Demo Test Buttons */}
          <div className="pt-3 border-t border-[#E5E7EB]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Try Sample Verified Operator IDs:
            </span>
            <div className="flex flex-wrap gap-2">
              {['AMMON-LAG-2025-08492', 'AMMON-ABJ-2025-01042', 'AMMON-KAN-2025-03120'].map((id) => (
                <button
                  key={id}
                  onClick={() => { setSearchTerm(id); setSearched(true); }}
                  className="font-mono text-[11px] bg-gray-100 hover:bg-[#EAF3ED] hover:text-[#176B37] px-2.5 py-1 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
