import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  Smartphone,
  Building,
  User,
  Check
} from 'lucide-react';
import { Member, MembershipCategory } from '../types';
import { NIGERIAN_STATES } from '../data/mockData';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (member: Member) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('Lagos');
  const [lga, setLga] = useState('Ikeja');
  const [category, setCategory] = useState<MembershipCategory>('POS Agents');
  const [terminalProvider, setTerminalProvider] = useState('Moniepoint');
  const [terminalSerial, setTerminalSerial] = useState('');
  const [bvn, setBvn] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  if (!isOpen) return null;

  const duesAmount = category === 'POS Agents' ? 15000 : category === 'Super Agents' ? 50000 : 75000;

  const handleCompleteRegistration = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);

      const stateCode = state.slice(0, 3).toUpperCase();
      const randomId = Math.floor(10000 + Math.random() * 90000);
      const newMembershipId = `AMMON-${stateCode}-2025-${randomId}`;

      const newMember: Member = {
        id: `mem-${Date.now()}`,
        membershipId: newMembershipId,
        fullName: fullName || 'Kehinde Emmanuel Adebayo',
        businessName: businessName || 'Adebayo POS Hub',
        email: email || 'adebayo.pos@gmail.com',
        phone: phone || '+234 802 334 5566',
        state,
        lga: lga || 'Ikeja',
        category,
        tier: 'Tier 1 Standard Agent',
        terminalSerialNumber: terminalSerial || `MP-${stateCode}-88491`,
        terminalProvider,
        bvnVerified: true,
        cbnCompliant: true,
        status: 'Active',
        joinedDate: '11 Nov 2025',
        expiryDate: '31 Dec 2026',
        photoUrl: '/assets/images/ammon_hero_pos_agent_1794380620175.jpg',
        duesPaid: true,
        duesAmount,
      };

      onRegistered(newMember);
      alert(`Registration Successful! Welcome to AMMON. Your Membership ID is: ${newMembershipId}`);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">New Member Registration</h3>
            <p className="text-xs text-emerald-100">
              Step {step} of 4: {step === 1 ? 'Personal Details' : step === 2 ? 'Agent Banking Info' : step === 3 ? 'Identity Verification' : 'Annual Dues (Paystack)'}
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
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
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
                  placeholder="e.g. Babatunde Olamide Adeleke"
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
                  placeholder="e.g. Adeleke Ventures & POS Financial Services"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
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
                      <option key={s} value={s}>{s}</option>
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
                    placeholder="e.g. Ikeja, Alimosho, Kano Municipal"
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
                  onChange={(e) => setCategory(e.target.value as any)}
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
                  POS Terminal Serial Number (Found on back of device) *
                </label>
                <input
                  type="text"
                  required
                  value={terminalSerial}
                  onChange={(e) => setTerminalSerial(e.target.value)}
                  placeholder="e.g. MP-LAG-992014 or OP-488219"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono"
                />
              </div>

              <div className="bg-[#EAF3ED] p-3 rounded-xl border border-[#176B37]/20 flex items-center gap-2.5 text-gray-700">
                <ShieldCheck className="w-5 h-5 text-[#176B37] shrink-0" />
                <p className="text-[11px] leading-tight">
                  Terminal serial numbers are automatically synced with the NIBSS central switch to protect you against stolen terminals.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Identity Verification */}
          {step === 3 && (
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                Central Bank of Nigeria (CBN) regulations mandate that all agent banking operators verify their identity with a valid Bank Verification Number (BVN) or National Identity Number (NIN).
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Bank Verification Number (BVN) / NIN (11 digits) *
                </label>
                <input
                  type="password"
                  maxLength={11}
                  required
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value)}
                  placeholder="22233344455"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37] font-mono tracking-widest"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Encrypted securely via Paystack & NIBSS identity API.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Corporate Affairs Commission (CAC) Registration No. (Optional for new agents)
                </label>
                <input
                  type="text"
                  value={cacNumber}
                  onChange={(e) => setCacNumber(e.target.value)}
                  placeholder="e.g. BN-2993810"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input type="checkbox" id="terms" defaultChecked className="w-4 h-4 text-[#176B37] rounded" />
                <label htmlFor="terms" className="text-[11px] text-gray-700 cursor-pointer">
                  I agree to abide by the AMMON Constitution, unified tariff schedules, and CBN guidelines.
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Paystack Dues Payment */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#EAF3ED] border border-[#176B37]/30 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Annual Association Subscription
                </span>
                <div className="text-2xl font-black text-[#176B37] font-mono my-1">
                  ₦{duesAmount.toLocaleString()}
                </div>
                <span className="text-[11px] text-[#14532D] font-medium">
                  Valid for 1 Full Year (Jan 2025 - Dec 2026)
                </span>
              </div>

              {/* Paystack Checkout Card */}
              <div className="border border-[#E5E7EB] rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#176B37]" />
                    <span className="font-bold text-gray-700">Paystack Secured Gateway</span>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                    256-Bit SSL
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Member:</span>
                    <strong className="text-gray-900">{fullName || 'New Operator'}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Category:</span>
                    <strong className="text-gray-900">{category}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Benefits Included:</span>
                    <strong className="text-[#176B37]">Digital ID, Legal Defense, Academy</strong>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCompleteRegistration}
                    disabled={isProcessingPayment}
                    className="w-full py-3 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <span>Connecting to Paystack...</span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay ₦{duesAmount.toLocaleString()} with Paystack</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-[#E5E7EB] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((prev) => (prev + 1) as any)}
              className="px-5 py-2 text-xs font-semibold bg-[#176B37] hover:bg-[#14532D] text-white rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
};
