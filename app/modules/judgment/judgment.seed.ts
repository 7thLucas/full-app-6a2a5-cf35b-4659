import { createLogger } from "~/lib/logger";
import { JudgmentConfigModel } from "./src/models/config.model";
import { normalizeGeneratedConfigPayload, validateConfigPayload } from "./src/lib/judgment.utils";

const logger = createLogger("JudgmentSeed");

/**
 * Standard output envelope shared by every seeded compliance config. The judgment
 * engine + frontend drawer rely on this exact shape.
 */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    evidenceSubmissionId: { type: "string" },
    criterionId: { type: "string" },
    verdict: { type: "string", enum: ["pass", "partial", "fail", "risk", "ready", "not_ready"] },
    score: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    reason: { type: "string" },
    fixSuggestion: { type: "string" },
    requiresHumanReview: { type: "boolean" },
    provider: { type: "string" },
    model: { type: "string" },
    resultData: {
      type: "object",
      properties: {
        complianceStatus: { type: "string", enum: ["Compliant", "Non-Compliant"] },
        missingItems: { type: "array", items: { type: "string" } },
        auditTrail: { type: "array", items: { type: "object" } },
      },
    },
  },
  required: [
    "id",
    "evidenceSubmissionId",
    "criterionId",
    "verdict",
    "score",
    "confidence",
    "severity",
    "reason",
    "fixSuggestion",
    "requiresHumanReview",
  ],
} as const;

const STANDARD_LABELS = {
  unitLabel: "Station",
  workerLabel: "Staff",
  managerLabel: "Manager / Owner",
};

const STANDARD_DASHBOARD = {
  title: "Susie Q's Diner Compliance Dashboard",
  company: "Susie Q's Diner",
};

/**
 * Builds the input schema for a compliance submission.
 *
 * Employees only ever provide: their identity (name / email / department), a free-text
 * evidence note, and a single uploaded certificate/form file. There is intentionally
 * NO numeric quiz-score input field — any score threshold (e.g. the SOP's "minimum
 * passing score: 80%") lives inside the criteria `passCriteria` text so the AI
 * evaluator infers it from the uploaded evidence.
 */
function buildInputSchema(fileKey: string, fileTitle: string, fileDescription: string) {
  return {
    type: "object",
    properties: {
      employeeName: {
        type: "string",
        title: "Employee Name",
        description: "Full name of the employee submitting this form.",
      },
      employeeEmail: {
        type: "string",
        title: "Employee Email",
        description: "Work email address of the submitting employee.",
      },
      department: {
        type: "string",
        title: "Department",
        description: "Department the employee belongs to (Kitchen, Front-of-House, or Cleaning).",
      },
      evidenceText: {
        type: "string",
        title: "Evidence / Notes",
        description: "Supporting notes, observations, or evidence related to this submission.",
      },
      [fileKey]: {
        type: "string",
        title: fileTitle,
        description: fileDescription,
        "x-ui": { widget: "file" },
      },
    },
    required: ["employeeName", "employeeEmail", "department", "evidenceText", fileKey],
  };
}

type SeedConfig = Record<string, any>;

/**
 * Canonical Susie Q's Diner compliance configs, derived from the diner's Compliance
 * SOP v1.0. Each maps a mandatory training certificate, signed SOP, or assessment
 * to a station (Kitchen / Front-of-House / Cleaning) or to All staff.
 */
