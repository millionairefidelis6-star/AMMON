import { Member, NewsArticle, EventItem, DisputeTicket } from '../types';

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-1',
    membershipId: 'AMMON-LAG-2025-08492',
    fullName: 'Chinedu Kolawole Eze',
    businessName: 'Kolawole Ventures & POS Terminal Hub',
    email: 'kolawole.pos@gmail.com',
    phone: '+234 803 456 7890',
    state: 'Lagos',
    lga: 'Ikeja',
    category: 'POS Agents',
    tier: 'Tier 2 Certified Agent',
    terminalSerialNumber: 'MP-NG-992014',
    terminalProvider: 'Moniepoint / OPay',
    bvnVerified: true,
    cbnCompliant: true,
    status: 'Active',
    joinedDate: '15 Jan 2023',
    expiryDate: '31 Dec 2026',
    photoUrl: '/src/assets/images/ammon_hero_pos_agent_1794380620175.jpg',
    duesPaid: true,
    duesAmount: 15000,
  },
  {
    id: 'mem-2',
    membershipId: 'AMMON-ABJ-2025-01042',
    fullName: 'Amina Fatima Bello',
    businessName: 'Bello Digital Pay Services',
    email: 'amina.bello@digitalpay.ng',
    phone: '+234 812 345 6789',
    state: 'FCT Abuja',
    lga: 'Municipal (AMAC)',
    category: 'Super Agents',
    tier: 'Tier 3 Master Aggregator',
    terminalSerialNumber: 'OP-ABJ-44318',
    terminalProvider: 'OPay & PalmPay',
    bvnVerified: true,
    cbnCompliant: true,
    status: 'Active',
    joinedDate: '03 Feb 2024',
    expiryDate: '31 Dec 2026',
    photoUrl: '/src/assets/images/ammon_hero_pos_agent_1794380620175.jpg',
    duesPaid: true,
    duesAmount: 50000,
  },
  {
    id: 'mem-3',
    membershipId: 'AMMON-KAN-2025-03120',
    fullName: 'Ibrahim Sanusi Musa',
    businessName: 'Kano Express Agent Banking',
    email: 'sanusi.kano@gmail.com',
    phone: '+234 802 987 6543',
    state: 'Kano',
    lga: 'Nassarawa',
    category: 'POS Agents',
    tier: 'Tier 1 Standard Agent',
    terminalSerialNumber: 'PP-KAN-11849',
    terminalProvider: 'PalmPay',
    bvnVerified: true,
    cbnCompliant: true,
    status: 'Active',
    joinedDate: '12 Apr 2024',
    expiryDate: '31 Dec 2026',
    photoUrl: '/src/assets/images/ammon_hero_pos_agent_1794380620175.jpg',
    duesPaid: true,
    duesAmount: 15000,
  },
  {
    id: 'mem-4',
    membershipId: 'AMMON-RIV-2025-05519',
    fullName: 'Blessing Tariere Jumbo',
    businessName: 'Port Harcourt QuickCash Hub',
    email: 'blessing.jumbo@phcquickcash.ng',
    phone: '+234 809 112 2334',
    state: 'Rivers',
    lga: 'Port Harcourt City',
    category: 'POS Agents',
    tier: 'Tier 2 Certified Agent',
    terminalSerialNumber: 'NX-PHC-87723',
    terminalProvider: 'Nomba / Kuda',
    bvnVerified: true,
    cbnCompliant: true,
    status: 'Active',
    joinedDate: '18 Nov 2023',
    expiryDate: '31 Dec 2026',
    photoUrl: '/src/assets/images/ammon_hero_pos_agent_1794380620175.jpg',
    duesPaid: true,
    duesAmount: 15000,
  }
];

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'CBN Updates Agent Banking Guidelines & Consumer Protection Mandate',
    category: 'Breaking News',
    excerpt: 'The Central Bank of Nigeria has issued enhanced operational guidelines for agent banking nationwide, establishing standardized transaction charges and mandatory AMMON identity verification.',
    content: `The Central Bank of Nigeria (CBN) in conjunction with the Bankers' Committee and the Association of Mobile Money Operators of Nigeria (AMMON) has released its 2025 Revised Guidelines on Agent Banking Operations.

Key directives in the new circular include:
1. Standardized Fee Transparency: All mobile money and POS agent locations must visibly display the approved AMMON tariff advisory board to eliminate arbitrary surcharges on cash withdrawals.
2. Operator Identity Verification: All POS terminals operating in public kiosks must be linked to a verifiable AMMON Digital ID card and registered with the Corporate Affairs Commission (CAC).
3. Enhanced Fraud Reporting Protocol: Banks and mobile money operators are mandated to freeze disputed fraudulent transaction accounts within 15 minutes of an AMMON alert.
4. Protection against Illegal Council Levies: The Federal Government reaffirms that POS operators are exempt from arbitrary daily local government ticket levies.

National President of AMMON commended the Central Bank for institutionalizing agent safety and standardizing consumer trust across Nigeria's 774 Local Government Areas.`,
    date: 'Nov 10, 2025',
    author: 'AMMON National Secretariat',
    image: '/src/assets/images/cbn_headquarters_abuja_1794380622253.jpg',
    featured: true,
    readTime: '3 min read',
  },
  {
    id: 'news-2',
    title: 'AMMON Holds National Stakeholders Forum with NIBSS & Payment Gateways',
    category: 'Press Release',
    excerpt: 'High-level dialogue in Lagos addresses network downtime, instant dispute resolution, and reducing terminal transaction failure rates.',
    content: `Leadership of AMMON met yesterday with senior executives of Nigeria Inter-Bank Settlement System (NIBSS), leading fintech aggregators, and commercial banks to agree on a 5-point action plan aimed at eliminating reverse-transaction delays and boosting POS uptime to 99.8%.`,
    date: 'Nov 8, 2025',
    author: 'Public Relations Directorate',
    image: '/src/assets/images/ammon_stakeholders_forum_1794380623181.jpg',
    featured: false,
    readTime: '4 min read',
  },
  {
    id: 'news-3',
    title: 'New Training Modules on POS Fraud Prevention Launched on AMMON Academy',
    category: 'Academy',
    excerpt: 'Certified online courses to equip 50,000 operators with modern skills to detect fake bank alerts, pin skimming, and social engineering scams.',
    content: `AMMON Academy has unveiled its Q4 2025 Anti-Fraud Masterclass for all registered members. The curriculum includes practical detection of counterfeit currency, simulated bank alert verification, and protocol for handling attempted ATM card swaps.`,
    date: 'Nov 5, 2025',
    author: 'Director of Training & Education',
    image: '/src/assets/images/ammon_hero_pos_agent_1794380620175.jpg',
    featured: false,
    readTime: '2 min read',
  },
  {
    id: 'news-4',
    title: '2025 Annual AMMON National Conference Set for Eko Hotel Lagos',
    category: 'Notice',
    excerpt: 'Over 5,000 delegates, regulatory dignitaries, and fintech pioneers will convene under the theme "Empowering Financial Inclusion for a Digital Economy".',
    content: `Registration is officially open for the flagship annual gathering of Nigeria's agent banking community. Early bird accreditation is now active for state chapters across all 36 states and the Federal Capital Territory.`,
    date: 'Nov 1, 2025',
    author: 'National Organizing Committee',
    image: '/src/assets/images/lagos_lekki_bridge_skyline_1794380622729.jpg',
    featured: false,
    readTime: '3 min read',
  }
];

