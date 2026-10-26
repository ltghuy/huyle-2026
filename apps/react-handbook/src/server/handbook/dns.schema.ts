import { z } from "zod";

export const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"] as const;
export type DnsType = (typeof DNS_TYPES)[number];

export const dnsParamsSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\.?$/, "Not a valid host name"),
  type: z.enum(DNS_TYPES).default("A"),
});

export type DnsRecord = { value: string; ttl?: number };
export type DnsResult = { name: string; type: DnsType; records: DnsRecord[]; ms: number; reason?: "no-data" };
