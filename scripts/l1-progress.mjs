#!/usr/bin/env node
/**
 * L1 内容流水线检查点（断点续跑）
 *
 * 用法:
 *   node scripts/l1-progress.mjs init
 *   node scripts/l1-progress.mjs list <track> [examples|phrases]
 *   node scripts/l1-progress.mjs next <track> [examples|phrases] [--count=N]
 *   node scripts/l1-progress.mjs mark <track> <phase> <stageId> [--dry-run]
 *   node scripts/l1-progress.mjs status [all|<track>]
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'src', 'data', 'tracks')
const PROGRESS_DIR = path.join(ROOT, 'scripts', 'reports', 'progress')

const TRACKS = ['travel', 'drama', 'exam']
const PHASES = ['examples', 'phrases']

/** @typedef {{ schemaVersion: number, track: string, level: number, updatedAt: string, examples: { completedStageIds: string[], lastError: string|null }, phrases: { completedStageIds: string[], lastError: string|null } }} ProgressFile */

function usage() {
  console.log(`L1 progress / resume

  init
    创建或补齐 ${path.relative(ROOT, PROGRESS_DIR)} 下的检查点文件（从 L1.json 同步 stage 列表元数据）

  list <track> [examples|phrases]
    按顺序打印该轨道的全部 stageId（40 个）

  next <track> [examples|phrases] [--count=3]
    打印下一批「尚未在检查点中标记完成」的 stageId（默认 1 个）

  mark <track> examples|phrases <stageId>
    将某 stage 标记为当前阶段已完成（写回检查点文件）

  status [all|<track>]
    显示各轨道 examples / phrases 完成数 / 剩余数

track: ${TRACKS.join(' | ')}
phase: examples（例句生成+审核） | phrases（词组+相关词）
`)
}

async function loadLevelData(track, level = 1) {
  const filePath = path.join(DATA_DIR, track, `L${level}.json`)
  const raw = await readFile(filePath, 'utf-8')
  const data = JSON.parse(raw)
  const chapters = Array.isArray(data.chapters) ? data.chapters : []
  /** @type {string[]} */
  const stageIds = []
  for (const ch of chapters) {
    const stages = Array.isArray(ch.stages) ? ch.stages : []
    for (const st of stages) {
      if (st?.id) stageIds.push(st.id)
    }
  }
  return stageIds
}

function progressPath(track, level = 1) {
  return path.join(PROGRESS_DIR, `${track}-L${level}.progress.json`)
}

/** @returns {Promise<ProgressFile>} */
async function readProgress(track, level = 1) {
  const p = progressPath(track, level)
  const raw = await readFile(p, 'utf-8')
  return JSON.parse(raw)
}

