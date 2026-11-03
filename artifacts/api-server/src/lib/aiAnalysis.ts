import OpenAI from "openai";
import { db } from "@workspace/db";
import { analysesTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Project, Analysis } from "@workspace/db";
import { logger } from "./logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ScoreBreakdown {
  ventureScore: number;
  innovationScore: number;
  marketScore: number;
  riskScore: number;
  investmentReadiness: number;
  revenuePotential: number;
  ventureScoreExplanation: string;
  innovationScoreExplanation: string;
  marketScoreExplanation: string;
  riskScoreExplanation: string;
  investmentReadinessExplanation: string;
  revenuePotentialExplanation: string;
}

interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface AnalysisResult {
  executiveSummary: string;
  ideaSummaryEnhanced: string;
  swotAnalysis: SwotAnalysis;
  customerPersona: string;
  businessModel: string;
  marketOpportunity: string;
  revenueModel: string;
  riskAnalysis: unknown;
  competitorAnalysis: string;
  pricingSuggestions: string;
  goToMarketStrategy: string;
  startupRoadmap: string;
  scores: ScoreBreakdown;
  weaknessesExplanation: string;
  improvementSuggestions: string;
}

// ---------------------------------------------------------------------------
// System message — written in the target language so the model is "primed"
// ---------------------------------------------------------------------------
function buildSystemMessage(language: string): string {
  if (language === "ar") {
    return `أنت مستشار متخصص في الشركات الناشئة ورأس المال الاستثماري، تتمتع بخبرة تزيد على عشرين عاماً.

قاعدة اللغة — إلزامية وغير قابلة للتفاوض:
• يجب أن تكتب كل قيمة نصية في استجابة JSON باللغة العربية الفصحى الاحترافية.
• لا يُسمح بأي كلمة إنجليزية في قيم النصوص. مفاتيح JSON تبقى بالإنجليزية لأنها معرّفات برمجية، لكن كل محتوى نصي يجب أن يكون عربياً بالكامل.
• كل فقرة وكل جملة وكل نقطة في القائمة يجب أن تُكتب بالعربية.
• الاستثناء الوحيد: قيم severity تبقى بالإنجليزية بالضبط ("High" أو "Medium" أو "Low") لأن الكود البرمجي يعتمد عليها.`;
  }

  return `You are an elite startup advisor and venture capitalist with 20 years of experience.
Respond entirely in English. Every text value in the JSON must be in English.`;
}

// ---------------------------------------------------------------------------
// User prompt — field descriptions written in the target language
// ---------------------------------------------------------------------------
function buildPrompt(
  project: Project,
  language: string,
  isImproved: boolean,
  parentContent?: AnalysisResult | null,
): string {
  if (language === "ar") {
    return buildArabicPrompt(project, isImproved, parentContent);
  }
  return buildEnglishPrompt(project, isImproved, parentContent);
}

