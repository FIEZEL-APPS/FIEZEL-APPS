import { graphlib, layout } from '@dagrejs/dagre';
import type { WhiteboardStepCommand, WhiteboardVectorShape } from '../types/voiceCall';

export type DagreGraphNode = NonNullable<WhiteboardStepCommand['graphNodes']>[number];
export type DagreGraphEdge = NonNullable<WhiteboardStepCommand['graphEdges']>[number];

const DEFAULT_NODE_PALETTE = [
  { fill: '#DBEAFE', stroke: '#1D4ED8' },
  { fill: '#DCFCE7', stroke: '#15803D' },
  { fill: '#FEF3C7', stroke: '#B45309' },
  { fill: '#EDE9FE', stroke: '#6D28D9' },
  { fill: '#FCE7F3', stroke: '#BE185D' },
  { fill: '#CFFAFE', stroke: '#0E7490' },
];

function wrapEstimate(text: string, maxChars: number, maxLines: number): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function measureNodeBox(label: string, sublabel?: string): { width: number; height: number } {
  const lblLines = wrapEstimate(label, 20, 4);
  const subLines = sublabel ? wrapEstimate(sublabel, 24, 4) : [];
  const maxLblChars = lblLines.reduce((m, l) => Math.max(m, l.length), 0);
  const maxSubChars = subLines.reduce((m, s) => Math.max(m, s.length), 0);
  const width = Math.max(134, Math.min(206, Math.ceil(Math.max(maxLblChars * 8.6, maxSubChars * 7.2) + 34)));
  const lblH = lblLines.length * 18;
  const subH = subLines.length > 0 ? 6 + subLines.length * 15 : 0;
  const height = Math.max(68, Math.min(148, lblH + subH + 34));
  return { width, height };
}

function isNearlyCollinear(points: Array<{ x: number; y: number }>): boolean {
  if (points.length <= 2) return true;
  const p0 = points[0];
  const p1 = points[points.length - 1];
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dist = Math.abs(dy * p.x - dx * p.y + p1.x * p0.y - p1.y * p0.x) / len;
    if (dist > 7) return false;
  }
  return true;
}

/**
 * Computes deterministic, non-overlapping SVG shapes for a semantic directed graph
 * using @dagrejs/dagre so RoughFreeformSceneDiagram renders through FIEZEL's
 * native roughjs pipeline and preserves pen cursor + audio-lockstep focus.
 */
export function layoutGraphToShapes(params: {
  graphNodes: DagreGraphNode[];
  graphEdges?: DagreGraphEdge[];
  graphDirection?: 'LR' | 'TB';
  caption?: string;
}): { shapes: WhiteboardVectorShape[]; width: number; height: number } {
  const nodes = (params.graphNodes || []).filter((n) => n && (n.label || n.id)).slice(0, 10);
  if (nodes.length === 0) {
    return { shapes: [], width: 560, height: 240 };
  }

  const rawEdges = Array.isArray(params.graphEdges) ? params.graphEdges : [];
  const nodeIds = new Set(nodes.map((n, idx) => String(n.id || `n${idx + 1}`)));
  const edges: DagreGraphEdge[] = rawEdges.filter(
    (e) => e && nodeIds.has(String(e.from)) && nodeIds.has(String(e.to)) && String(e.from) !== String(e.to)
  );
  if (edges.length === 0 && nodes.length >= 2) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        from: String(nodes[i].id || `n${i + 1}`),
        to: String(nodes[i + 1].id || `n${i + 2}`),
      });
    }
  }

  // Decide LR vs TB compactly: wide chains (>3 sequential nodes) or branching DAGs read cleaner in TB,
  // while 2-3 horizontal sequential steps look crisp in LR unless caller explicitly set direction.
  const rankdir: 'LR' | 'TB' =
    params.graphDirection || (nodes.length >= 5 || (nodes.length >= 4 && edges.length >= 4) ? 'TB' : 'LR');

  const g = new graphlib.Graph();
  g.setGraph({
    rankdir,
    nodesep: rankdir === 'LR' ? 24 : 26,
    ranksep: rankdir === 'LR' ? 40 : 42,
    edgesep: 16,
    marginx: 18,
    marginy: 18,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const normalizedNodes = nodes.map((n, idx) => {
    const id = String(n.id || `n${idx + 1}`);
    const palette = DEFAULT_NODE_PALETTE[idx % DEFAULT_NODE_PALETTE.length];
    const { width, height } = measureNodeBox(String(n.label || id), n.sublabel);
    g.setNode(id, { width, height });
    return {
      id,
      label: String(n.label || id),
      sublabel: n.sublabel ? String(n.sublabel) : undefined,
      fill: n.fill || palette.fill,
      stroke: n.stroke || palette.stroke,
    };
  });

  edges.forEach((edge) => {
    g.setEdge(String(edge.from), String(edge.to), {
      label: edge.label || '',
      width: edge.label ? Math.min(110, edge.label.length * 7 + 12) : 0,
      height: edge.label ? 18 : 0,
    });
  });

  layout(g);

  const shapes: WhiteboardVectorShape[] = [];
  const edgeShapes: WhiteboardVectorShape[] = [];

  normalizedNodes.forEach((node) => {
    const pos = g.node(node.id);
    if (!pos) return;
    const x = Math.round(pos.x - pos.width / 2);
    const y = Math.round(pos.y - pos.height / 2);
    shapes.push({
      op: 'rect',
      x,
      y,
      w: Math.round(pos.width),
      h: Math.round(pos.height),
      fill: node.fill,
      stroke: node.stroke,
      label: node.label,
      ...(node.sublabel ? { sublabel: node.sublabel } : {}),
    });
  });

  edges.forEach((edge) => {
    const edgeData = g.edge(String(edge.from), String(edge.to));
    const pts = edgeData?.points;
    if (!Array.isArray(pts) || pts.length < 2) return;
    if (isNearlyCollinear(pts)) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      edgeShapes.push({
        op: 'arrow',
        x1: Math.round(first.x),
        y1: Math.round(first.y),
        x2: Math.round(last.x),
        y2: Math.round(last.y),
        stroke: '#1E293B',
        strokeWidth: 2,
        ...(edge.label ? { label: edge.label } : {}),
        ...(edge.dashed ? { dashed: true } : {}),
      });
    } else {
      edgeShapes.push({
        op: 'curve',
        points: pts.map((p) => [Math.round(p.x), Math.round(p.y)]),
        stroke: '#1E293B',
        strokeWidth: 2,
        arrowHead: true,
        ...(edge.label ? { label: edge.label } : {}),
        ...(edge.dashed ? { dashed: true } : {}),
      });
    }
  });

  // Interleave edges smoothly after boxes so RoughFreeformSceneDiagram highlights nodes naturally
  const combined: WhiteboardVectorShape[] = [...shapes, ...edgeShapes];
  const graphLabel = g.graph();
  const graphW = Math.max(360, Math.min(720, Math.ceil((graphLabel?.width || 540) + 24)));
  const graphH = Math.max(190, Math.min(440, Math.ceil((graphLabel?.height || 230) + 18)));
  return {
    shapes: combined,
    width: graphW,
    height: graphH,
  };
}
