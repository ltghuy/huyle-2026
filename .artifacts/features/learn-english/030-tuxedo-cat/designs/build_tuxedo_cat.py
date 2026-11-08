"""Build a stylized tuxedo-cat graduate mascot as a .glb (glTF 2.0, Y-up, facing +Z, ~1 unit tall).

Usage:  python build_tuxedo_cat.py [out.glb]
Requires: trimesh, numpy, pillow
"""
import sys
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------- palette
def hexc(h, a=255):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)] + [a]

FUR, FUR2, WHITE = hexc('2F2C3A'), hexc('3E3A4C'), hexc('FAF8FF')
PINK, NOSE = hexc('F4A6B8'), hexc('F29AB0')
IRIS, PUPIL = hexc('D2DC3C'), hexc('15131B')
CAP, BAND, GOLD = hexc('4A4370'), hexc('7B58D6'), hexc('FFC845')
ORANGE, ORANGE_D, PAGE = hexc('FF8A3D'), hexc('E06A25'), hexc('FFF3E8')
PAD = hexc('F1EDF7')

def srgb_to_linear(c):
    v = np.array(c[:3]) / 255.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    return [float(x) for x in lin] + [c[3] / 255.0]

def mat(c, rough=0.75, name=None):
    return PBRMaterial(name=name, baseColorFactor=srgb_to_linear(c), metallicFactor=0.0, roughnessFactor=rough)

# Front-view SVG pixel space (1024 canvas) -> model units. Ground at y_px=970, 800px = 1 unit.
def px(xp, yp):
    return (xp - 512) / 800.0, (970 - yp) / 800.0

# ---------------------------------------------------------------- helpers
def ellipsoid(center, radii, sub=4):
    m = trimesh.creation.icosphere(subdivisions=sub)
    m.apply_scale(radii)
    m.apply_translation(center)
    return m

def colored(mesh, color, rough=0.75):
    mesh.visual = TextureVisuals(material=mat(color, rough))
    return mesh

def capsule_between(a, b, r, sections=24):
    a, b = np.asarray(a, float), np.asarray(b, float)
    v = b - a
    L = np.linalg.norm(v)
    m = trimesh.creation.capsule(height=L, radius=r, count=[sections, sections])
    # capsule is along Z, centered at origin
    m.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], v / L))
    m.apply_translation((a + b) / 2)
    return m

def tube(points, radii, sections=20):
    """Sweep a circle along a polyline (Catmull-Rom resampled)."""
    P = np.asarray(points, float)
    # Catmull-Rom
    pts = []
    Pp = np.vstack([P[0], P, P[-1]])
    for i in range(1, len(Pp) - 2):
        p0, p1, p2, p3 = Pp[i - 1:i + 3]
        for t in np.linspace(0, 1, 12, endpoint=False):
            t2, t3 = t * t, t * t * t
            pts.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    pts.append(P[-1])
    pts = np.array(pts)
    n = len(pts)
    rr = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(radii)), radii)
    verts, faces = [], []
    prev_normal = None
    for i in range(n):
        T = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        T /= np.linalg.norm(T)
        if prev_normal is None:
            ref = np.array([0, 0, 1.0]) if abs(T[2]) < 0.9 else np.array([1.0, 0, 0])
            N = np.cross(T, ref)
        else:
            N = prev_normal - T * np.dot(prev_normal, T)
        N /= np.linalg.norm(N)
        prev_normal = N
        B = np.cross(T, N)
        for k in range(sections):
            a = 2 * np.pi * k / sections
            verts.append(pts[i] + rr[i] * (np.cos(a) * N + np.sin(a) * B))
    for i in range(n - 1):
        for k in range(sections):
            a, b = i * sections + k, i * sections + (k + 1) % sections
            c, d = a + sections, b + sections
            faces += [[a, b, d], [a, d, c]]
    m = trimesh.Trimesh(np.array(verts), np.array(faces), process=True)
    caps = [ellipsoid(pts[0], [rr[0]] * 3, 2), ellipsoid(pts[-1], [rr[-1]] * 3, 2)]
    return trimesh.util.concatenate([m] + caps)