function buildArabicPrompt(
  project: Project,
  isImproved: boolean,
  parentContent?: AnalysisResult | null,
): string {
  const improveContext = isImproved && parentContent
    ? `
هذا طلب تحسين. حدّد نقاط الضعف في التحليل الأصلي:
${parentContent.weaknessesExplanation ?? "انظر التحليل السابق"}

اقتراحات التحسين السابقة:
${parentContent.improvementSuggestions ?? "انظر التحليل السابق"}

الآن قم بإنشاء نسخة محسّنة بشكل ملحوظ من هذه الفكرة تعالج جميع نقاط الضعف. قارن الفكرة المحسّنة بالأصل وأظهر درجات أعلى.
` : "";

  return `⚠️ تعليمات اللغة: اكتب جميع قيم النصوص في JSON باللغة العربية الفصحى الاحترافية. لا تستخدم الإنجليزية في أي نص.

حلّل هذه الفكرة الريادية وأعد استجابة JSON شاملة تتضمن جميع الحقول أدناه.
${isImproved ? "هذا تحليل تحسين — يجب أن تكون الدرجات أعلى عموماً من التحليل الأصلي." : ""}

عنوان الفكرة: ${project.title}
ملخص الفكرة: ${project.ideaSummary}
القطاع: ${project.industry ?? "غير محدد"}
السوق المستهدف: ${project.targetMarket ?? "غير محدد"}
${improveContext}

معايير التقييم — قيّم كل بُعد بشكل مستقل وأعطِه درجة صحيحة من 1 إلى 100:

• ventureScore — الجدوى الإجمالية للشركة الناشئة: ملاءمة الفريق، صعوبة التنفيذ، التوقيت، وضوح القيمة المقترحة.
• innovationScore — مدى ابتكار الفكرة أو تمييزها مقارنة بالحلول القائمة. 1 = مجرد نسخة، 100 = تأسيس فئة جديدة.
• marketScore — حجم السوق، مسار النمو، إمكانية الوصول. ضع في الاعتبار واقعية TAM وكثافة المنافسة في هذا القطاع.
• riskScore — التوقعات المعدّلة للمخاطر (أعلى = مخاطر أقل). ضع في الاعتبار المخاطر التنظيمية والتشغيلية والسوقية.
• investmentReadiness — مدى جاذبية هذه الفكرة للمستثمرين في المرحلة المبكرة. ضع في الاعتبار إمكانية الجذب، متطلبات رأس المال، ومسارات الخروج.
• revenuePotential — السقف الواقعي للإيرادات وسرعة الوصول إلى إيرادات ذات معنى لهذا النموذج التجاري والسوق.

مرجع التقييم: 40 = ضعيف، 55 = دون المتوسط، 65 = متوسط، 75 = جيد، 85 = قوي، 90+ = استثنائي (نادر).

أعد فقط JSON صالحاً (بدون markdown، بدون كتل كود) بهذا الهيكل بالضبط.
جميع قيم النصوص يجب أن تُكتب باللغة العربية الفصحى:

{
  "executiveSummary": "ملخص تنفيذي من 3-4 فقرات مناسب للمستثمرين — باللغة العربية",
  "ideaSummaryEnhanced": "نسخة محسّنة وأكثر إقناعاً من ملخص الفكرة الأصلي (2-3 فقرات) — باللغة العربية",
  "swotAnalysis": {
    "strengths": ["نقطة قوة 1 بالعربية", "نقطة قوة 2", "نقطة قوة 3", "نقطة قوة 4"],
    "weaknesses": ["نقطة ضعف 1 بالعربية", "نقطة ضعف 2", "نقطة ضعف 3"],
    "opportunities": ["فرصة 1 بالعربية", "فرصة 2", "فرصة 3", "فرصة 4"],
    "threats": ["تهديد 1 بالعربية", "تهديد 2", "تهديد 3"]
  },
  "customerPersona": "شخصية العميل التفصيلية تشمل الخصائص الديموغرافية والنفسية، نقاط الألم، الأهداف، وسلوك الشراء (2-3 فقرات) — باللغة العربية",
  "businessModel": "شرح تفصيلي لنموذج العمل يشمل القيمة المقترحة، الموارد الأساسية، الأنشطة الرئيسية، الشراكات، وهيكل التكاليف — باللغة العربية",
  "marketOpportunity": "تحليل حجم السوق (TAM/SAM/SOM)، اتجاهات النمو، مبررات توقيت السوق، ونظرة عامة على المشهد التنافسي — باللغة العربية",
  "revenueModel": "مصادر الإيرادات التفصيلية، مبررات استراتيجية التسعير، ومسار الوصول إلى الربحية — باللغة العربية",
  "riskAnalysis": [
    { "title": "اسم المخاطرة بالعربية", "description": "وصف تفصيلي لهذه المخاطرة — باللغة العربية", "severity": "High", "mitigation": "استراتيجية تخفيف محددة — باللغة العربية" },
    { "title": "اسم المخاطرة بالعربية", "description": "وصف تفصيلي — باللغة العربية", "severity": "Medium", "mitigation": "استراتيجية تخفيف محددة — باللغة العربية" },
    { "title": "اسم المخاطرة بالعربية", "description": "وصف تفصيلي — باللغة العربية", "severity": "Medium", "mitigation": "استراتيجية تخفيف محددة — باللغة العربية" },
    { "title": "اسم المخاطرة بالعربية", "description": "وصف تفصيلي — باللغة العربية", "severity": "Low", "mitigation": "استراتيجية تخفيف محددة — باللغة العربية" },
    { "title": "اسم المخاطرة بالعربية", "description": "وصف تفصيلي — باللغة العربية", "severity": "Low", "mitigation": "استراتيجية تخفيف محددة — باللغة العربية" }
  ],
  "competitorAnalysis": "تحليل 3-5 منافسين رئيسيين مع استراتيجية التمييز — باللغة العربية",
  "pricingSuggestions": "توصيات تسعير محددة مع المبررات وخيارات متعددة المستويات إن كانت مناسبة — باللغة العربية",
  "goToMarketStrategy": "استراتيجية الدخول إلى السوق مرحلة بمرحلة تشمل القنوات، نهج اكتساب العملاء، وخطة الإطلاق — باللغة العربية",
  "startupRoadmap": "خارطة طريق تفصيلية لـ 30/60/90 يوماً مع مراحل ومؤشرات KPI محددة لكل مرحلة — باللغة العربية",
  "scores": {
    "ventureScore": "<درجة صحيحة 1-100 مستنبطة من المعايير أعلاه>",
    "innovationScore": "<درجة صحيحة 1-100>",
    "marketScore": "<درجة صحيحة 1-100>",
    "riskScore": "<درجة صحيحة 1-100، أعلى = مخاطر أقل>",
    "investmentReadiness": "<درجة صحيحة 1-100>",
    "revenuePotential": "<درجة صحيحة 1-100>",
    "ventureScoreExplanation": "مبرر من 2-3 جمل يستشهد بخصائص محددة لهذه الفكرة — باللغة العربية",
    "innovationScoreExplanation": "مبرر من 2-3 جمل — باللغة العربية",
    "marketScoreExplanation": "مبرر من 2-3 جمل — باللغة العربية",
    "riskScoreExplanation": "مبرر من 2-3 جمل — باللغة العربية",
    "investmentReadinessExplanation": "مبرر من 2-3 جمل — باللغة العربية",
    "revenuePotentialExplanation": "مبرر من 2-3 جمل — باللغة العربية"
  },
  "weaknessesExplanation": "شرح تفصيلي لنقاط الضعف الرئيسية ولماذا تهم — باللغة العربية",
  "improvementSuggestions": "اقتراحات محددة وقابلة للتنفيذ لتحسين فكرة الشركة الناشئة ومعالجة نقاط ضعفها — باللغة العربية"
}

قواعد حاسمة:
1. يجب أن تكون كل قيمة درجة في JSON رقماً صحيحاً (بدون اقتباسات). يجب أن تعكس كل درجة هذه الفكرة المحددة فقط.
2. يجب أن يكون riskAnalysis مصفوفة JSON من 5 عناصر بالضبط. لا تعيده كنص عادي أو سلسلة نصية.
3. يجب أن تكون قيم severity بالإنجليزية بالضبط: "High" أو "Medium" أو "Low" (هذه الثلاث كلمات تبقى بالإنجليزية لأن الكود يعتمد عليها).
4. جميع النصوص الأخرى يجب أن تكون باللغة العربية الفصحى. صفر إنجليزية في قيم النصوص.`;
}

