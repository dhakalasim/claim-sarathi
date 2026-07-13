import type {
  Claim,
  ClaimStageEvent,
  ClaimType,
  DocumentAuditLogDto,
  DocumentDto,
  DocumentTag,
  NotificationDto,
  Role,
} from "@claimsarathi/shared";
import { CLAIM_STAGES, type ClaimStage } from "@claimsarathi/shared";

/**
 * In-browser demo data for the GitHub Pages static build. Mirrors
 * apps/api/prisma/seed.ts (same users, policies, claim mix, and the one
 * claim deliberately stuck >7 days for the admin SLA-breach flag) so the
 * static demo tells the same story as a real local run. Lives entirely in
 * memory — a page reload resets everything.
 */

export const DEMO_PASSWORD = "Password123!";
const INSURER = "Shikhar Insurance";

export interface MockUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: Role;
  locale: "en" | "ne";
}

export interface MockPolicy {
  id: string;
  policyNumber: string;
  insurerName: string;
  policyholderId: string;
  claimType: ClaimType;
  startDate: string;
  endDate: string;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function uuid(prefix: string, n: number): string {
  const suffix = String(n).padStart(12, "0");
  return `${prefix}-0000-4000-8000-${suffix}`;
}

export const users: MockUser[] = [
  { id: uuid("11111111", 1), email: "sita.sharma@example.com", phone: "+9779841000001", fullName: "Sita Sharma", role: "POLICYHOLDER", locale: "ne" },
  { id: uuid("11111111", 2), email: "ram.thapa@example.com", phone: "+9779841000002", fullName: "Ram Bahadur Thapa", role: "POLICYHOLDER", locale: "en" },
  { id: uuid("11111111", 3), email: "anita.gurung@example.com", phone: "+9779841000003", fullName: "Anita Gurung", role: "POLICYHOLDER", locale: "ne" },
  { id: uuid("22222222", 1), email: "suresh.koirala@shikhar.example", phone: "+9779851000001", fullName: "Suresh Koirala", role: "BRANCH_OFFICER", locale: "en" },
  { id: uuid("22222222", 2), email: "nabin.shrestha@shikhar.example", phone: "+9779851000002", fullName: "Nabin Shrestha", role: "BRANCH_OFFICER", locale: "en" },
  { id: uuid("22222222", 3), email: "prabin.karki@shikhar.example", phone: "+9779851000003", fullName: "Prabin Karki", role: "BRANCH_OFFICER", locale: "en" },
  { id: uuid("33333333", 1), email: "bishnu.adhikari@shikhar.example", phone: "+9779861000001", fullName: "Bishnu Adhikari", role: "SURVEYOR", locale: "en" },
  { id: uuid("33333333", 2), email: "kamala.rai@shikhar.example", phone: "+9779861000002", fullName: "Kamala Rai", role: "SURVEYOR", locale: "en" },
  { id: uuid("33333333", 3), email: "dipesh.magar@shikhar.example", phone: "+9779861000003", fullName: "Dipesh Magar", role: "SURVEYOR", locale: "en" },
  { id: uuid("44444444", 1), email: "sunita.bhattarai@shikhar.example", phone: "+9779871000001", fullName: "Sunita Bhattarai", role: "ADMIN", locale: "en" },
  { id: uuid("44444444", 2), email: "rajendra.poudel@shikhar.example", phone: "+9779871000002", fullName: "Rajendra Poudel", role: "ADMIN", locale: "en" },
  { id: uuid("44444444", 3), email: "manisha.adhikari@shikhar.example", phone: "+9779871000003", fullName: "Manisha Adhikari", role: "ADMIN", locale: "en" },
];

const sita = users[0]!;
const ram = users[1]!;
const anita = users[2]!;
const [suresh, nabin, prabin] = users.filter((u) => u.role === "BRANCH_OFFICER") as [MockUser, MockUser, MockUser];
const [bishnu, kamala, dipesh] = users.filter((u) => u.role === "SURVEYOR") as [MockUser, MockUser, MockUser];

export const policies: MockPolicy[] = [
  { id: uuid("55555555", 1), policyNumber: "SHK-MOT-1001", insurerName: INSURER, policyholderId: sita.id, claimType: "MOTOR", startDate: daysAgo(300).toISOString(), endDate: daysAgo(-65).toISOString() },
  { id: uuid("55555555", 2), policyNumber: "SHK-PRP-1002", insurerName: INSURER, policyholderId: sita.id, claimType: "PROPERTY", startDate: daysAgo(300).toISOString(), endDate: daysAgo(-65).toISOString() },
  { id: uuid("55555555", 3), policyNumber: "SHK-HLT-1003", insurerName: INSURER, policyholderId: ram.id, claimType: "HEALTH", startDate: daysAgo(300).toISOString(), endDate: daysAgo(-65).toISOString() },
  { id: uuid("55555555", 4), policyNumber: "SHK-TRV-1004", insurerName: INSURER, policyholderId: ram.id, claimType: "TRAVEL", startDate: daysAgo(300).toISOString(), endDate: daysAgo(-65).toISOString() },
  { id: uuid("55555555", 5), policyNumber: "SHK-AGR-1005", insurerName: INSURER, policyholderId: anita.id, claimType: "AGRI", startDate: daysAgo(300).toISOString(), endDate: daysAgo(-65).toISOString() },
  { id: uuid("55555555", 6), policyNumber: "SHK-MOT-1006", insurerName: INSURER, policyholderId: anita.id, claimType: "MOTOR", startDate: daysAgo(300).toISOString(), endDate: daysAgo(-65).toISOString() },
];

const STAGE_ORDER: ClaimStage[] = CLAIM_STAGES.filter((s) => s !== "REJECTED");

let stageEventCounter = 0;

function buildStageEvents(actorId: string, finalStage: ClaimStage, startedAt: Date): ClaimStageEvent[] {
  const path: ClaimStage[] =
    finalStage === "REJECTED"
      ? ["REGISTERED", "DOCUMENTS_UNDER_REVIEW", "REJECTED"]
      : STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(finalStage) + 1);

