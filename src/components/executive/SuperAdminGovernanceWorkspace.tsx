import React, { useMemo, useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Settings,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Layers,
  Copy,
  Check,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  AdminUser,
  ExecutiveLevel,
  ExecutivePermissions,
  HierarchyConfig,
} from '../../types';
import { defaultPermissionsForLevel } from '../../data/hierarchyData';
import {
  createExecutiveAccountApi,
  updateExecutiveAccountApi,
  updateHierarchyConfigApi,
} from '../../services/executiveApi';

interface SuperAdminGovernanceWorkspaceProps {
  executive: AdminUser;
  executives: AdminUser[];
  hierarchyConfig: HierarchyConfig;
  onRefreshWorkspace: () => Promise<void>;
}

const EXECUTIVE_LEVEL_LABELS: { value: ExecutiveLevel; label: string }[] = [
  { value: 'national', label: 'National Executive' },
  { value: 'zonal', label: 'Zonal Executive' },
  { value: 'state', label: 'State Executive' },
  { value: 'lga', label: 'LGA Executive' },
  { value: 'ward', label: 'Ward Executive' },
  { value: 'community', label: 'Community Executive' },
  { value: 'specialized', label: 'Specialized Executive Officer' },
];

export const SuperAdminGovernanceWorkspace: React.FC<SuperAdminGovernanceWorkspaceProps> = ({
  executive,
  executives,
  hierarchyConfig,
  onRefreshWorkspace,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'roster' | 'hierarchy'>('create');

  // Create Executive Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<ExecutiveLevel>('state');
  const [position, setPosition] = useState('State Secretary');
  const [assignedZone, setAssignedZone] = useState('South-South');
  const [assignedState, setAssignedState] = useState('Bayelsa');
  const [assignedLga, setAssignedLga] = useState('Yenagoa');
  const [assignedWard, setAssignedWard] = useState('Epie Ward 1');
  const [assignedCommunity, setAssignedCommunity] = useState('Amarata Community');
  const [specialtyScope, setSpecialtyScope] = useState('Regional Compliance & Audit');
  const [activationStatus, setActivationStatus] =
    useState<AdminUser['activationStatus']>('Invited - Password Setup Required');
  const [permissions, setPermissions] = useState<ExecutivePermissions>(() =>
    defaultPermissionsForLevel('state')
  );

  const [creating, setCreating] = useState(false);
  const [provisionedCreds, setProvisionedCreds] = useState<{
    executive: AdminUser;
    tempPassword: string;
    inviteCode: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState('');

  // Hierarchy Editor State
  const [draftConfig, setDraftConfig] = useState<HierarchyConfig>(hierarchyConfig);
  const [newLgaState, setNewLgaState] = useState('Bayelsa');
  const [newLgaName, setNewLgaName] = useState('');
  const [newWardLgaKey, setNewWardLgaKey] = useState('Bayelsa::Yenagoa');
  const [newWardName, setNewWardName] = useState('');
  const [newCommWardKey, setNewCommWardKey] = useState('Bayelsa::Yenagoa::Epie Ward 1');
  const [newCommName, setNewCommName] = useState('');
  const [newSpecPos, setNewSpecPos] = useState('');
  const [savingHierarchy, setSavingHierarchy] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const statesInZone = useMemo(() => {
    return hierarchyConfig.zones.find((z) => z.name === assignedZone)?.states || ['Bayelsa'];
  }, [hierarchyConfig, assignedZone]);

  const lgasInState = useMemo(() => {
    return hierarchyConfig.lgasByState[assignedState] || ['Central LGA'];
  }, [hierarchyConfig, assignedState]);

  const wardsInLga = useMemo(() => {
    return hierarchyConfig.wardsByLga[`${assignedState}::${assignedLga}`] || ['Ward 1'];
  }, [hierarchyConfig, assignedState, assignedLga]);

  const communitiesInWard = useMemo(() => {
    return (
      hierarchyConfig.communitiesByWard[`${assignedState}::${assignedLga}::${assignedWard}`] || [
        'Main Market Community',
      ]
    );
  }, [hierarchyConfig, assignedState, assignedLga, assignedWard]);

  const handleLevelChange = (nextLevel: ExecutiveLevel) => {
    setLevel(nextLevel);
    setPermissions(defaultPermissionsForLevel(nextLevel));
  };

  const handleCreateExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setCreating(true);
    try {
      const res = await createExecutiveAccountApi({
        fullName,
        email,
        phone,
        level,
        position,
        assignedZone:
          level === 'zonal' || level === 'state' || level === 'lga' || level === 'ward' || level === 'community'
            ? assignedZone
            : undefined,
        assignedState:
          level === 'state' || level === 'lga' || level === 'ward' || level === 'community'
            ? assignedState
            : undefined,
        assignedLga:
          level === 'lga' || level === 'ward' || level === 'community' ? assignedLga : undefined,
        assignedWard: level === 'ward' || level === 'community' ? assignedWard : undefined,
        assignedCommunity: level === 'community' ? assignedCommunity : undefined,
        specialtyScope: level === 'specialized' ? specialtyScope : undefined,
        activationStatus,
        permissions,
      });
      setProvisionedCreds(res);
      await onRefreshWorkspace();
      setFullName('');
      setEmail('');
      setPhone('');
      setFeedback({
        type: 'success',
        text: `Provisioned individual account for ${res.executive.fullName} (${res.executive.jurisdiction}).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create executive account.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleSuspension = async (target: AdminUser) => {
    setFeedback(null);
    const nextStatus =
      target.activationStatus === 'Suspended' ? 'Active' : 'Suspended';
    try {
      await updateExecutiveAccountApi(target.id, { activationStatus: nextStatus });
      await onRefreshWorkspace();
      setFeedback({
        type: 'success',
        text: `${target.fullName} status changed to "${nextStatus}".`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update account status.',
      });
    }
  };

  const handleTogglePermission = async (
    target: AdminUser,
    key: keyof ExecutivePermissions
  ) => {
    if (!target.permissions) return;
    try {
      await updateExecutiveAccountApi(target.id, {
        permissions: {
          [key]: !target.permissions[key],
        },
      });
      await onRefreshWorkspace();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update executive permission.',
      });
    }
  };

  const handleSaveHierarchy = async () => {
    setFeedback(null);
    setSavingHierarchy(true);
    try {
      await updateHierarchyConfigApi(draftConfig);
      await onRefreshWorkspace();
      setFeedback({
        type: 'success',
        text: 'AMMON Administrative Hierarchy & Payment Rules saved to backend.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save hierarchy config.',
      });
    } finally {
      setSavingHierarchy(false);
    }
  };

  const copyText = (label: string, val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 1800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Sub-navigation bar */}
      <div className="bg-white p-2 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('create')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeSubTab === 'create'
              ? 'bg-[#176B37] text-white'
              : 'text-gray-700 hover:bg-[#EAF3ED] hover:text-[#176B37]'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Create Executive Account</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeSubTab === 'roster'
              ? 'bg-[#176B37] text-white'
              : 'text-gray-700 hover:bg-[#EAF3ED] hover:text-[#176B37]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Executive Roster &amp; Permissions ({executives.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDraftConfig(hierarchyConfig);
            setActiveSubTab('hierarchy');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeSubTab === 'hierarchy'
              ? 'bg-[#176B37] text-white'
              : 'text-gray-700 hover:bg-[#EAF3ED] hover:text-[#176B37]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Configure Administrative Hierarchy</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'bg-[#EAF3ED] border-[#176B37]/30 text-[#14532D]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#176B37] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* TAB 1: CREATE EXECUTIVE ACCOUNT */}
      {activeSubTab === 'create' && (
        <div className="space-y-5">
          {provisionedCreds && (
            <div className="p-5 rounded-2xl bg-[#EAF3ED] border border-[#176B37]/40 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-[#14532D] font-bold text-sm">
                <KeyRound className="w-4 h-4 text-[#176B37]" />
                <span>Executive Onboarding Invitation Generated</span>
              </div>
              <p className="text-gray-700">
                Share these one-time credentials with{' '}
                <strong>{provisionedCreds.executive.fullName}</strong>. On first login at the unified Executive Login portal, they will be required to establish their personal secure password.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-[#176B37]/20 font-mono">
                <div>
                  <span className="text-[10px] text-gray-400 block font-sans">Login Email</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <strong className="text-[#252525] truncate">{provisionedCreds.executive.email}</strong>
                    <button
                      type="button"
                      onClick={() => copyText('email', provisionedCreds.executive.email)}
                      className="text-[#176B37] cursor-pointer"
                    >
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 block font-sans">Temporary Password</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <strong className="text-[#176B37]">{provisionedCreds.tempPassword}</strong>
                    <button
                      type="button"
                      onClick={() => copyText('pass', provisionedCreds.tempPassword)}
                      className="text-[#176B37] cursor-pointer"
                    >
                      {copiedField === 'pass' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 block font-sans">Secure Invite Code</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <strong className="text-[#14532D]">{provisionedCreds.inviteCode}</strong>
                    <button
                      type="button"
                      onClick={() => copyText('code', provisionedCreds.inviteCode)}
                      className="text-[#176B37] cursor-pointer"
                    >
                      {copiedField === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form
            onSubmit={handleCreateExecutive}
            className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-xs"
          >
            <div className="pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-[#252525]">Provision Individual Executive Account</h3>
              <p className="text-xs text-gray-500">
                Assign official position, administrative level, geographical jurisdiction, and role-based permissions
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Chief Tariwari George"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Official Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. bayelsa.sec@ammon.ng"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Administrative Level *</label>
                <select
                  value={level}
                  onChange={(e) => handleLevelChange(e.target.value as ExecutiveLevel)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  {EXECUTIVE_LEVEL_LABELS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Official Executive Position *</label>
                <input
                  type="text"
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. State Chairman, LGA Coordinator"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Account Activation Status *</label>
                <select
                  value={activationStatus}
                  onChange={(e) =>
                    setActivationStatus(e.target.value as AdminUser['activationStatus'])
                  }
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  <option value="Invited - Password Setup Required">
                    Invited - Require Personal Password Setup
                  </option>
                  <option value="Active">Active Immediately (Using Temp Password)</option>
                </select>
              </div>
            </div>

            {/* Cascading Geographical Assignment */}
            {(level === 'zonal' ||
              level === 'state' ||
              level === 'lga' ||
              level === 'ward' ||
              level === 'community') && (
              <div className="p-4 rounded-2xl bg-[#F9FBFA] border border-[#E5E7EB] space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#176B37]">
                  Jurisdiction Assignment (Enforced by Backend &amp; Firestore Rules)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Assigned Zone *</label>
                    <select
                      value={assignedZone}
                      onChange={(e) => {
                        const z = e.target.value;
                        setAssignedZone(z);
                        const firstState =
                          hierarchyConfig.zones.find((zn) => zn.name === z)?.states[0] || '';
                        setAssignedState(firstState);
                      }}
                      className="w-full p-2 rounded-xl border border-[#E5E7EB] bg-white"
                    >
                      {hierarchyConfig.zones.map((z) => (
                        <option key={z.name} value={z.name}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(level === 'state' ||
                    level === 'lga' ||
                    level === 'ward' ||
                    level === 'community') && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Assigned State *</label>
                      <select
                        value={assignedState}
                        onChange={(e) => {
                          const st = e.target.value;
                          setAssignedState(st);
                          const firstLga = hierarchyConfig.lgasByState[st]?.[0] || '';
                          setAssignedLga(firstLga);
                        }}
                        className="w-full p-2 rounded-xl border border-[#E5E7EB] bg-white"
                      >
                        {statesInZone.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(level === 'lga' || level === 'ward' || level === 'community') && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Assigned LGA *</label>
                      <input
                        type="text"
                        required
                        list="ammon-lga-options"
                        value={assignedLga}
                        onChange={(e) => setAssignedLga(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#E5E7EB] bg-white"
                      />
                      <datalist id="ammon-lga-options">
                        {lgasInState.map((l) => (
                          <option key={l} value={l} />
                        ))}
                      </datalist>
                    </div>
                  )}

                  {(level === 'ward' || level === 'community') && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Assigned Ward *</label>
                      <input
                        type="text"
                        required
                        list="ammon-ward-options"
                        value={assignedWard}
                        onChange={(e) => setAssignedWard(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#E5E7EB] bg-white"
                      />
                      <datalist id="ammon-ward-options">
                        {wardsInLga.map((w) => (
                          <option key={w} value={w} />
                        ))}
                      </datalist>
                    </div>
                  )}

                  {level === 'community' && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Assigned Community *
                      </label>
                      <input
                        type="text"
                        required
                        list="ammon-comm-options"
                        value={assignedCommunity}
                        onChange={(e) => setAssignedCommunity(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#E5E7EB] bg-white"
                      />
                      <datalist id="ammon-comm-options">
                        {communitiesInWard.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                  )}
                </div>
              </div>
            )}

            {level === 'specialized' && (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Specialized Directorate Portfolio *
                </label>
                <input
                  type="text"
                  required
                  value={specialtyScope}
                  onChange={(e) => setSpecialtyScope(e.target.value)}
                  placeholder="e.g. Anti-Fraud & Cyber Taskforce"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB]"
                />
              </div>
            )}

            {/* Granular Permissions Matrix */}
            <div className="p-4 rounded-2xl bg-[#F9FBFA] border border-[#E5E7EB] space-y-2.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                Role-Based Security Permissions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(
                  [
                    ['canApproveMembers', 'Approve Membership Applications'],
                    ['canRegisterMembers', 'Register New Members in Scope'],
                    ['canAdjustPayments', 'Financial Adjustment Approver (Audit)'],
                    ['canPublishAnnouncements', 'Publish Targeted Announcements'],
                    ['canSubmitReports', 'Submit Activity Reports'],
                    ['canReviewReports', 'Review Subordinate Reports'],
                    ['canManageMeetings', 'Schedule Jurisdiction Meetings'],
                    ['canViewAuditLogs', 'View Full Governance Audit Logs'],
                    ['crossZoneAuthorized', 'Cross-Zone Access Authorization'],
                  ] as [keyof ExecutivePermissions, string][]
                ).map(([permKey, label]) => (
                  <label
                    key={permKey}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-[#176B37]/40"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(permissions[permKey])}
                      onChange={() =>
                        setPermissions((prev) => ({ ...prev, [permKey]: !prev[permKey] }))
                      }
                      className="w-3.5 h-3.5 accent-[#176B37]"
                    />
                    <span className="text-[11px] font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{creating ? 'Provisioning Account...' : 'Create Executive Account & Generate Credentials'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: EXECUTIVE ROSTER & PERMISSIONS */}
      {activeSubTab === 'roster' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="font-bold text-base text-[#252525]">Executive Accounts Directory</h3>
            <p className="text-xs text-gray-500">
              Manage individual logins, activation status, and role permissions across all levels
            </p>
          </div>

          <div className="space-y-3">
            {executives.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FBFA] space-y-2.5 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#252525]">{item.fullName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#176B37] text-white font-bold text-[10px] uppercase">
                        {item.level || item.role}
                      </span>
                      <span className="font-mono text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {item.badgeNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {item.position || item.title} · <strong className="text-[#14532D]">{item.jurisdiction}</strong>
                    </p>
                    <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                      {item.email} · {item.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        item.activationStatus === 'Suspended'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : item.activationStatus === 'Invited - Password Setup Required'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-[#176B37] border-emerald-200'
                      }`}
                    >
                      {item.activationStatus || 'Active'}
                    </span>

                    {item.id !== executive.id && (
                      <button
                        type="button"
                        onClick={() => handleToggleSuspension(item)}
                        className={`px-3 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer ${
                          item.activationStatus === 'Suspended'
                            ? 'bg-[#176B37] text-white hover:bg-[#14532D]'
                            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {item.activationStatus === 'Suspended' ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {item.permissions && item.level !== 'super_admin' && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-200/70">
                    {(
                      [
                        ['canApproveMembers', 'Approve Members'],
                        ['canRegisterMembers', 'Register Members'],
                        ['canAdjustPayments', 'Financial Adjuster'],
                        ['canPublishAnnouncements', 'Publish Notices'],
                        ['canReviewReports', 'Review Reports'],
                        ['crossZoneAuthorized', 'Cross-Zone Access'],
                      ] as [keyof ExecutivePermissions, string][]
                    ).map(([permKey, lbl]) => {
                      const active = Boolean(item.permissions?.[permKey]);
                      return (
                        <button
                          key={permKey}
                          type="button"
                          onClick={() => handleTogglePermission(item, permKey)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#EAF3ED] text-[#176B37] border-[#176B37]/30'
                              : 'bg-white text-gray-400 border-gray-200'
                          }`}
                        >
                          {active ? '✓ ' : '✕ '}
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURABLE HIERARCHY STRUCTURE */}
      {activeSubTab === 'hierarchy' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-base text-[#252525] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#176B37]" />
                <span>Configurable Administrative Structure &amp; Payment Policies</span>
              </h3>
              <p className="text-xs text-gray-500">
                Enable/disable executive levels, register LGAs, Wards, Communities, Specialized Positions, and partial payment rules
              </p>
            </div>

            <button
              type="button"
              disabled={savingHierarchy}
              onClick={handleSaveHierarchy}
              className="px-4 py-2 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {savingHierarchy ? 'Saving Configuration...' : 'Save Hierarchy Configuration'}
            </button>
          </div>

          {/* Toggleable Administrative Levels */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
              Executive Administrative Tiers
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {draftConfig.administrativeLevels.map((lvl, idx) => (
                <div
                  key={lvl.level}
                  className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F9FBFA] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-[#252525]">
                      Rank {lvl.rank}: {lvl.label}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{lvl.description}</p>
                  </div>
                  <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={lvl.level === 'super_admin'}
                      checked={lvl.enabled}
                      onChange={() => {
                        setDraftConfig((prev) => ({
                          ...prev,
                          administrativeLevels: prev.administrativeLevels.map((item, i) =>
                            i === idx ? { ...item, enabled: !item.enabled } : item
                          ),
                        }));
                      }}
                      className="w-4 h-4 accent-[#176B37]"
                    />
                    <span className="font-semibold text-[11px]">{lvl.enabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Partial Payments Policy */}
          <div className="p-4 rounded-xl bg-[#EAF3ED]/70 border border-[#176B37]/25 flex items-center justify-between gap-4">
            <div>
              <h5 className="font-bold text-xs text-[#14532D]">Allow "Partially Paid" Dues Category</h5>
              <p className="text-[11px] text-gray-700 mt-0.5">
                When enabled, audited installment payments may be categorized as Partially Paid until Paystack completion.
              </p>
            </div>
            <label className="flex items-center gap-2 font-bold text-xs text-[#176B37] cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={draftConfig.allowPartialPayments}
                onChange={() =>
                  setDraftConfig((prev) => ({
                    ...prev,
                    allowPartialPayments: !prev.allowPartialPayments,
                  }))
                }
                className="w-4 h-4 accent-[#176B37]"
              />
              <span>{draftConfig.allowPartialPayments ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {/* Add LGA / Ward / Community / Specialized Position */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#E5E7EB] space-y-2.5">
              <h5 className="font-bold text-xs text-[#252525]">Register LGA under State</h5>
              <div className="flex gap-2">
                <select
                  value={newLgaState}
                  onChange={(e) => setNewLgaState(e.target.value)}
                  className="p-2 rounded-xl border border-[#E5E7EB] bg-white"
                >
                  {draftConfig.zones.flatMap((z) => z.states).sort().map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newLgaName}
                  onChange={(e) => setNewLgaName(e.target.value)}
                  placeholder="New LGA Name..."
                  className="flex-1 p-2 rounded-xl border border-[#E5E7EB]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newLgaName.trim()) return;
                    setDraftConfig((prev) => ({
                      ...prev,
                      lgasByState: {
                        ...prev.lgasByState,
                        [newLgaState]: Array.from(
                          new Set([...(prev.lgasByState[newLgaState] || []), newLgaName.trim()])
                        ),
                      },
                    }));
                    setNewLgaName('');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#176B37] text-white font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] space-y-2.5">
              <h5 className="font-bold text-xs text-[#252525]">Register Specialized Executive Title</h5>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSpecPos}
                  onChange={(e) => setNewSpecPos(e.target.value)}
                  placeholder="e.g. Regional CBN Switch Liaison"
                  className="flex-1 p-2 rounded-xl border border-[#E5E7EB]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newSpecPos.trim()) return;
                    setDraftConfig((prev) => ({
                      ...prev,
                      specializedPositions: Array.from(
                        new Set([...prev.specializedPositions, newSpecPos.trim()])
                      ),
                    }));
                    setNewSpecPos('');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#176B37] text-white font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] space-y-2.5">
              <h5 className="font-bold text-xs text-[#252525]">Register Ward under State::LGA</h5>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWardLgaKey}
                  onChange={(e) => setNewWardLgaKey(e.target.value)}
                  placeholder="State::LGA"
                  className="w-36 p-2 rounded-xl border border-[#E5E7EB] font-mono text-[11px]"
                />
                <input
                  type="text"
                  value={newWardName}
                  onChange={(e) => setNewWardName(e.target.value)}
                  placeholder="New Ward Name..."
                  className="flex-1 p-2 rounded-xl border border-[#E5E7EB]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newWardName.trim() || !newWardLgaKey.trim()) return;
                    setDraftConfig((prev) => ({
                      ...prev,
                      wardsByLga: {
                        ...prev.wardsByLga,
                        [newWardLgaKey.trim()]: Array.from(
                          new Set([...(prev.wardsByLga[newWardLgaKey.trim()] || []), newWardName.trim()])
                        ),
                      },
                    }));
                    setNewWardName('');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#176B37] text-white font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] space-y-2.5">
              <h5 className="font-bold text-xs text-[#252525]">Register Community under State::LGA::Ward</h5>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCommWardKey}
                  onChange={(e) => setNewCommWardKey(e.target.value)}
                  placeholder="State::LGA::Ward"
                  className="w-40 p-2 rounded-xl border border-[#E5E7EB] font-mono text-[11px]"
                />
                <input
                  type="text"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  placeholder="New Community..."
                  className="flex-1 p-2 rounded-xl border border-[#E5E7EB]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCommName.trim() || !newCommWardKey.trim()) return;
                    setDraftConfig((prev) => ({
                      ...prev,
                      communitiesByWard: {
                        ...prev.communitiesByWard,
                        [newCommWardKey.trim()]: Array.from(
                          new Set([
                            ...(prev.communitiesByWard[newCommWardKey.trim()] || []),
                            newCommName.trim(),
                          ])
                        ),
                      },
                    }));
                    setNewCommName('');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#176B37] text-white font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
