import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.email("Please provide a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(2, "Company name is required"),
  role: z.enum(["HR", "MANAGER", "EMPLOYEE"]),
});

export const loginSchema = z.object({
  email: z.email("Please provide a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const companySchema = z.object({
  name: z.string().min(2, "Company name is required"),
  email: z.string().email("Please provide a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  website: z.string().url("Please provide a valid website URL").optional().or(z.literal("")),
  timezone: z.string().default("UTC"),
  currency: z.string().default("INR"),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});

export const designationSchema = departmentSchema;

export const payrollRunSchema = z.object({
  employeeId: z.string().min(1),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  basic: z.coerce.number().min(0),
  hra: z.coerce.number().min(0).default(0),
  allowance: z.coerce.number().min(0).default(0),
  bonus: z.coerce.number().min(0).default(0),
  overtime: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  pf: z.coerce.number().min(0).default(0),
  otherDeductions: z.coerce.number().min(0).default(0),
});

export const performanceReviewSchema = z.object({
  employeeId: z.string().min(1),
  cycle: z.string().trim().min(2).max(80),
});

export const performanceReviewUpdateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  feedback: z.string().trim().max(3000).optional(),
  status: z.enum(["DRAFT", "IN_REVIEW", "COMPLETE", "ACKNOWLEDGED"]).optional(),
});

export const documentSchema = z.object({
  employeeId: z.string().optional(),
  name: z.string().trim().min(1).max(160),
  url: z.string().url().max(2000),
  type: z.string().trim().min(2).max(80),
});

export const employeeSchema = z.object({
  employeeId: z.string().min(2, "Employee ID is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.email("Please provide a valid email"),
  phone: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  designation: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "ON_LEAVE", "PENDING", "INACTIVE"]).default("ACTIVE"),
  salary: z.coerce.number().min(0).optional(),
  joiningDate: z.string().optional().or(z.literal("")),
});

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, for example 09:30");

export const attendancePunchSchema = z.object({
  action: z.enum(["CHECK_IN", "CHECK_OUT"]),
  employeeId: z.string().optional(),
  date: z.string().optional(),
});

export const attendanceCorrectionSchema = z.object({
  attendanceId: z.string().min(1),
  requestedCheckIn: z.union([clockTimeSchema, z.literal("")]).optional(),
  requestedCheckOut: z.union([clockTimeSchema, z.literal("")]).optional(),
  reason: z.string().trim().min(5).max(500),
}).refine(
  (value) => Boolean(value.requestedCheckIn || value.requestedCheckOut),
  "Provide a corrected check-in or check-out time",
);

export const attendanceCorrectionDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional(),
});

export const leaveRequestSchema = z.object({
  employeeId: z.string().optional(),
  type: z.string().trim().min(2).max(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(500).optional(),
}).refine((value) => value.startDate <= value.endDate, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

export const leaveBalanceSchema = z.object({
  employeeId: z.string().min(1),
  leaveType: z.string().trim().min(2).max(80),
  allocatedDays: z.number().int().min(0).max(365),
});

export const leaveDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional(),
});
