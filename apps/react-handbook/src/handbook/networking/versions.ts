// Simulated: loading 12 small files from one host, in round trips (RTT).
// Each file takes one round trip once its request can be sent.
// HTTP/1.1: up to 6 connections, each with its own TCP + TLS setup (2 RTT),
//           one request at a time per connection.
// HTTP/2:   one connection (2 RTT setup), every request at once; TCP delivers
//           in order, so a lost packet stalls every stream for 1 RTT.
// HTTP/3:   QUIC setup in 1 RTT, every request at once; a lost packet stalls
//           only the stream it belonged to.

export type Version = "http1" | "http2" | "http3";

export const FILE_COUNT = 12;
const LOST_FILE = 2; // the file whose packet is lost, when loss is on

export type FileBar = { file: number; connection: number; setup: [number, number] | null; start: number; end: number; stalled: boolean };

export function loadFiles(version: Version, loss: boolean) {
  const files: FileBar[] = [];
  if (version === "http1") {
    const connections = 6;
    const busyUntil = Array.from({ length: connections }, () => 2);
    for (let file = 0; file < FILE_COUNT; file++) {
      const connection = file % connections;
      const start = busyUntil[connection];
      const stalled = loss && file === LOST_FILE;
      const end = start + 1 + (stalled ? 1 : 0);
      busyUntil[connection] = end;
      files.push({ file, connection, setup: file < connections ? [0, 2] : null, start, end, stalled });
    }
  } else {
    const setup = version === "http2" ? 2 : 1;
    for (let file = 0; file < FILE_COUNT; file++) {
      const stalled = loss && (version === "http2" || file === LOST_FILE);
      files.push({ file, connection: 0, setup: file === 0 ? [0, setup] : null, start: setup, end: setup + 1 + (stalled ? 1 : 0), stalled });
    }
  }
  const ends = files.map((f) => f.end);
  return { files, connections: version === "http1" ? 6 : 1, firstDone: Math.min(...ends), allDone: Math.max(...ends) };
}
