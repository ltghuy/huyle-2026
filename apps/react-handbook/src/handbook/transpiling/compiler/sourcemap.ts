// Source Map v3 (ECMA-426): `mappings` lists, line by line of the output, the
// segments that map an output column to a source line and column. Each number
// is relative to the previous one and written as base64 VLQ: 5 bits of value
// per character, plus a continuation bit, with the sign in the lowest bit.

export type Mapping = { genLine: number; genColumn: number; srcLine: number; srcColumn: number; name?: string };

export type SourceMap = { version: 3; file: string; sources: string[]; sourcesContent: string[]; names: string[]; mappings: string };

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function encodeVlq(value: number): string {
  let vlq = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = "";
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    out += BASE64[digit];
  } while (vlq > 0);
  return out;
}

export function decodeVlq(segment: string): number[] {
  const values: number[] = [];
  let value = 0;
  let shift = 0;
  for (const char of segment) {
    const digit = BASE64.indexOf(char);
    if (digit === -1) throw new Error(`Invalid base64 VLQ character "${char}"`);
    value += (digit & 31) << shift;
    if (digit & 32) shift += 5;
    else {
      values.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

/** Mappings sorted by output position → the `mappings` string, plus the names table. */
export function encodeMappings(mappings: Mapping[]): { mappings: string; names: string[] } {
  const names: string[] = [];
  const nameIndex = new Map<string, number>();
  const lines: string[] = [];
  let prevSrcLine = 0;
  let prevSrcColumn = 0;
  let prevName = 0;
  const sorted = [...mappings].sort((a, b) => a.genLine - b.genLine || a.genColumn - b.genColumn);
  let line = 0;
  let segments: string[] = [];
  let prevGenColumn = 0;
  for (const m of sorted) {
    while (line < m.genLine) {
      lines.push(segments.join(","));
      segments = [];
      prevGenColumn = 0;
      line++;
    }
    // Fields: output column, source index (always 0: one source), source line, source column, name index.
    let segment = encodeVlq(m.genColumn - prevGenColumn) + encodeVlq(0) + encodeVlq(m.srcLine - prevSrcLine) + encodeVlq(m.srcColumn - prevSrcColumn);
    prevGenColumn = m.genColumn;
    prevSrcLine = m.srcLine;
    prevSrcColumn = m.srcColumn;
    if (m.name !== undefined) {
      let index = nameIndex.get(m.name);
      if (index === undefined) {
        index = names.length;
        names.push(m.name);
        nameIndex.set(m.name, index);
      }
      segment += encodeVlq(index - prevName);
      prevName = index;
    }
    segments.push(segment);
  }
  lines.push(segments.join(","));
  return { mappings: lines.join(";"), names };
}

/** The inverse, as the developer tools do it: absolute positions per segment. */
export function decodeMappings(mappings: string, names: string[]): Mapping[] {
  const out: Mapping[] = [];
  let srcLine = 0;
  let srcColumn = 0;
  let nameIdx = 0;
  mappings.split(";").forEach((line, genLine) => {
    let genColumn = 0;
    for (const segment of line.split(",")) {
      if (!segment) continue;
      const v = decodeVlq(segment);
      genColumn += v[0];
      if (v.length < 4) continue;
      srcLine += v[2];
      srcColumn += v[3];
      const mapping: Mapping = { genLine, genColumn, srcLine, srcColumn };
      if (v.length >= 5) {
        nameIdx += v[4];
        mapping.name = names[nameIdx];
      }
      out.push(mapping);
    }
  });
  return out;
}
