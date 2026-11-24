import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { QuickActionBar } from "./components/QuickActionBar";
import { MainContentGrid } from "./components/MainContentGrid";
import { MembershipCategories } from "./components/MembershipCategories";
import { Footer } from "./components/Footer";
import { DigitalMembershipCardModal } from "./components/DigitalMembershipCardModal";
import { MemberPortalModal } from "./components/MemberPortalModal";
import { MemberLoginModal } from "./components/MemberLoginModal";
import { AdminDashboardModal } from "./components/AdminDashboardModal";
import { RegistrationModal } from "./components/RegistrationModal";
import { VerificationModal } from "./components/VerificationModal";
import { DisputeModal } from "./components/DisputeModal";
import { ArticleModal } from "./components/ArticleModal";
import { EventModal } from "./components/EventModal";
import { AcademyModal } from "./components/AcademyModal";
import { CategoryDetailModal } from "./components/CategoryDetailModal";
import { PaystackDuesModal } from "./components/PaystackDuesModal";
import { SocialSpaceModal } from "./components/SocialSpaceModal";
import { EmailOtpVerificationModal } from "./components/EmailOtpVerificationModal";
import {
  NEWS_ARTICLES,
  UPCOMING_EVENTS,
  MEMBERSHIP_CATEGORIES_DATA
} from "./data/mockData";
import { INITIAL_EXECUTIVE_ACCOUNTS } from "./data/hierarchyData";
import { ShieldCheck, X } from "lucide-react";
import {
  fetchPublicMembers,
  getStoredExecutiveToken,
  loginExecutive,
  setStoredExecutiveToken,
  updateMemberProfilePhotoApi,
  updateExecutiveProfilePhotoApi,
  permanentDeleteSocialMessageApi
} from "./services/executiveApi";
import { deleteChatMediaAsset } from "./services/storageService";
import { logOutFirebase } from "./firebase";
import {
  LEGACY_TEST_MEMBER_IDS,
  subscribeToMembers,
  subscribeToNews,
  subscribeToDisputes,
  subscribeToSocialMessages,
  subscribeToMeetings,
  addMemberToFirestore,
  updateMemberInFirestore,
  addNewsToFirestore,
  addDisputeToFirestore,
  updateDisputeInFirestore,
  addSocialMessageToFirestore,
  updateSocialMessageInFirestore,
  deleteSocialMessagePermanentlyInFirestore,
  addMeetingToFirestore,
  updateMeetingInFirestore,
  seedInitialFirestoreData
} from "./services/firestoreService";
const PROD_RESET_KEY = "ammon_prod_reset_v1";
function mergeRealMembers(sources) {
  const byId = /* @__PURE__ */ new Map();
  for (const list of sources) {
    for (const m of list) {
      if (m && m.id && !LEGACY_TEST_MEMBER_IDS.has(m.id)) {
        byId.set(m.id, m);
      }
    }
  }
  return Array.from(byId.values());
}
function App() {
  useEffect(() => {
    try {
      if (!localStorage.getItem(PROD_RESET_KEY)) {
        const rawMembers = localStorage.getItem("ammon_members");
        if (rawMembers) {
          const parsed = JSON.parse(rawMembers);
          const cleaned = parsed.filter((m) => m && m.id && !LEGACY_TEST_MEMBER_IDS.has(m.id));
          localStorage.setItem("ammon_members", JSON.stringify(cleaned));
        }
        const rawLogged = localStorage.getItem("ammon_logged_in_member");
        if (rawLogged) {
          const parsedLogged = JSON.parse(rawLogged);
          if (!parsedLogged?.id || LEGACY_TEST_MEMBER_IDS.has(parsedLogged.id)) {
            localStorage.removeItem("ammon_logged_in_member");
          }
        }
        if (!getStoredExecutiveToken()) {
          localStorage.removeItem("ammon_logged_in_admin");
        }
        localStorage.setItem(PROD_RESET_KEY, "1");
      }
    } catch {
    }
  }, []);
  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem("ammon_members");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter((m) => m && m.id && !LEGACY_TEST_MEMBER_IDS.has(m.id)).map((m) => ({
          ...m,
          photoUrl: m.photoUrl ? m.photoUrl.replace("/src/assets/images/", "/assets/images/") : m.photoUrl
        }));
      }
      return [];
    } catch {
      return [];
    }
  });
  const [news, setNews] = useState(NEWS_ARTICLES);
  const [events] = useState(UPCOMING_EVENTS);
  const [disputes, setDisputes] = useState([]);
  const [socialMessages, setSocialMessages] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loggedInMember, setLoggedInMember] = useState(() => {
    try {
      const saved = localStorage.getItem("ammon_logged_in_member");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed?.id || LEGACY_TEST_MEMBER_IDS.has(parsed.id) || parsed.emailVerified !== true) {
          return null;
        }
        return {
          ...parsed,
          photoUrl: parsed.photoUrl ? parsed.photoUrl.replace("/src/assets/images/", "/assets/images/") : parsed.photoUrl
        };
      }
      return null;
    } catch {
      return null;
    }
  });
  const [pendingOtpMember, setPendingOtpMember] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      if (!getStoredExecutiveToken()) {
        return null;
      }
      const saved = localStorage.getItem("ammon_logged_in_admin");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.level) {
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [currentMember, setCurrentMember] = useState(() => {
    return loggedInMember || null;
  });
  useEffect(() => {
    fetchPublicMembers().then((res) => {
      if (Array.isArray(res.members)) {
        setMembers((prev) => mergeRealMembers([prev, res.members]));
      }
    }).catch(() => {
    });
    seedInitialFirestoreData([], NEWS_ARTICLES, [], [], []);
    const unsubMembers = subscribeToMembers((liveMembers) => {
      setMembers((prev) => mergeRealMembers([prev, liveMembers]));
    }, []);
    const unsubNews = subscribeToNews((liveNews) => {
      if (liveNews.length > 0) setNews(liveNews);
    }, NEWS_ARTICLES);
    const unsubDisputes = subscribeToDisputes((liveDisputes) => {
      setDisputes(liveDisputes);
    }, []);
    const unsubSocial = subscribeToSocialMessages((liveMsgs) => {
      setSocialMessages(liveMsgs);
    }, []);
    const unsubMeetings = subscribeToMeetings((liveMeetings) => {
      setMeetings(liveMeetings);
    }, []);
    return () => {
      unsubMembers();
      unsubNews();
      unsubDisputes();
      unsubSocial();
      unsubMeetings();
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("ammon_members", JSON.stringify(members));
    } catch {
    }
  }, [members]);
  useEffect(() => {
    try {
      if (adminUser) {
        localStorage.setItem("ammon_logged_in_admin", JSON.stringify(adminUser));
      } else {
        localStorage.removeItem("ammon_logged_in_admin");
      }
    } catch {
    }
  }, [adminUser]);
  useEffect(() => {
    if (loggedInMember) {
      const updated = members.find((m) => m.id === loggedInMember.id);
      if (updated) {
        setLoggedInMember(updated);
        setCurrentMember(updated);
      }
    }
  }, [members]);
  const [activeNav, setActiveNav] = useState("home");
  const [portalSection, setPortalSection] = useState("overview");
  const [loginModalTab, setLoginModalTab] = useState("operator");
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
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialModalTab, setSocialModalTab] = useState("chat");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [verificationInitialId, setVerificationInitialId] = useState("");
  const [pwaBannerVisible, setPwaBannerVisible] = useState(true);
  const handleOpenLogin = (tab) => {
    const resolvedTab = tab === "admin" ? "admin" : "operator";
    setLoginModalTab(resolvedTab);
    if (resolvedTab === "operator" && loggedInMember && loggedInMember.emailVerified === true) {
      setCurrentMember(loggedInMember);
      setShowPortalModal(true);
    } else if (resolvedTab === "operator" && loggedInMember && loggedInMember.emailVerified !== true) {
      setPendingOtpMember(loggedInMember);
      setShowOtpModal(true);
    } else if (resolvedTab === "admin" && adminUser) {
      setShowAdminModal(true);
    } else {
      setShowLoginModal(true);
    }
  };
  const handleLoginSuccess = (member) => {
    setShowLoginModal(false);
    if (member.emailVerified !== true) {
      setPendingOtpMember(member);
      setShowOtpModal(true);
      return;
    }
    setLoggedInMember(member);
    setCurrentMember(member);
    try {
      localStorage.setItem("ammon_logged_in_member", JSON.stringify(member));
    } catch {
    }
    setPortalSection("overview");
    setShowPortalModal(true);
  };
  const handleAdminLoginSuccess = (admin) => {
    setAdminUser(admin);
    try {
      localStorage.setItem("ammon_logged_in_admin", JSON.stringify(admin));
    } catch {
    }
    setShowLoginModal(false);
    setShowAdminModal(true);
  };
  const handleSelectAdminPersona = async (admin) => {
    setAdminUser(admin);
    const demo = INITIAL_EXECUTIVE_ACCOUNTS.find((a) => a.id === admin.id);
    if (demo) {
      try {
        const res = await loginExecutive(demo.email, demo.defaultPassword);
        if (res.status === "AUTHENTICATED") {
          setAdminUser(res.executive);
        }
      } catch {
      }
    }
  };
  const handleLogout = () => {
    setLoggedInMember(null);
    setCurrentMember(null);
    try {
      localStorage.removeItem("ammon_logged_in_member");
    } catch {
    }
    setShowPortalModal(false);
    setShowCardModal(false);
  };
  const handleAdminLogout = () => {
    setAdminUser(null);
    setStoredExecutiveToken(null);
    logOutFirebase().catch(() => {
    });
    try {
      localStorage.removeItem("ammon_logged_in_admin");
    } catch {
    }
    setShowAdminModal(false);
  };
  const handleRegisteredMember = (newMember) => {
    setMembers((prev) => mergeRealMembers([[newMember], prev]));
    addMemberToFirestore(newMember).catch(() => {
    });
    if (newMember.emailVerified !== true) {
      setPendingOtpMember(newMember);
      setShowOtpModal(true);
      return;
    }
    setLoggedInMember(newMember);
    setCurrentMember(newMember);
    try {
      localStorage.setItem("ammon_logged_in_member", JSON.stringify(newMember));
    } catch {
    }
    setPortalSection("overview");
    setShowPortalModal(true);
  };
  const handleEmailOtpVerified = (verifiedMember) => {
    setMembers((prev) => mergeRealMembers([[verifiedMember], prev]));
    setLoggedInMember(verifiedMember);
    setCurrentMember(verifiedMember);
    try {
      localStorage.setItem("ammon_logged_in_member", JSON.stringify(verifiedMember));
    } catch {
    }
    setShowOtpModal(false);
    setPendingOtpMember(null);
    setPortalSection("overview");
    setShowPortalModal(true);
  };
  const handleAddNews = (article) => {
    setNews([article, ...news]);
    addNewsToFirestore(article).catch(() => {
    });
  };
  const handleResolveDispute = (id) => {
    setDisputes(
      disputes.map((d) => d.id === id ? { ...d, status: "Resolved" } : d)
    );
    updateDisputeInFirestore(id, { status: "Resolved" }).catch(() => {
    });
  };
  const handleSendSocialMessage = (msg) => {
    setSocialMessages((prev) => [...prev, msg]);
    addSocialMessageToFirestore(msg).catch(() => {
    });
  };
  const handleUpdateSocialMessage = (id, updates) => {
    setSocialMessages(
      (prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m)
    );
    updateSocialMessageInFirestore(id, updates).catch(() => {
    });
  };
  const handlePermanentDeleteSocialMessage = async (msg) => {
    const isSuper = Boolean(adminUser) && (adminUser?.level === "super_admin" || adminUser?.role === "Super Admin");
    if (!isSuper || !adminUser) return;
    setSocialMessages((prev) => prev.filter((m) => m.id !== msg.id));
    await Promise.allSettled([
      deleteChatMediaAsset(msg.attachmentData, msg.attachmentStoragePath),
      permanentDeleteSocialMessageApi(msg.id, {
        attachmentData: msg.attachmentData,
        attachmentStoragePath: msg.attachmentStoragePath,
        channelId: msg.channelId,
        senderName: msg.senderName
      }),
      deleteSocialMessagePermanentlyInFirestore(msg.id, adminUser.fullName)
    ]);
  };
  const handleCreateMeeting = (mtg) => {
    setMeetings((prev) => [mtg, ...prev]);
    addMeetingToFirestore(mtg).catch(() => {
    });
  };
  const handleUpdateMeeting = (id, updates) => {
    setMeetings(
      (prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m)
    );
    updateMeetingInFirestore(id, updates).catch(() => {
    });
  };
  const handleUpdateMemberProfilePhoto = async (memberId, photoUrl, passportStoragePath) => {
    setMembers(
      (prev) => prev.map(
        (m) => m.id === memberId ? { ...m, photoUrl, ...passportStoragePath ? { passportStoragePath } : {} } : m
      )
    );
    setLoggedInMember((prev) => {
      if (!prev || prev.id !== memberId) return prev;
      const updated = {
        ...prev,
        photoUrl,
        ...passportStoragePath ? { passportStoragePath } : {}
      };
      try {
        localStorage.setItem("ammon_logged_in_member", JSON.stringify(updated));
      } catch {
      }
      return updated;
    });
    setCurrentMember(
      (prev) => prev && prev.id === memberId ? { ...prev, photoUrl, ...passportStoragePath ? { passportStoragePath } : {} } : prev
    );
    const firestoreUpdates = { photoUrl };
    if (passportStoragePath) firestoreUpdates.passportStoragePath = passportStoragePath;
    await Promise.allSettled([
      updateMemberInFirestore(memberId, firestoreUpdates),
      updateMemberProfilePhotoApi(memberId, photoUrl, passportStoragePath)
    ]);
  };
  const handleUpdateAdminProfilePhoto = async (avatarUrl) => {
    setAdminUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, avatarUrl };
      try {
        localStorage.setItem("ammon_logged_in_admin", JSON.stringify(updated));
      } catch {
      }
      return updated;
    });
    await updateExecutiveProfilePhotoApi(avatarUrl).catch(() => {
    });
  };
  const handleOpenVerifyForId = (id) => {
    setVerificationInitialId(id);
    setShowCardModal(false);
    setShowVerifyModal(true);
  };
  return <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#FFFFFF] text-[#252525] flex flex-col font-sans selection:bg-[#EAF3ED] selection:text-[#176B37]">
      
      {
    /* PWA Institutional Install Strip */
  }
      {pwaBannerVisible && <div className="bg-[#14532D] text-white text-[11px] py-1.5 px-3 sm:px-8 border-b border-white/10 flex items-center justify-between gap-2 w-full">
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
      alert("AMMON Progressive Web App added to home screen!");
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
        </div>}

      {
    /* Main Header */
  }
      <Header
    onOpenRegister={() => setShowRegisterModal(true)}
    onOpenLogin={() => handleOpenLogin("operator")}
    onOpenAdmin={() => {
      if (adminUser) {
        setShowAdminModal(true);
      } else {
        handleOpenLogin("admin");
      }
    }}
    onOpenVerify={() => {
      setVerificationInitialId("");
      setShowVerifyModal(true);
    }}
    onOpenDispute={() => setShowDisputeModal(true)}
    onOpenPortal={() => {
      if (loggedInMember && loggedInMember.emailVerified === true) {
        setCurrentMember(loggedInMember);
        setPortalSection("overview");
        setShowPortalModal(true);
      } else if (loggedInMember && loggedInMember.emailVerified !== true) {
        setPendingOtpMember(loggedInMember);
        setShowOtpModal(true);
      } else {
        handleOpenLogin("operator");
      }
    }}
    onOpenCard={() => {
      if (loggedInMember && loggedInMember.emailVerified === true) {
        setCurrentMember(loggedInMember);
        setPortalSection("id-card");
        setShowPortalModal(true);
      } else if (loggedInMember && loggedInMember.emailVerified !== true) {
        setPendingOtpMember(loggedInMember);
        setShowOtpModal(true);
      } else {
        handleOpenLogin("operator");
      }
    }}
    onOpenSocial={() => {
      setSocialModalTab("chat");
      setShowSocialModal(true);
    }}
    onOpenMeetings={() => {
      setSocialModalTab("meetings");
      setShowSocialModal(true);
    }}
    loggedInMember={loggedInMember}
    adminUser={adminUser}
    onLogout={handleLogout}
    onLogoutAdmin={handleAdminLogout}
    onSelectAdmin={handleSelectAdminPersona}
    activeNav={activeNav}
    setActiveNav={setActiveNav}
  />

      {
    /* Main Content Area */
  }
      <main className="flex-1">
        
        {
    /* Hero Section matching reference */
  }
        <Hero
    onOpenRegister={() => setShowRegisterModal(true)}
    onOpenLogin={() => handleOpenLogin("operator")}
    enrolledCount={members.length}
  />

        {
    /* Quick Action Bar (6 core services with primary green badges) */
  }
        <QuickActionBar
    onOpenRegister={() => setShowRegisterModal(true)}
    onOpenCardModal={() => {
      if (loggedInMember && loggedInMember.emailVerified === true) {
        setCurrentMember(loggedInMember);
        setPortalSection("id-card");
        setShowPortalModal(true);
      } else if (loggedInMember && loggedInMember.emailVerified !== true) {
        setPendingOtpMember(loggedInMember);
        setShowOtpModal(true);
      } else {
        handleOpenLogin("operator");
      }
    }}
    onOpenPaymentModal={() => {
      if (loggedInMember && loggedInMember.emailVerified === true) {
        setCurrentMember(loggedInMember);
        setPortalSection("dues");
        setShowPortalModal(true);
      } else {
        setShowPaymentModal(true);
      }
    }}
    onOpenAcademy={() => {
      if (loggedInMember && loggedInMember.emailVerified === true) {
        setCurrentMember(loggedInMember);
        setPortalSection("academy");
        setShowPortalModal(true);
      } else {
        setShowAcademyModal(true);
      }
    }}
    onOpenEvents={() => {
      const eventsElem = document.getElementById("events");
      if (eventsElem) eventsElem.scrollIntoView({ behavior: "smooth" });
    }}
    onOpenSupport={() => {
      if (loggedInMember && loggedInMember.emailVerified === true) {
        setCurrentMember(loggedInMember);
        setPortalSection("disputes");
        setShowPortalModal(true);
      } else {
        setShowDisputeModal(true);
      }
    }}
  />

        {
    /* Main 3-Column Content Grid (Welcome, Latest News, Upcoming Events) */
  }
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

        {
    /* Membership Categories Section (#EAF3ED cards with #176B37 icons) */
  }
        <MembershipCategories
    onSelectCategory={(cat) => setSelectedCategory(cat)}
    onViewAll={() => setSelectedCategory(MEMBERSHIP_CATEGORIES_DATA[0])}
  />

      </main>

      {
    /* Institutional Footer */
  }
      <Footer
    onOpenRegister={() => setShowRegisterModal(true)}
    onOpenVerify={() => {
      setVerificationInitialId("");
      setShowVerifyModal(true);
    }}
    onOpenDispute={() => setShowDisputeModal(true)}
    onOpenAcademy={() => setShowAcademyModal(true)}
  />

      {
    /* Floating Fast Verification Button */
  }
      <div className="fixed bottom-5 right-5 z-30">
        <button
    onClick={() => {
      setVerificationInitialId("");
      setShowVerifyModal(true);
    }}
    className="bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold px-4 py-3 rounded-full shadow-lg border border-white/20 flex items-center gap-2 hover:scale-105 transition-all duration-200 cursor-pointer"
    title="Verify an Agent or POS Terminal"
  >
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Verify Agent</span>
        </button>
      </div>

      {
    /* ALL MODAL OVERLAYS */
  }

      {
    /* 0. Member Login Page / Modal */
  }
      <MemberLoginModal
    members={members}
    isOpen={showLoginModal}
    defaultTab={loginModalTab}
    onClose={() => setShowLoginModal(false)}
    onLoginSuccess={handleLoginSuccess}
    onRequireEmailOtp={(m) => {
      setShowLoginModal(false);
      setPendingOtpMember(m);
      setShowOtpModal(true);
    }}
    onAdminLoginSuccess={handleAdminLoginSuccess}
    onOpenRegister={() => {
      setShowLoginModal(false);
      setShowRegisterModal(true);
    }}
  />

      {
    /* 0b. Email OTP Verification Modal (Mandatory before dashboard access) */
  }
      <EmailOtpVerificationModal
    member={pendingOtpMember}
    isOpen={showOtpModal}
    onClose={() => setShowOtpModal(false)}
    onVerified={handleEmailOtpVerified}
  />

      {
    /* 1. Digital Membership Card Modal */
  }
      {currentMember && (currentMember.emailVerified === true || Boolean(adminUser)) && <DigitalMembershipCardModal
    member={currentMember}
    isOpen={showCardModal}
    onClose={() => setShowCardModal(false)}
    onOpenVerify={handleOpenVerifyForId}
  />}

      {
    /* 2. Member Portal Modal (Operator's Own Dashboard) */
  }
      {currentMember && currentMember.emailVerified === true && <MemberPortalModal
    member={currentMember}
    members={members}
    isOpen={showPortalModal}
    onClose={() => setShowPortalModal(false)}
    onLogout={handleLogout}
    initialSection={portalSection}
    socialMessages={socialMessages}
    meetings={meetings}
    onSendMessage={handleSendSocialMessage}
    onUpdateMessage={handleUpdateSocialMessage}
    onCreateMeeting={handleCreateMeeting}
    onUpdateMeeting={handleUpdateMeeting}
    onUpdateProfilePhoto={(photoUrl, storagePath) => handleUpdateMemberProfilePhoto(currentMember.id, photoUrl, storagePath)}
  />}

      {
    /* 3. Admin Executive & Super Admin Dashboard */
  }
      {adminUser && <AdminDashboardModal
    adminUser={adminUser}
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
    socialMessages={socialMessages}
    meetings={meetings}
    onSendMessage={handleSendSocialMessage}
    onUpdateMessage={handleUpdateSocialMessage}
    onPermanentDeleteMessage={adminUser.level === "super_admin" || adminUser.role === "Super Admin" ? handlePermanentDeleteSocialMessage : void 0}
    onCreateMeeting={handleCreateMeeting}
    onUpdateMeeting={handleUpdateMeeting}
    onUpdateProfilePhoto={handleUpdateAdminProfilePhoto}
  />}

      {
    /* 3b. Standalone Community Social Space & Online Meetings Modal */
  }
      <SocialSpaceModal
    isOpen={showSocialModal}
    onClose={() => setShowSocialModal(false)}
    initialTab={socialModalTab}
    loggedInMember={loggedInMember}
    adminUser={adminUser}
    members={members}
    messages={socialMessages}
    meetings={meetings}
    onSendMessage={handleSendSocialMessage}
    onUpdateMessage={handleUpdateSocialMessage}
    onPermanentDeleteMessage={adminUser && (adminUser.level === "super_admin" || adminUser.role === "Super Admin") ? handlePermanentDeleteSocialMessage : void 0}
    onCreateMeeting={handleCreateMeeting}
    onUpdateMeeting={handleUpdateMeeting}
  />

      {
    /* 4. Registration & Onboarding Modal */
  }
      <RegistrationModal
    isOpen={showRegisterModal}
    onClose={() => setShowRegisterModal(false)}
    onRegistered={handleRegisteredMember}
  />

      {
    /* 5. Public Credential Verification Modal */
  }
      <VerificationModal
    members={members}
    isOpen={showVerifyModal}
    onClose={() => setShowVerifyModal(false)}
    initialId={verificationInitialId}
  />

      {
    /* 6. Dispute & Legal Assistance Desk Modal */
  }
      <DisputeModal
    isOpen={showDisputeModal}
    onClose={() => setShowDisputeModal(false)}
    onSubmitDispute={(ticket) => {
      setDisputes([ticket, ...disputes]);
      addDisputeToFirestore(ticket).catch(() => {
      });
    }}
  />

      {
    /* 7. Article & Announcement Reader Modal */
  }
      <ArticleModal
    article={selectedArticle}
    isOpen={Boolean(selectedArticle)}
    onClose={() => setSelectedArticle(null)}
  />

      {
    /* 8. Event Registration Modal */
  }
      <EventModal
    event={selectedEvent}
    isOpen={Boolean(selectedEvent)}
    onClose={() => setSelectedEvent(null)}
  />

      {
    /* 9. AMMON Academy Courses Modal */
  }
      <AcademyModal
    isOpen={showAcademyModal}
    onClose={() => setShowAcademyModal(false)}
    member={loggedInMember || currentMember}
  />

      {
    /* 10. Category Detail Modal */
  }
      <CategoryDetailModal
    category={selectedCategory}
    isOpen={Boolean(selectedCategory)}
    onClose={() => setSelectedCategory(null)}
    onApply={() => {
      setSelectedCategory(null);
      setShowRegisterModal(true);
    }}
  />

      {
    /* 11. Paystack Dues Payment Modal */
  }
      <PaystackDuesModal
    isOpen={showPaymentModal}
    onClose={() => setShowPaymentModal(false)}
    onPaymentVerified={(updatedMember) => {
      setMembers(
        (prev) => prev.some((m) => m.id === updatedMember.id) ? prev.map((m) => m.id === updatedMember.id ? updatedMember : m) : [updatedMember, ...prev]
      );
    }}
  />

      {
    /* 12. About AMMON Institutional Charter Modal */
  }
      {showAboutModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
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
                Founded to protect, organize, and elevate POS agents, super agents, and mobile money operators, 
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
        </div>}

    </div>;
}
export {
  App as default
};
