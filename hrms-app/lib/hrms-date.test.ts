import test from "node:test";
import assert from "node:assert/strict";

import { countWorkingDays, elapsedHours, parseDateOnly, parseTimeOnDate } from "./hrms-date";

test("date and time parsing rejects invalid calendar values", () => {
  assert.equal(parseDateOnly("2026-02-30"), null);
  assert.equal(parseTimeOnDate(new Date("2026-10-14T00:00:00Z"), "24:01"), null);
});

test("working-day count excludes weekends and company holidays", () => {
  const start = parseDateOnly("2026-10-12");
  const end = parseDateOnly("2026-10-16");
  assert.ok(start && end);
  assert.equal(countWorkingDays(start, end, ["2026-10-14"]), 4);
});

test("elapsed hours handles overnight attendance", () => {
  const day = parseDateOnly("2026-10-14");
  assert.ok(day);
  const start = parseTimeOnDate(day, "22:00");
  const end = parseTimeOnDate(day, "06:00");
  assert.ok(start && end);
  assert.equal(elapsedHours(start, end), 8);
});