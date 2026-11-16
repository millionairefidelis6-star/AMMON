import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AdminUser,
  AuditActionType,
  AuditLogEntry,
  DisputeTicket,
  ExecutiveAnnouncement,
  ExecutiveLevel,
  ExecutivePermissions,
  ExecutiveReport,
  FinancialAdjustmentRecord,
  HierarchyConfig,
  Member,
  PaymentStatus,
} from '../src/types/index.ts';
import {
  EXPANDED_INITIAL_MEMBERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_EXECUTIVE_ACCOUNTS,
  INITIAL_EXECUTIVE_REPORTS,
  INITIAL_FINANCIAL_ADJUSTMENTS,
  INITIAL_HIERARCHY_CONFIG,
  defaultPermissionsForLevel,
  formatJurisdictionLabel,
  resolveZoneForState,
} from '../src/data/hierarchyData.ts';
import { INITIAL_DISPUTES } from '../src/data/mockData.ts';

export interface StoredExecutive extends AdminUser {
  passwordHash: string;
  passwordSalt: string;
  inviteCode?: string;
  createdBy?: string;
}

export interface AmmonDatabase {
  executives: StoredExecutive[];
  members: Member[];
  reports: ExecutiveReport[];
  announcements: ExecutiveAnnouncement[];
  financialAdjustments: FinancialAdjustmentRecord[];
  auditLogs: AuditLogEntry[];
  disputes: DisputeTicket[];
  hierarchyConfig: HierarchyConfig;
}

const DATA_DIR = path.resolve(process.cwd(), '.ammon-data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export function sanitizeExecutive(exec: StoredExecutive): AdminUser {
  const { passwordHash: _ph, passwordSalt: _ps, inviteCode: _ic, ...safe } = exec;
  return safe;
}

export function nextRoutingLevel(level: ExecutiveLevel): ExecutiveLevel {
  switch (level) {
    case 'community':
      return 'ward';
    case 'ward':
      return 'lga';
    case 'lga':
      return 'state';
    case 'state':
      return 'zonal';
    case 'zonal':
      return 'national';
    case 'national':
    case 'specialized':
    case 'super_admin':
    default:
      return 'national';
  }
}

export function levelRank(level: ExecutiveLevel): number {
  switch (level) {
    case 'super_admin':
      return 0;
    case 'national':
      return 1;
    case 'specialized':
      return 1;
    case 'zonal':
      return 2;
    case 'state':
      return 3;
    case 'lga':
      return 4;
    case 'ward':
      return 5;
    case 'community':
      return 6;
    default:
      return 9;
  }
}

export function nowWatLabel(): string {
  const d = new Date();
  const iso = d.toISOString().slice(0, 16).replace('T', ' ');
  return `${iso} WAT`;
}

function buildInitialStore(): AmmonDatabase {
  const executives: StoredExecutive[] = INITIAL_EXECUTIVE_ACCOUNTS.map((seed) => {
    const { defaultPassword, ...rest } = seed;
    const { hash, salt } = hashPassword(defaultPassword);
    return {
      ...rest,
      passwordHash: hash,
      passwordSalt: salt,
    };
  });

  const disputes: DisputeTicket[] = INITIAL_DISPUTES.map((d) => ({
    ...d,
    zone: resolveZoneForState(d.state),
  }));

  return {
    executives,
    members: structuredClone(EXPANDED_INITIAL_MEMBERS),
    reports: structuredClone(INITIAL_EXECUTIVE_REPORTS),
    announcements: structuredClone(INITIAL_ANNOUNCEMENTS),
    financialAdjustments: structuredClone(INITIAL_FINANCIAL_ADJUSTMENTS),
    auditLogs: structuredClone(INITIAL_AUDIT_LOGS),
    disputes,
    hierarchyConfig: structuredClone(INITIAL_HIERARCHY_CONFIG),
  };
}

class AmmonStore {
  private db: AmmonDatabase;

  constructor() {
    this.db = this.load();
  }

