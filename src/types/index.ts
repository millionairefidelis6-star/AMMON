export type MembershipCategory = 
  | 'POS Agents'
  | 'Super Agents'
  | 'Fintech Companies'
  | 'Distributors'
  | 'Corporate Members'
  | 'Other Stakeholders';

export type PaymentStatus =
  | 'Paid'
  | 'Unpaid'
  | 'Partially Paid'
  | 'Payment Pending'
  | 'Expired'
  | 'Payment Verification Required';

export type ExecutiveLevel =
  | 'super_admin'
  | 'national'
  | 'zonal'
  | 'state'
  | 'lga'
  | 'ward'
  | 'community'
  | 'specialized';

export interface Member {
  id: string;
  membershipId: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  zone?: string;
  state: string;
  lga: string;
  ward?: string;
  community?: string;
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
  passportStoragePath?: string;
  kycDocumentType?: 'Government ID' | 'Business License';
  kycDocumentUrl?: string;
  kycDocumentStoragePath?: string;
  duesPaid: boolean;
  duesAmount: number;
  amountPaid?: number;
  paymentStatus?: PaymentStatus;
  paystackReference?: string;
  paystackVerified?: boolean;
  registeredByExecutiveId?: string;
  lastUpdatedBy?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  passwordHash?: string;
  passwordSalt?: string;
  otpHash?: string;
  otpExpiresAt?: number;
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
  zone?: string;
  state: string;
  lga?: string;
  status: 'Open' | 'Under Investigation' | 'Resolved';
  dateReported: string;
  description: string;
}

export type AdminRole = 'Super Admin' | 'Executive';

export interface ExecutivePermissions {
  canApproveMembers: boolean;
  canRegisterMembers: boolean;
  canAdjustPayments: boolean;
  canPublishAnnouncements: boolean;
  canSubmitReports: boolean;
  canReviewReports: boolean;
  canManageMeetings: boolean;
  canManageHierarchy: boolean;
  canManageExecutives: boolean;
  canViewAuditLogs: boolean;
  crossZoneAuthorized?: boolean;
}

export interface AdminUser {
  id: string;
  uid?: string;
  fullName: string;
  role: AdminRole;
  level?: ExecutiveLevel;
  title: string;
  position?: string;
  email: string;
  phone: string;
  jurisdiction: string;
  assignedZone?: string;
  assignedState?: string;
  assignedLga?: string;
  assignedWard?: string;
  assignedCommunity?: string;
  specialtyScope?: string;
  activationStatus?: 'Active' | 'Invited - Password Setup Required' | 'Suspended';
  requiresPasswordSetup?: boolean;
  inviteCode?: string;
  permissions?: ExecutivePermissions;
  badgeNumber: string;
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface ExecutiveReportComment {
  authorId: string;
  authorName: string;
  authorPosition: string;
  comment: string;
  timestamp: string;
}

export type ExecutiveReportType =
  | 'Membership Mobilization'
  | 'New Member Registration'
  | 'Dues Collection'
  | 'Meetings & Attendance'
  | 'Community Engagement'
  | 'Industry Issues & Complaints'
  | 'Monthly Activity';

export interface ExecutiveReport {
  id: string;
  title: string;
  reportType: ExecutiveReportType;
  summary: string;
  metrics?: {
    newRegistrations?: number;
    duesCollected?: number;
    meetingsHeld?: number;
    attendanceCount?: number;
  };
  submittedById: string;
  submittedByName: string;
  submittedByPosition: string;
  submittedByLevel: ExecutiveLevel;
  zone: string;
  state: string;
  lga: string;
  ward?: string;
  community?: string;
  routedToLevel: ExecutiveLevel;
  reviewStatus: 'Submitted' | 'Under Review' | 'Reviewed & Noted' | 'Escalated to Next Level' | 'Approved';
  administrativeComments: ExecutiveReportComment[];
  submittedAt: string;
  createdAtMs: number;
}

export interface ExecutiveAnnouncement {
  id: string;
  title: string;
  body: string;
  type: 'Announcement' | 'Notice' | 'Meeting Invitation' | 'Compliance Directive';
  senderId: string;
  senderName: string;
  senderPosition: string;
  senderLevel: ExecutiveLevel;
  targetLevel: 'all' | ExecutiveLevel;
  targetZone?: string;
  targetState?: string;
  targetLga?: string;
  targetWard?: string;
  targetCommunity?: string;
  meetingDate?: string;
  meetingCode?: string;
  createdAt: string;
  createdAtMs: number;
}

export interface FinancialAdjustmentRecord {
  id: string;
  memberId: string;
  membershipId: string;
  memberName: string;
  zone: string;
  state: string;
  lga: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  previousAmountPaid: number;
  newAmountPaid: number;
  reason: string;
  requestedById: string;
  requestedByName: string;
  approvedById: string;
  approvedByName: string;
  approvedByPosition: string;
  paystackReference?: string;
  auditRef: string;
  createdAt: string;
  createdAtMs: number;
}

export type AuditActionType =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'PASSWORD_SETUP'
  | 'ACCESS_DENIED'
  | 'MEMBER_VIEW'
  | 'MEMBER_APPROVAL'
  | 'MEMBER_REGISTRATION'
  | 'PAYMENT_PAYSTACK_VERIFIED'
  | 'PAYMENT_ADJUSTMENT'
  | 'EXEC_CREATED'
  | 'PERMISSION_CHANGED'
  | 'ANNOUNCEMENT_PUBLISHED'
  | 'REPORT_SUBMITTED'
  | 'REPORT_REVIEWED'
  | 'HIERARCHY_UPDATED';

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actorLevel: ExecutiveLevel | 'member' | 'system';
  actorJurisdiction: string;
  action: AuditActionType;
  affectedRecordId: string;
  affectedRecordLabel: string;
  details: string;
  zone?: string;
  state?: string;
  lga?: string;
  timestamp: string;
  createdAtMs: number;
}

export interface AdministrativeLevelConfig {
  level: ExecutiveLevel;
  label: string;
  rank: number;
  enabled: boolean;
  description: string;
}

export interface HierarchyConfig {
  zones: { name: string; states: string[] }[];
  lgasByState: Record<string, string[]>;
  wardsByLga: Record<string, string[]>;
  communitiesByWard: Record<string, string[]>;
  administrativeLevels: AdministrativeLevelConfig[];
  specializedPositions: string[];
  allowPartialPayments: boolean;
}

export interface SocialChannel {
  id: string;
  name: string;
  description: string;
  badge: string;
  category: 'National' | 'State Chapter' | 'Regulatory' | 'Support';
}

export interface SocialMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderBadge?: string;
  senderAvatar?: string;
  text: string;
  mentions: string[];
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: string;
  attachmentData?: string;
  replyToId?: string;
  replyToSender?: string;
  replyToText?: string;
  likes: string[];
  reactions: Record<string, string[]>;
  timestampLabel: string;
  createdAtMs: number;
}

export interface OnlineMeeting {
  id: string;
  title: string;
  hostName: string;
  hostRole: string;
  hostId: string;
  category: 'National Executive' | 'State Chapter Townhall' | 'Compliance Briefing' | 'Anti-Fraud Workshop';
  scheduledDate: string;
  scheduledTime: string;
  status: 'Live' | 'Scheduled' | 'Ended';
  agenda: string;
  meetingCode: string;
  participants: string[];
  raisedHands: string[];
  createdAtMs: number;
}
