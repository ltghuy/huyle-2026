"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Crown, LogIn, RefreshCw, Swords, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";
import { LEVELS, type Level } from "@/learning/types";
import { ArenaError, fetchCommunity, joinRoom } from "@/lib/arena-client";
import { parseLevel, updateSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import type { CommunityRoom } from "@/server/arena/arena.schema";
import { DUEL_PATH, TEAM_PATH } from "./arena-hub";
import { roomPath } from "./join-room";
import { PlayerAvatar } from "./players";
import { settingsLine } from "./settings-fields";
import { teamSettingsLine } from "./team-settings-fields";

const ALL = "all";
type Kind = CommunityRoom["kind"];

const KINDS: { value: Kind | typeof ALL; label: string }[] = [
  { value: ALL, label: "Tất cả" },
  { value: "duel", label: "Đấu 1-1" },
  { value: "team", label: "Đấu đội" },
];

const LEVEL_ITEMS = [{ value: ALL, label: "Tất cả trình độ" }, ...LEVELS.map((level) => ({ value: level, label: `Trình độ ${level}` }))];

const KIND_STYLE: Record<Kind, { label: string; icon: typeof Swords; className: string }> = {
  duel: { label: "Đấu 1-1", icon: Swords, className: "bg-primary/15 text-primary" },
  team: { label: "Đấu đội", icon: Users, className: "bg-arena-rival/15 text-arena-rival" },
};

const JOIN_FAILED = "Không vào được phòng. Bạn thử lại nhé.";
/** The page has its own gutter: the shared states line up with the filters and rows (quick 071). */
const FLUSH = "mx-0 md:mx-0";
const FLUSH_PAD = "px-0 md:px-0";

function parseKind(value: string | null): Kind | null {
  return value === "duel" || value === "team" ? value : null;
}

function roomLine(room: CommunityRoom): string {
  return room.kind === "team" ? teamSettingsLine(room.settings) : settingsLine(room.settings);
}

/**
 * "Cộng đồng" (feature 041, AC-007 to AC-013): the public lobbies with a free seat, filtered by kind
 * and level (in the URL; the level starts at the learner's), loaded on open and on "Làm mới" only.
 * A row joins like a typed code, asking for a seat, never a spectator's place.
 */
export function CommunityList() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useProfile();
  const { account } = useAccount();
  const kind = parseKind(params.get("kind"));
  const levelParam = params.get("level");
  // `?level=all` shows every level; no `level` starts at the learner's (AC-008).
  const level: Level | typeof ALL | null =
    levelParam === ALL ? ALL : (parseLevel(levelParam) ?? (profile.status === "ready" ? profile.data.level : profile.status === "error" ? ALL : null));
  const query = { kind: kind ?? undefined, level: level && level !== ALL ? level : undefined };

  const community = useQuery({
    queryKey: ["arena-community", query.kind ?? ALL, query.level ?? ALL],
    queryFn: () => fetchCommunity(query),
    enabled: level !== null,
    // Only the learner refreshes the list (AC-009): no refetch on focus, reconnect or a timer.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const [joining, setJoining] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleKindChange(value: string[]) {
    // A toggle group lets the pressed item be un-pressed; keep one selected.
    if (value[0]) updateSearchParams({ kind: value[0] === ALL ? null : value[0] });
  }

  function handleLevelChange(value: string | null) {
    if (value) updateSearchParams({ level: value });
  }

  function handleClearFilters() {
    updateSearchParams({ kind: null, level: ALL });
  }

  function handleRefresh() {
    setNotice(null);
    void community.refetch();
  }

  async function handleJoin(room: CommunityRoom) {
    if (joining) return;
    setJoining(room.code);
    setNotice(null);
    try {
      await joinRoom(room.code, undefined, { seatOnly: true });
      router.push(roomPath(room.code));
    } catch (cause) {
      // Filled, started or closed since the list loaded (AC-011): say so and load the list again.
      setNotice(`Phòng của ${room.host.name}: ${cause instanceof ArenaError ? cause.message : JOIN_FAILED}`);
      setJoining(null);
      void community.refetch();
    }
  }

  const filtered = kind !== null || level !== ALL;
  const rooms = community.data?.rooms ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ToggleGroup aria-label="Loại trận" variant="outline" spacing={0} value={[kind ?? ALL]} onValueChange={handleKindChange} className="w-full sm:w-auto">
          {KINDS.map(({ value, label }) => (
            <ToggleGroupItem key={value} value={value} className="h-11 flex-1 px-4 aria-pressed:bg-primary/10 aria-pressed:text-foreground sm:flex-none">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex gap-3 sm:contents">
          <Select value={level ?? ALL} onValueChange={handleLevelChange} items={LEVEL_ITEMS}>
            <SelectTrigger aria-label="Lọc theo trình độ" className="w-full data-[size=default]:h-11 sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="p-1">
              {LEVEL_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value} className="min-h-10">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-11 shrink-0 gap-2 sm:ml-auto" onClick={handleRefresh} disabled={community.isFetching || level === null}>
            <RefreshCw aria-hidden className={cn(community.isFetching && "animate-spin motion-reduce:animate-none")} />
            Làm mới
          </Button>
        </div>
      </div>

      {notice ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {notice}
        </p>
      ) : null}

      {level === null || (community.isPending && community.isFetching) ? (
        <ListSkeleton rows={4} className={FLUSH_PAD} />
      ) : community.isError ? (
        <ContentError onRetry={handleRefresh} className={FLUSH} />
      ) : rooms.length === 0 ? (
        <EmptyState mood="think" title={filtered ? "Không có phòng nào khớp bộ lọc" : "Chưa có phòng nào đang chờ"} className={FLUSH}>
          <p className="text-sm text-muted-foreground">Tạo một phòng rồi công khai lên Cộng đồng, người khác sẽ thấy và vào đấu với bạn.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={DUEL_PATH} className={buttonVariants({ className: "h-11 gap-2" })}>
              <Swords aria-hidden /> Tạo phòng 1-1
            </Link>
            <Link href={TEAM_PATH} className={buttonVariants({ variant: "outline", className: "h-11 gap-2" })}>
              <Users aria-hidden /> Tạo phòng đội
            </Link>
            {filtered ? (
              <Button variant="ghost" className="h-11" onClick={handleClearFilters}>
                Bỏ lọc
              </Button>
            ) : null}
          </div>
        </EmptyState>
      ) : (
        <ul aria-label="Phòng đang chờ" className="grid gap-3">
          {rooms.map((room) => (
            <CommunityRow key={room.code} room={room} own={room.host.id === account?.userId} joining={joining === room.code} disabled={joining !== null} onJoin={handleJoin} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface CommunityRowProps {
  room: CommunityRoom;
  own: boolean;
  joining: boolean;
  disabled: boolean;
  onJoin: (room: CommunityRoom) => void;
}

function CommunityRow({ room, own, joining, disabled, onJoin }: CommunityRowProps) {
  const kind = KIND_STYLE[room.kind];
  const titleId = `community-${room.code}`;
  return (
    <li aria-labelledby={titleId} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PlayerAvatar player={room.host} you={own} className="size-11 shrink-0" />
        <div className="grid min-w-0 gap-1">
          <p id={titleId} className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
            <span className="truncate">{room.host.name}</span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", kind.className)}>
              <kind.icon aria-hidden className="size-3" /> {kind.label}
            </span>
            {own ? (
              <Badge variant="secondary" className="gap-1">
                <Crown aria-hidden className="size-3" /> Phòng của bạn
              </Badge>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">{roomLine(room)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums" aria-label={`${room.taken} trên ${room.seats} chỗ đã có người`}>
          <Users aria-hidden className="size-4" />
          {room.taken}/{room.seats}
        </span>
        <Button className="h-11 gap-2" onClick={() => onJoin(room)} disabled={disabled} aria-label={`${own ? "Quay lại phòng" : "Vào phòng"} của ${room.host.name}`}>
          <LogIn aria-hidden />
          {joining ? "Đang vào…" : own ? "Quay lại phòng" : "Vào phòng"}
        </Button>
      </div>
    </li>
  );
}
