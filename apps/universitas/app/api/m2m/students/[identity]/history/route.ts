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
        academicRecords: {
          include: { subject: true },
          orderBy: [{ term: "desc" }, { subject: { period: "asc" } }],
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const subjects = student.academicRecords?.map((r) => ({
      code: r.subject?.code,
      name: r.subject?.name,
      credits: r.subject?.credits,
      area: r.subject?.area,
      period: r.subject?.period,
      term: r.term,
      status: r.status,
      finalGrade: r.finalGrade,
    })) ?? [];

    return NextResponse.json({
      identity,
      totalSubjects: subjects.length,
      subjects,
    });
  } catch (err) {
    console.error("[M2M DB Error]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}