import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hasAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { issueStatuses } from "@/types/issue";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await hasAdminSession())) {
    return NextResponse.json(
      { error: "Admin sign-in required." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
  } | null;

  if (
    typeof body?.status !== "string" ||
    !issueStatuses.includes(
      body.status as (typeof issueStatuses)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Choose a valid status." },
      { status: 400 },
    );
  }

  try {
    const issue = await prisma.issue.update({
      where: { id },
      data: {
        status: body.status as (typeof issueStatuses)[number],
      },
    });

    return NextResponse.json(issue);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Could not update this report." },
      { status: 503 },
    );
  }
}