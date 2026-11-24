const NIGERIA_ZONES = [
  {
    name: "North-Central",
    states: ["Benue", "FCT Abuja", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"]
  },
  {
    name: "North-East",
    states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"]
  },
  {
    name: "North-West",
    states: ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"]
  },
  {
    name: "South-East",
    states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"]
  },
  {
    name: "South-South",
    states: ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"]
  },
  {
    name: "South-West",
    states: ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"]
  }
];
const STATE_TO_ZONE = Object.fromEntries(
  NIGERIA_ZONES.flatMap((z) => z.states.map((s) => [s, z.name]))
);
function resolveZoneForState(stateName) {
  return STATE_TO_ZONE[stateName] || "South-South";
}
const INITIAL_ADMINISTRATIVE_LEVELS = [
  {
    level: "super_admin",
    label: "Super Administrator",
    rank: 0,
    enabled: true,
    description: "System root configuration, executive account provisioning, role permissions & full audit oversight."
  },
  {
    level: "national",
    label: "National Executives",
    rank: 1,
    enabled: true,
    description: "Nationwide oversight across all 6 geopolitical zones, 36 states, FCT Abuja, and 774 LGAs."
  },
  {
    level: "zonal",
    label: "Zonal Executives",
    rank: 2,
    enabled: true,
    description: "Geopolitical zone leadership supervising assigned state chapters and zonal meetings."
  },
  {
    level: "state",
    label: "State Executives",
    rank: 3,
    enabled: true,
    description: "State chapter governance supervising all LGAs, member approvals, and state dues within 1 state."
  },
  {
    level: "lga",
    label: "LGA Executives",
    rank: 4,
    enabled: true,
    description: "Local Government Area coordinators supervising wards, communities, and local operator activities."
  },
  {
    level: "ward",
    label: "Ward Executives",
    rank: 5,
    enabled: true,
    description: "Ward-level monitoring of registrations, member status, dues tracking, and local reports."
  },
  {
    level: "community",
    label: "Community Executives",
    rank: 6,
    enabled: true,
    description: "Grassroots market/community leads tracking local POS operators and submitting activity reports."
  },
  {
    level: "specialized",
    label: "Specialized Executive Officers",
    rank: 7,
    enabled: true,
    description: "Subject-matter officers (Legal Defense, Compliance & CBN Liaison, Financial Audit, Anti-Fraud)."
  }
];
const INITIAL_HIERARCHY_CONFIG = {
  zones: NIGERIA_ZONES,
  lgasByState: {
    Bayelsa: ["Yenagoa", "Ogbia", "Sagbama", "Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Southern Ijaw"],
    Rivers: ["Port Harcourt City", "Obio-Akpor", "Eleme", "Ikwerre", "Bonny", "Oyigbo"],
    Lagos: ["Ikeja", "Alimosho", "Eti-Osa", "Lagos Island", "Surulere", "Ikorodu", "Ojo"],
    "FCT Abuja": ["Municipal (AMAC)", "Bwari", "Gwagwalada", "Kuje", "Abaji"],
    Kano: ["Nassarawa", "Kano Municipal", "Fagge", "Gwale", "Tarauni", "Dala"],
    Enugu: ["Enugu North", "Enugu South", "Enugu East", "Nsukka", "Udi"],
    Oyo: ["Ibadan North", "Ibadan South-West", "Egbeda", "Ogbomoso North"],
    Bauchi: ["Bauchi", "Katagum", "Toro", "Misau"],
    Delta: ["Warri South", "Uvwie", "Oshimili South", "Ughelli North"],
    Kaduna: ["Kaduna North", "Kaduna South", "Chikun", "Zaria"]
  },
  wardsByLga: {
    "Bayelsa::Yenagoa": ["Epie Ward 1", "Epie Ward 2", "Atissa Ward 1", "Gbarain Ward 1", "Ekpetiama Ward 1"],
    "Bayelsa::Ogbia": ["Ogbia Town Ward 1", "Otuoke Ward 2", "Imiringi Ward 3", "Kolo Creek Ward 4"],
    "Bayelsa::Sagbama": ["Sagbama Central Ward 1", "Adagbabiri Ward 2", "Agbere Ward 3"],
    "Rivers::Port Harcourt City": ["PH Township Ward 1", "Diobu Mile 1 Ward 2", "GRA Phase 2 Ward 3"],
    "Rivers::Obio-Akpor": ["Rumuokoro Ward 1", "Choba Ward 2", "Woji Ward 3"],
    "Lagos::Ikeja": ["Computer Village Ward 1", "Alausa Ward 2", "Opebi Ward 3", "Ogba Ward 4"],
    "Lagos::Alimosho": ["Egbeda Ward 1", "Ikotun Ward 2", "Idimu Ward 3"],
    "FCT Abuja::Municipal (AMAC)": ["Wuse Ward 1", "Garki Ward 2", "Gwarinpa Ward 3", "Maitama Ward 4"],
    "Kano::Nassarawa": ["Bompai Ward 1", "Hotoro Ward 2", "Dakata Ward 3"],
    "Enugu::Enugu North": ["New Haven Ward 1", "Ogui Ward 2", "Independence Layout Ward 3"]
  },
  communitiesByWard: {
    "Bayelsa::Yenagoa::Epie Ward 1": ["Amarata Community", "Kpansia Market Hub", "Ovom Square"],
    "Bayelsa::Yenagoa::Epie Ward 2": ["Biogbolo Community", "Yenizue-Gene Market"],
    "Bayelsa::Ogbia::Ogbia Town Ward 1": ["Ogbia Main Market", "Otuabagi Junction"],
    "Bayelsa::Ogbia::Otuoke Ward 2": ["Otuoke Campus Gate", "Ewoi Road Hub"],
    "Lagos::Ikeja::Computer Village Ward 1": ["Otigba Plaza Cluster", "Simbiat Abiola Way"],
    "Rivers::Port Harcourt City::Diobu Mile 1 Ward 2": ["Mile 1 Market Corridor", "Ikwerre Road Cluster"],
    "FCT Abuja::Municipal (AMAC)::Wuse Ward 1": ["Wuse Zone 4 Plaza", "Berger Junction Hub"],
    "Kano::Nassarawa::Bompai Ward 1": ["Bompai Commercial Hub", "Sabon Gari Gate"]
  },
  administrativeLevels: INITIAL_ADMINISTRATIVE_LEVELS,
  specializedPositions: [
    "National Legal Defense Counsel",
    "Compliance & CBN Liaison Officer",
    "National Financial & Dues Auditor",
    "Anti-Fraud & Cyber Taskforce Lead",
    "AMMON Academy Accreditation Director"
  ],
  allowPartialPayments: true
};
function defaultPermissionsForLevel(level) {
  switch (level) {
    case "super_admin":
      return {
        canApproveMembers: true,
        canRegisterMembers: true,
        canAdjustPayments: true,
        canPublishAnnouncements: true,
        canSubmitReports: true,
        canReviewReports: true,
        canManageMeetings: true,
        canManageHierarchy: true,
        canManageExecutives: true,
        canViewAuditLogs: true,
        crossZoneAuthorized: true
      };
    case "national":
      return {
        canApproveMembers: true,
        canRegisterMembers: true,
        canAdjustPayments: false,
        canPublishAnnouncements: true,
        canSubmitReports: true,
        canReviewReports: true,
        canManageMeetings: true,
        canManageHierarchy: false,
        canManageExecutives: false,
        canViewAuditLogs: true,
        crossZoneAuthorized: true
      };
    case "zonal":
      return {
        canApproveMembers: true,
        canRegisterMembers: true,
        canAdjustPayments: false,
        canPublishAnnouncements: true,
        canSubmitReports: true,
        canReviewReports: true,
        canManageMeetings: true,
        canManageHierarchy: false,
        canManageExecutives: false,
        canViewAuditLogs: false,
        crossZoneAuthorized: false
      };
    case "state":
      return {
        canApproveMembers: true,
        canRegisterMembers: true,
        canAdjustPayments: false,
        canPublishAnnouncements: true,
        canSubmitReports: true,
        canReviewReports: true,
        canManageMeetings: true,
        canManageHierarchy: false,
        canManageExecutives: false,
        canViewAuditLogs: false,
        crossZoneAuthorized: false
      };
    case "lga":
      return {
        canApproveMembers: false,
        canRegisterMembers: true,
        canAdjustPayments: false,
        canPublishAnnouncements: true,
        canSubmitReports: true,
        canReviewReports: true,
        canManageMeetings: true,
        canManageHierarchy: false,
        canManageExecutives: false,
        canViewAuditLogs: false,
        crossZoneAuthorized: false
      };
    case "ward":
      return {
        canApproveMembers: false,
        canRegisterMembers: true,
        canAdjustPayments: false,
        canPublishAnnouncements: false,
        canSubmitReports: true,
        canReviewReports: true,
        canManageMeetings: false,
        canManageHierarchy: false,
        canManageExecutives: false,
        canViewAuditLogs: false,
        crossZoneAuthorized: false
      };
    case "community":
      return {
        canApproveMembers: false,
        canRegisterMembers: true,
        canAdjustPayments: false,
        canPublishAnnouncements: false,
        canSubmitReports: true,
        canReviewReports: false,
        canManageMeetings: false,
        canManageHierarchy: false,
        canManageExecutives: false,
        canViewAuditLogs: false,
        crossZoneAuthorized: false
      };
    case "specialized":
      return {
        canApproveMembers: false,
        canRegisterMembers: false,
        canAdjustPayments: true,
        canPublishAnnouncements: true,
        canSubmitReports: true,
        canReviewReports: true,
        canManageMeetings: true,
        canManageHierarchy: false,
        canManageExecutives: false,
        canViewAuditLogs: true,
        crossZoneAuthorized: true
      };
  }
}
function formatJurisdictionLabel(exec) {
  switch (exec.level) {
    case "super_admin":
      return "National Headquarters (36 States + FCT)";
    case "national":
      return "Nationwide — All 6 Zones, 36 States & FCT";
    case "zonal":
      return `${exec.assignedZone || "South-South"} Geopolitical Zone`;
    case "state":
      return `${exec.assignedState || "Bayelsa"} State`;
    case "lga":
      return `${exec.assignedLga || "Yenagoa"} LGA, ${exec.assignedState || "Bayelsa"} State`;
    case "ward":
      return `${exec.assignedWard || "Epie Ward 1"}, ${exec.assignedLga || "Yenagoa"} LGA, ${exec.assignedState || "Bayelsa"} State`;
    case "community":
      return `${exec.assignedCommunity || "Amarata Community"} (${exec.assignedWard || "Epie Ward 1"}), ${exec.assignedLga || "Yenagoa"} LGA`;
    case "specialized":
      return exec.specialtyScope || "National Legal & Compliance Directorate";
    default:
      return "AMMON Directorate";
  }
}
const INITIAL_EXECUTIVE_ACCOUNTS = [
  {
    id: "exec-super",
    fullName: "Dr. Victor O. Babatunde",
    role: "Super Admin",
    level: "super_admin",
    title: "National President & Registrar-General",
    position: "National President & Super Administrator",
    email: "superadmin@ammon.ng",
    phone: "+234 800 266 6661",
    defaultPassword: "admin2025",
    jurisdiction: "National Headquarters (36 States + FCT)",
    badgeNumber: "AMMON-HQ-001",
    activationStatus: "Active",
    requiresPasswordSetup: false,
    permissions: defaultPermissionsForLevel("super_admin"),
    createdAt: "2024-01-10"
  },
  {
    id: "exec-national",
    fullName: "Alhaji Babaginda O. Sani",
    role: "Executive",
    level: "national",
    title: "National Secretary General",
    position: "National Secretary General",
    email: "executive@ammon.ng",
    phone: "+234 800 266 6662",
    defaultPassword: "exec2025",
    jurisdiction: "Nationwide — All 6 Zones, 36 States & FCT",
    badgeNumber: "AMMON-NAT-002",
    activationStatus: "Active",
    requiresPasswordSetup: false,
    permissions: defaultPermissionsForLevel("national"),
    createdAt: "2024-01-12"
  },
  {
    id: "exec-zonal-ss",
    fullName: "Chief Emeka Nwosu",
    role: "Executive",
    level: "zonal",
    title: "South-South Zonal Vice President",
    position: "Zonal Vice President (South-South)",
    email: "zonal.southsouth@ammon.ng",
    phone: "+234 803 771 2201",
    defaultPassword: "zonal2025",
    assignedZone: "South-South",
    jurisdiction: "South-South Geopolitical Zone",
    badgeNumber: "AMMON-ZON-SS-01",
    activationStatus: "Active",
    requiresPasswordSetup: false,
    permissions: defaultPermissionsForLevel("zonal"),
    createdAt: "2024-03-04"
  },
  {
    id: "exec-state-by",
    fullName: "Hon. Preye Timipre Silva",
    role: "Executive",
    level: "state",
    title: "Bayelsa State Chapter Chairman",
    position: "State Chairman",
    email: "bayelsa.state@ammon.ng",
    phone: "+234 806 554 9081",
    defaultPassword: "state2025",
    assignedZone: "South-South",
    assignedState: "Bayelsa",
    jurisdiction: "Bayelsa State",
    badgeNumber: "AMMON-BY-001",
    activationStatus: "Active",
    requiresPasswordSetup: false,
    permissions: defaultPermissionsForLevel("state"),
    createdAt: "2024-04-15"
  },
  {
    id: "exec-lga-yen",
    fullName: "Comrade Tari Ebiye",
    role: "Executive",
    level: "lga",
    title: "Yenagoa LGA Coordinator",
    position: "LGA Chapter Coordinator",
    email: "yenagoa.lga@ammon.ng",
    phone: "+234 814 220 3319",
    defaultPassword: "lga2025",
    assignedZone: "South-South",
    assignedState: "Bayelsa",
    assignedLga: "Yenagoa",
    jurisdiction: "Yenagoa LGA, Bayelsa State",
    badgeNumber: "AMMON-BY-YEN-01",
    activationStatus: "Active",
    requiresPasswordSetup: false,
    permissions: defaultPermissionsForLevel("lga"),
    createdAt: "2024-05-20"
  },
  {
    id: "exec-ward-epie1",
    fullName: "Mrs. Ebikaboere Dokubo",
    role: "Executive",
    level: "ward",
    title: "Epie Ward 1 Executive Lead",
    position: "Ward Executive Chairman",
    email: "epie1.ward@ammon.ng",
    phone: "+234 805 991 0421",
    defaultPassword: "ward2025",
    assignedZone: "South-South",
    assignedState: "Bayelsa",
    assignedLga: "Yenagoa",
    assignedWard: "Epie Ward 1",
    jurisdiction: "Epie Ward 1, Yenagoa LGA, Bayelsa State",
    badgeNumber: "AMMON-BY-WRD-01",
    activationStatus: "Active",
    requiresPasswordSetup: false,
    permissions: defaultPermissionsForLevel("ward"),
    createdAt: "2024-06-11"
  },
  {
    id: "exec-comm-amarata",
    fullName: "Mr. Pereowei Owei",
    role: "Executive",
    level: "community",
    title: "Amarata Community Lead",
    position: "Community Unit Lead",
    email: "amarata.comm@ammon.ng",
    phone: "+234 703 812 7730",
    defaultPassword: "comm2025",
    assignedZone: "South-South",
    assignedState: "Bayelsa",
    assignedLga: "Yenagoa",
    assignedWard: "Epie Ward 1",
    assignedCommunity: "Amarata Community",
    jurisdiction: "Amarata Community (Epie Ward 1), Yenagoa LGA",
    badgeNumber: "AMMON-BY-COM-01",
    activationStatus: "Active",
    requiresPasswordSetup: false,
    permissions: defaultPermissionsForLevel("community"),
    createdAt: "2024-07-02"
  },
  {
    id: "exec-spec-legal",
    fullName: "Barr. Ngozi Okafor",
    role: "Executive",
    level: "specialized",
    title: "National Legal Defense & Financial Audit Counsel",
    position: "National Legal Defense & Audit Officer",
    email: "legal.audit@ammon.ng",
    phone: "+234 809 300 4411",
    defaultPassword: "legal2025",
    specialtyScope: "National Legal Defense, Compliance & Financial Audit",
    jurisdiction: "National Legal & Compliance Directorate",
    badgeNumber: "AMMON-SPEC-01",
    activationStatus: "Active",
    requiresPasswordSetup: false,
    permissions: defaultPermissionsForLevel("specialized"),
    createdAt: "2024-03-19"
  }
];
const EXPANDED_INITIAL_MEMBERS = [];
const INITIAL_EXECUTIVE_REPORTS = [];
const INITIAL_ANNOUNCEMENTS = [];
const INITIAL_FINANCIAL_ADJUSTMENTS = [];
const INITIAL_AUDIT_LOGS = [];
export {
  EXPANDED_INITIAL_MEMBERS,
  INITIAL_ADMINISTRATIVE_LEVELS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EXECUTIVE_ACCOUNTS,
  INITIAL_EXECUTIVE_REPORTS,
  INITIAL_FINANCIAL_ADJUSTMENTS,
  INITIAL_HIERARCHY_CONFIG,
  NIGERIA_ZONES,
  STATE_TO_ZONE,
  defaultPermissionsForLevel,
  formatJurisdictionLabel,
  resolveZoneForState
};
