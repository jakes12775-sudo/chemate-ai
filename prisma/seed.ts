import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AiProvider,
  ArtifactType,
  CallMode,
  Prisma,
  PrismaClient,
  StudyActivityKind,
  UploadKind,
} from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_DATABASE_URL is required for seeding the local database.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

const courseId = "course_industrial_chemistry";

const demoUploads = [
  {
    id: "upload_kinetics_notes",
    kind: UploadKind.note,
    title: "Reaction Kinetics Lecture Notes",
    topic: "Reaction Kinetics",
    fileName: "reaction-kinetics-notes.pdf",
    mimeType: "application/pdf",
    tags: ["kinetics", "rate laws", "half-life"],
    content: `Chemical kinetics studies the rate of chemical reactions and the factors affecting reaction rates.

Rate law definition:
For a reaction aA + bB -> products, the rate law can be expressed as:
rate = k[A]^m[B]^n

Integrated first-order equation:
ln([A]0/[A]) = kt
t1/2 = 0.693 / k

Important exam note:
A plot of ln[A] against time gives a straight line with slope = -k for a first-order reaction.

Pseudo-first-order reactions occur when one reactant is present in large excess, making its concentration effectively constant.`,
  },
  {
    id: "upload_thermo_notes",
    kind: UploadKind.note,
    title: "Industrial Thermodynamics Revision Sheet",
    topic: "Thermodynamics",
    fileName: "thermodynamics-revision.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    tags: ["thermodynamics", "enthalpy", "gibbs"],
    content: `The first law of thermodynamics states that energy can neither be created nor destroyed.

Core equations:
Delta U = q + w
Delta H = Delta U + Delta n(g)RT
Delta G = Delta H - TDelta S

Spontaneity:
A process is spontaneous when Delta G < 0 at constant temperature and pressure.

Industrial application:
The Gibbs free energy change helps predict whether a chemical process is feasible under specified operating conditions.`,
  },
  {
    id: "upload_electrochem_notes",
    kind: UploadKind.note,
    title: "Electrochemistry and Corrosion Notes",
    topic: "Electrochemistry",
    fileName: "electrochemistry-notes.txt",
    mimeType: "text/plain",
    tags: ["electrochemistry", "corrosion", "electrode potentials"],
    content: `Cell potential is calculated using:
Ecell = Ecathode - Eanode

The Gibbs free energy relation is:
Delta G = -nFEcell

Corrosion prevention methods include cathodic protection, coating, alloying, and environmental control.

Exam structure tip:
Always state the oxidation half-cell, reduction half-cell, and final cell notation clearly.`,
  },
  {
    id: "upload_quiz_bank",
    kind: UploadKind.question,
    title: "Past CAT Questions",
    topic: "Mixed Revision",
    fileName: "cat-questions.pdf",
    mimeType: "application/pdf",
    tags: ["past papers", "revision", "exam"],
    content: `1. Derive the integrated rate law for a first-order reaction and explain the meaning of the slope obtained from the graph of ln[A] against time.

2. Distinguish between Delta H and Delta G in chemical process design.

3. Calculate the EMF of a galvanic cell given the cathode and anode potentials, then comment on spontaneity.

4. State four industrial applications of catalysis and explain one in detail.`,
  },
  {
    id: "upload_lab_manual",
    kind: UploadKind.lab_manual,
    title: "Practical Manual: Determination of Reaction Rate",
    topic: "Reaction Kinetics",
    fileName: "kinetics-practical-manual.pdf",
    mimeType: "application/pdf",
    tags: ["lab", "practical", "kinetics"],
    content: `Experiment title: Determination of the rate constant for the acid hydrolysis of ethyl acetate.

Objectives:
1. Determine the rate constant.
2. Verify first-order behavior.
3. Plot concentration against time and ln concentration against time.

Apparatus and reagents:
Burette, pipette, water bath, stopwatch, conical flask, sodium hydroxide, hydrochloric acid, ethyl acetate, phenolphthalein.

Procedure:
Prepare the reaction mixture, withdraw aliquots at regular time intervals, quench each sample, titrate against standard sodium hydroxide, and record burette readings carefully.

Expected treatment:
Use titration data to determine concentration, then plot ln[A] against time.`,
  },
];

