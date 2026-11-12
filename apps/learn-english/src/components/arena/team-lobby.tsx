"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Crown, Play, Shuffle, UserMinus, Users, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startProblem } from "@/learning/arena/team-machine";
import type { PublicTeamRoom, Team } from "@/learning/arena/team-protocol";
import { cn } from "@/lib/utils";
import { InvitePanel } from "./invite-panel";
import { PublishRoom } from "./publish-room";
import { PlayerAvatar } from "./players";
import { TEAM_NAME, TEAM_TONE, TeamBadge, teamPlayer, type TeamPlayerView } from "./team-parts";
import type { TeamRoomHandle } from "./use-team-room";

type LiveTeamHandle = TeamRoomHandle & { room: PublicTeamRoom };

interface TeamLobbyProps {
  handle: LiveTeamHandle;
  me: string;
}

const OTHER: Record<Team, Team> = { A: "B", B: "A" };

/** The ids with the one at `index` swapped with its neighbour `step` away (-1 up, 1 down). */
function moved(ids: readonly string[], index: number, step: -1 | 1): string[] {
  const next = [...ids];
  const target = index + step;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

interface RowProps {
  player: TeamPlayerView;
  me: string;
  hostId: string;
  /** The team the player is on, or null when unplaced. */
  team: Team | null;
  /** 1-based turn order inside the team. */
  position?: number;
  /** Members of the team, for the up and down buttons. */
  count?: number;
  /** Host controls; absent for everyone else. */
  controls?: { onAssign: (userId: string, team: Team | null) => void; onMove: (userId: string, step: -1 | 1) => void };
}

/** One player in a list: avatar, name, turn number, offline mark, and the host's buttons (AC-008–AC-010). */
function PlayerLine({ player, me, hostId, team, position, count = 0, controls }: RowProps) {
  const you = player.id === me;
  const name = player.name;
  return (
    <li className={cn("grid gap-2 rounded-xl border bg-card px-3 py-2", team ? TEAM_TONE[team].border : "")}>
      <div className="flex min-h-11 items-center gap-3">
        {position ? (
          <span className="w-5 shrink-0 text-center font-bold tabular-nums">
            <span aria-hidden>{position}</span>
            <span className="sr-only">Lượt thứ {position}:</span>
          </span>
        ) : null}
        <PlayerAvatar player={player} you={team !== "B"} className={cn("size-9", team === null && "ring-border")} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {name}
            {you ? <span className="font-normal text-muted-foreground"> (bạn)</span> : null}
          </p>
          {player.id === hostId ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Crown aria-hidden className="size-3" /> Chủ phòng
            </p>
          ) : null}
        </div>
        {!player.connected ? (
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <WifiOff aria-hidden className="size-4" /> Mất kết nối
          </span>
        ) : null}
      </div>
      {controls ? (
        <div className="flex flex-wrap gap-1.5">
          {team === null ? (
            <>
              <Button variant="outline" className="h-11 gap-1.5" aria-label={`Đưa ${name} vào Đội A`} onClick={() => controls.onAssign(player.id, "A")}>
                <TeamBadge team="A" className="size-5" /> Đội A
              </Button>
              <Button variant="outline" className="h-11 gap-1.5" aria-label={`Đưa ${name} vào Đội B`} onClick={() => controls.onAssign(player.id, "B")}>
                <TeamBadge team="B" className="size-5" /> Đội B
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="icon" className="size-11" aria-label={`Đưa ${name} lên`} disabled={position === 1} onClick={() => controls.onMove(player.id, -1)}>
                <ArrowUp aria-hidden />
              </Button>
              <Button variant="outline" size="icon" className="size-11" aria-label={`Đưa ${name} xuống`} disabled={position === count} onClick={() => controls.onMove(player.id, 1)}>
                <ArrowDown aria-hidden />
              </Button>
              <Button variant="outline" className="h-11 gap-1.5" aria-label={`Chuyển ${name} sang ${TEAM_NAME[OTHER[team]]}`} onClick={() => controls.onAssign(player.id, OTHER[team])}>
                <TeamBadge team={OTHER[team]} className="size-5" /> {TEAM_NAME[OTHER[team]]}
              </Button>
              <Button variant="ghost" className="h-11 gap-1.5" aria-label={`Bỏ ${name} khỏi đội`} onClick={() => controls.onAssign(player.id, null)}>
                <UserMinus aria-hidden /> Bỏ khỏi đội
              </Button>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

interface ListProps {
  id: string;
  title: ReactNode;
  empty: string;
  children: ReactNode[];
}

function PlayerList({ id, title, empty, children }: ListProps) {
  return (
    <section aria-labelledby={id} className="grid content-start gap-2">
      <h2 id={id} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      {children.length > 0 ? (
        <ul className="grid gap-2">{children}</ul>
      ) : (
        <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

/** The team room's waiting room (AC-003, AC-004, AC-007–AC-016): the code, who's here, and the host's teams. */
export function TeamLobby({ handle, me }: TeamLobbyProps) {
  const { room } = handle;
  const isHost = room.hostId === me;
  const placed = new Set([...room.teams.A.members, ...room.teams.B.members]);
  const unplaced = room.players.filter((p) => !placed.has(p.id));
  const problem = startProblem({ players: room.players, teams: { A: room.teams.A.members, B: room.teams.B.members } });

  function handleMove(userId: string, step: -1 | 1) {
    const team: Team = room.teams.A.members.includes(userId) ? "A" : "B";
    const ids = room.teams[team].members;
    const index = ids.indexOf(userId);
    if (index < 0 || index + step < 0 || index + step >= ids.length) return;
    handle.order(team, moved(ids, index, step));
  }

  const controls = isHost ? { onAssign: handle.assign, onMove: handleMove } : undefined;

  function teamLines(team: Team) {
    const ids = room.teams[team].members;
    return ids.flatMap((id, i) => {
      const player = teamPlayer(room, id);
      if (!player) return [];
      return [<PlayerLine key={id} player={player} me={me} hostId={room.hostId} team={team} position={i + 1} count={ids.length} controls={controls} />];
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <InvitePanel code={room.code} />

      <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground tabular-nums">
        <Users aria-hidden className="size-4" />
        {room.players.length}/{room.settings.size} người
      </p>

      <PublishRoom isPublic={room.public} isHost={isHost} freeSeat={room.phase === "lobby" && room.players.length < room.settings.size} onPublish={handle.publish} />

      {isHost ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Xếp mỗi người vào một đội. Hai đội có thể chênh người.</p>
          <Button variant="outline" className="h-11 gap-2" onClick={handle.shuffle} disabled={room.players.length < 2}>
            <Shuffle aria-hidden /> Chia ngẫu nhiên
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <PlayerList id="team-unplaced" title="Chưa xếp đội" empty="Mọi người đã có đội.">
          {unplaced.map((player) => (
            <PlayerLine key={player.id} player={player} me={me} hostId={room.hostId} team={null} controls={controls} />
          ))}
        </PlayerList>
        {(["A", "B"] as const).map((team) => (
          <PlayerList
            key={team}
            id={`team-${team}`}
            title={
              <>
                <span aria-hidden>
                  <TeamBadge team={team} />
                </span>{" "}
                <span className={TEAM_TONE[team].text}>{TEAM_NAME[team]}</span>
              </>
            }
            empty="Chưa có ai."
          >
            {teamLines(team)}
          </PlayerList>
        ))}
      </div>

      {isHost ? (
        <section aria-label="Bắt đầu" className="grid gap-2">
          <Button size="lg" onClick={handle.start} disabled={problem !== null} aria-describedby={problem ? "team-start-problem" : undefined} className="h-14 w-full gap-2 text-lg">
            <Play aria-hidden /> Bắt đầu
          </Button>
          {problem ? (
            <p id="team-start-problem" className="text-center text-sm text-muted-foreground">
              {problem}
            </p>
          ) : null}
        </section>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Chờ chủ phòng bắt đầu…</p>
      )}
    </div>
  );
}
