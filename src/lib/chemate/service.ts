import {
  AiProvider,
  ArtifactType,
  CallMode,
  KnowledgeMode,
  Prisma,
  StudyActivityKind,
  StudyGroupVisibility,
  UploadKind,
  type Artifact,
  type Upload,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PRIMARY_COURSE_ID = "course_industrial_chemistry";
const PRIMARY_COURSE_DEFAULTS = {
  title: "Industrial Chemistry",
  code: "ICH 204",
  description:
    "Core Industrial Chemistry workspace with kinetics, thermodynamics, electrochemistry, practicals, and revision support.",
  semester: "Year 2 Semester 2",
  level: "Undergraduate",
  colorKey: "chemate-cyan",
} as const;

export type UploadDraft = {
  title: string;
  topic: string;
  kind: UploadKind;
  content: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  tags?: string[];
};

export type CitationPayload = {
  uploadId: string;
  uploadPageId?: string;
  pageNumber?: number;
  sectionTitle?: string | null;
  snippet: string;
};

export type AnswerBlock = {
  label: string;
  content: string;
};

const SEARCH_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "calculate",
  "compare",
  "compute",
  "define",
  "describe",
  "determine",
  "differentiate",
  "discuss",
  "distinguish",
  "draw",
  "equation",
  "evaluate",
  "explain",
  "find",
  "for",
  "from",
  "give",
  "how",
  "identify",
  "in",
  "into",
  "is",
  "many",
  "of",
  "on",
  "or",
  "out",
  "provide",
  "required",
  "show",
  "solve",
  "state",
  "structure",
  "that",
  "the",
  "their",
  "there",
  "these",
  "this",
  "to",
  "use",
  "using",
  "what",
  "when",
  "where",
  "which",
  "with",
  "write",
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normaliseWhitespace(value: string) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function splitIntoPages(content: string) {
  const blocks = normaliseWhitespace(content)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.length ? blocks : [content.trim()];
}

export function extractFormulas(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 2 &&
        /(->|⇌|=|Delta|Δ|ln\(|log\(|t1\/2|rate|Ecell|\[A\]|PV\s*=\s*nRT)/i.test(line),
    )
    .slice(0, 12);
}

export function extractStructureHints(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        /\b(C\d+H\d+|benzene|ethanol|ethene|propane|ethyl acetate|cell notation|half-cell|mechanism)\b/i.test(
          line,
        ),
    )
    .slice(0, 12);
}

export function buildLocalSummary(content: string) {
  const text = normaliseWhitespace(content).replace(/\n/g, " ");
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lead = sentences.slice(0, 3).join(" ");
  const formulas = extractFormulas(content);

  if (!formulas.length) {
    return lead;
  }

  return `${lead} Key formulas include ${formulas.slice(0, 2).join(" and ")}.`;
}

export function buildFlashcards(content: string) {
  const formulas = extractFormulas(content);
  const sections = splitIntoPages(content);

  return sections.slice(0, 4).map((section, index) => {
    const lines = section.split(/\r?\n/).filter(Boolean);
    const heading = lines[0]?.replace(/:$/, "") || `Concept ${index + 1}`;
    const answer = lines.slice(1).join(" ").slice(0, 200) || lines[0] || section.slice(0, 200);

    return {
      id: `flashcard-${index + 1}`,
      question: `Explain ${heading}.`,
      answer,
      formula: formulas[index] ?? null,
    };
  });
}

async function trackActivity(
  userId: string,
  courseId: string,
  kind: StudyActivityKind,
  label: string,
  minutes = 0,
  metadata?: Prisma.InputJsonValue,
) {
  await ensurePrimaryCourse();

  await prisma.studyActivity.create({
    data: {
      userId,
      courseId,
      kind,
      label,
      minutes,
      metadata,
    },
  });
}

async function ensurePrimaryCourse() {
  return prisma.course.upsert({
    where: {
      id: PRIMARY_COURSE_ID,
    },
    update: {
      ...PRIMARY_COURSE_DEFAULTS,
    },
    create: {
      id: PRIMARY_COURSE_ID,
      ...PRIMARY_COURSE_DEFAULTS,
    },
  });
}

export async function getHomeCourse() {
  return ensurePrimaryCourse();
}

async function reserveUniqueUsername(baseInput: string, currentUserId?: string) {
  const base = slugify(baseInput) || "chemate-student";
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: {
        username: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing || existing.id === currentUserId) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`.slice(0, 45);
  }
}

async function reserveUniqueGroupSlug(baseInput: string) {
  const base = slugify(baseInput) || "study-group";
  let candidate = base;
  let suffix = 1;

  while (
    await prisma.studyGroup.findUnique({
      where: {
        slug: candidate,
      },
      select: {
        id: true,
      },
    })
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`.slice(0, 55);
  }

  return candidate;
}

