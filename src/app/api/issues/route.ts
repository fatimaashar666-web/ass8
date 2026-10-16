import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { issueCategories } from "@/types/issue";

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }

  try {
    const issues = await prisma.issue.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json(issues);
  } catch {
    return NextResponse.json({ error: "Could not load reports." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const category = body.category;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const building = typeof body.building === "string" ? body.building.trim() : "";
  const room = typeof body.room === "string" ? body.room.trim() : "";
  const reporterName = typeof body.reporterName === "string" ? body.reporterName.trim() : "";
  const reporterEmail = typeof body.reporterEmail === "string" ? body.reporterEmail.trim() : "";
  const imageData = typeof body.imageData === "string" ? body.imageData : null;

  if (
    typeof category !== "string" ||
    !issueCategories.includes(category as (typeof issueCategories)[number]) ||
    !title || title.length > 120 ||
    !description || description.length > 2000 ||
    !building || building.length > 120 ||
    !room || room.length > 60 ||
    !reporterName || reporterName.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail) || reporterEmail.length > 254
  ) {
    return NextResponse.json({ error: "Check the required fields and try again." }, { status: 400 });
  }

  if (imageData && (!imageData.startsWith("data:image/jpeg;base64,") || imageData.length > 800_000)) {
    return NextResponse.json({ error: "The image must be a compressed JPEG under 550 KB." }, { status: 400 });
  }

  try {
    const issue = await prisma.issue.create({
      data: {
        ticketCode: `ISS-${randomBytes(5).toString("hex").toUpperCase()}`,
        category: category as (typeof issueCategories)[number],
        title,
        description,
        building,
        room,
        reporterName,
        reporterEmail,
        imageData,
      },
      select: { ticketCode: true, status: true },
    });
    return NextResponse.json(issue, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save the report. Check the database connection." }, { status: 503 });
  }
}