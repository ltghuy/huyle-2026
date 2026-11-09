"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CONTENT_KINDS, type ContentKind } from "@/content/schema";
import { LEVELS, type Level } from "@/learning/types";
import { fetchContent } from "@/lib/admin-client";
import { CONTENT_PAGE_SIZE } from "@/server/admin/admin.schema";
import { ContentEditor, KIND_LABELS, type EditorTarget } from "./content-editor";

// "Nội dung" (feature 038, AC-013): content items 50 a page, filtered by kind and level and
// searched by id or text. A row opens the editor; "Thêm mục" adds one.

const ALL = "all";
const KIND_FILTER = { [ALL]: "Mọi loại", ...KIND_LABELS };
const LEVEL_FILTER: Record<string, string> = { [ALL]: "Mọi trình độ", ...Object.fromEntries(LEVELS.map((level) => [level, level])) };
const edited = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export function ContentTab() {
  const [kind, setKind] = useState<ContentKind | typeof ALL>(ALL);
  const [level, setLevel] = useState<Level | typeof ALL>(ALL);
  const [typed, setTyped] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorTarget>(null);
  const query = { kind: kind === ALL ? undefined : kind, level: level === ALL ? undefined : level, q: q || undefined, page };
  const list = useQuery({ queryKey: ["admin", "content", "list", query], queryFn: () => fetchContent(query), placeholderData: keepPreviousData, retry: false });
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / CONTENT_PAGE_SIZE));

  function handleKindChange(value: unknown) {
    setKind(value as ContentKind | typeof ALL);
    setPage(1);
  }

  function handleLevelChange(value: unknown) {
    setLevel(value as Level | typeof ALL);
    setPage(1);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQ(typed.trim());
    setPage(1);
  }

  return (
    <section aria-label="Nội dung khóa học" className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="filter-kind">Loại</Label>
          <Select items={KIND_FILTER} value={kind} onValueChange={handleKindChange}>
            <SelectTrigger id="filter-kind" className="w-44 data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {[ALL, ...CONTENT_KINDS].map((value) => (
                <SelectItem key={value} value={value} className="min-h-10">
                  {KIND_FILTER[value as keyof typeof KIND_FILTER]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filter-level">Trình độ</Label>
          <Select items={LEVEL_FILTER} value={level} onValueChange={handleLevelChange}>
            <SelectTrigger id="filter-level" className="w-36 data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {[ALL, ...LEVELS].map((value) => (
                <SelectItem key={value} value={value} className="min-h-10">
                  {LEVEL_FILTER[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <form onSubmit={handleSearch} role="search" className="flex min-w-0 flex-1 items-end gap-2">
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Label htmlFor="filter-q">Tìm theo mã hoặc nội dung</Label>
            <Input id="filter-q" type="search" value={typed} onChange={(event) => setTyped(event.target.value)} className="h-11" placeholder="vd: word:cat, gia đình" />
          </div>
          <Button type="submit" variant="outline" size="icon-lg" className="size-11" aria-label="Tìm">
            <Search aria-hidden />
          </Button>
        </form>
        <Button className="h-11 gap-1.5" onClick={() => setEditor({ create: true })}>
          <Plus aria-hidden /> Thêm mục
        </Button>
      </div>

      {list.isPending ? (
        <p role="status" className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 aria-hidden className="size-4 animate-spin" /> Đang tải…
        </p>
      ) : list.error ? (
        <p role="alert" className="text-destructive">
          {list.error.message}
        </p>
      ) : list.data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-muted-foreground">Không có mục nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trình độ</TableHead>
                <TableHead>Chủ đề</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.items.map((item) => (
                <TableRow key={item.id} className={item.deleted ? "text-muted-foreground" : undefined}>
                  <TableCell>
                    <button type="button" className="font-mono text-sm text-link underline-offset-4 hover:underline" onClick={() => setEditor({ create: false, id: item.id })}>
                      {item.id}
                    </button>
                  </TableCell>
                  <TableCell>{KIND_LABELS[item.kind]}</TableCell>
                  <TableCell>{item.level}</TableCell>
                  <TableCell>{item.topic ?? "—"}</TableCell>
                  <TableCell className="flex flex-wrap gap-1">
                    {item.deleted ? <Badge variant="destructive">Đã xóa</Badge> : null}
                    {item.adminEditedAt ? (
                      <Badge variant="outline" title={`Sửa lúc ${edited.format(item.adminEditedAt)}`}>
                        Sửa ở đây, chưa kéo về
                      </Badge>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {list.data && list.data.total > CONTENT_PAGE_SIZE ? (
        <nav aria-label="Trang" className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon-lg" className="size-11" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">
            <ChevronLeft aria-hidden />
          </Button>
          <span className="text-sm tabular-nums">
            Trang {page} / {pages} · {list.data.total} mục
          </span>
          <Button variant="outline" size="icon-lg" className="size-11" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Trang sau">
            <ChevronRight aria-hidden />
          </Button>
        </nav>
      ) : null}

      <ContentEditor target={editor} onClose={() => setEditor(null)} />
    </section>
  );
}
