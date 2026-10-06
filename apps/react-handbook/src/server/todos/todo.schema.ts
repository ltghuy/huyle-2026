import { z } from "zod";

export const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};
