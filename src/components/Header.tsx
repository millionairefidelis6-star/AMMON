import React, { useState } from 'react';
import { 
  MapPin, 
  Mail, 
  Bell, 
  User, 
  ArrowRight, 
  Menu, 
  X, 
  ChevronDown, 
  ShieldCheck, 
  FileText, 
  Users, 
  Building2, 
  BookOpen, 
  PhoneCall,
  Search,
  CheckCircle2,
  Crown,
  Briefcase,
  ShieldAlert
} from 'lucide-react';
import { AmmonLogo } from './AmmonLogo';
import { Member, AdminUser } from '../types';
import { ADMIN_USERS } from '../data/mockData';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onOpenAdmin: () => void;
  onOpenVerify: () => void;
  onOpenDispute: () => void;
  onOpenPortal: () => void;
  onOpenCard: () => void;
  loggedInMember: Member | null;
  adminUser?: AdminUser | null;
  firebaseUser?: FirebaseUser | null;
  onLogout: () => void;
  onLogoutAdmin?: () => void;
  onLogoutGoogle?: () => void;
  onSelectAdmin?: (admin: AdminUser) => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRegister,
  onOpenLogin,
  onOpenAdmin,
  onOpenVerify,
  onOpenDispute,
  onOpenPortal,
  onOpenCard,
  loggedInMember,
  adminUser,
  firebaseUser,
  onLogout,
  onLogoutAdmin,
  onLogoutGoogle,
  onSelectAdmin,
  activeNav,
  setActiveNav
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [googleMenuOpen, setGoogleMenuOpen] = useState(false);

  const notifications = [
    { id: 1, title: 'CBN Circular 2025/11 Released', time: '2 hours ago', unread: true },
    { id: 2, title: 'National Conference 2025 Early Bird active', time: '1 day ago', unread: true },
  ];

  const handleNavClick = (navId: string) => {
    setActiveNav(navId);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <header className="w-full bg-[#FFFFFF] border-b border-[#E5E7EB] sticky top-0 z-40 shadow-xs">
      {/* Institutional Top Bar */}
      <div className="bg-[#14532D] text-[#FFFFFF] text-xs py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left contact info */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
              <MapPin className="w-3.5 h-3.5 text-[#EAF3ED]" />
              <span className="font-medium">Lagos, Nigeria</span>
            </div>
            <span className="hidden sm:inline text-white/30">|</span>
            <a 
              href="mailto:info@ammon.ng" 
              className="hidden sm:flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity"
            >
              <Mail className="w-3.5 h-3.5 text-[#EAF3ED]" />
              <span>info@ammon.ng</span>
            </a>
            <span className="hidden md:inline text-white/30">|</span>
            <div className="hidden md:flex items-center gap-1 text-emerald-200">
              <span>Hotline:</span>
              <span className="font-mono font-semibold">+234 (0) 800 266 6664</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-1 rounded-full text-white hover:text-emerald-200 transition-colors cursor-pointer"
                aria-label="View announcements"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  2
                </span>
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-[#252525] rounded-xl shadow-xl border border-[#E5E7EB] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-[#E5E7EB] flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#176B37]">Official Notices</span>
                    <span className="text-[10px] bg-[#EAF3ED] text-[#176B37] px-2 py-0.5 rounded-full font-semibold">2 New</span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="px-4 py-2.5 hover:bg-[#EAF3ED]/40 transition-colors cursor-pointer">
                        <p className="text-xs font-semibold text-[#252525]">{n.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-[#E5E7EB] bg-gray-50 text-center">
                    <button 
                      onClick={() => { setNotificationOpen(false); handleNavClick('news'); }}
                      className="text-xs font-semibold text-[#176B37] hover:underline cursor-pointer"
                    >
                      View All Announcements →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Verification fast link */}
            <button
              onClick={onOpenVerify}
              className="hidden lg:flex items-center gap-1.5 text-xs text-[#EAF3ED] hover:text-white transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Verify Agent</span>
            </button>

            {/* Directorate & Executive Admin Dropdown / Button */}
            {adminUser ? (
              <div className="relative">
                <button
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
                    adminUser.role === 'Super Admin'
                      ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border-amber-300/40'
                      : 'bg-white/15 hover:bg-white/25 text-white border-white/30'
                  }`}
                  title={`${adminUser.title} (${adminUser.role})`}
                >
                  {adminUser.role === 'Super Admin' ? (
                    <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  ) : (
                    <Briefcase className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  )}
                  <span className="font-bold truncate max-w-[90px] sm:max-w-[120px]">
                    {adminUser.fullName.split(' ')[0]}
                  </span>
                  <span className="text-[10px] hidden md:inline font-mono opacity-80">
                    ({adminUser.role === 'Super Admin' ? 'Super Admin' : 'Exec'})
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-80" />
                </button>

                {adminMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white text-[#252525] rounded-xl shadow-xl border border-[#E5E7EB] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#252525] truncate">{adminUser.fullName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          adminUser.role === 'Super Admin'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-[#176B37] border-emerald-200'
                        }`}>
                          {adminUser.role.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{adminUser.title}</p>
                      <p className="text-[9px] font-mono text-[#176B37] mt-0.5">{adminUser.badgeNumber}</p>
                    </div>

                    <button
                      onClick={() => { setAdminMenuOpen(false); onOpenAdmin(); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#EAF3ED] hover:text-[#176B37] cursor-pointer flex items-center justify-between"
                    >
                      <span>Open Directorate Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#176B37]" />
                    </button>

                    {/* Quick switch between Super Admin & Executive */}
                    <div className="px-4 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-b border-gray-100">
                      Switch Test Officer:
                    </div>
                    {ADMIN_USERS.map((officer) => (
                      <button
                        key={officer.id}
                        onClick={() => {
                          setAdminMenuOpen(false);
                          if (onSelectAdmin) onSelectAdmin(officer);
                        }}
                        className={`w-full text-left px-4 py-1.5 text-xs hover:bg-[#EAF3ED] cursor-pointer flex items-center justify-between ${
                          adminUser.id === officer.id ? 'font-bold text-[#176B37]' : 'text-gray-600'
                        }`}
                      >
                        <span className="truncate">{officer.fullName.split(' ')[0]} ({officer.role})</span>
                        {adminUser.id === officer.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#176B37]" />}
                      </button>
                    ))}

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setAdminMenuOpen(false);
                          if (onLogoutAdmin) onLogoutAdmin();
                        }}
                        className="w-full text-left px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        Sign Out of Admin Portal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="text-xs text-[#EAF3ED] hover:text-white px-2 py-0.5 rounded border border-white/20 hover:border-white/40 transition-colors cursor-pointer hidden sm:inline-block"
              >
                Directorate Login
              </button>
            )}

            {/* Member Login or Authenticated Member Menu */}
            {loggedInMember ? (
              <div className="relative">
                <button
                  onClick={() => setMemberMenuOpen(!memberMenuOpen)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-bold truncate max-w-[100px] sm:max-w-[130px]">{loggedInMember.fullName.split(' ')[0]}</span>
                  <span className="text-[10px] text-emerald-200 font-mono hidden sm:inline">({loggedInMember.membershipId.slice(-5)})</span>
                  <ChevronDown className="w-3 h-3 text-emerald-300" />
                </button>

                {memberMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-[#252525] rounded-xl shadow-xl border border-[#E5E7EB] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-bold text-xs truncate text-[#252525]">{loggedInMember.fullName}</p>
                      <p className="text-[10px] text-[#176B37] font-mono font-semibold truncate">{loggedInMember.membershipId}</p>
                      <p className="text-[10px] text-gray-400 truncate">{loggedInMember.businessName}</p>
                    </div>
                    <button
                      onClick={() => { setMemberMenuOpen(false); onOpenPortal(); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#EAF3ED] hover:text-[#176B37] cursor-pointer flex items-center justify-between"
                    >
                      <span>My Operator Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#176B37]" />
                    </button>
                    <button
                      onClick={() => { setMemberMenuOpen(false); onOpenCard(); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#EAF3ED] hover:text-[#176B37] cursor-pointer flex items-center justify-between"
                    >
                      <span>My Digital ID Card</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#176B37]" />
                    </button>
                    <button
                      onClick={() => { setMemberMenuOpen(false); onLogout(); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer border-t border-gray-100 mt-1"
                    >
                      Sign Out / Switch Operator
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 text-xs font-medium hover:text-emerald-200 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Member Login</span>
              </button>
            )}

            {/* Google Authenticated Account Indicator */}
            {firebaseUser && (
              <div className="relative">
                <button
                  onClick={() => setGoogleMenuOpen(!googleMenuOpen)}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                  title={`Google Account: ${firebaseUser.email}`}
                >
                  {firebaseUser.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={firebaseUser.displayName || 'Google'}
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-white text-[#176B37] flex items-center justify-center font-bold text-[9px] shrink-0">
                      G
                    </div>
                  )}
                  <span className="font-semibold truncate max-w-[80px] sm:max-w-[110px]">
                    {firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0]}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                </button>

                {googleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white text-[#252525] rounded-xl shadow-xl border border-[#E5E7EB] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2.5">
                      {firebaseUser.photoURL ? (
                        <img
                          src={firebaseUser.photoURL}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          G
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">{firebaseUser.displayName || 'Google Operator'}</p>
                        <p className="text-[10px] text-gray-500 truncate">{firebaseUser.email}</p>
                        <span className="text-[9px] bg-emerald-50 text-[#176B37] font-semibold px-1.5 py-0.2 rounded border border-emerald-200">
                          Google Verified
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setGoogleMenuOpen(false);
                          if (onLogoutGoogle) onLogoutGoogle();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        Sign Out of Google
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <span className="text-white/30">|</span>

            {/* Join AMMON CTA */}
            <button
              onClick={onOpenRegister}
              className="bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-semibold px-3.5 py-1 rounded-full transition-all duration-150 flex items-center gap-1 shadow-xs border border-white/20 cursor-pointer"
            >
              <span>Join AMMON</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5">
        <div className="flex items-center justify-between gap-6">
          {/* AMMON Logo Lockup */}
          <div 
            onClick={() => handleNavClick('home')}
            className="cursor-pointer"
          >
            <AmmonLogo />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 text-sm font-medium text-[#252525]">
            <button
              onClick={() => handleNavClick('home')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeNav === 'home'
                  ? 'bg-[#176B37] text-white shadow-xs'
                  : 'text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED]/60'
              }`}
            >
              Home
            </button>

            {/* About Us */}
            <div className="relative group">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'about' ? null : 'about')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED]/40 transition-colors cursor-pointer"
              >
                <span>About Us</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#176B37] transition-transform" />
              </button>

              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
                <a href="#welcome" onClick={() => handleNavClick('about')} className="block px-4 py-2 text-xs text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]">
                  Mission, Vision & Charter
                </a>
                <a href="#leadership" onClick={() => handleNavClick('leadership')} className="block px-4 py-2 text-xs text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]">
                  National Executive Council
                </a>
                <a href="#constitution" onClick={() => handleNavClick('constitution')} className="block px-4 py-2 text-xs text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]">
                  CBN Framework & Legal Mandate
                </a>
              </div>
            </div>

            {/* Membership */}
            <div className="relative group">
              <button 
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED]/40 transition-colors cursor-pointer"
              >
                <span>Membership</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#176B37]" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
                <a href="#categories" onClick={() => handleNavClick('categories')} className="block px-4 py-2 text-xs text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37]">
                  Membership Categories & Dues
                </a>
                <button onClick={onOpenRegister} className="w-full text-left px-4 py-2 text-xs text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37] cursor-pointer">
                  New Member Registration
                </button>
                <button onClick={onOpenVerify} className="w-full text-left px-4 py-2 text-xs text-[#252525] hover:bg-[#EAF3ED] hover:text-[#176B37] cursor-pointer">
                  Verify Member / ID Check
                </button>
              </div>
            </div>

            {/* News & Announcements */}
            <button
              onClick={() => handleNavClick('news')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeNav === 'news'
                  ? 'text-[#176B37] font-semibold bg-[#EAF3ED]'
                  : 'text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED]/40'
              }`}
            >
              News & Announcements
            </button>

            {/* State Chapters */}
            <div className="relative group">
              <button 
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED]/40 transition-colors cursor-pointer"
              >
                <span>State Chapters</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#176B37]" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
                <div className="px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  36 States + FCT Presence
                </div>
                <div className="grid grid-cols-2 gap-1 px-3 py-1">
                  {['Lagos Chapter', 'Abuja (FCT)', 'Kano Chapter', 'Rivers Chapter', 'Oyo Chapter', 'Kaduna Chapter'].map((state) => (
                    <span key={state} className="px-2 py-1 text-xs text-[#252525] hover:bg-[#EAF3ED] rounded hover:text-[#176B37] cursor-pointer">
                      {state}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Corporate Partners */}
            <a
              href="#partners"
              onClick={() => handleNavClick('partners')}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED]/40 transition-colors"
            >
              Corporate Partners
            </a>

            {/* Events */}
            <a
              href="#events"
              onClick={() => handleNavClick('events')}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED]/40 transition-colors"
            >
              Events
            </a>

            {/* Resources / Academy */}
            <button
              onClick={() => handleNavClick('academy')}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED]/40 transition-colors cursor-pointer"
            >
              Resources & Academy
            </button>

            {/* Complaints Desk */}
            <button
              onClick={onOpenDispute}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Dispute Desk
            </button>
          </nav>

          {/* Mobile hamburger menu toggle */}
          <div className="flex xl:hidden items-center gap-2">
            <button
              onClick={onOpenRegister}
              className="sm:hidden bg-[#176B37] text-white text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
            >
              Join
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#252525] hover:text-[#176B37] hover:bg-[#EAF3ED] rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-t border-[#E5E7EB] px-6 py-4 shadow-xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleNavClick('home')}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeNav === 'home' ? 'bg-[#176B37] text-white' : 'text-[#252525] hover:bg-[#EAF3ED]'
              }`}
            >
              Home
            </button>
            <a
              href="#welcome"
              onClick={() => handleNavClick('about')}
              className="text-left px-4 py-2.5 rounded-lg text-sm font-medium text-[#252525] hover:bg-[#EAF3ED]"
            >
              About AMMON & Leadership
            </a>
            <a
              href="#categories"
              onClick={() => handleNavClick('categories')}
              className="text-left px-4 py-2.5 rounded-lg text-sm font-medium text-[#252525] hover:bg-[#EAF3ED]"
            >
              Membership Categories
            </a>
            <a
              href="#news"
              onClick={() => handleNavClick('news')}
              className="text-left px-4 py-2.5 rounded-lg text-sm font-medium text-[#252525] hover:bg-[#EAF3ED]"
            >
              News & Announcements
            </a>
            <a
              href="#events"
              onClick={() => handleNavClick('events')}
              className="text-left px-4 py-2.5 rounded-lg text-sm font-medium text-[#252525] hover:bg-[#EAF3ED]"
            >
              Events & Conferences
            </a>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenVerify(); }}
              className="text-left px-4 py-2.5 rounded-lg text-sm font-medium text-[#176B37] bg-[#EAF3ED] flex items-center justify-between cursor-pointer"
            >
              <span>Verify Member Credentials</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenDispute(); }}
              className="text-left px-4 py-2.5 rounded-lg text-sm font-medium text-amber-800 bg-amber-50 flex items-center justify-between cursor-pointer"
            >
              <span>Report Dispute / Harassment</span>
              <PhoneCall className="w-4 h-4" />
            </button>

            <div className="pt-3 border-t border-[#E5E7EB] flex flex-col gap-2">
              {loggedInMember ? (
                <div className="p-3 bg-[#EAF3ED] rounded-xl border border-[#176B37]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#14532D]">{loggedInMember.fullName}</p>
                      <p className="text-[10px] font-mono text-[#176B37]">{loggedInMember.membershipId}</p>
                    </div>
                    <span className="text-[10px] bg-[#176B37] text-white px-2 py-0.5 rounded-full font-bold">Logged In</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => { setMobileMenuOpen(false); onOpenPortal(); }}
                      className="py-1.5 bg-[#176B37] text-white rounded-lg text-xs font-semibold text-center cursor-pointer"
                    >
                      My Dashboard
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                      className="py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                  className="w-full py-2.5 border border-[#176B37] text-[#176B37] rounded-lg text-sm font-semibold hover:bg-[#EAF3ED] transition-colors cursor-pointer"
                >
                  Member Portal Login
                </button>
              )}
              {adminUser ? (
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-gray-900">{adminUser.fullName}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{adminUser.badgeNumber} • {adminUser.role}</p>
                    </div>
                    <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded font-bold">Directorate</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => { setMobileMenuOpen(false); onOpenAdmin(); }}
                      className="py-1.5 bg-[#176B37] text-white rounded-lg text-xs font-semibold text-center cursor-pointer"
                    >
                      Open Dashboard
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); if (onLogoutAdmin) onLogoutAdmin(); }}
                      className="py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center cursor-pointer"
                    >
                      Exit Admin
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenAdmin(); }}
                  className="w-full py-2.5 bg-gray-100 text-[#252525] rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Directorate & Admin Dashboard
                </button>
              )}
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenRegister(); }}
                className="w-full py-2.5 bg-[#176B37] text-white rounded-lg text-sm font-semibold hover:bg-[#14532D] transition-colors cursor-pointer"
              >
                Become a Member
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