export const UPCOMING_EVENTS: EventItem[] = [
  {
    id: 'evt-1',
    title: 'AMMON National Conference 2025',
    month: 'NOV',
    day: '28',
    year: '2025',
    time: '09:00 AM - 05:00 PM WAT',
    location: 'Grand Ballroom, Eko Hotel & Suites, Victoria Island',
    city: 'Lagos, Nigeria',
    description: 'The premier convention of Nigerian mobile money operators, financial regulators, POS aggregators, and fintech innovators.',
    attendeesCount: 4250,
    category: 'National Conference',
    registrationOpen: true,
  },
  {
    id: 'evt-2',
    title: 'POS Agents Workshop for Greater Productivity & Security',
    month: 'DEC',
    day: '12',
    year: '2025',
    time: '10:00 AM - 03:00 PM WAT',
    location: 'LCCI Exhibition Centre, Ikeja',
    city: 'Lagos, Nigeria',
    description: 'Hands-on training session on bookkeeping, tax compliance, terminal dispute resolution, and cybersecurity protocols for retail operators.',
    attendeesCount: 1100,
    category: 'Workshop',
    registrationOpen: true,
  },
  {
    id: 'evt-3',
    title: 'Fintech & Super-Agent Regulatory Roundtable 2026',
    month: 'JAN',
    day: '18',
    year: '2026',
    time: '11:00 AM - 04:00 PM WAT',
    location: 'Transcorp Hilton Congress Hall',
    city: 'Abuja (FCT), Nigeria',
    description: 'Executive policy formulation session between AMMON Executive Council, CBN Banking Supervision Department, and Super Agent directors.',
    attendeesCount: 480,
    category: 'Roundtable',
    registrationOpen: true,
  }
];

