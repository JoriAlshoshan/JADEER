import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, projectsTable, analysesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { runAnalysis } from "../lib/aiAnalysis";

const router = Router();

async function getOrCreateUser(clerkId: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(usersTable)
    .values({ clerkId, email: "", preferredLanguage: "en" })
    .returning();
  return created;
}

// List projects
router.get("/projects", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, user.id))
      .orderBy(desc(projectsTable.createdAt));
    return res.json(projects);
  } catch (err) {
    req.log.error({ err }, "Error listing projects");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create project
router.post("/projects", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const { title, ideaSummary, industry, targetMarket } = req.body as {
      title: string;
      ideaSummary: string;
      industry?: string;
      targetMarket?: string;
    };
    if (!title || !ideaSummary) {
      return res.status(400).json({ error: "title and ideaSummary are required" });
    }
    const [project] = await db
      .insert(projectsTable)
      .values({ userId: user.id, title, ideaSummary, industry, targetMarket, status: "draft" })
      .returning();
    return res.status(201).json(project);
  } catch (err) {
    req.log.error({ err }, "Error creating project");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get project
router.get("/projects/:projectId", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const projects = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (projects.length === 0) return res.status(404).json({ error: "Not found" });
    return res.json(projects[0]);
  } catch (err) {
    req.log.error({ err }, "Error getting project");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Translate project description to Arabic (cached in DB)
router.post("/projects/:projectId/translate-description", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const existing = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Not found" });
    const project = existing[0];

    // Return cached translation if already stored
    if (project.ideaSummaryAr) {
      return res.json({ ideaSummaryAr: project.ideaSummaryAr });
    }

    // Translate via OpenAI
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate the following startup idea description from English to Arabic. " +
            "Return only the translated Arabic text, with no additional commentary or explanation. " +
            "Keep technical and product terminology natural in Arabic.",
        },
        { role: "user", content: project.ideaSummary },
      ],
      temperature: 0.3,
    });
    const ideaSummaryAr = completion.choices[0]?.message?.content?.trim() ?? project.ideaSummary;

    // Persist the translation
    await db
      .update(projectsTable)
      .set({ ideaSummaryAr, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    return res.json({ ideaSummaryAr });
  } catch (err) {
    req.log.error({ err }, "Error translating description");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update project
router.patch("/projects/:projectId", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const existing = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Not found" });
    const { title, ideaSummary, industry, targetMarket, status } = req.body as {
      title?: string; ideaSummary?: string; industry?: string; targetMarket?: string; status?: string;
    };
    const [updated] = await db
      .update(projectsTable)
      .set({
        ...(title !== undefined ? { title } : {}),
        ...(ideaSummary !== undefined ? { ideaSummary } : {}),
        ...(industry !== undefined ? { industry } : {}),
        ...(targetMarket !== undefined ? { targetMarket } : {}),
        ...(status !== undefined ? { status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, projectId))
      .returning();
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating project");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete project
router.delete("/projects/:projectId", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const existing = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Not found" });
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting project");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Duplicate project (with all completed analyses)
router.post("/projects/:projectId/duplicate", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const existing = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (existing.length === 0) return res.status(404).json({ error: "Not found" });
    const orig = existing[0];

    // Create copy
    const [copy] = await db
      .insert(projectsTable)
      .values({
        userId: user.id,
        title: `${orig.title} (Copy)`,
        ideaSummary: orig.ideaSummary,
        industry: orig.industry,
        targetMarket: orig.targetMarket,
        status: orig.status === "analyzing" ? "draft" : orig.status,
      })
      .returning();

    // Copy all analyses
    const analyses = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.projectId, projectId))
      .orderBy(analysesTable.id);

    for (const a of analyses) {
      await db.insert(analysesTable).values({
        projectId: copy.id,
        type: a.type,
        status: a.status === "pending" || a.status === "processing" ? "failed" : a.status,
        language: a.language,
        executiveSummary: a.executiveSummary,
        ideaSummaryEnhanced: a.ideaSummaryEnhanced,
        swotAnalysis: a.swotAnalysis as any,
        customerPersona: a.customerPersona,
        businessModel: a.businessModel,
        marketOpportunity: a.marketOpportunity,
        revenueModel: a.revenueModel,
        riskAnalysis: a.riskAnalysis,
        competitorAnalysis: a.competitorAnalysis,
        pricingSuggestions: a.pricingSuggestions,
        goToMarketStrategy: a.goToMarketStrategy,
        startupRoadmap: a.startupRoadmap,
        scores: a.scores as any,
        weaknessesExplanation: a.weaknessesExplanation,
        improvementSuggestions: a.improvementSuggestions,
        parentAnalysisId: null,
      });
    }

    return res.status(201).json(copy);
  } catch (err) {
    req.log.error({ err }, "Error duplicating project");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// List analyses for a project
router.get("/projects/:projectId/analyses", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const projects = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (projects.length === 0) return res.status(404).json({ error: "Project not found" });
    const analyses = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.projectId, projectId))
      .orderBy(desc(analysesTable.createdAt));
    return res.json(analyses);
  } catch (err) {
    req.log.error({ err }, "Error listing analyses");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create analysis (triggers AI)
router.post("/projects/:projectId/analyses", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const projects = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (projects.length === 0) return res.status(404).json({ error: "Project not found" });
    const project = projects[0];
    const language: string = (req.body as { language?: string }).language ?? "en";

    // Create pending analysis record
    const [analysis] = await db
      .insert(analysesTable)
      .values({ projectId, type: "initial", status: "pending", language })
      .returning();

    // Update project status to analyzing
    await db
      .update(projectsTable)
      .set({ status: "analyzing", updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    // Run AI analysis in background
    runAnalysis(analysis.id, project, language).catch(() => {});

    return res.status(201).json(analysis);
  } catch (err) {
    req.log.error({ err }, "Error creating analysis");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific analysis
router.get("/projects/:projectId/analyses/:analysisId", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const analysisId = parseInt(req.params.analysisId as string);
    const projects = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (projects.length === 0) return res.status(404).json({ error: "Project not found" });
    const analyses = await db
      .select()
      .from(analysesTable)
      .where(and(eq(analysesTable.id, analysisId), eq(analysesTable.projectId, projectId)))
      .limit(1);
    if (analyses.length === 0) return res.status(404).json({ error: "Analysis not found" });
    return res.json(analyses[0]);
  } catch (err) {
    req.log.error({ err }, "Error getting analysis");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Improve analysis
router.post("/projects/:projectId/analyses/:analysisId/improve", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const analysisId = parseInt(req.params.analysisId as string);
    const projects = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (projects.length === 0) return res.status(404).json({ error: "Project not found" });
    const project = projects[0];
    const parentAnalyses = await db
      .select()
      .from(analysesTable)
      .where(and(eq(analysesTable.id, analysisId), eq(analysesTable.projectId, projectId)))
      .limit(1);
    if (parentAnalyses.length === 0) return res.status(404).json({ error: "Analysis not found" });
    const parentAnalysis = parentAnalyses[0];
    // Prefer language from request body (current UI language); fall back to parent's saved language
    const language: string = (req.body as { language?: string }).language ?? parentAnalysis.language ?? "en";

    const [improvedAnalysis] = await db
      .insert(analysesTable)
      .values({ projectId, type: "improved", status: "pending", language, parentAnalysisId: analysisId })
      .returning();

    runAnalysis(improvedAnalysis.id, project, language, parentAnalysis).catch(() => {});

    return res.status(201).json(improvedAnalysis);
  } catch (err) {
    req.log.error({ err }, "Error improving analysis");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get analysis report data
router.get("/projects/:projectId/analyses/:analysisId/report", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await getOrCreateUser(clerkId);
    const projectId = parseInt(req.params.projectId as string);
    const analysisId = parseInt(req.params.analysisId as string);
    const projects = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, user.id)))
      .limit(1);
    if (projects.length === 0) return res.status(404).json({ error: "Project not found" });
    const analyses = await db
      .select()
      .from(analysesTable)
      .where(and(eq(analysesTable.id, analysisId), eq(analysesTable.projectId, projectId)))
      .limit(1);
    if (analyses.length === 0) return res.status(404).json({ error: "Analysis not found" });
    return res.json({ project: projects[0], analysis: analyses[0] });
  } catch (err) {
    req.log.error({ err }, "Error getting analysis report");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
