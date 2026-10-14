import test from "node:test";
import assert from "node:assert/strict";

import { calculateWorkingHours, calculateOvertimeHours, normalizeAttendanceRecord, exportAttendanceCsv } from "./attendance";

test("calculates working hours and overtime correctly", () => {
  const workingHours = calculateWorkingHours("09:15", "18:45");
  const overtimeHours = calculateOvertimeHours(workingHours, 9);

  assert.equal(workingHours, 9.5);
  assert.equal(overtimeHours, 0.5);
});

test("normalizes late attendance and overtime values", () => {
  const record = normalizeAttendanceRecord({
    employeeId: "EMP-1002",
    employeeName: "Priya Verma",
    date: "2026-10-14",
    checkIn: "09:50",
    checkOut: "19:15",
    status: "PRESENT",
  });

  assert.equal(record.status, "LATE");
  assert.equal(record.workingHours, 9.42);
  assert.equal(record.overtimeHours, 0.42);
});

test("rejects invalid clock times and supports overnight shifts", () => {
  assert.equal(calculateWorkingHours("25:00", "18:00"), 0);
  assert.equal(calculateWorkingHours("22:00", "06:00"), 8);
  assert.equal(calculateOvertimeHours(8, 9), 0);
});

test("exports attendance values with CSV quoting", () => {
  const csv = exportAttendanceCsv([{
    employeeId: "EMP-1",
    employeeName: 'Taylor "T" Lee',
    date: "2026-10-14",
    checkIn: null,
    checkOut: null,
    status: "ABSENT",
  }]);

  assert.match(csv, /"Taylor ""T"" Lee"/);
  assert.match(csv, /"ABSENT"/);
});
