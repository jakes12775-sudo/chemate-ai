import { ZodError } from "zod";
import { NextResponse } from "next/server";

export function jsonOk<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export function jsonError(
  message: string,
  status = 400,
  issues?: ZodError["issues"] | unknown,
) {
  return NextResponse.json(
    {
      error: message,
      issues,
    },
    { status },
  );
}
