import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Personas flavor an agent/ticket run — a role framing prepended to the task
// prompt. Default is none. Built-ins ship on every repo; a repo's
// .agents/personas.json overrides/extends by id.
export type Persona = {
  id: string
  title: string
  description: string
  icon?: string
  prompt: string
}

const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'security',
    title: 'Cybersecurity expert',
    description: 'World-class offensive + defensive security lens.',
    icon: 'ShieldCheck',
    prompt:
      "Take on the persona of a world-class cybersecurity expert — equal parts offensive (red-team) and defensive (blue-team). Treat this work through a security lens first: threat-model the change, design secure-by-default, validate and sanitize every input, enforce authentication/authorization correctly, and guard against injection, SSRF, secrets exposure, unsafe deserialization, and privilege escalation (prefer least privilege). Add security-focused tests, and file ticket follow-ups for any risk you can't fully close in this pass.",
  },
  {
    id: 'performance',
    title: 'Performance engineer',
    description: 'Runtime + memory optimization, measured.',
    icon: 'Gauge',
    prompt:
      'Take on the persona of a world-class performance engineer. Optimize for runtime and memory: eliminate N+1 queries and accidentally-quadratic paths, batch or stream where it helps, keep hot paths allocation-light, and cache deliberately. Measure before/after when feasible and note the numbers — but avoid premature complexity that hurts readability for marginal gains.',
  },
  {
    id: 'architect',
    title: 'Principal architect',
    description: 'Clean boundaries, minimal surface, maintainability.',
    icon: 'Compass',
    prompt:
      "Take on the persona of a principal software architect. Prioritize clean module boundaries, a minimal public surface, and long-term maintainability. Match the codebase's existing patterns, avoid premature abstraction and speculative generality, and document any non-obvious decision (an ADR or a sidecar note) so the next engineer understands the why.",
  },
]

function readRepoPersonas(repoRoot: string): Persona[] {
  if (!repoRoot) return []
  const f = join(repoRoot, '.agents', 'personas.json')
  if (!existsSync(f)) return []
  try {
    const a = JSON.parse(readFileSync(f, 'utf8'))
    const list = Array.isArray(a) ? a : Array.isArray(a?.personas) ? a.personas : []
    return list.filter((p: Persona) => p && p.id && p.title && p.prompt)
  } catch {
    return []
  }
}

export function readPersonas(repoRoot: string): Persona[] {
  const byId = new Map<string, Persona>()
  for (const p of DEFAULT_PERSONAS) byId.set(p.id, p)
  for (const p of readRepoPersonas(repoRoot)) byId.set(p.id, p)
  return [...byId.values()]
}

export function getPersona(repoRoot: string, id: string): Persona | null {
  if (!id) return null
  return readPersonas(repoRoot).find((p) => p.id === id) ?? null
}