const SEED_CONFIGS: SeedConfig[] = [
  {
    pluginId: "food_safety_training_kitchen",
    name: "Food Safety & Hygiene Training (Kitchen)",
    rules:
      "Review the submitted Food Safety & Hygiene training certificate for a Kitchen/Chef employee. Verify that the certificate is a valid PDF, is not expired, and that the associated assessment was passed with a minimum score of 80%. Reject submissions with a missing, invalid, or expired certificate, or a quiz score below 80%.",
    inputSchema: buildInputSchema(
      "food_safety_certificate",
      "Food Safety Certificate",
      "PDF certificate of completion for Food Safety & Hygiene training, including the assessment score and any expiration date.",
    ),
    outputSchema: OUTPUT_SCHEMA,
    criteria: [
      {
        id: "criterion_food_safety_cert_format",
        category: "Food Safety Training",
        name: "Certificate Format",
        passCriteria: "Food Safety certificate is uploaded in PDF format.",
        severity: "high",
        weight: 20,
        autoFailIfMissing: true,
      },
      {
        id: "criterion_food_safety_quiz",
        category: "Food Safety Training",
        name: "Assessment Score",
        passCriteria: "Employee achieved a minimum score of 80% on the food-safety assessment.",
        severity: "critical",
        weight: 50,
        autoFailIfMissing: true,
      },
      {
        id: "criterion_food_safety_validity",
        category: "Food Safety Training",
        name: "Certificate Validity",
        passCriteria: "Certificate expiration date is after the submission date (certificate is not expired).",
        severity: "critical",
        weight: 30,
        autoFailIfMissing: true,
      },
    ],
    variables: {
      labels: STANDARD_LABELS,
      actions: { defaultTaskDueHours: 720 },
      dashboard: { ...STANDARD_DASHBOARD, title: "Food Safety Training Dashboard" },
      targetDepartment: "Kitchen",
      configType: "SOP",
      dueDate: "2050-02-20",
      description:
        "Kitchen/Chef staff must complete Food Safety & Hygiene training, upload a valid PDF certificate, and pass the assessment with at least 80%.",
    },
  },
  {
    pluginId: "allergy_awareness_training_foh",
    name: "Allergy & Dietary Awareness Training (Front-of-House)",
    rules:
      "Review the submitted Allergy & Dietary Awareness training certificate for a Front-of-House/Server employee. Verify that the certificate is a valid PDF and that the associated assessment was passed with a minimum score of 80%. Reject submissions with a missing or invalid certificate, or a quiz score below 80%.",
    inputSchema: buildInputSchema(
      "allergy_awareness_certificate",
      "Allergy & Dietary Awareness Certificate",
      "PDF certificate of completion for Allergy & Dietary Awareness training, including the assessment score.",
    ),
    outputSchema: OUTPUT_SCHEMA,
    criteria: [
      {
        id: "criterion_allergy_cert_format",
        category: "Allergy Awareness",
        name: "Certificate Format",
        passCriteria: "Allergy & Dietary Awareness certificate is uploaded in PDF format.",
        severity: "high",
        weight: 40,
        autoFailIfMissing: true,
      },
      {
        id: "criterion_allergy_quiz",
        category: "Allergy Awareness",
        name: "Assessment Score",
        passCriteria: "Employee achieved a minimum score of 80% on the allergy & dietary awareness assessment.",
        severity: "critical",
        weight: 60,
        autoFailIfMissing: true,
      },
    ],
    variables: {
      labels: STANDARD_LABELS,
      actions: { defaultTaskDueHours: 720 },
      dashboard: { ...STANDARD_DASHBOARD, title: "Allergy Awareness Dashboard" },
      targetDepartment: "Front-of-House",
      configType: "SOP",
      dueDate: "2050-02-20",
      description:
        "Front-of-House/Server staff must complete Allergy & Dietary Awareness training, upload a valid PDF certificate, and pass the assessment with at least 80%.",
    },
  },
  {
    pluginId: "sanitation_training_cleaning",
    name: "Sanitation & Hygiene Training (Cleaning)",
    rules:
      "Review the submitted Sanitation & Hygiene training certificate for a Cleaning/Sanitation employee. Verify that the certificate is a valid PDF and that the associated assessment was passed with a minimum score of 80%. Reject submissions with a missing or invalid certificate, or a quiz score below 80%.",
    inputSchema: buildInputSchema(
      "sanitation_certificate",
      "Sanitation & Hygiene Certificate",
      "PDF certificate of completion for Sanitation & Hygiene training, including the assessment score.",
    ),
    outputSchema: OUTPUT_SCHEMA,
    criteria: [
      {
        id: "criterion_sanitation_cert_format",
        category: "Sanitation",
        name: "Certificate Format",
        passCriteria: "Sanitation & Hygiene certificate is uploaded in PDF format.",
        severity: "high",
        weight: 40,
        autoFailIfMissing: true,
      },
      {
        id: "criterion_sanitation_quiz",
        category: "Sanitation",
        name: "Assessment Score",
        passCriteria: "Employee achieved a minimum score of 80% on the sanitation & hygiene assessment.",
        severity: "critical",
        weight: 60,
        autoFailIfMissing: true,
      },
    ],
    variables: {
      labels: STANDARD_LABELS,
      actions: { defaultTaskDueHours: 720 },
      dashboard: { ...STANDARD_DASHBOARD, title: "Sanitation Training Dashboard" },
      targetDepartment: "Cleaning",
      configType: "SOP",
      dueDate: "2050-02-20",
      description:
        "Cleaning/Sanitation staff must complete Sanitation & Hygiene training, upload a valid PDF certificate, and pass the assessment with at least 80%.",
    },
  },
  {
    pluginId: "sop_acknowledgment_all_staff",
    name: "Signed SOP Acknowledgment (All Staff)",
    rules:
      "Review the submitted signed SOP acknowledgment form. Verify that the document is in PDF (or digital-signature) format and contains a valid employee signature and date. Confirm the employee has acknowledged understanding of and agreement to follow Susie Q's Diner compliance procedures. Reject submissions with missing signatures, invalid formats, or unsigned documents.",
    inputSchema: buildInputSchema(
      "signed_sop_form",
      "Signed SOP Acknowledgment Form",
      "PDF (or digital signature) of the signed Susie Q's Diner SOP acknowledgment form, including the employee signature and date.",
    ),
    outputSchema: OUTPUT_SCHEMA,
    criteria: [
      {
        id: "criterion_sop_format",
        category: "SOP Acknowledgment",
        name: "Form Format",
        passCriteria: "Form is uploaded in PDF or accepted digital-signature format.",
        severity: "high",
        weight: 20,
        autoFailIfMissing: true,
      },
      {
        id: "criterion_sop_signature",
        category: "SOP Acknowledgment",
        name: "Valid Signature",
        passCriteria: "Form contains a valid signature and date from the employee acknowledging the SOP.",
        severity: "critical",
        weight: 80,
        autoFailIfMissing: true,
      },
    ],
    variables: {
      labels: STANDARD_LABELS,
      actions: { defaultTaskDueHours: 168 },
      dashboard: { ...STANDARD_DASHBOARD, title: "SOP Acknowledgment Dashboard" },
      targetDepartment: "All",
      configType: "SOP",
      dueDate: "2050-02-20",
      description:
        "All staff must submit a signed acknowledgment of Susie Q's Diner SOP rules in PDF or digital-signature format.",
    },
  },
];

/**
 * Seeds the canonical Susie Q's Diner compliance configs. Idempotent via upsert on
 * `pluginId`, so it is safe to run on every startup — existing records are refreshed
 * rather than duplicated.
 */
export async function seedJudgmentConfigs() {
  let seededCount = 0;

  for (const config of SEED_CONFIGS) {
    const normalized = normalizeGeneratedConfigPayload(config);
    validateConfigPayload(normalized);

    await JudgmentConfigModel.findOneAndUpdate(
      { pluginId: normalized.pluginId },
      { $set: normalized },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    seededCount += 1;
    logger.info("Seeded judgment config", { pluginId: normalized.pluginId });
  }

  logger.info("Judgment config seeding completed", { seededCount });
}

export default seedJudgmentConfigs;