  private load(): AmmonDatabase {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw) as Partial<AmmonDatabase>;
        if (parsed && Array.isArray(parsed.executives) && Array.isArray(parsed.members)) {
          const initial = buildInitialStore();
          return {
            executives: parsed.executives.length > 0 ? parsed.executives : initial.executives,
            members: parsed.members,
            reports: Array.isArray(parsed.reports) ? parsed.reports : initial.reports,
            announcements: Array.isArray(parsed.announcements) ? parsed.announcements : initial.announcements,
            financialAdjustments: Array.isArray(parsed.financialAdjustments)
              ? parsed.financialAdjustments
              : initial.financialAdjustments,
            auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : initial.auditLogs,
            disputes: Array.isArray(parsed.disputes) ? parsed.disputes : initial.disputes,
            hierarchyConfig: parsed.hierarchyConfig || initial.hierarchyConfig,
          };
        }
      }
    } catch (err) {
      console.warn('Could not load persisted AMMON store, initializing fresh seed:', err);
    }
    const fresh = buildInitialStore();
    this.persist(fresh);
    return fresh;
  }

  private persist(target: AmmonDatabase = this.db): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(target, null, 2), 'utf8');
    } catch (err) {
      console.warn('Unable to persist AMMON store to disk:', err);
    }
  }

  public save(): void {
    this.persist(this.db);
  }

  public getData(): AmmonDatabase {
    return this.db;
  }

  public findExecutiveById(id: string): StoredExecutive | undefined {
    return this.db.executives.find((e) => e.id === id);
  }

  public findExecutiveByLogin(identifier: string): StoredExecutive | undefined {
    const clean = identifier.trim().toLowerCase();
    const direct = this.db.executives.find(
      (e) => e.email.toLowerCase() === clean || e.badgeNumber.toLowerCase() === clean
    );
    if (direct) return direct;
    if (clean === 'millionairefidelis@gmail.com') {
      return this.findExecutiveById('exec-super');
    }
    return undefined;
  }

  public appendAuditLog(params: {
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
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
      ...params,
      timestamp: nowWatLabel(),
      createdAtMs: Date.now(),
    };
    this.db.auditLogs.unshift(entry);
    if (this.db.auditLogs.length > 500) {
      this.db.auditLogs = this.db.auditLogs.slice(0, 500);
    }
    this.save();
    return entry;
  }

  public isGeoInJurisdiction(
    exec: StoredExecutive,
    geo: { zone?: string; state?: string; lga?: string; ward?: string; community?: string }
  ): boolean {
    const level = exec.level || (exec.role === 'Super Admin' ? 'super_admin' : 'national');
    if (level === 'super_admin' || level === 'national') return true;
    if (level === 'specialized') {
      if (exec.permissions?.crossZoneAuthorized) return true;
      if (exec.assignedZone && geo.zone !== exec.assignedZone) return false;
      if (exec.assignedState && geo.state !== exec.assignedState) return false;
      return true;
    }

    const recordZone = geo.zone || (geo.state ? resolveZoneForState(geo.state) : undefined);

    if (level === 'zonal') {
      if (exec.permissions?.crossZoneAuthorized) return true;
      return Boolean(exec.assignedZone && recordZone === exec.assignedZone);
    }
    if (level === 'state') {
      return Boolean(exec.assignedState && geo.state === exec.assignedState);
    }
    if (level === 'lga') {
      return Boolean(
        exec.assignedState &&
          exec.assignedLga &&
          geo.state === exec.assignedState &&
          geo.lga?.toLowerCase() === exec.assignedLga.toLowerCase()
      );
    }
    if (level === 'ward') {
      return Boolean(
        exec.assignedState &&
          exec.assignedLga &&
          exec.assignedWard &&
          geo.state === exec.assignedState &&
          geo.lga?.toLowerCase() === exec.assignedLga.toLowerCase() &&
          geo.ward?.toLowerCase() === exec.assignedWard.toLowerCase()
      );
    }
    if (level === 'community') {
      return Boolean(
        exec.assignedState &&
          exec.assignedLga &&
          exec.assignedWard &&
          exec.assignedCommunity &&
          geo.state === exec.assignedState &&
          geo.lga?.toLowerCase() === exec.assignedLga.toLowerCase() &&
          geo.ward?.toLowerCase() === exec.assignedWard.toLowerCase() &&
          geo.community?.toLowerCase() === exec.assignedCommunity.toLowerCase()
      );
    }
    return false;
  }

  public resolveZoneForState(stateName: string): string {
    const found = this.db.hierarchyConfig.zones.find((z) => z.states.includes(stateName));
    return found ? found.name : resolveZoneForState(stateName);
  }

  public normalizePaymentStatus(m: Member): PaymentStatus {
    if (m.paymentStatus) return m.paymentStatus;
    if (m.duesPaid) return 'Paid';
    if (m.status === 'Expired') return 'Expired';
    return 'Unpaid';
  }

  public createExecutive(
    creator: StoredExecutive,
    input: {
      fullName: string;
      email: string;
      phone: string;
      position: string;
      level: ExecutiveLevel;
      assignedZone?: string;
      assignedState?: string;
      assignedLga?: string;
      assignedWard?: string;
      assignedCommunity?: string;
      specialtyScope?: string;
      activationStatus?: 'Active' | 'Invited - Password Setup Required' | 'Suspended';
      permissions?: Partial<ExecutivePermissions>;
    }
  ): { executive: StoredExecutive; tempPassword: string; inviteCode: string } {
    const cleanEmail = input.email.trim().toLowerCase();
    if (this.db.executives.some((e) => e.email.toLowerCase() === cleanEmail)) {
      throw new Error('An executive account with this email address already exists.');
    }

    const tempPassword = `AMMON-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const inviteCode = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const { hash, salt } = hashPassword(tempPassword);

    const assignedZone =
      input.assignedZone || (input.assignedState ? this.resolveZoneForState(input.assignedState) : undefined);

    const basePerms = defaultPermissionsForLevel(input.level);
    const mergedPerms: ExecutivePermissions = {
      ...basePerms,
      ...(input.permissions || {}),
    };

    const badgePrefix =
      input.level === 'super_admin'
        ? 'HQ'
        : input.level === 'national'
        ? 'NAT'
        : input.level === 'zonal'
        ? 'ZON'
        : input.level === 'state'
        ? (input.assignedState || 'ST').slice(0, 3).toUpperCase()
        : input.level === 'lga'
        ? (input.assignedLga || 'LGA').slice(0, 3).toUpperCase()
        : input.level === 'ward'
        ? 'WRD'
        : input.level === 'community'
        ? 'COM'
        : 'SPEC';

    const newExec: StoredExecutive = {
      id: `exec-${Date.now()}-${crypto.randomInt(100, 999)}`,
      fullName: input.fullName.trim(),
      role: input.level === 'super_admin' ? 'Super Admin' : 'Executive',
      level: input.level,
      title: input.position.trim(),
      position: input.position.trim(),
      email: cleanEmail,
      phone: input.phone.trim(),
      assignedZone,
      assignedState: input.assignedState,
      assignedLga: input.assignedLga,
      assignedWard: input.assignedWard,
      assignedCommunity: input.assignedCommunity,
      specialtyScope: input.specialtyScope,
      jurisdiction: formatJurisdictionLabel({
        level: input.level,
        assignedZone,
        assignedState: input.assignedState,
        assignedLga: input.assignedLga,
        assignedWard: input.assignedWard,
        assignedCommunity: input.assignedCommunity,
        specialtyScope: input.specialtyScope,
      }),
      badgeNumber: `AMMON-${badgePrefix}-${crypto.randomInt(100, 999)}`,
      activationStatus:
        input.activationStatus === 'Suspended'
          ? 'Suspended'
          : input.activationStatus === 'Active'
          ? 'Active'
          : 'Invited - Password Setup Required',
      requiresPasswordSetup: input.activationStatus !== 'Active',
      inviteCode,
      passwordHash: hash,
      passwordSalt: salt,
      permissions: mergedPerms,
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: creator.id,
      avatarUrl: '/assets/images/ammon_stakeholders_forum_1794380623181.jpg',
    };

    this.db.executives.unshift(newExec);
    this.appendAuditLog({
      actorId: creator.id,
      actorName: creator.fullName,
      actorRole: creator.role,
      actorLevel: creator.level || 'super_admin',
      actorJurisdiction: creator.jurisdiction,
      action: 'EXEC_CREATED',
      affectedRecordId: newExec.id,
      affectedRecordLabel: `${newExec.fullName} (${newExec.position})`,
      details: `Provisioned unique executive account [${newExec.level}] for jurisdiction "${newExec.jurisdiction}" with mandatory password setup.`,
      zone: newExec.assignedZone,
      state: newExec.assignedState,
      lga: newExec.assignedLga,
    });

    return { executive: newExec, tempPassword, inviteCode };
  }
}

export const ammonStore = new AmmonStore();
