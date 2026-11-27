import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExperimentSandboxKind,
  LearnerLocale,
  TargetLang,
  WhiteboardStepCommand,
} from '../types/voiceCall';
import { MathText } from './MathText';
import { wbPick } from '../lib/i18n';
import { resolveStepPalette } from './RoughScratchEngine';
import type { SocraticInteractionEvent } from './WhiteboardInteractiveManipulatives';

export interface SandboxLabProps {
  step: WhiteboardStepCommand & { id: string };
  locale?: LearnerLocale;
  targetLang?: TargetLang;
  isCompletedByStudent: boolean;
  isWaitingOnStudent: boolean;
  onInteractionResult: (ev: SocraticInteractionEvent) => void;
  onSkipContinue?: () => void;
}

function loc(locale: LearnerLocale | undefined, en: string, id: string, th?: string): string {
  return wbPick(en, id, th || en, locale);
}

/* ============================================================================
 * 1. 3D KINEMATIC PAPER CUBE NET FOLDING & SOLID SANDBOX (`cube_3d_net`)
 *    True 3D rigid-body hinge tree: flat paper squares fold smoothly (0°..90°),
 *    orbitable 360° by finger/mouse, with real 3D face-collision detection!
 * ============================================================================ */
type HingeDir = 'N' | 'S' | 'E' | 'W';

interface NetFaceNode {
  id: number;
  label: string;
  color: string;
  parentId: number | null;
  dir?: HingeDir;
}

interface NetPreset {
  key: string;
  nameId: string;
  nameEn: string;
  isValidCube: boolean;
  faces: NetFaceNode[];
}

const CUBE_NET_PRESETS: NetPreset[] = [
  {
    key: 'cross',
    nameId: 'Pola Salib (1-4-1)',
    nameEn: 'Cross Net (1-4-1)',
    isValidCube: true,
    faces: [
      { id: 1, label: '1 · Alas', color: '#3B82F6', parentId: null },
      { id: 2, label: '2 · Depan', color: '#10B981', parentId: 1, dir: 'S' },
      { id: 3, label: '3 · Belakang', color: '#14B8A6', parentId: 1, dir: 'N' },
      { id: 4, label: '4 · Kiri', color: '#F59E0B', parentId: 1, dir: 'W' },
      { id: 5, label: '5 · Kanan', color: '#F97316', parentId: 1, dir: 'E' },
      { id: 6, label: '6 · Tutup', color: '#8B5CF6', parentId: 5, dir: 'E' },
    ],
  },
  {
    key: 't_shape',
    nameId: 'Pola Huruf T',
    nameEn: 'T-Shape Net',
    isValidCube: true,
    faces: [
      { id: 1, label: '1 · Alas', color: '#3B82F6', parentId: null },
      { id: 2, label: '2 · Kiri', color: '#F59E0B', parentId: 1, dir: 'W' },
      { id: 3, label: '3 · Kanan', color: '#F97316', parentId: 1, dir: 'E' },
      { id: 4, label: '4 · Belakang', color: '#14B8A6', parentId: 1, dir: 'N' },
      { id: 5, label: '5 · Depan', color: '#10B981', parentId: 1, dir: 'S' },
      { id: 6, label: '6 · Tutup', color: '#8B5CF6', parentId: 5, dir: 'S' },
    ],
  },
  {
    key: 'stairs',
    nameId: 'Pola Tangga Zigzag',
    nameEn: 'Zigzag Stairs Net',
    isValidCube: true,
    faces: [
      { id: 1, label: '1 · Alas', color: '#3B82F6', parentId: null },
      { id: 2, label: '2 · Kanan', color: '#F97316', parentId: 1, dir: 'E' },
      { id: 3, label: '3 · Depan', color: '#10B981', parentId: 2, dir: 'S' },
      { id: 4, label: '4 · Tutup', color: '#8B5CF6', parentId: 3, dir: 'E' },
      { id: 5, label: '5 · Belakang', color: '#14B8A6', parentId: 1, dir: 'N' },
      { id: 6, label: '6 · Kiri', color: '#F59E0B', parentId: 5, dir: 'W' },
    ],
  },
  {
    key: 'trap_overlap',
    nameId: 'Uji Jaring Gagal (Tabrakan!)',
    nameEn: 'Invalid Net (Overlap Trap!)',
    isValidCube: false,
    faces: [
      { id: 1, label: '1 · Alas', color: '#3B82F6', parentId: null },
      { id: 2, label: '2 · Belakang', color: '#14B8A6', parentId: 1, dir: 'N' },
      { id: 3, label: '3 · Lipat Kanan A', color: '#EF4444', parentId: 2, dir: 'E' },
      { id: 4, label: '4 · Lipat Kanan B', color: '#F97316', parentId: 1, dir: 'E' },
      { id: 5, label: '5 · Depan', color: '#10B981', parentId: 1, dir: 'S' },
      { id: 6, label: '6 · Kiri', color: '#F59E0B', parentId: 1, dir: 'W' },
    ],
  },
];

type Vec3 = [number, number, number];

function transformLocalChildToParent(p: Vec3, dir: HingeDir, thetaRad: number): Vec3 {
  const [x, y, z] = p;
  const c = Math.cos(thetaRad);
  const s = Math.sin(thetaRad);
  if (dir === 'E') {
    const dx = x + 0.5;
    return [0.5 + dx * c - z * s, y, dx * s + z * c];
  }
  if (dir === 'W') {
    const dx = x - 0.5;
    return [-0.5 + dx * c + z * s, y, -dx * s + z * c];
  }
  if (dir === 'S') {
    const dy = y + 0.5;
    return [x, 0.5 + dy * c - z * s, dy * s + z * c];
  }
  // 'N'
  const dy = y - 0.5;
  return [x, -0.5 + dy * c + z * s, -dy * s + z * c];
}

function computeWorldPoint(nodeId: number, localPt: Vec3, faces: NetFaceNode[], foldRad: number): Vec3 {
  const byId = new Map(faces.map((f) => [f.id, f]));
  let pt: Vec3 = [...localPt];
  let cur = byId.get(nodeId);
  while (cur && cur.parentId !== null && cur.dir) {
    pt = transformLocalChildToParent(pt, cur.dir, foldRad);
    cur = byId.get(cur.parentId);
  }
  return pt;
}

function rotateOrbit(pt: Vec3, yawDeg: number, pitchDeg: number): Vec3 {
  const [x, y, z] = pt;
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  // Rotate around Z (turntable yaw), then tilt around X (elevation pitch)
  const x1 = x * cy - y * sy;
  const y1 = x * sy + y * cy;
  const z1 = z;

  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  return [x1, y2, z2];
}

function project3DToSvg(ptRot: Vec3, scale = 58, cx = 185, cy = 128): { sx: number; sy: number; depth: number } {
  const [x, y, z] = ptRot;
  const camDist = 5.6;
  const persp = camDist / Math.max(2.2, camDist + y * 0.48);
  return {
    sx: cx + x * scale * persp,
    sy: cy - z * scale * persp,
    depth: y,
  };
}

