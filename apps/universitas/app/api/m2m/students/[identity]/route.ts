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
        user: true,
        pensum: {
          include: {
            program: {
              include: { faculty: { include: { institution: true } } },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      identity: student.user?.identity ?? null,
      firstName: student.user?.firstName ?? null,
      lastName: student.user?.lastName ?? null,
      email: student.user?.email ?? null,
      studentCode: student.studentCode,
      campus: student.campus,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      program: {
        code: student.pensum?.program?.code ?? null,
        name: student.pensum?.program?.name ?? null,
        mode: student.pensum?.program?.mode ?? null,
      },
      pensum: {
        code: student.pensum?.code ?? null,
        totalCredits: student.pensum?.totalCredits ?? null,
        periods: student.pensum?.periods ?? null,
      },
      institution: {
        name: student.pensum?.program?.faculty?.institution?.name ?? null,
        nit: student.pensum?.program?.faculty?.institution?.nit ?? null,
      },
    });
  } catch (err) {
    console.error("[M2M DB Error]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}