export const MEMBERSHIP_CATEGORIES_DATA = [
  {
    id: 'pos-agents',
    name: 'POS Agents',
    code: 'TIER-1',
    description: 'Individual retail operators, merchant kiosks, and neighborhood financial service touchpoints providing cash-in, cash-out, and bill payments.',
    annualDues: '₦15,000 / year',
    benefits: [
      'Official AMMON Digital ID Card & QR Verification',
      'Legal defense protection against illegal local council harassment',
      'Access to AMMON Academy fraud prevention training',
      'Group life and business emergency welfare insurance',
      'Standardized tariff advisory branding for your kiosk'
    ],
    requirements: ['Valid NIN or BVN', 'Proof of business location', 'Active POS terminal serial number', 'CAC Business Name certificate (or 3-month grace)']
  },
  {
    id: 'super-agents',
    name: 'Super Agents',
    code: 'TIER-2',
    description: 'Aggregators, regional coordinators, and enterprise agent network managers supervising 50 or more active sub-agent retail outlets.',
    annualDues: '₦50,000 / year',
    benefits: [
      'Bulk sub-agent accreditation & verification portal access',
      'Priority mediation desk with CBN and major commercial banks',
      'Dedicated state chapter executive voting privileges',
      'Quarterly macroeconomic & liquidity dispatch reports',
      'Discounted bulk terminal procurement with hardware OEM partners'
    ],
    requirements: ['CBN Super Agent License / Sub-aggregator contract', 'Minimum 50 deployed terminals', 'CAC Company Registration', 'Dedicated compliance officer']
  },
  {
    id: 'fintech-companies',
    name: 'Fintech Companies',
    code: 'CORPORATE',
    description: 'Licensed Mobile Money Operators (MMOs), Switching Companies, Payment Service Banks (PSBs), and Payment Solution Service Providers (PSSPs).',
    annualDues: '₦250,000 / year',
    benefits: [
      'Direct strategic alignment with 140,000+ grassroot operators',
      'Joint regulatory advocacy on cash availability and interchange tariffs',
      'Co-branded nationwide fraud awareness campaigns',
      'Annual AMMON National Conference sponsorship headline slot',
      'Real-time field feedback on terminal hardware and software telemetry'
    ],
    requirements: ['CBN Operating License (MMO / PSB / Switch)', 'Audited financial statements', 'Anti-Money Laundering (AML/CFT) policy']
  },
  {
    id: 'distributors',
    name: 'Distributors',
    code: 'HARDWARE',
    description: 'Authorized terminal equipment suppliers, thermal paper roll manufacturers, solar power backup providers, and kiosk fabricators.',
    annualDues: '₦75,000 / year',
    benefits: [
      'Exclusive vendor directory listing on the AMMON Member Portal',
      'Direct tender participation for association-wide equipment supply',
      'Booth privileges at all national and state chapter exhibitions',
      'Verified equipment certification seal on vetted hardware'
    ],
    requirements: ['CAC Certificate of Incorporation', 'Terminal OEM authorization or manufacturing credentials', 'Quality guarantee assurance']
  },
  {
    id: 'corporate-members',
    name: 'Corporate Members',
    code: 'INSTITUTIONAL',
    description: 'Commercial deposit money banks, microfinance institutions, insurance companies, and payment card schemes.',
    annualDues: '₦350,000 / year',
    benefits: [
      'Direct agency banking expansion pipeline across 774 LGAs',
      'Enhanced account opening & financial literacy partnership drives',
      'Joint dispute resolution SLA for cardholder chargebacks',
      'Representation on the AMMON National Advisory Council'
    ],
    requirements: ['CBN Banking License', 'Designated Agent Banking Division liaison']
  },
  {
    id: 'other-stakeholders',
    name: 'Other Stakeholders',
    code: 'ASSOCIATE',
    description: 'Consumer advocacy groups, academic researchers, legal consultancies, donor agencies, and financial inclusion NGOs.',
    annualDues: '₦30,000 / year',
    benefits: [
      'Access to AMMON national agent banking research papers & data',
      'Observer status at general assembly sessions',
      'Collaborative financial inclusion initiative development'
    ],
    requirements: ['Official organization profile', 'Statement of interest in Nigerian financial inclusion']
  }
];