def sample_svg_path(d, steps=24):
    """Polygon from an absolute M/C/L/Q/Z SVG path (pixel space)."""
    toks = d.replace(',', ' ').replace('M', ' M ').replace('C', ' C ').replace('L', ' L ') \
            .replace('Q', ' Q ').replace('Z', ' Z ').split()
    pts, i, cur, cmd = [], 0, None, None
    while i < len(toks):
        t = toks[i]
        if t in 'MCLQZ':
            cmd = t; i += 1
            if cmd == 'Z':
                continue
        nums = lambda k: [float(x) for x in toks[i:i + k]]
        if cmd == 'M':
            cur = np.array(nums(2)); pts.append(cur); i += 2
        elif cmd == 'L':
            cur = np.array(nums(2)); pts.append(cur); i += 2
        elif cmd == 'C':
            c = np.array(nums(6)).reshape(3, 2); p0 = cur
            for s in np.linspace(0, 1, steps)[1:]:
                pts.append((1 - s) ** 3 * p0 + 3 * (1 - s) ** 2 * s * c[0] + 3 * (1 - s) * s * s * c[1] + s ** 3 * c[2])
            cur = c[2]; i += 6
        elif cmd == 'Q':
            c = np.array(nums(4)).reshape(2, 2); p0 = cur
            for s in np.linspace(0, 1, steps)[1:]:
                pts.append((1 - s) ** 2 * p0 + 2 * (1 - s) * s * c[0] + s * s * c[1])
            cur = c[1]; i += 4
        else:
            i += 1
    return np.array(pts)

def inside(poly, xy):
    from matplotlib.path import Path
    return Path(poly).contains_points(xy)

def paint_front(mesh, base, mark, poly_px, min_nz=0.15):
    """Split mesh into (base, mark) parts: faces whose front projection falls inside poly_px get `mark`."""
    v, n = mesh.vertices, mesh.vertex_normals
    xy_px = np.c_[v[:, 0] * 800 + 512, 970 - v[:, 1] * 800]
    hit = inside(poly_px, xy_px) & (n[:, 2] > min_nz)
    fhit = hit[mesh.faces].sum(axis=1) >= 2
    a = colored(mesh.submesh([np.where(~fhit)[0]], append=True), base)
    b = colored(mesh.submesh([np.where(fhit)[0]], append=True), mark)
    return a, b

def on_ellipsoid(c, r, x, y, inset=0.0):
    """Front surface point + normal of ellipsoid at given x,y."""
    c, r = np.asarray(c), np.asarray(r)
    u = (x - c[0]) / r[0]; w = (y - c[1]) / r[1]
    z = c[2] + r[2] * np.sqrt(max(1 - u * u - w * w, 0.0))
    p = np.array([x, y, z])
    nrm = (p - c) / (r ** 2); nrm /= np.linalg.norm(nrm)
    return p - nrm * inset, nrm

def disc_on(p, nrm, radii, thick, color, rot=0.0, rough=0.4):
    m = ellipsoid([0, 0, 0], [radii[0], radii[1], thick], 3)
    m.apply_transform(trimesh.transformations.rotation_matrix(rot, [0, 0, 1]))
    m.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], nrm))
    m.apply_translation(p)
    return colored(m, color, rough)

# ---------------------------------------------------------------- build
scene = trimesh.Scene()
def add(name, mesh):
    scene.add_geometry(mesh, node_name=name, geom_name=name)

# Body + white bib
BODY_C, BODY_R = [0, 0.28, 0], [0.27, 0.27, 0.23]
body = ellipsoid(BODY_C, BODY_R, 6)
bib = sample_svg_path("M512 560 C600 600 640 700 622 800 C604 900 560 945 512 945 C464 945 420 900 402 800 C384 700 424 600 512 560Z")
fur, white = paint_front(body, FUR, WHITE, bib, 0.1)
add('Body', fur); add('Body_Bib', white)

