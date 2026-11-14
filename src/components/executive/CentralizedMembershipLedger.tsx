import React, { useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Lock,
  AlertCircle,
  DollarSign,
  Eye,
  X,
  CreditCard,
  FileCheck2,
} from 'lucide-react';
import {
  AdminUser,
  FinancialAdjustmentRecord,
  HierarchyConfig,
  Member,
  MembershipCategory,
  PaymentStatus,
} from '../../types';
import { resolveZoneForState } from '../../data/hierarchyData';
import {
  createFinancialAdjustmentApi,
  ExecutiveApiError,
  registerMemberApi,
  updateMemberStatusApi,
  verifyPaystackApi,
} from '../../services/executiveApi';

interface CentralizedMembershipLedgerProps {
  executive: AdminUser;
  hierarchyConfig: HierarchyConfig;
  members: Member[];
  financialAdjustments: FinancialAdjustmentRecord[];
  onSelectMember: (member: Member) => void;
  onRefreshWorkspace: () => Promise<void>;
}

const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  'Paid',
  'Unpaid',
  'Partially Paid',
  'Payment Pending',
  'Expired',
  'Payment Verification Required',
];

function paymentBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-50 text-[#176B37] border-emerald-200';
    case 'Partially Paid':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'Payment Pending':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Payment Verification Required':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'Expired':
    case 'Unpaid':
    default:
      return 'bg-red-50 text-red-700 border-red-200';
  }
}

