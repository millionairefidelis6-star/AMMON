import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "firebase-applet-config.json"), "utf8")
);
import {
  ammonStore,
  hashPassword,
  levelRank,
  nextRoutingLevel,
  nowWatLabel,
  sanitizeExecutive,
  verifyPassword
} from "./server/store.js";
const PORT = Number(process.env.PORT) || 3000;
const TOKEN_SECRET = process.env.AMMON_JWT_SECRET || crypto.createHash("sha256").update(`${firebaseConfig.projectId}:${firebaseConfig.appId}:ammon-exec-auth`).digest("hex");
function signExecutiveToken(exec) {
  const payload = {
    execId: exec.id,
    email: exec.email,
    level: exec.level || (exec.role === "Super Admin" ? "super_admin" : "national"),
    exp: Date.now() + 1e3 * 60 * 60 * 24
    // 24 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}
function sanitizeMember(m) {
  const {
    passwordHash: _ph,
    passwordSalt: _ps,
    otpHash: _oh,
    otpExpiresAt: _oe,
    ...safe
  } = m;
  return safe;
}
function isStrongPassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}
function verifySecretString(plain, storedHash, storedSalt) {
  if (!plain || !storedHash) return false;
  if (storedHash.startsWith("scrypt:")) {
    const [, salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    return verifyPassword(plain, hash, salt);
  }
  if (storedHash.startsWith("sha256:") && storedSalt) {
    const digest = crypto.createHash("sha256").update(`${storedSalt}::${plain}`).digest("hex");
    const expected = `sha256:${digest}`;
    if (expected.length !== storedHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash));
  }
  if (storedSalt) {
    return verifyPassword(plain, storedHash, storedSalt);
  }
  return false;
}
async function verifyFirebaseEmailPassword(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password || !cleanEmail.includes("@")) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          returnSecureToken: true
        })
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.localId || !data.idToken) return null;
    let displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
    let photoUrl = typeof data.profilePicture === "string" ? data.profilePicture.trim() : "";
    if (!displayName) {
      try {
        const lookupResp = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: data.idToken })
          }
        );
        if (lookupResp.ok) {
          const lookupData = await lookupResp.json();
          const fbUser = lookupData.users?.[0];
          if (fbUser?.displayName) displayName = String(fbUser.displayName).trim();
          if (fbUser?.photoUrl && !photoUrl) photoUrl = String(fbUser.photoUrl).trim();
        }
      } catch {
      }
    }
    return {
      localId: data.localId,
      email: (data.email || cleanEmail).toLowerCase(),
      idToken: data.idToken,
      displayName,
      photoUrl
    };
  } catch {
    return null;
  }
}
function resolveSuperAdminSignupName(exec, fbDisplayName, email) {
  const cleanFbName = typeof fbDisplayName === "string" ? fbDisplayName.trim() : "";
  if (cleanFbName) return cleanFbName;
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (cleanEmail) {
    const memberMatch = ammonStore.getData().members.find(
      (m) => (m.email || "").trim().toLowerCase() === cleanEmail && m.fullName
    );
    if (memberMatch?.fullName) return String(memberMatch.fullName).trim();
  }
  if (exec?.fullName && exec.fullName !== "Dr. Victor O. Babatunde") {
    return exec.fullName;
  }
  return "Millionaire Fidelis";
}
function verifyExecutiveToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(encoded).digest("base64url");
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
function requireExecutiveAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const payload = token ? verifyExecutiveToken(token) : null;
  if (!payload) {
    res.status(401).json({
      error: "Unauthorized: Valid executive session token required.",
      code: "UNAUTHORIZED"
    });
    return;
  }
  const exec = ammonStore.findExecutiveById(payload.execId);
  if (!exec) {
    res.status(401).json({ error: "Executive account not found.", code: "ACCOUNT_NOT_FOUND" });
    return;
  }
  if (exec.activationStatus === "Suspended") {
    res.status(403).json({ error: "Executive account is currently suspended.", code: "ACCOUNT_SUSPENDED" });
    return;
  }
  if (exec.requiresPasswordSetup) {
    res.status(403).json({
      error: "Mandatory password setup required before accessing executive workspace.",
      code: "PASSWORD_SETUP_REQUIRED"
    });
    return;
  }
  req.executive = exec;
  next();
}
function denyAndLogJurisdictionViolation(exec, res, targetLabel, details, geo) {
  ammonStore.appendAuditLog({
    actorId: exec.id,
    actorName: exec.fullName,
    actorRole: exec.role,
    actorLevel: exec.level || "national",
    actorJurisdiction: exec.jurisdiction,
    action: "ACCESS_DENIED",
    affectedRecordId: targetLabel,
    affectedRecordLabel: targetLabel,
    details,
    zone: geo?.zone || exec.assignedZone,
    state: geo?.state || exec.assignedState,
    lga: geo?.lga || exec.assignedLga
  });
  res.status(403).json({
    error: `Jurisdiction Access Denied: ${details}`,
    code: "JURISDICTION_FORBIDDEN",
    assignedJurisdiction: exec.jurisdiction
  });
}
async function createAppServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "10mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "AMMON Hierarchical Governance API", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/auth/executive-login", async (req, res) => {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      res.status(400).json({ error: "Institutional email/badge and password are required." });
      return;
    }
    const cleanId = String(identifier).trim();
    const cleanLower = cleanId.toLowerCase();
    let exec = ammonStore.findExecutiveByLogin(cleanId);
    let valid = Boolean(exec && verifyPassword(String(password), exec.passwordHash, exec.passwordSalt));
    let fbDisplayName = "";
    let fbPhotoUrl = "";
    if (!valid) {
      const candidateEmail = cleanLower.includes("@") ? cleanLower : exec?.email?.toLowerCase();
      if (candidateEmail) {
        const fbAuth = await verifyFirebaseEmailPassword(candidateEmail, String(password));
        if (fbAuth) {
          fbDisplayName = fbAuth.displayName || "";
          fbPhotoUrl = fbAuth.photoUrl || "";
          if (!exec && fbAuth.email === "millionairefidelis@gmail.com") {
            exec = ammonStore.findExecutiveById("exec-super");
          }
          if (exec) {
            const { hash, salt } = hashPassword(String(password));
            exec.passwordHash = hash;
            exec.passwordSalt = salt;
            exec.uid = fbAuth.localId;
            exec.requiresPasswordSetup = false;
            exec.activationStatus = "Active";
            ammonStore.save();
            valid = true;
          }
        }
      }
    }
    if (!exec || !valid) {
      ammonStore.appendAuditLog({
        actorId: exec?.id || "unknown",
        actorName: exec?.fullName || cleanId,
        actorRole: exec?.role || "Unknown",
        actorLevel: exec?.level || "system",
        actorJurisdiction: exec?.jurisdiction || "Unauthenticated",
        action: "LOGIN_FAILED",
        affectedRecordId: cleanId,
        affectedRecordLabel: cleanId,
        details: `Failed executive login attempt for "${cleanId}".`
      });
      res.status(401).json({ error: "Invalid executive email/badge or password." });
      return;
    }
    if (exec.activationStatus === "Suspended") {
      ammonStore.appendAuditLog({
        actorId: exec.id,
        actorName: exec.fullName,
        actorRole: exec.role,
        actorLevel: exec.level || "national",
        actorJurisdiction: exec.jurisdiction,
        action: "ACCESS_DENIED",
        affectedRecordId: exec.id,
        affectedRecordLabel: exec.fullName,
        details: "Blocked login attempt on suspended executive account."
      });
      res.status(403).json({ error: "This executive account has been suspended by Super Admin." });
      return;
    }
    if (exec.requiresPasswordSetup || exec.activationStatus === "Invited - Password Setup Required") {
      res.status(200).json({
        status: "PASSWORD_SETUP_REQUIRED",
        email: exec.email,
        fullName: exec.fullName,
        position: exec.position || exec.title,
        jurisdiction: exec.jurisdiction,
        inviteCode: exec.inviteCode
      });
      return;
    }
    if (exec.id === "exec-super" || cleanLower === "millionairefidelis@gmail.com") {
      exec.email = "millionairefidelis@gmail.com";
      exec.fullName = resolveSuperAdminSignupName(exec, fbDisplayName, exec.email);
      exec.title = "National Secretary General & Super Administrator";
      exec.position = "National Secretary General & Super Administrator";
      if (fbPhotoUrl && !exec.avatarUrl) exec.avatarUrl = fbPhotoUrl;
    }
    exec.lastLoginAt = nowWatLabel();
    ammonStore.save();
    const safeExec = sanitizeExecutive(exec);
    const token = signExecutiveToken(exec);
    ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: exec.level || "national",
      actorJurisdiction: exec.jurisdiction,
      action: "LOGIN",
      affectedRecordId: exec.id,
      affectedRecordLabel: `${exec.fullName} (${exec.badgeNumber})`,
      details: `Authenticated into ${exec.level?.toUpperCase()} Executive Dashboard (${exec.jurisdiction}).`,
      zone: exec.assignedZone,
      state: exec.assignedState,
      lga: exec.assignedLga
    });
    res.json({
      status: "AUTHENTICATED",
      token,
      executive: safeExec
    });
  });
  app.post("/api/auth/setup-password", (req, res) => {
    const { email, inviteCodeOrTempPassword, newPassword } = req.body || {};
    if (!email || !inviteCodeOrTempPassword || !newPassword) {
      res.status(400).json({ error: "Email, temporary credential/invite code, and new password are required." });
      return;
    }
    if (String(newPassword).length < 8) {
      res.status(400).json({ error: "Personal password must be at least 8 characters long." });
      return;
    }
    const exec = ammonStore.findExecutiveByLogin(String(email));
    if (!exec) {
      res.status(404).json({ error: "Executive account not found." });
      return;
    }
    const codeMatches = exec.inviteCode && exec.inviteCode === String(inviteCodeOrTempPassword).trim() || verifyPassword(String(inviteCodeOrTempPassword), exec.passwordHash, exec.passwordSalt);
    if (!codeMatches) {
      res.status(401).json({ error: "Invalid temporary password or invitation code." });
      return;
    }
    const { hash, salt } = hashPassword(String(newPassword));
    exec.passwordHash = hash;
    exec.passwordSalt = salt;
    exec.requiresPasswordSetup = false;
    exec.activationStatus = "Active";
    exec.inviteCode = void 0;
    exec.lastLoginAt = nowWatLabel();
    ammonStore.save();
    const token = signExecutiveToken(exec);
    ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: exec.level || "national",
      actorJurisdiction: exec.jurisdiction,
      action: "PASSWORD_SETUP",
      affectedRecordId: exec.id,
      affectedRecordLabel: `${exec.fullName} (${exec.badgeNumber})`,
      details: "Executive completed mandatory personal password setup and activated account.",
      zone: exec.assignedZone,
      state: exec.assignedState,
      lga: exec.assignedLga
    });
    res.json({
      status: "AUTHENTICATED",
      token,
      executive: sanitizeExecutive(exec)
    });
  });
  app.post("/api/auth/firebase-exchange", async (req, res) => {
    const { idToken } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      res.status(400).json({ error: "Firebase ID token is required." });
      return;
    }
    try {
      const verifyResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken })
        }
      );
      if (!verifyResp.ok) {
        res.status(401).json({ error: "Invalid or expired Firebase ID token." });
        return;
      }
      const verifyData = await verifyResp.json();
      const fbUser = verifyData.users?.[0];
      if (!fbUser || !fbUser.email || !fbUser.emailVerified) {
        res.status(403).json({ error: "Verified email required for executive access." });
        return;
      }
      const email = fbUser.email.toLowerCase();
      const SUPER_ADMIN_GOOGLE_EMAIL = "millionairefidelis@gmail.com";
      if (email !== SUPER_ADMIN_GOOGLE_EMAIL) {
        const existingExec = ammonStore.findExecutiveByLogin(email);
        ammonStore.appendAuditLog({
          actorId: existingExec?.id || fbUser.localId || "unknown",
          actorName: existingExec?.fullName || fbUser.displayName || email,
          actorRole: existingExec?.role || "Unauthorized User",
          actorLevel: existingExec?.level || "system",
          actorJurisdiction: existingExec?.jurisdiction || "Unauthenticated",
          action: "ACCESS_DENIED",
          affectedRecordId: email,
          affectedRecordLabel: email,
          details: `Blocked Google authentication attempt for "${email}". Google SSO is restricted exclusively to Super Admin (${SUPER_ADMIN_GOOGLE_EMAIL}).`
        });
        res.status(403).json({
          error: `Google authentication is restricted exclusively to the AMMON Super Admin (${SUPER_ADMIN_GOOGLE_EMAIL}). Other executives and operators must sign in with email/badge and password.`,
          code: "SUPER_ADMIN_ONLY"
        });
        return;
      }
      const exec = ammonStore.findExecutiveByLogin(email) || ammonStore.findExecutiveById("exec-super");
      if (!exec) {
        res.status(403).json({
          error: "Super Admin account record is unavailable.",
          code: "SUPER_ADMIN_ONLY"
        });
        return;
      }
      if (exec.activationStatus === "Suspended") {
        res.status(403).json({ error: "This Super Admin account has been suspended." });
        return;
      }
      exec.uid = fbUser.localId;
      exec.email = SUPER_ADMIN_GOOGLE_EMAIL;
      exec.fullName = resolveSuperAdminSignupName(exec, fbUser.displayName, email);
      exec.title = "National Secretary General & Super Administrator";
      exec.position = "National Secretary General & Super Administrator";
      if (fbUser.photoUrl && !exec.avatarUrl) exec.avatarUrl = fbUser.photoUrl;
      exec.requiresPasswordSetup = false;
      exec.activationStatus = "Active";
      exec.lastLoginAt = nowWatLabel();
      ammonStore.save();
      const safeExec = sanitizeExecutive(exec);
      const token = signExecutiveToken(exec);
      ammonStore.appendAuditLog({
        actorId: exec.id,
        actorName: exec.fullName,
        actorRole: exec.role,
        actorLevel: exec.level || "super_admin",
        actorJurisdiction: exec.jurisdiction,
        action: "LOGIN",
        affectedRecordId: exec.id,
        affectedRecordLabel: `${exec.fullName} (Google SSO)`,
        details: `Verified Super Admin Firebase Google SSO login (${email}).`,
        zone: exec.assignedZone,
        state: exec.assignedState,
        lga: exec.assignedLga
      });
      res.json({
        status: "AUTHENTICATED",
        token,
        executive: safeExec
      });
    } catch (err) {
      console.error("Firebase token exchange error:", err);
      res.status(500).json({ error: "Unable to verify Firebase credentials on backend." });
    }
  });
  app.post("/api/auth/member-login", async (req, res) => {
    const { identifier, password } = req.body || {};
    const cleanId = String(identifier || "").trim().toLowerCase();
    const cleanPwd = String(password || "");
    if (!cleanId || !cleanPwd) {
      res.status(400).json({ error: "Membership ID/Email and password are required." });
      return;
    }
    const cleanDigits = cleanId.replace(/\s+/g, "");
    const member = ammonStore.getData().members.find(
      (m) => m.membershipId.toLowerCase() === cleanId || m.email.toLowerCase() === cleanId || cleanDigits.length >= 7 && m.phone.replace(/\s+/g, "").includes(cleanDigits)
    );
    if (!member) {
      res.status(401).json({
        error: "No registered operator account found matching that Membership ID, Email, or Phone."
      });
      return;
    }
    let passwordValid = verifySecretString(cleanPwd, member.passwordHash, member.passwordSalt);
    if (!passwordValid && member.email) {
      const fbAuth = await verifyFirebaseEmailPassword(member.email, cleanPwd);
      if (fbAuth) {
        const { hash, salt } = hashPassword(cleanPwd);
        member.passwordHash = `scrypt:${salt}:${hash}`;
        member.passwordSalt = salt;
        member.emailVerified = true;
        ammonStore.save();
        passwordValid = true;
      }
    }
    if (!passwordValid) {
      res.status(401).json({
        error: "Incorrect password. Please enter the exact password created during registration."
      });
      return;
    }
    if (member.emailVerified !== true) {
      res.status(200).json({
        status: "OTP_VERIFICATION_REQUIRED",
        email: member.email,
        member: sanitizeMember(member)
      });
      return;
    }
    res.json({
      status: "AUTHENTICATED",
      member: sanitizeMember(member)
    });
  });
  app.post("/api/auth/send-email-otp", async (req, res) => {
    const { memberId, email } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const member = ammonStore.getData().members.find(
      (m) => memberId && (m.id === memberId || m.membershipId === memberId) || cleanEmail && m.email.toLowerCase() === cleanEmail
    );
    if (!member) {
      res.status(404).json({ error: "Member account not found for email verification." });
      return;
    }
    const targetEmail = member.email || cleanEmail;
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      res.status(400).json({ error: "A valid registered email address is required for OTP verification." });
      return;
    }
    const otpCode = String(crypto.randomInt(1e5, 1e6));
    const { hash, salt } = hashPassword(otpCode);
    member.otpHash = `scrypt:${salt}:${hash}`;
    member.otpExpiresAt = Date.now() + 10 * 60 * 1e3;
    ammonStore.save();
    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || "AMMON Nigeria <onboarding@resend.dev>";
    if (resendKey) {
      try {
        const emailResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [targetEmail],
            subject: "AMMON Email Verification OTP Code",
            html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px">
              <h2 style="color:#176B37;margin:0 0 12px">AMMON Registration Verification</h2>
              <p>Hello <strong>${member.fullName}</strong>,</p>
              <p>Use the 6-digit verification code below to confirm your email and unlock your AMMON Member Dashboard:</p>
              <div style="font-size:28px;font-weight:800;letter-spacing:6px;background:#EAF3ED;color:#14532D;padding:14px 20px;border-radius:12px;text-align:center;margin:16px 0">${otpCode}</div>
              <p style="font-size:12px;color:#6b7280">This code expires in 10 minutes. Membership ID: ${member.membershipId}</p>
            </div>`
          })
        });
        if (emailResp.ok) {
          res.json({
            sent: true,
            deliveryMode: "email",
            email: targetEmail,
            expiresInSeconds: 600
          });
          return;
        }
      } catch (err) {
        console.warn("Resend email dispatch fallback:", err);
      }
    }
    res.json({
      sent: true,
      deliveryMode: "in-app-relay",
      email: targetEmail,
      expiresInSeconds: 600,
      previewOtp: otpCode
    });
  });
  app.post("/api/auth/verify-email-otp", (req, res) => {
    const { memberId, email, otp } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      res.status(400).json({ error: "Please enter the valid 6-digit OTP verification code." });
      return;
    }
    const member = ammonStore.getData().members.find(
      (m) => memberId && (m.id === memberId || m.membershipId === memberId) || cleanEmail && m.email.toLowerCase() === cleanEmail
    );
    if (!member) {
      res.status(404).json({ error: "Member record not found." });
      return;
    }
    if (!member.otpHash || !member.otpExpiresAt) {
      res.status(400).json({ error: "No active OTP code found. Please click Resend Code to generate a fresh OTP." });
      return;
    }
    if (Date.now() > member.otpExpiresAt) {
      res.status(400).json({ error: "This OTP code has expired. Please request a new verification code." });
      return;
    }
    if (!verifySecretString(cleanOtp, member.otpHash)) {
      res.status(401).json({ error: "Invalid OTP code. Please check the 6-digit code and try again." });
      return;
    }
    member.emailVerified = true;
    member.emailVerifiedAt = nowWatLabel();
    member.otpHash = void 0;
    member.otpExpiresAt = void 0;
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: member.id,
      actorName: member.fullName,
      actorRole: "Member",
      actorLevel: "member",
      actorJurisdiction: `${member.lga}, ${member.state} State`,
      action: "MEMBER_APPROVAL",
      affectedRecordId: member.id,
      affectedRecordLabel: `${member.fullName} (${member.membershipId})`,
      details: `Confirmed email address (${member.email}) via 6-digit OTP verification.`,
      zone: member.zone,
      state: member.state,
      lga: member.lga
    });
    res.json({
      verified: true,
      member: sanitizeMember(member)
    });
  });
  app.get("/api/hierarchy/public", (_req, res) => {
    res.json({ hierarchyConfig: ammonStore.getData().hierarchyConfig });
  });
  app.get("/api/members/public", (_req, res) => {
    const members = ammonStore.getData().members.map(
      (m) => sanitizeMember({
        ...m,
        zone: m.zone || ammonStore.resolveZoneForState(m.state),
        paymentStatus: ammonStore.normalizePaymentStatus(m)
      })
    );
    res.json({ members });
  });
  app.get("/api/executive/workspace", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    const db = ammonStore.getData();
    const reqZone = typeof req.query.zone === "string" && req.query.zone !== "All" ? req.query.zone : void 0;
    const reqState = typeof req.query.state === "string" && req.query.state !== "All" ? req.query.state : void 0;
    const reqLga = typeof req.query.lga === "string" && req.query.lga !== "All" ? req.query.lga : void 0;
    const reqWard = typeof req.query.ward === "string" && req.query.ward !== "All" ? req.query.ward : void 0;
    if (reqZone && exec.level === "zonal" && !exec.permissions?.crossZoneAuthorized && reqZone !== exec.assignedZone) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        `Zone:${reqZone}`,
        `${exec.fullName} (${exec.assignedZone} Zonal Exec) attempted unauthorized query for "${reqZone}" zone.`,
        { zone: reqZone }
      );
      return;
    }
    if (reqState && (exec.level === "state" || exec.level === "lga" || exec.level === "ward" || exec.level === "community") && reqState !== exec.assignedState) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        `State:${reqState}`,
        `${exec.fullName} (${exec.assignedState}) attempted unauthorized query for "${reqState} State" records.`,
        { state: reqState }
      );
      return;
    }
    if (reqState && exec.level === "zonal" && !exec.permissions?.crossZoneAuthorized && ammonStore.resolveZoneForState(reqState) !== exec.assignedZone) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        `State:${reqState}`,
        `${exec.fullName} (${exec.assignedZone} Zone) attempted unauthorized query for "${reqState} State" outside their zone.`,
        { state: reqState, zone: ammonStore.resolveZoneForState(reqState) }
      );
      return;
    }
    if (reqLga && (exec.level === "lga" || exec.level === "ward" || exec.level === "community") && reqLga.toLowerCase() !== (exec.assignedLga || "").toLowerCase()) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        `LGA:${reqLga}`,
        `${exec.fullName} (${exec.assignedLga} LGA) attempted unauthorized query for "${reqLga} LGA" records.`,
        { state: exec.assignedState, lga: reqLga }
      );
      return;
    }
    let scopedMembers = db.members.map(
      (m) => sanitizeMember({
        ...m,
        zone: m.zone || ammonStore.resolveZoneForState(m.state),
        paymentStatus: ammonStore.normalizePaymentStatus(m)
      })
    ).filter((m) => ammonStore.isGeoInJurisdiction(exec, m));
    if (reqZone) scopedMembers = scopedMembers.filter((m) => m.zone === reqZone);
    if (reqState) scopedMembers = scopedMembers.filter((m) => m.state === reqState);
    if (reqLga) scopedMembers = scopedMembers.filter((m) => m.lga.toLowerCase() === reqLga.toLowerCase());
    if (reqWard) scopedMembers = scopedMembers.filter((m) => (m.ward || "").toLowerCase() === reqWard.toLowerCase());
    const callerRank = levelRank(exec.level || "national");
    const scopedReports = db.reports.filter((r) => {
      if (exec.level === "super_admin" || exec.level === "national") return true;
      if (exec.level === "specialized" && exec.permissions?.crossZoneAuthorized) return true;
      if (r.submittedById === exec.id) return true;
      if (!ammonStore.isGeoInJurisdiction(exec, r)) return false;
      return levelRank(r.submittedByLevel) >= callerRank;
    });
    const scopedAnnouncements = db.announcements.filter((a) => {
      if (exec.level === "super_admin" || exec.level === "national") return true;
      if (a.senderId === exec.id) return true;
      if (a.targetLevel === "all" && !a.targetZone && !a.targetState && !a.targetLga) return true;
      const matchesZone = !a.targetZone || a.targetZone === exec.assignedZone;
      const matchesState = !a.targetState || a.targetState === exec.assignedState;
      const matchesLga = !a.targetLga || a.targetLga.toLowerCase() === (exec.assignedLga || "").toLowerCase();
      const matchesWard = !a.targetWard || a.targetWard.toLowerCase() === (exec.assignedWard || "").toLowerCase();
      return matchesZone && matchesState && matchesLga && matchesWard;
    });
    const scopedDisputes = db.disputes.filter(
      (d) => ammonStore.isGeoInJurisdiction(exec, {
        zone: d.zone || ammonStore.resolveZoneForState(d.state),
        state: d.state,
        lga: d.lga
      })
    );
    const scopedAdjustments = db.financialAdjustments.filter(
      (adj) => ammonStore.isGeoInJurisdiction(exec, adj)
    );
    const scopedExecutives = db.executives.filter((e) => {
      if (exec.level === "super_admin" || exec.level === "national") return true;
      if (e.id === exec.id) return true;
      return ammonStore.isGeoInJurisdiction(exec, {
        zone: e.assignedZone,
        state: e.assignedState,
        lga: e.assignedLga,
        ward: e.assignedWard,
        community: e.assignedCommunity
      });
    }).map(sanitizeExecutive);
    const scopedAuditLogs = db.auditLogs.filter((log) => {
      if (exec.level === "super_admin" || exec.permissions?.canViewAuditLogs) return true;
      if (log.actorId === exec.id) return true;
      return ammonStore.isGeoInJurisdiction(exec, {
        zone: log.zone,
        state: log.state,
        lga: log.lga
      });
    });
    const totalExpectedDues = scopedMembers.reduce((sum, m) => sum + (m.duesAmount || 0), 0);
    const totalCollectedDues = scopedMembers.reduce(
      (sum, m) => sum + (m.amountPaid !== void 0 ? m.amountPaid : m.duesPaid ? m.duesAmount : 0),
      0
    );
    const paystackVerifiedDues = scopedMembers.filter((m) => m.paystackVerified).reduce((sum, m) => sum + (m.amountPaid ?? m.duesAmount ?? 0), 0);
    const outstandingDues = Math.max(0, totalExpectedDues - totalCollectedDues);
    res.json({
      executive: sanitizeExecutive(exec),
      hierarchyConfig: db.hierarchyConfig,
      members: scopedMembers,
      reports: scopedReports,
      announcements: scopedAnnouncements,
      disputes: scopedDisputes,
      financialAdjustments: scopedAdjustments,
      executives: scopedExecutives,
      auditLogs: scopedAuditLogs,
      metrics: {
        totalMembers: scopedMembers.length,
        activeMembers: scopedMembers.filter((m) => m.status === "Active").length,
        pendingMembers: scopedMembers.filter((m) => m.status === "Pending Verification").length,
        expiredMembers: scopedMembers.filter((m) => m.status === "Expired").length,
        totalCollectedDues,
        paystackVerifiedDues,
        outstandingDues
      }
    });
  });
  app.get("/api/executive/members", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    const db = ammonStore.getData();
    const reqZone = typeof req.query.zone === "string" && req.query.zone !== "All" ? req.query.zone.trim() : void 0;
    const reqState = typeof req.query.state === "string" && req.query.state !== "All" ? req.query.state.trim() : void 0;
    const reqLga = typeof req.query.lga === "string" && req.query.lga !== "All" ? req.query.lga.trim() : void 0;
    const reqWard = typeof req.query.ward === "string" && req.query.ward !== "All" ? req.query.ward.trim() : void 0;
    const reqCategory = typeof req.query.category === "string" && req.query.category !== "All" ? req.query.category.trim() : void 0;
    const reqStatus = typeof req.query.status === "string" && req.query.status !== "All" ? req.query.status.trim() : void 0;
    const reqPayStatus = typeof req.query.paymentStatus === "string" && req.query.paymentStatus !== "All" ? req.query.paymentStatus.trim() : void 0;
    const reqSearch = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const reqJoinedFrom = typeof req.query.joinedFrom === "string" ? req.query.joinedFrom.trim() : "";
    const reqJoinedTo = typeof req.query.joinedTo === "string" ? req.query.joinedTo.trim() : "";
    if (reqZone && exec.level === "zonal" && !exec.permissions?.crossZoneAuthorized && reqZone !== exec.assignedZone) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        `Zone:${reqZone}`,
        `${exec.fullName} (${exec.assignedZone} Zonal Exec) attempted unauthorized registry query for "${reqZone}" zone.`,
        { zone: reqZone }
      );
      return;
    }
    if (reqState && (exec.level === "state" || exec.level === "lga" || exec.level === "ward" || exec.level === "community") && reqState !== exec.assignedState) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        `State:${reqState}`,
        `${exec.fullName} (${exec.assignedState}) attempted unauthorized registry query for "${reqState} State".`,
        { state: reqState }
      );
      return;
    }
    if (reqState && exec.level === "zonal" && !exec.permissions?.crossZoneAuthorized && ammonStore.resolveZoneForState(reqState) !== exec.assignedZone) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        `State:${reqState}`,
        `${exec.fullName} (${exec.assignedZone} Zone) attempted unauthorized registry query for "${reqState} State" outside their zone.`,
        { state: reqState, zone: ammonStore.resolveZoneForState(reqState) }
      );
      return;
    }
    if (reqLga && (exec.level === "lga" || exec.level === "ward" || exec.level === "community") && reqLga.toLowerCase() !== (exec.assignedLga || "").toLowerCase()) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        `LGA:${reqLga}`,
        `${exec.fullName} (${exec.assignedLga} LGA) attempted unauthorized registry query for "${reqLga} LGA".`,
        { state: exec.assignedState, lga: reqLga }
      );
      return;
    }
    const authorizedMembers = db.members.map(
      (m) => sanitizeMember({
        ...m,
        zone: m.zone || ammonStore.resolveZoneForState(m.state),
        paymentStatus: ammonStore.normalizePaymentStatus(m)
      })
    ).filter((m) => ammonStore.isGeoInJurisdiction(exec, m));
    const filtered = authorizedMembers.filter((m) => {
      if (reqZone && m.zone !== reqZone) return false;
      if (reqState && m.state !== reqState) return false;
      if (reqLga && (m.lga || "").toLowerCase() !== reqLga.toLowerCase()) return false;
      if (reqWard && (m.ward || "").toLowerCase() !== reqWard.toLowerCase()) return false;
      if (reqCategory && m.category !== reqCategory) return false;
      if (reqStatus && m.status !== reqStatus) return false;
      if (reqPayStatus && (m.paymentStatus || "Unpaid") !== reqPayStatus) return false;
      if (reqJoinedFrom && m.joinedDate && m.joinedDate < reqJoinedFrom) return false;
      if (reqJoinedTo && m.joinedDate && m.joinedDate > reqJoinedTo) return false;
      if (reqSearch) {
        const hay = [
          m.fullName,
          m.businessName,
          m.membershipId,
          m.email,
          m.phone,
          m.terminalSerialNumber,
          m.terminalProvider,
          m.state,
          m.lga,
          m.ward,
          m.community
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(reqSearch)) return false;
      }
      return true;
    });
    res.json({
      executive: sanitizeExecutive(exec),
      totalAuthorized: authorizedMembers.length,
      filteredCount: filtered.length,
      members: filtered
    });
  });
  app.post("/api/executive/members/export-audit", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    const { format, recordCount, filtersSummary } = req.body || {};
    const cleanFormat = String(format || "").toUpperCase();
    if (!["CSV", "JSON", "PRINT"].includes(cleanFormat)) {
      res.status(400).json({ error: "Export format must be CSV, JSON, or PRINT." });
      return;
    }
    const count = Math.max(0, Math.min(1e6, Number(recordCount) || 0));
    const cleanSummary = typeof filtersSummary === "string" && filtersSummary.trim() ? filtersSummary.trim().slice(0, 500) : "All authorized operators in scope";
    const auditEntry = ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: exec.level || "national",
      actorJurisdiction: exec.jurisdiction,
      action: "REGISTRY_EXPORT",
      affectedRecordId: `export-${cleanFormat.toLowerCase()}-${Date.now()}`,
      affectedRecordLabel: `${cleanFormat} Directory Export (${count} operators)`,
      details: `Exported ${count} mobile money operator record(s) in ${cleanFormat} format. Filters: ${cleanSummary}.`,
      zone: exec.assignedZone,
      state: exec.assignedState,
      lga: exec.assignedLga
    });
    res.status(201).json({ ok: true, auditEntry });
  });
  app.post("/api/members", (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const payload = token ? verifyExecutiveToken(token) : null;
    const exec = payload ? ammonStore.findExecutiveById(payload.execId) : void 0;
    const body = req.body || {};
    const state = String(body.state || "Lagos");
    const zone = String(body.zone || ammonStore.resolveZoneForState(state));
    const lga = String(body.lga || "Ikeja");
    const ward = body.ward ? String(body.ward) : void 0;
    const community = body.community ? String(body.community) : void 0;
    if (exec) {
      if (!exec.permissions?.canRegisterMembers && exec.level !== "super_admin") {
        res.status(403).json({ error: "Your executive role is not authorized to register new members." });
        return;
      }
      if (!ammonStore.isGeoInJurisdiction(exec, { zone, state, lga, ward, community })) {
        denyAndLogJurisdictionViolation(
          exec,
          res,
          `MemberRegistration:${state}/${lga}`,
          `Cannot register member outside assigned jurisdiction (${exec.jurisdiction}).`,
          { zone, state, lga }
        );
        return;
      }
    }
    const category = body.category || "POS Agents";
    const isFreeEnrollment = Boolean(body.freeEnrollment);
    const cleanEmail = String(body.email || "").trim().toLowerCase();
    if (!exec) {
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        res.status(400).json({ error: "A valid email address is required for OTP verification." });
        return;
      }
      const existingByEmail = ammonStore.getData().members.find((m) => m.email.toLowerCase() === cleanEmail);
      if (existingByEmail) {
        res.status(409).json({
          error: "An AMMON account with this email address already exists. Please sign in instead."
        });
        return;
      }
      if (!body.password || !isStrongPassword(String(body.password))) {
        res.status(400).json({
          error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
        });
        return;
      }
    }
    const passwordCreds = body.password ? hashPassword(String(body.password)) : body.passwordHash && body.passwordSalt ? { hash: String(body.passwordHash), salt: String(body.passwordSalt) } : void 0;
    const duesAmount = isFreeEnrollment ? 0 : Number(body.duesAmount) || (category === "POS Agents" ? 15e3 : category === "Super Agents" ? 5e4 : category === "Fintech Companies" ? 25e4 : 75e3);
    const requestedPayStatus = isFreeEnrollment ? "Paid" : body.paymentStatus === "Payment Pending" || body.paymentStatus === "Payment Verification Required" ? body.paymentStatus : "Unpaid";
    const stateCode = state.slice(0, 3).toUpperCase();
    const newMember = {
      id: body.id || `mem-${Date.now()}-${crypto.randomInt(100, 999)}`,
      membershipId: body.membershipId || `AMMON-${stateCode}-${(/* @__PURE__ */ new Date()).getFullYear()}-${crypto.randomInt(1e4, 99999)}`,
      fullName: String(body.fullName || "New AMMON Operator").trim(),
      businessName: String(body.businessName || "AMMON Accredited Kiosk").trim(),
      email: cleanEmail || String(body.email || "").trim(),
      phone: String(body.phone || "+234 800 000 0000").trim(),
      zone,
      state,
      lga,
      ward,
      community,
      category,
      tier: String(body.tier || "Tier 1 Standard Agent"),
      terminalSerialNumber: String(body.terminalSerialNumber || `POS-${stateCode}-${crypto.randomInt(1e4, 99999)}`),
      terminalProvider: String(body.terminalProvider || "Moniepoint"),
      bvnVerified: Boolean(body.bvnVerified ?? true),
      cbnCompliant: Boolean(body.cbnCompliant ?? true),
      status: isFreeEnrollment || exec && exec.permissions?.canApproveMembers ? "Active" : "Pending Verification",
      joinedDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      expiryDate: `${(/* @__PURE__ */ new Date()).getFullYear() + 1}-12-31`,
      photoUrl: body.photoUrl || "/assets/images/ammon_hero_pos_agent_1794380620175.jpg",
      passportStoragePath: body.passportStoragePath ? String(body.passportStoragePath) : void 0,
      kycDocumentType: body.kycDocumentType === "Government ID" || body.kycDocumentType === "Business License" ? body.kycDocumentType : void 0,
      kycDocumentUrl: body.kycDocumentUrl ? String(body.kycDocumentUrl) : void 0,
      kycDocumentStoragePath: body.kycDocumentStoragePath ? String(body.kycDocumentStoragePath) : void 0,
      duesPaid: isFreeEnrollment,
      duesAmount,
      amountPaid: 0,
      paymentStatus: requestedPayStatus,
      paystackVerified: false,
      registeredByExecutiveId: exec?.id,
      emailVerified: exec ? Boolean(body.emailVerified ?? true) : false,
      passwordHash: passwordCreds?.hash,
      passwordSalt: passwordCreds?.salt
    };
    ammonStore.getData().members.unshift(newMember);
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: exec?.id || newMember.id,
      actorName: exec?.fullName || newMember.fullName,
      actorRole: exec?.role || "Self-Registration",
      actorLevel: exec?.level || "member",
      actorJurisdiction: exec?.jurisdiction || `${lga}, ${state} State`,
      action: "MEMBER_REGISTRATION",
      affectedRecordId: newMember.id,
      affectedRecordLabel: `${newMember.fullName} (${newMember.membershipId})`,
      details: isFreeEnrollment ? `Registered new ${newMember.category} member in ${lga}, ${state} State (${zone}) under open zero-fee registration (pending email OTP verification).` : `Registered new ${newMember.category} member in ${lga}, ${state} State (${zone}). Initial payment status: ${newMember.paymentStatus}.`,
      zone,
      state,
      lga
    });
    res.status(201).json({ member: sanitizeMember(newMember) });
  });
  app.post("/api/paystack/verify", async (req, res) => {
    const { memberId, reference, expectedAmount } = req.body || {};
    if (!memberId || !reference) {
      res.status(400).json({ error: "Member ID and Paystack reference are required." });
      return;
    }
    const member = ammonStore.getData().members.find((m) => m.id === memberId || m.membershipId === memberId);
    if (!member) {
      res.status(404).json({ error: "Member record not found for Paystack verification." });
      return;
    }
    const cleanRef = String(reference).trim();
    let verifiedOnGateway = false;
    let verifiedAmount = Number(expectedAmount || member.duesAmount || 15e3);
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecret) {
      try {
        const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`, {
          headers: { Authorization: `Bearer ${paystackSecret}` }
        });
        const data = await resp.json();
        if (data.status && data.data?.status === "success") {
          verifiedOnGateway = true;
          verifiedAmount = Math.round((data.data.amount || verifiedAmount * 100) / 100);
        }
      } catch (err) {
        console.error("Paystack REST verification error:", err);
      }
    } else {
      verifiedOnGateway = /^(PSK|PSTK|AMMON)-[A-Z0-9\-]{6,}$/i.test(cleanRef);
    }
    if (!verifiedOnGateway) {
      res.status(400).json({ error: "Paystack transaction verification failed. Unverified reference rejected." });
      return;
    }
    member.paystackReference = cleanRef;
    member.paystackVerified = true;
    member.amountPaid = verifiedAmount;
    member.duesPaid = verifiedAmount >= member.duesAmount;
    member.paymentStatus = member.duesPaid ? "Paid" : "Partially Paid";
    member.status = "Active";
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: "paystack-gateway",
      actorName: "Paystack Backend Verifier",
      actorRole: "Payment Gateway",
      actorLevel: "system",
      actorJurisdiction: `${member.lga}, ${member.state} State`,
      action: "PAYMENT_PAYSTACK_VERIFIED",
      affectedRecordId: member.id,
      affectedRecordLabel: `${member.fullName} (${member.membershipId})`,
      details: `Backend verified Paystack reference ${cleanRef} for ₦${verifiedAmount.toLocaleString()}. Payment status: ${member.paymentStatus}.`,
      zone: member.zone || ammonStore.resolveZoneForState(member.state),
      state: member.state,
      lga: member.lga
    });
    res.json({ verified: true, member });
  });
  app.patch("/api/members/:id/status", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    const { status } = req.body || {};
    const validStatuses = ["Active", "Pending Verification", "Expired", "Suspended"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid membership status." });
      return;
    }
    if (!exec.permissions?.canApproveMembers && exec.level !== "super_admin") {
      res.status(403).json({ error: "Your executive position does not have member approval privileges." });
      return;
    }
    const member = ammonStore.getData().members.find((m) => m.id === req.params.id);
    if (!member) {
      res.status(404).json({ error: "Member record not found." });
      return;
    }
    const memberGeo = {
      zone: member.zone || ammonStore.resolveZoneForState(member.state),
      state: member.state,
      lga: member.lga,
      ward: member.ward,
      community: member.community
    };
    if (!ammonStore.isGeoInJurisdiction(exec, memberGeo)) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        member.membershipId,
        `Cannot modify member ${member.membershipId} (${member.state}/${member.lga}) from ${exec.jurisdiction}.`,
        memberGeo
      );
      return;
    }
    const prevStatus = member.status;
    member.status = status;
    member.lastUpdatedBy = exec.id;
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: exec.level || "state",
      actorJurisdiction: exec.jurisdiction,
      action: "MEMBER_APPROVAL",
      affectedRecordId: member.id,
      affectedRecordLabel: `${member.fullName} (${member.membershipId})`,
      details: `Updated membership status from "${prevStatus}" to "${status}". (Payment status remains "${ammonStore.normalizePaymentStatus(member)}").`,
      ...memberGeo
    });
    res.json({ member });
  });
  app.post("/api/financial-adjustments", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    const { memberId, newStatus, newAmountPaid, reason, approverBadge } = req.body || {};
    if (!exec.permissions?.canAdjustPayments && exec.level !== "super_admin") {
      ammonStore.appendAuditLog({
        actorId: exec.id,
        actorName: exec.fullName,
        actorRole: exec.role,
        actorLevel: exec.level || "state",
        actorJurisdiction: exec.jurisdiction,
        action: "ACCESS_DENIED",
        affectedRecordId: String(memberId || "unknown"),
        affectedRecordLabel: "Unauthorized Payment Adjustment Attempt",
        details: `${exec.fullName} attempted manual financial adjustment without canAdjustPayments permission.`
      });
      res.status(403).json({
        error: "Forbidden: Executives cannot manually alter payment records without Financial Adjustment authority and an authorized approver."
      });
      return;
    }
    if (!reason || String(reason).trim().length < 10) {
      res.status(400).json({ error: "A detailed documented reason (minimum 10 characters) is mandatory." });
      return;
    }
    const db = ammonStore.getData();
    const member = db.members.find((m) => m.id === memberId);
    if (!member) {
      res.status(404).json({ error: "Member not found." });
      return;
    }
    const memberGeo = {
      zone: member.zone || ammonStore.resolveZoneForState(member.state),
      state: member.state,
      lga: member.lga,
      ward: member.ward,
      community: member.community
    };
    if (!ammonStore.isGeoInJurisdiction(exec, memberGeo)) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        member.membershipId,
        `Cannot adjust financial record for ${member.state}/${member.lga} from ${exec.jurisdiction}.`,
        memberGeo
      );
      return;
    }
    const approver = db.executives.find(
      (e) => (e.badgeNumber.toLowerCase() === String(approverBadge || "").trim().toLowerCase() || e.id === approverBadge) && (e.level === "super_admin" || e.permissions?.canAdjustPayments)
    ) || (exec.level === "super_admin" || exec.permissions?.canAdjustPayments ? exec : void 0);
    if (!approver) {
      res.status(403).json({ error: "Valid authorized approver badge/ID required for financial adjustments." });
      return;
    }
    const allowedStatuses = [
      "Paid",
      "Unpaid",
      "Partially Paid",
      "Payment Pending",
      "Expired",
      "Payment Verification Required"
    ];
    if (!allowedStatuses.includes(newStatus)) {
      res.status(400).json({ error: "Invalid payment status category." });
      return;
    }
    if (newStatus === "Partially Paid" && !db.hierarchyConfig.allowPartialPayments) {
      res.status(400).json({ error: "Partial payments are currently disabled in Super Admin hierarchy settings." });
      return;
    }
    const prevStatus = ammonStore.normalizePaymentStatus(member);
    const prevAmount = member.amountPaid ?? (member.duesPaid ? member.duesAmount : 0);
    const nextAmount = Number(newAmountPaid ?? prevAmount);
    const auditRef = `AUD-FIN-${(/* @__PURE__ */ new Date()).getFullYear()}-${crypto.randomInt(1e3, 9999)}`;
    member.paymentStatus = newStatus;
    member.amountPaid = nextAmount;
    member.duesPaid = newStatus === "Paid";
    member.lastUpdatedBy = exec.id;
    const record = {
      id: `adj-${Date.now()}-${crypto.randomInt(100, 999)}`,
      memberId: member.id,
      membershipId: member.membershipId,
      memberName: member.fullName,
      zone: memberGeo.zone,
      state: member.state,
      lga: member.lga,
      previousStatus: prevStatus,
      newStatus,
      previousAmountPaid: prevAmount,
      newAmountPaid: nextAmount,
      reason: String(reason).trim(),
      requestedById: exec.id,
      requestedByName: exec.fullName,
      approvedById: approver.id,
      approvedByName: approver.fullName,
      approvedByPosition: approver.position || approver.title,
      auditRef,
      createdAt: nowWatLabel(),
      createdAtMs: Date.now()
    };
    db.financialAdjustments.unshift(record);
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: exec.level || "super_admin",
      actorJurisdiction: exec.jurisdiction,
      action: "PAYMENT_ADJUSTMENT",
      affectedRecordId: member.id,
      affectedRecordLabel: `${member.fullName} (${member.membershipId})`,
      details: `Manual payment adjustment [${auditRef}]: ${prevStatus} (₦${prevAmount.toLocaleString()}) -> ${newStatus} (₦${nextAmount.toLocaleString()}). Approver: ${approver.fullName}. Reason: ${record.reason}`,
      ...memberGeo
    });
    res.status(201).json({ adjustment: record, member });
  });
  app.post("/api/reports", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    if (!exec.permissions?.canSubmitReports && exec.level !== "super_admin") {
      res.status(403).json({ error: "Not authorized to submit executive reports." });
      return;
    }
    const { title, reportType, summary, metrics } = req.body || {};
    if (!title || !summary) {
      res.status(400).json({ error: "Report title and summary are required." });
      return;
    }
    const execLevel = exec.level || "national";
    const routedTo = nextRoutingLevel(execLevel);
    const state = exec.assignedState || "FCT Abuja";
    const zone = exec.assignedZone || ammonStore.resolveZoneForState(state);
    const lga = exec.assignedLga || "National Secretariat";
    const report = {
      id: `rep-${Date.now()}-${crypto.randomInt(100, 999)}`,
      title: String(title).trim(),
      reportType: reportType || "Monthly Activity",
      summary: String(summary).trim(),
      metrics: metrics || void 0,
      submittedById: exec.id,
      submittedByName: exec.fullName,
      submittedByPosition: exec.position || exec.title,
      submittedByLevel: execLevel,
      zone,
      state,
      lga,
      ward: exec.assignedWard,
      community: exec.assignedCommunity,
      routedToLevel: routedTo,
      reviewStatus: "Submitted",
      administrativeComments: [],
      submittedAt: nowWatLabel(),
      createdAtMs: Date.now()
    };
    ammonStore.getData().reports.unshift(report);
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: execLevel,
      actorJurisdiction: exec.jurisdiction,
      action: "REPORT_SUBMITTED",
      affectedRecordId: report.id,
      affectedRecordLabel: `${report.title} (${report.reportType})`,
      details: `Submitted ${execLevel.toUpperCase()} report automatically routed to ${routedTo.toUpperCase()} Executive level.`,
      zone,
      state,
      lga
    });
    res.status(201).json({ report });
  });
  app.patch("/api/reports/:id/review", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    if (!exec.permissions?.canReviewReports && exec.level !== "super_admin") {
      res.status(403).json({ error: "Your executive position cannot review or comment on subordinate reports." });
      return;
    }
    const report = ammonStore.getData().reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: "Executive report not found." });
      return;
    }
    if (!ammonStore.isGeoInJurisdiction(exec, report)) {
      denyAndLogJurisdictionViolation(
        exec,
        res,
        report.id,
        `Cannot review report from ${report.state}/${report.lga} outside ${exec.jurisdiction}.`,
        report
      );
      return;
    }
    const { reviewStatus, comment, escalate } = req.body || {};
    if (reviewStatus) {
      report.reviewStatus = reviewStatus;
    }
    if (escalate) {
      report.routedToLevel = nextRoutingLevel(report.routedToLevel);
      report.reviewStatus = "Escalated to Next Level";
    }
    if (comment && String(comment).trim()) {
      report.administrativeComments.push({
        authorId: exec.id,
        authorName: exec.fullName,
        authorPosition: exec.position || exec.title,
        comment: String(comment).trim(),
        timestamp: nowWatLabel()
      });
    }
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: exec.level || "national",
      actorJurisdiction: exec.jurisdiction,
      action: "REPORT_REVIEWED",
      affectedRecordId: report.id,
      affectedRecordLabel: report.title,
      details: `Updated report review status to "${report.reviewStatus}" (Routed level: ${report.routedToLevel.toUpperCase()}).`,
      zone: report.zone,
      state: report.state,
      lga: report.lga
    });
    res.json({ report });
  });
  app.post("/api/announcements", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    if (!exec.permissions?.canPublishAnnouncements && exec.level !== "super_admin") {
      res.status(403).json({ error: "Not authorized to publish targeted executive announcements." });
      return;
    }
    const { title, body, type, targetLevel, targetZone, targetState, targetLga, targetWard, meetingDate, meetingCode } = req.body || {};
    if (!title || !body) {
      res.status(400).json({ error: "Announcement title and body are required." });
      return;
    }
    const senderLevel = exec.level || "national";
    const resolvedTargetZone = senderLevel === "zonal" || senderLevel === "state" || senderLevel === "lga" ? exec.assignedZone : targetZone;
    const resolvedTargetState = senderLevel === "state" || senderLevel === "lga" ? exec.assignedState : targetState;
    const resolvedTargetLga = senderLevel === "lga" ? exec.assignedLga : targetLga;
    if (senderLevel !== "super_admin" && senderLevel !== "national" && senderLevel !== "specialized") {
      if (targetZone && exec.assignedZone && targetZone !== exec.assignedZone) {
        denyAndLogJurisdictionViolation(
          exec,
          res,
          `Announcement:${targetZone}`,
          `Cannot target "${targetZone}" zone from ${exec.jurisdiction}.`
        );
        return;
      }
      if (targetState && exec.assignedState && targetState !== exec.assignedState) {
        denyAndLogJurisdictionViolation(
          exec,
          res,
          `Announcement:${targetState}`,
          `Cannot target "${targetState}" state from ${exec.jurisdiction}.`
        );
        return;
      }
      if (targetLga && exec.assignedLga && targetLga !== exec.assignedLga) {
        denyAndLogJurisdictionViolation(
          exec,
          res,
          `Announcement:${targetLga}`,
          `Cannot target "${targetLga}" LGA from ${exec.jurisdiction}.`
        );
        return;
      }
    }
    const ann = {
      id: `ann-${Date.now()}-${crypto.randomInt(100, 999)}`,
      title: String(title).trim(),
      body: String(body).trim(),
      type: type || "Announcement",
      senderId: exec.id,
      senderName: exec.fullName,
      senderPosition: exec.position || exec.title,
      senderLevel,
      targetLevel: targetLevel || "all",
      targetZone: resolvedTargetZone || void 0,
      targetState: resolvedTargetState || void 0,
      targetLga: resolvedTargetLga || void 0,
      targetWard: targetWard || void 0,
      meetingDate: meetingDate || void 0,
      meetingCode: meetingCode || void 0,
      createdAt: nowWatLabel(),
      createdAtMs: Date.now()
    };
    ammonStore.getData().announcements.unshift(ann);
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: senderLevel,
      actorJurisdiction: exec.jurisdiction,
      action: "ANNOUNCEMENT_PUBLISHED",
      affectedRecordId: ann.id,
      affectedRecordLabel: ann.title,
      details: `Published targeted "${ann.type}" to level=${ann.targetLevel} (${ann.targetLga || ann.targetState || ann.targetZone || "Nationwide"}).`,
      zone: ann.targetZone,
      state: ann.targetState,
      lga: ann.targetLga
    });
    res.status(201).json({ announcement: ann });
  });
  app.post("/api/executives", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    if (exec.level !== "super_admin" && !exec.permissions?.canManageExecutives) {
      res.status(403).json({ error: "Only the Super Admin can create hierarchical executive accounts." });
      return;
    }
    try {
      const result = ammonStore.createExecutive(exec, req.body || {});
      res.status(201).json({
        executive: sanitizeExecutive(result.executive),
        tempPassword: result.tempPassword,
        inviteCode: result.inviteCode
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Unable to create executive account." });
    }
  });
  app.patch("/api/executives/:id", requireExecutiveAuth, (req, res) => {
    const actor = req.executive;
    if (actor.level !== "super_admin" && !actor.permissions?.canManageExecutives) {
      res.status(403).json({ error: "Only the Super Admin can modify executive accounts and permissions." });
      return;
    }
    const target = ammonStore.findExecutiveById(req.params.id);
    if (!target) {
      res.status(404).json({ error: "Executive account not found." });
      return;
    }
    const { activationStatus, permissions, position } = req.body || {};
    if (activationStatus) target.activationStatus = activationStatus;
    if (position) {
      target.position = String(position).trim();
      target.title = target.position;
    }
    if (permissions && typeof permissions === "object") {
      target.permissions = {
        ...target.permissions || {},
        ...permissions
      };
    }
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      actorLevel: actor.level || "super_admin",
      actorJurisdiction: actor.jurisdiction,
      action: "PERMISSION_CHANGED",
      affectedRecordId: target.id,
      affectedRecordLabel: `${target.fullName} (${target.badgeNumber})`,
      details: `Updated status (${target.activationStatus}) / permissions for ${target.fullName} (${target.jurisdiction}).`,
      zone: target.assignedZone,
      state: target.assignedState,
      lga: target.assignedLga
    });
    res.json({ executive: sanitizeExecutive(target) });
  });
  app.put("/api/hierarchy", requireExecutiveAuth, (req, res) => {
    const actor = req.executive;
    if (actor.level !== "super_admin" && !actor.permissions?.canManageHierarchy) {
      res.status(403).json({ error: "Only the Super Admin can modify the administrative hierarchy configuration." });
      return;
    }
    const incomingConfig = req.body?.hierarchyConfig;
    if (!incomingConfig || !Array.isArray(incomingConfig.zones)) {
      res.status(400).json({ error: "Valid hierarchyConfig object is required." });
      return;
    }
    ammonStore.getData().hierarchyConfig = incomingConfig;
    ammonStore.save();
    ammonStore.appendAuditLog({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      actorLevel: actor.level || "super_admin",
      actorJurisdiction: actor.jurisdiction,
      action: "HIERARCHY_UPDATED",
      affectedRecordId: "config-national",
      affectedRecordLabel: "AMMON Administrative Hierarchy Config",
      details: `Updated zones (${incomingConfig.zones.length}), administrative levels, LGAs/Wards/Communities, and partial payment policy (${Boolean(incomingConfig.allowPartialPayments)}).`
    });
    res.json({ hierarchyConfig: ammonStore.getData().hierarchyConfig });
  });
  const uploadsRoot = path.resolve(__dirname, ".ammon-data", "uploads");
  const MIME_BY_EXT = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".m4v": "video/x-m4v",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".ogv": "video/ogg",
    ".3gp": "video/3gpp",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
    ".csv": "text/csv; charset=utf-8"
  };
  const EXT_BY_MIME = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
    "video/ogg": "ogv",
    "video/3gpp": "3gp",
    "video/x-matroska": "mkv",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf"
  };
  app.post("/api/uploads/kyc", (req, res) => {
    try {
      const { folder, fileName, dataUrl } = req.body || {};
      const allowedFolders = ["member-passports", "kyc-documents"];
      const cleanFolder = allowedFolders.includes(folder) ? folder : "kyc-documents";
      if (typeof dataUrl !== "string" || !/^data:[^;]*;base64,/i.test(dataUrl)) {
        res.status(400).json({ error: "Valid base64 JPEG, PNG, or WebP image payload is required." });
        return;
      }
      const commaIdx = dataUrl.indexOf(",");
      const mimeMatch = dataUrl.slice(0, commaIdx).match(/^data:([^;]+);base64$/i);
      const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : "image/jpeg";
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
      const base64Data = dataUrl.slice(commaIdx + 1).replace(/\s+/g, "");
      const buffer = Buffer.from(base64Data, "base64");
      if (!buffer.length || buffer.length > 6 * 1024 * 1024) {
        res.status(400).json({ error: "Uploaded image exceeds 6 MB limit or is empty." });
        return;
      }
      const baseSafe = String(fileName || "kyc").replace(/\.[a-zA-Z0-9]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
      const storedName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${baseSafe}.${ext}`;
      const targetDir = path.join(uploadsRoot, cleanFolder);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, storedName), buffer);
      res.status(201).json({
        url: `/api/uploads/${cleanFolder}/${storedName}`,
        storagePath: `ammon-kyc/${cleanFolder}/${storedName}`
      });
    } catch (err) {
      console.error("KYC upload write error:", err);
      res.status(500).json({ error: "Server failed to persist uploaded KYC image." });
    }
  });
  app.post("/api/uploads/profile-photo", (req, res) => {
    try {
      const { userId, fileName, dataUrl } = req.body || {};
      if (typeof dataUrl !== "string" || !/^data:image\/[^;]+;base64,/i.test(dataUrl)) {
        res.status(400).json({ error: "Valid base64 JPEG, PNG, or WebP profile image is required." });
        return;
      }
      const commaIdx = dataUrl.indexOf(",");
      const mimeMatch = dataUrl.slice(0, commaIdx).match(/^data:([^;]+);base64$/i);
      const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : "image/jpeg";
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
      const base64Data = dataUrl.slice(commaIdx + 1).replace(/\s+/g, "");
      const buffer = Buffer.from(base64Data, "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
        res.status(400).json({ error: "Uploaded profile image exceeds 5 MB limit or is empty." });
        return;
      }
      const safeUser = String(userId || "user").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "user";
      const baseSafe = String(fileName || "avatar").replace(/\.[a-zA-Z0-9]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
      const storedName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safeUser}_${baseSafe}.${ext}`;
      const targetDir = path.join(uploadsRoot, "profile-photos");
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, storedName), buffer);
      res.status(201).json({
        url: `/api/uploads/profile-photos/${storedName}`,
        storagePath: `profile-photos/${safeUser}/${storedName}`
      });
    } catch (err) {
      console.error("Profile photo write error:", err);
      res.status(500).json({ error: "Server failed to persist uploaded profile photo." });
    }
  });
  app.patch("/api/members/:id/profile-photo", (req, res) => {
    const { photoUrl, passportStoragePath } = req.body || {};
    if (typeof photoUrl !== "string" || !photoUrl.trim() || photoUrl.length > 7e5) {
      res.status(400).json({ error: "A valid profile photo URL or compact image data is required." });
      return;
    }
    const member = ammonStore.getData().members.find((m) => m.id === req.params.id || m.membershipId === req.params.id);
    if (!member) {
      res.status(404).json({ error: "Member record not found." });
      return;
    }
    member.photoUrl = photoUrl.trim();
    if (typeof passportStoragePath === "string" && passportStoragePath.trim()) {
      member.passportStoragePath = passportStoragePath.trim();
    }
    ammonStore.save();
    res.json({ member: sanitizeMember(member) });
  });
  app.patch("/api/executive/profile-photo", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    const { avatarUrl } = req.body || {};
    if (typeof avatarUrl !== "string" || !avatarUrl.trim() || avatarUrl.length > 7e5) {
      res.status(400).json({ error: "A valid executive profile photo URL or image data is required." });
      return;
    }
    exec.avatarUrl = avatarUrl.trim();
    ammonStore.save();
    res.json({ executive: sanitizeExecutive(exec) });
  });
  app.post(
    "/api/uploads/chat-media",
    express.raw({ type: "*/*", limit: "26mb" }),
    (req, res) => {
      try {
        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        if (!buffer.length || buffer.length > 25 * 1024 * 1024) {
          res.status(400).json({ error: "Uploaded file is empty or exceeds the 25 MB limit." });
          return;
        }
        const rawName = String(req.headers["x-file-name"] || req.query.fileName || "media.bin");
        const mimeType = String(
          req.headers["x-mime-type"] || req.query.mimeType || "application/octet-stream"
        ).toLowerCase().split(";")[0].trim();
        const origExtMatch = rawName.match(/\.([a-zA-Z0-9]{1,6})$/);
        const origExt = origExtMatch ? origExtMatch[1].toLowerCase() : "";
        const ext = origExt || EXT_BY_MIME[mimeType] || "bin";
        const baseSafe = rawName.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48) || "chat_media";
        const storedName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${baseSafe}.${ext}`;
        const targetDir = path.join(uploadsRoot, "chat-media");
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, storedName), buffer);
        const resolvedMime = MIME_BY_EXT[`.${ext}`] || mimeType || "application/octet-stream";
        res.status(201).json({
          url: `/api/uploads/chat-media/${storedName}`,
          storagePath: `chat-media/${storedName}`,
          contentType: resolvedMime,
          size: buffer.length
        });
      } catch (err) {
        console.error("Chat media upload error:", err);
        res.status(500).json({ error: "Server failed to persist uploaded chat media." });
      }
    }
  );
  app.delete("/api/social-messages/:id/permanent", requireExecutiveAuth, (req, res) => {
    const exec = req.executive;
    if (exec.level !== "super_admin" && exec.role !== "Super Admin") {
      res.status(403).json({
        error: "Only the Super Admin can delete posts for everyone and permanently erase chat photos or videos."
      });
      return;
    }
    const messageId = String(req.params.id || "").trim();
    const { attachmentData, attachmentStoragePath, channelId, senderName } = req.body || {};
    let deletedMediaFile = false;
    const candidatePath = typeof attachmentStoragePath === "string" && attachmentStoragePath.startsWith("chat-media/") ? attachmentStoragePath.replace(/^chat-media\//, "") : typeof attachmentData === "string" && attachmentData.startsWith("/api/uploads/chat-media/") ? attachmentData.replace(/^\/api\/uploads\/chat-media\//, "") : "";
    if (candidatePath && /^[a-zA-Z0-9._-]+$/.test(candidatePath)) {
      const targetFile = path.join(uploadsRoot, "chat-media", candidatePath);
      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
        deletedMediaFile = true;
      }
    }
    ammonStore.appendAuditLog({
      actorId: exec.id,
      actorName: exec.fullName,
      actorRole: exec.role,
      actorLevel: exec.level || "super_admin",
      actorJurisdiction: exec.jurisdiction,
      action: "CHAT_MESSAGE_PERMANENT_DELETE",
      affectedRecordId: messageId || "chat-msg",
      affectedRecordLabel: `${senderName || "Participant"} in #${channelId || "social"}`,
      details: `Super Admin permanently deleted chat post ${messageId} for all users${deletedMediaFile ? " and purged attached media file from AMMON storage" : ""}.`
    });
    res.json({ deleted: true, deletedMediaFile });
  });
  const handleRecordingUpload = (folderName, storagePrefix) => (req, res) => {
    try {
      const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!buffer.length || buffer.length > 200 * 1024 * 1024) {
        res.status(400).json({ error: "Recorded video is empty or exceeds the 200 MB limit." });
        return;
      }
      const rawName = String(req.headers["x-file-name"] || req.query.fileName || "meeting-recording.webm");
      const safeMeetingId = String(req.headers["x-meeting-id"] || req.query.meetingId || "meeting").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "meeting";
      const mimeType = String(req.headers["x-mime-type"] || req.query.mimeType || "video/webm").toLowerCase().split(";")[0].trim();
      const origExtMatch = rawName.match(/\.([a-zA-Z0-9]{1,6})$/);
      const origExt = origExtMatch ? origExtMatch[1].toLowerCase() : "";
      const ext = origExt || EXT_BY_MIME[mimeType] || "webm";
      const baseSafe = rawName.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48) || "ammon_meeting";
      const storedName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${baseSafe}.${ext}`;
      const targetDir = path.join(uploadsRoot, folderName);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, storedName), buffer);
      const resolvedMime = MIME_BY_EXT[`.${ext}`] || mimeType || "video/webm";
      res.status(201).json({
        url: `/api/uploads/${folderName}/${storedName}`,
        storagePath: `${storagePrefix}/${safeMeetingId}/${storedName}`,
        contentType: resolvedMime,
        size: buffer.length
      });
    } catch (err) {
      console.error("Meeting recording backup write error:", err);
      res.status(500).json({ error: "Server failed to store meeting recording backup." });
    }
  };
  app.post(
    "/api/uploads/recordings",
    express.raw({ type: "*/*", limit: "205mb" }),
    handleRecordingUpload("recordings", "recordings")
  );
  app.post(
    "/api/uploads/meeting-recordings",
    express.raw({ type: "*/*", limit: "205mb" }),
    handleRecordingUpload("meeting-recordings", "ammon-meeting-recordings")
  );
  app.get("/api/uploads/recordings", (_req, res) => {
    try {
      const targetDir = path.join(uploadsRoot, "recordings");
      if (!fs.existsSync(targetDir)) {
        res.json({ recordings: [] });
        return;
      }
      const files = fs.readdirSync(targetDir).filter((f) => /\.(webm|mp4|mov|mkv)$/i.test(f));
      const recordings = files.map((filename) => {
        const stat = fs.statSync(path.join(targetDir, filename));
        const ext = path.extname(filename).toLowerCase();
        return {
          filename,
          url: `/api/uploads/recordings/${filename}`,
          storagePath: `recordings/${filename}`,
          mimeType: MIME_BY_EXT[ext] || "video/webm",
          size: stat.size,
          createdAtMs: Math.round(stat.birthtimeMs || stat.mtimeMs || Date.now())
        };
      }).sort((a, b) => b.createdAtMs - a.createdAtMs);
      res.json({ recordings });
    } catch (err) {
      console.error("List recordings error:", err);
      res.status(500).json({ error: "Unable to list saved recordings." });
    }
  });
  app.delete("/api/uploads/recordings/:filename", (req, res) => {
    const filename = String(req.params.filename || "");
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      res.status(400).json({ error: "Invalid filename." });
      return;
    }
    const filePath = path.join(uploadsRoot, "recordings", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ deleted: true });
  });
  app.get("/api/uploads/:folder/:filename", (req, res) => {
    const folder = String(req.params.folder || "");
    const filename = String(req.params.filename || "");
    if (!["member-passports", "kyc-documents", "profile-photos", "chat-media", "recordings", "meeting-recordings"].includes(folder) || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      res.status(400).json({ error: "Invalid asset path." });
      return;
    }
    const filePath = path.join(uploadsRoot, folder, filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Uploaded asset not found." });
      return;
    }
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";
    res.sendFile(filePath, {
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000"
      }
    });
  });
  app.use("/api", (err, _req, res, _next) => {
    const status = err && typeof err === "object" && "status" in err && typeof err.status === "number" ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unexpected API request error.";
    res.status(status).json({ error: message });
  });
  // Ensure unmatched /api/* endpoints return JSON 404 before SPA HTML fallback
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found." });
  });

  const isExplicitDev = process.env.NODE_ENV === "development" || process.env.npm_lifecycle_event === "dev";
  const distDir = path.resolve(__dirname, "dist");
  const distIndexPath = path.join(distDir, "index.html");
  const rootIndexPath = path.resolve(__dirname, "index.html");
  const publicDir = path.resolve(__dirname, "public");
  const hasDistBuild = fs.existsSync(distIndexPath);

  if (isExplicitDev && process.env.NODE_ENV !== "production" || !hasDistBuild && process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        root: __dirname,
        server: {
          middlewareMode: true,
          hmr: isExplicitDev ? void 0 : false
        },
        appType: "spa"
      });
      app.get("/", async (req, res, next) => {
        try {
          if (!fs.existsSync(rootIndexPath)) {
            res.status(404).send("index.html not found.");
            return;
          }
          const rawHtml = fs.readFileSync(rootIndexPath, "utf8");
          const html = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
        } catch (err) {
          vite.ssrFixStacktrace(err);
          next(err);
        }
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("Vite middleware unavailable, falling back to static dist serving:", viteErr?.message || viteErr);
    }
  }

  if (!isExplicitDev || process.env.NODE_ENV === "production") {
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir, { index: "index.html" }));
    }
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
    }
    const serveSpaEntry = (_req, res) => {
      if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
        return;
      }
      res.status(503).send("Application build not found (dist/index.html). Please run npm run build.");
    };
    app.get("/", serveSpaEntry);
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path === "/api" || req.path.startsWith("/ws/")) {
        return next();
      }
      serveSpaEntry(req, res);
    });
  }
  const meetingRooms = /* @__PURE__ */ new Map();
  const toPublicPeer = (p) => ({
    peerId: p.peerId,
    userId: p.userId,
    name: p.name,
    role: p.role,
    micOn: p.micOn,
    camOn: p.camOn,
    screenSharing: p.screenSharing,
    handRaised: p.handRaised
  });
  const broadcastRoom = (roomId, payload, excludePeerId) => {
    const room = meetingRooms.get(roomId);
    if (!room) return;
    const raw = JSON.stringify(payload);
    for (const [id, peer] of room.entries()) {
      if (id !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(raw);
      }
    }
  };
  const removePeerFromRoom = (roomId, peerId) => {
    if (!roomId || !peerId) return;
    const room = meetingRooms.get(roomId);
    if (!room) return;
    if (room.delete(peerId)) {
      broadcastRoom(roomId, { type: "peer-left", peerId });
      if (room.size === 0) {
        meetingRooms.delete(roomId);
      }
    }
  };
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (req, socket, head) => {
    try {
      const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (reqUrl.pathname === "/ws/meetings") {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      }
    } catch {
      socket.destroy();
    }
  });
  wss.on("connection", (ws) => {
    let joinedRoomId = null;
    let joinedPeerId = null;
    ws.on("message", (rawBuf) => {
      try {
        const msg = JSON.parse(rawBuf.toString("utf8"));
        if (msg.type === "ping") {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
          }
          return;
        }
        if (msg.type === "join-room" && msg.roomId && msg.peerId) {
          if (joinedRoomId && joinedPeerId) {
            removePeerFromRoom(joinedRoomId, joinedPeerId);
          }
          const roomId = String(msg.roomId).slice(0, 128);
          const peerId = String(msg.peerId).slice(0, 128);
          joinedRoomId = roomId;
          joinedPeerId = peerId;
          let room = meetingRooms.get(roomId);
          if (!room) {
            room = /* @__PURE__ */ new Map();
            meetingRooms.set(roomId, room);
          }
          const peer = {
            peerId,
            userId: String(msg.userId || peerId).slice(0, 128),
            name: String(msg.name || "AMMON Member").slice(0, 128),
            role: String(msg.role || "Member").slice(0, 64),
            micOn: Boolean(msg.micOn),
            camOn: Boolean(msg.camOn),
            screenSharing: Boolean(msg.screenSharing),
            handRaised: Boolean(msg.handRaised),
            ws
          };
          room.set(peerId, peer);
          const existingPeers = Array.from(room.values()).filter((p) => p.peerId !== peerId).map(toPublicPeer);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "room-state",
                roomId,
                peers: existingPeers
              })
            );
          }
          broadcastRoom(
            roomId,
            {
              type: "peer-joined",
              peer: toPublicPeer(peer)
            },
            peerId
          );
          return;
        }
        if (msg.type === "media-state" && joinedRoomId && joinedPeerId) {
          const room = meetingRooms.get(joinedRoomId);
          const peer = room?.get(joinedPeerId);
          if (!peer) return;
          if (typeof msg.micOn === "boolean") peer.micOn = msg.micOn;
          if (typeof msg.camOn === "boolean") peer.camOn = msg.camOn;
          if (typeof msg.screenSharing === "boolean") peer.screenSharing = msg.screenSharing;
          if (typeof msg.handRaised === "boolean") peer.handRaised = msg.handRaised;
          broadcastRoom(
            joinedRoomId,
            {
              type: "peer-media-state",
              peer: toPublicPeer(peer)
            },
            joinedPeerId
          );
          return;
        }
        if (msg.type === "signal" && joinedRoomId && joinedPeerId && msg.targetPeerId && msg.signal) {
          const room = meetingRooms.get(joinedRoomId);
          const target = room?.get(String(msg.targetPeerId));
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(
              JSON.stringify({
                type: "signal",
                fromPeerId: joinedPeerId,
                signal: msg.signal
              })
            );
          }
          return;
        }
        if (msg.type === "recording-state" && joinedRoomId && joinedPeerId) {
          broadcastRoom(
            joinedRoomId,
            {
              type: "recording-state",
              isRecording: Boolean(msg.isRecording),
              startedBy: String(msg.startedBy || msg.name || "Meeting Host")
            },
            joinedPeerId
          );
          return;
        }
        if (msg.type === "end-meeting" && joinedRoomId && joinedPeerId) {
          const room = meetingRooms.get(joinedRoomId);
          const sender = room?.get(joinedPeerId);
          broadcastRoom(
            joinedRoomId,
            {
              type: "meeting-ended",
              roomId: joinedRoomId,
              endedBy: sender?.name || String(msg.name || "Meeting Host")
            },
            joinedPeerId
          );
          if (room) {
            room.clear();
            meetingRooms.delete(joinedRoomId);
          }
          joinedRoomId = null;
          joinedPeerId = null;
          return;
        }
        if (msg.type === "leave-room") {
          removePeerFromRoom(joinedRoomId, joinedPeerId);
          joinedRoomId = null;
          joinedPeerId = null;
        }
      } catch {
      }
    });
    ws.on("close", () => {
      removePeerFromRoom(joinedRoomId, joinedPeerId);
      joinedRoomId = null;
      joinedPeerId = null;
    });
    ws.on("error", () => {
      removePeerFromRoom(joinedRoomId, joinedPeerId);
      joinedRoomId = null;
      joinedPeerId = null;
    });
  });
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`AMMON Full-Stack Server & WebRTC Signaling listening on http://0.0.0.0:${PORT}`);
  });
}
createAppServer().catch((err) => {
  console.error("Failed to start AMMON server:", err);
  process.exit(1);
});
