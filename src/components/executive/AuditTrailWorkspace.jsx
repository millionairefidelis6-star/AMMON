import { useMemo, useState } from "react";
import { Lock, Search, ShieldAlert, CheckCircle2 } from "lucide-react";
const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "PASSWORD_SETUP",
  "ACCESS_DENIED",
  "MEMBER_REGISTRATION",
  "MEMBER_APPROVAL",
  "PAYMENT_PAYSTACK_VERIFIED",
  "PAYMENT_ADJUSTMENT",
  "EXEC_CREATED",
  "PERMISSION_CHANGED",
  "ANNOUNCEMENT_PUBLISHED",
  "REPORT_SUBMITTED",
  "REPORT_REVIEWED",
  "HIERARCHY_UPDATED",
  "CHAT_MESSAGE_PERMANENT_DELETE"
];
const AuditTrailWorkspace = ({
  executive,
  auditLogs
}) => {
  const [actionFilter, setActionFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const matchesAction = actionFilter === "All" || log.action === actionFilter;
      const matchesQuery = !q || log.actorName.toLowerCase().includes(q) || log.details.toLowerCase().includes(q) || log.affectedRecordLabel.toLowerCase().includes(q) || log.actorJurisdiction.toLowerCase().includes(q);
      return matchesAction && matchesQuery;
    });
  }, [auditLogs, actionFilter, searchQuery]);
  return <div className="space-y-5 animate-in fade-in duration-150">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#252525] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#176B37]" />
              <span>Immutable Governance &amp; Security Audit Trail</span>
            </h3>
            <p className="text-xs text-gray-500">
              Append-only record of logins, access denials, Paystack verifications, financial adjustments, and account provisioning ({executive.jurisdiction})
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-[#EAF3ED] text-[#176B37] px-2.5 py-1 rounded-full border border-[#176B37]/20">
            {filteredLogs.length} IMMUTABLE ENTRIES
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search actor, jurisdiction, affected record, or details..."
    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-gray-50/60 focus:outline-hidden focus:border-[#176B37]"
  />
          </div>

          <select
    value={actionFilter}
    onChange={(e) => setActionFilter(e.target.value)}
    className="py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
            <option value="All">All Audit Actions</option>
            {AUDIT_ACTIONS.map((act) => <option key={act} value={act}>
                {act}
              </option>)}
          </select>
        </div>

        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
              No audit log entries match your current filter.
            </div> : filteredLogs.map((log) => {
    const isAlert = log.action === "ACCESS_DENIED" || log.action === "LOGIN_FAILED";
    const isFinance = log.action === "PAYMENT_ADJUSTMENT" || log.action === "PAYMENT_PAYSTACK_VERIFIED";
    return <div
      key={log.id}
      className={`p-3.5 rounded-xl border text-xs space-y-1 ${isAlert ? "bg-red-50/70 border-red-200" : isFinance ? "bg-[#EAF3ED]/60 border-[#176B37]/25" : "bg-[#F9FBFA] border-[#E5E7EB]"}`}
    >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${isAlert ? "bg-red-600 text-white" : isFinance ? "bg-[#176B37] text-white" : "bg-gray-800 text-white"}`}
    >
                        {log.action}
                      </span>
                      <span className="font-bold text-[#252525]">{log.actorName}</span>
                      <span className="text-[11px] text-gray-500">({log.actorJurisdiction})</span>
                    </div>
                    <span className="font-mono text-[10px] text-gray-500">{log.timestamp}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{log.details}</p>
                  <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5">
                    {isAlert ? <ShieldAlert className="w-3 h-3 text-red-600" /> : <CheckCircle2 className="w-3 h-3 text-[#176B37]" />}
                    <span>Record: {log.affectedRecordLabel}</span>
                  </div>
                </div>;
  })}
        </div>
      </div>
    </div>;
};
export {
  AuditTrailWorkspace
};
