import { EXPANDED_INITIAL_MEMBERS, INITIAL_EXECUTIVE_ACCOUNTS } from "./hierarchyData.js";
const INITIAL_MEMBERS = EXPANDED_INITIAL_MEMBERS;
const NEWS_ARTICLES = [
  {
    id: "news-1",
    title: "CBN Updates Agent Banking Guidelines & Consumer Protection Mandate",
    category: "Breaking News",
    excerpt: "The Central Bank of Nigeria has issued enhanced operational guidelines for agent banking nationwide, establishing standardized transaction charges and mandatory AMMON identity verification.",
    content: `The Central Bank of Nigeria (CBN) in conjunction with the Bankers' Committee and the Association of Mobile Money Operators of Nigeria (AMMON) has released its 2025 Revised Guidelines on Agent Banking Operations.

Key directives in the new circular include:
1. Standardized Fee Transparency: All mobile money and POS agent locations must visibly display the approved AMMON tariff advisory board to eliminate arbitrary surcharges on cash withdrawals.
2. Operator Identity Verification: All POS terminals operating in public kiosks must be linked to a verifiable AMMON Digital ID card and registered with the Corporate Affairs Commission (CAC).
3. Enhanced Fraud Reporting Protocol: Banks and mobile money operators are mandated to freeze disputed fraudulent transaction accounts within 15 minutes of an AMMON alert.
4. Protection against Illegal Council Levies: The Federal Government reaffirms that POS operators are exempt from arbitrary daily local government ticket levies.

National President of AMMON commended the Central Bank for institutionalizing agent safety and standardizing consumer trust across Nigeria's 774 Local Government Areas.`,
    date: "Nov 10, 2025",
    author: "AMMON National Secretariat",
    image: "/assets/images/cbn_headquarters_abuja_1794380622253.jpg",
    featured: true,
    readTime: "3 min read"
  },
  {
    id: "news-2",
    title: "AMMON Holds National Stakeholders Forum with NIBSS & Payment Gateways",
    category: "Press Release",
    excerpt: "High-level dialogue in Lagos addresses network downtime, instant dispute resolution, and reducing terminal transaction failure rates.",
    content: `Leadership of AMMON met yesterday with senior executives of Nigeria Inter-Bank Settlement System (NIBSS), leading fintech aggregators, and commercial banks to agree on a 5-point action plan aimed at eliminating reverse-transaction delays and boosting POS uptime to 99.8%.`,
    date: "Nov 8, 2025",
    author: "Public Relations Directorate",
    image: "/assets/images/ammon_stakeholders_forum_1794380623181.jpg",
    featured: false,
    readTime: "4 min read"
  },
  {
    id: "news-3",
    title: "New Training Modules on POS Fraud Prevention Launched on AMMON Academy",
    category: "Academy",
    excerpt: "Certified online courses to equip 50,000 operators with modern skills to detect fake bank alerts, pin skimming, and social engineering scams.",
    content: `AMMON Academy has unveiled its Q4 2025 Anti-Fraud Masterclass for all registered members. The curriculum includes practical detection of counterfeit currency, simulated bank alert verification, and protocol for handling attempted ATM card swaps.`,
    date: "Nov 5, 2025",
    author: "Director of Training & Education",
    image: "/assets/images/ammon_hero_pos_agent_1794380620175.jpg",
    featured: false,
    readTime: "2 min read"
  },
  {
    id: "news-4",
    title: "2025 Annual AMMON National Conference Set for Eko Hotel Lagos",
    category: "Notice",
    excerpt: 'Over 5,000 delegates, regulatory dignitaries, and fintech pioneers will convene under the theme "Empowering Financial Inclusion for a Digital Economy".',
    content: `Registration is officially open for the flagship annual gathering of Nigeria's agent banking community. Early bird accreditation is now active for state chapters across all 36 states and the Federal Capital Territory.`,
    date: "Nov 1, 2025",
    author: "National Organizing Committee",
    image: "/assets/images/lagos_lekki_bridge_skyline_1794380622729.jpg",
    featured: false,
    readTime: "3 min read"
  }
];
const UPCOMING_EVENTS = [
  {
    id: "evt-1",
    title: "AMMON National Conference 2025",
    month: "NOV",
    day: "28",
    year: "2025",
    time: "09:00 AM - 05:00 PM WAT",
    location: "Grand Ballroom, Eko Hotel & Suites, Victoria Island",
    city: "Lagos, Nigeria",
    description: "The premier convention of Nigerian mobile money operators, financial regulators, POS aggregators, and fintech innovators.",
    attendeesCount: 4250,
    category: "National Conference",
    registrationOpen: true
  },
  {
    id: "evt-2",
    title: "POS Agents Workshop for Greater Productivity & Security",
    month: "DEC",
    day: "12",
    year: "2025",
    time: "10:00 AM - 03:00 PM WAT",
    location: "LCCI Exhibition Centre, Ikeja",
    city: "Lagos, Nigeria",
    description: "Hands-on training session on bookkeeping, tax compliance, terminal dispute resolution, and cybersecurity protocols for retail operators.",
    attendeesCount: 1100,
    category: "Workshop",
    registrationOpen: true
  },
  {
    id: "evt-3",
    title: "Fintech & Super-Agent Regulatory Roundtable 2026",
    month: "JAN",
    day: "18",
    year: "2026",
    time: "11:00 AM - 04:00 PM WAT",
    location: "Transcorp Hilton Congress Hall",
    city: "Abuja (FCT), Nigeria",
    description: "Executive policy formulation session between AMMON Executive Council, CBN Banking Supervision Department, and Super Agent directors.",
    attendeesCount: 480,
    category: "Roundtable",
    registrationOpen: true
  }
];
const MEMBERSHIP_CATEGORIES_DATA = [
  {
    id: "pos-agents",
    name: "POS Agents",
    code: "TIER-1",
    description: "Individual retail operators, merchant kiosks, and neighborhood financial service touchpoints providing cash-in, cash-out, and bill payments.",
    annualDues: "₦15,000 / year",
    benefits: [
      "Official AMMON Digital ID Card & QR Verification",
      "Legal defense protection against illegal local council harassment",
      "Access to AMMON Academy fraud prevention training",
      "Group life and business emergency welfare insurance",
      "Standardized tariff advisory branding for your kiosk"
    ],
    requirements: ["Valid NIN or BVN", "Proof of business location", "Active POS terminal serial number", "CAC Business Name certificate (or 3-month grace)"]
  },
  {
    id: "super-agents",
    name: "Super Agents",
    code: "TIER-2",
    description: "Aggregators, regional coordinators, and enterprise agent network managers supervising 50 or more active sub-agent retail outlets.",
    annualDues: "₦50,000 / year",
    benefits: [
      "Bulk sub-agent accreditation & verification portal access",
      "Priority mediation desk with CBN and major commercial banks",
      "Dedicated state chapter executive voting privileges",
      "Quarterly macroeconomic & liquidity dispatch reports",
      "Discounted bulk terminal procurement with hardware OEM partners"
    ],
    requirements: ["CBN Super Agent License / Sub-aggregator contract", "Minimum 50 deployed terminals", "CAC Company Registration", "Dedicated compliance officer"]
  },
  {
    id: "fintech-companies",
    name: "Fintech Companies",
    code: "CORPORATE",
    description: "Licensed Mobile Money Operators (MMOs), Switching Companies, Payment Service Banks (PSBs), and Payment Solution Service Providers (PSSPs).",
    annualDues: "₦250,000 / year",
    benefits: [
      "Direct strategic alignment with grassroots POS operators nationwide",
      "Joint regulatory advocacy on cash availability and interchange tariffs",
      "Co-branded nationwide fraud awareness campaigns",
      "Annual AMMON National Conference sponsorship headline slot",
      "Real-time field feedback on terminal hardware and software telemetry"
    ],
    requirements: ["CBN Operating License (MMO / PSB / Switch)", "Audited financial statements", "Anti-Money Laundering (AML/CFT) policy"]
  },
  {
    id: "distributors",
    name: "Distributors",
    code: "HARDWARE",
    description: "Authorized terminal equipment suppliers, thermal paper roll manufacturers, solar power backup providers, and kiosk fabricators.",
    annualDues: "₦75,000 / year",
    benefits: [
      "Exclusive vendor directory listing on the AMMON Member Portal",
      "Direct tender participation for association-wide equipment supply",
      "Booth privileges at all national and state chapter exhibitions",
      "Verified equipment certification seal on vetted hardware"
    ],
    requirements: ["CAC Certificate of Incorporation", "Terminal OEM authorization or manufacturing credentials", "Quality guarantee assurance"]
  },
  {
    id: "corporate-members",
    name: "Corporate Members",
    code: "INSTITUTIONAL",
    description: "Commercial deposit money banks, microfinance institutions, insurance companies, and payment card schemes.",
    annualDues: "₦350,000 / year",
    benefits: [
      "Direct agency banking expansion pipeline across 774 LGAs",
      "Enhanced account opening & financial literacy partnership drives",
      "Joint dispute resolution SLA for cardholder chargebacks",
      "Representation on the AMMON National Advisory Council"
    ],
    requirements: ["CBN Banking License", "Designated Agent Banking Division liaison"]
  },
  {
    id: "other-stakeholders",
    name: "Other Stakeholders",
    code: "ASSOCIATE",
    description: "Consumer advocacy groups, academic researchers, legal consultancies, donor agencies, and financial inclusion NGOs.",
    annualDues: "₦30,000 / year",
    benefits: [
      "Access to AMMON national agent banking research papers & data",
      "Observer status at general assembly sessions",
      "Collaborative financial inclusion initiative development"
    ],
    requirements: ["Official organization profile", "Statement of interest in Nigerian financial inclusion"]
  }
];
const INITIAL_DISPUTES = [];
const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara"
];
const ADMIN_USERS = INITIAL_EXECUTIVE_ACCOUNTS.map((exec) => ({
  ...exec,
  password: exec.defaultPassword,
  avatarUrl: "/assets/images/ammon_stakeholders_forum_1794380623181.jpg"
}));
const TEST_ADMIN_CREDENTIALS = [
  {
    role: "Super Admin",
    name: "Millionaire Fidelis",
    email: "millionairefidelis@gmail.com",
    password: "admin2025",
    badge: "National Secretary General & Super Administrator",
    description: "Full administrative access, operator approvals, security logs & treasury audit"
  },
  {
    role: "Executive",
    name: "Alhaji Babaginda O. Sani",
    email: "executive@ammon.ng",
    password: "exec2025",
    badge: "National Executive Council",
    description: "Registry governance, circular publishing & legal aid arbitration"
  }
];
const SOCIAL_CHANNELS = [
  {
    id: "national-hub",
    name: "National Operators Hub",
    description: "Official AMMON nationwide POS & mobile money community",
    badge: "36 States",
    category: "National"
  },
  {
    id: "lagos-chapter",
    name: "Lagos State Chapter",
    description: "Ikeja, Lekki, Island & Mainland agent coordination",
    badge: "Lagos",
    category: "State Chapter"
  },
  {
    id: "cbn-regulatory",
    name: "CBN & NIBSS Circulars",
    description: "Live regulatory updates, tariffs & compliance Q&A",
    badge: "Official",
    category: "Regulatory"
  },
  {
    id: "fraud-watch",
    name: "Anti-Fraud & Legal Watch",
    description: "Report fake alerts, LGA harassment & wallet holds",
    badge: "24/7 Desk",
    category: "Support"
  }
];
const INITIAL_SOCIAL_MESSAGES = [];
const INITIAL_MEETINGS = [];
export {
  ADMIN_USERS,
  INITIAL_DISPUTES,
  INITIAL_MEETINGS,
  INITIAL_MEMBERS,
  INITIAL_SOCIAL_MESSAGES,
  MEMBERSHIP_CATEGORIES_DATA,
  NEWS_ARTICLES,
  NIGERIAN_STATES,
  SOCIAL_CHANNELS,
  TEST_ADMIN_CREDENTIALS,
  UPCOMING_EVENTS
};
