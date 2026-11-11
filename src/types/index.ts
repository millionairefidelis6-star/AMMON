export type MembershipCategory = 
  | 'POS Agents'
  | 'Super Agents'
  | 'Fintech Companies'
  | 'Distributors'
  | 'Corporate Members'
  | 'Other Stakeholders';

export interface Member {
  id: string;
  membershipId: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  state: string;
  lga: string;
  category: MembershipCategory;
  tier: string;
  terminalSerialNumber: string;
  terminalProvider: string;
  bvnVerified: boolean;
  cbnCompliant: boolean;
  status: 'Active' | 'Pending Verification' | 'Expired' | 'Suspended';
  joinedDate: string;
  expiryDate: string;
  photoUrl?: string;
  duesPaid: boolean;
  duesAmount: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: 'Breaking News' | 'Regulatory' | 'Press Release' | 'Notice' | 'Academy';
  excerpt: string;
  content: string;
  date: string;
  author: string;
  image: string;
  featured?: boolean;
  readTime: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentData?: string;
}

export interface EventItem {
  id: string;
  title: string;
  month: string;
  day: string;
  year: string;
  time: string;
  location: string;
  city: string;
  description: string;
  attendeesCount: number;
  category: 'National Conference' | 'Workshop' | 'Roundtable' | 'Webinar';
  registrationOpen: boolean;
}

export interface DisputeTicket {
  id: string;
  ticketNumber: string;
  agentId: string;
  agentName: string;
  businessName: string;
  phone: string;
  issueType: 'Police / Taskforce Harassment' | 'Illegal LGA Levy' | 'Frozen Terminal Wallet' | 'Chargeback Fraud' | 'Unresolved Bank Dispute';
  state: string;
  status: 'Open' | 'Under Investigation' | 'Resolved';
  dateReported: string;
  description: string;
}

export type AdminRole = 'Super Admin' | 'Executive';

export interface AdminUser {
  id: string;
  fullName: string;
  role: AdminRole;
  title: string;
  email: string;
  phone: string;
  jurisdiction: string;
  badgeNumber: string;
  avatarUrl?: string;
}

