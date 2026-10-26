// A small Server-Sent Events parser. Bytes arrive in arbitrary chunks, so a
// line, or even a multi-byte character, can be split between two reads.

export type SseEvent = { event: string; id: string | null; data: string };

export function createSseParser(onEvent: (event: SseEvent) => void) {
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let id: string | null = null;
  let data: string[] = [];

  function dispatch() {
    if (data.length > 0) onEvent({ event: event || "message", id, data: data.join("\n") });
    event = "";
    id = null;
    data = [];
  }

  function line(text: string) {
    if (text === "") return dispatch();
    if (text.startsWith(":")) return; // comment, e.g. keep-alive ping
    const colon = text.indexOf(":");
    const field = colon === -1 ? text : text.slice(0, colon);
    let value = colon === -1 ? "" : text.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    else if (field === "id") id = value;
  }

  return {
    push(chunk: Uint8Array) {
      buffer += decoder.decode(chunk, { stream: true });
      // Lines end with \n, \r\n or \r. A trailing \r may be the first half of \r\n.
      const lines = buffer.split(/\r\n|\n|\r(?!$)/);
      buffer = lines.pop() ?? "";
      for (const text of lines) line(text);
    },
  };
}
