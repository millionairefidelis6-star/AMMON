import React, { useState } from "react";
import {
  X,
  LayoutDashboard,
  CreditCard,
  Smartphone,
  Receipt,
  Scale,
  GraduationCap,
  LifeBuoy,
  LogOut,
  ArrowLeft,
  Download,
  Printer,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Menu,
  Award,
  ChevronRight,
  MessageSquare,
  Video,
  Camera,
  Loader2
} from "lucide-react";
import { QRCodeSvg } from "./QRCodeSvg";
import { AmmonLogo } from "./AmmonLogo";
import {
  DASHBOARD_SERVICES_MENU,
  DashboardServicesWorkspace
} from "./DashboardServicesWorkspace";
import { SocialSpaceWorkspace } from "./SocialSpaceWorkspace";
import { processProfileAvatar } from "../utils/imageProcessor";
import { uploadProfileAvatarAsset } from "../services/storageService";
import {
  downloadDigitalCardPng,
  printDigitalCardDocument,
  downloadKioskTariffPoster,
  downloadPaymentReceipt,
  downloadCourtInjunction,
  downloadAcademyCertificate
} from "../utils/documentGenerators";
const MemberPortalModal = ({
  member,
  members = [],
  isOpen,
  onClose,
  onLogout,
  initialSection = "overview",
  socialMessages = [],
  meetings = [],
  onSendMessage = () => {
  },
  onUpdateMessage = () => {
  },
  onCreateMeeting = () => {
  },
  onUpdateMeeting = () => {
  },
  onUpdateProfilePhoto
}) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  React.useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [completedAcademyCourses, setCompletedAcademyCourses] = useState([1, 2]);
  const [disputeIssue, setDisputeIssue] = useState("Illegal LGA Levy");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);
  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    setAvatarNotice("");
    setIsUploadingAvatar(true);
    try {
      const processed = await processProfileAvatar(file);
      const uploaded = await uploadProfileAvatarAsset({
        blob: processed.blob,
        userId: member.id,
        fileName: `${member.membershipId}_avatar.jpg`,
        dataUrl: processed.dataUrl
      });
      await onUpdateProfilePhoto?.(uploaded.url, uploaded.storagePath);
      setAvatarNotice("Profile & chat display photo updated.");
      setTimeout(() => setAvatarNotice(""), 4e3);
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Unable to upload profile photo. Please try a JPG or PNG image."
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };
  if (!isOpen) return null;
  const handleCopyId = () => {
    navigator.clipboard.writeText(member.membershipId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2e3);
  };
  const handleDownloadCard = async () => {
    setIsDownloadingCard(true);
    try {
      await downloadDigitalCardPng(member);
    } finally {
      setIsDownloadingCard(false);
    }
  };
  const toggleCourse = (id) => {
    if (completedAcademyCourses.includes(id)) {
      setCompletedAcademyCourses(completedAcademyCourses.filter((c) => c !== id));
    } else {
      setCompletedAcademyCourses([...completedAcademyCourses, id]);
    }
  };
  const navItems = [
    {
      id: "overview",
      label: "Overview & Statistics",
      icon: LayoutDashboard,
      badge: "Active"
    },
    {
      id: "id-card",
      label: "My Digital ID Card",
      icon: CreditCard,
      badge: "Verified"
    },
    {
      id: "fleet",
      label: "Registered POS Fleet",
      icon: Smartphone,
      badge: "2 Terminals"
    },
    {
      id: "dues",
      label: "Annual Dues & Receipts",
      icon: Receipt,
      badge: "Settled"
    },
    {
      id: "legal",
      label: "Legal Aid & Certificates",
      icon: Scale,
      badge: "Exempt"
    },
    {
      id: "academy",
      label: "AMMON Academy Training",
      icon: GraduationCap,
      badge: "Cert Active"
    },
    {
      id: "disputes",
      label: "Complaints & Support Desk",
      icon: LifeBuoy,
      badge: "24/7 Aid"
    }
  ];
  const volume = member.category === "Super Agents" ? "₦18,400,000" : member.category === "Fintech Companies" ? "₦94,200,000" : member.id === "mem-3" ? "₦3,120,000" : member.id === "mem-4" ? "₦5,640,000" : "₦4,850,000";
  const txCount = member.category === "Super Agents" ? "1,420" : member.category === "Fintech Companies" ? "8,950" : member.id === "mem-3" ? "215" : member.id === "mem-4" ? "410" : "342";
  return <div className="fixed inset-0 h-dvh z-50 flex bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden">
      
      {
    /* Full-view Portal Container */
  }
      <div
    className="w-full h-full bg-[#FFFFFF] flex flex-col md:flex-row overflow-hidden shadow-2xl relative min-h-0"
    onClick={(e) => e.stopPropagation()}
  >
        
        {
    /* ======================================================== */
  }
        {
    /* LEFT-JUSTIFIED SIDEBAR                                  */
  }
        {
    /* ======================================================== */
  }
        <aside
    className={`
            fixed md:static inset-y-0 left-0 z-40 w-72 md:w-80 bg-white border-r border-[#E5E7EB] 
            flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-lg md:shadow-none
            ${sidebarOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
  >
          {
    /* Top Brand Header */
  }
          <div className="p-4 sm:p-5 border-b border-[#E5E7EB] bg-[#14532D] text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 text-[#176B37]">
                  <AmmonLogo variant="compact" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-wider uppercase leading-none">AMMON PORTAL</h3>
                  <p className="text-[10px] text-emerald-200 mt-0.5">Operator Self-Service Directorate</p>
                </div>
              </div>
              <button
    onClick={() => setSidebarOpenMobile(false)}
    className="md:hidden p-1 text-white hover:bg-white/10 rounded"
  >
                <X className="w-5 h-5" />
              </button>
            </div>

            {
    /* Member Profile Card inside Sidebar */
  }
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-3">
              <label
    className="relative shrink-0 cursor-pointer group"
    title="Upload profile photo for dashboard & chat rooms"
  >
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/40 shadow-xs bg-emerald-950 relative">
                  <img
    src={member.photoUrl || "/assets/images/ammon_hero_pos_agent_1794380620175.jpg"}
    alt={member.fullName}
    onError={(e) => {
      e.currentTarget.src = "/assets/images/ammon_hero_pos_agent_1794380620175.jpg";
    }}
    className="w-full h-full object-cover object-top"
    referrerPolicy="no-referrer"
  />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {isUploadingAvatar ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-[#176B37] border border-[#14532D] flex items-center justify-center shadow-xs">
                  {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </span>
                <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleProfilePhotoChange}
    disabled={isUploadingAvatar}
    className="hidden"
  />
              </label>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-white truncate leading-tight">
                    {member.fullName}
                  </h4>
                </div>
                <p className="text-[10px] text-emerald-200 truncate mt-0.5">
                  {member.businessName}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] font-mono text-emerald-100 bg-black/20 px-1.5 py-0.5 rounded">
                    {member.membershipId}
                  </span>
                  <span className="text-[9px] bg-emerald-400 text-slate-900 font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {
    /* Left-Justified Navigation Menu List */
  }
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 text-left">
            <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 text-left">
              Operator Dashboard Menu
            </span>

            {navItems.map((item) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    return <button
      key={item.id}
      onClick={() => {
        setActiveSection(item.id);
        setSidebarOpenMobile(false);
      }}
      className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold
                    transition-all duration-150 cursor-pointer group
                    ${isActive ? "bg-[#176B37] text-white shadow-xs" : "text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]"}
                  `}
    >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`
                      w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                      ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600 group-hover:bg-white group-hover:text-[#176B37]"}
                    `}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate text-left">{item.label}</span>
                  </div>

                  <span className={`
                    text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                    ${isActive ? "bg-white/20 text-white" : "bg-[#EAF3ED] text-[#176B37] group-hover:bg-white"}
                  `}>
                    {item.badge}
                  </span>
                </button>;
  })}

            {
    /* Left-Justified Identity, PINs & Bill Services Group */
  }
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
              <span className="px-3 text-[10px] font-bold text-[#176B37] uppercase tracking-wider block mb-1.5 text-left">
                Verification, PINs &amp; Bill Services
              </span>

              {DASHBOARD_SERVICES_MENU.map((service) => {
    const SIcon = service.icon;
    const isActive = activeSection === service.id;
    return <button
      key={service.id}
      onClick={() => {
        setActiveSection(service.id);
        setSidebarOpenMobile(false);
      }}
      className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold
                      transition-all duration-150 cursor-pointer group
                      ${isActive ? "bg-[#176B37] text-white shadow-xs" : "text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]"}
                    `}
    >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`
                        w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                        ${isActive ? "bg-white/20 text-white" : "bg-[#EAF3ED]/70 text-[#176B37] group-hover:bg-white"}
                      `}>
                        <SIcon className="w-4 h-4" />
                      </div>
                      <span className="truncate text-left">{service.label}</span>
                    </div>

                    <span className={`
                      text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                      ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600 group-hover:bg-white group-hover:text-[#176B37]"}
                    `}>
                      {service.badge}
                    </span>
                  </button>;
  })}
            </div>

            {
    /* Left-Justified Community Social Space & Online Meetings Group */
  }
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
              <span className="px-3 text-[10px] font-bold text-[#176B37] uppercase tracking-wider block mb-1.5 text-left">
                Community &amp; Meetings
              </span>

              <button
    onClick={() => {
      setActiveSection("social-space");
      setSidebarOpenMobile(false);
    }}
    className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold
                  transition-all duration-150 cursor-pointer group
                  ${activeSection === "social-space" ? "bg-[#176B37] text-white shadow-xs" : "text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]"}
                `}
  >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`
                    w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                    ${activeSection === "social-space" ? "bg-white/20 text-white" : "bg-[#EAF3ED]/70 text-[#176B37] group-hover:bg-white"}
                  `}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="truncate text-left">AMMON Social Space</span>
                </div>
                <span className={`
                  text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                  ${activeSection === "social-space" ? "bg-white/20 text-white" : "bg-[#EAF3ED] text-[#176B37] group-hover:bg-white"}
                `}>
                  {socialMessages.length} Chat
                </span>
              </button>

              <button
    onClick={() => {
      setActiveSection("online-meetings");
      setSidebarOpenMobile(false);
    }}
    className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold
                  transition-all duration-150 cursor-pointer group
                  ${activeSection === "online-meetings" ? "bg-[#176B37] text-white shadow-xs" : "text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]"}
                `}
  >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`
                    w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                    ${activeSection === "online-meetings" ? "bg-white/20 text-white" : "bg-[#EAF3ED]/70 text-[#176B37] group-hover:bg-white"}
                  `}>
                    <Video className="w-4 h-4" />
                  </div>
                  <span className="truncate text-left">Online Meetings</span>
                </div>
                <span className={`
                  text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1
                  ${activeSection === "online-meetings" ? "bg-white/20 text-white" : meetings.some((m) => m.status === "Live") ? "bg-red-100 text-red-700 font-bold" : "bg-gray-100 text-gray-600"}
                `}>
                  {meetings.filter((m) => m.status === "Live").length > 0 ? `${meetings.filter((m) => m.status === "Live").length} Live` : `${meetings.length} Rooms`}
                </span>
              </button>
            </div>
          </div>

          {
    /* Sidebar Bottom Footer Actions */
  }
          <div className="p-3 border-t border-[#E5E7EB] bg-gray-50/70 space-y-1.5 text-xs">
            <button
    onClick={onClose}
    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:text-[#176B37] hover:bg-[#EAF3ED] font-semibold transition-colors cursor-pointer"
  >
              <ArrowLeft className="w-4 h-4 text-[#176B37]" />
              <span>Exit to Public Website</span>
            </button>

            {onLogout && <button
    onClick={onLogout}
    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-semibold transition-colors cursor-pointer"
  >
                <LogOut className="w-4 h-4" />
                <span>Sign Out / Switch Operator</span>
              </button>}
          </div>
        </aside>

        {
    /* Overlay for mobile sidebar */
  }
        {sidebarOpenMobile && <div
    onClick={() => setSidebarOpenMobile(false)}
    className="md:hidden fixed inset-0 z-30 bg-black/40"
  />}

        {
    /* ======================================================== */
  }
        {
    /* MAIN CONTENT AREA (Right of Left-Justified Sidebar)      */
  }
        {
    /* ======================================================== */
  }
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFFFF]">
          
          {
    /* Top Bar for Main Area */
  }
          <header className="h-16 px-4 sm:px-8 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
    onClick={() => setSidebarOpenMobile(true)}
    className="md:hidden p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
    aria-label="Open portal navigation"
  >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-medium hidden sm:inline">Member Portal</span>
                <span className="text-gray-400 hidden sm:inline">/</span>
                <h2 className="text-sm sm:text-base font-bold text-[#252525]">
                  {activeSection === "social-space" ? "AMMON Social Space" : activeSection === "online-meetings" ? "Online Meetings & Video Rooms" : navItems.find((n) => n.id === activeSection)?.label || DASHBOARD_SERVICES_MENU.find((s) => s.id === activeSection)?.label}
                </h2>
              </div>
            </div>

            {
    /* Quick Action Buttons on Top Bar */
  }
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-1.5 bg-[#EAF3ED] text-[#176B37] px-3 py-1 rounded-full text-xs font-semibold border border-[#176B37]/20">
                <ShieldCheck className="w-3.5 h-3.5 text-[#176B37]" />
                <span>CBN & NIBSS Verified</span>
              </div>

              <button
    onClick={onClose}
    className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
    title="Close Portal"
  >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {
    /* Scrollable Dashboard Viewport */
  }
          <main
    className={`flex-1 bg-[#F9FBFA]/60 min-w-0 min-h-0 ${activeSection === "social-space" || activeSection === "online-meetings" ? "flex flex-col overflow-hidden p-0 sm:p-4" : "overflow-y-auto p-4 sm:p-8"}`}
  >
            <div
    className={`${activeSection === "social-space" || activeSection === "online-meetings" ? "max-w-6xl w-full flex-1 flex flex-col min-h-0 mx-auto" : "max-w-4xl mx-auto space-y-6"} min-w-0`}
  >

              {
    /* 1. OVERVIEW & STATISTICS */
  }
              {activeSection === "overview" && <div className="space-y-6 animate-in fade-in duration-150">
                  
                  {
    /* Welcome & Profile Photo Strip */
  }
                  <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <label
    className="relative shrink-0 cursor-pointer group"
    title="Upload or change profile & chat photo"
  >
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#176B37]/30 shadow-xs bg-[#EAF3ED]">
                            <img
    src={member.photoUrl || "/assets/images/ammon_hero_pos_agent_1794380620175.jpg"}
    alt={member.fullName}
    onError={(e) => {
      e.currentTarget.src = "/assets/images/ammon_hero_pos_agent_1794380620175.jpg";
    }}
    className="w-full h-full object-cover object-top"
    referrerPolicy="no-referrer"
  />
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#176B37] text-white border-2 border-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                            {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                          </span>
                          <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleProfilePhotoChange}
    disabled={isUploadingAvatar}
    className="hidden"
  />
                        </label>

                        <div className="min-w-0">
                          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            Welcome Back, Operator
                          </span>
                          <h3 className="text-xl font-bold text-[#252525] mt-0.5 truncate">
                            {member.fullName}
                          </h3>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">
                            Outlet: <strong className="text-[#14532D]">{member.businessName}</strong> · Location: <strong>{member.lga}, {member.state} State</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <label className="px-3.5 py-2 rounded-xl border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                          {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                          <span>{isUploadingAvatar ? "Uploading Photo..." : "Upload Chat Photo"}</span>
                          <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleProfilePhotoChange}
    disabled={isUploadingAvatar}
    className="hidden"
  />
                        </label>

                        <button
    onClick={() => setActiveSection("id-card")}
    className="px-4 py-2 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
  >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>View My ID Card</span>
                        </button>
                      </div>
                    </div>

                    {avatarNotice && <div className="px-3 py-2 rounded-xl bg-[#EAF3ED] border border-[#176B37]/25 text-xs font-semibold text-[#14532D] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#176B37] shrink-0" />
                        <span>{avatarNotice} Used automatically in all AMMON Social Chat rooms.</span>
                      </div>}

                    {avatarError && <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-800">
                        {avatarError}
                      </div>}
                  </div>

                  {
    /* 3 Core Metric Cards */
  }
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <div className="flex items-center justify-between text-gray-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          Monthly Volume
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-[#EAF3ED] text-[#176B37] flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-[#176B37] font-mono mt-1">
                        {volume}
                      </div>
                      <span className="text-[11px] text-gray-500 mt-1 block">
                        {txCount} transactions settled
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <div className="flex items-center justify-between text-gray-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          CBN Compliance Status
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-lg font-bold text-emerald-800 mt-1">
                        <span>100% Authorized</span>
                      </div>
                      <span className="text-[11px] text-gray-500 mt-1 block">
                        BVN & CAC verified in registry
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <div className="flex items-center justify-between text-gray-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          Annual Subscription
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-lg font-bold text-gray-800 mt-1">
                        Valid till {member.expiryDate}
                      </div>
                      <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                        ₦{member.duesAmount.toLocaleString()} Dues Paid
                      </span>
                    </div>
                  </div>

                  {
    /* Kiosk Protection & Legal Bulletin */
  }
                  <div className="bg-[#EAF3ED] p-5 rounded-2xl border border-[#176B37]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-[#176B37]" />
                        <h4 className="font-bold text-sm text-[#14532D]">
                          Court Injunction & Exemption from LGA Levies
                        </h4>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed max-w-xl">
                        Federal High Court Order FHC/L/CS/2023/1844 exempts all AMMON banking kiosks from municipal 
                        ticket dues. Keep your official exemption paper printed.
                      </p>
                    </div>

                    <button
    onClick={() => downloadCourtInjunction(member)}
    className="px-4 py-2 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
  >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Legal Notice</span>
                    </button>
                  </div>

                  {
    /* Quick Short-cut Cards to Other Sections */
  }
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
    onClick={() => setActiveSection("id-card")}
    className="p-4 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#176B37] text-left transition-all duration-150 cursor-pointer group flex items-center justify-between"
  >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#EAF3ED] text-[#176B37] flex items-center justify-center group-hover:bg-[#176B37] group-hover:text-white transition-colors">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-[#252525] group-hover:text-[#176B37]">
                            My Digital Membership Card
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Download PNG image or print physical ID
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#176B37]" />
                    </button>

                    <button
    onClick={() => setActiveSection("legal")}
    className="p-4 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#176B37] text-left transition-all duration-150 cursor-pointer group flex items-center justify-between"
  >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#EAF3ED] text-[#176B37] flex items-center justify-center group-hover:bg-[#176B37] group-hover:text-white transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-[#252525] group-hover:text-[#176B37]">
                            Kiosk Tariff Advisory Poster
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Print approved CBN consumer tariff table
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#176B37]" />
                    </button>
                  </div>

                  {
    /* Quick-Access Verification, PINs & Utility Services Grid (Left-Justified) */
  }
                  <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider text-left">
                        Verification, PINs &amp; Bill Payment Services
                      </h4>
                      <span className="text-[10px] font-semibold text-[#176B37] bg-[#EAF3ED] px-2 py-0.5 rounded-full">
                        8 Active Gateways
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {DASHBOARD_SERVICES_MENU.map((service) => {
    const SIcon = service.icon;
    return <button
      key={service.id}
      onClick={() => setActiveSection(service.id)}
      className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F9FBFA] hover:bg-[#EAF3ED] hover:border-[#176B37] text-left transition-all cursor-pointer group flex items-start gap-2.5"
    >
                            <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] text-[#176B37] group-hover:bg-[#176B37] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <SIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="font-bold text-xs text-[#252525] group-hover:text-[#176B37] truncate">
                                {service.label}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                {service.shortDesc}
                              </p>
                            </div>
                          </button>;
  })}
                    </div>
                  </div>

                </div>}

              {
    /* 2. MY DIGITAL ID CARD (Full Interactive Display with Download & Print) */
  }
              {activeSection === "id-card" && <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs">
                    
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-base text-[#252525]">
                          Official Digital Membership Identity
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Recognized by the Central Bank of Nigeria & law enforcement authorities
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
    onClick={() => setCardFlipped(!cardFlipped)}
    className="px-3.5 py-1.5 border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
  >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Flip Card ({cardFlipped ? "Front" : "Back"})</span>
                        </button>
                      </div>
                    </div>

                    {
    /* THE CARD */
  }
                    <div className="flex justify-center my-4">
                      {!cardFlipped ? (
    /* FRONT */
    <div className="w-full max-w-md aspect-85/54 rounded-2xl overflow-hidden shadow-xl border-2 border-[#176B37] bg-gradient-to-br from-white via-[#EAF3ED]/40 to-white relative flex flex-col justify-between p-5 text-[#252525] select-none">
                          <div className="flex items-start justify-between border-b border-[#176B37]/20 pb-3 relative z-10">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-white p-0.5 border border-[#176B37]/20 flex items-center justify-center shrink-0 shadow-2xs">
                                <AmmonLogo variant="compact" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black tracking-wider text-[#176B37] uppercase leading-none">
                                  AMMON NIGERIA
                                </h4>
                                <p className="text-[9px] text-gray-500 font-medium">
                                  Association of Mobile Money Operators
                                </p>
                              </div>
                            </div>
                            <span className="bg-[#176B37] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              {member.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-12 gap-3 items-center py-2 relative z-10">
                            <div className="col-span-4 flex flex-col items-center">
                              <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-[#176B37] shadow-sm relative bg-slate-50 shrink-0">
                                <img
      src={member.photoUrl || "/assets/images/ammon_hero_pos_agent_1794380620175.jpg"}
      alt={member.fullName}
      onError={(e) => {
        e.currentTarget.src = "/assets/images/ammon_hero_pos_agent_1794380620175.jpg";
      }}
      className="w-full h-full object-cover object-top"
      referrerPolicy="no-referrer"
    />
                                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#176B37] text-white flex items-center justify-center text-[7px] font-extrabold border border-white">
                                  ✓
                                </div>
                              </div>
                              <span className="text-[8px] font-bold text-[#176B37] uppercase tracking-wider mt-1">
                                Verified Agent
                              </span>
                            </div>

                            <div className="col-span-8 space-y-1.5 pl-1">
                              <div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase">Full Legal Name</p>
                                <h5 className="text-sm font-extrabold text-[#252525] leading-tight truncate">{member.fullName}</h5>
                              </div>
                              <div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase">Business Outlet</p>
                                <p className="text-xs font-semibold text-[#14532D] leading-tight truncate">{member.businessName}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                                <div>
                                  <p className="text-[8px] text-gray-400 uppercase font-semibold">Membership ID</p>
                                  <p className="text-[11px] font-mono font-bold text-[#176B37]">{member.membershipId}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] text-gray-400 uppercase font-semibold">State / LGA</p>
                                  <p className="text-[10px] font-bold text-gray-800 truncate">{member.state} ({member.lga})</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-[#176B37]/20 pt-2 flex items-center justify-between relative z-10">
                            <div>
                              <p className="text-[9px] text-gray-600">
                                Terminal: <strong className="font-mono">{member.terminalSerialNumber}</strong> ({member.terminalProvider})
                              </p>
                              <p className="text-[8px] text-gray-400">Scan QR to verify on national registry</p>
                            </div>
                            <div className="p-1 bg-white rounded border border-[#176B37]/20 shadow-2xs">
                              <QRCodeSvg
      value={`https://ammon.ng/verify?id=${member.membershipId}`}
      size={40}
      fgColor="#176B37"
    />
                            </div>
                          </div>
                        </div>
  ) : (
    /* BACK */
    <div className="w-full max-w-md aspect-85/54 rounded-2xl overflow-hidden shadow-xl border-2 border-[#176B37] bg-gradient-to-br from-[#14532D] to-[#176B37] text-white p-5 flex flex-col justify-between select-none">
                          <div>
                            <div className="w-full h-7 bg-black/60 rounded-sm mb-3 flex items-center px-3 justify-end text-[8px] font-mono tracking-widest text-white/70">
                              AMMON · CBN · NIBSS COMPLIANT
                            </div>
                            <h5 className="text-[11px] font-bold tracking-wider text-emerald-100 uppercase">
                              Court Protection Clause
                            </h5>
                            <p className="text-[9px] text-emerald-50/90 leading-tight mt-1">
                              By Federal High Court directive FHC/L/CS/2023/1844, this certified operator is legally 
                              exempt from daily municipal council ticket dues and harassment.
                            </p>
                          </div>
                          <div className="flex items-end justify-between border-t border-white/20 pt-2 text-[8px] text-emerald-100">
                            <div>
                              <p className="font-semibold">HQ &amp; Legal Desk:</p>
                              <p className="font-mono font-bold text-white text-[10px]">07045900900 · ammonngr@gmail.com</p>
                            </div>
                            <div className="text-right">
                              <p className="italic font-serif text-[10px] text-white/90">Babaginda O. S.</p>
                              <p className="text-[7px] text-emerald-200">National Secretary General</p>
                            </div>
                          </div>
                        </div>
  )}
                    </div>

                    {
    /* Real Download and Print Buttons */
  }
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                      <button
    onClick={handleDownloadCard}
    disabled={isDownloadingCard}
    className="py-3 px-4 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
  >
                        <Download className="w-4 h-4" />
                        <span>{isDownloadingCard ? "Generating Image..." : "Download Digital ID (PNG)"}</span>
                      </button>

                      <button
    onClick={() => printDigitalCardDocument(member)}
    className="py-3 px-4 rounded-xl border-2 border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
  >
                        <Printer className="w-4 h-4" />
                        <span>Print Physical ID Card</span>
                      </button>
                    </div>

                  </div>
                </div>}

              {
    /* 3. REGISTERED POS FLEET */
  }
              {activeSection === "fleet" && <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-base text-[#252525]">Linked POS Terminals</h3>
                        <p className="text-xs text-gray-500">Central Bank of Nigeria terminal registry status</p>
                      </div>
                      <button
    onClick={() => alert(`Terminal addition request submitted for ${member.businessName}. Central Switch approval in progress.`)}
    className="px-3.5 py-1.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
  >
                        + Add Terminal
                      </button>
                    </div>

                    <div className="space-y-3">
                      {
    /* Primary Terminal */
  }
                      <div className="p-4 rounded-2xl border-2 border-[#176B37]/30 bg-[#EAF3ED]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-[#176B37] text-white flex items-center justify-center shrink-0">
                            <Smartphone className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#252525]">
                                {member.terminalProvider} Smart POS
                              </h4>
                              <span className="text-[9px] bg-[#176B37] text-white px-2 py-0.5 rounded-full font-bold">
                                PRIMARY
                              </span>
                            </div>
                            <p className="text-xs font-mono text-gray-600 mt-0.5">
                              Serial: <strong>{member.terminalSerialNumber}</strong>
                            </p>
                            <p className="text-[11px] text-gray-500">
                              NIBSS Switch Terminal ID: TID-NG-{member.membershipId.slice(-5)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            Active & Compliant
                          </span>
                        </div>
                      </div>

                      {
    /* Secondary Backup Terminal */
  }
                      <div className="p-4 rounded-2xl border border-[#E5E7EB] bg-gray-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gray-400 text-white flex items-center justify-center shrink-0">
                            <Smartphone className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#252525]">
                                Secondary Kiosk Backup Terminal
                              </h4>
                              <span className="text-[9px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                                BACKUP
                              </span>
                            </div>
                            <p className="text-xs font-mono text-gray-600 mt-0.5">
                              Serial: <strong>{member.membershipId.replace("AMMON", "POS")}-SEC</strong>
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Provider: OPay / Payforce Merchant Kiosk
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-600">
                            Online Standby
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>}

              {
    /* 4. ANNUAL DUES & RECEIPTS */
  }
              {activeSection === "dues" && <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
                      <div>
                        <h3 className="font-bold text-base text-[#252525]">Annual Association Dues</h3>
                        <p className="text-xs text-gray-500">Automated Paystack subscription ledger</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200">
                        Status: 100% Fully Settled
                      </span>
                    </div>

                    {
    /* Paid Card Banner */
  }
                    <div className="p-5 rounded-2xl bg-[#EAF3ED] border border-[#176B37]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-[#14532D] uppercase tracking-wider">
                          2025/2026 Annual Operational Levy
                        </span>
                        <div className="text-2xl font-black text-[#176B37] font-mono mt-1">
                          ₦{member.duesAmount.toLocaleString()}.00
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Settled via Paystack Checkout on {member.joinedDate}
                        </p>
                      </div>

                      <button
    onClick={() => downloadPaymentReceipt(member)}
    className="px-5 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
  >
                        <Download className="w-4 h-4" />
                        <span>Download Official Tax Receipt (PDF)</span>
                      </button>
                    </div>

                    {
    /* Transaction History Table */
  }
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Subscription Audit Trail
                      </h4>
                      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
                        <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                          <div>
                            <p className="font-bold text-gray-900">2025 Annual Operational Subscription</p>
                            <p className="text-[10px] text-gray-400 font-mono">Ref: PSTK-AMMON-2025-{member.membershipId.slice(-4)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-[#176B37]">₦{member.duesAmount.toLocaleString()}.00</p>
                            <span className="text-[10px] text-emerald-600 font-semibold">Verified Successful</span>
                          </div>
                        </div>

                        <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                          <div>
                            <p className="font-bold text-gray-900">2024 Annual Operational Subscription</p>
                            <p className="text-[10px] text-gray-400 font-mono">Ref: PSTK-AMMON-2024-{member.membershipId.slice(-4)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-[#176B37]">₦{member.duesAmount.toLocaleString()}.00</p>
                            <span className="text-[10px] text-emerald-600 font-semibold">Verified Successful</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>}

              {
    /* 5. LEGAL AID & CERTIFICATES */
  }
              {activeSection === "legal" && <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-5">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">Legal Defense & Kiosk Certificates</h3>
                      <p className="text-xs text-gray-500">Official court orders and operational authorizations</p>
                    </div>

                    {
    /* High Court Injunction Document Download Card */
  }
                    <div className="p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/50 space-y-3">
                      <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-blue-900" />
                        <h4 className="font-bold text-sm text-blue-950">
                          Federal High Court Perpetual Injunction (Suit No. FHC/L/CS/2023/1844)
                        </h4>
                      </div>
                      <p className="text-xs text-blue-900/80 leading-relaxed">
                        This binding judgment restrains all local government revenue taskforces from imposing 
                        daily ticket levies on banking kiosks or seizing POS terminals.
                      </p>
                      <div>
                        <button
    onClick={() => downloadCourtInjunction(member)}
    className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
  >
                          <Download className="w-4 h-4" />
                          <span>Download Formal Court Injunction Notice</span>
                        </button>
                      </div>
                    </div>

                    {
    /* Kiosk Tariff Poster Download Card */
  }
                    <div className="p-5 rounded-2xl border border-[#176B37]/30 bg-[#EAF3ED]/40 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#176B37]" />
                        <h4 className="font-bold text-sm text-[#14532D]">
                          Mandatory 2025 Kiosk Tariff Advisory Board
                        </h4>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        Display this official tariff sheet visibly at your counter to comply with Central Bank of Nigeria 
                        consumer transparency guidelines.
                      </p>
                      <div>
                        <button
    onClick={() => downloadKioskTariffPoster(member)}
    className="px-5 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
  >
                          <Download className="w-4 h-4" />
                          <span>Download Kiosk Tariff Poster (PDF / Print)</span>
                        </button>
                      </div>
                    </div>

                    {
    /* Operating Certificate Card */
  }
                    <div className="p-5 rounded-2xl border border-[#E5E7EB] bg-gray-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-[#252525]">
                            Kiosk Operational Authorization Certificate
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Wall plaque certificate certifying active standing with the National Association.
                          </p>
                        </div>
                        <button
    onClick={() => downloadCourtInjunction(member)}
    className="px-4 py-2 border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] rounded-xl text-xs font-bold transition-colors cursor-pointer"
  >
                          Print Wall Plaque
                        </button>
                      </div>
                    </div>

                  </div>
                </div>}

              {
    /* 6. AMMON ACADEMY TRAINING */
  }
              {activeSection === "academy" && <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
                      <div>
                        <h3 className="font-bold text-base text-[#252525]">AMMON Academy Training School</h3>
                        <p className="text-xs text-gray-500">Anti-fraud masterclasses & POS cybersecurity accreditation</p>
                      </div>
                      <button
    onClick={() => downloadAcademyCertificate(member)}
    className="px-4 py-2 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
  >
                        <Award className="w-4 h-4" />
                        <span>Download Operator Certificate (PDF)</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#EAF3ED] border border-[#176B37]/20 flex items-center justify-between text-xs">
                      <span className="font-bold text-[#14532D]">
                        Training Progress: {completedAcademyCourses.length} of 4 Modules Completed
                      </span>
                      <span className="font-bold text-[#176B37]">
                        {Math.round(completedAcademyCourses.length / 4 * 100)}% Complete
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
    { id: 1, title: "POS Fraud Detection & Counter-Skimming", dur: "45 mins" },
    { id: 2, title: "Fake Bank Alert & Reversal Scam Prevention", dur: "30 mins" },
    { id: 3, title: "Counterfeit Currency UV Light Verification", dur: "35 mins" },
    { id: 4, title: "Cash Liquidity Float & Reconciliation", dur: "50 mins" }
  ].map((c) => {
    const isDone = completedAcademyCourses.includes(c.id);
    return <div key={c.id} className="p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <h5 className="font-bold text-xs text-[#252525]">{c.title}</h5>
                              <p className="text-[10px] text-gray-400 mt-0.5">Duration: {c.dur} · Certified Curriculum</p>
                            </div>
                            <button
      onClick={() => toggleCourse(c.id)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${isDone ? "bg-[#176B37] text-white" : "border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED]"}`}
    >
                              {isDone ? "Completed ✓" : "Start Course"}
                            </button>
                          </div>;
  })}
                    </div>
                  </div>
                </div>}

              {
    /* 7. COMPLAINTS & DISPUTE DESK */
  }
              {activeSection === "disputes" && <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-base text-[#252525]">Rapid Incident Response Desk</h3>
                      <p className="text-xs text-gray-500">Report extortion, police harassment or frozen aggregator accounts</p>
                    </div>

                    {disputeSubmitted ? <div className="p-6 bg-[#EAF3ED] rounded-2xl border border-[#176B37]/30 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-[#176B37] mx-auto" />
                        <h4 className="font-bold text-sm text-[#14532D]">Incident Filed Successfully</h4>
                        <p className="text-xs text-gray-600">
                          Ref: <strong className="font-mono text-[#176B37]">AMMON-DISP-2025-{Math.floor(1e3 + Math.random() * 9e3)}</strong>. 
                          The state legal officer has been assigned to your case.
                        </p>
                        <button
    onClick={() => setDisputeSubmitted(false)}
    className="mt-2 text-xs font-bold text-[#176B37] hover:underline"
  >
                          Submit Another Incident
                        </button>
                      </div> : <form onSubmit={(e) => {
    e.preventDefault();
    setDisputeSubmitted(true);
  }} className="space-y-3 text-xs">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Incident Type</label>
                          <select
    value={disputeIssue}
    onChange={(e) => setDisputeIssue(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                            <option value="Illegal LGA Levy">Local Government Illegal Revenue Levy</option>
                            <option value="Police Harassment">Police / Security Taskforce Harassment</option>
                            <option value="Frozen Wallet">Partner Aggregator Unlawfully Froze Funds</option>
                            <option value="Chargeback Fraud">Customer Initiated Fraudulent Reverse Chargeback</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Location & Incident Description</label>
                          <textarea
    rows={3}
    required
    value={disputeDesc}
    onChange={(e) => setDisputeDesc(e.target.value)}
    placeholder="Provide street address, amount demanded, personnel badges, or bank transaction reference..."
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
                        </div>

                        <button
    type="submit"
    className="w-full py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl transition-colors cursor-pointer"
  >
                          Dispatch Report to AMMON Legal Taskforce
                        </button>
                      </form>}

                    <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-900">
                      <strong>Immediate Physical Threat:</strong> Call AMMON Rapid Action hotline directly at <strong className="font-mono">+234 (0) 800 266 6664</strong>.
                    </div>
                  </div>
                </div>}

              {
    /* 8. DIGITAL VERIFICATION, ATTESTATION, PINS & BILL PAYMENT SERVICES */
  }
              {DASHBOARD_SERVICES_MENU.some((s) => s.id === activeSection) && <DashboardServicesWorkspace
    activeService={activeSection}
    operatorName={member.fullName}
    operatorId={member.membershipId}
    businessOrTitle={member.businessName}
    stateLocation={member.state}
    roleLabel="Certified Operator"
    onSelectService={(id) => setActiveSection(id)}
  />}

              {
    /* 9. AMMON SOCIAL SPACE & ONLINE MEETINGS */
  }
              {(activeSection === "social-space" || activeSection === "online-meetings") && <div className="animate-in fade-in duration-150 min-w-0 flex-1 flex flex-col min-h-0">
                  <SocialSpaceWorkspace
    currentUser={{
      id: member.id,
      name: member.fullName,
      role: member.category === "Super Agents" ? "Super Agent" : "POS Agent",
      badge: member.membershipId,
      avatar: member.photoUrl,
      isAdmin: false,
      isSuperAdmin: false
    }}
    members={members}
    messages={socialMessages}
    meetings={meetings}
    onSendMessage={onSendMessage}
    onUpdateMessage={onUpdateMessage}
    onCreateMeeting={onCreateMeeting}
    onUpdateMeeting={onUpdateMeeting}
    initialTab={activeSection === "online-meetings" ? "meetings" : "chat"}
  />
                </div>}

            </div>
          </main>
        </div>

      </div>
    </div>;
};
export {
  MemberPortalModal
};
