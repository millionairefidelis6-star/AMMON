import React, { useState } from 'react';
import { 
  X, 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShieldAlert, 
  DollarSign, 
  Landmark, 
  Award, 
  Lock, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  LogOut, 
  Menu, 
  Check, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building,
  MapPin,
  Sparkles,
  BarChart3,
  Upload,
  Paperclip,
  FileCheck
} from 'lucide-react';
import { Member, NewsArticle, DisputeTicket, AdminUser } from '../types';
import { NIGERIAN_STATES, ADMIN_USERS } from '../data/mockData';
import { AmmonLogo } from './AmmonLogo';

export type AdminSection = 
  | 'overview'
  | 'registry'
  | 'circulars'
  | 'disputes'
  | 'finance'
  | 'chapters'
  | 'academy'
  | 'security';

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
  onApproveMember?: (id: string) => void;
  onSuspendMember?: (id: string) => void;
  onLogout?: () => void;
  onSwitchAdmin?: (admin: AdminUser) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  adminUser = {
    id: 'admin-super',
    fullName: 'Dr. Victor O. Babatunde',
    role: 'Super Admin',
    title: 'National President & Registrar-General',
    email: 'superadmin@ammon.ng',
    phone: '+234 800 266 6661',
    jurisdiction: 'National Headquarters (36 States + FCT)',
    badgeNumber: 'AMMON-HQ-001',
  },
  members,
  news,
  disputes,
  isOpen,
  onClose,
  onAddNews,
  onResolveDispute,
  onSelectMember,
  onApproveMember,
  onSuspendMember,
  onLogout,
  onSwitchAdmin,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  // Search & Filters for Registry
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Announcement publisher state
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Regulatory' | 'Breaking News' | 'Press Release' | 'Notice'>('Regulatory');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newContent, setNewContent] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<{
    name: string;
    size: string;
    data: string;
    type: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState('');

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
      const sizeFormatted = file.size > 1024 * 1024 
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

  const isSuperAdmin = adminUser.role === 'Super Admin';

  // Navigation Items (Left-Justified with icons)
  const navItems = [
    {
      id: 'overview' as AdminSection,
      label: 'National Executive Overview',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      id: 'registry' as AdminSection,
      label: 'Operator Registry & KYC',
      icon: Users,
      badge: `${members.length} Total`,
    },
    {
      id: 'circulars' as AdminSection,
      label: 'Publish Circulars & Gazette',
      icon: FileText,
      badge: `${news.length} Live`,
    },
    {
      id: 'disputes' as AdminSection,
      label: 'National Legal Aid Desk',
      icon: ShieldAlert,
      badge: `${disputes.filter(d => d.status === 'Open').length} Open`,
    },
    {
      id: 'finance' as AdminSection,
      label: 'Paystack Treasury & Dues',
      icon: DollarSign,
      badge: '₦326.4M',
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
    ...(isSuperAdmin ? [
      {
        id: 'security' as AdminSection,
        label: 'System Audit Logs & Access',
        icon: Lock,
        badge: 'Root',
      }
    ] : []),
  ];

  const filteredMembers = members.filter((m) => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.membershipId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.terminalSerialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = stateFilter === 'All' || m.state === stateFilter;
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchesSearch && matchesState && matchesStatus;
  });

  const handlePublishNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newExcerpt.trim()) return;

    const article: NewsArticle = {
      id: `news-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      excerpt: newExcerpt,
      content: newContent || newExcerpt,
      date: 'Nov 11, 2025',
      author: adminUser.fullName,
      image: '/src/assets/images/cbn_headquarters_abuja_1794380622253.jpg',
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
    alert('Official circular with attached device document published to national registry!');
  };

  const handleExportCsv = () => {
    const headers = ['Membership ID', 'Full Name', 'Business Name', 'State', 'LGA', 'Category', 'Terminal S/N', 'Provider', 'Status', 'Dues Paid'];
    const rows = filteredMembers.map(m => [
      m.membershipId,
      `"${m.fullName}"`,
      `"${m.businessName}"`,
      m.state,
      m.lga,
      m.category,
      m.terminalSerialNumber,
      m.terminalProvider,
      m.status,
      m.duesPaid ? 'YES' : 'NO'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AMMON_National_Registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden">
      
      {/* Full-View Directorate Dashboard Container */}
      <div 
        className="w-full h-full bg-[#FFFFFF] flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ======================================================== */}
        {/* LEFT-JUSTIFIED SIDEBAR                                  */}
        {/* ======================================================== */}
        <aside 
          className={`
            fixed md:static inset-y-0 left-0 z-40 w-72 md:w-80 bg-white border-r border-[#E5E7EB] 
            flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-lg md:shadow-none
            ${sidebarOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Top Brand & Officer Header */}
          <div className="p-4 sm:p-5 border-b border-[#E5E7EB] bg-[#14532D] text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 text-[#176B37]">
                  <AmmonLogo variant="compact" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-wider uppercase leading-none">AMMON DIRECTORATE</h3>
                  <p className="text-[10px] text-emerald-200 mt-0.5">National Executive & Registry Council</p>
                </div>
              </div>
              <button 
                onClick={() => setSidebarOpenMobile(false)}
                className="md:hidden p-1 text-white hover:bg-white/10 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Officer Profile Card inside Sidebar */}
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white/40 shadow-xs bg-emerald-950 flex items-center justify-center">
                  <Landmark className="w-6 h-6 text-emerald-300" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#14532D]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-white truncate leading-tight">
                    {adminUser.fullName}
                  </h4>
                </div>
                <p className="text-[10px] text-emerald-200 truncate mt-0.5">
                  {adminUser.title}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] font-mono text-emerald-100 bg-black/20 px-1.5 py-0.5 rounded">
                    {adminUser.badgeNumber}
                  </span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                    isSuperAdmin ? 'bg-amber-400 text-slate-900' : 'bg-emerald-400 text-slate-900'
                  }`}>
                    {adminUser.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Left-Justified Navigation Menu List */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              National Administrative Council
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
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold
                    transition-all duration-150 cursor-pointer group
                    ${isActive 
                      ? 'bg-[#176B37] text-white shadow-xs' 
                      : 'text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]'}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`
                      w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                      ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-white group-hover:text-[#176B37]'}
                    `}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>

                  <span className={`
                    text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                    ${isActive ? 'bg-white/20 text-white' : 'bg-[#EAF3ED] text-[#176B37] group-hover:bg-white'}
                  `}>
                    {item.badge}
                  </span>
                </button>
              );
            })}
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
                <span>Sign Out ({adminUser.role})</span>
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

        {/* ======================================================== */}
        {/* MAIN CONTENT AREA (Right of Left-Justified Sidebar)      */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF]">
          
          {/* Top Bar */}
          <header className="h-16 px-4 sm:px-8 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpenMobile(true)}
                className="md:hidden p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                aria-label="Open directorate navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-medium hidden sm:inline">AMMON Directorate</span>
                <span className="text-gray-400 hidden sm:inline">/</span>
                <h2 className="text-sm sm:text-base font-bold text-[#252525]">
                  {navItems.find((n) => n.id === activeSection)?.label}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Persona Switcher for Testing */}
              {onSwitchAdmin && (
                <button
                  onClick={() => {
                    const targetOfficer = isSuperAdmin ? ADMIN_USERS[1] : ADMIN_USERS[0];
                    onSwitchAdmin(targetOfficer);
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EAF3ED] text-[#176B37] hover:bg-[#176B37] hover:text-white transition-colors cursor-pointer border border-[#176B37]/30"
                  title="Switch between Super Admin and Executive roles"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {isSuperAdmin ? 'Switch to Executive (Alhaji Babaginda)' : 'Switch to Super Admin (Dr. Victor)'}
                  </span>
                </button>
              )}

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                isSuperAdmin 
                  ? 'bg-amber-50 text-amber-900 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              }`}>
                {adminUser.role} Session
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
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F9FBFA]/60">
            <div className="max-w-5xl mx-auto space-y-6">

              {/* 1. NATIONAL EXECUTIVE OVERVIEW */}
              {activeSection === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  
                  {/* Executive Header Banner */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#176B37] font-bold text-[10px] uppercase">
                          {adminUser.jurisdiction}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">REF: {adminUser.badgeNumber}</span>
                      </div>
                      <h3 className="text-xl font-bold text-[#252525] mt-1">
                        National Agent Banking Status Report
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Central Bank of Nigeria & NIBSS Operational Alignment Dashboard
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveSection('registry')}
                        className="px-4 py-2 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Inspect Registry</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Big Directorate KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Certified POS Operators
                      </span>
                      <div className="text-2xl font-black text-[#176B37] font-mono mt-1">
                        148,250
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Across all 774 LGAs</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        State Chapters Active
                      </span>
                      <div className="text-2xl font-black text-[#252525] font-mono mt-1">
                        36 States + FCT
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">100% Nationwide Presence</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Paystack Dues Collected
                      </span>
                      <div className="text-2xl font-black text-[#176B37] font-mono mt-1">
                        ₦326.4M
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Audited & Reconciled</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Active Dispute Tickets
                      </span>
                      <div className="text-2xl font-black text-amber-600 font-mono mt-1">
                        {disputes.filter(d => d.status === 'Open').length} Cases
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">Legal Taskforce Deployed</span>
                    </div>
                  </div>

                  {/* State Distribution Density Strip */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Regional Operator Deployment Density (Top Chapters)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { state: 'Lagos Chapter', agents: '42,180', share: '28.5%' },
                        { state: 'Kano Chapter', agents: '21,450', share: '14.5%' },
                        { state: 'Rivers Chapter', agents: '16,220', share: '10.9%' },
                        { state: 'FCT Abuja', agents: '14,800', share: '10.0%' },
                        { state: 'Oyo Chapter', agents: '12,940', share: '8.7%' },
                        { state: 'Kaduna Chapter', agents: '10,120', share: '6.8%' },
                      ].map((s) => (
                        <div key={s.state} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <p className="font-bold text-xs text-[#252525] truncate">{s.state}</p>
                          <p className="text-sm font-mono font-black text-[#176B37] mt-0.5">{s.agents}</p>
                          <p className="text-[10px] text-gray-400">{s.share} national share</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Executive Alerts */}
                  <div className="bg-[#EAF3ED] p-5 rounded-2xl border border-[#176B37]/30 space-y-2">
                    <div className="flex items-center gap-2 text-[#14532D]">
                      <ShieldCheck className="w-5 h-5 text-[#176B37]" />
                      <h4 className="font-bold text-sm">Regulatory Alignment Directive</h4>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      All state chapters are instructed to enforce the newly published 2025 Tariff Board counter posters 
                      at every neighborhood kiosk to prevent consumer price gouging.
                    </p>
                  </div>

                </div>
              )}

              {/* 2. OPERATOR REGISTRY & KYC */}
              {activeSection === 'registry' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
                      <div>
                        <h3 className="font-bold text-base text-[#252525]">National Operators Registry</h3>
                        <p className="text-xs text-gray-500">Live directory of all certified mobile money agents</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportCsv}
                          className="px-3.5 py-1.5 border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Registry (CSV)</span>
                        </button>
                      </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search operator, business, ID, or POS serial..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-gray-50/50 focus:outline-hidden focus:border-[#176B37]"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <select
                          value={stateFilter}
                          onChange={(e) => setStateFilter(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-xs text-gray-700 focus:outline-hidden focus:border-[#176B37]"
                        >
                          <option value="All">All States (36 + FCT)</option>
                          {NIGERIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl border border-[#E5E7EB] bg-white text-xs text-gray-700 focus:outline-hidden focus:border-[#176B37]"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Active">Active</option>
                          <option value="Pending Verification">Pending Verification</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-[#E5E7EB] overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead className="bg-[#EAF3ED]/60 text-gray-700 font-bold border-b border-[#E5E7EB]">
                          <tr>
                            <th className="py-3 px-4">Operator / Business</th>
                            <th className="py-3 px-4">Membership ID</th>
                            <th className="py-3 px-4">State & LGA</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Terminal S/N</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#252525]">{m.fullName}</div>
                                <div className="text-[11px] text-gray-500">{m.businessName}</div>
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-[#176B37]">
                                {m.membershipId}
                              </td>
                              <td className="py-3 px-4">
                                <div>{m.state}</div>
                                <div className="text-[11px] text-gray-400">{m.lga}</div>
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-600">
                                {m.category}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                                {m.terminalSerialNumber}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  m.status === 'Active' 
                                    ? 'bg-emerald-50 text-[#176B37] border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{m.status}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right space-x-2">
                                <button
                                  onClick={() => onSelectMember(m)}
                                  className="text-xs font-semibold text-[#176B37] hover:underline cursor-pointer"
                                >
                                  View ID
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                </div>
              )}

              {/* 3. PUBLISH CIRCULARS & GAZETTE */}
              {activeSection === 'circulars' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-base text-[#252525]">Regulatory Gazette & Circulars</h3>
                        <p className="text-xs text-gray-500">Publish directives directly to all 148,000 operators and public website</p>
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

                    {showPublishForm && (
                      <form onSubmit={handlePublishNews} className="bg-gray-50 p-5 rounded-2xl border border-[#E5E7EB] space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#176B37]">
                            Create Official National Circular
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowPublishForm(false)}
                            className="text-xs text-gray-400 hover:text-gray-700"
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

                        <div className="grid grid-cols-2 gap-3">
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
                            Complete Legal Text & Directives *
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

                        {/* File Upload from Device */}
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
                              <span className="text-[10px] text-gray-400">
                                PDF, PNG, JPG, or DOCX up to 10MB (Official Gazette, Circular Stamp, or Enforcement Memo)
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
                                  <p className="text-xs font-bold text-gray-900 truncate">{attachmentFile.name}</p>
                                  <p className="text-[10px] text-gray-400 font-medium">
                                    {attachmentFile.size} • Attached from device ready to publish
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

                    {/* Circulars List */}
                    <div className="space-y-3">
                      {news.map((item) => (
                        <div key={item.id} className="p-4 rounded-xl border border-[#E5E7EB] bg-white flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-20 h-16 rounded-lg object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EAF3ED] text-[#176B37] px-2 py-0.5 rounded-full">
                                  {item.category}
                                </span>
                                <span className="text-[10px] text-gray-400">{item.date}</span>
                              </div>
                              <h4 className="text-xs font-bold text-[#252525] mt-1">{item.title}</h4>
                              <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{item.excerpt}</p>
                              {item.attachmentName && (
                                <div className="mt-2 flex items-center gap-2">
                                  <a
                                    href={item.attachmentData || '#'}
                                    download={item.attachmentName}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EAF3ED] border border-[#176B37]/30 text-[#176B37] text-[10px] font-semibold hover:bg-[#176B37] hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>Annexure: {item.attachmentName}</span>
                                    {item.attachmentSize && <span className="opacity-75">({item.attachmentSize})</span>}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-emerald-600 font-semibold shrink-0">Live Nationwide</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DISPUTE & HARASSMENT DESK */}
              {activeSection === 'disputes' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">National Legal Defense Taskforce</h3>
                      <p className="text-xs text-gray-500">Live operator grievance tickets against illegal LGA taxes and police harassment</p>
                    </div>

                    <div className="space-y-3">
                      {disputes.map((ticket) => (
                        <div key={ticket.id} className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#176B37]">
                                {ticket.ticketNumber}
                              </span>
                              <span className="text-xs font-bold text-[#252525]">
                                {ticket.agentName} ({ticket.businessName})
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ticket.status === 'Resolved' 
                                ? 'bg-emerald-50 text-[#176B37]' 
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>

                          <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            <p className="font-semibold text-gray-800 mb-0.5">Issue: {ticket.issueType} ({ticket.state} State)</p>
                            <p>{ticket.description}</p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                            <span>Reported: {ticket.dateReported} · Phone: {ticket.phone}</span>
                            {ticket.status !== 'Resolved' ? (
                              <button
                                onClick={() => onResolveDispute(ticket.id)}
                                className="text-xs font-bold text-[#176B37] hover:underline cursor-pointer"
                              >
                                Mark as Resolved via Legal Intervention →
                              </button>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Resolved via State Legal Officer</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. PAYSTACK TREASURY & DUES AUDIT */}
              {activeSection === 'finance' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-5">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">National Dues & Paystack Treasury Audit</h3>
                      <p className="text-xs text-gray-500">Real-time settlement telemetry across all 36 state chapters</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-[#EAF3ED] rounded-xl border border-[#176B37]/30">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Gross Dues Processed</span>
                        <div className="text-2xl font-black text-[#176B37] font-mono mt-1">₦326,450,000</div>
                        <p className="text-[10px] text-gray-500 mt-0.5">Paystack 2025/2026 Fiscal Cycle</p>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-[#E5E7EB]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">State Chapter Allocation</span>
                        <div className="text-2xl font-black text-gray-800 font-mono mt-1">₦195,870,000</div>
                        <p className="text-[10px] text-gray-500 mt-0.5">60% Chapter Operational Share</p>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-[#E5E7EB]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Legal Defense Reserve</span>
                        <div className="text-2xl font-black text-blue-800 font-mono mt-1">₦65,290,000</div>
                        <p className="text-[10px] text-gray-500 mt-0.5">20% Rapid Injunction Escrow</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. 36 STATE CHAPTER DIRECTORY */}
              {activeSection === 'chapters' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">Federation Chapter Directory</h3>
                      <p className="text-xs text-gray-500">Autonomous leadership councils across Nigeria&apos;s 36 states and FCT</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {NIGERIAN_STATES.map((stateName, index) => (
                        <div key={stateName} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-gray-50/50 hover:bg-[#EAF3ED]/40 transition-colors">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-xs text-[#252525]">{stateName} State</h5>
                            <span className="text-[10px] font-mono text-[#176B37] font-semibold">Active</span>
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

              {/* 7. AMMON ACADEMY OVERSIGHT */}
              {activeSection === 'academy' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">Academy Curriculum Oversight</h3>
                      <p className="text-xs text-gray-500">Accreditation metrics for cyber-safety and anti-fraud courses</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#EAF3ED] rounded-xl border border-[#176B37]/30">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Graduated Operators</span>
                        <div className="text-2xl font-black text-[#176B37] font-mono mt-1">54,120</div>
                        <p className="text-[10px] text-gray-600 mt-0.5">Certificates Issued & Verifiable Online</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border border-[#E5E7EB]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Fraud Incident Drop</span>
                        <div className="text-2xl font-black text-emerald-700 font-mono mt-1">-78.4%</div>
                        <p className="text-[10px] text-gray-600 mt-0.5">Post-Masterclass terminal chargebacks</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 8. SYSTEM AUDIT LOGS (Super Admin Root Only) */}
              {activeSection === 'security' && isSuperAdmin && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-base text-red-950 flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-red-700" />
                          <span>Super Admin Root Security Logs</span>
                        </h3>
                        <p className="text-xs text-gray-500">Immutable authentication and terminal switch sync logs</p>
                      </div>
                      <span className="text-[10px] bg-red-50 text-red-700 font-mono font-bold px-2 py-0.5 rounded">
                        ENCRYPTED AUDIT
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100 font-mono text-[11px]">
                      <div className="py-2.5 flex items-center justify-between text-gray-700">
                        <span>[AUTH] Dr. Victor O. Babatunde authenticated via Super Admin Console</span>
                        <span className="text-gray-400">2 mins ago</span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between text-gray-700">
                        <span>[NIBSS_SYNC] Central Switch heartbeat acknowledged: 148,250 terminals active</span>
                        <span className="text-gray-400">14 mins ago</span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between text-gray-700">
                        <span>[PAYSTACK_WEBHOOK] ₦15,000 annual dues settled ref PSTK-AMMON-2025-08492</span>
                        <span className="text-gray-400">1 hour ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>

      </div>
    </div>
  );
};