  return path.map((toStage, i) => ({
    id: uuid("66666666", ++stageEventCounter),
    fromStage: i === 0 ? null : path[i - 1]!,
    toStage,
    actorId,
    actorName: users.find((u) => u.id === actorId)?.fullName ?? "Unknown",
    note: i === 0 ? "Claim registered by policyholder" : `Moved to ${path[i]!}`,
    createdAt: new Date(startedAt.getTime() + i * 24 * 60 * 60 * 1000),
  }));
}

interface ClaimDef {
  claimNumber: string;
  policy: MockPolicy;
  description: string;
  stage: ClaimStage;
  incidentDaysAgo: number;
  stageStartedDaysAgo: number;
  branchOfficer?: MockUser;
  surveyor?: MockUser;
}

const claimDefs: ClaimDef[] = [
  { claimNumber: "CS-202601-A1B2C3", policy: policies[0]!, description: "Front bumper damage after a collision on the Ring Road.", stage: "REGISTERED", incidentDaysAgo: 2, stageStartedDaysAgo: 2 },
  { claimNumber: "CS-202601-D4E5F6", policy: policies[1]!, description: "Water damage to ground floor after monsoon flooding.", stage: "DOCUMENTS_UNDER_REVIEW", incidentDaysAgo: 10, stageStartedDaysAgo: 3, branchOfficer: suresh },
  { claimNumber: "CS-202601-G7H8I9", policy: policies[2]!, description: "Hospitalization for appendicitis surgery.", stage: "SURVEYOR_ASSIGNED", incidentDaysAgo: 15, stageStartedDaysAgo: 4, branchOfficer: nabin, surveyor: bishnu },
  { claimNumber: "CS-202601-J1K2L3", policy: policies[3]!, description: "Trip cancellation due to medical emergency abroad.", stage: "ASSESSMENT_COMPLETE", incidentDaysAgo: 20, stageStartedDaysAgo: 2, branchOfficer: prabin, surveyor: kamala },
  { claimNumber: "CS-202601-M4N5O6", policy: policies[4]!, description: "Crop loss from unseasonal hailstorm in Chitwan.", stage: "APPROVED", incidentDaysAgo: 30, stageStartedDaysAgo: 1, branchOfficer: suresh, surveyor: dipesh },
  { claimNumber: "CS-202601-P7Q8R9", policy: policies[5]!, description: "Side mirror and door dent from a parking-lot scrape.", stage: "REJECTED", incidentDaysAgo: 25, stageStartedDaysAgo: 5, branchOfficer: nabin },
  { claimNumber: "CS-202601-S1T2U3", policy: policies[1]!, description: "Fire damage to kitchen from a gas cylinder leak.", stage: "PAYMENT_PROCESSED", incidentDaysAgo: 45, stageStartedDaysAgo: 2, branchOfficer: prabin, surveyor: bishnu },
  { claimNumber: "CS-202601-V4W5X6", policy: policies[2]!, description: "Outpatient treatment for a fractured wrist.", stage: "REGISTERED", incidentDaysAgo: 1, stageStartedDaysAgo: 1 },
  { claimNumber: "CS-202601-Y7Z8A9", policy: policies[3]!, description: "Lost luggage during a connecting flight in Bangkok.", stage: "DOCUMENTS_UNDER_REVIEW", incidentDaysAgo: 12, stageStartedDaysAgo: 6, branchOfficer: suresh },
  // Deliberately stuck >7 days in SURVEYOR_ASSIGNED to demonstrate the admin SLA breach flag.
  { claimNumber: "CS-202601-B1C2D3", policy: policies[4]!, description: "Livestock loss from suspected disease outbreak.", stage: "SURVEYOR_ASSIGNED", incidentDaysAgo: 18, stageStartedDaysAgo: 9, branchOfficer: prabin, surveyor: kamala },
];

export const claims: Claim[] = [];
export const stageEventsByClaim = new Map<string, ClaimStageEvent[]>();

claimDefs.forEach((def, i) => {
  const id = uuid("77777777", i + 1);
  const stageEnteredAt = daysAgo(def.stageStartedDaysAgo);
  const createdAt = daysAgo(def.incidentDaysAgo);

  const claim: Claim = {
    id,
    claimNumber: def.claimNumber,
    policyId: def.policy.id,
    policyholderId: def.policy.policyholderId,
    claimType: def.policy.claimType,
    incidentDate: daysAgo(def.incidentDaysAgo),
    description: def.description,
    currentStage: def.stage,
    branchOfficerId: def.branchOfficer?.id ?? null,
    surveyorId: def.surveyor?.id ?? null,
    stageEnteredAt,
    createdAt,
    updatedAt: stageEnteredAt,
  };
  claims.push(claim);
  stageEventsByClaim.set(id, buildStageEvents(def.policy.policyholderId, def.stage, daysAgo(def.incidentDaysAgo - 1)));
});

export const documentsByClaim = new Map<string, DocumentDto[]>();
export const auditLogsByDocument = new Map<string, DocumentAuditLogDto[]>();
export const documentBlobs = new Map<string, Blob>();
export const notifications: NotificationDto[] = [];

export function nextId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export type { DocumentTag };