export const INITIAL_DISPUTES: DisputeTicket[] = [
  {
    id: 'disp-1',
    ticketNumber: 'AMMON-DISP-2025-0012',
    agentId: 'AMMON-LAG-2025-08492',
    agentName: 'Chinedu Kolawole Eze',
    businessName: 'Kolawole Ventures POS',
    phone: '+234 803 456 7890',
    issueType: 'Illegal LGA Levy',
    state: 'Lagos',
    status: 'Under Investigation',
    dateReported: 'Nov 09, 2025',
    description: 'Local council revenue agents in Ikeja demanding ₦2,000 daily commercial permit fee despite Federal High Court ruling exempting agent kiosks.',
  },
  {
    id: 'disp-2',
    ticketNumber: 'AMMON-DISP-2025-0008',
    agentId: 'AMMON-ABJ-2025-01042',
    agentName: 'Amina Fatima Bello',
    businessName: 'Bello Digital Pay',
    phone: '+234 812 345 6789',
    issueType: 'Frozen Terminal Wallet',
    state: 'FCT Abuja',
    status: 'Resolved',
    dateReported: 'Nov 04, 2025',
    description: 'Partner aggregator locked wallet due to automated false-positive fraud trigger on ₦850,000 legitimate corporate payroll cash-out. Unfrozen within 24h via AMMON escalation.',
  }
];

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export const ADMIN_USERS = [
  {
    id: 'admin-super',
    fullName: 'Dr. Victor O. Babatunde',
    role: 'Super Admin' as const,
    title: 'National President & Registrar-General',
    email: 'superadmin@ammon.ng',
    phone: '+234 800 266 6661',
    password: 'admin2025',
    jurisdiction: 'National Headquarters (36 States + FCT)',
    badgeNumber: 'AMMON-HQ-001',
    avatarUrl: '/src/assets/images/ammon_stakeholders_forum_1794380623181.jpg',
  },
  {
    id: 'admin-exec',
    fullName: 'Alhaji Babaginda O. Sani',
    role: 'Executive' as const,
    title: 'National Secretary General',
    email: 'executive@ammon.ng',
    phone: '+234 800 266 6662',
    password: 'exec2025',
    jurisdiction: 'National Executive Directorate',
    badgeNumber: 'AMMON-EXEC-002',
    avatarUrl: '/src/assets/images/ammon_stakeholders_forum_1794380623181.jpg',
  }
];

export const TEST_ADMIN_CREDENTIALS = [
  {
    role: 'Super Admin',
    name: 'Dr. Victor O. Babatunde',
    email: 'superadmin@ammon.ng',
    password: 'admin2025',
    badge: 'National Super Admin',
    description: 'Full administrative access, operator approvals, security logs & treasury audit',
  },
  {
    role: 'Executive',
    name: 'Alhaji Babaginda O. Sani',
    email: 'executive@ammon.ng',
    password: 'exec2025',
    badge: 'National Executive Council',
    description: 'Registry governance, circular publishing & legal aid arbitration',
  }
];