export const CentralizedMembershipLedger: React.FC<CentralizedMembershipLedgerProps> = ({
  executive,
  hierarchyConfig,
  members,
  financialAdjustments,
  onSelectMember,
  onRefreshWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [lgaFilter, setLgaFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  // Register Member Modal State
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regName, setRegName] = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCategory, setRegCategory] = useState<MembershipCategory>('POS Agents');
  const [regState, setRegState] = useState(executive.assignedState || 'Bayelsa');
  const [regLga, setRegLga] = useState(executive.assignedLga || 'Yenagoa');
  const [regWard, setRegWard] = useState(executive.assignedWard || '');
  const [regCommunity, setRegCommunity] = useState(executive.assignedCommunity || '');
  const [regTerminal, setRegTerminal] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Manual Adjustment Modal State
  const [adjustMember, setAdjustMember] = useState<Member | null>(null);
  const [adjStatus, setAdjStatus] = useState<PaymentStatus>('Paid');
  const [adjAmount, setAdjAmount] = useState('15000');
  const [adjReason, setAdjReason] = useState('');
  const [adjApproverBadge, setAdjApproverBadge] = useState(executive.badgeNumber);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const canApprove = executive.level === 'super_admin' || Boolean(executive.permissions?.canApproveMembers);
  const canRegister = executive.level === 'super_admin' || Boolean(executive.permissions?.canRegisterMembers);
  const canAdjustPayments =
    executive.level === 'super_admin' || Boolean(executive.permissions?.canAdjustPayments);

  const lgaOptions = useMemo(() => {
    return Array.from(new Set(members.map((m) => m.lga))).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.membershipId.toLowerCase().includes(q) ||
        m.businessName.toLowerCase().includes(q) ||
        m.terminalSerialNumber.toLowerCase().includes(q);
      const matchesLga = lgaFilter === 'All' || m.lga === lgaFilter;
      const matchesCat = categoryFilter === 'All' || m.category === categoryFilter;
      const pStatus = m.paymentStatus || (m.duesPaid ? 'Paid' : 'Unpaid');
      const matchesPay = paymentFilter === 'All' || pStatus === paymentFilter;
      const matchesDate = !dateFilter || m.joinedDate.includes(dateFilter);
      return matchesQ && matchesLga && matchesCat && matchesPay && matchesDate;
    });
  }, [members, searchQuery, lgaFilter, categoryFilter, paymentFilter, dateFilter]);

  const handleApproveMember = async (m: Member) => {
    setActionMsg(null);
    setBusyMemberId(m.id);
    try {
      await updateMemberStatusApi(m.id, 'Active');
      await onRefreshWorkspace();
      setActionMsg({
        type: 'success',
        text: `Approved ${m.fullName} (${m.membershipId}). Payment status remains "${m.paymentStatus || (m.duesPaid ? 'Paid' : 'Unpaid')}" until Paystack verified.`,
      });
    } catch (err) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to approve member.',
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleVerifyPaystackRef = async (m: Member) => {
    setActionMsg(null);
    setBusyMemberId(m.id);
    const ref = `PSK-LIVE-${m.state.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`;
    try {
      await verifyPaystackApi(m.id, ref, m.duesAmount);
      await onRefreshWorkspace();
      setActionMsg({
        type: 'success',
        text: `Backend verified Paystack checkout ${ref} for ${m.fullName} (₦${m.duesAmount.toLocaleString()}).`,
      });
    } catch (err) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Paystack verification failed.',
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleCreateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg(null);
    setIsRegistering(true);
    try {
      const targetState = executive.assignedState || regState;
      const targetLga = executive.assignedLga || regLga;
      const targetZone = executive.assignedZone || resolveZoneForState(targetState);
      const res = await registerMemberApi({
        fullName: regName,
        businessName: regBusiness,
        email: regEmail,
        phone: regPhone,
        category: regCategory,
        zone: targetZone,
        state: targetState,
        lga: targetLga,
        ward: executive.assignedWard || regWard || undefined,
        community: executive.assignedCommunity || regCommunity || undefined,
        terminalSerialNumber: regTerminal || undefined,
      });
      await onRefreshWorkspace();
      setShowRegisterForm(false);
      setRegName('');
      setRegBusiness('');
      setRegEmail('');
      setRegPhone('');
      setRegTerminal('');
      setActionMsg({
        type: 'success',
        text: `Registered ${res.member.fullName} (${res.member.membershipId}) in ${res.member.lga}, ${res.member.state} State. Payment Status: ${res.member.paymentStatus}.`,
      });
    } catch (err) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to register member.',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustMember) return;
    setActionMsg(null);
    setIsAdjusting(true);
    try {
      const res = await createFinancialAdjustmentApi({
        memberId: adjustMember.id,
        newStatus: adjStatus,
        newAmountPaid: Number(adjAmount) || 0,
        reason: adjReason,
        approverBadge: adjApproverBadge,
      });
      await onRefreshWorkspace();
      setAdjustMember(null);
      setAdjReason('');
      setActionMsg({
        type: 'success',
        text: `Audited adjustment [${res.adjustment.auditRef}] recorded for ${adjustMember.fullName}.`,
      });
    } catch (err) {
      const msg = err instanceof ExecutiveApiError ? err.message : 'Financial adjustment failed.';
      setActionMsg({ type: 'error', text: msg });
    } finally {
      setIsAdjusting(false);
    }
  };

  const availableStatesForForm = useMemo(() => {
    if (executive.assignedState) return [executive.assignedState];
    if (executive.assignedZone && !executive.permissions?.crossZoneAuthorized) {
      return hierarchyConfig.zones.find((z) => z.name === executive.assignedZone)?.states || ['Bayelsa'];
    }
    return hierarchyConfig.zones.flatMap((z) => z.states).sort();
  }, [executive, hierarchyConfig]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            actionMsg.type === 'success'
              ? 'bg-[#EAF3ED] border-[#176B37]/30 text-[#14532D]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#176B37] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{actionMsg.text}</span>
        </div>
      )}

      {/* Main Centralized Ledger Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#252525]">
              Centralized Membership &amp; Dues Tracking Ledger
            </h3>
            <p className="text-xs text-gray-500">
              Showing {filteredMembers.length} of {members.length} members strictly authorized for{' '}
              <strong className="text-[#176B37]">{executive.jurisdiction}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canRegister && (
              <button
                type="button"
                onClick={() => setShowRegisterForm(!showRegisterForm)}
                className="px-3.5 py-2 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showRegisterForm ? 'Close Onboarding Form' : 'Register Local Member'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Jurisdiction-Locked Member Registration Form */}
        {showRegisterForm && (
          <form
            onSubmit={handleCreateMemberSubmit}
            className="p-4 sm:p-5 rounded-2xl bg-[#F9FBFA] border border-[#176B37]/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#176B37]">
                New Member Onboarding (Scoped to {executive.jurisdiction})
              </h4>
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                Starts Unpaid until Paystack Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Tariemi Godwin"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Business / Kiosk Name *</label>
                <input
                  type="text"
                  required
                  value={regBusiness}
                  onChange={(e) => setRegBusiness(e.target.value)}
                  placeholder="e.g. Godwin FastCash Kiosk"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="operator@ammon.ng"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Membership Category *</label>
                <select
                  value={regCategory}
                  onChange={(e) => setRegCategory(e.target.value as MembershipCategory)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  <option value="POS Agents">POS Agents (₦15,000)</option>
                  <option value="Super Agents">Super Agents (₦50,000)</option>
                  <option value="Distributors">Distributors (₦75,000)</option>
                  <option value="Fintech Companies">Fintech Companies (₦250,000)</option>
                  <option value="Corporate Members">Corporate Members (₦75,000)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">POS Terminal S/N</label>
                <input
                  type="text"
                  value={regTerminal}
                  onChange={(e) => setRegTerminal(e.target.value)}
                  placeholder="e.g. MP-BAY-55109"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white font-mono focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">State *</label>
                <select
                  value={executive.assignedState || regState}
                  disabled={Boolean(executive.assignedState)}
                  onChange={(e) => setRegState(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 focus:outline-hidden focus:border-[#176B37]"
                >
                  {availableStatesForForm.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">LGA *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(executive.assignedLga)}
                  value={executive.assignedLga || regLga}
                  onChange={(e) => setRegLga(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Ward / Community</label>
                <input
                  type="text"
                  disabled={Boolean(executive.assignedWard)}
                  value={executive.assignedWard || regWard}
                  onChange={(e) => setRegWard(e.target.value)}
                  placeholder="Optional Ward"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 focus:outline-hidden focus:border-[#176B37]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRegistering}
                className="px-5 py-2 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isRegistering ? 'Registering...' : 'Submit Member Record'}
              </button>
            </div>
          </form>
        )}

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Member ID, Name, Business or Terminal..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-gray-50/50 focus:outline-hidden focus:border-[#176B37]"
            />
          </div>

          <select
            value={lgaFilter}
            onChange={(e) => setLgaFilter(e.target.value)}
            className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-xs text-gray-700 focus:outline-hidden focus:border-[#176B37]"
          >
            <option value="All">All LGAs in Scope</option>
            {lgaOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-xs text-gray-700 focus:outline-hidden focus:border-[#176B37]"
          >
            <option value="All">All Categories</option>
            <option value="POS Agents">POS Agents</option>
            <option value="Super Agents">Super Agents</option>
            <option value="Fintech Companies">Fintech Companies</option>
            <option value="Distributors">Distributors</option>
            <option value="Corporate Members">Corporate Members</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-xs text-gray-700 focus:outline-hidden focus:border-[#176B37]"
          >
            <option value="All">All Payment Statuses</option>
            {PAYMENT_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Registration Date Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <span>Filter by Joined Date (YYYY or YYYY-MM):</span>
            <input
              type="text"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="e.g. 2025-11"
              className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] font-mono text-[11px] w-32 focus:outline-hidden focus:border-[#176B37]"
            />
          </div>
          {!canAdjustPayments && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              <Lock className="w-3 h-3 text-gray-500" />
              <span>Paystack Backend Enforcement Active: Executives cannot manually mark unpaid members as Paid.</span>
            </span>
          )}
        </div>

        {/* Members Ledger Table */}
        <div className="rounded-xl border border-[#E5E7EB] overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[920px]">
            <thead className="bg-[#EAF3ED]/70 text-[#14532D] font-bold border-b border-[#E5E7EB]">
              <tr>
                <th className="py-3 px-3.5">Member &amp; ID</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Zone / State / LGA / Ward</th>
                <th className="py-3 px-3.5">Reg &amp; Expiry Dates</th>
                <th className="py-3 px-3.5">Membership Status</th>
                <th className="py-3 px-3.5">Payment Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No centralized membership records found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const pStatus: PaymentStatus =
                    m.paymentStatus || (m.duesPaid ? 'Paid' : 'Unpaid');
                  const paidAmt = m.amountPaid ?? (m.duesPaid ? m.duesAmount : 0);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-[#252525]">{m.fullName}</div>
                        <div className="text-[11px] text-gray-500">{m.businessName}</div>
                        <div className="text-[10px] font-mono font-bold text-[#176B37] mt-0.5">
                          {m.membershipId}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-gray-700 font-medium">{m.category}</td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-[#252525]">
                          {m.state} · {m.lga}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {m.zone || resolveZoneForState(m.state)}
                          {m.ward ? ` · ${m.ward}` : ''}
                          {m.community ? ` (${m.community})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-gray-600">
                        <div>Joined: {m.joinedDate}</div>
                        <div className="text-gray-400">Exp: {m.expiryDate}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            m.status === 'Active'
                              ? 'bg-emerald-50 text-[#176B37] border-emerald-200'
                              : m.status === 'Expired'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${paymentBadgeClass(
                            pStatus
                          )}`}
                        >
                          {pStatus}
                        </span>
                        <div className="text-[10px] font-mono text-gray-600 mt-1">
                          ₦{paidAmt.toLocaleString()} / ₦{(m.duesAmount || 0).toLocaleString()}
                        </div>
                        {m.paystackVerified ? (
                          <div className="text-[9px] font-mono text-[#176B37] flex items-center gap-0.5 mt-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Paystack Verified</span>
                          </div>
                        ) : (
                          <div className="text-[9px] text-gray-400 mt-0.5">No verified gateway ref</div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectMember(m)}
                            className="px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:border-[#176B37] hover:text-[#176B37] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>ID</span>
                          </button>

                          {canApprove && m.status !== 'Active' && (
                            <button
                              type="button"
                              disabled={busyMemberId === m.id}
                              onClick={() => handleApproveMember(m)}
                              className="px-2 py-1 rounded-lg bg-[#176B37] hover:bg-[#14532D] text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}

                          {pStatus !== 'Paid' && (
                            <button
                              type="button"
                              disabled={busyMemberId === m.id}
                              onClick={() => handleVerifyPaystackRef(m)}
                              className="px-2 py-1 rounded-lg bg-[#EAF3ED] hover:bg-[#176B37] text-[#176B37] hover:text-white border border-[#176B37]/30 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                              title="Verify payment reference through Paystack backend verifier"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Verify Paystack</span>
                            </button>
                          )}

                          {canAdjustPayments ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustMember(m);
                                setAdjStatus(pStatus);
                                setAdjAmount(String(paidAmt));
                                setAdjReason('');
                                setAdjApproverBadge(executive.badgeNumber);
                              }}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold cursor-pointer"
                            >
                              Adjust
                            </button>
                          ) : (
                            <span
                              className="px-2 py-1 rounded-lg bg-gray-100 text-gray-400 text-[10px] font-medium inline-flex items-center gap-1"
                              title="Manual financial overrides require Super Admin or National Audit clearance"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              Locked
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audited Financial Adjustments History */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div>
            <h4 className="font-bold text-sm text-[#252525] flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-[#176B37]" />
              <span>Authorized Financial Adjustment Ledger</span>
            </h4>
            <p className="text-[11px] text-gray-500">
              Every manual payment correction requires a documented reason, authorized approver, and immutable audit ref
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-[#EAF3ED] text-[#176B37] px-2.5 py-0.5 rounded-full">
            {financialAdjustments.length} Records
          </span>
        </div>

        {financialAdjustments.length === 0 ? (
          <p className="text-xs text-gray-500 py-3">No manual financial adjustments recorded in this jurisdiction.</p>
        ) : (
          <div className="space-y-2.5">
            {financialAdjustments.map((adj) => (
              <div
                key={adj.id}
                className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FBFA] text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#176B37]">{adj.auditRef}</span>
                    <span className="font-bold text-[#252525]">{adj.memberName}</span>
                    <span className="text-[11px] font-mono text-gray-500">({adj.membershipId})</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{adj.createdAt}</span>
                </div>
                <p className="text-gray-700">
                  <strong>Change:</strong> {adj.previousStatus} (₦{adj.previousAmountPaid.toLocaleString()}) →{' '}
                  <strong className="text-[#176B37]">{adj.newStatus} (₦{adj.newAmountPaid.toLocaleString()})</strong>
                </p>
                <p className="text-gray-600">
                  <strong>Reason:</strong> {adj.reason}
                </p>
                <p className="text-[11px] text-gray-500">
                  Approved by: <strong>{adj.approvedByName}</strong> ({adj.approvedByPosition})
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Authorized Financial Adjustment Modal */}
      {adjustMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E5E7EB] shadow-2xl overflow-hidden">
            <div className="bg-[#14532D] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-300" />
                <div>
                  <h4 className="font-bold text-sm">Audited Financial Adjustment</h4>
                  <p className="text-[10px] text-emerald-100">{adjustMember.fullName} ({adjustMember.membershipId})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustMember(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">New Payment Status *</label>
                <select
                  value={adjStatus}
                  onChange={(e) => setAdjStatus(e.target.value as PaymentStatus)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  {PAYMENT_STATUS_OPTIONS.map((st) => (
                    <option
                      key={st}
                      value={st}
                      disabled={st === 'Partially Paid' && !hierarchyConfig.allowPartialPayments}
                    >
                      {st}
                      {st === 'Partially Paid' && !hierarchyConfig.allowPartialPayments ? ' (Disabled by Policy)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Amount Paid (₦) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Authorized Approver Badge ID *</label>
                <input
                  type="text"
                  required
                  value={adjApproverBadge}
                  onChange={(e) => setAdjApproverBadge(e.target.value)}
                  placeholder="e.g. AMMON-HQ-001 or AMMON-SPEC-01"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Documented Audit Reason (min 10 chars) *
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Cite verified teller/bank slip reference or National Audit reconciliation memo..."
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustMember(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="px-5 py-2 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isAdjusting ? 'Recording Audit...' : 'Commit Audited Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
