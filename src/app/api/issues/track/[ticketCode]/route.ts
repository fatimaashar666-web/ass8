import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ ticketCode: string }> }) {
  const { ticketCode } = await context.params;
  try {
    const issue = await prisma.issue.findUnique({
      where: { ticketCode: ticketCode.toUpperCase() },
      select: {
        ticketCode: true,
        category: true,
        title: true,
        description: true,
        building: true,
        room: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!issue) return NextResponse.json({ error: "No report found with that reference." }, { status: 404 });
    return NextResponse.json(issue);
  } catch {
    return NextResponse.json({ error: "Tracking is unavailable until PostgreSQL is connected." }, { status: 503 });
  }
}