# 3D Models

## `placeholder-character.glb` — TEMPORARY hero character

A **placeholder** rigged humanoid standing in for the real "Huy" model until the
Meshy-generated likeness is available.

- **Source:** three.js `RobotExpressive` — **CC0** (public domain), by Tomás
  Laulhé, modified by Don McCurdy. Safe for public/commercial deployment.
- **Rig:** fully skinned (2 skins, 74 nodes).
- **Animation clips (14):** `Dance`, `Death`, `Idle`, `Jump`, `No`, `Punch`,
  `Running`, `Sitting`, `Standing`, `ThumbsUp`, `Walking`, `WalkJump`, `Wave`, `Yes`.
- **Used by the scene as:** `Sitting` (seated at desk / hero default) →
  `Standing` (scroll "sits→stands" transform) · `Idle` · `Walking` ·
  `Wave`/`ThumbsUp`/`Dance` (delight / easter-eggs).

### How to swap in the real "Huy" model (after Meshy upgrade)

1. Upgrade Meshy at https://www.meshy.ai/settings/subscription (free tier no
   longer allows task creation — 402).
2. Re-run the pipeline (script already in repo):
   ```bash
   set -a; . ./.env; set +a
   node scripts/meshy.mjs --mode image-to-3d \
     --image ".artifacts/features/001-3d-portfolio/inputs/character-image/evan.png" \
     --slug huy --output public/assets/models
   # then rig (uses the imageTaskId printed above):
   node scripts/meshy.mjs --mode rig --task-id <imageTaskId> --height 1.75 \
     --slug huy --output public/assets/models
   ```
3. Compress: `npx @gltf-transform/cli optimize public/assets/models/huy.glb public/assets/models/huy.glb --texture-size 1024` (Draco/meshopt).
4. Point `src/content/scene.ts` `character` at `/assets/models/huy.glb` and map
   its real clip names. Meshy rig clips differ from the placeholder's — log
   `clips.map(c => c.name)` and update the clip map.

> Note: Meshy assets expire remotely after ~3 days — download immediately.

## `bong.glb` — (pending)

Bông the tuxedo cat. Meshy auto-rig is **humanoid-only**, so the cat will be
image-to-3D'd (static) and animated procedurally, or sourced separately. Not yet generated.
