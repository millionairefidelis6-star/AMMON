const EXEC_TOKEN_STORAGE_KEY = "ammon_exec_token";
class ExecutiveApiError extends Error {
  status;
  code;
  assignedJurisdiction;
  constructor(message, status, code, assignedJurisdiction) {
    super(message);
    this.name = "ExecutiveApiError";
    this.status = status;
    this.code = code;
    this.assignedJurisdiction = assignedJurisdiction;
  }
}
function getStoredExecutiveToken() {
  try {
    return localStorage.getItem(EXEC_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
function setStoredExecutiveToken(token) {
  try {
    if (token) {
      localStorage.setItem(EXEC_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(EXEC_TOKEN_STORAGE_KEY);
    }
  } catch {
  }
}
async function apiRequest(path, options = {}, tokenOverride) {
  const token = tokenOverride !== void 0 ? tokenOverride : getStoredExecutiveToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers || {}
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const resp = await fetch(path, {
    ...options,
    headers
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
  return data;
}
async function loginExecutive(identifier, password) {
  const res = await apiRequest(
    "/api/auth/executive-login",
    {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    },
    null
  );
  if (res.status === "AUTHENTICATED" && res.token) {
    setStoredExecutiveToken(res.token);
  }
  return res;
}
async function setupExecutivePassword(email, inviteCodeOrTempPassword, newPassword) {
  const res = await apiRequest(
    "/api/auth/setup-password",
    {
      method: "POST",
      body: JSON.stringify({ email, inviteCodeOrTempPassword, newPassword })
    },
    null
  );
  if (res.token) {
    setStoredExecutiveToken(res.token);
  }
  return res;
}
async function exchangeFirebaseToken(idToken) {
  const res = await apiRequest(
    "/api/auth/firebase-exchange",
    {
      method: "POST",
      body: JSON.stringify({ idToken })
    },
    null
  );
  if (res.token) {
    setStoredExecutiveToken(res.token);
  }
  return res;
}
async function fetchPublicHierarchy() {
  return apiRequest("/api/hierarchy/public", {}, null);
}
async function fetchPublicMembers() {
  return apiRequest("/api/members/public", {}, null);
}
async function fetchExecutiveWorkspace(filters) {
  const params = new URLSearchParams();
  if (filters?.zone && filters.zone !== "All") params.set("zone", filters.zone);
  if (filters?.state && filters.state !== "All") params.set("state", filters.state);
  if (filters?.lga && filters.lga !== "All") params.set("lga", filters.lga);
  if (filters?.ward && filters.ward !== "All") params.set("ward", filters.ward);
  const qs = params.toString();
  return apiRequest(`/api/executive/workspace${qs ? `?${qs}` : ""}`);
}
async function loginMemberApi(identifier, password) {
  return apiRequest(
    "/api/auth/member-login",
    {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    },
    null
  );
}
async function sendEmailOtpApi(payload) {
  return apiRequest(
    "/api/auth/send-email-otp",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    null
  );
}
async function verifyEmailOtpApi(payload) {
  return apiRequest(
    "/api/auth/verify-email-otp",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    null
  );
}
async function registerMemberApi(payload) {
  return apiRequest("/api/members", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
async function verifyPaystackApi(memberId, reference, expectedAmount) {
  return apiRequest("/api/paystack/verify", {
    method: "POST",
    body: JSON.stringify({ memberId, reference, expectedAmount })
  });
}
async function updateMemberStatusApi(id, status) {
  return apiRequest(`/api/members/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}
async function createFinancialAdjustmentApi(payload) {
  return apiRequest("/api/financial-adjustments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
async function submitExecutiveReportApi(payload) {
  return apiRequest("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
async function reviewExecutiveReportApi(reportId, payload) {
  return apiRequest(`/api/reports/${encodeURIComponent(reportId)}/review`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
async function publishAnnouncementApi(payload) {
  return apiRequest("/api/announcements", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
async function createExecutiveAccountApi(payload) {
  return apiRequest("/api/executives", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
async function updateExecutiveAccountApi(id, payload) {
  return apiRequest(`/api/executives/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
async function updateHierarchyConfigApi(hierarchyConfig) {
  return apiRequest("/api/hierarchy", {
    method: "PUT",
    body: JSON.stringify({ hierarchyConfig })
  });
}
async function updateMemberProfilePhotoApi(memberId, photoUrl, passportStoragePath) {
  return apiRequest(
    `/api/members/${encodeURIComponent(memberId)}/profile-photo`,
    {
      method: "PATCH",
      body: JSON.stringify({ photoUrl, passportStoragePath })
    },
    null
  );
}
async function updateExecutiveProfilePhotoApi(avatarUrl) {
  return apiRequest("/api/executive/profile-photo", {
    method: "PATCH",
    body: JSON.stringify({ avatarUrl })
  });
}
async function permanentDeleteSocialMessageApi(messageId, payload) {
  return apiRequest(
    `/api/social-messages/${encodeURIComponent(messageId)}/permanent`,
    {
      method: "DELETE",
      body: JSON.stringify(payload)
    }
  );
}
async function fetchExecutiveRegistryMembers(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "All") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return apiRequest(`/api/executive/members${qs ? `?${qs}` : ""}`);
}
async function logExecutiveRegistryExport(payload) {
  return apiRequest("/api/executive/members/export-audit", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
export {
  ExecutiveApiError,
  createExecutiveAccountApi,
  createFinancialAdjustmentApi,
  exchangeFirebaseToken,
  fetchExecutiveRegistryMembers,
  fetchExecutiveWorkspace,
  fetchPublicHierarchy,
  fetchPublicMembers,
  getStoredExecutiveToken,
  logExecutiveRegistryExport,
  loginExecutive,
  loginMemberApi,
  permanentDeleteSocialMessageApi,
  publishAnnouncementApi,
  registerMemberApi,
  reviewExecutiveReportApi,
  sendEmailOtpApi,
  setStoredExecutiveToken,
  setupExecutivePassword,
  submitExecutiveReportApi,
  updateExecutiveAccountApi,
  updateExecutiveProfilePhotoApi,
  updateHierarchyConfigApi,
  updateMemberProfilePhotoApi,
  updateMemberStatusApi,
  verifyEmailOtpApi,
  verifyPaystackApi
};
