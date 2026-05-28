import {
  File,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  FileCog,
  FileLock2,
  FileTerminal,
  Folder,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react'

// Maps a filename to a tinted icon, VS Code / Seti style. Colors are picked to
// read on the dark theme without shouting.
type IconSpec = { Icon: LucideIcon; cls: string }

const code = (cls: string): IconSpec => ({ Icon: FileCode, cls })
const img: IconSpec = { Icon: FileImage, cls: 'text-[#c084fc]' }
const shell: IconSpec = { Icon: FileTerminal, cls: 'text-[#4ade80]' }
const cfg: IconSpec = { Icon: FileCog, cls: 'text-[#a78bfa]' }

const BY_EXT: Record<string, IconSpec> = {
  ts: code('text-[#4a9eff]'),
  tsx: code('text-[#22d3ee]'),
  js: code('text-[#e8c84d]'),
  mjs: code('text-[#e8c84d]'),
  cjs: code('text-[#e8c84d]'),
  jsx: code('text-[#22d3ee]'),
  json: { Icon: FileJson, cls: 'text-[#f0b429]' },
  md: { Icon: FileText, cls: 'text-[#9aa4b2]' },
  mdx: { Icon: FileText, cls: 'text-[#9aa4b2]' },
  txt: { Icon: FileText, cls: 'text-zinc-500' },
  css: code('text-[#38bdf8]'),
  scss: code('text-[#ec4899]'),
  less: code('text-[#38bdf8]'),
  html: code('text-[#f97316]'),
  py: code('text-[#4a9eff]'),
  rs: code('text-[#f97316]'),
  go: code('text-[#22d3ee]'),
  rb: code('text-[#ef4444]'),
  php: code('text-[#a78bfa]'),
  java: code('text-[#f97316]'),
  c: code('text-[#60a5fa]'),
  h: code('text-[#60a5fa]'),
  cpp: code('text-[#60a5fa]'),
  hpp: code('text-[#60a5fa]'),
  sh: shell,
  bash: shell,
  zsh: shell,
  yml: cfg,
  yaml: cfg,
  toml: cfg,
  env: { Icon: FileCog, cls: 'text-[#84cc16]' },
  svg: img,
  png: img,
  jpg: img,
  jpeg: img,
  gif: img,
  webp: img,
  ico: img,
  icns: img,
  lock: { Icon: FileLock2, cls: 'text-zinc-500' },
}

const BY_NAME: Record<string, IconSpec> = {
  'package.json': { Icon: FileJson, cls: 'text-[#84cc16]' },
  'tsconfig.json': { Icon: FileJson, cls: 'text-[#4a9eff]' },
  'bun.lock': { Icon: FileLock2, cls: 'text-zinc-500' },
  'bun.lockb': { Icon: FileLock2, cls: 'text-zinc-500' },
  'package-lock.json': { Icon: FileLock2, cls: 'text-zinc-500' },
  Dockerfile: code('text-[#38bdf8]'),
  '.gitignore': { Icon: FileCog, cls: 'text-zinc-500' },
  '.env': { Icon: FileCog, cls: 'text-[#84cc16]' },
}

export function fileIcon(name: string, dir: boolean, open = false): IconSpec {
  if (dir) return { Icon: open ? FolderOpen : Folder, cls: 'text-[#7d8590]' }
  if (BY_NAME[name]) return BY_NAME[name]
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
  return BY_EXT[ext] || { Icon: File, cls: 'text-zinc-500' }
}
