import { z } from "zod";

export type ApiError = { error: { message: string; issues?: unknown } };

export function jsonError(message: string, status: number, issues?: unknown) {
  return Response.json(
    { error: { message, ...(issues ? { issues } : {}) } } satisfies ApiError,
    { status },
  );
}

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError("Invalid JSON body", 400) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      response: jsonError("Validation failed", 422, z.treeifyError(result.error)),
    };
  }
  return { data: result.data };
}