# Head with cheek fluff + blaze/muzzle
HEAD_C, HEAD_R = np.array([0, 0.615, 0.03]), np.array([0.29, 0.24, 0.25])
head = ellipsoid([0, 0, 0], HEAD_R, 6)
v = head.vertices
cheek = np.exp(-((v[:, 1] + 0.06) / 0.07) ** 2)        # widen lower cheeks
v[:, 0] *= 1 + 0.10 * cheek
v[:, 2] *= 1 - 0.08 * np.clip(v[:, 1] / HEAD_R[1], 0, 1)  # slightly flatter forehead
head.vertices = v + HEAD_C
blaze = sample_svg_path("M512 340 C505 380 500 420 488 455 C470 500 420 522 402 562 C390 604 432 662 512 680 C592 662 634 604 622 562 C604 522 554 500 536 455 C524 420 519 380 512 340Z")
fur, white = paint_front(head, FUR, WHITE, blaze, 0.05)
add('Head', fur); add('Head_Blaze', white)

# Ears (flattened cones) with pink inner
for side, s in (('L', -1), ('R', 1)):
    base = np.array([s * 0.18, 0.77, 0.02]); tip = np.array([s * 0.335, 1.0, -0.01])
    axis = tip - base; h = np.linalg.norm(axis)
    for nm, rad, hh, zoff, col in (('Ear_' + side, 0.105, h, 0.0, FUR),
                                   ('EarInner_' + side, 0.07, h * 0.78, 0.022, PINK)):
        c = trimesh.creation.cone(radius=rad, height=hh, sections=32)
        c.apply_scale([1, 0.42, 1])                      # flatten (cone axis = +Z; Y is thickness)
        R = trimesh.geometry.align_vectors([0, 0, 1], axis / h)
        c.apply_transform(R)
        c.apply_translation(base + np.array([0, 0, zoff]) + (axis / h) * (0.0 if col is FUR else 0.03))
        add(nm, colored(c, col))

# Eyes (almond iris + pupil + highlights), muzzle, nose, whiskers
for side, s in (('L', -1), ('R', 1)):
    x, y = px(512 + s * 84, 468)
    p, n = on_ellipsoid(HEAD_C, HEAD_R, x, y, inset=0.004)
    add('Iris_' + side, disc_on(p, n, [0.066, 0.05], 0.014, IRIS, rot=s * -0.07, rough=0.3))
    add('Pupil_' + side, disc_on(p + n * 0.008, n, [0.024, 0.038], 0.01, PUPIL, rough=0.2))
    add('EyeShine_' + side, disc_on(p + n * 0.016 + np.array([0.016, 0.02, 0]), n, [0.011, 0.011], 0.005, WHITE, rough=0.1))
    x, y = px(512 + s * 22, 588)
    p, n = on_ellipsoid(HEAD_C, HEAD_R, x, y, inset=0.022)
    pad = ellipsoid(p, [0.042, 0.03, 0.035], 3)
    add('MuzzlePad_' + side, colored(pad, PAD))
    # whiskers
    wh = []
    for k in range(3):
        a = p + np.array([s * 0.03, 0.006 - k * 0.012, 0.01])
        b = a + np.array([s * 0.2, 0.025 - k * 0.03, -0.05])
        wh.append(capsule_between(a, b, 0.0022, 8))
    add('Whiskers_' + side, colored(trimesh.util.concatenate(wh), WHITE, 0.5))

x, y = px(512, 548)
p, n = on_ellipsoid(HEAD_C, HEAD_R, x, y, inset=-0.012)
nose = trimesh.creation.cone(radius=0.028, height=0.03, sections=3)
nose.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))      # point down
nose.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 6, [0, 1, 0]))
nose.apply_scale([1, 1, 0.6]); nose.apply_translation(p + [0, 0.012, 0.0])
add('Nose', colored(nose, NOSE, 0.4))

# Arms reaching forward to hold the book, white paws
for side, s in (('L', -1), ('R', 1)):
    sh = np.array([s * 0.17, 0.36, 0.11]); paw = np.array([s * 0.155, 0.18, 0.27])
    add('Arm_' + side, colored(capsule_between(sh, paw, 0.075), FUR2))
    add('Paw_' + side, colored(ellipsoid(paw + [s * 0.005, 0, 0.065], [0.06, 0.055, 0.05], 3), WHITE))

