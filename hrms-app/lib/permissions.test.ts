import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canAccess } from "./permissions";

describe("RBAC permissions", () => {
  it("allows HR to read and manage employees", () => {
    assert.equal(canAccess("HR", "employee:read"), true);
    assert.equal(canAccess("HR", "employee:create"), true);
  });

  it("denies employees access to payroll creation", () => {
    assert.equal(canAccess("EMPLOYEE", "payroll:create"), false);
  });

  it("allows managers to approve leave", () => {
    assert.equal(canAccess("MANAGER", "leave:approve"), true);
  });
});
