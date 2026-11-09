// A learner's link (feature 035): one Durable Object per user id holding a
// socket for each signed-in tab, so a friend's challenge reaches every tab at
// once. It stores nothing: each tab reports the room page it has open in the
// socket's attachment, which is all `deliver` needs to tell "busy" from "sent",
// and every challenge frame carries the host's id and the room code.
//
// No `import "server-only"`: wrangler bundles this module into the custom
// worker, where that package's default export throws (knowledge.md, 023).
import { DurableObject } from "cloudflare:workers";
import type { ArenaSettings } from "@/learning/arena/protocol";
import { parseLinkClientFrame, type ChallengeFrom, type DeliveryState, type LinkFrame } from "@/learning/arena/link";
import { ARENA_PROTOCOL, PLAYER_HEADER } from "./socket-route";

interface Attachment {
  userId: string;
  /** The room page this tab has open. */
  room: string | null;
}

export interface Challenge {
  from: ChallengeFrom;
  code: string;
  settings: ArenaSettings;
}

export class LearnerLink extends DurableObject<CloudflareEnv> {
  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    const userId = userFrom(request);
    if (!userId) return new Response("Unauthorized", { status: 401 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.accept(server, userId);
    return new Response(null, { status: 101, webSocket: client, headers: { "Sec-WebSocket-Protocol": ARENA_PROTOCOL } });
  }

  accept(socket: WebSocket, userId: string): void {
    this.ctx.acceptWebSocket(socket);
    socket.serializeAttachment({ userId, room: null } satisfies Attachment);
  }

  /** RPC from the challenge route: shows `challenge` in every tab, unless the learner can't take it. */
  deliver(challenge: Challenge): DeliveryState {
    const sockets = this.open();
    if (sockets.length === 0) return "offline";
    const rooms = sockets.map((socket) => attachmentOf(socket)?.room ?? null);
    if (rooms.includes(challenge.code)) return "here";
    if (rooms.some((room) => room !== null)) return "busy";
    this.sendAll({ type: "challenge", ...challenge });
    return "sent";
  }

  /** RPC from the cancel route: the host withdrew, so the toast closes. */
  cancel(hostId: string, code: string): void {
    this.sendAll({ type: "challenge-closed", hostId, code });
  }

  /** RPC from the friend's link: their answer, for the host's waiting room. */
  reply(friendId: string, code: string, accept: boolean): void {
    this.sendAll({ type: "reply", friendId, code, accept });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = attachmentOf(socket);
    if (!attachment) return;
    const frame = parseLinkClientFrame(typeof message === "string" ? message : new TextDecoder().decode(message));
    if (!frame) return;
    if (frame.type === "room") {
      socket.serializeAttachment({ ...attachment, room: frame.code } satisfies Attachment);
      return;
    }
    // One answer counts in every tab (AC-011).
    for (const other of this.open()) if (other !== socket) send(other, { type: "challenge-closed", hostId: frame.hostId, code: frame.code });
    try {
      await this.env.LEARNER_LINK.getByName(frame.hostId).reply(attachment.userId, frame.code, frame.accept);
    } catch (error) {
      // The host's page runs out its own timer and says there was no answer.
      console.error("Challenge reply not delivered:", error);
    }
  }

  private open(): WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => socket.readyState === WebSocket.OPEN);
  }

  private sendAll(frame: LinkFrame): void {
    for (const socket of this.open()) send(socket, frame);
  }
}

function userFrom(request: Request): string | null {
  try {
    const value = JSON.parse(request.headers.get(PLAYER_HEADER) ?? "null") as { id?: unknown } | null;
    return typeof value?.id === "string" ? value.id : null;
  } catch {
    return null;
  }
}

function attachmentOf(socket: WebSocket): Attachment | null {
  return socket.deserializeAttachment() as Attachment | null;
}

function send(socket: WebSocket, frame: LinkFrame): void {
  try {
    socket.send(JSON.stringify(frame));
  } catch {
    // Closing as we send: nothing to do.
  }
}
