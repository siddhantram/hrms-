export type BaseReportRow = Record<string, string | number | boolean | null | undefined>;

export function buildReportSummary({ attendanceRecords, leaveRequests, payrollEntries }: {
  attendanceRecords: Array<{ status: string; workingHours?: number | null; overtimeHours?: number | null }>;
  leaveRequests: Array<{ status: string; days: number }>; 
  payrollEntries: Array<{ net: number }>; 
}) {
  const attendanceRate = attendanceRecords.length === 0
    ? 0
    : Number(((attendanceRecords.filter((record) => ["PRESENT", "LATE", "HALF_DAY"].includes(record.status)).length / attendanceRecords.length) * 100).toFixed(1));

  const overtimeHours = attendanceRecords.reduce((sum, record) => sum + (record.overtimeHours ?? 0), 0);
  const leaveUtilization = leaveRequests.length === 0
    ? 0
    : Number(((leaveRequests.filter((request) => request.status === "APPROVED").reduce((sum, request) => sum + request.days, 0) / Math.max(1, leaveRequests.reduce((sum, request) => sum + request.days, 0))) * 100).toFixed(1));

  const payrollTotal = payrollEntries.reduce((sum, entry) => sum + (entry.net ?? 0), 0);

  return {
    attendanceRate,
    overtimeHours: Number(overtimeHours.toFixed(2)),
    leaveUtilization,
    payrollTotal: Number(payrollTotal.toFixed(2)),
    pendingApprovals: leaveRequests.filter((request) => request.status === "PENDING").length,
  };
}

export function exportCsv(rows: BaseReportRow[], columns: string[]) {
  const header = columns.join(",");
  const dataRows = rows.map((row) =>
    columns
      .map((column) => {
        const value = row[column] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return [header, ...dataRows].join("\n");
}

export function buildMonthlyChartData(rows: Array<{ label: string; present: number; late: number; overtime: number }>) {
  return rows.map((row) => ({
    ...row,
    total: row.present + row.late,
  }));
}
