import { z } from "zod";

export const FindingStatusSchema = z.enum([
  "low",
  "normal",
  "high",
  "unknown",
]);
export const SeveritySchema = z.enum(["none", "attention", "urgent"]);
export const RangeSourceSchema = z.enum(["printed", "general", "unavailable"]);

export const PatientContextSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  age: z.number().int().min(0).max(130).optional(),
  gender: z.string().min(1).max(50).optional(),
  pregnancyMentioned: z.boolean().default(false),
});

export const ReferenceRangeSchema = z.object({
  lower: z.number().finite().nullable(),
  upper: z.number().finite().nullable(),
  text: z.string().min(1).max(120),
  source: RangeSourceSchema,
});

export const LabTestSchema = z.object({
  id: z.string().regex(/^t\d+$/),
  name: z.string().min(1).max(160),
  originalValue: z.string().min(1).max(100),
  numericValue: z.number().finite().nullable(),
  unit: z.string().max(50).nullable(),
  printedRange: z.string().max(120).nullable(),
  referenceRange: ReferenceRangeSchema.nullable(),
});

export const IntakeResultSchema = z.object({
  accepted: z.boolean(),
  rejectionReason: z.string().max(300).optional(),
  patient: PatientContextSchema,
  tests: z.array(LabTestSchema).max(200),
  uncertainties: z.array(z.string().min(1).max(240)).max(30),
});

export const AnalyzedTestSchema = LabTestSchema.extend({
  status: FindingStatusSchema,
  severity: SeveritySchema,
  explanation: z.string().min(1).max(500),
  rangeSource: RangeSourceSchema,
});

export const AnalyzerResultSchema = z.object({
  findings: z.array(AnalyzedTestSchema).max(200),
  urgentFindingIds: z.array(z.string().regex(/^t\d+$/)).max(50),
  generalRangeNotice: z.boolean(),
});

export const ImprovementResultSchema = z.object({
  suggestions: z.array(z.string().min(1).max(360)).max(12),
  doctorQuestions: z.array(z.string().min(1).max(280)).max(10),
  nextSteps: z.array(z.string().min(1).max(280)).max(10),
});

export const NutritionResultSchema = z.object({
  suppressed: z.boolean(),
  suppressionReason: z.string().max(300).optional(),
  suggestions: z.array(z.string().min(1).max(360)).max(12),
});

export const SafetyChangeSchema = z.object({
  category: z.enum(["diagnosis", "medication", "cure_claim", "unsupported_claim", "other"]),
  description: z.string().min(1).max(300),
});

export const SafetyResultSchema = z.object({
  findings: z.array(AnalyzedTestSchema).max(200),
  suggestions: z.array(z.string().min(1).max(360)).max(12),
  nutrition: NutritionResultSchema,
  doctorQuestions: z.array(z.string().min(1).max(280)).max(10),
  nextSteps: z.array(z.string().min(1).max(280)).max(10),
  changes: z.array(SafetyChangeSchema).max(30),
});

export const SummaryResultSchema = z.object({
  english: z.string().min(1).max(4000),
  romanUrdu: z.string().min(1).max(4000),
  englishAudio: z.string().min(1).max(4000),
  urduAudio: z.string().min(1).max(4000),
});

export const AnalysisResultSchema = z.object({
  intake: IntakeResultSchema,
  analyzer: AnalyzerResultSchema,
  improvement: ImprovementResultSchema,
  safety: SafetyResultSchema,
  summary: SummaryResultSchema,
});

export const AgentNameSchema = z.enum([
  "intake",
  "analyzer",
  "improvement",
  "nutrition",
  "safety",
  "summary",
]);

export const StreamEventSchema = z.object({
  type: z.enum(["progress", "rejected", "result", "error"]),
  agent: AgentNameSchema.optional(),
  state: z.enum(["waiting", "running", "done"]).optional(),
  message: z.string().max(500).optional(),
  preview: z.string().max(500).optional(),
  result: AnalysisResultSchema.optional(),
});

export type LabTest = z.infer<typeof LabTestSchema>;
export type AnalyzedTest = z.infer<typeof AnalyzedTestSchema>;
export type IntakeResult = z.infer<typeof IntakeResultSchema>;
export type AnalyzerResult = z.infer<typeof AnalyzerResultSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
