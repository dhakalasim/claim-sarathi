import { http, HttpResponse } from "msw";
import {
  CLAIM_STAGE_TRANSITIONS,
  TERMINAL_STAGES,
  SLA_BREACH_DAYS,
  type Claim,
  type ClaimStage,
  type DocumentAuditLogDto,
  type DocumentDto,
  type Role,
} from "@claimsarathi/shared";
import {
  DEMO_PASSWORD,
  auditLogsByDocument,
  claims,
  documentBlobs,
  documentsByClaim,
  nextId,
  policies,
  stageEventsByClaim,
  users,
  type MockUser,
} from "./data";

/** Fake, unsigned "JWT" — good enough for a client-only demo, never used against a real backend. */
function issueToken(user: MockUser): string {
  return btoa(JSON.stringify({ sub: user.id, role: user.role, locale: user.locale }));
}

function currentUser(request: Request): MockUser | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(atob(auth.slice("Bearer ".length))) as { sub: string };
    return users.find((u) => u.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

function userPublic(user: MockUser) {
  return { id: user.id, fullName: user.fullName, role: user.role, locale: user.locale };
}

/** Mirrors apps/api's ClaimsService.listClaims role-scoping — same rule, same data shape. */
function scopedClaimsFor(user: MockUser): Claim[] {
  if (user.role === "POLICYHOLDER") return claims.filter((c) => c.policyholderId === user.id);
  if (user.role === "SURVEYOR") return claims.filter((c) => c.surveyorId === user.id);
  if (user.role === "BRANCH_OFFICER") return claims.filter((c) => c.branchOfficerId === user.id);
  return claims;
}

/** Mirrors apps/api's claim-state-machine.ts STAGE_ENTRY_PERMISSIONS — which role may move a claim into a given stage. */
const STAGE_ENTRY_PERMISSIONS: Record<ClaimStage, readonly Role[]> = {
  REGISTERED: ["POLICYHOLDER"],
  DOCUMENTS_UNDER_REVIEW: ["BRANCH_OFFICER"],
  SURVEYOR_ASSIGNED: ["BRANCH_OFFICER"],
  ASSESSMENT_COMPLETE: ["SURVEYOR"],
  APPROVED: ["BRANCH_OFFICER"],
  REJECTED: ["BRANCH_OFFICER"],
  PAYMENT_PROCESSED: ["BRANCH_OFFICER"],
};

const STAGE_LABELS: Record<ClaimStage, string> = {
  REGISTERED: "Registered",
  DOCUMENTS_UNDER_REVIEW: "Documents Under Review",
  SURVEYOR_ASSIGNED: "Surveyor Assigned",
  ASSESSMENT_COMPLETE: "Assessment Complete",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAYMENT_PROCESSED: "Payment Processed",
};

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const handlers = [
  http.post("*/auth/login", async ({ request }) => {
    const body = (await request.json()) as { identifier: string; password: string };
    const user = users.find((u) => u.email === body.identifier || u.phone === body.identifier);
    if (!user || body.password !== DEMO_PASSWORD) {
      return HttpResponse.json({ error: "unauthorized", message: "invalid credentials" }, { status: 401 });
    }
    return HttpResponse.json({ token: issueToken(user), user: userPublic(user) });
  }),

  http.post("*/auth/register", async ({ request }) => {
    const body = (await request.json()) as { fullName: string; email?: string; phone?: string; locale?: "en" | "ne" };
    const user: MockUser = {
      id: nextId("user"),
      email: body.email ?? "",
      phone: body.phone ?? "",
      fullName: body.fullName,
      role: "POLICYHOLDER",
      locale: body.locale ?? "en",
    };
    users.push(user);
    return HttpResponse.json({ token: issueToken(user), user: userPublic(user) }, { status: 201 });
  }),

  http.get("*/auth/me", ({ request }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });
    return HttpResponse.json({ ...userPublic(user), email: user.email, phone: user.phone, createdAt: new Date().toISOString() });
  }),

  http.post("*/claims", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });

    const body = (await request.json()) as { policyNumber: string; claimType: string; incidentDate: string; description: string };
    const policy = policies.find((p) => p.policyNumber === body.policyNumber);
    if (!policy) {
      return HttpResponse.json({ error: "not_found", message: `policy ${body.policyNumber} not found` }, { status: 404 });
    }

    const now = new Date();
    const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
    const claim: Claim = {
      id: nextId("claim"),
      claimNumber: `CS-DEMO-${suffix}`,
      policyId: policy.id,
      policyholderId: user.id,
      claimType: policy.claimType,
      incidentDate: new Date(body.incidentDate),
      description: body.description,
      currentStage: "REGISTERED",
      branchOfficerId: null,
      surveyorId: null,
      stageEnteredAt: now,
      createdAt: now,
      updatedAt: now,
    };
    claims.push(claim);
    stageEventsByClaim.set(claim.id, [
      {
        id: nextId("event"),
        fromStage: null,
        toStage: "REGISTERED",
        actorId: user.id,
        actorName: user.fullName,
        note: "Claim registered by policyholder",
        createdAt: now,
      },
    ]);
    documentsByClaim.set(claim.id, []);

    return HttpResponse.json(claim, { status: 201 });
  }),

  http.get("*/claims", ({ request }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });

    const url = new URL(request.url);
    const stage = url.searchParams.get("stage");
    const claimType = url.searchParams.get("claimType");
    const slaBreached = url.searchParams.get("slaBreached") === "true";
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

    let scoped = scopedClaimsFor(user);

    if (stage) scoped = scoped.filter((c) => c.currentStage === stage);
    if (claimType) scoped = scoped.filter((c) => c.claimType === claimType);
    if (slaBreached) {
      const threshold = Date.now() - SLA_BREACH_DAYS * 24 * 60 * 60 * 1000;
      scoped = scoped.filter((c) => !TERMINAL_STAGES.has(c.currentStage) && new Date(c.stageEnteredAt).getTime() <= threshold);
    }

    const sorted = [...scoped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const start = (page - 1) * pageSize;
    return HttpResponse.json({
      items: sorted.slice(start, start + pageSize),
      page,
      pageSize,
      total: sorted.length,
    });
  }),

  http.get("*/claims/:id", ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });

    const claim = claims.find((c) => c.id === params.id);
    if (!claim) return HttpResponse.json({ error: "not_found", message: `claim ${params.id} not found` }, { status: 404 });

    return HttpResponse.json({
      ...claim,
      stageEvents: stageEventsByClaim.get(claim.id) ?? [],
      documents: documentsByClaim.get(claim.id) ?? [],
    });
  }),

  http.post("*/claims/:id/transition", async ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });

    const claim = claims.find((c) => c.id === params.id);
    if (!claim) return HttpResponse.json({ error: "not_found", message: `claim ${params.id} not found` }, { status: 404 });

    const body = (await request.json()) as { toStage: ClaimStage; note?: string };

    if (TERMINAL_STAGES.has(claim.currentStage) || !CLAIM_STAGE_TRANSITIONS[claim.currentStage].includes(body.toStage)) {
      return HttpResponse.json(
        { error: "illegal_transition", message: `cannot transition claim from ${claim.currentStage} to ${body.toStage}` },
        { status: 422 },
      );
    }
    if (user.role !== "ADMIN" && !STAGE_ENTRY_PERMISSIONS[body.toStage].includes(user.role)) {
      return HttpResponse.json(
        { error: "forbidden", message: `role ${user.role} is not permitted to move a claim to ${body.toStage}` },
        { status: 403 },
      );
    }

    const now = new Date();
    const fromStage = claim.currentStage;
    claim.currentStage = body.toStage;
    claim.stageEnteredAt = now;
    claim.updatedAt = now;
    stageEventsByClaim.set(claim.id, [
      ...(stageEventsByClaim.get(claim.id) ?? []),
      {
        id: nextId("event"),
        fromStage,
        toStage: body.toStage,
        actorId: user.id,
        actorName: user.fullName,
        note: body.note ?? null,
        createdAt: now,
      },
    ]);

    return HttpResponse.json(claim);
  }),

  http.post("*/claims/:id/assign", async ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });

    const claim = claims.find((c) => c.id === params.id);
    if (!claim) return HttpResponse.json({ error: "not_found", message: `claim ${params.id} not found` }, { status: 404 });

    const body = (await request.json()) as { branchOfficerId?: string; surveyorId?: string };
    if (body.branchOfficerId) claim.branchOfficerId = body.branchOfficerId;
    if (body.surveyorId) claim.surveyorId = body.surveyorId;
    claim.updatedAt = new Date();

    return HttpResponse.json(claim);
  }),

  http.post("*/claims/:id/documents", async ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });

    const claimId = params.id as string;
    if (!claims.some((c) => c.id === claimId)) {
      return HttpResponse.json({ error: "not_found", message: `claim ${claimId} not found` }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file") as File | null;
    const tag = form.get("tag") as string | null;
    if (!file || !tag) {
      return HttpResponse.json({ error: "validation_error", message: "missing file or tag" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const checksum = await sha256Hex(bytes);
    const docId = nextId("doc");
    documentBlobs.set(docId, file);

    const doc: DocumentDto = {
      id: docId,
      claimId,
      tag: tag as DocumentDto["tag"],
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      checksum,
      version: 1,
      supersedesId: null,
      uploadedById: user.id,
      createdAt: new Date(),
    };
    documentsByClaim.set(claimId, [...(documentsByClaim.get(claimId) ?? []), doc]);
    auditLogsByDocument.set(docId, [
      {
        id: nextId("audit"),
        documentId: docId,
        action: "UPLOADED",
        actorId: user.id,
        actorName: user.fullName,
        metadata: { checksum, sizeBytes: file.size, version: 1 },
        createdAt: new Date(),
      },
    ]);

    return HttpResponse.json(doc, { status: 201 });
  }),

  http.get("*/documents/:id/download", ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });

    const blob = documentBlobs.get(params.id as string);
    if (!blob) return HttpResponse.json({ error: "not_found", message: "document not found" }, { status: 404 });

    const log: DocumentAuditLogDto = {
      id: nextId("audit"),
      documentId: params.id as string,
      action: "DOWNLOADED",
      actorId: user.id,
      actorName: user.fullName,
      metadata: null,
      createdAt: new Date(),
    };
    auditLogsByDocument.set(params.id as string, [...(auditLogsByDocument.get(params.id as string) ?? []), log]);

    return new HttpResponse(blob, { headers: { "Content-Type": blob.type || "application/octet-stream" } });
  }),

  http.get("*/documents/:id/audit-log", ({ params }) => {
    return HttpResponse.json(auditLogsByDocument.get(params.id as string) ?? []);
  }),

  // Rule-based stand-in for the real /assistant/chat endpoint (which calls the
  // actual Claude API server-side). There is no backend here to call, and a
  // real API key must never be embedded in a public static bundle — so this
  // answers from the same mock claim data instead, without any LLM call.
  http.post("*/assistant/chat", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ error: "unauthorized", message: "missing or invalid token" }, { status: 401 });

    const body = (await request.json()) as { messages: { role: string; content: string }[] };
    const question = body.messages[body.messages.length - 1]?.content ?? "";
    const myClaims = scopedClaimsFor(user);

    const claimNumberMatch = question.match(/CS-[A-Z0-9-]+/i)?.[0]?.toUpperCase();
    if (claimNumberMatch) {
      const claim = myClaims.find((c) => c.claimNumber === claimNumberMatch);
      const reply = claim
        ? `${claim.claimNumber} (${claim.claimType}) is currently "${STAGE_LABELS[claim.currentStage]}". Filed for: ${claim.description}`
        : `I couldn't find a claim numbered ${claimNumberMatch} in your account.`;
      return HttpResponse.json({ reply });
    }

    if (myClaims.length === 0) {
      return HttpResponse.json({ reply: "You don't have any claims on file yet." });
    }

    const list = myClaims
      .slice(0, 5)
      .map((c) => `• ${c.claimNumber} — ${c.claimType}, ${STAGE_LABELS[c.currentStage]}`)
      .join("\n");
    return HttpResponse.json({
      reply: `Here's what I can see:\n${list}\n\nAsk me about a specific claim number for more detail. (This demo runs a simplified rule-based responder in your browser — the real deployment asks Claude.)`,
    });
  }),
];
