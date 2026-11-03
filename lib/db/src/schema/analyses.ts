import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("initial"), // initial | improved
  status: text("status").notNull().default("pending"), // pending | processing | complete | failed
  language: text("language").notNull().default("en"),
  executiveSummary: text("executive_summary"),
  ideaSummaryEnhanced: text("idea_summary_enhanced"),
  swotAnalysis: jsonb("swot_analysis"),
  customerPersona: text("customer_persona"),
  businessModel: text("business_model"),
  marketOpportunity: text("market_opportunity"),
  revenueModel: text("revenue_model"),
  riskAnalysis: text("risk_analysis"),
  competitorAnalysis: text("competitor_analysis"),
  pricingSuggestions: text("pricing_suggestions"),
  goToMarketStrategy: text("go_to_market_strategy"),
  startupRoadmap: text("startup_roadmap"),
  scores: jsonb("scores"),
  weaknessesExplanation: text("weaknesses_explanation"),
  improvementSuggestions: text("improvement_suggestions"),
  parentAnalysisId: integer("parent_analysis_id"),
  /** Full analysis content in English (all text fields as JSON) */
  contentEn: jsonb("content_en"),
  /** Full analysis content in Arabic (all text fields as JSON) */
  contentAr: jsonb("content_ar"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
