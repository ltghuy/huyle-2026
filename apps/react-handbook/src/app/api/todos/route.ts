import { parseBody } from "@/lib/http";
import { createTodoSchema } from "@/server/todos/todo.schema";
import { createTodo, listTodos } from "@/server/todos/todo.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ data: await listTodos() });
}

export async function POST(request: Request) {
  const parsed = await parseBody(request, createTodoSchema);
  if ("response" in parsed) return parsed.response;

  const todo = await createTodo(parsed.data);
  return Response.json({ data: todo }, { status: 201 });
}
