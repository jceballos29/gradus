import { NextRequest, NextResponse } from "next/server";
import { validateM2MToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const identitySchema = z.string().min(1, "Identity is required");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ identity: string }> }
) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }
    
    const validation = await validateM2MToken(token);
    if (!validation.success) {
      console.warn(`[M2M Auth Failed]: ${validation.code || 'ValidationFailed'} - ${validation.error}`);
      return NextResponse.json({ error: "Forbidden: Invalid or expired token" }, { status: 403 });
    }
  } catch (err) {
    console.error("[M2M Auth Unexpected Error]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  try {
    const rawParams = await params;
    const parseResult = identitySchema.safeParse(rawParams.identity);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: "Bad Request: Invalid identity parameter" }, { status: 400 });
    }
    
    const identity = parseResult.data;

    const student = await prisma.student.findFirst({
      where: { user: { identity } },
      include: {
        pensum: true,
        academicRecords: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const records = student.academicRecords ?? [];
    const passed = records.filter((r) => r.status === "PASSED").length;
    const inProgress = records.filter((r) => r.status === "IN_PROGRESS").length;
    const failed = records.filter((r) => r.status === "FAILED").length;
    const withdrawn = records.filter((r) => r.status === "WITHDRAWN").length;

    const activePeriod = await prisma.academicPeriod.findFirst({
      where: { active: true },
    });
    
    const totalCredits = student.pensum?.totalCredits ?? 0;
    const creditsEarned = student.creditsEarned ?? 0;
    const progressPercentage = totalCredits > 0 
      ? Math.round((creditsEarned / totalCredits) * 1000) / 10 
      : 0;

    return NextResponse.json({
      identity,
      creditsEarned,
      totalCredits,
      progressPercentage,
      subjects: { passed, inProgress, failed, withdrawn },
      activeTerm: activePeriod?.code ?? null,
    });
  } catch (err) {
    console.error("[M2M DB Error]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}