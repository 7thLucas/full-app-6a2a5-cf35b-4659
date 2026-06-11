import type {
  ComplianceConfigDto,
  ComplianceConfigType,
  ComplianceSubmissionDto,
  Department,
  EmployeeDepartment,
} from "./compliance-demo";

type JudgmentCriterion = {
  id: string;
  category: string;
  name: string;
  passCriteria: string;
  severity: string;
  weight: number;
  autoFailIfMissing: boolean;
};

type JudgmentConfig = {
  _id?: string;
  pluginId: string;
  name: string;
  rules: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  criteria?: JudgmentCriterion[];
  variables?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

type JudgmentSubmission = {
  _id?: string;
  configId: string;
  inputData?: Record<string, any>;
  files?: Array<{ filename: string; fileUrl: string }>;
  result?: Record<string, any>;
  status: "PENDING" | "DONE" | "ERROR";
  error?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type JudgmentDashboard = {
  config: JudgmentConfig;
  submissions: JudgmentSubmission[];
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Request failed");
  }
  return payload as T;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function getTargetDepartment(config: JudgmentConfig): Department {
  const target = config.variables?.targetDepartment;
  return target === "Kitchen" || target === "Front-of-House" || target === "Cleaning" || target === "All"
    ? target
    : "All";
}

function getConfigType(config: JudgmentConfig): ComplianceConfigType {
  const value = config.variables?.configType;
  return value === "CONFIG" ? "CONFIG" : "SOP";
}

function getRequirements(config: JudgmentConfig): string[] {
  if (Array.isArray(config.variables?.requirements)) {
    return config.variables.requirements.map(String).filter(Boolean);
  }

  return (config.criteria || []).map((criterion) => criterion.passCriteria).filter(Boolean);
}

function mapConfig(config: JudgmentConfig): ComplianceConfigDto {
  return {
    _id: config._id || config.pluginId,
    pluginId: config.pluginId,
    title: config.name,
    description: config.variables?.description || config.rules,
    type: getConfigType(config),
    targetDepartment: getTargetDepartment(config),
    dueDate: config.variables?.dueDate,
    requirements: getRequirements(config),
    rules: config.rules,
    inputSchema: config.inputSchema,
    criteria: config.criteria,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

function buildDirectConfig(input: {
  title: string;
  description: string;
  type: ComplianceConfigType;
  targetDepartment: Department;
  requirements: string;
}) {
  const requirements = input.requirements
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const pluginId = `susieqs-${slugify(input.title)}-${Date.now()}`;

  return {
    pluginId,
    name: input.title,
    rules: input.description,
    inputSchema: {
      type: "object",
      properties: {
        employeeName: { type: "string", title: "Employee Name" },
        employeeEmail: { type: "string", title: "Employee Email" },
        department: { type: "string", title: "Department" },
        evidenceText: { type: "string", title: "Evidence / Notes" },
        evidenceFileName: { type: "string", title: "File Name" },
      },
      required: ["employeeName", "employeeEmail", "department", "evidenceText"],
    },
    outputSchema: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["pass", "partial", "fail", "risk", "ready", "not_ready"] },
        score: { type: "number", minimum: 0, maximum: 100 },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
        reason: { type: "string" },
        fixSuggestion: { type: "string" },
        requiresHumanReview: { type: "boolean" },
      },
      required: ["verdict", "score", "confidence", "severity", "reason", "fixSuggestion", "requiresHumanReview"],
    },
    criteria: requirements.map((requirement, index) => ({
      id: `criterion_${index + 1}`,
      category: input.type === "SOP" ? "SOP Acknowledgement" : "Compliance Evidence",
      name: requirement.slice(0, 80),
      passCriteria: requirement,
      severity: index === 0 ? "high" : "medium",
      weight: Math.max(10, Math.round(100 / Math.max(requirements.length, 1))),
      autoFailIfMissing: true,
    })),
    variables: {
      targetDepartment: input.targetDepartment,
      configType: input.type,
      description: input.description,
      requirements,
      labels: {
        unitLabel: "Station",
        workerLabel: "Staff",
        managerLabel: "Manager",
      },
      actions: {
        defaultTaskDueHours: 72,
      },
      dashboard: {
        title: "Kitchen Compliance Dashboard",
        company: "Susie Q's Diner",
      },
    },
  };
}

function enrichParsedConfig(config: JudgmentConfig, input: {
  type: ComplianceConfigType;
  targetDepartment: Department;
  description: string;
}) {
  return {
    ...config,
    pluginId: config.pluginId || `susieqs-${slugify(config.name)}-${Date.now()}`,
    variables: {
      ...(config.variables || {}),
      targetDepartment: input.targetDepartment,
      configType: input.type,
      description: input.description || config.rules,
      labels: {
        unitLabel: "Station",
        workerLabel: "Staff",
        managerLabel: "Manager",
        ...(config.variables?.labels || {}),
      },
      actions: {
        defaultTaskDueHours: 72,
        ...(config.variables?.actions || {}),
      },
      dashboard: {
        title: "Kitchen Compliance Dashboard",
        company: "Susie Q's Diner",
        ...(config.variables?.dashboard || {}),
      },
    },
  };
}

function mapSubmission(submission: JudgmentSubmission, configTitle = ""): ComplianceSubmissionDto {
  const inputData = submission.inputData || {};
  const result = submission.result || {};
  // Status is driven by the AI verdict, not by any numeric score.
  const verdict = typeof result.verdict === "string" ? result.verdict : "";
  const passed = verdict === "pass" || verdict === "ready";
  const status = submission.status === "ERROR" || (verdict && !passed) ? "Needs Review" : "Submitted";

  return {
    _id: submission._id || `${submission.configId}-${submission.createdAt || ""}`,
    configId: submission.configId,
    configTitle,
    employeeName: String(inputData.employeeName || "-"),
    employeeEmail: String(inputData.employeeEmail || ""),
    department:
      inputData.department === "Front-of-House"
        ? "Front-of-House"
        : inputData.department === "Cleaning"
          ? "Cleaning"
          : "Kitchen",
    evidenceText: String(inputData.evidenceText || ""),
    evidenceFileName: String(inputData.evidenceFileName || submission.files?.[0]?.filename || ""),
    status,
    judgmentStatus: submission.status,
    result,
    submittedAt: submission.createdAt,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

export async function fetchComplianceConfigs(department?: Department): Promise<ComplianceConfigDto[]> {
  const response = await fetch("/api/judgment/configs");
  const configs = await parseJsonResponse<JudgmentConfig[]>(response);
  return configs
    .map(mapConfig)
    .filter((config) => !department || department === "All" || config.targetDepartment === "All" || config.targetDepartment === department);
}

export async function createComplianceConfig(input: {
  title: string;
  description: string;
  type: ComplianceConfigType;
  targetDepartment: Department;
  requirements: string;
  file?: File | null;
}): Promise<ComplianceConfigDto[]> {
  if (input.file) {
    const form = new FormData();
    form.append("file", input.file);
    const parseResponse = await fetch("/api/judgment/configs/parse", {
      method: "POST",
      body: form,
    });
    const parsedConfigs = await parseJsonResponse<JudgmentConfig[]>(parseResponse);
    const created = await Promise.all(
      parsedConfigs.map((config) =>
        createJudgmentConfig(enrichParsedConfig(config, input)),
      ),
    );
    return created.map(mapConfig);
  }

  const created = await createJudgmentConfig(buildDirectConfig(input));
  return [mapConfig(created)];
}

async function createJudgmentConfig(payload: Record<string, unknown>): Promise<JudgmentConfig> {
  const response = await fetch("/api/judgment/configs/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<JudgmentConfig>(response);
}

export async function fetchComplianceSubmissions(configs?: ComplianceConfigDto[]): Promise<ComplianceSubmissionDto[]> {
  const scopedConfigs = configs || await fetchComplianceConfigs();
  const dashboards = await Promise.all(
    scopedConfigs.map(async (config) => {
      const response = await fetch(`/api/judgment/configs/${encodeURIComponent(config.pluginId)}/dashboard`);
      return parseJsonResponse<JudgmentDashboard>(response);
    }),
  );

  return dashboards.flatMap((dashboard) =>
    dashboard.submissions.map((submission) => mapSubmission(submission, dashboard.config.name)),
  );
}

export async function createComplianceSubmission(input: {
  configId: string;
  employeeName: string;
  employeeEmail: string;
  department: EmployeeDepartment;
  evidenceText: string;
  evidenceFileName?: string;
  file?: File | null;
}): Promise<ComplianceSubmissionDto> {
  const { file, ...inputData } = input;
  const form = new FormData();
  form.set("inputData", JSON.stringify(inputData));
  // Backend mounts `upload.array("files")` on the submit route, so the multipart
  // field MUST be "files" — sending "file" triggers a Multer "Unexpected field" 500.
  if (file) form.append("files", file);

  const response = await fetch(`/api/judgment/configs/${encodeURIComponent(input.configId)}/submit`, {
    method: "POST",
    body: form,
  });
  const submission = await parseJsonResponse<JudgmentSubmission>(response);
  return mapSubmission(submission);
}
