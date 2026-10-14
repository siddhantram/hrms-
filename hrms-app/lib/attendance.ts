export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "HALF_DAY" | "CORRECTION_PENDING";

export type AttendanceRecord = {
  id?: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workingHours?: number;
  overtimeHours?: number;
  notes?: string;
  pendingCorrection?: boolean;
};

export function parseClockTime(value: string | null | undefined): number | null {
  if (!value) return null;

  if (!/^\d{2}:\d{2}$/.test(value)) return null;

  const [hours, minutes] = value.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function calculateWorkingHours(checkIn: string | null | undefined, checkOut: string | null | undefined): number {
  if (!checkIn || !checkOut) return 0;

  const startMinutes = parseClockTime(checkIn);
  const endMinutes = parseClockTime(checkOut);

  if (startMinutes === null || endMinutes === null) return 0;

  let diffMinutes = endMinutes - startMinutes;

  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }

  return Number((diffMinutes / 60).toFixed(2));
}

export function calculateOvertimeHours(workingHours: number, baselineHours = 9): number {
  return Number(Math.max(0, workingHours - baselineHours).toFixed(2));
}

export function normalizeAttendanceRecord(record: AttendanceRecord): AttendanceRecord {
  const workingHours = calculateWorkingHours(record.checkIn, record.checkOut);
  const overtimeHours = calculateOvertimeHours(workingHours, 9);

  const checkInMinutes = parseClockTime(record.checkIn);
  const isLate = checkInMinutes !== null && checkInMinutes > 9 * 60 + 30;

  let status: AttendanceStatus = record.status;

  if (record.status === "CORRECTION_PENDING") {
    status = "CORRECTION_PENDING";
  } else if (workingHours === 0) {
    status = "ABSENT";
  } else if (workingHours < 4) {
    status = "HALF_DAY";
  } else if (isLate) {
    status = "LATE";
  } else {
    status = "PRESENT";
  }

  return {
    ...record,
    status,
    workingHours,
    overtimeHours,
  };
}

export function buildAttendanceSummary(records: AttendanceRecord[]) {
  const total = records.length;
  const present = records.filter((record) => record.status === "PRESENT").length;
  const late = records.filter((record) => record.status === "LATE").length;
  const absent = records.filter((record) => record.status === "ABSENT").length;
  const pendingCorrections = records.filter((record) => record.status === "CORRECTION_PENDING").length;
  const totalOvertime = records.reduce((sum, record) => sum + (record.overtimeHours ?? 0), 0);

  return {
    total,
    present,
    late,
    absent,
    pendingCorrections,
    totalOvertime: Number(totalOvertime.toFixed(2)),
    attendanceRate: total === 0 ? 0 : Number(((present / total) * 100).toFixed(1)),
  };
}

export function exportAttendanceCsv(records: AttendanceRecord[]) {
  const headers = ["employeeId", "employeeName", "date", "checkIn", "checkOut", "status", "workingHours", "overtimeHours"];

  const rows = records.map((record) =>
    headers
      .map((header) => {
        const value = record[header as keyof AttendanceRecord] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
