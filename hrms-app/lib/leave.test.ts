import test from "node:test";
import assert from "node:assert/strict";

import { approveLeaveRequest, calculateLeaveBalance } from "./leave";
import { countWorkingDays, parseDateOnly } from "./hrms-date";

test("calculates remaining leave balance correctly", () => {
  assert.equal(calculateLeaveBalance(12, 3), 9);
  assert.equal(calculateLeaveBalance(4, 6), 0);
});

test("approves leave and updates balance", () => {
  const request = { id: "leave-1", employee: "Rahul Sharma", type: "Casual Leave", status: "PENDING", days: 3, availableDays: 12 } as const;
  const result = approveLeaveRequest(request);

  assert.equal(result.status, "APPROVED");
  assert.equal(result.remainingBalance, 9);
});

test("counts weekdays while excluding company holidays", () => {
  const start = parseDateOnly("2026-10-12");
  const end = parseDateOnly("2026-10-16");

  assert.ok(start);
  assert.ok(end);
  assert.equal(countWorkingDays(start, end, ["2026-10-14"]), 4);
  assert.equal(countWorkingDays(end, start), 0);
});

test("rejects impossible ISO calendar dates", () => {
  assert.equal(parseDateOnly("2026-02-31"), null);
  assert.equal(parseDateOnly("2026-13-01"), null);
});
