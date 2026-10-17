import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { documentSchema, documentUploadSchema } from "@/lib/validation";

const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function uploadToCloudinary(file: File, companyId: string) {
  const configuredUrl = process.env.CLOUDINARY_URL;
  if (!configuredUrl) throw new Error("Document storage is not configured.");
  const cloudinary = new URL(configuredUrl);
  const apiKey = decodeURIComponent(cloudinary.username);
  const apiSecret = decodeURIComponent(cloudinary.password);
  const folder = `hrms/${companyId}/documents`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.hostname}/auto/upload`, { method: "POST", body: formData });
  if (!response.ok) throw new Error("Could not upload document to storage.");
  const result = await response.json() as { secure_url?: string };
  if (!result.secure_url) throw new Error("Storage provider returned no secure URL.");
  return result.secure_url;
}

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(request, "document:read");
  if (access.response) return access.response;
  const documents = await prisma.document.findMany({
    where: access.session.role === "EMPLOYEE"
      ? { companyId: access.session.companyId, employee: { userId: access.session.userId } }
      : { companyId: access.session.companyId },
    include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
    orderBy: { uploadedAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ data: documents });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(request, "document:create");
  if (access.response) return access.response;
  try {
    const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
    let body: { employeeId?: string; name: string; url: string; type: string };
    if (isMultipart) {
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (contentLength > MAX_DOCUMENT_SIZE + 1024 * 1024) return NextResponse.json({ error: "Maximum document size is 15 MB." }, { status: 413 });
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a document to upload." }, { status: 400 });
      if (file.size > MAX_DOCUMENT_SIZE) return NextResponse.json({ error: "Maximum document size is 15 MB." }, { status: 413 });
      if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) return NextResponse.json({ error: "Upload a PDF, Word document, or PNG/JPEG image." }, { status: 415 });
      const fields = documentUploadSchema.parse({
        employeeId: form.get("employeeId") || undefined,
        name: form.get("name"),
        type: form.get("type"),
      });
      body = { ...fields, url: await uploadToCloudinary(file, access.session.companyId) };
    } else {
      body = documentSchema.parse(await request.json());
    }
    const employee = access.session.role === "EMPLOYEE"
      ? await prisma.employee.findFirst({ where: { companyId: access.session.companyId, userId: access.session.userId }, select: { id: true } })
      : body.employeeId
        ? await prisma.employee.findFirst({ where: { id: body.employeeId, companyId: access.session.companyId }, select: { id: true } })
        : null;
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    const document = await prisma.document.create({
      data: { companyId: access.session.companyId, employeeId: employee.id, name: body.name, url: body.url, type: body.type },
      include: { employee: { select: { employeeId: true, firstName: true, lastName: true } } },
    });
    await prisma.activityLog.create({
      data: {
        companyId: access.session.companyId,
        userId: access.session.userId,
        action: "DOCUMENT_REGISTERED",
        entity: "Document",
        entityId: document.id,
        newData: JSON.stringify({ employeeId: employee.id, name: document.name, type: document.type }),
      },
    });
    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid document details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}