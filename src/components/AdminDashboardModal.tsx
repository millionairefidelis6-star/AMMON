import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  LayoutDashboard,
  Users,
  FileText,
  ShieldAlert,
  Landmark,
  Award,
  Lock,
  Plus,
  ArrowLeft,
  LogOut,
  Menu,
  ShieldCheck,
  MapPin,
  Upload,
  Paperclip,
  MessageSquare,
  Video,
  ClipboardCheck,
  Megaphone,
  UserCog,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  AdminUser,
  DisputeTicket,
  ExecutiveAnnouncement,
  ExecutiveReport,
  HierarchyConfig,
  Member,
  NewsArticle,
  OnlineMeeting,
  SocialMessage,
} from '../types';
import { NIGERIAN_STATES } from '../data/mockData';
import {
  INITIAL_EXECUTIVE_ACCOUNTS,
  INITIAL_HIERARCHY_CONFIG,
} from '../data/hierarchyData';
import { AmmonLogo } from './AmmonLogo';
import {
  DASHBOARD_SERVICES_MENU,
  DashboardServicesWorkspace,
  ServiceSectionId,
} from './DashboardServicesWorkspace';
import { SocialSpaceWorkspace } from './SocialSpaceWorkspace';
import {
  ExecutiveWorkspacePayload,
  fetchExecutiveWorkspace,
  getStoredExecutiveToken,
} from '../services/executiveApi';
import { ExecutiveKpiOverview } from './executive/ExecutiveKpiOverview';
import { CentralizedMembershipLedger } from './executive/CentralizedMembershipLedger';
import { ExecutiveReportsWorkspace } from './executive/ExecutiveReportsWorkspace';
import { ExecutiveAnnouncementsWorkspace } from './executive/ExecutiveAnnouncementsWorkspace';
import { SuperAdminGovernanceWorkspace } from './executive/SuperAdminGovernanceWorkspace';
import { AuditTrailWorkspace } from './executive/AuditTrailWorkspace';

export type AdminSection =
  | 'overview'
  | 'registry'
  | 'reports'
  | 'announcements'
  | 'governance'
  | 'circulars'
  | 'disputes'
  | 'chapters'
  | 'academy'
  | 'security'
  | 'social-space'
  | 'online-meetings'
  | ServiceSectionId;

interface AdminDashboardModalProps {
  adminUser?: AdminUser;
  members: Member[];
  news: NewsArticle[];
  disputes: DisputeTicket[];
  isOpen: boolean;
  onClose: () => void;
  onAddNews: (article: NewsArticle) => void;
  onResolveDispute: (id: string) => void;
  onSelectMember: (member: Member) => void;
  onLogout?: () => void;
  onSwitchAdmin?: (admin: AdminUser) => void;
  socialMessages?: SocialMessage[];
  meetings?: OnlineMeeting[];
  onSendMessage?: (msg: SocialMessage) => void;
  onUpdateMessage?: (id: string, updates: Partial<SocialMessage>) => void;
  onCreateMeeting?: (meeting: OnlineMeeting) => void;
  onUpdateMeeting?: (id: string, updates: Partial<OnlineMeeting>) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  adminUser = INITIAL_EXECUTIVE_ACCOUNTS[0],
  members,
  news,
  disputes,
  isOpen,
  onClose,
  onAddNews,
  onResolveDispute,
  onSelectMember,
  onLogout,
  onSwitchAdmin,
  socialMessages = [],
  meetings = [],
  onSendMessage = () => {},
  onUpdateMessage = () => {},
  onCreateMeeting = () => {},
  onUpdateMeeting = () => {},
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  // Backend-authoritative workspace state
  const [workspace, setWorkspace] = useState<ExecutiveWorkspacePayload | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [geoFilters, setGeoFilters] = useState<{ zone?: string; state?: string; lga?: string }>({});