function buildEnglishPrompt(
  project: Project,
  isImproved: boolean,
  parentContent?: AnalysisResult | null,
): string {
  const improveContext = isImproved && parentContent
    ? `
This is an IMPROVEMENT request. The original analysis identified these weaknesses:
${parentContent.weaknessesExplanation ?? "See previous analysis"}

Previous improvement suggestions:
${parentContent.improvementSuggestions ?? "See previous analysis"}

Now generate a significantly improved version of this startup idea that addresses all weaknesses.
Compare the improved idea to the original and show higher scores.
` : "";

  return `Analyze this startup idea and return a comprehensive JSON response with ALL fields below.
${isImproved ? "This is an IMPROVEMENT analysis - scores should generally be higher than the original." : ""}

Startup Idea Title: ${project.title}
Idea Summary: ${project.ideaSummary}
Industry: ${project.industry ?? "Not specified"}
Target Market: ${project.targetMarket ?? "Not specified"}
${improveContext}

SCORING RUBRIC — evaluate each dimension independently for this specific idea, then derive an integer 1–100:

• ventureScore      — Overall startup viability: team fit, execution difficulty, timing, clarity of value prop.
• innovationScore   — How novel or differentiated is the idea vs. existing solutions? 1 = commodity clone, 100 = category-defining.
• marketScore       — Market size, growth trajectory, accessibility. Consider TAM realism and competition density for THIS industry.
• riskScore         — Risk-adjusted outlook (higher = LOWER risk). Account for regulatory, operational, market, and execution risks specific to this domain.
• investmentReadiness — How attractive is this to early-stage investors right now? Consider traction potential, capital requirements, and exit pathways.
• revenuePotential  — Realistic revenue ceiling and speed to meaningful revenue for this business model and market.

Scoring reference: 40 = weak, 55 = below average, 65 = average, 75 = solid, 85 = strong, 90+ = exceptional (rare).
A coffee shop and an AI healthcare platform must receive materially different scores — do NOT anchor on any number; derive each score from the idea's actual merits.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure.
All text values must be written in English:
{
  "executiveSummary": "Concise 3-4 paragraph executive summary suitable for investors",
  "ideaSummaryEnhanced": "Enhanced, more compelling version of the original idea summary (2-3 paragraphs)",
  "swotAnalysis": {
    "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
    "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
    "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3", "opportunity 4"],
    "threats": ["threat 1", "threat 2", "threat 3"]
  },
  "customerPersona": "Detailed customer persona including demographics, psychographics, pain points, goals, and buying behavior (2-3 paragraphs)",
  "businessModel": "Detailed business model explanation including value proposition, key resources, key activities, partnerships, and cost structure",
  "marketOpportunity": "Market size analysis (TAM/SAM/SOM), growth trends, market timing rationale, and competitive landscape overview",
  "revenueModel": "Detailed revenue streams, pricing strategy rationale, and path to profitability",
  "riskAnalysis": [
    { "title": "Risk name", "description": "Specific description of this risk for this idea", "severity": "High", "mitigation": "Concrete mitigation strategy" },
    { "title": "Risk name", "description": "Specific description", "severity": "Medium", "mitigation": "Concrete mitigation strategy" },
    { "title": "Risk name", "description": "Specific description", "severity": "Medium", "mitigation": "Concrete mitigation strategy" },
    { "title": "Risk name", "description": "Specific description", "severity": "Low", "mitigation": "Concrete mitigation strategy" },
    { "title": "Risk name", "description": "Specific description", "severity": "Low", "mitigation": "Concrete mitigation strategy" }
  ],
  "competitorAnalysis": "Analysis of 3-5 key competitors with differentiation strategy",
  "pricingSuggestions": "Specific pricing recommendations with justification and tiered options if applicable",
  "goToMarketStrategy": "Phase-by-phase go-to-market strategy including channels, customer acquisition approach, and launch plan",
  "startupRoadmap": "Detailed 30/60/90-day roadmap with specific milestones and KPIs for each phase",
  "scores": {
    "ventureScore": "<derive from rubric above — integer 1-100>",
    "innovationScore": "<derive from rubric above — integer 1-100>",
    "marketScore": "<derive from rubric above — integer 1-100>",
    "riskScore": "<derive from rubric above — integer 1-100, higher = lower risk>",
    "investmentReadiness": "<derive from rubric above — integer 1-100>",
    "revenuePotential": "<derive from rubric above — integer 1-100>",
    "ventureScoreExplanation": "2-3 sentence justification citing specific attributes of THIS idea",
    "innovationScoreExplanation": "2-3 sentence justification citing specific attributes of THIS idea",
    "marketScoreExplanation": "2-3 sentence justification citing specific attributes of THIS idea",
    "riskScoreExplanation": "2-3 sentence justification citing specific attributes of THIS idea",
    "investmentReadinessExplanation": "2-3 sentence justification citing specific attributes of THIS idea",
    "revenuePotentialExplanation": "2-3 sentence justification citing specific attributes of THIS idea"
  },
  "weaknessesExplanation": "Detailed explanation of the key weaknesses and why they matter",
  "improvementSuggestions": "Specific, actionable suggestions to improve the startup idea and address its weaknesses"
}

CRITICAL RULES:
1. Every score value in the JSON must be a plain integer (no quotes, no strings). Each score must reflect this specific idea only.
2. riskAnalysis MUST be a JSON array of exactly 5 objects. Never return riskAnalysis as plain text or a string.
3. severity must be exactly "High", "Medium", or "Low".
4. All text content must be in English.`;
}

