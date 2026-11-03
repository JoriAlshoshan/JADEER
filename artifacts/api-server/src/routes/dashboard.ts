import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, projectsTable, analysesTable } from "@workspace/db";
import { eq, and, avg, count, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId))
      .limit(1);

    if (users.length === 0) {
      return res.json({
        totalProjects: 0,
        completedAnalyses: 0,
        avgVentureScore: null,
        recentProjects: [],
      });
    }

    const user = users[0];

    const [projectCountResult] = await db
      .select({ count: count() })
      .from(projectsTable)
      .where(eq(projectsTable.userId, user.id));

    const [analysisCountResult] = await db
      .select({ count: count() })
      .from(analysesTable)
      .innerJoin(projectsTable, eq(analysesTable.projectId, projectsTable.id))
      .where(
        and(
          eq(projectsTable.userId, user.id),
          eq(analysesTable.status, "complete"),
        ),
      );

    const recentProjects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, user.id))
      .orderBy(desc(projectsTable.createdAt))
      .limit(5);

    // Calculate avg venture score from completed analyses
    const completedAnalyses = await db
      .select({ scores: analysesTable.scores })
      .from(analysesTable)
      .innerJoin(projectsTable, eq(analysesTable.projectId, projectsTable.id))
      .where(
        and(
          eq(projectsTable.userId, user.id),
          eq(analysesTable.status, "complete"),
        ),
      );

    let avgVentureScore: number | null = null;
    if (completedAnalyses.length > 0) {
      const scores = completedAnalyses
        .map((a) => {
          const s = a.scores as { ventureScore?: number } | null;
          return s?.ventureScore ?? null;
        })
        .filter((s): s is number => s !== null);

      if (scores.length > 0) {
        avgVentureScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    }

    return res.json({
      totalProjects: projectCountResult.count,
      completedAnalyses: analysisCountResult.count,
      avgVentureScore,
      recentProjects,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting dashboard stats");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
