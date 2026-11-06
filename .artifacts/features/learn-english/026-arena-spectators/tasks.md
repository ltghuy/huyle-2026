# Tasks: Arena spectators (026)

- [x] T001: Rules: spectators in the state, join/leave/disconnect/start/forfeit, `toPublic`, protocol schema and `MAX_SPECTATORS`; machine tests (AC-001–AC-003, AC-006, AC-008)
- [x] T002: Room and join route: load old rooms with `[]`, `RoomStatus.spectatorIds`, `joinRoom` rules, drop `started`; service and route tests (AC-001–AC-003) — depends on T001
- [x] T003: Screens: spectator lobby, duel, reveal, scoreboard, results, header count and banner; component tests (AC-004, AC-005, AC-007) — depends on T001
- [x] T004: Verify: typecheck, lint, unit tests, build; mark ACs
