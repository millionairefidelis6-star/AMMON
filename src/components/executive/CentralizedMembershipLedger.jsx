import { useEffect, useMemo, useState } from "react";
import {
  Search,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Lock,
  AlertCircle,
  DollarSign,
  Eye,
  EyeOff,
  X,
  CreditCard,
  FileCheck2,
  Download,
  FileSpreadsheet,
  FileJson,
  Printer,
  Filter,
  RotateCcw,
  LayoutGrid,
  Table2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Smartphone,
  MapPin,
  ShieldAlert,
  UserCheck,
  Building2,
  Calendar
} from "lucide-react";
import { resolveZoneForState } from "../../data/hierarchyData";
import {
  createFinancialAdjustmentApi,
  ExecutiveApiError,
  getStoredExecutiveToken,
  logExecutiveRegistryExport,
  registerMemberApi,
  updateMemberStatusApi,
  verifyPaystackApi
} from "../../services/executiveApi";
import {
  addMemberToFirestore,
  updateMemberInFirestore
} from "../../services/firestoreService";
const PAYMENT_STATUS_OPTIONS = [
  "Paid",
  "Unpaid",
  "Partially Paid",
  "Payment Pending",
  "Expired",
  "Payment Verification Required"
];
const MEMBERSHIP_STATUS_OPTIONS = [
  "Active",
  "Pending Verification",
  "Expired",
  "Suspended"
];
const CATEGORY_OPTIONS = [
  "POS Agents",
  "Super Agents",
  "Fintech Companies",
  "Distributors",
  "Corporate Members"
];
function paymentBadgeClass(status) {
  switch (status) {
    case "Paid":
      return "bg-emerald-50 text-[#176B37] border-emerald-200";
    case "Partially Paid":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "Payment Pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "Payment Verification Required":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "Expired":
    case "Unpaid":
    default:
      return "bg-red-50 text-red-700 border-red-200";
  }
}
function memberStatusBadgeClass(status) {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-[#176B37] border-emerald-200";
    case "Expired":
    case "Suspended":
      return "bg-red-50 text-red-700 border-red-200";
    case "Pending Verification":
    default:
      return "bg-amber-50 text-amber-800 border-amber-200";
  }
}
function maskEmail(email) {
  if (!email || !email.includes("@")) return "—";
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
function maskPhone(phone) {
  if (!phone) return "—";
  const clean = String(phone).trim();
  if (clean.length <= 6) return "***";
  return `${clean.slice(0, 6)}***${clean.slice(-3)}`;
}
function stripMemberSecrets(member) {
  const {
    passwordHash: _ph,
    passwordSalt: _ps,
    otpHash: _oh,
    otpExpiresAt: _oe,
    firebaseUid: _fu,
    ...safe
  } = member || {};
  return safe;
}
function sanitizeCsvCell(value) {
  let str = value === null || value === void 0 ? "" : String(value);
  str = str.replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const CentralizedMembershipLedger = ({
  executive,
  hierarchyConfig,
  members,
  financialAdjustments,
  onSelectMember,
  onRefreshWorkspace
}) => {
  const execLevel = executive?.level || (executive?.role === "Super Admin" ? "super_admin" : "national");
  const hasCrossZone = execLevel === "super_admin" || execLevel === "national" || execLevel === "specialized" && Boolean(executive?.permissions?.crossZoneAuthorized);
  const isZoneLocked = !hasCrossZone && Boolean(executive?.assignedZone);
  const isStateLocked = ["state", "lga", "ward", "community"].includes(execLevel) && Boolean(executive?.assignedState);
  const isLgaLocked = ["lga", "ward", "community"].includes(execLevel) && Boolean(executive?.assignedLga);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState(isZoneLocked ? executive.assignedZone : "All");
  const [stateFilter, setStateFilter] = useState(isStateLocked ? executive.assignedState : "All");
  const [lgaFilter, setLgaFilter] = useState(isLgaLocked ? executive.assignedLga : "All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [sortBy, setSortBy] = useState("joined_desc");
  const [viewMode, setViewMode] = useState("table");
  const [maskPii, setMaskPii] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actionMsg, setActionMsg] = useState(null);
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [exportingFormat, setExportingFormat] = useState(null);
  const [inspectMember, setInspectMember] = useState(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regBusiness, setRegBusiness] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCategory, setRegCategory] = useState("POS Agents");
  const [regState, setRegState] = useState(executive?.assignedState || "Bayelsa");
  const [regLga, setRegLga] = useState(executive?.assignedLga || "Yenagoa");
  const [regWard, setRegWard] = useState(executive?.assignedWard || "");
  const [regCommunity, setRegCommunity] = useState(executive?.assignedCommunity || "");
  const [regTerminal, setRegTerminal] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [adjustMember, setAdjustMember] = useState(null);
  const [adjStatus, setAdjStatus] = useState("Paid");
  const [adjAmount, setAdjAmount] = useState("15000");
  const [adjReason, setAdjReason] = useState("");
  const [adjApproverBadge, setAdjApproverBadge] = useState(executive?.badgeNumber || "");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const execToken = getStoredExecutiveToken();
  const isAuthorizedSession = Boolean(executive?.id && execToken);
  const canApprove = executive?.level === "super_admin" || Boolean(executive?.permissions?.canApproveMembers);
  const canRegister = executive?.level === "super_admin" || Boolean(executive?.permissions?.canRegisterMembers);
  const canAdjustPayments = executive?.level === "super_admin" || Boolean(executive?.permissions?.canAdjustPayments);
  const zoneOptions = useMemo(() => {
    if (isZoneLocked && executive?.assignedZone) {
      return [executive.assignedZone];
    }
    const fromConfig = (hierarchyConfig?.zones || []).map((z) => z.name);
    const fromMembers = members.map((m) => m.zone || resolveZoneForState(m.state)).filter(Boolean);
    return Array.from(/* @__PURE__ */ new Set([...fromConfig, ...fromMembers])).sort();
  }, [hierarchyConfig, members, isZoneLocked, executive]);
  const stateOptions = useMemo(() => {
    if (isStateLocked && executive?.assignedState) {
      return [executive.assignedState];
    }
    let pool = [];
    if (zoneFilter !== "All") {
      pool = hierarchyConfig?.zones?.find((z) => z.name === zoneFilter)?.states || [];
    } else if (isZoneLocked && executive?.assignedZone) {
      pool = hierarchyConfig?.zones?.find((z) => z.name === executive.assignedZone)?.states || [];
    } else {
      pool = (hierarchyConfig?.zones || []).flatMap((z) => z.states);
    }
    const fromMembers = members.filter((m) => {
      const mz = m.zone || resolveZoneForState(m.state);
      return zoneFilter === "All" || mz === zoneFilter;
    }).map((m) => m.state).filter(Boolean);
    return Array.from(/* @__PURE__ */ new Set([...pool, ...fromMembers])).sort();
  }, [hierarchyConfig, members, zoneFilter, isZoneLocked, isStateLocked, executive]);
  const lgaOptions = useMemo(() => {
    if (isLgaLocked && executive?.assignedLga) {
      return [executive.assignedLga];
    }
    const configured = stateFilter !== "All" ? hierarchyConfig?.lgasByState?.[stateFilter] || [] : [];
    const fromMembers = members.filter((m) => {
      const mz = m.zone || resolveZoneForState(m.state);
      const matchesZ = zoneFilter === "All" || mz === zoneFilter;
      const matchesS = stateFilter === "All" || m.state === stateFilter;
      return matchesZ && matchesS;
    }).map((m) => m.lga).filter(Boolean);
    return Array.from(/* @__PURE__ */ new Set([...configured, ...fromMembers])).sort();
  }, [hierarchyConfig, members, zoneFilter, stateFilter, isLgaLocked, executive]);
  const normalizedMembers = useMemo(() => {
    return members.map((m) => stripMemberSecrets({
      ...m,
      zone: m.zone || resolveZoneForState(m.state),
      paymentStatus: m.paymentStatus || (m.duesPaid ? "Paid" : m.status === "Expired" ? "Expired" : "Unpaid"),
      amountPaid: m.amountPaid ?? (m.duesPaid ? m.duesAmount || 0 : 0)
    }));
  }, [members]);
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = normalizedMembers.filter((m) => {
      const matchesQ = !q || [
        m.fullName,
        m.businessName,
        m.membershipId,
        m.email,
        m.phone,
        m.terminalSerialNumber,
        m.terminalProvider,
        m.state,
        m.lga,
        m.ward,
        m.community
      ].filter(Boolean).some((val) => String(val).toLowerCase().includes(q));
      const matchesZone = zoneFilter === "All" || m.zone === zoneFilter;
      const matchesState = stateFilter === "All" || m.state === stateFilter;
      const matchesLga = lgaFilter === "All" || (m.lga || "").toLowerCase() === lgaFilter.toLowerCase();
      const matchesCat = categoryFilter === "All" || m.category === categoryFilter;
      const matchesStatus = statusFilter === "All" || m.status === statusFilter;
      const matchesPay = paymentFilter === "All" || m.paymentStatus === paymentFilter;
      const matchesVerification = verificationFilter === "All" || verificationFilter === "BVN Verified" && Boolean(m.bvnVerified) || verificationFilter === "Email Verified" && Boolean(m.emailVerified) || verificationFilter === "Paystack Verified" && Boolean(m.paystackVerified) || verificationFilter === "Unverified" && (!m.bvnVerified || !m.emailVerified);
      const matchesFrom = !joinedFrom || Boolean(m.joinedDate && m.joinedDate >= joinedFrom);
      const matchesTo = !joinedTo || Boolean(m.joinedDate && m.joinedDate <= joinedTo);
      return matchesQ && matchesZone && matchesState && matchesLga && matchesCat && matchesStatus && matchesPay && matchesVerification && matchesFrom && matchesTo;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "joined_asc":
          return (a.joinedDate || "").localeCompare(b.joinedDate || "");
        case "name_asc":
          return (a.fullName || "").localeCompare(b.fullName || "");
        case "state_asc":
          return `${a.state}-${a.lga}`.localeCompare(`${b.state}-${b.lga}`);
        case "status_asc":
          return (a.status || "").localeCompare(b.status || "");
        case "paid_desc":
          return (b.amountPaid || 0) - (a.amountPaid || 0);
        case "joined_desc":
        default:
          return (b.joinedDate || "").localeCompare(a.joinedDate || "");
      }
    });
    return sorted;
  }, [
    normalizedMembers,
    searchQuery,
    zoneFilter,
    stateFilter,
    lgaFilter,
    categoryFilter,
    statusFilter,
    paymentFilter,
    verificationFilter,
    joinedFrom,
    joinedTo,
    sortBy
  ]);
  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    zoneFilter,
    stateFilter,
    lgaFilter,
    categoryFilter,
    statusFilter,
    paymentFilter,
    verificationFilter,
    joinedFrom,
    joinedTo,
    sortBy,
    pageSize
  ]);
  const totalPages = pageSize === "All" ? 1 : Math.max(1, Math.ceil(filteredMembers.length / Number(pageSize)));
  const safePage = Math.min(page, totalPages);
  const paginatedMembers = useMemo(() => {
    if (pageSize === "All") return filteredMembers;
    const size = Number(pageSize);
    const start = (safePage - 1) * size;
    return filteredMembers.slice(start, start + size);
  }, [filteredMembers, pageSize, safePage]);
  const filteredMetrics = useMemo(() => {
    let active = 0;
    let pendingOrExpired = 0;
    let bvnVerified = 0;
    let emailVerified = 0;
    let collectedDues = 0;
    let outstandingDues = 0;
    for (const m of filteredMembers) {
      if (m.status === "Active") active += 1;
      else pendingOrExpired += 1;
      if (m.bvnVerified) bvnVerified += 1;
      if (m.emailVerified) emailVerified += 1;
      const paid = m.amountPaid || 0;
      const expected = m.duesAmount || 0;
      collectedDues += paid;
      outstandingDues += Math.max(0, expected - paid);
    }
    return {
      total: filteredMembers.length,
      active,
      pendingOrExpired,
      bvnVerified,
      emailVerified,
      collectedDues,
      outstandingDues
    };
  }, [filteredMembers]);
  const hasActiveFilters = Boolean(
    searchQuery.trim() || !isZoneLocked && zoneFilter !== "All" || !isStateLocked && stateFilter !== "All" || !isLgaLocked && lgaFilter !== "All" || categoryFilter !== "All" || statusFilter !== "All" || paymentFilter !== "All" || verificationFilter !== "All" || joinedFrom || joinedTo
  );
  const handleResetFilters = () => {
    setSearchQuery("");
    if (!isZoneLocked) setZoneFilter("All");
    if (!isStateLocked) setStateFilter("All");
    if (!isLgaLocked) setLgaFilter("All");
    setCategoryFilter("All");
    setStatusFilter("All");
    setPaymentFilter("All");
    setVerificationFilter("All");
    setJoinedFrom("");
    setJoinedTo("");
    setSortBy("joined_desc");
  };
  const activeFiltersSummary = useMemo(() => {
    const parts = [];
    if (searchQuery.trim()) parts.push(`q="${searchQuery.trim()}"`);
    if (zoneFilter !== "All") parts.push(`Zone=${zoneFilter}`);
    if (stateFilter !== "All") parts.push(`State=${stateFilter}`);
    if (lgaFilter !== "All") parts.push(`LGA=${lgaFilter}`);
    if (categoryFilter !== "All") parts.push(`Category=${categoryFilter}`);
    if (statusFilter !== "All") parts.push(`Status=${statusFilter}`);
    if (paymentFilter !== "All") parts.push(`Payment=${paymentFilter}`);
    if (verificationFilter !== "All") parts.push(`Verification=${verificationFilter}`);
    if (joinedFrom) parts.push(`From=${joinedFrom}`);
    if (joinedTo) parts.push(`To=${joinedTo}`);
    return parts.length > 0 ? parts.join(", ") : `All authorized operators (${executive?.jurisdiction || "National"})`;
  }, [
    searchQuery,
    zoneFilter,
    stateFilter,
    lgaFilter,
    categoryFilter,
    statusFilter,
    paymentFilter,
    verificationFilter,
    joinedFrom,
    joinedTo,
    executive
  ]);
  const recordExportAudit = async (format, count) => {
    const token = getStoredExecutiveToken();
    if (!token || token.startsWith("firebase-session:") || token.startsWith("static-preview:")) {
      return false;
    }
    try {
      await logExecutiveRegistryExport({
        format,
        recordCount: count,
        filtersSummary: activeFiltersSummary
      });
      await onRefreshWorkspace?.();
      return true;
    } catch {
      return false;
    }
  };
  const handleExportCsv = async () => {
    if (filteredMembers.length === 0) return;
    setExportingFormat("CSV");
    setActionMsg(null);
    try {
      const headers = [
        "Membership ID",
        "Full Legal Name",
        "Business / Kiosk Name",
        "Category",
        "Tier",
        "Email",
        "Phone",
        "Geopolitical Zone",
        "State",
        "LGA",
        "Ward",
        "Community",
        "Terminal Provider",
        "Terminal Serial Number",
        "Membership Status",
        "Payment Status",
        "Annual Dues (NGN)",
        "Amount Paid (NGN)",
        "Paystack Verified",
        "Paystack Reference",
        "BVN Verified",
        "Email Verified",
        "CBN Compliant",
        "Joined Date",
        "Expiry Date"
      ];
      const rows = filteredMembers.map((m) => [
        m.membershipId,
        m.fullName,
        m.businessName,
        m.category,
        m.tier || "Standard",
        m.email || "",
        m.phone || "",
        m.zone,
        m.state,
        m.lga,
        m.ward || "",
        m.community || "",
        m.terminalProvider || "",
        m.terminalSerialNumber || "",
        m.status,
        m.paymentStatus,
        m.duesAmount || 0,
        m.amountPaid || 0,
        m.paystackVerified ? "YES" : "NO",
        m.paystackReference || "",
        m.bvnVerified ? "YES" : "NO",
        m.emailVerified ? "YES" : "NO",
        m.cbnCompliant ? "YES" : "NO",
        m.joinedDate || "",
        m.expiryDate || ""
      ].map(sanitizeCsvCell).join(","));
      const csvContent = "\uFEFF" + [headers.map(sanitizeCsvCell).join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const dateStamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      downloadBlob(blob, `AMMON_Operator_Registry_${dateStamp}.csv`);
      const audited = await recordExportAudit("CSV", filteredMembers.length);
      setActionMsg({
        type: "success",
        text: `Exported ${filteredMembers.length} mobile money operator record(s) to CSV.${audited ? " Export logged in Immutable Audit Trail." : ""}`
      });
    } finally {
      setExportingFormat(null);
    }
  };
  const handleExportJson = async () => {
    if (filteredMembers.length === 0) return;
    setExportingFormat("JSON");
    setActionMsg(null);
    try {
      const payload = {
        organization: "Association of Mobile Money Operators of Nigeria (AMMON)",
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        exportedBy: {
          name: executive.fullName,
          role: executive.role,
          level: execLevel,
          badgeNumber: executive.badgeNumber,
          jurisdiction: executive.jurisdiction
        },
        appliedFilters: activeFiltersSummary,
        totalRecords: filteredMembers.length,
        operators: filteredMembers.map((m) => stripMemberSecrets({
          membershipId: m.membershipId,
          fullName: m.fullName,
          businessName: m.businessName,
          category: m.category,
          tier: m.tier,
          email: m.email,
          phone: m.phone,
          zone: m.zone,
          state: m.state,
          lga: m.lga,
          ward: m.ward || null,
          community: m.community || null,
          terminalProvider: m.terminalProvider,
          terminalSerialNumber: m.terminalSerialNumber,
          status: m.status,
          paymentStatus: m.paymentStatus,
          duesAmount: m.duesAmount || 0,
          amountPaid: m.amountPaid || 0,
          paystackVerified: Boolean(m.paystackVerified),
          paystackReference: m.paystackReference || null,
          bvnVerified: Boolean(m.bvnVerified),
          emailVerified: Boolean(m.emailVerified),
          cbnCompliant: Boolean(m.cbnCompliant),
          joinedDate: m.joinedDate,
          expiryDate: m.expiryDate
        }))
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
      const dateStamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      downloadBlob(blob, `AMMON_Operator_Registry_${dateStamp}.json`);
      const audited = await recordExportAudit("JSON", filteredMembers.length);
      setActionMsg({
        type: "success",
        text: `Exported ${filteredMembers.length} mobile money operator record(s) to JSON.${audited ? " Export logged in Immutable Audit Trail." : ""}`
      });
    } finally {
      setExportingFormat(null);
    }
  };
  const handlePrintDirectory = async () => {
    if (filteredMembers.length === 0) return;
    setExportingFormat("PRINT");
    setActionMsg(null);
    try {
      const tableRowsHtml = filteredMembers.map((m, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${escapeHtml(m.membershipId)}</strong></td>
          <td>
            <div><strong>${escapeHtml(m.fullName)}</strong></div>
            <div class="sub">${escapeHtml(m.businessName)}</div>
          </td>
          <td>${escapeHtml(m.category)}</td>
          <td>
            <div>${escapeHtml(m.phone)}</div>
            <div class="sub">${escapeHtml(m.email)}</div>
          </td>
          <td>
            <div>${escapeHtml(m.terminalProvider || "—")}</div>
            <div class="sub mono">${escapeHtml(m.terminalSerialNumber || "—")}</div>
          </td>
          <td>
            <div>${escapeHtml(m.state)}, ${escapeHtml(m.lga)}</div>
            <div class="sub">${escapeHtml(m.zone)}${m.ward ? ` · ${escapeHtml(m.ward)}` : ""}</div>
          </td>
          <td>${escapeHtml(m.status)}</td>
          <td>${escapeHtml(m.paymentStatus)}<div class="sub">₦${(m.amountPaid || 0).toLocaleString()}</div></td>
          <td>${escapeHtml(m.joinedDate)}</td>
        </tr>
      `).join("");
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AMMON Secure Membership Registry Report</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 24px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #176B37; padding-bottom: 12px; margin-bottom: 14px; }
    .brand { color: #14532D; font-size: 16px; font-weight: 800; margin: 0 0 4px 0; }
    .meta { color: #4b5563; font-size: 10px; line-height: 1.5; }
    .kpis { display: flex; gap: 12px; margin-bottom: 14px; }
    .kpi { border: 1px solid #d1d5db; background: #f9fafb; border-radius: 6px; padding: 8px 12px; flex: 1; }
    .kpi-label { font-size: 9px; text-transform: uppercase; color: #6b7280; font-weight: 700; }
    .kpi-val { font-size: 14px; font-weight: 800; color: #14532D; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #176B37; color: #ffffff; text-align: left; padding: 7px 6px; font-size: 10px; }
    td { border-bottom: 1px solid #e5e7eb; padding: 6px; vertical-align: top; font-size: 10px; }
    tr:nth-child(even) td { background: #f9fbfa; }
    .sub { font-size: 9px; color: #6b7280; margin-top: 1px; }
    .mono { font-family: monospace; }
    .footer { margin-top: 16px; font-size: 9px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand">AMMON NIGERIA — SECURE MEMBERSHIP REGISTRY DIRECTORY</h1>
      <div class="meta">
        Association of Mobile Money Operators of Nigeria (CBN / NIBSS Aligned)<br/>
        <strong>Applied Filters:</strong> ${escapeHtml(activeFiltersSummary)}
      </div>
    </div>
    <div class="meta" style="text-align:right;">
      <strong>Exported By:</strong> ${escapeHtml(executive.fullName)} (${escapeHtml(executive.badgeNumber)})<br/>
      <strong>Jurisdiction Scope:</strong> ${escapeHtml(executive.jurisdiction)}<br/>
      <strong>Generated:</strong> ${escapeHtml((/* @__PURE__ */ new Date()).toLocaleString())}
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Listed Operators</div><div class="kpi-val">${filteredMetrics.total}</div></div>
    <div class="kpi"><div class="kpi-label">Active Certified</div><div class="kpi-val">${filteredMetrics.active}</div></div>
    <div class="kpi"><div class="kpi-label">BVN Verified</div><div class="kpi-val">${filteredMetrics.bvnVerified}</div></div>
    <div class="kpi"><div class="kpi-label">Collected Dues</div><div class="kpi-val">₦${filteredMetrics.collectedDues.toLocaleString()}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Membership ID</th>
        <th>Operator &amp; Business</th>
        <th>Category</th>
        <th>Contact</th>
        <th>Terminal</th>
        <th>Jurisdiction</th>
        <th>Status</th>
        <th>Dues</th>
        <th>Joined</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
  <div class="footer">
    <span>CONFIDENTIAL — AUTHORIZED AMMON EXECUTIVE DIRECTORY</span>
    <span>Total Records: ${filteredMembers.length}</span>
  </div>
</body>
</html>`;
      const printWin = window.open("", "_blank", "width=1080,height=840");
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 350);
      } else {
        const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
        downloadBlob(blob, `AMMON_Operator_Registry_Report_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.html`);
      }
      const audited = await recordExportAudit("PRINT", filteredMembers.length);
      setActionMsg({
        type: "success",
        text: `Prepared printable directory for ${filteredMembers.length} mobile money operator(s).${audited ? " Export logged in Immutable Audit Trail." : ""}`
      });
    } finally {
      setExportingFormat(null);
    }
  };
  const handleUpdateMemberStatus = async (m, nextStatus) => {
    setActionMsg(null);
    setBusyMemberId(m.id);
    try {
      let updatedViaExpress = false;
      try {
        await updateMemberStatusApi(m.id, nextStatus);
        updatedViaExpress = true;
      } catch (apiErr) {
        const statusCode = apiErr instanceof ExecutiveApiError ? apiErr.status : 0;
        if (statusCode !== 404) {
          throw apiErr;
        }
      }
      await updateMemberInFirestore(m.id, {
        status: nextStatus,
        lastUpdatedBy: executive.id
      }).catch(() => {
      });
      await onRefreshWorkspace();
      if (inspectMember && inspectMember.id === m.id) {
        setInspectMember({ ...inspectMember, status: nextStatus });
      }
      setActionMsg({
        type: "success",
        text: `Updated ${m.fullName} (${m.membershipId}) status to "${nextStatus}"${updatedViaExpress ? "" : " (Firestore synced)"}. Payment status remains "${m.paymentStatus || (m.duesPaid ? "Paid" : "Unpaid")}".`
      });
    } catch (err) {
      setActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update operator status."
      });
    } finally {
      setBusyMemberId(null);
    }
  };
  const handleVerifyPaystackRef = async (m) => {
    setActionMsg(null);
    setBusyMemberId(m.id);
    const ref = `PSK-LIVE-${m.state.slice(0, 3).toUpperCase()}-${Math.floor(1e5 + Math.random() * 899999)}`;
    try {
      await verifyPaystackApi(m.id, ref, m.duesAmount);
      await onRefreshWorkspace();
      setActionMsg({
        type: "success",
        text: `Backend verified Paystack checkout ${ref} for ${m.fullName} (₦${(m.duesAmount || 0).toLocaleString()}).`
      });
    } catch (err) {
      setActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Paystack verification failed."
      });
    } finally {
      setBusyMemberId(null);
    }
  };
  const handleCreateMemberSubmit = async (e) => {
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
        ward: executive.assignedWard || regWard || void 0,
        community: executive.assignedCommunity || regCommunity || void 0,
        terminalSerialNumber: regTerminal || void 0
      });
      await addMemberToFirestore(res.member).catch(() => {
      });
      await onRefreshWorkspace();
      setShowRegisterForm(false);
      setRegName("");
      setRegBusiness("");
      setRegEmail("");
      setRegPhone("");
      setRegTerminal("");
      setActionMsg({
        type: "success",
        text: `Registered ${res.member.fullName} (${res.member.membershipId}) in ${res.member.lga}, ${res.member.state} State. Payment Status: ${res.member.paymentStatus}.`
      });
    } catch (err) {
      setActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to register member."
      });
    } finally {
      setIsRegistering(false);
    }
  };
  const handleSubmitAdjustment = async (e) => {
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
        approverBadge: adjApproverBadge
      });
      await onRefreshWorkspace();
      setAdjustMember(null);
      setAdjReason("");
      setActionMsg({
        type: "success",
        text: `Audited adjustment [${res.adjustment.auditRef}] recorded for ${adjustMember.fullName}.`
      });
    } catch (err) {
      const msg = err instanceof ExecutiveApiError ? err.message : "Financial adjustment failed.";
      setActionMsg({ type: "error", text: msg });
    } finally {
      setIsAdjusting(false);
    }
  };
  const availableStatesForForm = useMemo(() => {
    if (executive?.assignedState) return [executive.assignedState];
    if (executive?.assignedZone && !executive?.permissions?.crossZoneAuthorized) {
      return hierarchyConfig?.zones?.find((z) => z.name === executive.assignedZone)?.states || ["Bayelsa"];
    }
    return (hierarchyConfig?.zones || []).flatMap((z) => z.states).sort();
  }, [executive, hierarchyConfig]);
  if (!isAuthorizedSession) {
    return <div className="bg-white p-8 rounded-2xl border border-red-200 shadow-xs text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Restricted Operator Registry</h3>
        <p className="text-xs text-gray-600 max-w-md mx-auto">
          Access to mobile money operator contact records, terminal serials, and registry exports requires an authenticated AMMON executive session token.
        </p>
      </div>;
  }
  return <div className="space-y-5 animate-in fade-in duration-150">
      {
    /* Security & Scope Assurance Banner */
  }
      <div className="bg-[#14532D] text-white p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base tracking-tight">
                Secure Mobile Money Operator Registry
              </h3>
              <span className="text-[10px] font-mono font-bold uppercase bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full">
                {execLevel.replace("_", " ")} SCOPE
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 leading-relaxed">
              Authenticated as <strong>{executive.fullName}</strong> ({executive.badgeNumber}) · Jurisdiction Lock:{" "}
              <strong className="text-white">{executive.jurisdiction}</strong> · All directory exports are cryptographically logged.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
    type="button"
    onClick={() => setMaskPii((prev) => !prev)}
    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${maskPii ? "bg-amber-400 text-slate-900 border-amber-300" : "bg-white/10 hover:bg-white/20 text-white border-white/20"}`}
    title="Mask email addresses and phone numbers on screen"
  >
            {maskPii ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{maskPii ? "PII Masked" : "Mask PII"}</span>
          </button>

          {canRegister && <button
    type="button"
    onClick={() => setShowRegisterForm(!showRegisterForm)}
    className="px-3.5 py-2 rounded-xl bg-white text-[#14532D] hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
  >
              <Plus className="w-3.5 h-3.5" />
              <span>{showRegisterForm ? "Close Form" : "Enroll Operator"}</span>
            </button>}
        </div>
      </div>

      {actionMsg && <div
    className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-2.5 ${actionMsg.type === "success" ? "bg-[#EAF3ED] border-[#176B37]/30 text-[#14532D]" : "bg-red-50 border-red-200 text-red-800"}`}
  >
          <div className="flex items-start gap-2.5">
            {actionMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-[#176B37] shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
            <span className="font-medium leading-relaxed">{actionMsg.text}</span>
          </div>
          <button
    type="button"
    onClick={() => setActionMsg(null)}
    className="p-0.5 text-gray-500 hover:text-gray-800 cursor-pointer"
    aria-label="Dismiss message"
  >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>}

      {
    /* Filtered Registry KPI Strip */
  }
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Matching Operators
          </span>
          <div className="text-xl font-black text-[#252525] font-mono mt-0.5">
            {filteredMetrics.total.toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500">
            of {members.length.toLocaleString()} authorized
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Active Certified
          </span>
          <div className="text-xl font-black text-[#176B37] font-mono mt-0.5">
            {filteredMetrics.active.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-700">
            {filteredMetrics.total > 0 ? Math.round(filteredMetrics.active / filteredMetrics.total * 100) : 0}% active compliance
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Pending / Expired
          </span>
          <div className="text-xl font-black text-amber-700 font-mono mt-0.5">
            {filteredMetrics.pendingOrExpired.toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500">Needs review or renewal</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            BVN Verified
          </span>
          <div className="text-xl font-black text-blue-700 font-mono mt-0.5">
            {filteredMetrics.bvnVerified.toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500">
            {filteredMetrics.emailVerified} Email OTP verified
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Filtered Dues Paid
          </span>
          <div className="text-xl font-black text-[#14532D] font-mono mt-0.5">
            ₦{filteredMetrics.collectedDues.toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500">
            ₦{filteredMetrics.outstandingDues.toLocaleString()} outstanding
          </span>
        </div>
      </div>

      {
    /* Main Centralized Ledger & Export Card */
  }
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#252525]">
              Registered Mobile Money Operators Directory
            </h3>
            <p className="text-xs text-gray-500">
              Showing <strong className="text-[#252525]">{filteredMembers.length}</strong> of{" "}
              <strong>{members.length}</strong> operators authorized for{" "}
              <strong className="text-[#176B37]">{executive.jurisdiction}</strong>
            </p>
          </div>

          {
    /* Export & View Controls */
  }
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#E5E7EB] bg-gray-50 p-0.5">
              <button
    type="button"
    onClick={() => setViewMode("table")}
    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${viewMode === "table" ? "bg-white text-[#176B37] shadow-2xs" : "text-gray-600 hover:text-gray-900"}`}
    title="Table Directory View"
  >
                <Table2 className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
    type="button"
    onClick={() => setViewMode("cards")}
    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${viewMode === "cards" ? "bg-white text-[#176B37] shadow-2xs" : "text-gray-600 hover:text-gray-900"}`}
    title="Operator Profile Cards View"
  >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            <button
    type="button"
    disabled={filteredMembers.length === 0 || exportingFormat !== null}
    onClick={handleExportCsv}
    className="px-3 py-2 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45 shadow-2xs"
    title="Export filtered operators to CSV (formula-injection protected)"
  >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{exportingFormat === "CSV" ? "Exporting..." : `Export CSV (${filteredMembers.length})`}</span>
            </button>

            <button
    type="button"
    disabled={filteredMembers.length === 0 || exportingFormat !== null}
    onClick={handleExportJson}
    className="px-3 py-2 rounded-xl border border-[#176B37]/30 bg-[#EAF3ED] hover:bg-[#176B37] text-[#14532D] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45"
    title="Export filtered directory as sanitized JSON"
  >
              <FileJson className="w-3.5 h-3.5" />
              <span>{exportingFormat === "JSON" ? "Exporting..." : "Export JSON"}</span>
            </button>

            <button
    type="button"
    disabled={filteredMembers.length === 0 || exportingFormat !== null}
    onClick={handlePrintDirectory}
    className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45"
    title="Print or Save Directory PDF Report"
  >
              <Printer className="w-3.5 h-3.5" />
              <span>{exportingFormat === "PRINT" ? "Preparing..." : "Print / PDF"}</span>
            </button>
          </div>
        </div>

        {
    /* Inline Jurisdiction-Locked Member Registration Form */
  }
        {showRegisterForm && <form
    onSubmit={handleCreateMemberSubmit}
    className="p-4 sm:p-5 rounded-2xl bg-[#F9FBFA] border border-[#176B37]/30 space-y-3"
  >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#176B37]">
                New Operator Onboarding (Scoped to {executive.jurisdiction})
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
    onChange={(e) => setRegCategory(e.target.value)}
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
                  {availableStatesForForm.map((s) => <option key={s} value={s}>
                      {s}
                    </option>)}
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
                {isRegistering ? "Registering..." : "Submit Member Record"}
              </button>
            </div>
          </form>}

        {
    /* Comprehensive Multi-Dimensional Filter Panel */
  }
        <div className="p-3.5 rounded-xl bg-[#F9FBFA] border border-[#E5E7EB] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#176B37] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>Multi-Criteria Directory Filters</span>
            </span>

            {hasActiveFilters && <button
    type="button"
    onClick={handleResetFilters}
    className="text-[11px] font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
  >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>}
          </div>

          {
    /* Row 1: Search + Geo Hierarchy Filters */
  }
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search ID, Name, Business, Phone, Email or Terminal S/N..."
    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  />
            </div>

            <select
    value={zoneFilter}
    disabled={isZoneLocked}
    onChange={(e) => {
      const nextZ = e.target.value;
      setZoneFilter(nextZ);
      if (!isStateLocked) setStateFilter("All");
      if (!isLgaLocked) setLgaFilter("All");
    }}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 text-xs text-gray-700 focus:outline-hidden focus:border-[#176B37]"
    aria-label="Filter by Geopolitical Zone"
  >
              {!isZoneLocked && <option value="All">All Geopolitical Zones</option>}
              {zoneOptions.map((z) => <option key={z} value={z}>
                  {z} Zone
                </option>)}
            </select>

            <select
    value={stateFilter}
    disabled={isStateLocked}
    onChange={(e) => {
      setStateFilter(e.target.value);
      if (!isLgaLocked) setLgaFilter("All");
    }}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 text-xs text-gray-700 focus:outline-hidden focus:border-[#176B37]"
    aria-label="Filter by State"
  >
              {!isStateLocked && <option value="All">All States in Scope</option>}
              {stateOptions.map((s) => <option key={s} value={s}>
                  {s} State
                </option>)}
            </select>

            <select
    value={lgaFilter}
    disabled={isLgaLocked}
    onChange={(e) => setLgaFilter(e.target.value)}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 text-xs text-gray-700 focus:outline-hidden focus:border-[#176B37]"
    aria-label="Filter by LGA"
  >
              {!isLgaLocked && <option value="All">All LGAs in Scope</option>}
              {lgaOptions.map((l) => <option key={l} value={l}>
                  {l} LGA
                </option>)}
            </select>
          </div>

          {
    /* Row 2: Category, Status, Payment, Verification, Date Range & Sort */
  }
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
            <select
    value={categoryFilter}
    onChange={(e) => setCategoryFilter(e.target.value)}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-gray-700 focus:outline-hidden focus:border-[#176B37]"
    aria-label="Filter by Category"
  >
              <option value="All">All Categories</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>
                  {c}
                </option>)}
            </select>

            <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-gray-700 focus:outline-hidden focus:border-[#176B37]"
    aria-label="Filter by Membership Status"
  >
              <option value="All">All Membership Statuses</option>
              {MEMBERSHIP_STATUS_OPTIONS.map((st) => <option key={st} value={st}>
                  {st}
                </option>)}
            </select>

            <select
    value={paymentFilter}
    onChange={(e) => setPaymentFilter(e.target.value)}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-gray-700 focus:outline-hidden focus:border-[#176B37]"
    aria-label="Filter by Payment Status"
  >
              <option value="All">All Payment Statuses</option>
              {PAYMENT_STATUS_OPTIONS.map((st) => <option key={st} value={st}>
                  {st}
                </option>)}
            </select>

            <select
    value={verificationFilter}
    onChange={(e) => setVerificationFilter(e.target.value)}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-gray-700 focus:outline-hidden focus:border-[#176B37]"
    aria-label="Filter by Verification"
  >
              <option value="All">All Verifications</option>
              <option value="BVN Verified">BVN Verified</option>
              <option value="Email Verified">Email Verified</option>
              <option value="Paystack Verified">Paystack Verified</option>
              <option value="Unverified">Incomplete Verification</option>
            </select>

            <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
    type="date"
    value={joinedFrom}
    onChange={(e) => setJoinedFrom(e.target.value)}
    title="Joined From Date"
    className="w-full text-[11px] font-mono bg-transparent focus:outline-hidden"
  />
              <span className="text-gray-400">–</span>
              <input
    type="date"
    value={joinedTo}
    onChange={(e) => setJoinedTo(e.target.value)}
    title="Joined To Date"
    className="w-full text-[11px] font-mono bg-transparent focus:outline-hidden"
  />
            </div>

            <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-gray-700 font-medium focus:outline-hidden focus:border-[#176B37]"
    aria-label="Sort Operators"
  >
              <option value="joined_desc">Sort: Joined (Newest)</option>
              <option value="joined_asc">Sort: Joined (Oldest)</option>
              <option value="name_asc">Sort: Name (A–Z)</option>
              <option value="state_asc">Sort: State / LGA</option>
              <option value="status_asc">Sort: Membership Status</option>
              <option value="paid_desc">Sort: Dues Paid (High–Low)</option>
            </select>
          </div>

          {!canAdjustPayments && <div className="flex items-center gap-1.5 text-[11px] text-gray-600 pt-0.5">
              <Lock className="w-3 h-3 text-gray-500 shrink-0" />
              <span>Paystack Backend Enforcement Active: Executives without audit clearance cannot manually mark unpaid operators as Paid.</span>
            </div>}
        </div>

        {
    /* Directory Results: Table View vs Cards View */
  }
        {viewMode === "table" ? <div className="rounded-xl border border-[#E5E7EB] overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1060px]">
              <thead className="bg-[#EAF3ED]/70 text-[#14532D] font-bold border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3 px-3.5">Operator &amp; ID</th>
                  <th className="py-3 px-3.5">Contact &amp; Terminal</th>
                  <th className="py-3 px-3.5">Category</th>
                  <th className="py-3 px-3.5">Zone / State / LGA / Ward</th>
                  <th className="py-3 px-3.5">Verification &amp; Dates</th>
                  <th className="py-3 px-3.5">Membership Status</th>
                  <th className="py-3 px-3.5">Payment Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedMembers.length === 0 ? <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-500">
                      No mobile money operator records match your current filter criteria.
                    </td>
                  </tr> : paginatedMembers.map((m) => {
      const pStatus = m.paymentStatus;
      const paidAmt = m.amountPaid;
      return <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
        src={m.photoUrl || "/assets/images/ammon_hero_pos_agent_1794380620175.jpg"}
        alt={m.fullName}
        onError={(e) => {
          e.currentTarget.src = "/assets/images/ammon_hero_pos_agent_1794380620175.jpg";
        }}
        className="w-9 h-9 rounded-lg object-cover object-top border border-gray-200 shrink-0 bg-gray-100"
        referrerPolicy="no-referrer"
      />
                            <div className="min-w-0">
                              <div className="font-bold text-[#252525] truncate max-w-[170px]">{m.fullName}</div>
                              <div className="text-[11px] text-gray-500 truncate max-w-[170px]">{m.businessName}</div>
                              <div className="text-[10px] font-mono font-bold text-[#176B37] mt-0.5">
                                {m.membershipId}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="text-[11px] font-medium text-gray-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{maskPii ? maskPhone(m.phone) : m.phone || "—"}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{maskPii ? maskEmail(m.email) : m.email || "—"}</span>
                          </div>
                          <div className="text-[10px] font-mono text-[#14532D] flex items-center gap-1 mt-1">
                            <Smartphone className="w-3 h-3 text-[#176B37] shrink-0" />
                            <span>
                              {m.terminalProvider || "POS"} · {m.terminalSerialNumber || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-gray-700 font-medium whitespace-nowrap">
                          <div>{m.category}</div>
                          {m.tier && <div className="text-[10px] text-gray-400">{m.tier}</div>}
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-[#252525]">
                            {m.state} · {m.lga}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {m.zone}
                            {m.ward ? ` · ${m.ward}` : ""}
                            {m.community ? ` (${m.community})` : ""}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 font-mono text-[11px] text-gray-600">
                          <div>Joined: {m.joinedDate}</div>
                          <div className="text-gray-400">Exp: {m.expiryDate}</div>
                          <div className="flex flex-wrap gap-1 mt-1 font-sans">
                            {m.bvnVerified && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                BVN ✓
                              </span>}
                            {m.emailVerified && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#176B37] border border-emerald-200">
                                Email ✓
                              </span>}
                          </div>
                        </td>

                        <td className="py-3 px-3.5">
                          <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${memberStatusBadgeClass(m.status)}`}
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
                          {m.paystackVerified ? <div className="text-[9px] font-mono text-[#176B37] flex items-center gap-0.5 mt-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Paystack Verified</span>
                            </div> : <div className="text-[9px] text-gray-400 mt-0.5">No gateway ref</div>}
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
        type="button"
        onClick={() => setInspectMember(m)}
        className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-[#EAF3ED] text-gray-800 hover:text-[#176B37] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
        title="Inspect Full Operator Profile"
      >
                              <UserCheck className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>

                            <button
        type="button"
        onClick={() => onSelectMember(m)}
        className="px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:border-[#176B37] hover:text-[#176B37] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
        title="Open Official Digital ID Card"
      >
                              <Eye className="w-3 h-3" />
                              <span>ID</span>
                            </button>

                            {canApprove && m.status !== "Active" && <button
        type="button"
        disabled={busyMemberId === m.id}
        onClick={() => handleUpdateMemberStatus(m, "Active")}
        className="px-2 py-1 rounded-lg bg-[#176B37] hover:bg-[#14532D] text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
      >
                                Approve
                              </button>}

                            {pStatus !== "Paid" && <button
        type="button"
        disabled={busyMemberId === m.id}
        onClick={() => handleVerifyPaystackRef(m)}
        className="px-2 py-1 rounded-lg bg-[#EAF3ED] hover:bg-[#176B37] text-[#176B37] hover:text-white border border-[#176B37]/30 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
        title="Verify payment reference through Paystack backend verifier"
      >
                                <CreditCard className="w-3 h-3" />
                                <span>Paystack</span>
                              </button>}

                            {canAdjustPayments ? <button
        type="button"
        onClick={() => {
          setAdjustMember(m);
          setAdjStatus(pStatus);
          setAdjAmount(String(paidAmt));
          setAdjReason("");
          setAdjApproverBadge(executive.badgeNumber);
        }}
        className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold cursor-pointer"
      >
                                Adjust
                              </button> : <span
        className="px-2 py-1 rounded-lg bg-gray-100 text-gray-400 text-[10px] font-medium inline-flex items-center gap-1"
        title="Manual financial overrides require Super Admin or National Audit clearance"
      >
                                <Lock className="w-2.5 h-2.5" />
                              </span>}
                          </div>
                        </td>
                      </tr>;
    })}
              </tbody>
            </table>
          </div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {paginatedMembers.length === 0 ? <div className="col-span-full py-10 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl">
                No mobile money operator records match your current filter criteria.
              </div> : paginatedMembers.map((m) => <div
    key={m.id}
    className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FBFA]/60 hover:border-[#176B37]/40 transition-colors flex flex-col justify-between gap-3 text-xs"
  >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
    src={m.photoUrl || "/assets/images/ammon_hero_pos_agent_1794380620175.jpg"}
    alt={m.fullName}
    onError={(e) => {
      e.currentTarget.src = "/assets/images/ammon_hero_pos_agent_1794380620175.jpg";
    }}
    className="w-12 h-12 rounded-xl object-cover object-top border border-[#176B37]/30 shrink-0 bg-white"
    referrerPolicy="no-referrer"
  />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[#252525] truncate">{m.fullName}</div>
                      <div className="text-[11px] text-gray-600 truncate">{m.businessName}</div>
                      <div className="text-[10px] font-mono font-bold text-[#176B37] mt-0.5">{m.membershipId}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${memberStatusBadgeClass(m.status)}`}>
                    {m.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Jurisdiction</span>
                    <span className="font-semibold text-gray-800">{m.state} · {m.lga}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Terminal</span>
                    <span className="font-mono text-gray-800">{m.terminalProvider} · {m.terminalSerialNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Phone</span>
                    <span className="text-gray-700">{maskPii ? maskPhone(m.phone) : m.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Dues Status</span>
                    <span className="font-semibold text-[#176B37]">{m.paymentStatus} (₦{m.amountPaid.toLocaleString()})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/70">
                  <span className="text-[10px] font-mono text-gray-500">Joined {m.joinedDate}</span>
                  <div className="flex items-center gap-1.5">
                    <button
    type="button"
    onClick={() => setInspectMember(m)}
    className="px-2.5 py-1 rounded-lg bg-[#176B37] text-white text-[11px] font-semibold cursor-pointer"
  >
                      Inspect
                    </button>
                    <button
    type="button"
    onClick={() => onSelectMember(m)}
    className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-[#176B37] text-[11px] font-semibold cursor-pointer"
  >
                      ID Card
                    </button>
                  </div>
                </div>
              </div>)}
          </div>}

        {
    /* Pagination Controls */
  }
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
    value={pageSize}
    onChange={(e) => setPageSize(e.target.value === "All" ? "All" : Number(e.target.value))}
    className="px-2 py-1 rounded-lg border border-[#E5E7EB] bg-white text-xs focus:outline-hidden focus:border-[#176B37]"
  >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="All">All ({filteredMembers.length})</option>
            </select>
            <span className="text-[11px] text-gray-500">
              Showing {paginatedMembers.length} of {filteredMembers.length} filtered records
            </span>
          </div>

          {totalPages > 1 && <div className="flex items-center gap-1.5">
              <button
    type="button"
    disabled={safePage <= 1}
    onClick={() => setPage((p) => Math.max(1, p - 1))}
    className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
  >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2.5 font-mono text-[11px] font-bold text-[#14532D]">
                Page {safePage} / {totalPages}
              </span>
              <button
    type="button"
    disabled={safePage >= totalPages}
    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
    className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
  >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>}
        </div>
      </div>

      {
    /* Audited Financial Adjustments History */
  }
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

        {financialAdjustments.length === 0 ? <p className="text-xs text-gray-500 py-3">No manual financial adjustments recorded in this jurisdiction.</p> : <div className="space-y-2.5">
            {financialAdjustments.map((adj) => <div
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
                  <strong>Change:</strong> {adj.previousStatus} (₦{adj.previousAmountPaid.toLocaleString()}) →{" "}
                  <strong className="text-[#176B37]">{adj.newStatus} (₦{adj.newAmountPaid.toLocaleString()})</strong>
                </p>
                <p className="text-gray-600">
                  <strong>Reason:</strong> {adj.reason}
                </p>
                <p className="text-[11px] text-gray-500">
                  Approved by: <strong>{adj.approvedByName}</strong> ({adj.approvedByPosition})
                </p>
              </div>)}
          </div>}
      </div>

      {
    /* Operator Registry Detail / Dossier Modal */
  }
      {inspectMember && <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
    onClick={() => setInspectMember(null)}
  >
          <div
    className="bg-white rounded-2xl max-w-2xl w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    onClick={(e) => e.stopPropagation()}
  >
            <div className="bg-[#14532D] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img
    src={inspectMember.photoUrl || "/assets/images/ammon_hero_pos_agent_1794380620175.jpg"}
    alt={inspectMember.fullName}
    onError={(e) => {
      e.currentTarget.src = "/assets/images/ammon_hero_pos_agent_1794380620175.jpg";
    }}
    className="w-11 h-11 rounded-xl object-cover object-top border-2 border-white/40 bg-white shrink-0"
    referrerPolicy="no-referrer"
  />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{inspectMember.fullName}</h4>
                  <p className="text-[11px] text-emerald-100 font-mono truncate">
                    {inspectMember.membershipId} · {inspectMember.category}
                  </p>
                </div>
              </div>
              <button
    type="button"
    onClick={() => setInspectMember(null)}
    className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
  >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F9FBFA] border border-[#E5E7EB] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-[#176B37] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Operator &amp; Business Outlet</span>
                  </div>
                  <p><strong>Business Name:</strong> {inspectMember.businessName}</p>
                  <p><strong>Tier:</strong> {inspectMember.tier || "Standard Agent"}</p>
                  <p><strong>Phone:</strong> {inspectMember.phone || "—"}</p>
                  <p><strong>Email:</strong> {inspectMember.email || "—"}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F9FBFA] border border-[#E5E7EB] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-[#176B37] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Jurisdiction &amp; Terminal</span>
                  </div>
                  <p><strong>Zone:</strong> {inspectMember.zone}</p>
                  <p><strong>State / LGA:</strong> {inspectMember.state} · {inspectMember.lga}</p>
                  <p><strong>Ward / Community:</strong> {inspectMember.ward || "—"} {inspectMember.community ? `(${inspectMember.community})` : ""}</p>
                  <p><strong>Terminal:</strong> <span className="font-mono">{inspectMember.terminalProvider} · {inspectMember.terminalSerialNumber}</span></p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F9FBFA] border border-[#E5E7EB] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-[#176B37] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Compliance &amp; Identity</span>
                  </div>
                  <p><strong>Membership Status:</strong> {inspectMember.status}</p>
                  <p><strong>BVN Verified:</strong> {inspectMember.bvnVerified ? "Yes" : "Pending"}</p>
                  <p><strong>Email Verified:</strong> {inspectMember.emailVerified ? "Yes" : "Pending"}</p>
                  <p><strong>CBN Compliant:</strong> {inspectMember.cbnCompliant ? "Yes" : "Review Required"}</p>
                  <p><strong>Joined / Expiry:</strong> <span className="font-mono">{inspectMember.joinedDate} → {inspectMember.expiryDate}</span></p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F9FBFA] border border-[#E5E7EB] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-[#176B37] flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Financial &amp; KYC Dossier</span>
                  </div>
                  <p><strong>Payment Status:</strong> {inspectMember.paymentStatus}</p>
                  <p><strong>Dues Paid:</strong> <span className="font-mono font-bold text-[#176B37]">₦{(inspectMember.amountPaid || 0).toLocaleString()}</span> / ₦{(inspectMember.duesAmount || 0).toLocaleString()}</p>
                  <p><strong>Paystack Ref:</strong> <span className="font-mono">{inspectMember.paystackReference || "Unverified"}</span></p>
                  <p>
                    <strong>KYC Document:</strong>{" "}
                    {inspectMember.kycDocumentUrl ? <a
    href={inspectMember.kycDocumentUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-[#176B37] font-semibold underline inline-flex items-center gap-1"
  >
                        <span>View {inspectMember.kycDocumentType || "KYC File"}</span>
                        <Download className="w-3 h-3" />
                      </a> : "On-file attestation"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  {canApprove && inspectMember.status !== "Active" && <button
    type="button"
    disabled={busyMemberId === inspectMember.id}
    onClick={() => handleUpdateMemberStatus(inspectMember, "Active")}
    className="px-3 py-1.5 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-semibold cursor-pointer disabled:opacity-50"
  >
                      Approve &amp; Activate
                    </button>}
                  {canApprove && inspectMember.status === "Active" && <button
    type="button"
    disabled={busyMemberId === inspectMember.id}
    onClick={() => handleUpdateMemberStatus(inspectMember, "Suspended")}
    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold cursor-pointer disabled:opacity-50"
  >
                      Suspend Operator
                    </button>}
                </div>

                <div className="flex items-center gap-2">
                  <button
    type="button"
    onClick={() => {
      const selected = inspectMember;
      setInspectMember(null);
      onSelectMember(selected);
    }}
    className="px-3.5 py-1.5 rounded-xl border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] font-semibold flex items-center gap-1.5 cursor-pointer"
  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open Digital ID Card</span>
                  </button>
                  <button
    type="button"
    onClick={() => setInspectMember(null)}
    className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>}

      {
    /* Authorized Financial Adjustment Modal */
  }
      {adjustMember && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
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
    onChange={(e) => setAdjStatus(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  {PAYMENT_STATUS_OPTIONS.map((st) => <option
    key={st}
    value={st}
    disabled={st === "Partially Paid" && !hierarchyConfig.allowPartialPayments}
  >
                      {st}
                      {st === "Partially Paid" && !hierarchyConfig.allowPartialPayments ? " (Disabled by Policy)" : ""}
                    </option>)}
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
                  {isAdjusting ? "Recording Audit..." : "Commit Audited Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
export {
  CentralizedMembershipLedger
};
