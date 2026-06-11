# Judgment Engine Module

The **Judgment Engine** is a modular compliance workflow service. It supports two distinct config-authoring flows:

1. **Parse from file**: upload a document and forward it to the local LLM adapter to auto-generate one or more config drafts.
2. **Direct create via API**: submit a fully defined config JSON payload directly without using the LLM.

Submitted evidence is then evaluated against a chosen config using the local LLM adapter with a guarded fallback/error result path.

## Directory Structure

```text
judgment/
|-- README.md
`-- src/
    |-- controllers/
    |   `-- judgment.controller.ts
    |-- lib/
    |   `-- judgment.utils.ts
    |-- models/
    |   |-- audit.model.ts
    |   |-- config.model.ts
    |   |-- issue.model.ts
    |   |-- submission.model.ts
    |   `-- task.model.ts
    |-- routes/
    |   `-- judgment.routes.ts
    |-- seeds/
    |   |-- allied-financial-insurance.config.json
    |   |-- fnb-audit-readiness.config.json
    |   |-- service-team-readiness.config.json
    |   `-- judgment.seed.ts
    `-- services/
        |-- judgment-config.service.ts
        `-- judgment-submission.service.ts
```

## Key Features

1. **Dynamic schema-driven forms**: Renders `/judgment/:configId/submit` from each config's `inputSchema`.
2. **Dual config-ingestion APIs**: Supports both file parsing through the LLM and direct config creation via JSON API.
3. **Dynamic file upload widgets**: Supports single-file and multi-file fields using `"x-ui": { "widget": "file" }`.
4. **Seeding & synchronization**: Seed files inside `src/seeds/` are automatically upserted into `tbl_judgment_configs` on startup.
5. **Structured LLM assessment**: Evaluates submitted evidence against config rules and output schema.
6. **Corrective actions**: Automatically creates issues and follow-up tasks when a submission does not pass.

## Configuration Schema

Direct config creation expects a single JSON object shaped like this:

```json
{
  "pluginId": "employee_attendance_compliance",
  "name": "Employee Attendance Compliance",
  "rules": "Evaluate the submission against the documented attendance requirements.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "employeeId": {
        "type": "string",
        "title": "Employee ID",
        "description": "Unique employee identifier"
      },
      "profilePhoto": {
        "type": "string",
        "title": "Profile Photo",
        "description": "Employee photo evidence",
        "x-ui": { "widget": "file" }
      }
    },
    "required": ["employeeId", "profilePhoto"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "verdict": {
        "type": "string",
        "enum": ["pass", "partial", "fail", "risk", "ready", "not_ready"]
      }
    },
    "required": ["verdict"]
  },
  "criteria": [
    {
      "id": "criterion_identity",
      "category": "Documentation",
      "name": "Identity completeness",
      "passCriteria": "Employee identity fields are complete and consistent.",
      "severity": "critical",
      "weight": 20,
      "autoFailIfMissing": true
    }
  ],
  "variables": {
    "labels": {
      "unitLabel": "Department",
      "workerLabel": "Employee",
      "managerLabel": "HR Manager"
    },
    "actions": {
      "defaultTaskDueHours": 24
    },
    "dashboard": {
      "title": "Attendance Dashboard",
      "company": "Demo Company"
    }
  }
}
```

### `inputSchema`

Defines the evidence fields. Supported field types are `string`, `number`, `boolean`, and `array`.

- To render a single-file upload control instead of a text input, add `"x-ui": { "widget": "file" }` to a `string` field:

```json
"evidencePhoto": {
  "type": "string",
  "title": "Evidence Photo",
  "x-ui": {
    "widget": "file"
  }
}
```

- For multiple file uploads, use an `array` of strings and the same widget hint:

```json
"mediaUrls": {
  "type": "array",
  "items": { "type": "string" },
  "title": "Media Attachments",
  "x-ui": {
    "widget": "file"
  }
}
```

### `criteria`

Defines the checks used by the judgment engine. Each criterion includes:

- `id`: unique identifier
- `category`: evaluation area such as `Food Safety` or `Documentation`
- `name`: short human-readable check name
- `passCriteria`: condition that must be satisfied
- `severity`: one of `low`, `medium`, `high`, `critical`
- `weight`: numeric contribution to the overall evaluation
- `autoFailIfMissing`: whether missing evidence should force failure

### Parse Output Shape

The file-parse LLM flow asks the model to return a top-level object:

```json
{
  "configs": [
    {
      "...": "single config object"
    }
  ]
}
```

The Judgment API then normalizes that into a plain array response for the frontend. This avoids the top-level array parsing issues seen in the upstream agentic JSON extractor while still allowing multiple generated configs.

## REST API Reference

All routes are prefixed with `/api`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/judgment/configs` | Retrieve all loaded configurations |
| `GET` | `/judgment/configs/direct/schema` | Return the defined JSON schema contract for direct config creation |
| `POST` | `/judgment/configs/direct` | Create a config directly from JSON |
| `GET` | `/judgment/configs/parse/schema` | Return the request/response contract for file parsing |
| `POST` | `/judgment/configs/parse` | Upload a file and forward it to the LLM to auto-generate config drafts |
| `POST` | `/judgment/configs` | Backward-compatible alias for direct config creation |
| `GET` | `/judgment/configs/:configId` | Get configuration details by ID |
| `PUT` | `/judgment/configs/:configId` | Update an existing config |
| `POST` | `/judgment/configs/:configId/submit` | Submit evidence data and files for evaluation |
| `GET` | `/judgment/configs/:configId/dashboard` | Get dashboard details |
| `POST` | `/judgment/tasks/:taskId/complete` | Complete a corrective action task |
| `POST` | `/judgment/issues/:issueId/resolve` | Mark a compliance issue resolved |

### Direct Create Example

```bash
curl -X POST http://localhost:3002/api/judgment/configs/direct \
  -H "Content-Type: application/json" \
  -d @config.json
```

### Parse-From-File Example

```bash
curl -X POST http://localhost:3002/api/judgment/configs/parse \
  -F "file=@attendance-sop.pdf"
```

## Notes

- The parse flow uses the local `/api/agents/llm` adapter and therefore depends on `QB_SCAFFOLDER_KEY`.
- The parse flow returns generated config drafts only after normalization and validation. Invalid generated configs are rejected before persistence.
- Submission review errors normalize to an explicit failed/human-review result instead of defaulting to a pass-like fallback.
