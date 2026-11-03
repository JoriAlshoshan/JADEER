import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Get or create current user (JIT provisioning)
async function getOrCreateUser(clerkId: string, email: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(usersTable)
    .values({ clerkId, email, preferredLanguage: "en" })
    .returning();

  return created;
}

router.get("/users/me", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await getOrCreateUser(userId, "");
    return res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting user");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/me", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await getOrCreateUser(userId, "");
    const { name, preferredLanguage } = req.body as { name?: string; preferredLanguage?: string };

    const [updated] = await db
      .update(usersTable)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(preferredLanguage !== undefined ? { preferredLanguage } : {}),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    return res.json({
      id: updated.id,
      clerkId: updated.clerkId,
      email: updated.email,
      name: updated.name,
      preferredLanguage: updated.preferredLanguage,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Error updating user");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
