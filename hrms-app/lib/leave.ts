export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LeaveRequest = {
  id: string;
  employee: string;
  type: string;
  days: number;
  status: LeaveStatus;
  availableDays: number;
  remainingBalance?: number;
};

export function calculateLeaveBalance(availableDays: number, usedDays: number): number {
  return Math.max(0, availableDays - usedDays);
}

export function approveLeaveRequest(request: LeaveRequest) {
  const remainingBalance = calculateLeaveBalance(request.availableDays, request.days);

  return {
    ...request,
    status: "APPROVED" as const,
    remainingBalance,
  };
}

export function rejectLeaveRequest(request: LeaveRequest) {
  return {
    ...request,
    status: "REJECTED" as const,
    remainingBalance: request.availableDays,
  };
}

export function buildLeaveSummary(requests: LeaveRequest[]) {
  const approved = requests.filter((request) => request.status === "APPROVED").reduce((sum, request) => sum + request.days, 0);
  const pending = requests.filter((request) => request.status === "PENDING").length;
  const remaining = requests.reduce((sum, request) => sum + (request.remainingBalance ?? request.availableDays), 0);

  return {
    approved,
    pending,
    remaining,
    utilization: requests.length === 0 ? 0 : Number(((approved / Math.max(1, requests.reduce((sum, request) => sum + request.availableDays, 0))) * 100).toFixed(1)),
  };
}
