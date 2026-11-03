"""Procedurally build the graduate owl mascot and export as GLB.
Y-up, facing +Z, ~2 units tall, feet on y=0."""
import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix as R, translation_matrix as T
from PIL import Image, ImageDraw, ImageFont

def srgb2lin(h):
    c = np.array(hex2rgba(h)[:3]) / 255.0
    c = np.where(c <= 0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
    return list(c) + [1.0]

def hex2rgba(h, a=255):
    h = h.lstrip('#')
    return [int(h[i:i+2], 16) for i in (0, 2, 4)] + [a]

PALETTE = {
    'body':   '#8E6EDF', 'dark':  '#7B59D8', 'belly': '#E9DFFD',
    'white':  '#FFFFFF', 'pupil': '#2D2336', 'beak':  '#FFA530',
    'smile':  '#5B3FB8', 'cheek': '#E79AC6', 'chevron': '#C9B4F5',
    'backchev': '#7A58D2', 'feet': '#FFA22E', 'book': '#FF8A3D',
    'spine':  '#E06A22', 'pages': '#FFF3EA', 'capTop': '#2B2B40',
    'capBase': '#3C3A56', 'gold': '#FFC94D',
    'leg': '#F0901F', 'talon': '#FFF3EA',
}
MATS = {k: trimesh.visual.material.PBRMaterial(
            name=k, baseColorFactor=srgb2lin(v), metallicFactor=0.0,
            roughnessFactor=0.65, doubleSided=False)
        for k, v in PALETTE.items()}

scene = trimesh.Scene()

def add(mesh, mat, name, M=None):
    if M is not None:
        mesh.apply_transform(M)
    mesh.visual = trimesh.visual.TextureVisuals(material=MATS[mat])
    scene.add_geometry(mesh, node_name=name, geom_name=name)

def ellipsoid(radii, center, rot=None, sub=4):
    m = trimesh.creation.icosphere(subdivisions=sub)
    m.apply_scale(radii)
    if rot is not None:
        m.apply_transform(rot)
    m.apply_translation(center)
    return m

def tube(points, radius, sections=16, cap=True):
    """Smooth tube along a polyline (round caps via spheres)."""
    pts = np.asarray(points, float)
    n = len(pts)
    tang = np.gradient(pts, axis=0)
    tang /= np.linalg.norm(tang, axis=1)[:, None]
    ref = np.array([0, 1, 0]) if abs(tang[0][1]) < 0.9 else np.array([1, 0, 0])
    normal = np.cross(tang[0], ref); normal /= np.linalg.norm(normal)
    verts, faces = [], []
    ang = np.linspace(0, 2*np.pi, sections, endpoint=False)
    for i in range(n):
        t = tang[i]
        normal = normal - t*np.dot(normal, t); normal /= np.linalg.norm(normal)
        b = np.cross(t, normal)
        for a in ang:
            verts.append(pts[i] + radius*(np.cos(a)*normal + np.sin(a)*b))
    for i in range(n-1):
        for j in range(sections):
            a0 = i*sections + j; a1 = i*sections + (j+1) % sections
            b0 = a0 + sections; b1 = a1 + sections
            faces += [[a0, b0, a1], [a1, b0, b1]]
    m = trimesh.Trimesh(verts, faces, process=True)
    if cap:
        parts = [m]
        for p in (pts[0], pts[-1]):
            s = trimesh.creation.icosphere(subdivisions=2, radius=radius)
            s.apply_translation(p); parts.append(s)
        m = trimesh.util.concatenate(parts)
    return m

def arc_on_surface(cx, cy, w, h, n, surface_z, lift=0.0, up=True):
    """'v'/smile-shaped arc projected onto a z(x,y) surface."""
    xs = np.linspace(cx - w/2, cx + w/2, n)
    s = (xs - cx) / (w/2)
    ys = cy + (h*(s**2 - 1) if up else -h*(s**2 - 1))
    return np.array([[x, y, surface_z(x, y) + lift] for x, y in zip(xs, ys)])

# ---------------- BODY ----------------
BC, BR = np.array([0, 1.0, 0]), np.array([0.62, 0.78, 0.55])
def body_z(x, y, sign=1):
    v = 1 - ((x-BC[0])/BR[0])**2 - ((y-BC[1])/BR[1])**2
    return sign * BR[2]*np.sqrt(max(v, 0))
add(ellipsoid(BR, BC, sub=5), 'body', 'Body')

LC, LR = np.array([0, 0.84, 0.17]), np.array([0.44, 0.58, 0.42])
def belly_z(x, y):
    v = 1 - ((x-LC[0])/LR[0])**2 - ((y-LC[1])/LR[1])**2
    return LC[2] + LR[2]*np.sqrt(max(v, 0))
add(ellipsoid(LR, LC, sub=5), 'belly', 'Belly')

# Ear tufts
for side, nm in ((1, 'L'), (-1, 'R')):
    c = trimesh.creation.cone(radius=0.13, height=0.32, sections=40)
    M = T([side*0.43, 1.52, -0.02]) @ R(-side*np.radians(28), [0, 0, 1]) @ R(-np.pi/2, [1, 0, 0])
    add(c, 'dark', f'EarTuft_{nm}', M)

# ---------------- FACE ----------------
for side, nm in ((1, 'L'), (-1, 'R')):
    ex, ey = side*0.205, 1.24
    ez = body_z(ex, ey) - 0.05
    add(ellipsoid([0.205, 0.215, 0.12], [ex, ey, ez]), 'white', f'Eye_{nm}')
    pz = ez + 0.085
    add(ellipsoid([0.105, 0.11, 0.06], [ex, ey-0.02, pz]), 'pupil', f'Pupil_{nm}')
    add(ellipsoid([0.042]*3, [ex + 0.035, ey+0.02, pz+0.05]), 'white', f'Highlight_{nm}')
    add(ellipsoid([0.02]*3, [ex - 0.045, ey-0.065, pz+0.045]), 'white', f'HighlightSm_{nm}')
    # cheeks
    cx, cy = side*0.4, 1.04
    add(ellipsoid([0.085, 0.045, 0.03], [cx, cy, body_z(cx, cy)-0.008],
                  rot=R(side*np.radians(38), [0, 1, 0])), 'cheek', f'Cheek_{nm}')

# Beak (points down, slightly forward)
beak = trimesh.convex.convex_hull(np.array([
    [-0.08, 0.0, 0.0], [0.08, 0.0, 0.0], [0, -0.14, 0.0],
    [-0.06, 0.0, -0.04], [0.06, 0.0, -0.04], [0, -0.1, -0.04], [0, -0.035, 0.06]]))
M = T([0, 1.17, belly_z(0, 1.13) + 0.01])
add(beak, 'beak', 'Beak', M)

# (no smile — the beak alone carries the expression)

# Chest chevrons
for (cx, cy) in [(-0.11, 0.86), (0.11, 0.86), (-0.08, 0.76), (0.08, 0.76)]:
    pts = arc_on_surface(cx, cy, 0.09, 0.022, 12, belly_z, lift=0.006)
    add(tube(pts, 0.011), 'chevron', f'Chevron_{cx:+.2f}_{cy:.2f}')

# ---------------- BACK DETAILS ----------------
# shoulder line
pts = [[x, 1.38 - 0.12*(1-(x/0.5)**2), body_z(x, 1.38 - 0.12*(1-(x/0.5)**2), -1) - 0.01]
       for x in np.linspace(-0.5, 0.5, 30)]
add(tube(pts, 0.014), 'chevron', 'BackLine')
for row, (y, cnt) in enumerate([(1.02, 4), (0.92, 5), (0.82, 4), (0.72, 3)]):
    xs = (np.arange(cnt) - (cnt-1)/2) * 0.085
    for i, x0 in enumerate(xs):
        pts = [[x, y + 0.02*(((x-x0)/0.04)**2 - 1), 0] for x in np.linspace(x0-0.04, x0+0.04, 10)]
        pts = [[p[0], p[1], body_z(p[0], p[1], -1) - 0.009] for p in pts]
        add(tube(pts, 0.012), 'backchev', f'BackFeather_{row}_{i}')

# Tail feathers
for i, x in enumerate([-0.08, 0.0, 0.08]):
    c = trimesh.creation.cone(radius=0.06, height=0.24 if x == 0 else 0.19, sections=32)
    M = T([x, 0.36, -0.3]) @ R(np.radians(20), [1, 0, 0]) @ R(np.pi/2, [1, 0, 0]) @ np.diag([1, 0.45, 1, 1])
    add(c, 'dark', f'Tail_{i}', M)

# ---------------- WINGS ----------------
for side, nm in ((1, 'L'), (-1, 'R')):
    add(ellipsoid([0.15, 0.37, 0.27], [side*0.58, 0.74, 0.02],
                  rot=R(side*np.radians(14), [0, 0, 1]) @ R(-np.radians(8), [1, 0, 0])),
        'dark', f'Wing_{nm}')

# ---------------- FEET ----------------
# Each foot: a short leg rooted inside the body, a pad, three front toes
# fanned out with talons, and one small back toe (owl-style).
for side, nm in ((1, 'L'), (-1, 'R')):
    fx = side*0.21
    pad = np.array([fx, 0.12, 0.16])
    # leg: starts inside the body so there's no visible gap
    leg = [[side*0.19, 0.34, 0.06], [side*0.2, 0.24, 0.1], [fx, 0.15, 0.15]]
    add(tube(leg, 0.055, sections=24), 'leg', f'Leg_{nm}')
    add(ellipsoid([0.1, 0.055, 0.09], pad), 'feet', f'FootPad_{nm}')
    for i, deg in enumerate((-32, 0, 32)):
        yaw = np.radians(deg + side*6)
        d = np.array([np.sin(yaw), 0, np.cos(yaw)])
        toe_c = pad + d*0.11 + [0, -0.015, 0]
        rot = R(yaw, [0, 1, 0]) @ R(np.radians(8), [1, 0, 0])
        add(ellipsoid([0.045, 0.04, 0.085], toe_c, rot=rot), 'feet', f'Toe_{nm}_{i}')
        tal = trimesh.creation.cone(radius=0.022, height=0.05, sections=20)
        Mt = T(toe_c + d*0.075 + [0, -0.012, 0]) @ R(yaw, [0, 1, 0]) @ R(np.radians(25), [1, 0, 0])
        add(tal, 'talon', f'Talon_{nm}_{i}', Mt)
    add(ellipsoid([0.035, 0.032, 0.06], pad + [0, -0.01, -0.09]), 'feet', f'BackToe_{nm}')

# ---------------- BOOK ----------------
BW, BH, BD = 0.52, 0.44, 0.13
BOOK_M = T([0, 0.5, belly_z(0, 0.5) + 0.02]) @ R(np.radians(-8), [1, 0, 0])
add(trimesh.creation.box([BW, BH, BD]), 'book', 'Book_Cover', BOOK_M.copy())
add(trimesh.creation.box([0.07, BH+0.01, BD+0.01]), 'spine', 'Book_Spine', BOOK_M @ T([-BW/2+0.03, 0, 0]))
add(trimesh.creation.box([0.02, BH-0.05, BD-0.03]), 'pages', 'Book_Pages', BOOK_M @ T([BW/2+0.004, 0, 0]))

# Text texture
W, H = 1024, 868
img = Image.new('RGBA', (W, H), tuple(hex2rgba(PALETTE['book'])[:3] + [0]))
d = ImageDraw.Draw(img)
f1 = ImageFont.truetype('/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf', 150)
f2 = ImageFont.truetype('/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf', 210)
cream = (255, 243, 234, 255)
for txt, f, y in (('ENGLISH', f1, 300), ('A·B·C', f2, 560)):
    w = d.textlength(txt, font=f)
    d.text(((W - w)/2 + 40, y), txt, font=f, fill=cream, anchor='lm')
pw, ph = BW - 0.02, BH - 0.02
v = np.array([[-pw/2, -ph/2, 0], [pw/2, -ph/2, 0], [pw/2, ph/2, 0], [-pw/2, ph/2, 0]])
plane = trimesh.Trimesh(v, [[0, 1, 2], [0, 2, 3]], process=False)
uv = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], float)
tex_mat = trimesh.visual.material.PBRMaterial(name='bookTitle', baseColorTexture=img,
            metallicFactor=0.0, roughnessFactor=0.65, alphaMode='BLEND')
