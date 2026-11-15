import {
  AdminUser,
  AuditLogEntry,
  DisputeTicket,
  ExecutiveAnnouncement,
  ExecutiveLevel,
  ExecutivePermissions,
  ExecutiveReport,
  ExecutiveReportType,
  FinancialAdjustmentRecord,
  HierarchyConfig,
  Member,
  PaymentStatus,
} from '../types';

const EXEC_TOKEN_STORAGE_KEY = 'ammon_exec_token';

export class ExecutiveApiError extends Error {
  status: number;
  code?: string;
  assignedJurisdiction?: string;

  constructor(message: string, status: number, code?: string, assignedJurisdiction?: string) {
    super(message);
    this.name = 'ExecutiveApiError';
    this.status = status;
    this.code = code;
    this.assignedJurisdiction = assignedJurisdiction;
  }
}

export function getStoredExecutiveToken(): string | null {
  try {
    return localStorage.getItem(EXEC_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredExecutiveToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(EXEC_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(EXEC_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string | null
): Promise<T> {
  const token = tokenOverride !== undefined ? tokenOverride : getStoredExecutiveToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(path, {
    ...options,
    headers,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new ExecutiveApiError(
      data.error || `Request failed with status ${resp.status}`,
      resp.status,
      data.code,
      data.assignedJurisdiction
    );
  }

  return data as T;
}

export type ExecutiveLoginResponse =
  | {
      status: 'PASSWORD_SETUP_REQUIRED';
      email: string;
      fullName: string;
      position: string;
      jurisdiction: string;
      inviteCode?: string;
    }
  | {
      status: 'AUTHENTICATED';
      token: string;
      executive: AdminUser;
    };

export interface ExecutiveWorkspacePayload {
  executive: AdminUser;
  hierarchyConfig: HierarchyConfig;
  members: Member[];
  reports: ExecutiveReport[];
  announcements: ExecutiveAnnouncement[];
  disputes: DisputeTicket[];
  financialAdjustments: FinancialAdjustmentRecord[];
  executives: AdminUser[];
  auditLogs: AuditLogEntry[];
  metrics: {
    totalMembers: number;
    activeMembers: number;
    pendingMembers: number;
    expiredMembers: number;
    totalCollectedDues: number;
    paystackVerifiedDues: number;
    outstandingDues: number;
  };
}

export async function loginExecutive(identifier: string, password: string): Promise<ExecutiveLoginResponse> {
  const res = await apiRequest<ExecutiveLoginResponse>(
    '/api/auth/executive-login',
    {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    },
    null
  );
  if (res.status === 'AUTHENTICATED' && res.token) {
    setStoredExecutiveToken(res.token);
  }
  return res;
}

export async function setupExecutivePassword(
  email: string,
  inviteCodeOrTempPassword: string,
  newPassword: string
): Promise<{ status: 'AUTHENTICATED'; token: string; executive: AdminUser }> {
  const res = await apiRequest<{ status: 'AUTHENTICATED'; token: string; executive: AdminUser }>(
    '/api/auth/setup-password',
    {
      method: 'POST',
      body: JSON.stringify({ email, inviteCodeOrTempPassword, newPassword }),
    },
    null
  );
  if (res.token) {
    setStoredExecutiveToken(res.token);
  }
  return res;
}

export async function exchangeFirebaseToken(
  idToken: string
): Promise<{ status: 'AUTHENTICATED'; token: string; executive: AdminUser }> {
  const res = await apiRequest<{ status: 'AUTHENTICATED'; token: string; executive: AdminUser }>(
    '/api/auth/firebase-exchange',
    {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    },
    null
  );
  if (res.token) {
    setStoredExecutiveToken(res.token);
  }
  return res;
}

export async function fetchPublicHierarchy(): Promise<{ hierarchyConfig: HierarchyConfig }> {
  return apiRequest<{ hierarchyConfig: HierarchyConfig }>('/api/hierarchy/public', {}, null);
}

export async function fetchPublicMembers(): Promise<{ members: Member[] }> {
  return apiRequest<{ members: Member[] }>('/api/members/public', {}, null);
}

export async function fetchExecutiveWorkspace(filters?: {
  zone?: string;
  state?: string;
  lga?: string;
  ward?: string;
}): Promise<ExecutiveWorkspacePayload> {
  const params = new URLSearchParams();
  if (filters?.zone && filters.zone !== 'All') params.set('zone', filters.zone);
  if (filters?.state && filters.state !== 'All') params.set('state', filters.state);
  if (filters?.lga && filters.lga !== 'All') params.set('lga', filters.lga);
  if (filters?.ward && filters.ward !== 'All') params.set('ward', filters.ward);
  const qs = params.toString();
  return apiRequest<ExecutiveWorkspacePayload>(`/api/executive/workspace${qs ? `?${qs}` : ''}`);
}

export type MemberLoginResponse =
  | {
      status: 'OTP_VERIFICATION_REQUIRED';
      email: string;
      member: Member;
    }
  | {
      status: 'AUTHENTICATED';
      member: Member;
    };

export async function loginMemberApi(
  identifier: string,
  password: string
): Promise<MemberLoginResponse> {
  return apiRequest<MemberLoginResponse>(
    '/api/auth/member-login',
    {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    },
    null
  );
}

export async function sendEmailOtpApi(payload: {
  memberId?: string;
  email: string;
}): Promise<{
  sent: boolean;
  deliveryMode: 'email' | 'in-app-relay';
  email: string;
  expiresInSeconds: number;
  previewOtp?: string;
}> {
  return apiRequest(
    '/api/auth/send-email-otp',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    null
  );
}

export async function verifyEmailOtpApi(payload: {
  memberId?: string;
  email: string;
  otp: string;
}): Promise<{ verified: boolean; member: Member }> {
  return apiRequest<{ verified: boolean; member: Member }>(
    '/api/auth/verify-email-otp',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    null
  );
}

export async function registerMemberApi(
  payload: Partial<Member> & { freeEnrollment?: boolean; password?: string }
): Promise<{ member: Member }> {
  return apiRequest<{ member: Member }>('/api/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyPaystackApi(
  memberId: string,
  reference: string,
  expectedAmount?: number
): Promise<{ verified: boolean; member: Member }> {
  return apiRequest<{ verified: boolean; member: Member }>('/api/paystack/verify', {
    method: 'POST',
    body: JSON.stringify({ memberId, reference, expectedAmount }),
  });
}

export async function updateMemberStatusApi(
  id: string,
  status: Member['status']
): Promise<{ member: Member }> {
  return apiRequest<{ member: Member }>(`/api/members/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function createFinancialAdjustmentApi(payload: {
  memberId: string;
  newStatus: PaymentStatus;
  newAmountPaid: number;
  reason: string;
  approverBadge?: string;
}): Promise<{ adjustment: FinancialAdjustmentRecord; member: Member }> {
  return apiRequest<{ adjustment: FinancialAdjustmentRecord; member: Member }>('/api/financial-adjustments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitExecutiveReportApi(payload: {
  title: string;
  reportType: ExecutiveReportType;
  summary: string;
  metrics?: {
    newRegistrations?: number;
    duesCollected?: number;
    meetingsHeld?: number;
    attendanceCount?: number;
  };
}): Promise<{ report: ExecutiveReport }> {
  return apiRequest<{ report: ExecutiveReport }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reviewExecutiveReportApi(
  reportId: string,
  payload: {
    reviewStatus?: ExecutiveReport['reviewStatus'];
    comment?: string;
    escalate?: boolean;
  }
): Promise<{ report: ExecutiveReport }> {
  return apiRequest<{ report: ExecutiveReport }>(`/api/reports/${encodeURIComponent(reportId)}/review`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function publishAnnouncementApi(payload: {
  title: string;
  body: string;
  type: ExecutiveAnnouncement['type'];
  targetLevel: 'all' | ExecutiveLevel;
  targetZone?: string;
  targetState?: string;
  targetLga?: string;
  targetWard?: string;
  meetingDate?: string;
  meetingCode?: string;
}): Promise<{ announcement: ExecutiveAnnouncement }> {
  return apiRequest<{ announcement: ExecutiveAnnouncement }>('/api/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createExecutiveAccountApi(payload: {
  fullName: string;
  email: string;
  phone: string;
  level: ExecutiveLevel;
  position: string;
  assignedZone?: string;
  assignedState?: string;
  assignedLga?: string;
  assignedWard?: string;
  assignedCommunity?: string;
  specialtyScope?: string;
  activationStatus?: AdminUser['activationStatus'];
  permissions?: ExecutivePermissions;
}): Promise<{ executive: AdminUser; tempPassword: string; inviteCode: string }> {
  return apiRequest<{ executive: AdminUser; tempPassword: string; inviteCode: string }>('/api/executives', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateExecutiveAccountApi(
  id: string,
  payload: {
    activationStatus?: AdminUser['activationStatus'];
    permissions?: Partial<ExecutivePermissions>;
    position?: string;
  }
): Promise<{ executive: AdminUser }> {
  return apiRequest<{ executive: AdminUser }>(`/api/executives/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateHierarchyConfigApi(
  hierarchyConfig: HierarchyConfig
): Promise<{ hierarchyConfig: HierarchyConfig }> {
  return apiRequest<{ hierarchyConfig: HierarchyConfig }>('/api/hierarchy', {
    method: 'PUT',
    body: JSON.stringify({ hierarchyConfig }),
  });
}

export async function updateMemberProfilePhotoApi(
  memberId: string,
  photoUrl: string,
  passportStoragePath?: string
): Promise<{ member: Member }> {
  return apiRequest<{ member: Member }>(
    `/api/members/${encodeURIComponent(memberId)}/profile-photo`,
    {
      method: 'PATCH',
      body: JSON.stringify({ photoUrl, passportStoragePath }),
    },
    null
  );
}

export async function updateExecutiveProfilePhotoApi(
  avatarUrl: string
): Promise<{ executive: AdminUser }> {
  return apiRequest<{ executive: AdminUser }>('/api/executive/profile-photo', {
    method: 'PATCH',
    body: JSON.stringify({ avatarUrl }),
  });
}

export async function permanentDeleteSocialMessageApi(
  messageId: string,
  payload: {
    attachmentData?: string;
    attachmentStoragePath?: string;
    channelId?: string;
    senderName?: string;
  }
): Promise<{ deleted: boolean; deletedMediaFile: boolean }> {
  return apiRequest<{ deleted: boolean; deletedMediaFile: boolean }>(
    `/api/social-messages/${encodeURIComponent(messageId)}/permanent`,
    {
      method: 'DELETE',
      body: JSON.stringify(payload),
    }
  );
}
