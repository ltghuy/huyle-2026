import { z } from "zod";

import { jsonError, parseBody } from "@/lib/http";
import {
  networkQuerySchema,
  patchUserSchema,
} from "@/server/practices/data-fetching-hook/users.schema";
import {
  getUser,
  patchUser,
  simulateNetwork,
} from "@/server/practices/data-fetching-hook/users.store";

type Context = RouteContext<"/api/practices/data-fetching-hook/users/[id]">;

function networkParams(request: Request) {
  return networkQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
}

export async function GET(request: Request, ctx: Context) {
  const { id } = await ctx.params;
  const network = networkParams(request);
  if (!network.success) return jsonError("Validation failed", 422, z.treeifyError(network.error));

  const ok = await simulateNetwork(network.data.latencyMs, network.data.failRate);
  if (!ok) return jsonError("Simulated server failure", 500);
  const user = getUser(id);
  if (!user) return jsonError("User not found", 404);
  return Response.json({ data: user });
}

export async function PATCH(request: Request, ctx: Context) {
  const { id } = await ctx.params;
  const network = networkParams(request);
  if (!network.success) return jsonError("Validation failed", 422, z.treeifyError(network.error));
  const body = await parseBody(request, patchUserSchema);
  if ("response" in body) return body.response;

  const ok = await simulateNetwork(network.data.latencyMs, network.data.failRate);
  if (!ok) return jsonError("Simulated server failure", 500);
  const user = patchUser(id, body.data);
  if (!user) return jsonError("User not found", 404);
  return Response.json({ data: user });
}