plane.visual = trimesh.visual.TextureVisuals(uv=uv, material=tex_mat)
plane.apply_transform(BOOK_M @ T([0.015, 0, BD/2 + 0.002]))
scene.add_geometry(plane, node_name='Book_Title', geom_name='Book_Title')

# Hands holding the book
for side, nm in ((1, 'L'), (-1, 'R')):
    p = (BOOK_M @ np.array([side*(BW/2+0.01), 0.04, 0.03, 1]))[:3]
    add(ellipsoid([0.075, 0.07, 0.07], p), 'dark', f'Hand_{nm}')

# ---------------- GRAD CAP ----------------
add(trimesh.creation.cylinder(radius=0.3, height=0.2, sections=64), 'capBase', 'Cap_Base',
    T([0, 1.74, 0]) @ R(np.radians(-4), [1, 0, 0]) @ R(-np.pi/2, [1, 0, 0]))
board = trimesh.creation.box([0.72, 0.035, 0.72])
add(board, 'capTop', 'Cap_Board', T([0, 1.855, 0]) @ R(np.radians(-4), [1, 0, 0]) @ R(np.pi/4, [0, 1, 0]))
add(ellipsoid([0.035, 0.02, 0.035], [0, 1.88, 0]), 'gold', 'Cap_Button')
corner = np.array([0.72/np.sqrt(2) - 0.03, 1.885, 0.0])
cord = [[0, 1.885, 0], corner * [0.5, 1, 1], corner, corner + [0.01, -0.06, 0.0],
        corner + [0.01, -0.18, 0.01], corner + [0.01, -0.3, 0.02]]
add(tube(cord, 0.012), 'gold', 'Tassel_Cord')
add(ellipsoid([0.055]*3, corner + [0.01, -0.33, 0.02]), 'gold', 'Tassel_End')

scene.apply_translation([0, -scene.bounds[0][1], 0])
out = '/mnt/user-data/outputs/graduate_owl.glb'
import os; os.makedirs(os.path.dirname(out), exist_ok=True)
scene.export(out)
print('exported', out, os.path.getsize(out), 'bytes', 'bounds', scene.bounds.round(3).tolist())
