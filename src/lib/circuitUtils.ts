import { PlaygroundGate, PlaygroundCircuit } from '@/types/api';

/**
 * Minimal interface for gate collision detection.
 */
export interface GateLike {
  target: number;
  controls: number[];
}

/**
 * Check if two gates collide (can't swap).
 * Gates collide iff one's target is in the other's controls.
 * Note: Same targets DO commute for ECA57 gates!
 */
export function gatesCollide(g1: GateLike, g2: GateLike): boolean {
  return g2.controls.includes(g1.target) || g1.controls.includes(g2.target);
}

/**
 * Get topological levels from collision edges using Kahn's algorithm.
 * Returns gates reordered with new step values (push-left ordering).
 */
export function getTopologicalOrder(gates: PlaygroundGate[]): PlaygroundGate[] {
  const n = gates.length;
  if (n === 0) return [];

  // Build collision edges
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (gatesCollide(gates[i], gates[j])) {
        edges.push([i, j]);
      }
    }
  }

  // Calculate in-degrees
  const inDegree = new Array(n).fill(0);
  const adjList: number[][] = Array.from({ length: n }, () => []);
  for (const [src, dst] of edges) {
    adjList[src].push(dst);
    inDegree[dst]++;
  }

  // Kahn's algorithm for topological sort
  const result: number[] = [];
  const queue: number[] = [];

  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  while (queue.length > 0) {
    // Sort by target (highest first) within same level
    queue.sort((a, b) => gates[b].target - gates[a].target);
    const node = queue.shift()!;
    result.push(node);

    for (const neighbor of adjList[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Return reordered gates with new steps
  return result.map((oldIdx, newStep) => ({
    ...gates[oldIdx],
    step: newStep,
  }));
}

/**
 * Character to wire index mapping - matches Rust's wire_to_char exactly.
 * Supports up to 83 wires (0-82).
 */
export function charToWire(c: string): number {
  const code = c.charCodeAt(0);
  // 0-9 -> wires 0-9
  if (code >= 48 && code <= 57) return code - 48;
  // a-z -> wires 10-35
  if (code >= 97 && code <= 122) return code - 97 + 10;
  // A-Z -> wires 36-61
  if (code >= 65 && code <= 90) return code - 65 + 36;
  // Special characters for wires 62+
  const specialChars: Record<string, number> = {
    '!': 62, '@': 63, '#': 64, '$': 65, '%': 66,
    '^': 67, '&': 68, '*': 69, '(': 70, ')': 71,
    '-': 72, '_': 73, '=': 74, '+': 75, '[': 76,
    ']': 77, '{': 78, '}': 79, '<': 80, '>': 81, '?': 82
  };
  return specialChars[c] ?? 0;
}

/**
 * Wire index to character - inverse of charToWire.
 */
export function wireToChar(wire: number): string {
  if (wire < 10) return String.fromCharCode(48 + wire);
  if (wire < 36) return String.fromCharCode(97 + wire - 10);
  if (wire < 62) return String.fromCharCode(65 + wire - 36);
  const specialChars = '!@#$%^&*()-_=+[]{}<>?';
  if (wire - 62 < specialChars.length) return specialChars[wire - 62];
  return '0';
}

/**
 * Parse .gate format string (e.g., "012;123;234;") into PlaygroundGates.
 * Returns the parsed gates and detected width.
 */
export function parseGateString(gateStr: string): { gates: PlaygroundGate[], detectedWidth: number } {
  const gateTokens = gateStr.split(';').filter(s => s.trim());
  const gates: PlaygroundGate[] = [];

  // First pass: detect max wire index used
  let maxWire = 0;
  gateTokens.forEach((token) => {
    if (token.length >= 3) {
      maxWire = Math.max(maxWire, charToWire(token[0]), charToWire(token[1]), charToWire(token[2]));
    }
  });
  const detectedWidth = maxWire + 1;

  // Second pass: create gates
  gateTokens.forEach((token, idx) => {
    if (token.length >= 3) {
      const target = charToWire(token[0]);
      const ctrl1 = charToWire(token[1]);
      const ctrl2 = charToWire(token[2]);

      gates.push({
        id: `loaded-${Date.now()}-${idx}`,
        type: 'ECA57',
        step: idx,
        target,
        controls: [ctrl1, ctrl2],
      });
    }
  });

  return { gates, detectedWidth };
}

/**
 * Serialize PlaygroundGates to .gate format string.
 */
export function serializeGates(gates: PlaygroundGate[]): string {
  const sorted = [...gates].sort((a, b) => a.step - b.step);
  return sorted.map(g => {
    const t = wireToChar(g.target);
    const c1 = wireToChar(g.controls[0] ?? 0);
    const c2 = wireToChar(g.controls[1] ?? 0);
    return `${t}${c1}${c2}`;
  }).join(';') + ';';
}

/**
 * Compute permutation from a circuit.
 * Returns the permutation array, isIdentity flag, and cycle notation string.
 */
export function computePermutation(circuit: PlaygroundCircuit): {
  permutation: number[];
  isIdentity: boolean;
  cycleNotation: string;
} {
  const width = circuit.width;
  const numStates = 1 << width;
  let perm = Array.from({ length: numStates }, (_, i) => i);

  const sortedGates = [...circuit.gates].sort((a, b) => a.step - b.step);

  for (const gate of sortedGates) {
    const newPerm = [...perm];
    for (let state = 0; state < numStates; state++) {
      let newState = perm[state];

      switch (gate.type) {
        case 'X':
          newState ^= 1 << gate.target;
          break;
        case 'CX':
          if (newState & (1 << gate.controls[0])) {
            newState ^= 1 << gate.target;
          }
          break;
        case 'CCX':
          if (gate.controls.every((c) => newState & (1 << c))) {
            newState ^= 1 << gate.target;
          }
          break;
        case 'ECA57':
          const ctrl1Set = !!(newState & (1 << gate.controls[0]));
          const ctrl2Set = !!(newState & (1 << gate.controls[1]));
          if (ctrl1Set || !ctrl2Set) {
            newState ^= 1 << gate.target;
          }
          break;
      }
      newPerm[state] = newState;
    }
    perm = newPerm;
  }

  // Compute cycle notation
  const visited = new Array(numStates).fill(false);
  const cycles: number[][] = [];

  for (let start = 0; start < numStates; start++) {
    if (visited[start]) continue;

    const cycle: number[] = [];
    let curr = start;

    while (!visited[curr]) {
      visited[curr] = true;
      cycle.push(curr);
      curr = perm[curr];
    }

    // Only include non-trivial cycles (length > 1)
    if (cycle.length > 1) {
      cycles.push(cycle);
    }
  }

  // Format cycle notation string
  let cycleStr = '';
  if (cycles.length === 0) {
    cycleStr = '()'; // Identity
  } else {
    for (const cycle of cycles) {
      cycleStr += '(' + cycle.join(' ') + ')';
    }
  }

  return {
    permutation: perm,
    isIdentity: perm.every((val, idx) => val === idx),
    cycleNotation: cycleStr,
  };
}

/**
 * Compute reduced-wire version of gates.
 * Remaps wire indices to use only the wires that are actually used.
 */
export function computeReducedGates(gates: PlaygroundGate[]): {
  gates: PlaygroundGate[];
  width: number;
  wireMap: Map<number, number>;
} {
  if (gates.length === 0) return { gates: [], width: 0, wireMap: new Map() };

  // Find all unique wires used
  const usedWires = new Set<number>();
  gates.forEach((g) => {
    usedWires.add(g.target);
    g.controls.forEach((c) => usedWires.add(c));
  });

  // Create mapping from original wire to reduced wire
  const sortedWires = Array.from(usedWires).sort((a, b) => a - b);
  const wireMap = new Map<number, number>();
  sortedWires.forEach((wire, idx) => wireMap.set(wire, idx));

  // Remap gates
  const reducedGates = gates.map((g) => ({
    ...g,
    target: wireMap.get(g.target)!,
    controls: g.controls.map((c) => wireMap.get(c)!),
  }));

  return { gates: reducedGates, width: sortedWires.length, wireMap };
}
