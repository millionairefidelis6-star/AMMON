import React, { useState } from 'react';
import { X, Lock, ShieldCheck, CheckCircle2, CreditCard } from 'lucide-react';

interface PaystackDuesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaystackDuesModal: React.FC<PaystackDuesModalProps> = ({ isOpen, onClose }) => {
  const [operatorId, setOperatorId] = useState('');
  const [amount, setAmount] = useState('15000');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  if (!isOpen) return null;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setPaid(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base leading-tight">Paystack Dues Checkout</h3>
              <p className="text-xs text-emerald-100">Official Association Payment Gateway</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {paid ? (
            <div className="bg-[#EAF3ED] p-6 rounded-2xl border border-[#176B37]/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#176B37] text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-sm font-extrabold text-[#14532D]">
                Payment Received & Recorded!
              </h4>
              <p className="text-gray-600 leading-relaxed text-xs">
                Your annual dues of <strong>₦{Number(amount).toLocaleString()}</strong> have been verified via Paystack. 
                Your digital membership card has been updated automatically.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#176B37] hover:bg-[#14532D] text-white font-semibold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-3.5">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <span className="text-gray-600 font-medium">Gateway Security:</span>
                <span className="font-bold text-[#176B37] flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  PCI-DSS Level 1 Certified
                </span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Member / Operator ID *
                </label>
                <input
                  type="text"
                  required
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  placeholder="e.g. AMMON-LAG-2025-08492"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Subscription Year / Item *
                </label>
                <select
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  <option value="15000">2025/2026 Retail POS Agent Dues (₦15,000)</option>
                  <option value="50000">Super Agent Annual Accreditation (₦50,000)</option>
                  <option value="5000">AMMON Academy Fraud Certification Fee (₦5,000)</option>
                  <option value="250000">Corporate Member Partner Levy (₦250,000)</option>
                </select>
              </div>

              <div className="p-3 bg-[#EAF3ED] rounded-xl border border-[#176B37]/20 flex items-center justify-between">
                <span className="text-gray-700 font-semibold">Total Payable:</span>
                <span className="font-mono font-black text-base text-[#176B37]">
                  ₦{Number(amount).toLocaleString()}
                </span>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <span>Contacting Paystack API...</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₦{Number(amount).toLocaleString()} via Paystack</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
