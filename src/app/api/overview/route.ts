import { connection } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueCategories } from "@/types/issue";

export async function GET() {
  await connection();
  try {
    const [total, statuses, categories, recent] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.issue.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.issue.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true },
      }),
    ]);

    const byCategory = Object.fromEntries(issueCategories.map((category) => [category, 0])) as Record<
      (typeof issueCategories)[number],
      number
    >;
    for (const group of categories) byCategory[group.category] = group._count._all;

    const thisWeek = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      return recent.filter((issue) => issue.createdAt.toDateString() === day.toDateString()).length;
    });

    const statusCounts = Object.fromEntries(statuses.map((group) => [group.status, group._count._all]));
    return NextResponse.json({
      total,
      pending: statusCounts.PENDING ?? 0,
      inProgress: statusCounts.IN_PROGRESS ?? 0,
      resolved: statusCounts.RESOLVED ?? 0,
      byCategory,
      thisWeek,
    });
  } catch {
    return NextResponse.json({ error: "Statistics are unavailable until PostgreSQL is connected." }, { status: 503 });
  }
}