export const CubeNet3DFoldingLab: React.FC<SandboxLabProps> = ({
  step,
  locale,
  isCompletedByStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = resolveStepPalette(step);
  const defaultSide = Number(step.sandboxParams?.sideCm || 4);
  const [presetKey, setPresetKey] = useState<string>('cross');
  const [foldPct, setFoldPct] = useState<number>(18); // start slightly lifted so student immediately sees 3D paper depth!
  const [yawDeg, setYawDeg] = useState<number>(-34);
  const [pitchDeg, setPitchDeg] = useState<number>(58);
  const [sideCm, setSideCm] = useState<number>(Math.max(2, Math.min(12, defaultSide)));
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [animTarget, setAnimTarget] = useState<number | null>(null);
  const [solvedLocal, setSolvedLocal] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; baseYaw: number; basePitch: number } | null>(null);

  const solved = isCompletedByStudent || solvedLocal;
  const preset = useMemo(
    () => CUBE_NET_PRESETS.find((p) => p.key === presetKey) || CUBE_NET_PRESETS[0],
    [presetKey]
  );

  // Smooth spring/tween when clicking "Lipat Otomatis" / "Buka Kertas"
  useEffect(() => {
    if (animTarget === null) return;
    let raf = 0;
    const tick = () => {
      setFoldPct((prev) => {
        const diff = animTarget - prev;
        if (Math.abs(diff) < 1.2) {
          setAnimTarget(null);
          return animTarget;
        }
        return prev + diff * 0.16;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animTarget]);

  const foldRad = (Math.max(0, Math.min(100, foldPct)) / 100) * (Math.PI / 2);

  const renderedFaces = useMemo(() => {
    const half = 0.488;
    const localCorners: Vec3[] = [
      [-half, -half, 0],
      [half, -half, 0],
      [half, half, 0],
      [-half, half, 0],
    ];
    const foldFrac = Math.max(0, Math.min(1, foldPct / 100));
    // Adaptive camera dolly zoom: wide (50px) when flat 4x3 net, zooming smoothly to chunky 82px when folded into 3D cube!
    const dynamicScale = 50 + foldFrac * 32;

    const rawWorld = preset.faces.map((f) => {
      const wCorners = localCorners.map((c) => computeWorldPoint(f.id, c, preset.faces, foldRad));
      const wCenter = computeWorldPoint(f.id, [0, 0, 0], preset.faces, foldRad);
      return { face: f, wCorners, wCenter };
    });

    // Auto-center the 3D centroid of all 6 paper squares so every net pattern stays dead-center!
    const centroid: Vec3 = [0, 0, 0];
    rawWorld.forEach(({ wCenter }) => {
      centroid[0] += wCenter[0] / rawWorld.length;
      centroid[1] += wCenter[1] / rawWorld.length;
      centroid[2] += wCenter[2] / rawWorld.length;
    });

    const worldFaces = rawWorld.map(({ face, wCorners, wCenter }) => {
      const cCorners = wCorners.map((wc): Vec3 => [wc[0] - centroid[0], wc[1] - centroid[1], wc[2] - centroid[2]]);
      const cCenter: Vec3 = [wCenter[0] - centroid[0], wCenter[1] - centroid[1], wCenter[2] - centroid[2]];
      const rCorners = cCorners.map((wc) => rotateOrbit(wc, yawDeg, pitchDeg));
      const rCenter = rotateOrbit(cCenter, yawDeg, pitchDeg);
      const proj = rCorners.map((rc) => project3DToSvg(rc, dynamicScale));
      const projCenter = project3DToSvg(rCenter, dynamicScale);
      return {
        face,
        wCenter,
        rCenter,
        proj,
        projCenter,
        depth: rCenter[1],
      };
    });

    // Detect real 3D face collisions when folded >= 78%
    const collidingIds = new Set<number>();
    if (foldPct >= 78) {
      for (let i = 0; i < worldFaces.length; i++) {
        for (let j = i + 1; j < worldFaces.length; j++) {
          const a = worldFaces[i].wCenter;
          const b = worldFaces[j].wCenter;
          const dist = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
          if (dist < 0.22) {
            collidingIds.add(worldFaces[i].face.id);
            collidingIds.add(worldFaces[j].face.id);
          }
        }
      }
    }

    // Painter's sort back-to-front (largest depth y is furthest back)
    const sorted = [...worldFaces].sort((a, b) => b.depth - a.depth);
    return { sorted, collidingIds, centroid, dynamicScale };
  }, [preset, foldRad, yawDeg, pitchDeg, foldPct]);

  const isFullyFoldedValid = foldPct >= 94 && preset.isValidCube && renderedFaces.collidingIds.size === 0;
  const hasCollisionTrap = foldPct >= 82 && renderedFaces.collidingIds.size > 0;

  // Fire Socratic completion once learner folds a valid net into a full 3D cube!
  useEffect(() => {
    if (isFullyFoldedValid && !solved) {
      setSolvedLocal(true);
      const surfaceArea = 6 * sideCm * sideCm;
      const vol = sideCm * sideCm * sideCm;
      onInteractionResult({
        stepId: step.id,
        isCorrect: true,
        userAnswer: `${preset.nameId} (90° Kubus Utuh, s=${sideCm}cm)`,
        expectedAnswer: 'Kubus 3D Tertutup Sempurna',
        feedbackToSpeak:
          step.successVoiceFeedback ||
          loc(
            locale,
            `Awesome! All 6 square faces folded 90 degrees into a closed 3D cube with 12 edges and 8 vertices. Feel free to keep rotating or test another net pattern!`,
            `Keren! Keenam sisi persegi terlipat 90 derajat menutup sempurna menjadi kubus 3D utuh (6 sisi, 12 rusuk, 8 titik sudut; Luas ${surfaceArea} cm², Volume ${vol} cm³). Kamu tetap bebas memutar atau mencoba pola jaring lainnya!`
          ),
      });
    }
  }, [isFullyFoldedValid, solved, preset.nameId, sideCm, step.id, step.successVoiceFeedback, locale, onInteractionResult]);

  const surfaceArea = 6 * sideCm * sideCm;
  const volume = sideCm * sideCm * sideCm;

  return (
    <div
      data-testid="wb-experiment-cube-3d-lab"
      className="rounded-2xl border-2 bg-white/95 p-3.5 sm:p-4 shadow-xs space-y-3"
      style={{ borderColor: `${pal.ink}40` }}
    >
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shrink-0"
            style={{ backgroundColor: pal.ink }}
          >
            {loc(locale, '3D PAPER FOLDING LAB', 'LAB EKSPERIMEN LIPAT KUBUS 3D')}
          </span>
          {solved && (
            <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-extrabold">
              ✓ {loc(locale, 'Cube Sealed!', 'Kubus Terbentuk!')}
            </span>
          )}
        </div>
        {onSkipContinue && !solved && (
          <button
            type="button"
            onClick={onSkipContinue}
            className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
          >
            {loc(locale, 'Next ›', 'Lanjut ›')}
          </button>
        )}
      </div>

      <div className="fz-handwriting-heading text-lg sm:text-xl font-bold text-[#0F172A] leading-snug">
        <MathText
          text={step.title || loc(locale, 'Fold a 2D Paper Net into a 3D Cube', 'Lipat Kertas Jaring-Jaring Menjadi Kubus 3D')}
          active
        />
      </div>

      {/* Pattern Switcher Pills (Experiment with 3 Valid Nets + 1 Colliding Trap Net!) */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pola Jaring-Jaring Kubus">
        {CUBE_NET_PRESETS.map((p) => {
          const active = p.key === presetKey;
          return (
            <button
              key={p.key}
              type="button"
              data-testid={`cube-net-preset-${p.key}`}
              onClick={() => {
                setPresetKey(p.key);
                setSelectedFaceId(null);
                setAnimTarget(null);
                setFoldPct(22);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11.5px] font-extrabold border transition-all cursor-pointer min-h-[34px] ${
                active
                  ? p.isValidCube
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-2xs'
                    : 'bg-[#B91C1C] text-white border-[#B91C1C] shadow-2xs'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#EFF6FF]'
              }`}
            >
              {loc(locale, p.nameEn, p.nameId)}
            </button>
          );
        })}
      </div>

      {/* Interactive 3D Orbit & Folding Viewport */}
      <div
        className="relative rounded-2xl border border-[#CBD5E1] bg-gradient-to-b from-[#F8FAFC] to-[#EFF6FF]/65 overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            baseYaw: yawDeg,
            basePitch: pitchDeg,
          };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          setYawDeg(dragRef.current.baseYaw + dx * 0.65);
          setPitchDeg(Math.max(15, Math.min(82, dragRef.current.basePitch - dy * 0.45)));
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <div className="absolute top-2 left-2.5 z-10 flex items-center gap-1.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#CBD5E1] text-[10px] font-bold text-[#334155]">
            ↻ {loc(locale, 'Drag to rotate 360°', 'Geser layar untuk putar 3D')}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#CBD5E1] text-[10px] font-extrabold text-[#1D4ED8]">
            {Math.round((foldPct / 100) * 90)}°
          </span>
        </div>

        <svg
          viewBox="0 0 370 248"
          className="w-full h-[228px] sm:h-[248px] block"
          data-testid="cube-3d-viewport-svg"
        >
          {/* Subtle Isometric Floor Reference Grid */}
          {[-1.5, -0.5, 0.5, 1.5].map((g) => {
            const floorZ = -renderedFaces.centroid[2] - 0.04;
            const a = project3DToSvg(rotateOrbit([g, -1.8, floorZ], yawDeg, pitchDeg), 52);
            const b = project3DToSvg(rotateOrbit([g, 1.8, floorZ], yawDeg, pitchDeg), 52);
            const c = project3DToSvg(rotateOrbit([-1.8, g, floorZ], yawDeg, pitchDeg), 52);
            const d = project3DToSvg(rotateOrbit([1.8, g, floorZ], yawDeg, pitchDeg), 52);
            return (
              <g key={g} stroke="#CBD5E1" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.65">
                <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} />
                <line x1={c.sx} y1={c.sy} x2={d.sx} y2={d.sy} />
              </g>
            );
          })}

          {/* 3D Paper Squares (Painter's Sorted Back-to-Front) */}
          {renderedFaces.sorted.map(({ face, proj, projCenter }) => {
            const ptsStr = proj.map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ');
            const isColliding = renderedFaces.collidingIds.has(face.id);
            const isSelected = selectedFaceId === face.id;
            const fill = isColliding ? '#EF4444' : face.color;
            return (
              <g
                key={face.id}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setSelectedFaceId((prev) => (prev === face.id ? null : face.id));
                }}
                className="cursor-pointer"
              >
                <polygon
                  points={ptsStr}
                  fill={fill}
                  fillOpacity={isColliding ? 0.88 : isFullyFoldedValid ? 0.88 : 0.8}
                  stroke={isColliding ? '#7F1D1D' : isSelected ? '#0F172A' : '#FFFFFF'}
                  strokeWidth={isColliding || isSelected ? 2.8 : 1.9}
                  strokeLinejoin="round"
                />
                <circle
                  cx={projCenter.sx}
                  cy={projCenter.sy}
                  r="10.5"
                  fill="rgba(255,255,255,0.92)"
                  stroke={isColliding ? '#991B1B' : '#1E293B'}
                  strokeWidth="1.3"
                />
                <text
                  x={projCenter.sx}
                  y={projCenter.sy + 3.8}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="800"
                  fill={isColliding ? '#991B1B' : '#0F172A'}
                >
                  {face.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Collision Alert Banner when testing Invalid Net */}
        {hasCollisionTrap && (
          <div className="mx-2.5 mb-2.5 px-3 py-2 rounded-xl bg-[#FEF2F2] border border-[#F87171] text-[11.5px] font-bold text-[#991B1B]">
            ✕ {loc(
              locale,
              'Paper Collision! Faces #3 & #4 overlap on the right wall, leaving the top of the cube wide open!',
              'Tabrakan Kertas! Sisi #3 dan #4 menumpuk di dinding kanan yang sama, sehingga bagian tutup atas kubus bolong!'
            )}
          </div>
        )}
      </div>

      {/* Tactile Folding Scrubber + Quick Auto-Fold Buttons */}
      <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={`fold-slider-${step.id}`}
            className="text-xs font-extrabold text-[#1E293B]"
          >
            {loc(locale, 'Fold Paper Flaps:', 'Lipat Kertas Jaring-Jaring:')} <span className="text-[#1D4ED8]">{Math.round(foldPct)}%</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="cube-unfold-btn"
              onClick={() => setAnimTarget(0)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] cursor-pointer min-h-[32px]"
            >
              {loc(locale, 'Unfold Flat (0°)', 'Buka Rata (0°)')}
            </button>
            <button
              type="button"
              data-testid="cube-autofold-btn"
              onClick={() => setAnimTarget(100)}
              className="px-3 py-1 rounded-lg text-[11px] font-extrabold bg-[#15803D] text-white hover:bg-[#166534] cursor-pointer min-h-[32px] shadow-2xs"
            >
              {loc(locale, 'Fold into Cube (90°)', 'Lipat Jadi Kubus (90°)')}
            </button>
          </div>
        </div>
        <input
          id={`fold-slider-${step.id}`}
          data-testid="cube-fold-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(foldPct)}
          onChange={(e) => {
            setAnimTarget(null);
            setFoldPct(Number(e.target.value));
          }}
          className="w-full h-2.5 accent-[#1D4ED8] cursor-pointer"
        />
      </div>

      {/* Live Edge Length (Rusuk s) & Real-time Formula Readout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#EFF6FF]/80 border border-[#BFDBFE]">
          <span className="text-xs font-bold text-[#1E3A8A]">
            {loc(locale, 'Edge Length', 'Panjang Rusuk')} (<MathText text="$s$" active />):
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSideCm((s) => Math.max(1, s - 1))}
              className="w-7 h-7 rounded-lg bg-white border border-[#93C5FD] font-extrabold text-[#1E3A8A] cursor-pointer"
            >
              -
            </button>
            <span className="text-sm font-extrabold text-[#0F172A] min-w-[44px] text-center">{sideCm} cm</span>
            <button
              type="button"
              onClick={() => setSideCm((s) => Math.min(15, s + 1))}
              className="w-7 h-7 rounded-lg bg-white border border-[#93C5FD] font-extrabold text-[#1E3A8A] cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div className="px-3 py-2 rounded-xl bg-[#ECFDF5]/90 border border-[#A7F3D0] text-[11.5px] font-bold text-[#065F46] flex flex-col justify-center">
          <div>6 Sisi · 12 Rusuk · 8 Titik Sudut</div>
          <div>
            L = 6×{sideCm}² = <strong>{surfaceArea} cm²</strong> · V = {sideCm}³ = <strong>{volume} cm³</strong>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#475569] border-l-2 border-[#3B82F6] pl-2.5 leading-relaxed">
        {step.socraticPrompt ||
          loc(
            locale,
            'Experiment freely: drag the slider (or tap Fold into Cube) to fold the paper to 90°, rotate the 3D shape, and compare valid nets vs the overlapping trap net!',
            'Bereksperimenlah: geser tuas lipatan (atau ketuk Lipat Jadi Kubus) hingga 90°, putar kubus 3D dengan jarimu, dan bandingkan pola jaring yang berhasil menutup vs jaring yang bertabrakan!'
          )}
      </p>
    </div>
  );
};

/* ============================================================================
 * 2. 2D INTERACTIVE GEOMETRY VERTEX SANDBOX (`geometry_2d_morph`)
 *    Drag glowing triangle / Pythagoras / circle handles directly on grid!
 * ============================================================================ */
export const Geometry2DVertexSandbox: React.FC<SandboxLabProps> = ({
  step,
  locale,
  isCompletedByStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = resolveStepPalette(step);
  const shapeMode = String(step.sandboxParams?.shape || 'triangle'); // 'triangle' | 'pythagoras' | 'circle'
  const targetBase = Number(step.sandboxParams?.targetBase || 8);
  const targetHeight = Number(step.sandboxParams?.targetHeight || 6);

  const [baseUnits, setBaseUnits] = useState<number>(Math.max(3, Math.min(12, targetBase)));
  const [heightUnits, setHeightUnits] = useState<number>(Math.max(3, Math.min(9, targetHeight)));
  const [apexSkew, setApexSkew] = useState<number>(shapeMode === 'pythagoras' ? 0 : 2);
  const [showGhostRect, setShowGhostRect] = useState<boolean>(false);
  const [radiusUnits, setRadiusUnits] = useState<number>(Math.max(2, Math.min(8, Number(step.sandboxParams?.radius || 5))));
  const [unrollCircle, setUnrollCircle] = useState<boolean>(false);
  const [dragHandle, setDragHandle] = useState<'apex' | 'base' | 'radius' | null>(null);
  const [ touchCount, setTouchCount ] = useState<number>(0);
  const [solvedLocal, setSolvedLocal] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const solved = isCompletedByStudent || solvedLocal;

  const markExperimentComplete = (summary: string) => {
    if (solved) return;
    setSolvedLocal(true);
    onInteractionResult({
      stepId: step.id,
      isCorrect: true,
      userAnswer: summary,
      expectedAnswer: summary,
      feedbackToSpeak:
        step.successVoiceFeedback ||
        loc(
          locale,
          `Great geometric experiment! You verified directly on the grid how changing dimensions transforms the area and perimeter.`,
          `Eksperimen geometri yang mantap! Kamu sudah membuktikan langsung di atas petak satuan bagaimana perubahan ukuran membentuk rumus luasnya.`
        ),
    });
  };

  const toGridCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { gx: 6, gy: 5 };
    const r = svg.getBoundingClientRect();
    const vx = ((clientX - r.left) / Math.max(1, r.width)) * 360;
    const vy = ((clientY - r.top) / Math.max(1, r.height)) * 220;
    const gx = Math.round((vx - 44) / 22);
    const gy = Math.round((190 - vy) / 18);
    return { gx, gy };
  };

  if (shapeMode === 'circle') {
    const area = (Math.PI * radiusUnits * radiusUnits).toFixed(1);
    const circum = (2 * Math.PI * radiusUnits).toFixed(1);
    const rPx = radiusUnits * 11;
    return (
      <div
        data-testid="wb-experiment-geometry-2d-lab"
        className="rounded-2xl border-2 bg-white/95 p-3.5 sm:p-4 shadow-xs space-y-3"
        style={{ borderColor: `${pal.ink}40` }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white"
            style={{ backgroundColor: pal.ink }}
          >
            {loc(locale, 'CIRCLE EXPERIMENT LAB', 'MEJA EKSPERIMEN LINGKARAN')}
          </span>
          {onSkipContinue && !solved && (
            <button type="button" onClick={onSkipContinue} className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#CBD5E1] text-[#475569] cursor-pointer">
              {loc(locale, 'Next ›', 'Lanjut ›')}
            </button>
          )}
        </div>
        <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
          <MathText text={step.title || loc(locale, 'Drag Radius & Unroll Circumference', 'Tarik Jari-Jari & Bentangkan Keliling Lingkaran')} active />
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 360 210"
          className="w-full h-[200px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] touch-none select-none"
          onPointerMove={(e) => {
            if (dragHandle !== 'radius') return;
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const vx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 360;
            const vy = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 210;
            const distUnits = Math.max(2, Math.min(7, Math.round(Math.hypot(vx - 115, vy - 96) / 11)));
            setRadiusUnits(distUnits);
            setTouchCount((c) => c + 1);
            if (touchCount >= 2) markExperimentComplete(`r=${distUnits} cm, L=${(Math.PI * distUnits * distUnits).toFixed(1)}`);
          }}
          onPointerUp={() => setDragHandle(null)}
        >
          <circle cx={115} cy={96} r={rPx} fill="#DBEAFE" fillOpacity={0.65} stroke="#1D4ED8" strokeWidth={2.5} />
          <line x1={115} y1={96} x2={115 + rPx} y2={96} stroke="#DC2626" strokeWidth={2.5} />
          <text x={115 + rPx / 2} y={88} textAnchor="middle" fontSize="11" fontWeight="800" fill="#991B1B">
            r = {radiusUnits}
          </text>
          {/* Draggable Radius Knob */}
          <circle
            cx={115 + rPx}
            cy={96}
            r={11}
            fill="#DC2626"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            className="cursor-ew-resize"
            onPointerDown={(e) => {
              (e.currentTarget as SVGCircleElement).ownerSVGElement?.setPointerCapture?.(e.pointerId);
              setDragHandle('radius');
            }}
          />
          {unrollCircle && (
            <g>
              <line x1={30} y1={184} x2={30 + Math.min(300, Number(circum) * 6.2)} y2={184} stroke="#15803D" strokeWidth={5} strokeLinecap="round" />
              <text x={34} y={173} fontSize="10.5" fontWeight="800" fill="#166534">
                Keliling dibentangkan = 2πr ≈ {circum} cm (3,14 × diameter {radiusUnits * 2})
              </text>
            </g>
          )}
        </svg>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setUnrollCircle((u) => !u);
              markExperimentComplete(`Unroll K=${circum}`);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#15803D] text-white cursor-pointer"
          >
            {unrollCircle ? 'Tutup Bentangan Keliling' : 'Eksperimen: Bentangkan Keliling Jadi Garis Lurus!'}
          </button>
          <span className="text-xs font-extrabold text-[#1E293B]">
            Luas πr² ≈ {area} cm² · Keliling ≈ {circum} cm
          </span>
        </div>
      </div>
    );
  }

  // Triangle & Pythagoras Interactive Draggable Grid
  const x0 = 44;
  const y0 = 190;
  const ux = 22;
  const uy = 18;
  const ax = x0;
  const ay = y0;
  const bx = x0 + baseUnits * ux;
  const by = y0;
  const effectiveSkew = shapeMode === 'pythagoras' ? 0 : Math.max(0, Math.min(baseUnits, apexSkew));
  const cx = x0 + effectiveSkew * ux;
  const cy = y0 - heightUnits * uy;

  const rectArea = baseUnits * heightUnits;
  const triArea = rectArea / 2;
  const hyp = Math.hypot(baseUnits, heightUnits);
  const hypClean = Number.isInteger(hyp) ? String(hyp) : hyp.toFixed(2);

  return (
    <div
      data-testid="wb-experiment-geometry-2d-lab"
      className="rounded-2xl border-2 bg-white/95 p-3.5 sm:p-4 shadow-xs space-y-3"
      style={{ borderColor: `${pal.ink}40` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white"
          style={{ backgroundColor: pal.ink }}
        >
          {shapeMode === 'pythagoras'
            ? loc(locale, 'PYTHAGORAS LIVE LAB', 'LAB EKSPERIMEN PYTHAGORAS')
            : loc(locale, 'DRAGGABLE GEOMETRY LAB', 'MEJA EKSPERIMEN GESER TITIK SUDUT')}
        </span>
        {onSkipContinue && !solved && (
          <button type="button" onClick={onSkipContinue} className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#CBD5E1] text-[#475569] cursor-pointer">
            {loc(locale, 'Next ›', 'Lanjut ›')}
          </button>
        )}
      </div>

      <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
        <MathText text={step.title || loc(locale, 'Drag the Vertices & Test the Ghost Rectangle!', 'Tarik Titik Sudut & Uji Belahan Persegi Panjang!')} active />
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 360 220"
        data-testid="geometry-2d-svg"
        className="w-full h-[208px] rounded-2xl border border-[#CBD5E1] bg-[#FFFDF8] touch-none select-none"
        onPointerMove={(e) => {
          if (!dragHandle) return;
          const { gx, gy } = toGridCoords(e.clientX, e.clientY);
          if (dragHandle === 'apex') {
            const nextH = Math.max(2, Math.min(9, gy));
            const nextSkew = shapeMode === 'pythagoras' ? 0 : Math.max(0, Math.min(baseUnits, gx));
            setHeightUnits(nextH);
            setApexSkew(nextSkew);
          } else if (dragHandle === 'base') {
            const nextB = Math.max(3, Math.min(12, gx));
            setBaseUnits(nextB);
            if (apexSkew > nextB) setApexSkew(nextB);
          }
          setTouchCount((c) => c + 1);
          if (touchCount >= 2) {
            markExperimentComplete(`alas=${baseUnits}, tinggi=${heightUnits}, L=${(baseUnits * heightUnits) / 2}`);
          }
        }}
        onPointerUp={() => setDragHandle(null)}
        onPointerCancel={() => setDragHandle(null)}
      >
        {/* Coordinate Unit Grid */}
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`vx-${i}`} x1={x0 + i * ux} y1={16} x2={x0 + i * ux} y2={y0} stroke="#E2E8F0" strokeWidth="1" />
        ))}
        {Array.from({ length: 11 }).map((_, j) => (
          <line key={`vy-${j}`} x1={x0} y1={y0 - j * uy} x2={352} y2={y0 - j * uy} stroke="#E2E8F0" strokeWidth="1" />
        ))}

        {/* Optional Ghost Bounding Rectangle (a × t) proving why Triangle = 1/2 × a × t! */}
        {showGhostRect && (
          <rect
            x={ax}
            y={cy}
            width={baseUnits * ux}
            height={heightUnits * uy}
            fill="#FDE68A"
            fillOpacity={0.38}
            stroke="#D97706"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}

        {/* Active Triangle Polygon */}
        <polygon
          points={`${ax},${ay} ${bx},${by} ${cx},${cy}`}
          fill="#BAE6FD"
          fillOpacity={0.72}
          stroke="#0284C7"
          strokeWidth={2.8}
          strokeLinejoin="round"
        />

        {/* Altitude (Height) Dashed Line */}
        <line x1={cx} y1={cy} x2={cx} y2={ay} stroke="#DC2626" strokeWidth={2} strokeDasharray="4 3" />
        <rect x={cx + 2} y={ay - 10} width={8} height={8} fill="none" stroke="#DC2626" strokeWidth={1.5} />

        {/* Live Measurement Labels */}
        <text x={(ax + bx) / 2} y={ay + 18} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#0F172A">
          Alas (a) = {baseUnits} cm
        </text>
        <text x={Math.max(26, cx - 10)} y={(ay + cy) / 2} textAnchor="end" fontSize="11" fontWeight="800" fill="#B91C1C">
          t = {heightUnits}
        </text>
        {shapeMode === 'pythagoras' && (
          <text x={(bx + cx) / 2 + 12} y={(by + cy) / 2 - 6} fontSize="11.5" fontWeight="800" fill="#6D28D9">
            c = √({baseUnits}²+{heightUnits}²) = {hypClean}
          </text>
        )}

        {/* Draggable Apex Vertex Handle */}
        <circle
          cx={cx}
          cy={cy}
          r={11.5}
          data-testid="geometry-apex-handle"
          fill="#DC2626"
          stroke="#FFFFFF"
          strokeWidth={2.8}
          className="cursor-move"
          onPointerDown={(e) => {
            (e.currentTarget as SVGCircleElement).ownerSVGElement?.setPointerCapture?.(e.pointerId);
            setDragHandle('apex');
          }}
        />
        {/* Draggable Base Vertex Handle */}
        <circle
          cx={bx}
          cy={by}
          r={11.5}
          data-testid="geometry-base-handle"
          fill="#0284C7"
          stroke="#FFFFFF"
          strokeWidth={2.8}
          className="cursor-ew-resize"
          onPointerDown={(e) => {
            (e.currentTarget as SVGCircleElement).ownerSVGElement?.setPointerCapture?.(e.pointerId);
            setDragHandle('base');
          }}
        />
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          data-testid="geometry-toggle-ghost-rect"
          onClick={() => {
            setShowGhostRect((v) => !v);
            markExperimentComplete(`Bukti ½ Persegi Panjang (${baseUnits}×${heightUnits}=${rectArea} → Segitiga=${triArea})`);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer min-h-[34px] ${
            showGhostRect
              ? 'bg-[#D97706] text-white border-[#B45309]'
              : 'bg-[#FFFBEB] text-[#92400E] border-[#F59E0B] hover:bg-[#FEF3C7]'
          }`}
        >
          {showGhostRect
            ? loc(locale, 'Hide Full Rectangle Proof', 'Sembunyikan Persegi Panjang Utuh')
            : loc(locale, 'Experiment: Show Full Rectangle (Why ½?)', 'Uji Bukti: Munculkan Persegi Panjang Utuh (Kenapa ½?)')}
        </button>

        <div className="px-3 py-1.5 rounded-xl bg-[#ECFDF5] border border-[#86EFAC] text-xs font-extrabold text-[#14532D]">
          {shapeMode === 'pythagoras'
            ? `${baseUnits}² + ${heightUnits}² = ${baseUnits * baseUnits + heightUnits * heightUnits} → c = ${hypClean}`
            : `Luas = ½ × ${baseUnits} × ${heightUnits} = ${triArea} cm² ${showGhostRect ? `(½ dari ${rectArea} cm²)` : ''}`}
        </div>
      </div>

      <p className="text-xs text-[#475569] border-l-2 border-[#0284C7] pl-2.5">
        {step.socraticPrompt ||
          loc(
            locale,
            'Drag the red apex dot & blue base dot freely on the grid, then toggle the Full Rectangle button to see why triangle area is always half of a × t!',
            'Geser titik merah (puncak) dan titik biru (alas) langsung dengan jarimu di atas petak, lalu tekan tombol Persegi Panjang Utuh untuk membuktikan kenapa luas segitiga selalu ½ × alas × tinggi!'
          )}
      </p>
    </div>
  );
};

/* ============================================================================
 * 3. LIVE PHYSICS EXPERIMENT SIMULATOR (`circuit_ohm_live` & `newton_motion_track`)
 * ============================================================================ */
export const PhysicsLiveSimulatorLab: React.FC<SandboxLabProps> = ({
  step,
  locale,
  isCompletedByStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = resolveStepPalette(step);
  const isNewton = step.sandboxKind === 'newton_motion_track';

  // Ohm Circuit State
  const targetV = Number(step.sandboxParams?.targetV || 12);
  const targetR = Number(step.sandboxParams?.targetR || 4);
  const [voltage, setVoltage] = useState<number>(6);
  const [resistance, setResistance] = useState<number>(targetR);
  const [electronPhase, setElectronPhase] = useState<number>(0);

  // Newton Cart State
  const [forceN, setForceN] = useState<number>(Number(step.sandboxParams?.forceN || 12));
  const [massKg, setMassKg] = useState<number>(Number(step.sandboxParams?.massKg || 3));
  const [hasFriction, setHasFriction] = useState<boolean>(false);
  const [cartX, setCartX] = useState<number>(0);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [solvedLocal, setSolvedLocal] = useState<boolean>(false);

  const solved = isCompletedByStudent || solvedLocal;

  const currentAmp = Number((voltage / Math.max(1, resistance)).toFixed(2));
  const frictionForce = hasFriction ? Math.min(forceN, massKg * 2) : 0;
  const netForce = Math.max(0, forceN - frictionForce);
  const accel = Number((netForce / Math.max(1, massKg)).toFixed(2));

  // Animate electrons in Ohm circuit continuously proportional to current I
  useEffect(() => {
    if (isNewton) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setElectronPhase((p) => (p + dt * currentAmp * 42) % 440);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isNewton, currentAmp]);

  // Animate Newton cart launch across track (x = 1/2 a t^2)
  useEffect(() => {
    if (!isNewton || !isLaunching) return;
    let raf = 0;
    const t0 = performance.now();
    const run = (now: number) => {
      const tSec = (now - t0) / 1000;
      const dist = Math.min(230, 0.5 * Math.max(0.4, accel) * tSec * tSec * 36);
      setCartX(dist);
      if (dist < 230 && tSec < 4.5) {
        raf = requestAnimationFrame(run);
      } else {
        setIsLaunching(false);
        if (!solved) {
          setSolvedLocal(true);
          onInteractionResult({
            stepId: step.id,
            isCorrect: true,
            userAnswer: `F=${forceN}N, m=${massKg}kg → a=${accel} m/s²`,
            expectedAnswer: `a = ${accel} m/s²`,
            feedbackToSpeak:
              step.successVoiceFeedback ||
              loc(
                locale,
                `Experiment launched! With net force ${netForce} Newtons on ${massKg} kg, the cart accelerated at ${accel} meters per second squared.`,
                `Eksperimen berhasil diluncurkan! Dengan gaya bersih ${netForce} Newton pada beban ${massKg} kg, kereta melesat dengan percepatan ${accel} m/s².`
              ),
          });
        }
      }
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [isNewton, isLaunching, accel, forceN, massKg, netForce, solved, step.id, step.successVoiceFeedback, locale, onInteractionResult]);

  if (isNewton) {
    return (
      <div
        data-testid="wb-experiment-newton-lab"
        className="rounded-2xl border-2 bg-white/95 p-3.5 sm:p-4 shadow-xs space-y-3"
        style={{ borderColor: `${pal.ink}40` }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: pal.ink }}>
            {loc(locale, 'NEWTON DYNAMICS TRACK', 'LINTASAN EKSPERIMEN GAYA NEWTON')}
          </span>
          {onSkipContinue && !solved && (
            <button type="button" onClick={onSkipContinue} className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#CBD5E1] text-[#475569] cursor-pointer">
              {loc(locale, 'Next ›', 'Lanjut ›')}
            </button>
          )}
        </div>

        <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
          <MathText text={step.title || loc(locale, 'Adjust Force & Mass, Then Launch the Cart!', 'Atur Gaya & Massa Beban, Lalu Luncurkan Kereta!')} active />
        </div>

        <svg viewBox="0 0 360 156" className="w-full h-[150px] rounded-2xl border border-[#CBD5E1] bg-gradient-to-b from-[#F8FAFC] to-[#E2E8F0]/55">
          {/* Track surface */}
          <line
            x1={18}
            y1={124}
            x2={342}
            y2={124}
            stroke={hasFriction ? '#78350F' : '#38BDF8'}
            strokeWidth={hasFriction ? 5 : 4}
            strokeDasharray={hasFriction ? '6 3' : undefined}
          />
          <text x={24} y={142} fontSize="10" fontWeight="800" fill={hasFriction ? '#92400E' : '#0369A1'}>
            {hasFriction ? 'Permukaan: Aspal Kasar (Ada Gesekan)' : 'Permukaan: Es Licin (Tanpa Gesekan)'}
          </text>

          {/* Moving Cart + Mass Stack */}
          <g transform={`translate(${36 + cartX}, 78)`}>
            <rect x={0} y={8} width={58} height={28} rx={7} fill="#2563EB" stroke="#1E3A8A" strokeWidth={2} />
            <rect x={12} y={-12} width={34} height={20} rx={4} fill="#F59E0B" stroke="#B45309" strokeWidth={1.8} />
            <text x={29} y={2} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFFFFF">
              {massKg} kg
            </text>
            <circle cx={14} cy={40} r={6} fill="#1E293B" />
            <circle cx={44} cy={40} r={6} fill="#1E293B" />
            {/* Force Vector Arrow */}
            {forceN > 0 && (
              <g>
                <line x1={62} y1={22} x2={62 + Math.min(54, forceN * 1.4)} y2={22} stroke="#16A34A" strokeWidth={3.5} />
                <polygon
                  points={`${62 + Math.min(54, forceN * 1.4)},16 ${70 + Math.min(54, forceN * 1.4)},22 ${62 + Math.min(54, forceN * 1.4)},28`}
                  fill="#16A34A"
                />
                <text x={66} y={13} fontSize="9.5" fontWeight="800" fill="#15803D">
                  F={forceN}N
                </text>
              </g>
            )}
          </g>

          <rect x={228} y={12} width={120} height={36} rx={9} fill="#FFFFFF" stroke="#CBD5E1" />
          <text x={288} y={27} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#64748B">
            PERCEPATAN (a = F/m)
          </text>
          <text x={288} y={41} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0F172A">
            {accel} m/s²
          </text>
        </svg>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2">
            <div className="flex justify-between text-xs font-bold text-[#1E293B]">
              <span>Gaya Dorong (F):</span>
              <span className="text-[#15803D]">{forceN} N</span>
            </div>
            <input
              type="range"
              min={4}
              max={36}
              step={2}
              value={forceN}
              onChange={(e) => {
                setCartX(0);
                setForceN(Number(e.target.value));
              }}
              className="w-full accent-[#16A34A] cursor-pointer"
            />
          </div>
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2">
            <div className="flex justify-between text-xs font-bold text-[#1E293B]">
              <span>Massa Beban (m):</span>
              <span className="text-[#B45309]">{massKg} kg</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={massKg}
              onChange={(e) => {
                setCartX(0);
                setMassKg(Number(e.target.value));
              }}
              className="w-full accent-[#D97706] cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setCartX(0);
              setHasFriction((f) => !f);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] cursor-pointer"
          >
            {hasFriction ? 'Ganti ke Es Licin' : 'Uji Gesekan Aspal'}
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsLaunching(false);
                setCartX(0);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#CBD5E1] bg-white text-[#475569] cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              data-testid="newton-launch-btn"
              onClick={() => {
                setCartX(0);
                setIsLaunching(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#15803D] text-white cursor-pointer shadow-2xs"
            >
              ▶ {loc(locale, 'Launch Cart!', 'Dorong & Luncurkan!')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ohm's Law Live Circuit Simulator
  const bulbGlow = Math.min(1, currentAmp / 5);
  const checkOhmTarget = (nextV: number, nextR: number) => {
    const targetI = Number((targetV / Math.max(1, targetR)).toFixed(2));
    const curI = Number((nextV / Math.max(1, nextR)).toFixed(2));
    if (!solved && Math.abs(curI - targetI) < 0.05) {
      setSolvedLocal(true);
      onInteractionResult({
        stepId: step.id,
        isCorrect: true,
        userAnswer: `V=${nextV}V, R=${nextR}Ω → I=${curI}A`,
        expectedAnswer: `I = ${targetI} A`,
        feedbackToSpeak:
          step.successVoiceFeedback ||
          loc(
            locale,
            `Circuit matched! At ${nextV} Volts and ${nextR} Ohms, the current flows at ${curI} Amperes and lights the bulb cleanly.`,
            `Rangkaian tepat! Pada tegangan ${nextV} Volt dan hambatan ${nextR} Ohm, arus mengalir sebesar ${curI} Ampere dan menyalakan lampu dengan stabil.`
          ),
      });
    }
  };

  return (
    <div
      data-testid="wb-experiment-ohm-circuit-lab"
      className="rounded-2xl border-2 bg-white/95 p-3.5 sm:p-4 shadow-xs space-y-3"
      style={{ borderColor: `${pal.ink}40` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: pal.ink }}>
          {loc(locale, 'LIVE OHM CIRCUIT LAB', 'LAB RANGKAIAN LISTRIK HIDUP')}
        </span>
        {onSkipContinue && !solved && (
          <button type="button" onClick={onSkipContinue} className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#CBD5E1] text-[#475569] cursor-pointer">
            {loc(locale, 'Next ›', 'Lanjut ›')}
          </button>
        )}
      </div>

      <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
        <MathText text={step.title || loc(locale, 'Experiment with Voltage (V) & Resistance (R)', 'Eksperimen Tegangan Baterai (V) & Hambatan (R)')} active />
      </div>

      <svg viewBox="0 0 360 172" className="w-full h-[166px] rounded-2xl border border-[#CBD5E1] bg-[#0F172A]">
        {/* Wire Loop */}
        <rect x={46} y={32} width={268} height={112} rx={18} fill="none" stroke="#475569" strokeWidth={5} />
        {/* Animated Electron Flow */}
        <rect
          x={46}
          y={32}
          width={268}
          height={112}
          rx={18}
          fill="none"
          stroke="#38BDF8"
          strokeWidth={3.2}
          strokeDasharray="6 16"
          strokeDashoffset={-electronPhase}
        />

        {/* Battery (Left) */}
        <rect x={24} y={66} width={44} height={44} rx={8} fill="#1E293B" stroke="#F59E0B" strokeWidth={2} />
        <text x={46} y={85} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FCD34D">
          BATERAI
        </text>
        <text x={46} y={100} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#FFFFFF">
          {voltage} V
        </text>

        {/* Glowing Light Bulb (Top Center) */}
        <circle cx={180} cy={32} r={18 + bulbGlow * 18} fill="#FACC15" opacity={0.18 + bulbGlow * 0.45} />
        <circle cx={180} cy={32} r={15} fill={bulbGlow > 0.15 ? '#FEF08A' : '#334155'} stroke="#F59E0B" strokeWidth={2.2} />
        <path d="M174 35 L178 26 L182 35 L186 26" fill="none" stroke="#B45309" strokeWidth={1.8} />

        {/* Resistor (Bottom Center) */}
        <rect x={140} y={132} width={80} height={24} rx={6} fill="#FEF3C7" stroke="#D97706" strokeWidth={2} />
        <text x={180} y={148} textAnchor="middle" fontSize="11" fontWeight="800" fill="#78350F">
          R = {resistance} Ω
        </text>

        {/* Ammeter Readout (Right) */}
        <rect x={282} y={64} width={64} height={48} rx={10} fill="#064E3B" stroke="#10B981" strokeWidth={2} />
        <text x={314} y={81} textAnchor="middle" fontSize="9" fontWeight="800" fill="#A7F3D0">
          ARUS (I)
        </text>
        <text x={314} y={99} textAnchor="middle" fontSize="13" fontWeight="800" fill="#FFFFFF">
          {currentAmp} A
        </text>
      </svg>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2">
          <div className="flex justify-between text-xs font-bold text-[#1E293B]">
            <span>Tegangan Baterai (V):</span>
            <span className="text-[#B45309]">{voltage} Volt</span>
          </div>
          <input
            data-testid="ohm-voltage-slider"
            type="range"
            min={2}
            max={24}
            step={2}
            value={voltage}
            onChange={(e) => {
              const nv = Number(e.target.value);
              setVoltage(nv);
              checkOhmTarget(nv, resistance);
            }}
            className="w-full accent-[#D97706] cursor-pointer"
          />
        </div>
        <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2">
          <div className="flex justify-between text-xs font-bold text-[#1E293B]">
            <span>Hambatan Resistor (R):</span>
            <span className="text-[#1D4ED8]">{resistance} Ω</span>
          </div>
          <input
            data-testid="ohm-resistance-slider"
            type="range"
            min={1}
            max={12}
            step={1}
            value={resistance}
            onChange={(e) => {
              const nr = Number(e.target.value);
              setResistance(nr);
              checkOhmTarget(voltage, nr);
            }}
            className="w-full accent-[#2563EB] cursor-pointer"
          />
        </div>
      </div>

      <p className="text-xs text-[#475569] border-l-2 border-[#F59E0B] pl-2.5">
        {step.socraticPrompt ||
          loc(
            locale,
            `Set Voltage to ${targetV} V and Resistance to ${targetR} Ω to observe how electron speed and bulb brightness respond!`,
            `Naik-turunkan Tegangan (target ${targetV} V) dan Hambatan (${targetR} Ω), lalu amati laju elektron dan terang lampu secara langsung!`
          )}
      </p>
    </div>
  );
};

/* ============================================================================
 * 4. VISUAL FRACTION GRID SLICER & MIXER (`fraction_grid_mixer`)
 * ============================================================================ */
function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

export const FractionGridVisualMixer: React.FC<SandboxLabProps> = ({
  step,
  locale,
  isCompletedByStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = resolveStepPalette(step);
  const a = Number(step.sandboxParams?.n1 || 2);
  const b = Math.max(2, Math.min(6, Number(step.sandboxParams?.d1 || 3)));
  const c = Number(step.sandboxParams?.n2 || 1);
  const d = Math.max(2, Math.min(6, Number(step.sandboxParams?.d2 || 4)));
  const op = String(step.sandboxParams?.op || '+') === '-' ? '-' : '+';

  const [crossSliced, setCrossSliced] = useState<boolean>(false);
  const [combined, setCombined] = useState<boolean>(false);
  const [solvedLocal, setSolvedLocal] = useState<boolean>(false);
  const solved = isCompletedByStudent || solvedLocal;

  const lcd = (b * d) / gcd(b, d);
  const eq1 = a * (lcd / b);
  const eq2 = c * (lcd / d);
  const resNum = op === '+' ? eq1 + eq2 : Math.max(0, eq1 - eq2);

  return (
    <div
      data-testid="wb-experiment-fraction-mixer-lab"
      className="rounded-2xl border-2 bg-white/95 p-3.5 sm:p-4 shadow-xs space-y-3"
      style={{ borderColor: `${pal.ink}40` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: pal.ink }}>
          {loc(locale, 'VISUAL FRACTION SLICER', 'LAB POTONG & GABUNG PECAHAN')}
        </span>
        {onSkipContinue && !solved && (
          <button type="button" onClick={onSkipContinue} className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#CBD5E1] text-[#475569] cursor-pointer">
            {loc(locale, 'Next ›', 'Lanjut ›')}
          </button>
        )}
      </div>

      <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
        <MathText text={step.title || `Eksperimen Pecahan Visual: ${a}/${b} ${op} ${c}/${d}`} active />
      </div>

      <div className="grid grid-cols-3 gap-2 items-center text-center">
        {/* Box 1: a/b */}
        <div className="space-y-1">
          <div className="text-xs font-extrabold text-[#0369A1]">
            {crossSliced ? `${eq1}/${lcd}` : `${a}/${b}`}
          </div>
          <div
            className="grid border-2 border-[#0284C7] rounded-xl overflow-hidden aspect-square bg-white"
            style={{
              gridTemplateColumns: `repeat(${b}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${crossSliced ? lcd / b : 1}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: b * (crossSliced ? lcd / b : 1) }).map((_, idx) => {
              const col = idx % b;
              const active = col < a;
              return (
                <div
                  key={idx}
                  className={`border border-[#93C5FD]/60 transition-colors duration-300 ${
                    active ? 'bg-[#38BDF8]' : 'bg-white'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Box 2: c/d */}
        <div className="space-y-1">
          <div className="text-xs font-extrabold text-[#15803D]">
            {op} {crossSliced ? `${eq2}/${lcd}` : `${c}/${d}`}
          </div>
          <div
            className="grid border-2 border-[#16A34A] rounded-xl overflow-hidden aspect-square bg-white"
            style={{
              gridTemplateRows: `repeat(${d}, minmax(0, 1fr))`,
              gridTemplateColumns: `repeat(${crossSliced ? lcd / d : 1}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: d * (crossSliced ? lcd / d : 1) }).map((_, idx) => {
              const cols = crossSliced ? lcd / d : 1;
              const row = Math.floor(idx / cols);
              const active = row < c;
              return (
                <div
                  key={idx}
                  className={`border border-[#86EFAC]/60 transition-colors duration-300 ${
                    active ? 'bg-[#4ADE80]' : 'bg-white'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Box 3: Combined Result */}
        <div className="space-y-1">
          <div className="text-xs font-extrabold text-[#6D28D9]">
            = {combined ? `${resNum}/${lcd}` : '?'}
          </div>
          <div
            className="grid border-2 border-dashed border-[#7C3AED] rounded-xl overflow-hidden aspect-square bg-[#FAF5FF]"
            style={{
              gridTemplateColumns: `repeat(${b}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${Math.max(1, lcd / b)}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: lcd }).map((_, idx) => {
              const filled = combined && idx < resNum;
              return (
                <div
                  key={idx}
                  className={`border border-[#DDD6FE] transition-all duration-300 ${
                    filled ? (idx < eq1 ? 'bg-[#38BDF8]' : 'bg-[#4ADE80]') : 'bg-transparent'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="fraction-slice-kpk-btn"
          onClick={() => setCrossSliced(true)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold border cursor-pointer min-h-[38px] ${
            crossSliced ? 'bg-[#E0F2FE] text-[#0369A1] border-[#38BDF8]' : 'bg-[#0284C7] text-white border-[#0284C7]'
          }`}
        >
          1. {loc(locale, `Slice Both into ${lcd} Equal Grids`, `Potong Silang Sama Besar (Per ${lcd})`)}
        </button>
        <button
          type="button"
          data-testid="fraction-combine-btn"
          disabled={!crossSliced}
          onClick={() => {
            setCombined(true);
            if (!solved) {
              setSolvedLocal(true);
              onInteractionResult({
                stepId: step.id,
                isCorrect: true,
                userAnswer: `${resNum}/${lcd}`,
                expectedAnswer: `${resNum}/${lcd}`,
                feedbackToSpeak:
                  step.successVoiceFeedback ||
                  loc(
                    locale,
                    `Crystal clear! Once sliced into ${lcd} equal cells, ${eq1}/${lcd} ${op} ${eq2}/${lcd} combines directly into ${resNum}/${lcd}.`,
                    `Terlihat jelas secara visual! Setelah kedua kotak dipotong sama besar menjadi per ${lcd}, ${eq1}/${lcd} ${op} ${eq2}/${lcd} langsung tergabung menjadi ${resNum}/${lcd}.`
                  ),
              });
            }
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold border cursor-pointer min-h-[38px] ${
            !crossSliced
              ? 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed'
              : 'bg-[#15803D] text-white border-[#15803D]'
          }`}
        >
          2. {loc(locale, 'Pour & Combine Grids!', 'Gabungkan Petaknya!')}
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. ALGEBRA TWO-PAN BALANCE EXPERIMENT (`algebra_live_scale`)
 *    Apply operations to BOTH pans (or test one-sided imbalance!) to isolate x!
 * ============================================================================ */
export const AlgebraLiveScaleLab: React.FC<SandboxLabProps> = ({
  step,
  locale,
  isCompletedByStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = resolveStepPalette(step);
  const initA = Math.max(1, Number(step.sandboxParams?.a || 3));
  const initB = Number(step.sandboxParams?.b ?? -5); // ax + b = c
  const initC = Number(step.sandboxParams?.c ?? 16);
  const trueX = (initC - initB) / initA;

  const [coefX, setCoefX] = useState<number>(initA);
  const [constLeft, setConstLeft] = useState<number>(initB);
  const [constRight, setConstRight] = useState<number>(initC);
  const [imbalanceNote, setImbalanceNote] = useState<string | null>(null);
  const [tiltDeg, setTiltDeg] = useState<number>(0);
  const [solvedLocal, setSolvedLocal] = useState<boolean>(false);
  const solved = isCompletedByStudent || solvedLocal;

  const applyBothSides = (kind: 'addConst' | 'divCoef', val: number) => {
    setImbalanceNote(null);
    setTiltDeg(0);
    if (kind === 'addConst') {
      const nl = constLeft + val;
      const nr = constRight + val;
      setConstLeft(nl);
      setConstRight(nr);
    } else if (kind === 'divCoef' && constLeft === 0 && coefX % val === 0 && constRight % val === 0) {
      const na = coefX / val;
      const nr = constRight / val;
      setCoefX(na);
      setConstRight(nr);
      if (na === 1 && !solved) {
        setSolvedLocal(true);
        onInteractionResult({
          stepId: step.id,
          isCorrect: true,
          userAnswer: `x = ${nr}`,
          expectedAnswer: `x = ${trueX}`,
          feedbackToSpeak:
            step.successVoiceFeedback ||
            loc(
              locale,
              `Balanced! By doing the exact same inverse operation on both pans, x stands alone equal to ${nr}!`,
              `Timbangan tetap seimbang! Dengan melakukan operasi kebalikan yang sama di kedua ruas, variabel x berdiri sendiri bernilai ${nr}!`
            ),
        });
      }
    }
  };

  const fmtLeft = `${coefX === 1 ? 'x' : `${coefX}x`}${constLeft === 0 ? '' : constLeft > 0 ? ` + ${constLeft}` : ` - ${Math.abs(constLeft)}`}`;

  return (
    <div
      data-testid="wb-experiment-algebra-scale-lab"
      className="rounded-2xl border-2 bg-white/95 p-3.5 sm:p-4 shadow-xs space-y-3"
      style={{ borderColor: `${pal.ink}40` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: pal.ink }}>
          {loc(locale, 'ALGEBRA BALANCE LAB', 'TIMBANGAN EKSPERIMEN ALJABAR')}
        </span>
        {onSkipContinue && !solved && (
          <button type="button" onClick={onSkipContinue} className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#CBD5E1] text-[#475569] cursor-pointer">
            {loc(locale, 'Next ›', 'Lanjut ›')}
          </button>
        )}
      </div>

      <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
        <MathText text={step.title || loc(locale, 'Isolate x Without Tilting the Scale!', 'Sendirikan Variabel x Tanpa Membuat Timbangan Miring!')} active />
      </div>

      <svg viewBox="0 0 360 150" className="w-full h-[142px] rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC]">
        {/* Fulcrum Triangle */}
        <polygon points="180,98 162,138 198,138" fill="#475569" />
        {/* Tilting Beam */}
        <g transform={`rotate(${tiltDeg}, 180, 98)`} style={{ transition: 'transform 280ms ease-out' }}>
          <line x1={52} y1={98} x2={308} y2={98} stroke="#1E293B" strokeWidth={5} strokeLinecap="round" />
          {/* Left Pan */}
          <rect x={30} y={54} width={108} height={38} rx={10} fill="#EDE9FE" stroke="#7C3AED" strokeWidth={2.2} />
          <text x={84} y={78} textAnchor="middle" fontSize="14.5" fontWeight="800" fill="#4C1D95">
            {fmtLeft}
          </text>
          {/* Right Pan */}
          <rect x={222} y={54} width={108} height={38} rx={10} fill="#DCFCE7" stroke="#16A34A" strokeWidth={2.2} />
          <text x={276} y={78} textAnchor="middle" fontSize="14.5" fontWeight="800" fill="#14532D">
            {constRight}
          </text>
        </g>
      </svg>

      {imbalanceNote && (
        <div className="px-3 py-2 rounded-xl bg-[#FFFBEB] border border-[#F59E0B] text-xs font-bold text-[#92400E]">
          ⚠ {imbalanceNote}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {initB !== 0 && constLeft !== 0 && (
          <button
            type="button"
            data-testid="algebra-op-cancel-const"
            onClick={() => applyBothSides('addConst', -constLeft)}
            className="px-3 py-2 rounded-xl text-xs font-extrabold bg-[#1D4ED8] text-white cursor-pointer min-h-[36px]"
          >
            {constLeft < 0 ? `+ ${Math.abs(constLeft)} di Kedua Ruas` : `- ${constLeft} di Kedua Ruas`}
          </button>
        )}
        {constLeft === 0 && coefX > 1 && (
          <button
            type="button"
            data-testid="algebra-op-div-coef"
            onClick={() => applyBothSides('divCoef', coefX)}
            className="px-3 py-2 rounded-xl text-xs font-extrabold bg-[#15803D] text-white cursor-pointer min-h-[36px]"
          >
            ÷ {coefX} di Kedua Ruas
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setTiltDeg(-11);
            setImbalanceNote(
              loc(
                locale,
                'Tilt alert! Adding to ONLY the left pan breaks equality. Always apply operations to BOTH sides!',
                'Timbangan miring! Kalau hanya menambah satu sisi saja, persamaannya rusak. Operasi wajib dilakukan di KEDUA ruas!'
              )
            );
          }}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B] cursor-pointer min-h-[36px]"
        >
          {loc(locale, 'Test: Add Left Side Only!', 'Uji Coba: Tambah Kiri Saja!')}
        </button>
        <button
          type="button"
          onClick={() => {
            setCoefX(initA);
            setConstLeft(initB);
            setConstRight(initC);
            setTiltDeg(0);
            setImbalanceNote(null);
          }}
          className="px-2.5 py-2 rounded-xl text-xs font-bold bg-white border border-[#CBD5E1] text-[#475569] cursor-pointer min-h-[36px]"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * 6. GRAMMAR & TENSE LIVE SENTENCE MORPHER (`grammar_time_morph`)
 *    Tactile time-machine & polarity morpher: toggle (+)/(-)/(?) & Regular/Irregular
 *    and watch auxiliaries physically absorb/release the tense marker!
 * ============================================================================ */
export const GrammarTimeMorphSandbox: React.FC<SandboxLabProps> = ({
  step,
  locale,
  isCompletedByStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = resolveStepPalette(step);
  const tenseMode = String(step.sandboxParams?.tenseMode || 'simple_past'); // 'simple_past' | 'past_vs_perfect' | 'present_do_be'

  const [polarity, setPolarity] = useState<'pos' | 'neg' | 'q'>('pos');
  const [verbKey, setVerbKey] = useState<'go' | 'watch' | 'eat'>('go');
  const [timeFrame, setTimeFrame] = useState<'past' | 'perfect'>('past');
  const [trapTested, setTrapTested] = useState<boolean>(false);
  const [exploredSet, setExploredSet] = useState<Set<string>>(new Set(['pos']));
  const [solvedLocal, setSolvedLocal] = useState<boolean>(false);
  const solved = isCompletedByStudent || solvedLocal;

  const VERBS = {
    go: { v1: 'go', v2: 'went', v3: 'gone', obj: 'to Bali', idMeaning: 'pergi ke Bali', kind: 'Irregular' },
    watch: { v1: 'watch', v2: 'watched', v3: 'watched', obj: 'the movie', idMeaning: 'menonton film itu', kind: 'Regular (+ed)' },
    eat: { v1: 'eat', v2: 'ate', v3: 'eaten', obj: 'sushi', idMeaning: 'makan sushi', kind: 'Irregular' },
  };
  const v = VERBS[verbKey];

  const recordExplore = (nextPol: 'pos' | 'neg' | 'q', nextTrap = false) => {
    setTrapTested(nextTrap);
    setPolarity(nextPol);
    const updated = new Set(exploredSet);
    updated.add(nextTrap ? 'trap' : nextPol);
    setExploredSet(updated);
    if (!solved && (nextPol === 'neg' || nextPol === 'q' || updated.size >= 2)) {
      setSolvedLocal(true);
      onInteractionResult({
        stepId: step.id,
        isCorrect: true,
        userAnswer: `${nextPol.toUpperCase()} (${v.v1}/${v.v2})`,
        expectedAnswer: 'Eksperimen Mutasi Kalimat Selesai',
        feedbackToSpeak:
          step.successVoiceFeedback ||
          loc(
            locale,
            `Notice that transformation! As soon as "did" enters in negative or question form, it absorbs the past marker so "${v.v2}" snaps right back to base "${v.v1}"!`,
            `Lihat mutasinya! Begitu kata bantu "did" masuk pada kalimat negatif atau tanya, magnet lampaunya pindah ke "did", sehingga "${v.v2}" langsung kembali ke bentuk dasar "${v.v1}"!`
          ),
      });
    }
  };

  const tokens = useMemo(() => {
    if (tenseMode === 'past_vs_perfect' && timeFrame === 'perfect') {
      if (polarity === 'pos') {
        return [
          { word: 'She', badge: 'Subjek', color: '#E0F2FE', text: '#0369A1' },
          { word: 'has', badge: 'Jembatan Kini', color: '#DCFCE7', text: '#15803D' },
          { word: v.v3, badge: 'Verb 3', color: '#EDE9FE', text: '#5B21B6' },
          { word: `${v.obj} twice.`, badge: 'Pengalaman', color: '#F1F5F9', text: '#334155' },
        ];
      }
      return [
        { word: 'Has', badge: 'Tanya Kini', color: '#DCFCE7', text: '#15803D' },
        { word: 'she', badge: 'Subjek', color: '#E0F2FE', text: '#0369A1' },
        { word: v.v3, badge: 'Tetap Verb 3', color: '#EDE9FE', text: '#5B21B6' },
        { word: `${v.obj} yet?`, badge: 'Sampai Kini', color: '#F1F5F9', text: '#334155' },
      ];
    }

    if (trapTested) {
      return [
        { word: 'She', badge: 'Subjek', color: '#E0F2FE', text: '#0369A1' },
        { word: 'did not', badge: '⚡ LAMPAU #1', color: '#FEE2E2', text: '#991B1B' },
        { word: v.v2, badge: '⚡ TABRAKAN V2!', color: '#EF4444', text: '#FFFFFF' },
        { word: `${v.obj} yesterday.`, badge: 'Waktu Lampau', color: '#F1F5F9', text: '#334155' },
      ];
    }

    if (polarity === 'pos') {
      return [
        { word: 'She', badge: 'Subjek', color: '#E0F2FE', text: '#0369A1' },
        { word: v.v2, badge: `Verb 2 (${v.kind})`, color: '#DCFCE7', text: '#14532D' },
        { word: `${v.obj} yesterday.`, badge: 'Titik Lampau', color: '#FEF3C7', text: '#92400E' },
      ];
    }
    if (polarity === 'neg') {
      return [
        { word: 'She', badge: 'Subjek', color: '#E0F2FE', text: '#0369A1' },
        { word: 'did not', badge: 'Magnet Lampau', color: '#FDE68A', text: '#92400E' },
        { word: v.v1, badge: 'Kembali Verb 1!', color: '#DCFCE7', text: '#15803D' },
        { word: `${v.obj} yesterday.`, badge: 'Titik Lampau', color: '#F1F5F9', text: '#334155' },
      ];
    }
    return [
      { word: 'Did', badge: 'Magnet Lampau', color: '#FDE68A', text: '#92400E' },
      { word: 'she', badge: 'Subjek', color: '#E0F2FE', text: '#0369A1' },
      { word: v.v1, badge: 'Kembali Verb 1!', color: '#DCFCE7', text: '#15803D' },
      { word: `${v.obj} yesterday?`, badge: 'Titik Lampau', color: '#F1F5F9', text: '#334155' },
    ];
  }, [tenseMode, timeFrame, polarity, trapTested, v]);

  return (
    <div
      data-testid="wb-experiment-grammar-morph-lab"
      className="rounded-2xl border-2 bg-white/95 p-3.5 sm:p-4 shadow-xs space-y-3"
      style={{ borderColor: `${pal.ink}40` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: pal.ink }}>
          {loc(locale, 'LIVE SENTENCE MORPHER LAB', 'MESIN EKSPERIMEN MUTASI KALIMAT')}
        </span>
        {onSkipContinue && !solved && (
          <button type="button" onClick={onSkipContinue} className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#CBD5E1] text-[#475569] cursor-pointer">
            {loc(locale, 'Next ›', 'Lanjut ›')}
          </button>
        )}
      </div>

      <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
        <MathText text={step.title || loc(locale, 'Experiment: Flip (+), (-), (?) & Watch the Verb Morph!', 'Uji Sendiri: Ubah (+), (-), (?) & Lihat Kata Kerjanya Bermutasi!')} active />
      </div>

      {tenseMode === 'past_vs_perfect' && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTimeFrame('past');
              setTrapTested(false);
            }}
            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
              timeFrame === 'past' ? 'bg-[#0284C7] text-white border-[#0284C7]' : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]'
            }`}
          >
            Titik Lampau Selesai (Yesterday)
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeFrame('perfect');
              setTrapTested(false);
              recordExplore('pos');
            }}
            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
              timeFrame === 'perfect' ? 'bg-[#15803D] text-white border-[#15803D]' : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]'
            }`}
          >
            Berdampak ke Kini (Present Perfect)
          </button>
        </div>
      )}

      {/* Polarity & Trap Experiment Controls */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          data-testid="morph-btn-pos"
          onClick={() => recordExplore('pos', false)}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer min-h-[36px] ${
            !trapTested && polarity === 'pos' ? 'bg-[#15803D] text-white border-[#15803D]' : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]'
          }`}
        >
          (+) Positif
        </button>
        <button
          type="button"
          data-testid="morph-btn-neg"
          onClick={() => recordExplore('neg', false)}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer min-h-[36px] ${
            !trapTested && polarity === 'neg' ? 'bg-[#D97706] text-white border-[#D97706]' : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]'
          }`}
        >
          (-) Negatif
        </button>
        <button
          type="button"
          data-testid="morph-btn-q"
          onClick={() => recordExplore('q', false)}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer min-h-[36px] ${
            !trapTested && polarity === 'q' ? 'bg-[#6D28D9] text-white border-[#6D28D9]' : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]'
          }`}
        >
          (?) Tanya
        </button>
        <button
          type="button"
          data-testid="morph-btn-trap"
          onClick={() => recordExplore('neg', true)}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer min-h-[36px] ${
            trapTested ? 'bg-[#DC2626] text-white border-[#DC2626]' : 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]'
          }`}
        >
          ⚡ Uji Tabrakan Salah (did not {v.v2})
        </button>
      </div>

      {/* Verb Switcher */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <span className="font-bold text-[#64748B]">{loc(locale, 'Swap Verb:', 'Ganti Kata Kerja:')}</span>
        {(['go', 'watch', 'eat'] as const).map((vk) => (
          <button
            key={vk}
            type="button"
            onClick={() => setVerbKey(vk)}
            className={`px-2.5 py-1 rounded-lg font-extrabold border cursor-pointer ${
              verbKey === vk ? 'bg-[#1E293B] text-white border-[#1E293B]' : 'bg-white text-[#334155] border-[#CBD5E1]'
            }`}
          >
            {VERBS[vk].v1} → {VERBS[vk].v2}
          </button>
        ))}
      </div>

      {/* Animated Magnetic Token Stage */}
      <div className="rounded-2xl border-2 border-[#E2E8F0] bg-[#FFFDF9] p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {tokens.map((tk, i) => (
            <div
              key={`${tk.word}-${i}`}
              className="rounded-xl px-3 py-2 border transition-all duration-200 shadow-2xs"
              style={{ backgroundColor: tk.color, color: tk.text, borderColor: `${tk.text}40` }}
            >
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider opacity-85">{tk.badge}</div>
              <div className="text-base font-extrabold">{tk.word}</div>
            </div>
          ))}
        </div>

        {trapTested ? (
          <div className="px-3 py-2 rounded-xl bg-[#FEF2F2] border border-[#F87171] text-xs font-bold text-[#991B1B]">
            ✕ Tabrakan Lampau Ganda! Kata bantu <strong>"did"</strong> sudah membawa penanda lampau, sehingga memakai <strong>"{v.v2}"</strong> lagi membuat kalimat bertabrakan. Ketuk <strong>(-) Negatif</strong> untuk melihat bentuk benarnya!
          </div>
        ) : (
          <div className="text-xs font-bold text-[#334155]">
            {polarity === 'pos'
              ? `Kalimat positif memakai Verb 2 (${v.v2}) — artinya: "Dia ${v.idMeaning} kemarin."`
              : `Perhatikan: begitu muncul "${polarity === 'neg' ? 'did not' : 'Did'}", penanda lampau ditarik oleh "did" sehingga "${v.v2}" berubah kembali menjadi Verb 1 "${v.v1}"!`}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * EXPERIMENT SANDBOX ROUTER (`ExperimentSandboxRouter`)
 * ============================================================================ */
export const ExperimentSandboxRouter: React.FC<SandboxLabProps> = (props) => {
  const kind: ExperimentSandboxKind = useMemo(() => {
    if (props.step.sandboxKind) return props.step.sandboxKind;
    const blob = `${props.step.title || ''} ${props.step.socraticPrompt || ''}`.toLowerCase();
    if (/kubus|balok|jaring|bangun\s*ruang|prisma|cube/i.test(blob)) return 'cube_3d_net';
    if (/segitiga|pythagor|lingkaran|sudut|geometri/i.test(blob)) return 'geometry_2d_morph';
    if (/ohm|tegangan|listrik|arus|resistor/i.test(blob)) return 'circuit_ohm_live';
    if (/newton|gaya|massa|percepatan|kereta|gerak/i.test(blob)) return 'newton_motion_track';
    if (/pecahan|fraction|kpk|penyebut/i.test(blob)) return 'fraction_grid_mixer';
    if (/aljabar|persamaan|ruas|\dx/i.test(blob)) return 'algebra_live_scale';
    return 'grammar_time_morph';
  }, [props.step.sandboxKind, props.step.title, props.step.socraticPrompt]);

  switch (kind) {
    case 'cube_3d_net':
      return <CubeNet3DFoldingLab {...props} />;
    case 'geometry_2d_morph':
      return <Geometry2DVertexSandbox {...props} />;
    case 'circuit_ohm_live':
    case 'newton_motion_track':
      return <PhysicsLiveSimulatorLab {...props} step={{ ...props.step, sandboxKind: kind }} />;
    case 'fraction_grid_mixer':
      return <FractionGridVisualMixer {...props} />;
    case 'algebra_live_scale':
      return <AlgebraLiveScaleLab {...props} />;
    case 'grammar_time_morph':
    default:
      return <GrammarTimeMorphSandbox {...props} />;
  }
};
