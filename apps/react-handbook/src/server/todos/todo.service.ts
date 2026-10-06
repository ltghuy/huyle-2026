import "server-only";
import type { CreateTodoInput, Todo } from "./todo.schema";

// In-memory store for scaffolding only — replace with a real database.
const todos = new Map<string, Todo>();

export async function listTodos(): Promise<Todo[]> {
  return [...todos.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: input.title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.set(todo.id, todo);
  return todo;
}
