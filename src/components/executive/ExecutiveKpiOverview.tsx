import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  MapPin,
  Filter,
  Lock,
  ShieldAlert,
  TrendingUp,
  FileText,
  Megaphone,
  Film,
  Play,
  ArrowRight,
} from 'lucide-react';
import {
  AdminUser,
  DisputeTicket,
  ExecutiveAnnouncement,
  ExecutiveReport,
  HierarchyConfig,
  Member,
  OnlineMeeting,
} from '../../types';
import { resolveZoneForState } from '../../data/hierarchyData';
import { ExecutiveApiError, fetchExecutiveWorkspace } from '../../services/executiveApi';

interface ExecutiveKpiOverviewProps {
  executive: AdminUser;
  hierarchyConfig: HierarchyConfig;
  members: Member[];
  reports: ExecutiveReport[];
  announcements: ExecutiveAnnouncement[];
  disputes: DisputeTicket[];
  meetings?: OnlineMeeting[];
  metrics: {
    totalMembers: number;
    activeMembers: number;
    pendingMembers: number;
    expiredMembers: number;
    totalCollectedDues: number;
    paystackVerifiedDues: number;
    outstandingDues: number;
  };
  onFilterWorkspace: (filters: { zone?: string; state?: string; lga?: string }) => Promise<void>;
  onNavigateSection: (section: string) => void;
  onSecurityAuditRefresh?: () => void;
}

function dashboardTitleForLevel(exec: AdminUser): string {
  switch (exec.level) {
    case 'super_admin':
      return 'SUPER ADMIN COMMAND DASHBOARD';
    case 'national':
      return 'NATIONAL EXECUTIVE DASHBOARD';
    case 'zonal':
      return 'ZONAL EXECUTIVE DASHBOARD';
    case 'state':
      return 'STATE EXECUTIVE DASHBOARD';
    case 'lga':
      return 'LGA EXECUTIVE DASHBOARD';
    case 'ward':
      return 'WARD EXECUTIVE DASHBOARD';
    case 'community':
      return 'COMMUNITY EXECUTIVE DASHBOARD';
    case 'specialized':
      return 'SPECIALIZED OFFICER DASHBOARD';
    default:
      return 'EXECUTIVE GOVERNANCE DASHBOARD';
  }
}