  // Announcement / Circular publisher state
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Regulatory' | 'Breaking News' | 'Press Release' | 'Notice'>('Regulatory');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newContent, setNewContent] = useState('');
  const [circularSuccess, setCircularSuccess] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<{
    name: string;
    size: string;
    data: string;
    type: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState('');

  const loadWorkspace = useCallback(
    async (filtersOverride?: { zone?: string; state?: string; lga?: string }) => {
      setWorkspaceLoading(true);
      setWorkspaceError('');
      try {
        if (!getStoredExecutiveToken()) {
          setWorkspaceError('Executive session token required. Please sign in again via Executive Login.');
          setWorkspaceLoading(false);
          return;
        }
        const activeFilters = filtersOverride !== undefined ? filtersOverride : geoFilters;
        const data = await fetchExecutiveWorkspace(activeFilters);
        setWorkspace(data);
      } catch (err) {
        setWorkspaceError(
          err instanceof Error ? err.message : 'Unable to fetch executive workspace from backend.'
        );
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [geoFilters]
  );

  useEffect(() => {
    if (isOpen) {
      setGeoFilters({});
      setActiveSection('overview');
      loadWorkspace({});
    }
  }, [isOpen, adminUser.id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB limit. Please upload a smaller document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeFormatted =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      setAttachmentFile({
        name: file.name,
        size: sizeFormatted,
        data: dataUrl,
        type: file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const activeExec: AdminUser = workspace?.executive || adminUser;
  const execLevel = activeExec.level || (activeExec.role === 'Super Admin' ? 'super_admin' : 'national');
  const isSuperAdmin = execLevel === 'super_admin' || activeExec.role === 'Super Admin';
  const isTopCouncil = isSuperAdmin || execLevel === 'national';

  const scopedMembers = workspace?.members || members;
  const scopedReports: ExecutiveReport[] = workspace?.reports || [];
  const scopedAnnouncements: ExecutiveAnnouncement[] = workspace?.announcements || [];
  const scopedDisputes = workspace?.disputes || disputes;
  const scopedAdjustments = workspace?.financialAdjustments || [];
  const scopedExecutives = workspace?.executives || [];
  const scopedAuditLogs = workspace?.auditLogs || [];
  const hierarchyConfig: HierarchyConfig = workspace?.hierarchyConfig || INITIAL_HIERARCHY_CONFIG;

  const computedMetrics = workspace?.metrics || {
    totalMembers: scopedMembers.length,
    activeMembers: scopedMembers.filter((m) => m.status === 'Active').length,
    pendingMembers: scopedMembers.filter((m) => m.status === 'Pending Verification').length,
    expiredMembers: scopedMembers.filter((m) => m.status === 'Expired').length,
    totalCollectedDues: scopedMembers.reduce((sum, m) => sum + (m.amountPaid ?? (m.duesPaid ? m.duesAmount : 0)), 0),
    paystackVerifiedDues: scopedMembers
      .filter((m) => m.paystackVerified)
      .reduce((sum, m) => sum + (m.amountPaid ?? m.duesAmount ?? 0), 0),
    outstandingDues: scopedMembers.reduce(
      (sum, m) => sum + Math.max(0, (m.duesAmount || 0) - (m.amountPaid ?? (m.duesPaid ? m.duesAmount : 0))),
      0
    ),
  };

  const canManageGovernance =
    isSuperAdmin ||
    Boolean(activeExec.permissions?.canManageExecutives) ||
    Boolean(activeExec.permissions?.canManageHierarchy);
  const canViewAudit = isSuperAdmin || Boolean(activeExec.permissions?.canViewAuditLogs) || execLevel === 'specialized';

  const navItems: { id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }>; badge: string }[] = [
    {
      id: 'overview',
      label: `${execLevel === 'super_admin' ? 'Super Admin' : execLevel.toUpperCase()} Dashboard`,
      icon: LayoutDashboard,
      badge: 'Scoped',
    },
    {
      id: 'registry',
      label: 'Centralized Registry & Dues',
      icon: Users,
      badge: `${scopedMembers.length} Records`,
    },
    {
      id: 'reports',
      label: 'Executive Activity Reports',
      icon: ClipboardCheck,
      badge: `${scopedReports.length} Routed`,
    },
    {
      id: 'announcements',
      label: 'Targeted Communications',
      icon: Megaphone,
      badge: `${scopedAnnouncements.length} Notices`,
    },
    ...(canManageGovernance
      ? [
          {
            id: 'governance' as AdminSection,
            label: 'Exec Accounts & Hierarchy',
            icon: UserCog,
            badge: `${scopedExecutives.length} Execs`,
          },
        ]
      : []),
    {
      id: 'disputes',
      label: 'Legal Aid & Disputes',
      icon: ShieldAlert,
      badge: `${scopedDisputes.filter((d) => d.status !== 'Resolved').length} Open`,
    },
    ...(isTopCouncil
      ? [
          {
            id: 'circulars' as AdminSection,
            label: 'Public Gazette & Circulars',
            icon: FileText,
            badge: `${news.length} Live`,
          },
          {
            id: 'chapters' as AdminSection,
            label: '36 State Chapter Directory',
            icon: Landmark,
            badge: '36 + FCT',
          },
          {
            id: 'academy' as AdminSection,
            label: 'AMMON Academy Oversight',
            icon: Award,
            badge: 'Certified',
          },
        ]
      : []),
    ...(canViewAudit
      ? [
          {
            id: 'security' as AdminSection,
            label: 'Immutable Audit Trail',
            icon: Lock,
            badge: `${scopedAuditLogs.length} Logs`,
          },
        ]
      : []),
  ];

  const handlePublishNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newExcerpt.trim()) return;

    const article: NewsArticle = {
      id: `news-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      excerpt: newExcerpt,
      content: newContent || newExcerpt,
      date: 'Nov 14, 2025',
      author: activeExec.fullName,
      image: '/assets/images/cbn_headquarters_abuja_1794380622253.jpg',
      featured: false,
      readTime: '3 min read',
      attachmentName: attachmentFile?.name,
      attachmentSize: attachmentFile?.size,
      attachmentData: attachmentFile?.data,
    };

    onAddNews(article);
    setNewTitle('');
    setNewExcerpt('');
    setNewContent('');
    setAttachmentFile(null);
    setUploadError('');
    setShowPublishForm(false);
    setCircularSuccess('Official circular published to public gazette.');
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden">
      <div
        className="w-full h-full bg-[#FFFFFF] flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT-JUSTIFIED SIDEBAR */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40 w-72 md:w-80 bg-white border-r border-[#E5E7EB]
            flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-lg md:shadow-none
            ${sidebarOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Top Brand & Executive Profile Header */}
          <div className="p-4 sm:p-5 border-b border-[#E5E7EB] bg-[#14532D] text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 text-[#176B37] shrink-0">
                  <AmmonLogo variant="compact" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm tracking-wider uppercase leading-none truncate">
                    AMMON DIRECTORATE
                  </h3>
                  <p className="text-[10px] text-emerald-200 mt-0.5 truncate">
                    Hierarchical Executive Governance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpenMobile(false)}
                className="md:hidden p-1 text-white hover:bg-white/10 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Officer Profile Card inside Sidebar */}
            <div className="mt-4 pt-3 border-t border-white/15 flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white/40 shadow-xs bg-emerald-950 flex items-center justify-center">
                  <Landmark className="w-6 h-6 text-emerald-300" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#14532D]" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-white truncate leading-tight">
                  {activeExec.fullName}
                </h4>
                <p className="text-[10px] text-emerald-200 truncate mt-0.5">
                  {activeExec.position || activeExec.title}
                </p>
                <p className="text-[10px] text-amber-200 font-semibold truncate mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{activeExec.jurisdiction}</span>
                </p>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[9px] font-mono text-emerald-100 bg-black/25 px-1.5 py-0.5 rounded">
                    {activeExec.badgeNumber}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                      isSuperAdmin ? 'bg-amber-400 text-slate-900' : 'bg-emerald-400 text-slate-900'
                    }`}
                  >
                    {execLevel.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Left-Justified Navigation Menu List */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 text-left">
            <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 text-left">
              Authorized Governance Modules
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpenMobile(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold
                    transition-all duration-150 cursor-pointer group
                    ${
                      isActive
                        ? 'bg-[#176B37] text-white shadow-xs'
                        : 'text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`
                        w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                        ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-600 group-hover:bg-white group-hover:text-[#176B37]'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate text-left">{item.label}</span>
                  </div>

                  <span
                    className={`
                      text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                      ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#EAF3ED] text-[#176B37] group-hover:bg-white'
                      }
                    `}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}

            {/* Left-Justified Identity, PINs & Bill Services Group */}
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
              <span className="px-3 text-[10px] font-bold text-[#176B37] uppercase tracking-wider block mb-1.5 text-left">
                Verification, PINs &amp; Bill Services
              </span>

              {DASHBOARD_SERVICES_MENU.map((service) => {
                const SIcon = service.icon;
                const isActive = activeSection === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => {
                      setActiveSection(service.id);
                      setSidebarOpenMobile(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold
                      transition-all duration-150 cursor-pointer group
                      ${
                        isActive
                          ? 'bg-[#176B37] text-white shadow-xs'
                          : 'text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`
                          w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                          ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-[#EAF3ED]/70 text-[#176B37] group-hover:bg-white'
                          }
                        `}
                      >
                        <SIcon className="w-4 h-4" />
                      </div>
                      <span className="truncate text-left">{service.label}</span>
                    </div>

                    <span
                      className={`
                        text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                        ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-600 group-hover:bg-white group-hover:text-[#176B37]'
                        }
                      `}
                    >
                      {service.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Left-Justified Community Social Space & Online Meetings Group */}
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
              <span className="px-3 text-[10px] font-bold text-[#176B37] uppercase tracking-wider block mb-1.5 text-left">
                Community &amp; Meetings
              </span>

              <button
                onClick={() => {
                  setActiveSection('social-space');
                  setSidebarOpenMobile(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold
                  transition-all duration-150 cursor-pointer group
                  ${
                    activeSection === 'social-space'
                      ? 'bg-[#176B37] text-white shadow-xs'
                      : 'text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`
                      w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                      ${
                        activeSection === 'social-space'
                          ? 'bg-white/20 text-white'
                          : 'bg-[#EAF3ED]/70 text-[#176B37] group-hover:bg-white'
                      }
                    `}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="truncate text-left">AMMON Social Space</span>
                </div>
                <span
                  className={`
                    text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                    ${
                      activeSection === 'social-space'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#EAF3ED] text-[#176B37] group-hover:bg-white'
                    }
                  `}
                >
                  {socialMessages.length} Chat
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('online-meetings');
                  setSidebarOpenMobile(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold
                  transition-all duration-150 cursor-pointer group
                  ${
                    activeSection === 'online-meetings'
                      ? 'bg-[#176B37] text-white shadow-xs'
                      : 'text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`
                      w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                      ${
                        activeSection === 'online-meetings'
                          ? 'bg-white/20 text-white'
                          : 'bg-[#EAF3ED]/70 text-[#176B37] group-hover:bg-white'
                      }
                    `}
                  >
                    <Video className="w-4 h-4" />
                  </div>
                  <span className="truncate text-left">Online Meetings</span>
                </div>
                <span
                  className={`
                    text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                    ${
                      activeSection === 'online-meetings'
                        ? 'bg-white/20 text-white'
                        : meetings.some((m) => m.status === 'Live')
                        ? 'bg-red-100 text-red-700 font-bold'
                        : 'bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  {meetings.filter((m) => m.status === 'Live').length > 0
                    ? `${meetings.filter((m) => m.status === 'Live').length} Live`
                    : `${meetings.length} Rooms`}
                </span>
              </button>
            </div>
          </div>

          {/* Sidebar Bottom Actions */}
          <div className="p-3 border-t border-[#E5E7EB] bg-gray-50/70 space-y-1.5 text-xs">
            <button
              onClick={onClose}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:text-[#176B37] hover:bg-[#EAF3ED] font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#176B37]" />
              <span>Exit to Public Website</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({execLevel.replace('_', ' ')})</span>
              </button>
            )}
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpenMobile && (
          <div
            onClick={() => setSidebarOpenMobile(false)}
            className="md:hidden fixed inset-0 z-30 bg-black/40"
          />
        )}

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF] min-w-0">
          {/* Top Bar */}
          <header className="h-16 px-3 sm:px-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-2 shrink-0 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setSidebarOpenMobile(true)}
                className="md:hidden p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 shrink-0"
                aria-label="Open directorate navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs min-w-0">
                <span className="text-gray-400 font-medium hidden sm:inline shrink-0">
                  {activeExec.jurisdiction}
                </span>
                <span className="text-gray-400 hidden sm:inline shrink-0">/</span>
                <h2 className="text-sm sm:text-base font-bold text-[#252525] truncate">
                  {activeSection === 'social-space'
                    ? 'AMMON Social Space'
                    : activeSection === 'online-meetings'
                    ? 'Online Meetings & Video Rooms'
                    : navItems.find((n) => n.id === activeSection)?.label ||
                      DASHBOARD_SERVICES_MENU.find((s) => s.id === activeSection)?.label}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                  isSuperAdmin
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
              >
                {execLevel.toUpperCase().replace('_', ' ')}
              </span>

              <button
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Exit Dashboard"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Scrollable Viewport */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F9FBFA]/60 min-w-0">
            <div
              className={`${
                activeSection === 'social-space' || activeSection === 'online-meetings'
                  ? 'max-w-6xl'
                  : 'max-w-5xl'
              } mx-auto space-y-6 min-w-0`}
            >
              {workspaceLoading && (
                <div className="p-3 rounded-xl bg-[#EAF3ED] border border-[#176B37]/30 text-xs text-[#14532D] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#176B37]" />
                  <span>Syncing jurisdiction-scoped workspace from AMMON backend...</span>
                </div>
              )}

              {workspaceError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{workspaceError}</span>
                </div>
              )}

              {/* 1. LEVEL-SPECIFIC SCOPED EXECUTIVE OVERVIEW */}
              {activeSection === 'overview' && (
                <ExecutiveKpiOverview
                  executive={activeExec}
                  hierarchyConfig={hierarchyConfig}
                  members={scopedMembers}
                  reports={scopedReports}
                  announcements={scopedAnnouncements}
                  disputes={scopedDisputes}
                  metrics={computedMetrics}
                  onFilterWorkspace={async (filters) => {
                    setGeoFilters(filters);
                    await loadWorkspace(filters);
                  }}
                  onNavigateSection={(sec) => setActiveSection(sec as AdminSection)}
                  onSecurityAuditRefresh={() => loadWorkspace()}
                />
              )}

              {/* 2. CENTRALIZED MEMBERSHIP & DUES TRACKING LEDGER */}
              {activeSection === 'registry' && (
                <CentralizedMembershipLedger
                  executive={activeExec}
                  hierarchyConfig={hierarchyConfig}
                  members={scopedMembers}
                  financialAdjustments={scopedAdjustments}
                  onSelectMember={onSelectMember}
                  onRefreshWorkspace={() => loadWorkspace()}
                />
              )}

              {/* 3. EXECUTIVE ACTIVITY REPORTS */}
              {activeSection === 'reports' && (
                <ExecutiveReportsWorkspace
                  executive={activeExec}
                  reports={scopedReports}
                  onRefreshWorkspace={() => loadWorkspace()}
                />
              )}

              {/* 4. TARGETED EXECUTIVE COMMUNICATIONS */}
              {activeSection === 'announcements' && (
                <ExecutiveAnnouncementsWorkspace
                  executive={activeExec}
                  hierarchyConfig={hierarchyConfig}
                  announcements={scopedAnnouncements}
                  onRefreshWorkspace={() => loadWorkspace()}
                />
              )}

              {/* 5. SUPER ADMIN ACCOUNT PROVISIONING & HIERARCHY CONFIGURATION */}
              {activeSection === 'governance' && canManageGovernance && (
                <SuperAdminGovernanceWorkspace
                  executive={activeExec}
                  executives={scopedExecutives}
                  hierarchyConfig={hierarchyConfig}
                  onRefreshWorkspace={() => loadWorkspace()}
                />
              )}

              {/* 6. PUBLIC CIRCULARS & GAZETTE */}
              {activeSection === 'circulars' && isTopCouncil && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-base text-[#252525]">
                          Regulatory Gazette &amp; Public Circulars
                        </h3>
                        <p className="text-xs text-gray-500">
                          Publish official national directives to all operators and public portal
                        </p>
                      </div>

                      {!showPublishForm && (
                        <button
                          onClick={() => setShowPublishForm(true)}
                          className="px-4 py-2 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Publish New Circular</span>
                        </button>
                      )}
                    </div>

                    {circularSuccess && (
                      <div className="p-3 rounded-xl bg-[#EAF3ED] border border-[#176B37]/30 text-xs text-[#14532D] font-medium">
                        {circularSuccess}
                      </div>
                    )}

                    {showPublishForm && (
                      <form
                        onSubmit={handlePublishNews}
                        className="bg-gray-50 p-5 rounded-2xl border border-[#E5E7EB] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#176B37]">
                            Create Official National Circular
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowPublishForm(false)}
                            className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Circular Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="e.g., Mandatory POS Display of Approved 2025 Tariff Table..."
                            className="w-full text-xs p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Gazette Classification
                            </label>
                            <select
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value as any)}
                              className="w-full text-xs p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                            >
                              <option value="Regulatory">Regulatory Mandate</option>
                              <option value="Breaking News">Breaking News</option>
                              <option value="Press Release">Press Release</option>
                              <option value="Notice">Notice</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Summary / Gazette Excerpt *
                            </label>
                            <input
                              type="text"
                              required
                              value={newExcerpt}
                              onChange={(e) => setNewExcerpt(e.target.value)}
                              placeholder="Brief summary for mobile notifications..."
                              className="w-full text-xs p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Complete Legal Text &amp; Directives *
                          </label>
                          <textarea
                            rows={4}
                            required
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="Full text of circular, section references, and enforcement dates..."
                            className="w-full text-xs p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Official Document / Gazette Annexure (Upload from Device)
                          </label>

                          {!attachmentFile ? (
                            <label className="border-2 border-dashed border-gray-300 hover:border-[#176B37] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white transition-colors group">
                              <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#176B37] transition-colors" />
                              <span className="text-xs font-semibold text-gray-700 group-hover:text-[#176B37]">
                                Click to select file from your device
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div className="p-3 bg-white rounded-xl border border-[#176B37]/40 flex items-center justify-between shadow-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-[#EAF3ED] text-[#176B37] flex items-center justify-center shrink-0">
                                  <Paperclip className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {attachmentFile.name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-medium">
                                    {attachmentFile.size} • Ready to publish
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAttachmentFile(null)}
                                className="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          )}

                          {uploadError && (
                            <p className="text-[10px] text-red-600 mt-1 font-medium">{uploadError}</p>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPublishForm(false);
                              setAttachmentFile(null);
                              setUploadError('');
                            }}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 text-xs font-semibold bg-[#176B37] hover:bg-[#14532D] text-white rounded-xl transition-colors cursor-pointer"
                          >
                            Publish Circular Immediately
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {news.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl border border-[#E5E7EB] bg-white flex items-start justify-between gap-4"
                        >
                          <div className="flex gap-3 min-w-0">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-20 h-16 rounded-lg object-cover shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  '/assets/images/cbn_headquarters_abuja_1794380622253.jpg';
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EAF3ED] text-[#176B37] px-2 py-0.5 rounded-full">
                                  {item.category}
                                </span>
                                <span className="text-[10px] text-gray-400">{item.date}</span>
                              </div>
                              <h4 className="text-xs font-bold text-[#252525] mt-1">{item.title}</h4>
                              <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                {item.excerpt}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-emerald-600 font-semibold shrink-0">
                            Live Nationwide
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 7. SCOPED DISPUTE & HARASSMENT DESK */}
              {activeSection === 'disputes' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">
                        Jurisdictional Legal Defense Taskforce
                      </h3>
                      <p className="text-xs text-gray-500">
                        Operator grievance tickets scoped to {activeExec.jurisdiction}
                      </p>
                    </div>

                    {scopedDisputes.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                        No active dispute tickets recorded within {activeExec.jurisdiction}.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scopedDisputes.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#176B37]">
                                  {ticket.ticketNumber}
                                </span>
                                <span className="text-xs font-bold text-[#252525]">
                                  {ticket.agentName} ({ticket.businessName})
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  ticket.status === 'Resolved'
                                    ? 'bg-emerald-50 text-[#176B37]'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {ticket.status}
                              </span>
                            </div>

                            <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                              <p className="font-semibold text-gray-800 mb-0.5">
                                Issue: {ticket.issueType} ({ticket.state} State)
                              </p>
                              <p>{ticket.description}</p>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                              <span>
                                Reported: {ticket.dateReported} · Phone: {ticket.phone}
                              </span>
                              {ticket.status !== 'Resolved' ? (
                                <button
                                  onClick={() => onResolveDispute(ticket.id)}
                                  className="text-xs font-bold text-[#176B37] hover:underline cursor-pointer"
                                >
                                  Mark as Resolved via Legal Intervention →
                                </button>
                              ) : (
                                <span className="text-emerald-700 font-semibold">
                                  Resolved via State Legal Officer
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 8. 36 STATE CHAPTER DIRECTORY */}
              {activeSection === 'chapters' && isTopCouncil && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">Federation Chapter Directory</h3>
                      <p className="text-xs text-gray-500">
                        Autonomous leadership councils across Nigeria&apos;s 36 states and FCT
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {NIGERIAN_STATES.map((stateName, index) => (
                        <div
                          key={stateName}
                          className="p-3.5 rounded-xl border border-[#E5E7EB] bg-gray-50/50 hover:bg-[#EAF3ED]/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-xs text-[#252525]">{stateName} State</h5>
                            <span className="text-[10px] font-mono text-[#176B37] font-semibold">
                              Active
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Chapter Secretariat: {stateName} City Central
                          </p>
                          <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-500">
                            <span>Agents: ~{(1200 + index * 340).toLocaleString()}</span>
                            <span className="text-[#176B37] font-semibold">Exco Vetted</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 9. AMMON ACADEMY OVERSIGHT */}
              {activeSection === 'academy' && isTopCouncil && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">
                        Academy Curriculum Oversight
                      </h3>
                      <p className="text-xs text-gray-500">
                        Accreditation metrics for cyber-safety and anti-fraud courses
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#EAF3ED] rounded-xl border border-[#176B37]/30">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          Graduated Operators
                        </span>
                        <div className="text-2xl font-black text-[#176B37] font-mono mt-1">54,120</div>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          Certificates Issued &amp; Verifiable Online
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border border-[#E5E7EB]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          Fraud Incident Drop
                        </span>
                        <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                          -78.4%
                        </div>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          Post-Masterclass terminal chargebacks
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 10. IMMUTABLE AUDIT TRAIL */}
              {activeSection === 'security' && canViewAudit && (
                <AuditTrailWorkspace executive={activeExec} auditLogs={scopedAuditLogs} />
              )}

              {/* 11. DIGITAL VERIFICATION, ATTESTATION, PINS & BILL PAYMENT SERVICES */}
              {DASHBOARD_SERVICES_MENU.some((s) => s.id === activeSection) && (
                <DashboardServicesWorkspace
                  activeService={activeSection as ServiceSectionId}
                  operatorName={activeExec.fullName}
                  operatorId={activeExec.badgeNumber}
                  businessOrTitle={activeExec.position || activeExec.title}
                  stateLocation={activeExec.assignedState || 'Lagos'}
                  roleLabel={activeExec.role}
                  onSelectService={(id) => setActiveSection(id)}
                />
              )}

              {/* 12. AMMON SOCIAL SPACE & ONLINE MEETINGS */}
              {(activeSection === 'social-space' || activeSection === 'online-meetings') && (
                <div className="animate-in fade-in duration-150 min-w-0">
                  <SocialSpaceWorkspace
                    currentUser={{
                      id: activeExec.id,
                      name: activeExec.fullName,
                      role: `${activeExec.role} (${activeExec.jurisdiction})`,
                      badge: activeExec.badgeNumber,
                      avatar: activeExec.avatarUrl,
                    }}
                    members={scopedMembers}
                    messages={socialMessages}
                    meetings={meetings}
                    onSendMessage={onSendMessage}
                    onUpdateMessage={onUpdateMessage}
                    onCreateMeeting={onCreateMeeting}
                    onUpdateMeeting={onUpdateMeeting}
                    initialTab={activeSection === 'online-meetings' ? 'meetings' : 'chat'}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
