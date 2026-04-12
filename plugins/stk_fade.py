#!/usr/bin/env python3
import sys
from PIL import Image

mode = sys.argv[1]   # 'in' o 'out'
src_path = sys.argv[2]
out_path = sys.argv[3]

src = Image.open(src_path).convert('RGBA').resize((512, 512))
frames = []
PASOS = 20

for i in range(PASOS):
    a = (i / (PASOS - 1)) if mode == 'in' else (1 - i / (PASOS - 1))
    fr = src.copy()
    r, g, b, alpha = fr.split()
    alpha = alpha.point(lambda x, a=a: int(x * a))
    fr.putalpha(alpha)
    frames.append(fr)

frames[0].save(
    out_path,
    save_all=True,
    append_images=frames[1:],
    duration=100,
    loop=0,
    lossless=False,
    quality=80
)
