import React, { useMemo, useState } from 'react';
import {
  Megaphone,
  Send,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  AdminUser,
  ExecutiveAnnouncement,
  ExecutiveLevel,
  HierarchyConfig,
} from '../../types';
import { publishAnnouncementApi } from '../../services/executiveApi';

interface ExecutiveAnnouncementsWorkspaceProps {
  executive: AdminUser;
  hierarchyConfig: HierarchyConfig;
  announcements: ExecutiveAnnouncement[];
  onRefreshWorkspace: () => Promise<void>;
}

export const ExecutiveAnnouncementsWorkspace: React.FC<ExecutiveAnnouncementsWorkspaceProps> = ({
  executive,
  hierarchyConfig,
  announcements,
  onRefreshWorkspace,
}) => {
  const execLevel = executive.level || 'national';
  const canPublish =
    executive.level === 'super_admin' || Boolean(executive.permissions?.canPublishAnnouncements);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<ExecutiveAnnouncement['type']>('Announcement');
  const [targetLevel, setTargetLevel] = useState<'all' | ExecutiveLevel>('all');
  const [targetZone, setTargetZone] = useState(executive.assignedZone || '');
  const [targetState, setTargetState] = useState(executive.assignedState || '');
  const [targetLga, setTargetLga] = useState(executive.assignedLga || '');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingCode, setMeetingCode] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isTopScope = execLevel === 'super_admin' || execLevel === 'national' || execLevel === 'specialized';

  const stateOptions = useMemo(() => {
    if (executive.assignedState) return [executive.assignedState];
    if (targetZone) {
      return hierarchyConfig.zones.find((z) => z.name === targetZone)?.states || [];
    }
    return hierarchyConfig.zones.flatMap((z) => z.states).sort();
  }, [executive, targetZone, hierarchyConfig]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setPublishing(true);
    try {
      const res = await publishAnnouncementApi({
        title,
        body,
        type,
        targetLevel,
        targetZone: executive.assignedZone || targetZone || undefined,
        targetState: executive.assignedState || targetState || undefined,
        targetLga: executive.assignedLga || targetLga || undefined,
        meetingDate: type === 'Meeting Invitation' && meetingDate ? meetingDate : undefined,
        meetingCode: type === 'Meeting Invitation' && meetingCode ? meetingCode : undefined,
      });
      await onRefreshWorkspace();
      setTitle('');
      setBody('');
      setMeetingDate('');
      setMeetingCode('');
      setFeedback({
        type: 'success',
        text: `Published "${res.announcement.title}" to authorized jurisdiction scope.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to publish announcement.',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
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

      {canPublish && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="font-bold text-base text-[#252525] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#176B37]" />
              <span>Targeted Executive Communications &amp; Directives</span>
            </h3>
            <p className="text-xs text-gray-500">
              Send notices, meeting invitations, or compliance directives scoped to <strong className="text-[#176B37]">{executive.jurisdiction}</strong>
            </p>
          </div>

          <form onSubmit={handlePublish} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Subject / Headline *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Zonal Strategy & Compliance Alignment Meeting"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notice Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ExecutiveAnnouncement['type'])}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Notice">Official Notice</option>
                  <option value="Meeting Invitation">Meeting Invitation</option>
                  <option value="Compliance Directive">Compliance Directive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Level</label>
                <select
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(e.target.value as 'all' | ExecutiveLevel)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                >
                  <option value="all">All Levels in Scope</option>
                  <option value="zonal">Zonal Executives</option>
                  <option value="state">State Executives</option>
                  <option value="lga">LGA Executives</option>
                  <option value="ward">Ward Executives</option>
                  <option value="community">Community Executives</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Zone Scope</label>
                <select
                  value={executive.assignedZone || targetZone}
                  disabled={!isTopScope}
                  onChange={(e) => {
                    setTargetZone(e.target.value);
                    setTargetState('');
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 focus:outline-hidden focus:border-[#176B37]"
                >
                  {isTopScope && <option value="">All Zones (Nationwide)</option>}
                  {hierarchyConfig.zones.map((z) => (
                    <option key={z.name} value={z.name}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">State Scope</label>
                <select
                  value={executive.assignedState || targetState}
                  disabled={Boolean(executive.assignedState)}
                  onChange={(e) => setTargetState(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 focus:outline-hidden focus:border-[#176B37]"
                >
                  {!executive.assignedState && <option value="">All Authorized States</option>}
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">LGA Scope (Optional)</label>
                <input
                  type="text"
                  disabled={Boolean(executive.assignedLga)}
                  value={executive.assignedLga || targetLga}
                  onChange={(e) => setTargetLga(e.target.value)}
                  placeholder="All LGAs"
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white disabled:bg-gray-100 focus:outline-hidden focus:border-[#176B37]"
                />
              </div>
            </div>

            {type === 'Meeting Invitation' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#EAF3ED]/70 rounded-xl border border-[#176B37]/20">
                <div>
                  <label className="block font-semibold text-[#14532D] mb-1">Meeting Date &amp; Time</label>
                  <input
                    type="text"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    placeholder="e.g. 2025-11-24 • 11:00 AM WAT"
                    className="w-full p-2 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#14532D] mb-1">Virtual Room Code</label>
                  <input
                    type="text"
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    placeholder="e.g. AMMON-BY-SYNC-02"
                    className="w-full p-2 rounded-xl border border-[#E5E7EB] bg-white font-mono focus:outline-hidden focus:border-[#176B37]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Directive / Notice Content *</label>
              <textarea
                rows={3}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write clear operational instructions or meeting agenda..."
                className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={publishing}
                className="px-5 py-2.5 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{publishing ? 'Dispatching...' : 'Dispatch Targeted Communication'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dispatched & Received Notices */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#252525]">Jurisdiction Directives &amp; Notices Feed</h3>
            <p className="text-xs text-gray-500">
              Communications directed to or published within {executive.jurisdiction}
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-[#EAF3ED] text-[#176B37] px-2.5 py-1 rounded-full">
            {announcements.length} Active
          </span>
        </div>

        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="p-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FBFA] space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      ann.type === 'Compliance Directive'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : ann.type === 'Meeting Invitation'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-[#EAF3ED] text-[#176B37] border border-[#176B37]/25'
                    }`}
                  >
                    {ann.type}
                  </span>
                  <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#176B37]" />
                    {ann.targetLga || ann.targetState || ann.targetZone || 'Nationwide'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">{ann.createdAt}</span>
              </div>

              <h4 className="font-bold text-sm text-[#252525]">{ann.title}</h4>
              <p className="text-gray-700 leading-relaxed">{ann.body}</p>

              {ann.meetingDate && (
                <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-white border border-blue-200 text-[11px] text-blue-900">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    {ann.meetingDate}
                  </span>
                  {ann.meetingCode && (
                    <span className="font-mono font-bold bg-blue-50 px-2 py-0.5 rounded">
                      Code: {ann.meetingCode}
                    </span>
                  )}
                </div>
              )}

              <p className="text-[11px] text-gray-500 pt-1">
                From: <strong>{ann.senderName}</strong> ({ann.senderPosition})
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
