import { useState } from "react";
import {
  FileText,
  Send,
  ArrowUpRight,
  MessageSquare,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { reviewExecutiveReportApi, submitExecutiveReportApi } from "../../services/executiveApi";
const REPORT_TYPES = [
  "Membership Mobilization",
  "New Member Registration",
  "Dues Collection",
  "Meetings & Attendance",
  "Community Engagement",
  "Industry Issues & Complaints",
  "Monthly Activity"
];
function routingDisplay(level) {
  switch (level) {
    case "community":
      return "Ward Executive";
    case "ward":
      return "LGA Executive";
    case "lga":
      return "State Executive";
    case "state":
      return "Zonal Executive";
    case "zonal":
      return "National Executive";
    case "national":
    case "super_admin":
    case "specialized":
    default:
      return "National Secretariat";
  }
}
const ExecutiveReportsWorkspace = ({
  executive,
  reports,
  onRefreshWorkspace
}) => {
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("Monthly Activity");
  const [summary, setSummary] = useState("");
  const [newRegs, setNewRegs] = useState("");
  const [duesCollected, setDuesCollected] = useState("");
  const [meetingsHeld, setMeetingsHeld] = useState("");
  const [attendanceCount, setAttendanceCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewComments, setReviewComments] = useState({});
  const [statusMsg, setStatusMsg] = useState(null);
  const execLevel = executive.level || "national";
  const canSubmit = executive.level === "super_admin" || Boolean(executive.permissions?.canSubmitReports);
  const canReview = executive.level === "super_admin" || Boolean(executive.permissions?.canReviewReports);
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setStatusMsg(null);
    setSubmitting(true);
    try {
      const res = await submitExecutiveReportApi({
        title,
        reportType,
        summary,
        metrics: {
          newRegistrations: newRegs ? Number(newRegs) : void 0,
          duesCollected: duesCollected ? Number(duesCollected) : void 0,
          meetingsHeld: meetingsHeld ? Number(meetingsHeld) : void 0,
          attendanceCount: attendanceCount ? Number(attendanceCount) : void 0
        }
      });
      await onRefreshWorkspace();
      setTitle("");
      setSummary("");
      setNewRegs("");
      setDuesCollected("");
      setMeetingsHeld("");
      setAttendanceCount("");
      setStatusMsg({
        type: "success",
        text: `Report "${res.report.title}" submitted and auto-routed upward to ${res.report.routedToLevel.toUpperCase()} Executive level.`
      });
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to submit executive report."
      });
    } finally {
      setSubmitting(false);
    }
  };
  const handleReviewAction = async (report, reviewStatus, escalate = false) => {
    setStatusMsg(null);
    setReviewingId(report.id);
    try {
      const comment = (reviewComments[report.id] || "").trim();
      await reviewExecutiveReportApi(report.id, {
        reviewStatus,
        comment: comment || void 0,
        escalate
      });
      setReviewComments((prev) => ({ ...prev, [report.id]: "" }));
      await onRefreshWorkspace();
      setStatusMsg({
        type: "success",
        text: escalate ? `Report "${report.title}" escalated to next administrative tier.` : `Updated review status for "${report.title}" to ${reviewStatus}.`
      });
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update report review."
      });
    } finally {
      setReviewingId(null);
    }
  };
  return <div className="space-y-6 animate-in fade-in duration-150">
      {statusMsg && <div
    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${statusMsg.type === "success" ? "bg-[#EAF3ED] border-[#176B37]/30 text-[#14532D]" : "bg-red-50 border-red-200 text-red-800"}`}
  >
          {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-[#176B37] shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
          <span className="font-medium">{statusMsg.text}</span>
        </div>}

      {
    /* Submit New Executive Activity Report */
  }
      {canSubmit && <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-base text-[#252525] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#176B37]" />
                <span>Submit Executive Activity Report</span>
              </h3>
              <p className="text-xs text-gray-500">
                Reports from <strong className="text-[#176B37]">{executive.jurisdiction}</strong> automatically route upward to{" "}
                <strong>{routingDisplay(execLevel)}</strong>
              </p>
            </div>
            <span className="text-[10px] font-bold bg-[#EAF3ED] text-[#176B37] px-2.5 py-1 rounded-full border border-[#176B37]/20">
              {execLevel.toUpperCase()} → {routingDisplay(execLevel).toUpperCase()}
            </span>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Report Title *</label>
                <input
    type="text"
    required
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    placeholder="e.g. Monthly Kiosk Enumeration & Dues Mobilization"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Report Classification *</label>
                <select
    value={reportType}
    onChange={(e) => setReportType(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  {REPORT_TYPES.map((rt) => <option key={rt} value={rt}>
                      {rt}
                    </option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Executive Narrative &amp; Findings *</label>
              <textarea
    rows={3}
    required
    value={summary}
    onChange={(e) => setSummary(e.target.value)}
    placeholder="Document field activities, registrations mobilized, dues compliance observations, or industry escalations..."
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">New Registrations</label>
                <input
    type="number"
    min={0}
    value={newRegs}
    onChange={(e) => setNewRegs(e.target.value)}
    placeholder="0"
    className="w-full p-2 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Dues Collected (₦)</label>
                <input
    type="number"
    min={0}
    value={duesCollected}
    onChange={(e) => setDuesCollected(e.target.value)}
    placeholder="0"
    className="w-full p-2 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Meetings Held</label>
                <input
    type="number"
    min={0}
    value={meetingsHeld}
    onChange={(e) => setMeetingsHeld(e.target.value)}
    placeholder="0"
    className="w-full p-2 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Attendance Count</label>
                <input
    type="number"
    min={0}
    value={attendanceCount}
    onChange={(e) => setAttendanceCount(e.target.value)}
    placeholder="0"
    className="w-full p-2 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
            </div>

            <div className="flex justify-end">
              <button
    type="submit"
    disabled={submitting}
    className="px-5 py-2.5 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
  >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Routing Report..." : `Submit & Route to ${routingDisplay(execLevel)}`}</span>
              </button>
            </div>
          </form>
        </div>}

      {
    /* Routed Executive Activity Reports Queue */
  }
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#252525]">
              Hierarchical Activity Reports Inbox &amp; Archive
            </h3>
            <p className="text-xs text-gray-500">
              Chain-of-command reports scoped to {executive.jurisdiction} (Community → Ward → LGA → State → Zonal → National)
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#176B37] bg-[#EAF3ED] px-2.5 py-1 rounded-full">
            {reports.length} Reports
          </span>
        </div>

        {reports.length === 0 ? <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
            No executive activity reports have been routed to your jurisdiction yet.
          </div> : <div className="space-y-4">
            {reports.map((rep) => <div
    key={rep.id}
    className="p-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FBFA] space-y-3 text-xs"
  >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-[#176B37] text-white font-bold text-[10px] uppercase">
                        {rep.reportType}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-semibold text-[10px]">
                        {rep.submittedByLevel.toUpperCase()} → {rep.routedToLevel.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">
                        {rep.state} · {rep.lga}
                        {rep.ward ? ` · ${rep.ward}` : ""}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-[#252525]">{rep.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Submitted by <strong>{rep.submittedByName}</strong> ({rep.submittedByPosition}) · {rep.submittedAt}
                    </p>
                  </div>

                  <span
    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 self-start ${rep.reviewStatus === "Approved" ? "bg-emerald-50 text-[#176B37] border-emerald-200" : rep.reviewStatus === "Escalated to Next Level" ? "bg-purple-50 text-purple-800 border-purple-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}
  >
                    {rep.reviewStatus}
                  </span>
                </div>

                <p className="text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-100">
                  {rep.summary}
                </p>

                {rep.metrics && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white px-3 py-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-400 block">New Registrations</span>
                      <strong className="font-mono text-[#176B37]">{rep.metrics.newRegistrations ?? 0}</strong>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-400 block">Dues Mobilized</span>
                      <strong className="font-mono text-[#176B37]">
                        ₦{(rep.metrics.duesCollected ?? 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-400 block">Meetings Held</span>
                      <strong className="font-mono text-[#252525]">{rep.metrics.meetingsHeld ?? 0}</strong>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-400 block">Attendance</span>
                      <strong className="font-mono text-[#252525]">{rep.metrics.attendanceCount ?? 0}</strong>
                    </div>
                  </div>}

                {
    /* Administrative Comments Thread */
  }
                {rep.administrativeComments.length > 0 && <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#176B37]" />
                      Administrative Review Comments
                    </span>
                    {rep.administrativeComments.map((c, idx) => <div
    key={idx}
    className="p-2.5 rounded-xl bg-[#EAF3ED]/70 border border-[#176B37]/20 text-[11px]"
  >
                        <div className="flex items-center justify-between text-[#14532D] font-bold">
                          <span>
                            {c.authorName} ({c.authorPosition})
                          </span>
                          <span className="text-[10px] font-normal text-gray-500">{c.timestamp}</span>
                        </div>
                        <p className="text-gray-700 mt-1">{c.comment}</p>
                      </div>)}
                  </div>}

                {
    /* Supervising Executive Review & Escalation Controls */
  }
                {canReview && rep.submittedById !== executive.id && <div className="pt-2 border-t border-gray-200/70 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
    type="text"
    value={reviewComments[rep.id] || ""}
    onChange={(e) => setReviewComments((prev) => ({ ...prev, [rep.id]: e.target.value }))}
    placeholder="Add administrative comment or compliance directive..."
    className="flex-1 p-2 rounded-xl border border-[#E5E7EB] bg-white text-xs focus:outline-hidden focus:border-[#176B37]"
  />
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        <button
    type="button"
    disabled={reviewingId === rep.id}
    onClick={() => handleReviewAction(rep, "Reviewed & Noted", false)}
    className="px-3 py-1.5 rounded-xl border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] font-semibold cursor-pointer"
  >
                          Note &amp; Comment
                        </button>
                        <button
    type="button"
    disabled={reviewingId === rep.id}
    onClick={() => handleReviewAction(rep, "Approved", false)}
    className="px-3 py-1.5 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-semibold cursor-pointer"
  >
                          Approve
                        </button>
                        {rep.routedToLevel !== "national" && <button
    type="button"
    disabled={reviewingId === rep.id}
    onClick={() => handleReviewAction(rep, "Escalated to Next Level", true)}
    className="px-3 py-1.5 rounded-xl bg-[#14532D] hover:bg-emerald-950 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
  >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Escalate</span>
                          </button>}
                      </div>
                    </div>
                  </div>}
              </div>)}
          </div>}
      </div>
    </div>;
};
export {
  ExecutiveReportsWorkspace
};