# Feet
for side, s in (('L', -1), ('R', 1)):
    add('Foot_' + side, colored(ellipsoid([s * 0.095, 0.03, 0.15], [0.065, 0.032, 0.085], 3), WHITE))

# Tail
tail_pts = [[0.08, 0.06, -0.18], [0.26, 0.07, -0.16], [0.36, 0.18, -0.10], [0.36, 0.32, -0.05], [0.29, 0.42, -0.02]]
add('Tail', colored(tube(tail_pts, [0.046, 0.044, 0.04, 0.036]), FUR))

# Book: cover box, spine, page block, textured front cover
BW, BH, BD = 0.31, 0.245, 0.06
bc = np.array([0.008, 0.17, 0.275])
cover = trimesh.creation.box([BW, BH, BD]); cover.apply_translation(bc)
add('Book_Cover', colored(cover, ORANGE, 0.6))
spine = trimesh.creation.box([0.035, BH + 0.004, BD + 0.004]); spine.apply_translation(bc + [-BW / 2 + 0.016, 0, 0])
add('Book_Spine', colored(spine, ORANGE_D, 0.6))
pages = trimesh.creation.box([0.012, BH - 0.03, BD - 0.012]); pages.apply_translation(bc + [BW / 2 + 0.002, 0, 0])
add('Book_Pages', colored(pages, PAGE, 0.9))

def label_texture(path_out=None):
    W, H = 1024, 810
    img = Image.new('RGBA', (W, H), tuple(ORANGE))
    d = ImageDraw.Draw(img)
    try:
        f1 = ImageFont.truetype('DejaVuSans-Bold.ttf', 112); f2 = ImageFont.truetype('DejaVuSans-Bold.ttf', 165)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    d.rectangle([0, 0, 110, H], fill=tuple(ORANGE_D))
    for txt, f, y in (('ENGLISH', f1, 340), ('A·B·C', f2, 560)):
        w = d.textlength(txt, font=f)
        d.text(((W + 110 - w) / 2, y), txt, font=f, fill=(255, 246, 238, 255), anchor='ls')
    return img

quad = trimesh.Trimesh(vertices=[[-BW / 2, -BH / 2, 0], [BW / 2, -BH / 2, 0], [BW / 2, BH / 2, 0], [-BW / 2, BH / 2, 0]],
                       faces=[[0, 1, 2], [0, 2, 3]], process=False)
quad.visual = TextureVisuals(uv=[[0, 0], [1, 0], [1, 1], [0, 1]],
                             material=PBRMaterial(baseColorTexture=label_texture(), metallicFactor=0.0, roughnessFactor=0.6))
quad.apply_translation(bc + [0, 0, BD / 2 + 0.0015])
add('Book_Label', quad)

# Graduation cap: skull band, mortarboard (diamond from front), button, tassel
band = trimesh.creation.cylinder(radius=0.135, height=0.085, sections=48)
band.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
band.apply_translation([0, 0.85, 0.0])
add('Cap_Band', colored(band, BAND, 0.7))
board = trimesh.creation.box([0.32, 0.018, 0.32])
board.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 4, [0, 1, 0]))
board.apply_translation([0, 0.9, 0.0])
add('Cap_Board', colored(board, CAP, 0.7))
add('Cap_Button', colored(ellipsoid([0, 0.912, 0], [0.016, 0.01, 0.016], 2), GOLD, 0.4))
corner = np.array([0.25, 0.905, 0.0])
cord = [[0, 0.912, 0], [0.11, 0.912, 0.0], [0.22, 0.906, 0.0], [0.23, 0.85, 0.0], [0.23, 0.79, 0.0]]
add('Cap_Tassel', colored(trimesh.util.concatenate([tube(cord, [0.009]), ellipsoid([0.23, 0.775, 0], [0.022, 0.03, 0.022], 2)]), GOLD, 0.4))

out = sys.argv[1] if len(sys.argv) > 1 else 'tuxedo_cat.glb'
scene.export(out)
print('wrote', out, 'nodes:', len(scene.graph.nodes_geometry), 'bounds:', np.round(scene.bounds, 3).tolist())
