import { PrismaClient, type ClaimStage, type ClaimType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";
const INSURER = "Shikhar Insurance";

const STAGE_ORDER: ClaimStage[] = [
  "REGISTERED",
  "DOCUMENTS_UNDER_REVIEW",
  "SURVEYOR_ASSIGNED",
  "ASSESSMENT_COMPLETE",
  "APPROVED",
  "PAYMENT_PROCESSED",
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function upsertUser(params: {
  fullName: string;
  email: string;
  phone: string;
  role: "POLICYHOLDER" | "BRANCH_OFFICER" | "SURVEYOR" | "ADMIN";
  locale?: "en" | "ne";
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  return prisma.user.upsert({
    where: { email: params.email },
    update: {},
    create: {
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      passwordHash,
      role: params.role,
      locale: params.locale ?? "en",
    },
  });
}

/** Creates the claim's full stage-event history up to `finalStage`, so the timeline looks real. */
async function seedStageHistory(claimId: string, actorId: string, finalStage: ClaimStage, startedAt: Date) {
  // REJECTED can happen from any non-terminal stage; for demo data we route
  // it through documents review, which is the most common real-world case.
  const path: ClaimStage[] =
    finalStage === "REJECTED"
      ? ["REGISTERED", "DOCUMENTS_UNDER_REVIEW", "REJECTED"]
      : STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(finalStage) + 1);

  for (let i = 0; i < path.length; i++) {
    await prisma.claimStageEvent.create({
      data: {
        claimId,
        fromStage: i === 0 ? null : path[i - 1]!,
        toStage: path[i]!,
        actorId,
        note: i === 0 ? "Claim registered by policyholder" : `Moved to ${path[i]}`,
        createdAt: new Date(startedAt.getTime() + i * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function main() {
  console.log("Seeding ClaimSarathi demo data...");

  const policyholders = await Promise.all([
    upsertUser({ fullName: "Sita Sharma", email: "sita.sharma@example.com", phone: "+9779841000001", role: "POLICYHOLDER", locale: "ne" }),
    upsertUser({ fullName: "Ram Bahadur Thapa", email: "ram.thapa@example.com", phone: "+9779841000002", role: "POLICYHOLDER" }),
    upsertUser({ fullName: "Anita Gurung", email: "anita.gurung@example.com", phone: "+9779841000003", role: "POLICYHOLDER", locale: "ne" }),
  ]);

  const branchOfficers = await Promise.all([
    upsertUser({ fullName: "Suresh Koirala", email: "suresh.koirala@shikhar.example", phone: "+9779851000001", role: "BRANCH_OFFICER" }),
    upsertUser({ fullName: "Nabin Shrestha", email: "nabin.shrestha@shikhar.example", phone: "+9779851000002", role: "BRANCH_OFFICER" }),
    upsertUser({ fullName: "Prabin Karki", email: "prabin.karki@shikhar.example", phone: "+9779851000003", role: "BRANCH_OFFICER" }),
  ]);

  const surveyors = await Promise.all([
    upsertUser({ fullName: "Bishnu Adhikari", email: "bishnu.adhikari@shikhar.example", phone: "+9779861000001", role: "SURVEYOR" }),
    upsertUser({ fullName: "Kamala Rai", email: "kamala.rai@shikhar.example", phone: "+9779861000002", role: "SURVEYOR" }),
    upsertUser({ fullName: "Dipesh Magar", email: "dipesh.magar@shikhar.example", phone: "+9779861000003", role: "SURVEYOR" }),
  ]);

  await Promise.all([
    upsertUser({ fullName: "Sunita Bhattarai", email: "sunita.bhattarai@shikhar.example", phone: "+9779871000001", role: "ADMIN" }),
    upsertUser({ fullName: "Rajendra Poudel", email: "rajendra.poudel@shikhar.example", phone: "+9779871000002", role: "ADMIN" }),
    upsertUser({ fullName: "Manisha Adhikari", email: "manisha.adhikari@shikhar.example", phone: "+9779871000003", role: "ADMIN" }),
  ]);

  const policyDefs: { policyNumber: string; claimType: ClaimType; policyholder: (typeof policyholders)[number] }[] = [
    { policyNumber: "SHK-MOT-1001", claimType: "MOTOR", policyholder: policyholders[0] },
    { policyNumber: "SHK-PRP-1002", claimType: "PROPERTY", policyholder: policyholders[0] },
    { policyNumber: "SHK-HLT-1003", claimType: "HEALTH", policyholder: policyholders[1] },
    { policyNumber: "SHK-TRV-1004", claimType: "TRAVEL", policyholder: policyholders[1] },
    { policyNumber: "SHK-AGR-1005", claimType: "AGRI", policyholder: policyholders[2] },
    { policyNumber: "SHK-MOT-1006", claimType: "MOTOR", policyholder: policyholders[2] },
  ];

  const policies = await Promise.all(
    policyDefs.map((def) =>
      prisma.policy.upsert({
        where: { policyNumber: def.policyNumber },
        update: {},
        create: {
          policyNumber: def.policyNumber,
          insurerName: INSURER,
          policyholderId: def.policyholder.id,
          claimType: def.claimType,
          startDate: daysAgo(300),
          endDate: daysAgo(-65),
        },
      }),
    ),
  );

  const claimDefs: {
    claimNumber: string;
    policy: (typeof policies)[number];
    description: string;
    stage: ClaimStage;
    incidentDaysAgo: number;
    stageStartedDaysAgo: number;
    branchOfficer?: (typeof branchOfficers)[number];
    surveyor?: (typeof surveyors)[number];
  }[] = [
    { claimNumber: "CS-202601-A1B2C3", policy: policies[0]!, description: "Front bumper damage after a collision on the Ring Road.", stage: "REGISTERED", incidentDaysAgo: 2, stageStartedDaysAgo: 2 },
    { claimNumber: "CS-202601-D4E5F6", policy: policies[1]!, description: "Water damage to ground floor after monsoon flooding.", stage: "DOCUMENTS_UNDER_REVIEW", incidentDaysAgo: 10, stageStartedDaysAgo: 3, branchOfficer: branchOfficers[0] },
    { claimNumber: "CS-202601-G7H8I9", policy: policies[2]!, description: "Hospitalization for appendicitis surgery.", stage: "SURVEYOR_ASSIGNED", incidentDaysAgo: 15, stageStartedDaysAgo: 4, branchOfficer: branchOfficers[1], surveyor: surveyors[0] },
    { claimNumber: "CS-202601-J1K2L3", policy: policies[3]!, description: "Trip cancellation due to medical emergency abroad.", stage: "ASSESSMENT_COMPLETE", incidentDaysAgo: 20, stageStartedDaysAgo: 2, branchOfficer: branchOfficers[2], surveyor: surveyors[1] },
    { claimNumber: "CS-202601-M4N5O6", policy: policies[4]!, description: "Crop loss from unseasonal hailstorm in Chitwan.", stage: "APPROVED", incidentDaysAgo: 30, stageStartedDaysAgo: 1, branchOfficer: branchOfficers[0], surveyor: surveyors[2] },
    { claimNumber: "CS-202601-P7Q8R9", policy: policies[5]!, description: "Side mirror and door dent from a parking-lot scrape.", stage: "REJECTED", incidentDaysAgo: 25, stageStartedDaysAgo: 5, branchOfficer: branchOfficers[1] },
    { claimNumber: "CS-202601-S1T2U3", policy: policies[1]!, description: "Fire damage to kitchen from a gas cylinder leak.", stage: "PAYMENT_PROCESSED", incidentDaysAgo: 45, stageStartedDaysAgo: 2, branchOfficer: branchOfficers[2], surveyor: surveyors[0] },
    { claimNumber: "CS-202601-V4W5X6", policy: policies[2]!, description: "Outpatient treatment for a fractured wrist.", stage: "REGISTERED", incidentDaysAgo: 1, stageStartedDaysAgo: 1 },
    { claimNumber: "CS-202601-Y7Z8A9", policy: policies[3]!, description: "Lost luggage during a connecting flight in Bangkok.", stage: "DOCUMENTS_UNDER_REVIEW", incidentDaysAgo: 12, stageStartedDaysAgo: 6, branchOfficer: branchOfficers[0] },
    // Deliberately stuck >7 days in SURVEYOR_ASSIGNED to demonstrate the admin SLA breach flag.
    { claimNumber: "CS-202601-B1C2D3", policy: policies[4]!, description: "Livestock loss from suspected disease outbreak.", stage: "SURVEYOR_ASSIGNED", incidentDaysAgo: 18, stageStartedDaysAgo: 9, branchOfficer: branchOfficers[2], surveyor: surveyors[1] },
  ];

  for (const def of claimDefs) {
    const stageEnteredAt = daysAgo(def.stageStartedDaysAgo);

    const claim = await prisma.claim.upsert({
      where: { claimNumber: def.claimNumber },
      update: {},
      create: {
        claimNumber: def.claimNumber,
        policyId: def.policy.id,
        policyholderId: def.policy.policyholderId,
        claimType: def.policy.claimType,
        incidentDate: daysAgo(def.incidentDaysAgo),
        description: def.description,
        currentStage: def.stage,
        stageEnteredAt,
        branchOfficerId: def.branchOfficer?.id,
        surveyorId: def.surveyor?.id,
      },
    });

    const existingEvents = await prisma.claimStageEvent.count({ where: { claimId: claim.id } });
    if (existingEvents === 0) {
      await seedStageHistory(claim.id, def.policy.policyholderId, def.stage, daysAgo(def.incidentDaysAgo - 1));
    }
  }

  console.log(`Seeded ${policyholders.length + branchOfficers.length + surveyors.length + 3} users, ${policies.length} policies, ${claimDefs.length} claims.`);
  console.log(`All demo users share the password: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