export async function getUserWorkspace(userId: string) {
  const [course, uploads, artifacts, activities] = await Promise.all([
    getHomeCourse(),
    prisma.upload.findMany({
      where: {
        userId,
        courseId: PRIMARY_COURSE_ID,
        status: {
          not: "archived",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        pages: true,
      },
    }),
    prisma.artifact.findMany({
      where: {
        userId,
        courseId: PRIMARY_COURSE_ID,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      include: {
        citations: true,
      },
    }),
    prisma.studyActivity.findMany({
      where: {
        userId,
        courseId: PRIMARY_COURSE_ID,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    }),
  ]);

  const uploadsByKind = uploads.reduce<Record<UploadKind, number>>(
    (acc, upload) => {
      acc[upload.kind] += 1;
      return acc;
    },
    {
      note: 0,
      question: 0,
      lab_manual: 0,
      assignment: 0,
    },
  );

  const totalMinutes = activities.reduce((sum, item) => sum + item.minutes, 0);
  const activeDays = new Set(
    activities.map((item) => item.createdAt.toISOString().slice(0, 10)),
  );

  return {
    course,
    uploads,
    artifacts,
    activities,
    metrics: {
      totalUploads: uploads.length,
      uploadsByKind,
      totalMinutes,
      activeDays: activeDays.size,
      summariesCreated: artifacts.filter((artifact) => artifact.type === "summary").length,
      predictionsGenerated: artifacts.filter((artifact) => artifact.type === "exam_prediction")
        .length,
    },
  };
}

export async function listUploadsForUser(
  userId: string,
  kind?: UploadKind | "all",
  query?: string,
) {
  const uploads = await prisma.upload.findMany({
    where: {
      userId,
      courseId: PRIMARY_COURSE_ID,
      status: {
        not: "archived",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      pages: true,
    },
  });

  return uploads.filter((upload) => {
    if (kind && kind !== "all" && upload.kind !== kind) {
      return false;
    }

    if (!query) {
      return true;
    }

    const needle = query.toLowerCase();
    return [upload.title, upload.topic, upload.content, upload.summary ?? "", upload.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}

export async function getUploadDetail(userId: string, uploadId: string) {
  return prisma.upload.findFirst({
    where: {
      id: uploadId,
      userId,
    },
    include: {
      pages: {
        orderBy: {
          pageNumber: "asc",
        },
      },
      citations: {
        include: {
          artifact: true,
        },
      },
    },
  });
}

export async function createUploads(userId: string, drafts: UploadDraft[]) {
  const course = await getHomeCourse();
  const created: Upload[] = [];

  for (const draft of drafts) {
    const content = normaliseWhitespace(draft.content);
    const formulas = extractFormulas(content);
    const structures = extractStructureHints(content);
    const pages = splitIntoPages(content);

    const upload = await prisma.upload.create({
      data: {
        userId,
        courseId: course.id,
        kind: draft.kind,
        title: draft.title,
        topic: draft.topic,
        description: draft.description,
        fileName: draft.fileName,
        mimeType: draft.mimeType,
        content,
        summary: buildLocalSummary(content),
        formulas: formulas as unknown as Prisma.InputJsonValue,
        structures: structures as unknown as Prisma.InputJsonValue,
        tags: draft.tags ?? [],
        pages: {
          create: pages.map((page, index) => ({
            pageNumber: index + 1,
            sectionTitle:
              page.split(/\r?\n/)[0]?.trim().slice(0, 80) || `Section ${index + 1}`,
            content: page,
          })),
        },
      },
    });

    created.push(upload);

    await trackActivity(
      userId,
      course.id,
      "upload",
      `Uploaded ${draft.kind.replace("_", " ")}: ${draft.title}`,
      12,
      {
        kind: draft.kind,
        topic: draft.topic,
      } as Prisma.InputJsonValue,
    );
  }

  return created;
}

export async function deleteUpload(userId: string, uploadId: string) {
  const upload = await prisma.upload.findFirst({
    where: {
      id: uploadId,
      userId,
    },
  });

  if (!upload) {
    return null;
  }

  await prisma.upload.update({
    where: {
      id: upload.id,
    },
    data: {
      status: "archived",
    },
  });

  await trackActivity(
    userId,
    upload.courseId,
    "revision",
    `Removed ${upload.kind.replace("_", " ")} from active library`,
    2,
  );

  return upload;
}

type SearchMatch = {
  score: number;
  upload: Awaited<ReturnType<typeof listUploadsForUser>>[number];
  pageNumber?: number;
  sectionTitle?: string | null;
  snippet: string;
};

function normaliseSearchToken(term: string) {
  return term.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function tokenizeSearchText(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+\-[\]()=/.]+/)
    .map((term) => normaliseSearchToken(term))
    .filter(Boolean);
}

function expandSearchTokenVariants(term: string) {
  const variants = new Set([term]);

  if (term.includes("-")) {
    for (const part of term.split("-")) {
      if (part) {
        variants.add(part);
      }
    }
  }

  if (term.endsWith("s") && term.length >= 5) {
    variants.add(term.slice(0, -1));
  }

  return [...variants];
}

function scoreText(haystack: string, terms: string[]) {
  const lower = haystack.toLowerCase();
  const tokens = new Set(tokenizeSearchText(haystack));

  return terms.reduce((score, term) => {
    if (!term) {
      return score;
    }

    const variants = expandSearchTokenVariants(term);
    const matched =
      variants.some((variant) => tokens.has(variant)) ||
      (/[=()[\]+/\-.]/.test(term) && lower.includes(term));

    if (matched) {
      return score + (term.length >= 8 ? 4 : 3);
    }

    return score;
  }, 0);
}

export function extractQueryTerms(query: string) {
  return [...new Set(tokenizeSearchText(query))].filter(
    (term) =>
      (term.length >= 3 && !SEARCH_STOPWORDS.has(term)) ||
      /[a-z]+\d+|\d+[a-z]+|ph|eh|ecell|t1\/2/i.test(term),
  );
}

function scoreChemistryArrays(value: unknown, terms: string[]) {
  if (!Array.isArray(value)) {
    return 0;
  }

  return value.reduce((score, item) => {
    if (typeof item !== "string") {
      return score;
    }

    return score + scoreText(item, terms);
  }, 0);
}

export async function searchKnowledgeBase(
  userId: string,
  query: string,
  kinds: UploadKind[] = ["note", "question", "lab_manual", "assignment"],
) {
  const uploads = await listUploadsForUser(userId);
  const terms = extractQueryTerms(query);

  const results: SearchMatch[] = [];

  for (const upload of uploads) {
    if (!kinds.includes(upload.kind)) {
      continue;
    }

    const baseScore =
      scoreText([upload.title, upload.topic, upload.summary ?? "", upload.tags.join(" ")].join(" "), terms) +
      scoreChemistryArrays(upload.formulas, terms) +
      scoreChemistryArrays(upload.structures, terms);

    let bestPage: SearchMatch | null = null;

    for (const page of upload.pages) {
      const score = baseScore + scoreText(page.content, terms);
      if (score <= 0) {
        continue;
      }

      const lower = page.content.toLowerCase();
      const firstHitIndex = terms.reduce((index, term) => {
        const hit = lower.indexOf(term);
        if (hit === -1) {
          return index;
        }
        if (index === -1) {
          return hit;
        }
        return Math.min(index, hit);
      }, -1);

      const start = Math.max(0, firstHitIndex - 90);
      const end = Math.min(page.content.length, firstHitIndex + 180);
      const snippet = page.content.slice(start, end).replace(/\s+/g, " ").trim();

      const match: SearchMatch = {
        score,
        upload,
        pageNumber: page.pageNumber,
        sectionTitle: page.sectionTitle,
        snippet: snippet || page.content.slice(0, 180),
      };

      if (!bestPage || match.score > bestPage.score) {
        bestPage = match;
      }
    }

    if (bestPage) {
      results.push(bestPage);
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 6);
}

export async function createArtifactWithCitations(args: {
  userId: string;
  type: ArtifactType;
  title: string;
  prompt?: string;
  body: string;
  payload?: Prisma.InputJsonValue;
  knowledgeMode?: KnowledgeMode;
  aiProvider?: AiProvider;
  confidence?: number;
  citations?: CitationPayload[];
}) {
  const course = await ensurePrimaryCourse();

  const artifact = await prisma.artifact.create({
    data: {
      userId: args.userId,
      courseId: course.id,
      type: args.type,
      title: args.title,
      prompt: args.prompt,
      body: args.body,
      payload: args.payload,
      knowledgeMode: args.knowledgeMode ?? "notes_only",
      aiProvider: args.aiProvider ?? "mock",
      confidence: args.confidence,
      citations: args.citations?.length
        ? {
            create: args.citations.map((citation) => ({
              uploadId: citation.uploadId,
              uploadPageId: citation.uploadPageId,
              pageNumber: citation.pageNumber,
              sectionTitle: citation.sectionTitle,
              snippet: citation.snippet,
            })),
          }
        : undefined,
    },
    include: {
      citations: true,
    },
  });

  return artifact;
}

export async function buildSummaryArtifact(userId: string, uploadId: string) {
  const upload = await getUploadDetail(userId, uploadId);

  if (!upload) {
    return null;
  }

  const flashcards = buildFlashcards(upload.content);
  const summaryText = buildLocalSummary(upload.content);
  const artifact = await createArtifactWithCitations({
    userId,
    type: "summary",
    title: `Summary: ${upload.title}`,
    prompt: `Summarise ${upload.title}`,
    body: `${summaryText}\n\nKey points:\n- ${upload.topic}\n- ${upload.summary ?? summaryText}`,
    payload: {
      flashcards,
      formulas: upload.formulas,
      structures: upload.structures,
    } as Prisma.InputJsonValue,
    citations: upload.pages.slice(0, 2).map((page) => ({
      uploadId: upload.id,
      uploadPageId: page.id,
      pageNumber: page.pageNumber,
      sectionTitle: page.sectionTitle,
      snippet: page.content.slice(0, 220),
    })),
    confidence: 0.9,
  });

  await trackActivity(
    userId,
    upload.courseId,
    "summary",
    `Created summary for ${upload.title}`,
    18,
    {
      uploadId: upload.id,
      flashcards: flashcards.length,
    } as Prisma.InputJsonValue,
  );

  return artifact;
}

export async function listRecentArtifactsForUser(userId: string, type?: ArtifactType) {
  return prisma.artifact.findMany({
    where: {
      userId,
      courseId: PRIMARY_COURSE_ID,
      ...(type ? { type } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 12,
      include: {
        citations: true,
      },
    });
}

export async function clearArtifactsForUser(userId: string, type?: ArtifactType) {
  return prisma.artifact.deleteMany({
    where: {
      userId,
      courseId: PRIMARY_COURSE_ID,
      ...(type ? { type } : {}),
    },
  });
}

function getConsecutiveStreak(dates: Date[]) {
  const seen = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();

  while (seen.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function getStudyAnalytics(userId: string) {
  const workspace = await getUserWorkspace(userId);
  const groupCount = await prisma.studyGroupMember.count({
    where: {
      userId,
    },
  });
  const streak = getConsecutiveStreak(workspace.activities.map((item) => item.createdAt));
  const lastPrediction =
    workspace.artifacts.find((artifact) => artifact.type === "exam_prediction") ?? null;

  return {
    ...workspace.metrics,
    groupCount,
    streak,
    lastPrediction,
    recentUploads: workspace.uploads.slice(0, 4),
    recentArtifacts: workspace.artifacts.slice(0, 5),
    activityFeed: workspace.activities,
  };
}

export async function buildExamPrediction(userId: string) {
  const uploads = await listUploadsForUser(userId);
  const answers = await listRecentArtifactsForUser(userId, "answer");

  const topicScores = new Map<
    string,
    {
      score: number;
      reasons: string[];
    }
  >();

  for (const upload of uploads) {
    const base = upload.kind === "question" ? 4 : upload.kind === "note" ? 3 : 2;
    const current = topicScores.get(upload.topic) ?? {
      score: 0,
      reasons: [],
    };

    current.score += base + upload.pages.length;
    current.reasons.push(`${upload.kind.replace("_", " ")} coverage in ${upload.title}`);
    topicScores.set(upload.topic, current);
  }

  for (const answer of answers) {
    const prompt = (answer.prompt ?? answer.title).toLowerCase();
    for (const [topic, current] of topicScores.entries()) {
      if (prompt.includes(topic.toLowerCase().split(" ")[0] ?? "")) {
        current.score += 2;
        current.reasons.push("Frequently appears in student questions");
      }
    }
  }

  const ranked = [...topicScores.entries()]
    .map(([topic, info]) => ({
      topic,
      weight: info.score,
      confidence: Math.min(0.97, 0.55 + info.score / 30),
      reason: info.reasons.slice(0, 2).join("; "),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const likelyQuestions = ranked.map((item, index) => ({
    id: `prediction-${index + 1}`,
    topic: item.topic,
    question:
      index % 2 === 0
        ? `Explain ${item.topic} with equations and an industrial chemistry application.`
        : `Discuss ${item.topic} in an exam-ready format and solve one representative calculation.`,
    confidence: item.confidence,
  }));

  const readinessScore = Math.min(
    96,
    Math.round(
      54 +
        ranked.reduce((sum, item) => sum + item.confidence * 8, 0) +
        Math.min(12, uploads.length),
    ),
  );

  const body = [
    "Predicted exam focus:",
    ...ranked.map(
      (item, index) =>
        `${index + 1}. ${item.topic} (${Math.round(item.confidence * 100)}% confidence)`,
    ),
    "",
    "Likely question styles:",
    ...likelyQuestions.map((item) => `- ${item.question}`),
  ].join("\n");

  const artifact = await createArtifactWithCitations({
    userId,
    type: "exam_prediction",
    title: "Exam probability map",
    prompt: "Predict exam topics from uploads and question history.",
    body,
    payload: {
      readinessScore,
      rankedTopics: ranked,
      likelyQuestions,
    } as Prisma.InputJsonValue,
    confidence: ranked[0]?.confidence ?? 0.7,
  });

  await trackActivity(
    userId,
    PRIMARY_COURSE_ID,
    "prediction",
    "Generated exam probability map",
    16,
    {
      readinessScore,
      topics: ranked.map((item) => item.topic),
    } as Prisma.InputJsonValue,
  );

  return artifact;
}

export async function getArtifactForUser(userId: string, artifactId: string) {
  return prisma.artifact.findFirst({
    where: {
      id: artifactId,
      userId,
    },
    include: {
      citations: {
        include: {
          upload: true,
        },
      },
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });
}

export async function createStudentUser(args: {
  name: string;
  email: string;
  username?: string;
  passwordHash?: string;
  provider?: "email" | "google" | "github" | "microsoft";
  googleId?: string;
  githubId?: string;
  microsoftId?: string;
  avatarUrl?: string;
  school?: string;
}) {
  const course = await ensurePrimaryCourse();
  const username = await reserveUniqueUsername(
    args.username ?? args.email.split("@")[0] ?? args.name,
  );

  const user = await prisma.user.create({
    data: {
      name: args.name,
      email: args.email.toLowerCase(),
      username,
        role: "student",
        passwordHash: args.passwordHash,
        provider: args.provider ?? "email",
        googleId: args.googleId,
        githubId: args.githubId,
        microsoftId: args.microsoftId,
        avatarUrl: args.avatarUrl,
        school: args.school,
      },
  });

  await prisma.enrollment.create({
    data: {
      userId: user.id,
      courseId: course.id,
    },
  });

  return user;
}

export async function updateUserPreferences(
  userId: string,
  input: {
    preferredTheme?: string;
    preferredAi?: AiProvider;
    school?: string;
    name?: string;
    username?: string;
  },
) {
  const data: {
    preferredTheme?: string;
    preferredAi?: AiProvider;
    school?: string;
    name?: string;
    username?: string;
  } = {
    ...input,
  };

  if (input.username) {
    data.username = await reserveUniqueUsername(input.username, userId);
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
  });
}

export async function updateLastLogin(userId: string) {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });
}

export type ArtifactWithCitations = Artifact & {
  citations: {
    id: string;
    uploadId: string;
    uploadPageId: string | null;
    pageNumber: number | null;
    sectionTitle: string | null;
    snippet: string;
  }[];
};

export async function searchUsersByUsername(currentUserId: string, query: string) {
  const needle = query.trim().toLowerCase();

  if (needle.length < 2) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        not: currentUserId,
      },
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      name: true,
      school: true,
      avatarUrl: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 20,
  });

  return users.filter((user) =>
    [user.username, user.name, user.school ?? ""].join(" ").toLowerCase().includes(needle),
  );
}

export async function listGroupsForUser(userId: string) {
  return prisma.studyGroupMember.findMany({
    where: {
      userId,
    },
    orderBy: {
      joinedAt: "desc",
    },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
          calls: {
            where: {
              isActive: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            include: {
              author: {
                select: {
                  username: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

async function assertGroupMembership(userId: string, groupId: string) {
  return prisma.studyGroupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    include: {
      group: true,
    },
  });
}

export async function createStudyGroup(args: {
  ownerId: string;
  name: string;
  topic: string;
  description?: string;
  visibility?: StudyGroupVisibility;
  memberUserIds?: string[];
}) {
  const slug = await reserveUniqueGroupSlug(args.name);
  const uniqueMemberIds = [...new Set(args.memberUserIds ?? [])].filter(
    (userId) => userId !== args.ownerId,
  );

  const group = await prisma.studyGroup.create({
    data: {
      name: args.name,
      slug,
      topic: args.topic,
      description: args.description,
      visibility: args.visibility ?? "private",
      ownerId: args.ownerId,
      members: {
        create: [
          {
            userId: args.ownerId,
            role: "owner",
          },
          ...uniqueMemberIds.map((userId) => ({
            userId,
            role: "member" as const,
          })),
        ],
      },
    },
    include: {
      members: true,
    },
  });

  await trackActivity(
    args.ownerId,
    PRIMARY_COURSE_ID,
    "group",
    `Created group ${args.name}`,
    8,
    {
      groupId: group.id,
      topic: args.topic,
      members: group.members.length,
    } as Prisma.InputJsonValue,
  );

  return group;
}

export async function getGroupDetailForUser(userId: string, groupId: string) {
  const membership = await assertGroupMembership(userId, groupId);

  if (!membership) {
    return null;
  }

  return prisma.studyGroup.findUnique({
    where: {
      id: groupId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              school: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
      messages: {
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      },
      calls: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
  });
}

export async function addMembersToGroup(args: {
  actorId: string;
  groupId: string;
  memberUserIds: string[];
}) {
  const membership = await assertGroupMembership(args.actorId, args.groupId);

  if (!membership) {
    return null;
  }

  const memberUserIds = [...new Set(args.memberUserIds)].filter(
    (userId) => userId !== args.actorId,
  );

  if (!memberUserIds.length) {
    return getGroupDetailForUser(args.actorId, args.groupId);
  }

  await prisma.studyGroupMember.createMany({
    data: memberUserIds.map((userId) => ({
      groupId: args.groupId,
      userId,
      role: "member",
    })),
    skipDuplicates: true,
  });

  await trackActivity(
    args.actorId,
    PRIMARY_COURSE_ID,
    "group",
    `Added members to ${membership.group.name}`,
    4,
    {
      groupId: args.groupId,
      added: memberUserIds.length,
    } as Prisma.InputJsonValue,
  );

  return getGroupDetailForUser(args.actorId, args.groupId);
}

export async function postGroupMessage(args: {
  authorId: string;
  groupId: string;
  content: string;
}) {
  const membership = await assertGroupMembership(args.authorId, args.groupId);

  if (!membership) {
    return null;
  }

  const message = await prisma.groupMessage.create({
    data: {
      groupId: args.groupId,
      authorId: args.authorId,
      content: normaliseWhitespace(args.content),
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  });

  await trackActivity(
    args.authorId,
    PRIMARY_COURSE_ID,
    "discussion",
    `Posted in ${membership.group.name}`,
    6,
    {
      groupId: args.groupId,
    } as Prisma.InputJsonValue,
  );

  return message;
}

export async function createGroupCallRoom(args: {
  creatorId: string;
  groupId: string;
  mode: CallMode;
}) {
  const membership = await assertGroupMembership(args.creatorId, args.groupId);

  if (!membership) {
    return null;
  }

  const roomName = [
    "chemate",
    membership.group.slug,
    args.mode,
    Date.now().toString(36),
  ].join("-");
  const baseJoinUrl = `https://meet.jit.si/${roomName}`;
  const joinUrl =
    args.mode === "audio"
      ? `${baseJoinUrl}#config.startWithVideoMuted=true&config.startAudioOnly=true`
      : baseJoinUrl;

  const room = await prisma.groupCallRoom.create({
    data: {
      groupId: args.groupId,
      createdById: args.creatorId,
      title: `${membership.group.name} ${args.mode === "audio" ? "audio" : "video"} room`,
      roomName,
      joinUrl,
      mode: args.mode,
    },
  });

  await trackActivity(
    args.creatorId,
    PRIMARY_COURSE_ID,
    "call",
    `Started ${args.mode} call for ${membership.group.name}`,
    5,
    {
      groupId: args.groupId,
      roomName,
      mode: args.mode,
    } as Prisma.InputJsonValue,
  );

  return room;
}
