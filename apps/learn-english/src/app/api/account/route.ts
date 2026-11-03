import { jsonError } from "@/lib/http";
import { deleteAccount } from "@/server/account/account.service";
import { getAuth } from "@/server/auth/auth";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";

// Deleting the signed-in learner's account (feature 022, AC-023).

const UNAVAILABLE = "Chưa xóa được tài khoản. Bạn thử lại sau nhé.";

export async function DELETE(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    // Signing out first gives the headers that clear the session cookies, including the
    // 5-minute cookie cache, which would otherwise keep a deleted account signed in.
    const signedOut = await getAuth().api.signOut({ headers: request.headers, asResponse: true });
    await deleteAccount(getDb(), session.user.id);
    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const cookie of signedOut.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
    return new Response(null, { status: 204, headers });
  } catch (cause) {
    console.error("Account delete failed:", cause);
    return jsonError(UNAVAILABLE, 503);
  }
}