export const ExecutiveKpiOverview: React.FC<ExecutiveKpiOverviewProps> = ({
  executive,
  hierarchyConfig,
  members,
  reports,
  announcements,
  disputes,
  meetings = [],
  metrics,
  onFilterWorkspace,
  onNavigateSection,
  onSecurityAuditRefresh,
}) => {
  const savedRecordings = useMemo(() => {
    const items: {
      id: string;
      title: string;
      meetingTitle: string;
      durationLabel: string;
      sizeLabel: string;
      recordedBy: string;
      recordedAt: string;
      storagePath: string;
      url: string;
      createdAtMs: number;
    }[] = [];
    for (const mtg of meetings) {
      if (!Array.isArray(mtg.recordings)) continue;
      for (const rec of mtg.recordings) {
        items.push({
          id: rec.id,
          title: rec.title,
          meetingTitle: mtg.title,
          durationLabel: rec.durationLabel,
          sizeLabel: rec.sizeLabel,
          recordedBy: rec.recordedBy,
          recordedAt: rec.recordedAt,
          storagePath: rec.storagePath,
          url: rec.url,
          createdAtMs: rec.createdAtMs || 0,
        });
      }
    }
    return items.sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [meetings]);
  const level = executive.level || (executive.role === 'Super Admin' ? 'super_admin' : 'national');
  const isNationalScope =
    level === 'super_admin' ||
    level === 'national' ||
    (level === 'specialized' && Boolean(executive.permissions?.crossZoneAuthorized));

  const [selectedZone, setSelectedZone] = useState<string>(
    isNationalScope ? 'All' : executive.assignedZone || 'All'
  );
  const [selectedState, setSelectedState] = useState<string>(
    level === 'state' || level === 'lga' || level === 'ward' || level === 'community'
      ? executive.assignedState || 'All'
      : 'All'
  );
  const [selectedLga, setSelectedLga] = useState<string>(
    level === 'lga' || level === 'ward' || level === 'community'
      ? executive.assignedLga || 'All'
      : 'All'
  );

  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    status: 'denied' | 'allowed' | 'error';
    message: string;
    code?: string;
    target: string;
  } | null>(null);
  const [isProbing, setIsProbing] = useState(false);

  const availableStates = useMemo(() => {
    if (level === 'state' || level === 'lga' || level === 'ward' || level === 'community') {
      return executive.assignedState ? [executive.assignedState] : [];
    }
    if (level === 'zonal' && !executive.permissions?.crossZoneAuthorized) {
      return (
        hierarchyConfig.zones.find((z) => z.name === executive.assignedZone)?.states || []
      );
    }
    if (selectedZone !== 'All') {
      return hierarchyConfig.zones.find((z) => z.name === selectedZone)?.states || [];
    }
    return hierarchyConfig.zones.flatMap((z) => z.states).sort();
  }, [level, executive, hierarchyConfig, selectedZone]);

  const availableLgas = useMemo(() => {
    if (level === 'lga' || level === 'ward' || level === 'community') {
      return executive.assignedLga ? [executive.assignedLga] : [];
    }
    if (selectedState !== 'All') {
      const configured = hierarchyConfig.lgasByState[selectedState] || [];
      const fromMembers = Array.from(
        new Set(members.filter((m) => m.state === selectedState).map((m) => m.lga))
      );
      return Array.from(new Set([...configured, ...fromMembers]));
    }
    return [];
  }, [level, executive, selectedState, hierarchyConfig, members]);

  // Geographical performance aggregation appropriate to level
  const geoBreakdown = useMemo(() => {
    const groups: Record<
      string,
      { label: string; total: number; active: number; pending: number; collected: number; outstanding: number }
    > = {};

    members.forEach((m) => {
      let key = m.state;
      if (isNationalScope && selectedZone === 'All' && selectedState === 'All') {
        key = m.zone || resolveZoneForState(m.state);
      } else if (level === 'zonal' && selectedState === 'All') {
        key = `${m.state} State`;
      } else if (level === 'state' || selectedState !== 'All') {
        key = `${m.lga} LGA`;
      }
      if (level === 'lga' || level === 'ward' || level === 'community') {
        key = m.ward || m.community || `${m.lga} Hub`;
      }

      if (!groups[key]) {
        groups[key] = { label: key, total: 0, active: 0, pending: 0, collected: 0, outstanding: 0 };
      }
      groups[key].total += 1;
      if (m.status === 'Active') groups[key].active += 1;
      else groups[key].pending += 1;
      const paid = m.amountPaid ?? (m.duesPaid ? m.duesAmount : 0);
      groups[key].collected += paid;
      groups[key].outstanding += Math.max(0, (m.duesAmount || 0) - paid);
    });

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [members, isNationalScope, level, selectedZone, selectedState]);

  const handleApplyGeoFilter = async () => {
    setIsApplyingFilter(true);
    try {
      await onFilterWorkspace({
        zone: selectedZone,
        state: selectedState,
        lga: selectedLga,
      });
    } finally {
      setIsApplyingFilter(false);
    }
  };

  const handleExportScopedReport = () => {
    const headers = [
      'Membership ID',
      'Member Name',
      'Category',
      'Zone',
      'State',
      'LGA',
      'Ward',
      'Community',
      'Membership Status',
      'Payment Status',
      'Amount Paid (NGN)',
      'Paystack Verified',
      'Joined Date',
      'Expiry Date',
    ];
    const rows = members.map((m) => [
      m.membershipId,
      `"${m.fullName}"`,
      `"${m.category}"`,
      `"${m.zone || resolveZoneForState(m.state)}"`,
      `"${m.state}"`,
      `"${m.lga}"`,
      `"${m.ward || ''}"`,
      `"${m.community || ''}"`,
      `"${m.status}"`,
      `"${m.paymentStatus || (m.duesPaid ? 'Paid' : 'Unpaid')}"`,
      m.amountPaid ?? (m.duesPaid ? m.duesAmount : 0),
      m.paystackVerified ? 'YES' : 'NO',
      m.joinedDate,
      m.expiryDate,
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `AMMON_${level.toUpperCase()}_Report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Real Backend Jurisdiction Enforcement Probe
  const handleRunJurisdictionProbe = async () => {
    setIsProbing(true);
    setProbeResult(null);

    let probeFilters: { zone?: string; state?: string; lga?: string } = { state: 'Rivers' };
    let targetDesc = 'Rivers State records';

    if (level === 'zonal') {
      const foreignZone = executive.assignedZone === 'North-West' ? 'South-South' : 'North-West';
      probeFilters = { zone: foreignZone };
      targetDesc = `${foreignZone} Zonal records`;
    } else if (level === 'state') {
      const foreignState = executive.assignedState === 'Rivers' ? 'Lagos' : 'Rivers';
      probeFilters = { state: foreignState };
      targetDesc = `${foreignState} State records`;
    } else if (level === 'lga' || level === 'ward' || level === 'community') {
      const foreignLga = executive.assignedLga === 'Ogbia' ? 'Sagbama' : 'Ogbia';
      probeFilters = { state: executive.assignedState || 'Bayelsa', lga: foreignLga };
      targetDesc = `${foreignLga} LGA records`;
    } else {
      // National / Super Admin / Specialized probing nationwide access
      probeFilters = { state: 'Bayelsa' };
      targetDesc = 'Bayelsa State (Authorized Nationwide Scope)';
    }

    try {
      const res = await fetchExecutiveWorkspace(probeFilters);
      setProbeResult({
        status: 'allowed',
        target: targetDesc,
        message: `Backend verified authorized clearance for ${targetDesc} (${res.members.length} scoped records returned).`,
      });
    } catch (err) {
      if (err instanceof ExecutiveApiError) {
        setProbeResult({
          status: 'denied',
          target: targetDesc,
          code: err.code || `HTTP_${err.status}`,
          message: err.message,
        });
        if (onSecurityAuditRefresh) onSecurityAuditRefresh();
      } else {
        setProbeResult({
          status: 'error',
          target: targetDesc,
          message: 'Unable to reach backend enforcement endpoint.',
        });
      }
    } finally {
      setIsProbing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Level + Jurisdiction Executive Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#176B37] text-white font-bold text-[10px] tracking-wider uppercase">
              {dashboardTitleForLevel(executive)}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF3ED] text-[#14532D] font-bold text-[10px] border border-[#176B37]/25 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#176B37]" />
              <span>{executive.jurisdiction}</span>
            </span>
            <span className="text-[11px] text-gray-500 font-mono">
              BADGE: {executive.badgeNumber}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-[#252525]">
            {executive.fullName} — {executive.position || executive.title}
          </h3>
          <p className="text-xs text-gray-600">
            Strictly scoped to <strong className="text-[#14532D]">{executive.jurisdiction}</strong> · Backend &amp; Firestore RBAC/LBAC enforced
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportScopedReport}
            className="px-3.5 py-2 rounded-xl border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Jurisdictional Report (CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('registry')}
            className="px-4 py-2 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Centralized Registry</span>
          </button>
        </div>
      </div>

      {/* Geographical Filter Bar (Strictly constrained by executive level) */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Geopolitical Zone
              </label>
              <select
                value={selectedZone}
                disabled={!isNationalScope}
                onChange={(e) => {
                  setSelectedZone(e.target.value);
                  setSelectedState('All');
                  setSelectedLga('All');
                }}
                className="w-full py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 disabled:text-gray-500 text-xs font-medium text-[#252525] focus:outline-hidden focus:border-[#176B37]"
              >
                {isNationalScope && <option value="All">All 6 Geopolitical Zones</option>}
                {hierarchyConfig.zones.map((z) => (
                  <option key={z.name} value={z.name}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                State Chapter
              </label>
              <select
                value={selectedState}
                disabled={level === 'state' || level === 'lga' || level === 'ward' || level === 'community'}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedLga('All');
                }}
                className="w-full py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 disabled:text-gray-500 text-xs font-medium text-[#252525] focus:outline-hidden focus:border-[#176B37]"
              >
                {(isNationalScope || level === 'zonal') && <option value="All">All Authorized States</option>}
                {availableStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Local Government Area (LGA)
              </label>
              <select
                value={selectedLga}
                disabled={level === 'lga' || level === 'ward' || level === 'community' || selectedState === 'All'}
                onChange={(e) => setSelectedLga(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 disabled:text-gray-500 text-xs font-medium text-[#252525] focus:outline-hidden focus:border-[#176B37]"
              >
                {!(level === 'lga' || level === 'ward' || level === 'community') && (
                  <option value="All">All Authorized LGAs</option>
                )}
                {availableLgas.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyGeoFilter}
            disabled={isApplyingFilter}
            className="px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#0f3d20] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isApplyingFilter ? 'Loading Scope...' : 'Apply Server Filter'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Scoped Members
          </span>
          <div className="text-2xl font-black text-[#176B37] font-mono tabular-nums mt-1">
            {metrics.totalMembers}
          </div>
          <span className="text-[10px] text-gray-500">In assigned jurisdiction</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Active Operators
          </span>
          <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-1">
            {metrics.activeMembers}
          </div>
          <span className="text-[10px] text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Verified &amp; compliant
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Pending Approval
          </span>
          <div className="text-2xl font-black text-amber-600 font-mono tabular-nums mt-1">
            {metrics.pendingMembers}
          </div>
          <span className="text-[10px] text-amber-700 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting vetting
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Expired Cards
          </span>
          <div className="text-2xl font-black text-red-600 font-mono tabular-nums mt-1">
            {metrics.expiredMembers}
          </div>
          <span className="text-[10px] text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Renewal overdue
          </span>
        </div>

        <div className="bg-[#EAF3ED] p-4 rounded-2xl border border-[#176B37]/30 shadow-xs">
          <span className="text-[10px] font-bold text-[#14532D] uppercase tracking-wider block">
            Dues Collected
          </span>
          <div className="text-xl font-black text-[#176B37] font-mono tabular-nums mt-1">
            ₦{metrics.totalCollectedDues.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#14532D]">
            Paystack Verified: ₦{metrics.paystackVerifiedDues.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Outstanding Dues
          </span>
          <div className="text-xl font-black text-amber-700 font-mono tabular-nums mt-1">
            ₦{metrics.outstandingDues.toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500">Unpaid / Partial balance</span>
        </div>
      </div>

      {/* Geographical Breakdown + Quick Governance Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sub-unit Performance */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#176B37]" />
              <span>
                {isNationalScope && selectedZone === 'All' && selectedState === 'All'
                  ? 'Geopolitical Zone Performance Breakdown'
                  : level === 'zonal' && selectedState === 'All'
                  ? `${executive.assignedZone} Zone — State Performance`
                  : level === 'lga' || level === 'ward' || level === 'community'
                  ? 'Ward & Community Breakdown'
                  : 'LGA Registration & Dues Performance'}
              </span>
            </h4>
            <span className="text-[10px] font-semibold text-[#176B37] bg-[#EAF3ED] px-2 py-0.5 rounded-full">
              {geoBreakdown.length} Active Units
            </span>
          </div>

          {geoBreakdown.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
              No member records matched your selected geographical filter within {executive.jurisdiction}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {geoBreakdown.map((unit) => (
                <div
                  key={unit.label}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FBFA] hover:border-[#176B37]/50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-[#252525] truncate">{unit.label}</span>
                    <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-[#176B37]">
                      {unit.total} {unit.total === 1 ? 'Member' : 'Members'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-gray-200/70">
                    <div>
                      <span className="text-gray-400 block">Active</span>
                      <strong className="text-emerald-700 font-mono">{unit.active}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Collected</span>
                      <strong className="text-[#176B37] font-mono">₦{unit.collected.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Outstanding</span>
                      <strong className="text-amber-700 font-mono">₦{unit.outstanding.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Reports, Notices & Backend Jurisdiction Test */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Governance Activity Pulse
            </h4>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateSection('reports')}
                className="w-full p-3 rounded-xl bg-[#F9FBFA] hover:bg-[#EAF3ED] border border-[#E5E7EB] flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#176B37]" />
                  <div>
                    <p className="font-bold text-[#252525]">Routed Activity Reports</p>
                    <p className="text-[10px] text-gray-500">Scoped to {executive.jurisdiction}</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-[#176B37] bg-white px-2 py-0.5 rounded border border-gray-200">
                  {reports.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateSection('announcements')}
                className="w-full p-3 rounded-xl bg-[#F9FBFA] hover:bg-[#EAF3ED] border border-[#E5E7EB] flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-4 h-4 text-[#176B37]" />
                  <div>
                    <p className="font-bold text-[#252525]">Executive Announcements</p>
                    <p className="text-[10px] text-gray-500">Targeted notices &amp; meetings</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-[#176B37] bg-white px-2 py-0.5 rounded border border-gray-200">
                  {announcements.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateSection('disputes')}
                className="w-full p-3 rounded-xl bg-[#F9FBFA] hover:bg-[#EAF3ED] border border-[#E5E7EB] flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="font-bold text-[#252525]">Scoped Legal Disputes</p>
                    <p className="text-[10px] text-gray-500">Taskforce intervention tickets</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {disputes.filter((d) => d.status !== 'Resolved').length} Open
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateSection('saved-recordings')}
                className="w-full p-3 rounded-xl bg-[#EAF3ED]/70 hover:bg-[#EAF3ED] border border-[#176B37]/30 flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Film className="w-4 h-4 text-[#176B37]" />
                  <div>
                    <p className="font-bold text-[#14532D]">Saved Recordings</p>
                    <p className="text-[10px] text-gray-600">AMMON bucket (/recordings/)</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-[#176B37] bg-white px-2 py-0.5 rounded border border-[#176B37]/25">
                  {savedRecordings.length} Saved
                </span>
              </button>
            </div>
          </div>

          {/* Backend RBAC/LBAC Verification Card */}
          <div className="bg-[#EAF3ED] p-4 rounded-2xl border border-[#176B37]/30 space-y-2.5">
            <div className="flex items-center gap-2 text-[#14532D]">
              <Lock className="w-4 h-4 text-[#176B37] shrink-0" />
              <h5 className="font-bold text-xs">Backend Jurisdiction Enforcement</h5>
            </div>
            <p className="text-[11px] text-gray-700 leading-relaxed">
              Test live server-side access control against unauthorized cross-jurisdiction requests. Denied attempts return HTTP 403 and log into the immutable audit trail.
            </p>
            <button
              type="button"
              onClick={handleRunJurisdictionProbe}
              disabled={isProbing}
              className="w-full py-2 px-3 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isProbing
                  ? 'Testing Backend Policy...'
                  : isNationalScope
                  ? 'Verify Nationwide API Clearance'
                  : 'Test Cross-Jurisdiction Block (HTTP 403)'}
              </span>
            </button>

            {probeResult && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] leading-snug ${
                  probeResult.status === 'denied'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : probeResult.status === 'allowed'
                    ? 'bg-white border-emerald-200 text-[#14532D]'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {probeResult.status === 'denied'
                      ? `BLOCKED (${probeResult.code})`
                      : probeResult.status === 'allowed'
                      ? 'AUTHORIZED ACCESS'
                      : 'CONNECTION ERROR'}
                  </span>
                </div>
                <p className="mt-1">{probeResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Recordings Quick-Access Panel on Admin Overview */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
          <div>
            <h4 className="text-xs font-bold text-[#14532D] uppercase tracking-wider flex items-center gap-1.5">
              <Film className="w-4 h-4 text-[#176B37]" />
              <span>Saved Recordings (AMMON Storage /recordings/)</span>
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Quick replay &amp; download access for recorded online meetings
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('saved-recordings')}
            className="px-3.5 py-1.5 rounded-xl bg-[#EAF3ED] hover:bg-[#176B37] text-[#176B37] hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Open Saved Recordings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {savedRecordings.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#F9FBFA] border border-dashed border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
            <span>
              No meeting videos archived yet. Recordings captured in Online Meetings save automatically to{' '}
              <code className="font-mono text-[11px] text-[#176B37]">recordings/{'{meetingId}'}/</code>.
            </span>
            <button
              type="button"
              onClick={() => onNavigateSection('online-meetings')}
              className="px-3 py-1.5 rounded-lg bg-[#176B37] text-white font-bold text-[11px] hover:bg-[#14532D] cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Open Online Meetings
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedRecordings.slice(0, 6).map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FBFA] hover:border-[#176B37]/40 transition-colors flex flex-col justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <p className="font-bold text-xs text-[#252525] truncate">{rec.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {rec.durationLabel} • {rec.sizeLabel} • {rec.recordedBy}
                  </p>
                  <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">
                    {rec.storagePath}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateSection('saved-recordings')}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#176B37] hover:bg-[#14532D] text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Watch</span>
                  </button>
                  <a
                    href={rec.url}
                    download={`${rec.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`}
                    className="py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Save</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