/** @param {ProgressFile} data */
async function writeProgress(data) {
  data.updatedAt = new Date().toISOString()
  await mkdir(PROGRESS_DIR, { recursive: true })
  await writeFile(progressPath(data.track, data.level), `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
}

/** @returns {ProgressFile} */
function emptyProgress(track, level, orderedStageIds) {
  return {
    schemaVersion: 1,
    track,
    level,
    /** 仅作参考：当前 L1 文件中的 stage 顺序（init 时写入，便于人工 diff） */
    orderedStageIds,
    updatedAt: new Date().toISOString(),
    examples: { completedStageIds: [], lastError: null },
    phrases: { completedStageIds: [], lastError: null },
  }
}

function parseArgs(argv) {
  const out = { _: [], flags: {} }
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=')
      out.flags[k] = v === undefined ? true : v
    } else {
      out._.push(a)
    }
  }
  return out
}

async function cmdInit() {
  await mkdir(PROGRESS_DIR, { recursive: true })
  for (const track of TRACKS) {
    const ordered = await loadLevelData(track, 1)
    const p = progressPath(track, 1)
    let existing = null
    try {
      existing = JSON.parse(await readFile(p, 'utf-8'))
    } catch {
      existing = null
    }
    const data = existing && existing.schemaVersion === 1
      ? {
          ...existing,
          orderedStageIds: ordered,
          track,
          level: 1,
        }
      : emptyProgress(track, 1, ordered)
    await writeProgress(data)
    console.log(`✅ ${path.relative(ROOT, p)} — ${ordered.length} stages`)
  }
}

async function cmdList(track, phase) {
  const ordered = await loadLevelData(track, 1)
  if (phase && !PHASES.includes(phase)) {
    console.error(`phase 必须是 ${PHASES.join(' 或 ')}`)
    process.exit(1)
  }
  for (const id of ordered) {
    console.log(id)
  }
}

async function cmdNext(track, phase, count) {
  if (!PHASES.includes(phase)) {
    console.error(`phase 必须是 ${PHASES.join(' 或 ')}`)
    process.exit(1)
  }
  const ordered = await loadLevelData(track, 1)
  const prog = await readProgress(track, 1)
  const done = new Set(prog[phase].completedStageIds || [])
  const pending = ordered.filter((id) => !done.has(id))
  const slice = pending.slice(0, count)
  if (slice.length === 0) {
    console.log(`（无剩余）${track} / ${phase} 已全部标记完成`)
    return
  }
  for (const id of slice) {
    console.log(id)
  }
}

async function cmdMark(track, phase, stageId, dryRun) {
  if (!PHASES.includes(phase)) {
    console.error(`phase 必须是 ${PHASES.join(' 或 ')}`)
    process.exit(1)
  }
  const ordered = await loadLevelData(track, 1)
  if (!ordered.includes(stageId)) {
    console.error(`未知 stageId: ${stageId}（不在当前 L1.json 中）`)
    process.exit(1)
  }
  const prog = await readProgress(track, 1)
  const list = prog[phase].completedStageIds
  if (list.includes(stageId)) {
    console.log(`已存在，跳过: ${stageId}`)
    return
  }
  list.push(stageId)
  if (dryRun) {
    console.log(`[dry-run] 将标记 ${track} ${phase} ${stageId}`)
    return
  }
  await writeProgress(prog)
  console.log(`已标记: ${track} / ${phase} / ${stageId}（${list.length}/${ordered.length}）`)
}

async function cmdStatus(which) {
  const targets = which === 'all' || !which ? TRACKS : [which]
  for (const track of targets) {
    if (!TRACKS.includes(track)) {
      console.error(`未知 track: ${track}`)
      process.exit(1)
    }
    let ordered
    let prog
    try {
      ordered = await loadLevelData(track, 1)
      prog = await readProgress(track, 1)
    } catch (e) {
      console.log(`❌ ${track}: ${e.message}`)
      continue
    }
    const ex = new Set(prog.examples.completedStageIds || [])
    const ph = new Set(prog.phrases.completedStageIds || [])
    const exDone = ordered.filter((id) => ex.has(id)).length
    const phDone = ordered.filter((id) => ph.has(id)).length
    console.log(`\n${track} L1 — stages=${ordered.length}`)
    console.log(`  examples: ${exDone}/${ordered.length} 剩余 ${ordered.length - exDone}`)
    console.log(`  phrases:  ${phDone}/${ordered.length} 剩余 ${ordered.length - phDone}`)
  }
  console.log('')
}

const argv = process.argv.slice(2)
const { _, flags } = parseArgs(argv)
const [command, a1, a2, a3] = _

if (!command || command === 'help' || command === '-h') {
  usage()
  process.exit(command ? 0 : 1)
}

try {
  if (command === 'init') {
    await cmdInit()
  } else if (command === 'list') {
    if (!a1) throw new Error('需要 track')
    await cmdList(a1, a2 || null)
  } else if (command === 'next') {
    if (!a1 || !a2) throw new Error('需要 track 和 phase（examples|phrases）')
    const n = Math.max(1, parseInt(String(flags.count || '1'), 10) || 1)
    await cmdNext(a1, a2, n)
  } else if (command === 'mark') {
    if (!a1 || !a2 || !a3) throw new Error('需要 track、phase、stageId')
    await cmdMark(a1, a2, a3, Boolean(flags['dry-run']))
  } else if (command === 'status') {
    await cmdStatus(a1 || 'all')
  } else {
    console.error(`未知命令: ${command}`)
    usage()
    process.exit(1)
  }
} catch (e) {
  console.error(e.message || e)
  process.exit(1)
}