function extractFormulaLikeLines(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /(->|=|Delta|ln\(|t1\/2|Ecell|rate)/i.test(line))
    .slice(0, 10);
}

function extractStructureHints(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        /\b(C\d+H\d+|ethyl acetate|catalysis|cell notation|half-cell)\b/i.test(line),
    )
    .slice(0, 10);
}

function splitIntoPages(content: string) {
  const parts = content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length ? parts : [content];
}

function makeSummary(content: string) {
  const sentences = content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  return sentences.slice(0, 3).join(" ");
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.groupCallRoom.deleteMany(),
    prisma.groupMessage.deleteMany(),
    prisma.studyGroupMember.deleteMany(),
    prisma.studyGroup.deleteMany(),
    prisma.studyActivity.deleteMany(),
    prisma.citation.deleteMany(),
    prisma.artifact.deleteMany(),
    prisma.uploadPage.deleteMany(),
    prisma.upload.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.course.deleteMany(),
    prisma.inventoryLog.deleteMany(),
    prisma.receipt.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.lease.deleteMany(),
    prisma.detergentProduct.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedUsers() {
  const [studentPasswordHash, adminPasswordHash] = await Promise.all([
    hashPassword("Chemate#2026"),
    hashPassword("Mentor#2026"),
  ]);

  await prisma.user.createMany({
    data: [
      {
        id: "user_chemate_student",
        name: "Amina Wanjiru",
        email: "student@chemate.ai",
        username: "amina-wanjiru",
        role: "student",
        passwordHash: studentPasswordHash,
        provider: "email",
        school: "University of Nairobi",
        preferredTheme: "system",
        preferredAi: "mock",
      },
      {
        id: "user_chemate_mentor",
        name: "Chemate Mentor",
        email: "mentor@chemate.ai",
        username: "chemate-mentor",
        role: "mentor",
        passwordHash: adminPasswordHash,
        provider: "email",
        school: "Chemate Academic Team",
        preferredTheme: "dark",
        preferredAi: "mock",
      },
      {
        id: "user_chemate_student_brian",
        name: "Brian Otieno",
        email: "brian@chemate.ai",
        username: "brian-otieno",
        role: "student",
        passwordHash: studentPasswordHash,
        provider: "email",
        school: "Jomo Kenyatta University of Agriculture and Technology",
        preferredTheme: "dark",
        preferredAi: "mock",
      },
      {
        id: "user_chemate_student_mercy",
        name: "Mercy Chellagat",
        email: "mercy@chemate.ai",
        username: "mercy-chellagat",
        role: "student",
        passwordHash: studentPasswordHash,
        provider: "email",
        school: "Kenyatta University",
        preferredTheme: "light",
        preferredAi: "mock",
      },
      {
        id: "user_chemate_student_zawadi",
        name: "Zawadi Kimani",
        email: "zawadi@chemate.ai",
        username: "zawadi-kimani",
        role: "student",
        passwordHash: studentPasswordHash,
        provider: "email",
        school: "Moi University",
        preferredTheme: "system",
        preferredAi: "mock",
      },
    ],
  });
}

async function seedCourse() {
  await prisma.course.create({
    data: {
      id: courseId,
      title: "Industrial Chemistry",
      code: "ICH 204",
      description:
        "Core Industrial Chemistry workspace with kinetics, thermodynamics, electrochemistry, practicals, and revision support.",
      semester: "Year 2 Semester 2",
      level: "Undergraduate",
      colorKey: "chemate-cyan",
    },
  });

  await prisma.enrollment.createMany({
    data: [
      {
        userId: "user_chemate_student",
        courseId,
      },
      {
        userId: "user_chemate_mentor",
        courseId,
      },
      {
        userId: "user_chemate_student_brian",
        courseId,
      },
      {
        userId: "user_chemate_student_mercy",
        courseId,
      },
      {
        userId: "user_chemate_student_zawadi",
        courseId,
      },
    ],
  });
}

async function seedUploads() {
  for (const upload of demoUploads) {
    const pages = splitIntoPages(upload.content);
    const formulas = extractFormulaLikeLines(upload.content);
    const structures = extractStructureHints(upload.content);

    await prisma.upload.create({
      data: {
        id: upload.id,
        userId: "user_chemate_student",
        courseId,
        kind: upload.kind,
        title: upload.title,
        topic: upload.topic,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        content: upload.content,
        summary: makeSummary(upload.content),
        formulas: formulas as unknown as Prisma.InputJsonValue,
        structures: structures as unknown as Prisma.InputJsonValue,
        tags: upload.tags,
        pages: {
          create: pages.map((page, index) => ({
            pageNumber: index + 1,
            sectionTitle: page.split(/\r?\n/)[0]?.slice(0, 80) ?? `Page ${index + 1}`,
            content: page,
          })),
        },
      },
    });
  }
}

async function seedArtifacts() {
  const answerPayload = {
    sections: [
      {
        label: "Definition",
        content:
          "The rate law expresses how the rate depends on reactant concentration and the rate constant.",
      },
      {
        label: "Equation",
        content: "rate = k[A]^m[B]^n",
      },
      {
        label: "Interpretation",
        content:
          "For a first-order reaction, a linear plot of ln[A] versus time confirms first-order behaviour and the slope equals -k.",
      },
    ],
  };

  const answer = await prisma.artifact.create({
    data: {
      userId: "user_chemate_student",
      courseId,
      type: ArtifactType.answer,
      title: "Explaining the first-order rate law",
      prompt: "Explain the first-order rate law in an exam-ready format.",
      body:
        "Definition: The rate law shows how reaction rate depends on reactant concentration.\nEquation: rate = k[A]^m[B]^n\nExplanation: For a first-order reaction, ln([A]0/[A]) = kt and the slope of the ln[A] versus time graph equals -k.\nFinal answer: A first-order rate law is confirmed by a straight line when ln[A] is plotted against time.",
      payload: answerPayload as unknown as Prisma.InputJsonValue,
      knowledgeMode: "notes_only",
      aiProvider: AiProvider.mock,
      confidence: 0.92,
    },
  });

  const kineticsPage = await prisma.uploadPage.findFirstOrThrow({
    where: {
      uploadId: "upload_kinetics_notes",
      pageNumber: 1,
    },
  });

  await prisma.citation.create({
    data: {
      artifactId: answer.id,
      uploadId: "upload_kinetics_notes",
      uploadPageId: kineticsPage.id,
      pageNumber: kineticsPage.pageNumber,
      sectionTitle: kineticsPage.sectionTitle,
      snippet:
        "For a reaction aA + bB -> products, the rate law can be expressed as rate = k[A]^m[B]^n.",
    },
  });

  await prisma.artifact.create({
    data: {
      userId: "user_chemate_student",
      courseId,
      type: ArtifactType.exam_prediction,
      title: "Likely exam focus areas",
      prompt: "Predict likely exam topics from uploads and study behaviour.",
      body:
        "Most likely exam topics: reaction kinetics, thermodynamics, and electrochemistry. High-probability questions include derivation of the integrated first-order equation, interpretation of Delta G in process feasibility, and calculation of galvanic cell EMF.",
      payload: {
        readinessScore: 78,
        topics: [
          {
            topic: "Reaction Kinetics",
            confidence: 0.91,
            reason: "High note density and repeated past-question coverage.",
          },
          {
            topic: "Thermodynamics",
            confidence: 0.84,
            reason: "Core equations and spontaneity appear prominently in revision sheets.",
          },
          {
            topic: "Electrochemistry",
            confidence: 0.8,
            reason: "Past CAT questions and corrosion notes overlap strongly.",
          },
        ],
      } as unknown as Prisma.InputJsonValue,
      knowledgeMode: "notes_only",
      aiProvider: AiProvider.mock,
      confidence: 0.88,
    },
  });
}

async function seedActivity() {
  const now = Date.now();
  const entries = [
    {
      daysAgo: 0,
      kind: StudyActivityKind.question,
      label: "Asked a grounded kinetics question",
      minutes: 28,
      metadata: { topic: "Reaction Kinetics", score: 0.91 },
    },
    {
      daysAgo: 1,
      kind: StudyActivityKind.summary,
      label: "Generated a thermodynamics revision summary",
      minutes: 22,
      metadata: { topic: "Thermodynamics" },
    },
    {
      daysAgo: 2,
      kind: StudyActivityKind.upload,
      label: "Uploaded past CAT questions",
      minutes: 14,
      metadata: { kind: "question" },
    },
    {
      daysAgo: 3,
      kind: StudyActivityKind.reading,
      label: "Reviewed electrochemistry notes",
      minutes: 35,
      metadata: { topic: "Electrochemistry" },
    },
    {
      daysAgo: 4,
      kind: StudyActivityKind.prediction,
      label: "Ran exam prediction analysis",
      minutes: 18,
      metadata: { confidence: 0.88 },
    },
  ];

  await prisma.studyActivity.createMany({
    data: entries.map((entry) => ({
      userId: "user_chemate_student",
      courseId,
      kind: entry.kind,
      label: entry.label,
      minutes: entry.minutes,
      metadata: entry.metadata as unknown as Prisma.InputJsonValue,
      createdAt: new Date(now - entry.daysAgo * 24 * 60 * 60 * 1000),
    })),
  });
}

async function seedGroups() {
  const kineticsGroup = await prisma.studyGroup.create({
    data: {
      id: "group_kinetics_circle",
      name: "Kinetics Circle",
      slug: "kinetics-circle",
      topic: "Reaction Kinetics",
      description: "Fast revision, derivations, and CAT practice for rate laws.",
      visibility: "private",
      ownerId: "user_chemate_student",
      members: {
        create: [
          {
            userId: "user_chemate_student",
            role: "owner",
          },
          {
            userId: "user_chemate_student_brian",
            role: "member",
          },
          {
            userId: "user_chemate_student_mercy",
            role: "member",
          },
        ],
      },
    },
  });

  const thermoGroup = await prisma.studyGroup.create({
    data: {
      id: "group_thermo_night",
      name: "Thermo Night Shift",
      slug: "thermo-night-shift",
      topic: "Thermodynamics",
      description: "Late-night free energy, enthalpy, and spontaneity revision.",
      visibility: "public_discoverable",
      ownerId: "user_chemate_student_mercy",
      members: {
        create: [
          {
            userId: "user_chemate_student_mercy",
            role: "owner",
          },
          {
            userId: "user_chemate_student",
            role: "member",
          },
          {
            userId: "user_chemate_student_zawadi",
            role: "member",
          },
        ],
      },
    },
  });

  await prisma.groupMessage.createMany({
    data: [
      {
        groupId: kineticsGroup.id,
        authorId: "user_chemate_student",
        content: "Let us focus on deriving the integrated first-order equation before the CAT.",
      },
      {
        groupId: kineticsGroup.id,
        authorId: "user_chemate_student_brian",
        content: "I will post the slope interpretation and half-life shortcut next.",
      },
      {
        groupId: thermoGroup.id,
        authorId: "user_chemate_student_mercy",
        content: "Tonight we compare Delta H and Delta G using process examples only.",
      },
    ],
  });

  await prisma.groupCallRoom.create({
    data: {
      groupId: kineticsGroup.id,
      createdById: "user_chemate_student",
      title: "Kinetics Circle video room",
      roomName: "chemate-kinetics-circle-video-demo",
      joinUrl: "https://meet.jit.si/chemate-kinetics-circle-video-demo",
      mode: CallMode.video,
      isActive: true,
    },
  });

  await prisma.studyActivity.createMany({
    data: [
      {
        userId: "user_chemate_student",
        courseId,
        kind: StudyActivityKind.group,
        label: "Created Kinetics Circle",
        minutes: 9,
        metadata: {
          groupId: kineticsGroup.id,
        } as unknown as Prisma.InputJsonValue,
      },
      {
        userId: "user_chemate_student_mercy",
        courseId,
        kind: StudyActivityKind.call,
        label: "Joined group discussion planning",
        minutes: 12,
        metadata: {
          groupId: thermoGroup.id,
        } as unknown as Prisma.InputJsonValue,
      },
    ],
  });
}

async function main() {
  await resetDatabase();
  await seedUsers();
  await seedCourse();
  await seedUploads();
  await seedArtifacts();
  await seedActivity();
  await seedGroups();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