// ---------------------------------------------------------------------------
// Core generation — call OpenAI for one language and return parsed result
// ---------------------------------------------------------------------------
async function generateContent(
  project: Project,
  language: string,
  isImproved: boolean,
  parentContent?: AnalysisResult | null,
): Promise<AnalysisResult> {
  const systemMessage = buildSystemMessage(language);
  const userPrompt = buildPrompt(project, language, isImproved, parentContent);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 8000,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  let result: AnalysisResult;
  try {
    result = JSON.parse(raw) as AnalysisResult;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Failed to parse AI response as JSON (language=${language})`);
    result = JSON.parse(match[0]) as AnalysisResult;
  }

  // Coerce scores to integers
  const scoreKeys: (keyof ScoreBreakdown)[] = [
    "ventureScore", "innovationScore", "marketScore",
    "riskScore", "investmentReadiness", "revenuePotential",
  ];
  if (result.scores) {
    for (const key of scoreKeys) {
      const val = result.scores[key];
      if (typeof val !== "number") {
        const parsed = parseInt(String(val), 10);
        (result.scores as unknown as Record<string, unknown>)[key] = isNaN(parsed) ? 50 : Math.min(100, Math.max(1, parsed));
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main entry point — generates content in BOTH languages in parallel so the
// same report can be viewed in either language without re-generating.
// ---------------------------------------------------------------------------
export async function runAnalysis(
  analysisId: number,
  project: Project,
  language: string,
  parentAnalysis?: Analysis | null,
): Promise<void> {
  const isImproved = !!parentAnalysis;
  const otherLanguage = language === "ar" ? "en" : "ar";

  logger.info({ analysisId, language }, "Starting bilingual AI analysis");

  try {
    // Mark as processing
    await db
      .update(analysesTable)
      .set({ status: "processing" })
      .where(eq(analysesTable.id, analysisId));

    // Extract parent content in both languages for the improvement prompts
    const parentContentPrimary: AnalysisResult | null = parentAnalysis
      ? {
          executiveSummary: String(parentAnalysis.executiveSummary ?? ""),
          ideaSummaryEnhanced: String(parentAnalysis.ideaSummaryEnhanced ?? ""),
          swotAnalysis: (parentAnalysis.swotAnalysis as SwotAnalysis) ?? { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          customerPersona: String(parentAnalysis.customerPersona ?? ""),
          businessModel: String(parentAnalysis.businessModel ?? ""),
          marketOpportunity: String(parentAnalysis.marketOpportunity ?? ""),
          revenueModel: String(parentAnalysis.revenueModel ?? ""),
          riskAnalysis: parentAnalysis.riskAnalysis,
          competitorAnalysis: String(parentAnalysis.competitorAnalysis ?? ""),
          pricingSuggestions: String(parentAnalysis.pricingSuggestions ?? ""),
          goToMarketStrategy: String(parentAnalysis.goToMarketStrategy ?? ""),
          startupRoadmap: String(parentAnalysis.startupRoadmap ?? ""),
          scores: (parentAnalysis.scores as ScoreBreakdown) ?? ({} as ScoreBreakdown),
          weaknessesExplanation: String(parentAnalysis.weaknessesExplanation ?? ""),
          improvementSuggestions: String(parentAnalysis.improvementSuggestions ?? ""),
        }
      : null;

    logger.info({ analysisId }, "Generating content in both languages in parallel");

    // Generate both languages simultaneously
    const [primaryResult, secondaryResult] = await Promise.all([
      generateContent(project, language, isImproved, parentContentPrimary),
      generateContent(project, otherLanguage, isImproved, null), // secondary uses own language context
    ]);

    const contentEn = language === "en" ? primaryResult : secondaryResult;
    const contentAr = language === "ar" ? primaryResult : secondaryResult;

    // Save completed analysis — primary language in individual columns for backward compat,
    // both languages in the JSON blobs for true bilingual switching.
    await db
      .update(analysesTable)
      .set({
        status: "complete",
        // Primary language in individual columns
        executiveSummary: primaryResult.executiveSummary,
        ideaSummaryEnhanced: primaryResult.ideaSummaryEnhanced,
        swotAnalysis: primaryResult.swotAnalysis,
        customerPersona: primaryResult.customerPersona,
        businessModel: primaryResult.businessModel,
        marketOpportunity: primaryResult.marketOpportunity,
        revenueModel: primaryResult.revenueModel,
        riskAnalysis: typeof primaryResult.riskAnalysis === "string"
          ? primaryResult.riskAnalysis
          : JSON.stringify(primaryResult.riskAnalysis),
        competitorAnalysis: primaryResult.competitorAnalysis,
        pricingSuggestions: primaryResult.pricingSuggestions,
        goToMarketStrategy: primaryResult.goToMarketStrategy,
        startupRoadmap: primaryResult.startupRoadmap,
        scores: primaryResult.scores,
        weaknessesExplanation: primaryResult.weaknessesExplanation,
        improvementSuggestions: primaryResult.improvementSuggestions,
        // Both languages as JSON blobs
        contentEn: contentEn as unknown as Record<string, unknown>,
        contentAr: contentAr as unknown as Record<string, unknown>,
      })
      .where(eq(analysesTable.id, analysisId));

    // Update project status and latest analysis
    await db
      .update(projectsTable)
      .set({ status: "complete", latestAnalysisId: analysisId, updatedAt: new Date() })
      .where(eq(projectsTable.id, project.id));

    logger.info({ analysisId, language }, "Bilingual analysis completed successfully");
  } catch (err) {
    logger.error({ err, analysisId, language }, "Analysis failed");
    await db
      .update(analysesTable)
      .set({ status: "failed" })
      .where(eq(analysesTable.id, analysisId));
    await db
      .update(projectsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(projectsTable.id, project.id));
  }
}
