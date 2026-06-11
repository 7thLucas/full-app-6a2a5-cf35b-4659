export type UserRole = "HR" | "Employee";
export type Department = "All" | "Kitchen" | "Front-of-House" | "Cleaning";
export type EmployeeDepartment = Exclude<Department, "All">;
export type ComplianceConfigType = "SOP" | "CONFIG";
export type ComplianceStatus = "Pending" | "Submitted" | "Approved" | "Needs Review";

export interface DemoAccount {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  department: Department;
}

export interface ComplianceConfigDto {
  _id: string;
  pluginId: string;
  title: string;
  description: string;
  type: ComplianceConfigType;
  targetDepartment: Department;
  dueDate?: string;
  requirements: string[];
  rules?: string;
  inputSchema?: Record<string, unknown>;
  criteria?: Array<Record<string, unknown>>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComplianceSubmissionDto {
  _id: string;
  configId: string;
  configTitle: string;
  employeeName: string;
  employeeEmail: string;
  department: EmployeeDepartment;
  evidenceText: string;
  evidenceFileName?: string;
  status: ComplianceStatus;
  judgmentStatus?: "PENDING" | "DONE" | "ERROR";
  result?: Record<string, unknown>;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const departments: Department[] = ["All", "Kitchen", "Front-of-House", "Cleaning"];

export const demoAccounts: DemoAccount[] = [
  {
    role: "HR",
    name: "Susie Q",
    email: "susie@susieqs.demo",
    password: "Demo@123",
    department: "All",
  },
  {
    role: "Employee",
    name: "Jack Turner",
    email: "jack.kitchen@susieqs.demo",
    password: "Demo@123",
    department: "Kitchen",
  },
  {
    role: "Employee",
    name: "Emily Carter",
    email: "emily.foh@susieqs.demo",
    password: "Demo@123",
    department: "Front-of-House",
  },
  {
    role: "Employee",
    name: "Mike Bennett",
    email: "mike.cleaning@susieqs.demo",
    password: "Demo@123",
    department: "Cleaning",
  },
];

const sessionKey = "susie-q-compliance-demo-session";

export function findDemoAccount(email: string, password: string): DemoAccount | undefined {
  return demoAccounts.find(
    (account) =>
      account.email.toLowerCase() === email.trim().toLowerCase() &&
      account.password === password,
  );
}

export function saveDemoSession(account: DemoAccount): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(sessionKey, JSON.stringify(account));
}

export function getDemoSession(): DemoAccount | null {
  if (typeof window === "undefined") return null;
  const rawSession = window.localStorage.getItem(sessionKey);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as DemoAccount;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function clearDemoSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionKey);
}

export function isEmployeeDepartment(department: Department): department is EmployeeDepartment {
  return department === "Kitchen" || department === "Front-of-House" || department === "Cleaning";
}
