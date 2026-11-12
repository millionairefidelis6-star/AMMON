import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { QuickActionBar } from './components/QuickActionBar';
import { MainContentGrid } from './components/MainContentGrid';
import { MembershipCategories } from './components/MembershipCategories';
import { Footer } from './components/Footer';

import { DigitalMembershipCardModal } from './components/DigitalMembershipCardModal';
import { MemberPortalModal, DashboardSection } from './components/MemberPortalModal';
import { MemberLoginModal } from './components/MemberLoginModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { RegistrationModal } from './components/RegistrationModal';
import { VerificationModal } from './components/VerificationModal';
import { DisputeModal } from './components/DisputeModal';
import { ArticleModal } from './components/ArticleModal';
import { EventModal } from './components/EventModal';
import { AcademyModal } from './components/AcademyModal';
import { CategoryDetailModal } from './components/CategoryDetailModal';
import { PaystackDuesModal } from './components/PaystackDuesModal';

import { 
  INITIAL_MEMBERS, 
  NEWS_ARTICLES, 
  UPCOMING_EVENTS, 
  MEMBERSHIP_CATEGORIES_DATA, 
  INITIAL_DISPUTES,
  ADMIN_USERS
} from './data/mockData';
import { Member, NewsArticle, EventItem, DisputeTicket, AdminUser } from './types';
import { ShieldCheck, Download, Smartphone, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { auth, onAuthStateChanged, logOutFirebase } from './firebase';
import { User as FirebaseUser } from 'firebase/auth';
import {
  subscribeToMembers,
  subscribeToNews,
  subscribeToDisputes,
  addMemberToFirestore,
  addNewsToFirestore,
  addDisputeToFirestore,
  updateDisputeInFirestore,
  seedInitialFirestoreData,
} from './services/firestoreService';

export default function App() {
  // Application Data State with localStorage persistence
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem('ammon_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: Member) => ({
          ...m,
          photoUrl: m.photoUrl ? m.photoUrl.replace('/src/assets/images/', '/assets/images/') : m.photoUrl
        }));
      }
      return INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [news, setNews] = useState<NewsArticle[]>(NEWS_ARTICLES);
  const [events, setEvents] = useState<EventItem[]>(UPCOMING_EVENTS);
  const [disputes, setDisputes] = useState<DisputeTicket[]>(INITIAL_DISPUTES);
  
  // Firebase Authenticated User State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Authenticated Member State
  const [loggedInMember, setLoggedInMember] = useState<Member | null>(() => {
    try {
      const saved = localStorage.getItem('ammon_logged_in_member');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          photoUrl: parsed.photoUrl ? parsed.photoUrl.replace('/src/assets/images/', '/assets/images/') : parsed.photoUrl
        };
      }
      return null;
    } catch {
      return null;
    }
  });

  // Authenticated Admin User State (Defaults to Dr. Victor O. Babatunde, Super Admin)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('ammon_logged_in_admin');
      return saved ? JSON.parse(saved) : ADMIN_USERS[0];
    } catch {
      return ADMIN_USERS[0];
    }
  });

  // Current member being viewed in modal/card
  const [currentMember, setCurrentMember] = useState<Member>(() => {
    return loggedInMember || members[0] || INITIAL_MEMBERS[0];
  });

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      setFirebaseUser(user);
      if (user) {
        const email = user.email?.toLowerCase() || '';
        if (email === 'millionairefidelis@gmail.com' || email === 'superadmin@ammon.ng') {
          setAdminUser({
            id: 'admin-super',
            fullName: user.displayName || 'Dr. Victor O. Babatunde',
            role: 'Super Admin',
            title: 'National President & Registrar-General',
            email: user.email || 'superadmin@ammon.ng',
            phone: '+234 800 266 6661',
            jurisdiction: 'National Headquarters (36 States + FCT)',
            badgeNumber: 'AMMON-HQ-001',
            avatarUrl: user.photoURL || undefined,
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Seed & Subscribe to Firestore collections for persistence
  useEffect(() => {
    seedInitialFirestoreData(INITIAL_MEMBERS, NEWS_ARTICLES, INITIAL_DISPUTES);

    const unsubMembers = subscribeToMembers((liveMembers) => {
      if (liveMembers.length > 0) setMembers(liveMembers);
    }, INITIAL_MEMBERS);

    const unsubNews = subscribeToNews((liveNews) => {
      if (liveNews.length > 0) setNews(liveNews);
    }, NEWS_ARTICLES);

    const unsubDisputes = subscribeToDisputes((liveDisputes) => {
      if (liveDisputes.length > 0) setDisputes(liveDisputes);
    }, INITIAL_DISPUTES);

    return () => {
      unsubMembers();
      unsubNews();
      unsubDisputes();
    };
  }, []);

  // Keep members persisted locally as well
  useEffect(() => {
    try {
      localStorage.setItem('ammon_members', JSON.stringify(members));
    } catch {}
  }, [members]);

  // Keep adminUser persisted
  useEffect(() => {
    try {
      if (adminUser) {
        localStorage.setItem('ammon_logged_in_admin', JSON.stringify(adminUser));
      } else {
        localStorage.removeItem('ammon_logged_in_admin');
      }
    } catch {}
  }, [adminUser]);

  // Keep loggedInMember synced with members list if modified
  useEffect(() => {
    if (loggedInMember) {
      const updated = members.find((m) => m.id === loggedInMember.id);
      if (updated) {
        setLoggedInMember(updated);
        setCurrentMember(updated);
      }
    }
  }, [members]);

  // Navigation State
  const [activeNav, setActiveNav] = useState('home');

  // Modal Visibility State
  const [portalSection, setPortalSection] = useState<DashboardSection>('overview');
  const [loginModalTab, setLoginModalTab] = useState<'operator' | 'admin'>('operator');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showAcademyModal, setShowAcademyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Selected Items for Detail Modals
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<typeof MEMBERSHIP_CATEGORIES_DATA[0] | null>(null);
  const [verificationInitialId, setVerificationInitialId] = useState('');

  // PWA banner state
  const [pwaBannerVisible, setPwaBannerVisible] = useState(true);

  // Google Sign-In Handler
  const handleGoogleLoginSuccess = (user: FirebaseUser) => {
    setFirebaseUser(user);
    const email = user.email?.toLowerCase() || '';
    setShowLoginModal(false);

    if (email === 'millionairefidelis@gmail.com' || email === 'superadmin@ammon.ng') {
      const superOfficer: AdminUser = {
        id: 'admin-super',
        fullName: user.displayName || 'Dr. Victor O. Babatunde',
        role: 'Super Admin',
        title: 'National President & Registrar-General',
        email: user.email || 'superadmin@ammon.ng',
        phone: '+234 800 266 6661',
        jurisdiction: 'National Headquarters (36 States + FCT)',
        badgeNumber: 'AMMON-HQ-001',
        avatarUrl: user.photoURL || undefined,
      };
      setAdminUser(superOfficer);
      setShowAdminModal(true);
      return;
    }

    if (email === 'executive@ammon.ng') {
      const execOfficer: AdminUser = {
        id: 'admin-exec',
        fullName: user.displayName || 'Alhaji Babaginda O. Sani',
        role: 'Executive',
        title: 'National Secretary General',
        email: user.email || 'executive@ammon.ng',
        phone: '+234 800 266 6662',
        jurisdiction: 'National Executive Directorate',
        badgeNumber: 'AMMON-EXEC-002',
        avatarUrl: user.photoURL || undefined,
      };
      setAdminUser(execOfficer);
      setShowAdminModal(true);
      return;
    }

    // Match operator or auto-create verified Google operator
    const matched = members.find((m) => m.email.toLowerCase() === email);
    if (matched) {
      setLoggedInMember(matched);
      setCurrentMember(matched);
      setShowPortalModal(true);
    } else {
      const newOperator: Member = {
        id: `mem-${user.uid.slice(0, 8)}`,
        membershipId: `AMMON-GOOG-${Math.floor(10000 + Math.random() * 90000)}`,
        fullName: user.displayName || 'Google Verified Agent',
        businessName: `${user.displayName?.split(' ')[0] || 'Google'} Digital Terminal Services`,
        email: user.email || 'operator@gmail.com',
        phone: user.phoneNumber || '+234 800 000 0000',
        state: 'Lagos',
        lga: 'Ikeja',
        category: 'POS Agents',
        tier: 'TIER-1',
        terminalSerialNumber: `POS-${Math.floor(10000000 + Math.random() * 90000000)}`,
        terminalProvider: 'OPay / Moniepoint',
        bvnVerified: true,
        cbnCompliant: true,
        status: 'Active',
        joinedDate: 'Nov 11, 2025',
        expiryDate: 'Nov 11, 2026',
        photoUrl: user.photoURL || undefined,
        duesPaid: true,
        duesAmount: 15000,
      };
      setMembers((prev) => [newOperator, ...prev]);
      addMemberToFirestore(newOperator);
      setLoggedInMember(newOperator);
      setCurrentMember(newOperator);
      setShowPortalModal(true);
    }
  };

  // Authentication Handlers
  const handleOpenLogin = (tab?: 'operator' | 'admin') => {
    const resolvedTab: 'operator' | 'admin' = tab === 'admin' ? 'admin' : 'operator';
    setLoginModalTab(resolvedTab);
    if (resolvedTab === 'operator' && loggedInMember) {
      setCurrentMember(loggedInMember);
      setShowPortalModal(true);
    } else if (resolvedTab === 'admin' && adminUser) {
      setShowAdminModal(true);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = (member: Member) => {
    setLoggedInMember(member);
    setCurrentMember(member);
    try {
      localStorage.setItem('ammon_logged_in_member', JSON.stringify(member));
    } catch {}
    setShowLoginModal(false);
    // Open the member's own dashboard immediately
    setShowPortalModal(true);
  };

  const handleAdminLoginSuccess = (admin: AdminUser) => {
    setAdminUser(admin);
    try {
      localStorage.setItem('ammon_logged_in_admin', JSON.stringify(admin));
    } catch {}
    setShowLoginModal(false);
    setShowAdminModal(true);
  };

  const handleLogout = () => {
    setLoggedInMember(null);
    try {
      localStorage.removeItem('ammon_logged_in_member');
    } catch {}
    setShowPortalModal(false);
    setShowCardModal(false);
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    try {
      localStorage.removeItem('ammon_logged_in_admin');
    } catch {}
    setShowAdminModal(false);
  };

  const handleRegisteredMember = (newMember: Member) => {
    setMembers([newMember, ...members]);
    addMemberToFirestore(newMember);
    setLoggedInMember(newMember);
    setCurrentMember(newMember);
    try {
      localStorage.setItem('ammon_logged_in_member', JSON.stringify(newMember));
    } catch {}
    setShowCardModal(true);
  };

  const handleAddNews = (article: NewsArticle) => {
    setNews([article, ...news]);
    addNewsToFirestore(article);
  };

  const handleResolveDispute = (id: string) => {
    setDisputes(
      disputes.map((d) => (d.id === id ? { ...d, status: 'Resolved' } : d))
    );
    updateDisputeInFirestore(id, { status: 'Resolved' });
  };

  const handleOpenVerifyForId = (id: string) => {
    setVerificationInitialId(id);
    setShowCardModal(false);
    setShowVerifyModal(true);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#FFFFFF] text-[#252525] flex flex-col font-sans selection:bg-[#EAF3ED] selection:text-[#176B37]">
      
      {/* PWA Institutional Install Strip */}
      {pwaBannerVisible && (
        <div className="bg-[#14532D] text-white text-[11px] py-1.5 px-3 sm:px-8 border-b border-white/10 flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-semibold truncate">AMMON Digital PWA Identity</span>
            <span className="hidden md:inline text-emerald-100 truncate">
              — Install the official AMMON Web App for offline digital membership cards & fast credential verification.
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                alert('AMMON Progressive Web App added to home screen!');
                setPwaBannerVisible(false);
              }}
              className="bg-white/15 hover:bg-white/25 text-white font-semibold px-2 sm:px-2.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer whitespace-nowrap"
            >
              Add to Home Screen
            </button>
            <button
              onClick={() => setPwaBannerVisible(false)}
              className="text-white/60 hover:text-white p-0.5 cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        onOpenRegister={() => setShowRegisterModal(true)}
        onOpenLogin={() => handleOpenLogin('operator')}
        onOpenAdmin={() => {
          if (adminUser) {
            setShowAdminModal(true);
          } else {
            handleOpenLogin('admin');
          }
        }}
        onOpenVerify={() => {
          setVerificationInitialId('');
          setShowVerifyModal(true);
        }}
        onOpenDispute={() => setShowDisputeModal(true)}
        onOpenPortal={() => {
          if (loggedInMember) setCurrentMember(loggedInMember);
          setPortalSection('overview');
          setShowPortalModal(true);
        }}
        onOpenCard={() => {
          if (loggedInMember) setCurrentMember(loggedInMember);
          setPortalSection('id-card');
          setShowPortalModal(true);
        }}
        loggedInMember={loggedInMember}
        adminUser={adminUser}
        firebaseUser={firebaseUser}
        onLogout={handleLogout}
        onLogoutAdmin={handleAdminLogout}
        onLogoutGoogle={async () => {
          await logOutFirebase();
          setFirebaseUser(null);
        }}
        onSelectAdmin={(admin) => setAdminUser(admin)}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* Hero Section matching reference */}
        <Hero
          onOpenRegister={() => setShowRegisterModal(true)}
          onOpenLogin={() => handleOpenLogin('operator')}
        />

        {/* Quick Action Bar (6 core services with primary green badges) */}
        <QuickActionBar
          onOpenRegister={() => setShowRegisterModal(true)}
          onOpenCardModal={() => {
            if (loggedInMember) {
              setCurrentMember(loggedInMember);
              setPortalSection('id-card');
              setShowPortalModal(true);
            } else {
              setShowCardModal(true);
            }
          }}
          onOpenPaymentModal={() => {
            if (loggedInMember) {
              setCurrentMember(loggedInMember);
              setPortalSection('dues');
              setShowPortalModal(true);
            } else {
              setShowPaymentModal(true);
            }
          }}
          onOpenAcademy={() => {
            if (loggedInMember) {
              setCurrentMember(loggedInMember);
              setPortalSection('academy');
              setShowPortalModal(true);
            } else {
              setShowAcademyModal(true);
            }
          }}
          onOpenEvents={() => {
            const eventsElem = document.getElementById('events');
            if (eventsElem) eventsElem.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenSupport={() => {
            if (loggedInMember) {
              setCurrentMember(loggedInMember);
              setPortalSection('disputes');
              setShowPortalModal(true);
            } else {
              setShowDisputeModal(true);
            }
          }}
        />

        {/* Main 3-Column Content Grid (Welcome, Latest News, Upcoming Events) */}
        <div id="welcome">
          <MainContentGrid
            news={news}
            events={events}
            onSelectArticle={(article) => setSelectedArticle(article)}
            onSelectEvent={(evt) => setSelectedEvent(evt)}
            onOpenRegister={() => setShowRegisterModal(true)}
            onOpenAboutModal={() => setShowAboutModal(true)}
            onViewAllNews={() => {
              if (news[0]) setSelectedArticle(news[0]);
            }}
            onViewAllEvents={() => {
              if (events[0]) setSelectedEvent(events[0]);
            }}
          />
        </div>

        {/* Membership Categories Section (#EAF3ED cards with #176B37 icons) */}
        <MembershipCategories
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          onViewAll={() => setSelectedCategory(MEMBERSHIP_CATEGORIES_DATA[0])}
        />

      </main>

      {/* Institutional Footer */}
      <Footer
        onOpenRegister={() => setShowRegisterModal(true)}
        onOpenVerify={() => {
          setVerificationInitialId('');
          setShowVerifyModal(true);
        }}
        onOpenDispute={() => setShowDisputeModal(true)}
        onOpenAcademy={() => setShowAcademyModal(true)}
      />

      {/* Floating Fast Verification Button */}
      <div className="fixed bottom-5 right-5 z-30">
        <button
          onClick={() => {
            setVerificationInitialId('');
            setShowVerifyModal(true);
          }}
          className="bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold px-4 py-3 rounded-full shadow-lg border border-white/20 flex items-center gap-2 hover:scale-105 transition-all duration-200 cursor-pointer"
          title="Verify an Agent or POS Terminal"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Verify Agent</span>
        </button>
      </div>

      {/* ALL MODAL OVERLAYS */}

      {/* 0. Member Login Page / Modal */}
      <MemberLoginModal
        members={members}
        isOpen={showLoginModal}
        defaultTab={loginModalTab}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onGoogleLoginSuccess={handleGoogleLoginSuccess}
        onOpenRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />

      {/* 1. Digital Membership Card Modal */}
      <DigitalMembershipCardModal
        member={currentMember}
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        onOpenVerify={handleOpenVerifyForId}
      />

      {/* 2. Member Portal Modal (Operator's Own Dashboard) */}
      <MemberPortalModal
        member={currentMember}
        isOpen={showPortalModal}
        onClose={() => setShowPortalModal(false)}
        onLogout={handleLogout}
        initialSection={portalSection}
      />

      {/* 3. Admin Executive & Super Admin Dashboard */}
      <AdminDashboardModal
        adminUser={adminUser || ADMIN_USERS[0]}
        members={members}
        news={news}
        disputes={disputes}
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onLogout={handleAdminLogout}
        onSwitchAdmin={(admin) => setAdminUser(admin)}
        onAddNews={handleAddNews}
        onResolveDispute={handleResolveDispute}
        onSelectMember={(m) => {
          setCurrentMember(m);
          setShowAdminModal(false);
          setShowCardModal(true);
        }}
      />

      {/* 4. Registration & Onboarding Modal */}
      <RegistrationModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegistered={handleRegisteredMember}
      />

      {/* 5. Public Credential Verification Modal */}
      <VerificationModal
        members={members}
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        initialId={verificationInitialId}
      />

      {/* 6. Dispute & Legal Assistance Desk Modal */}
      <DisputeModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        onSubmitDispute={(ticket) => {
          setDisputes([ticket, ...disputes]);
          addDisputeToFirestore(ticket);
        }}
      />

      {/* 7. Article & Announcement Reader Modal */}
      <ArticleModal
        article={selectedArticle}
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
      />

      {/* 8. Event Registration Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />

      {/* 9. AMMON Academy Courses Modal */}
      <AcademyModal
        isOpen={showAcademyModal}
        onClose={() => setShowAcademyModal(false)}
        member={loggedInMember || currentMember}
      />

      {/* 10. Category Detail Modal */}
      <CategoryDetailModal
        category={selectedCategory}
        isOpen={Boolean(selectedCategory)}
        onClose={() => setSelectedCategory(null)}
        onApply={() => {
          setSelectedCategory(null);
          setShowRegisterModal(true);
        }}
      />

      {/* 11. Paystack Dues Payment Modal */}
      <PaystackDuesModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />

      {/* 12. About AMMON Institutional Charter Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#176B37] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base leading-tight">About AMMON</h3>
                <p className="text-xs text-emerald-100">Association of Mobile Money Operators of Nigeria</p>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#252525] leading-relaxed">
              <div className="rounded-xl overflow-hidden aspect-16/9 mb-2">
                <img
                  src="/assets/images/lagos_lekki_bridge_skyline_1794380622729.jpg"
                  alt="Lagos Headquarters"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <h4 className="font-bold text-sm text-[#14532D]">
                The Unified Voice of Nigeria&apos;s Agent Banking Ecosystem
              </h4>
              <p className="text-gray-700">
                Founded to protect, organize, and elevate over 140,000 POS agents, super agents, and mobile money operators, 
                AMMON serves as the critical bridge connecting financial regulators (Central Bank of Nigeria, NIBSS) 
                with retail operators in urban markets, rural communities, and interstate commerce hubs.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#EAF3ED] border border-[#176B37]/20">
                  <h5 className="font-bold text-xs text-[#176B37] mb-1">Our Core Mission</h5>
                  <p className="text-[11px] text-gray-700 leading-tight">
                    To eliminate barriers to financial inclusion, provide legal defense for operators, and maintain 
                    standardized, transparent fee guidelines across Nigeria.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#EAF3ED] border border-[#176B37]/20">
                  <h5 className="font-bold text-xs text-[#176B37] mb-1">Our National Vision</h5>
                  <p className="text-[11px] text-gray-700 leading-tight">
                    A secure, professional, and profitable agent banking industry that powers Nigeria&apos;s digital cashless economy.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowAboutModal(false);
                    setShowRegisterModal(true);
                  }}
                  className="w-full py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Join AMMON Today
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
