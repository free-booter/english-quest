#!/usr/bin/env node
// 自动生成等级词库 JSON 数据
// 用法: node scripts/generate-level-data.mjs <trackId|all> <level>
// 示例: node scripts/generate-level-data.mjs travel 1
//       node scripts/generate-level-data.mjs all 1

import { createWriteStream, existsSync } from 'fs'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { get as httpsGet } from 'https'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CACHE_DIR = path.join(__dirname, '.cache')
const DATA_DIR = path.join(ROOT, 'src', 'data', 'tracks')

const ECDICT_URL = 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv'
const ECDICT_CSV = path.join(CACHE_DIR, 'ecdict.csv')
const ECDICT_INDEX = path.join(CACHE_DIR, 'ecdict-index.json')

// ─── 下载工具 ─────────────────────────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    let downloaded = 0

    function doGet(u) {
      httpsGet(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doGet(res.headers.location)
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        const total = parseInt(res.headers['content-length'] || '0')
        res.on('data', (chunk) => {
          downloaded += chunk.length
          const mb = (n) => (n / 1024 / 1024).toFixed(1)
          process.stdout.write(`\r  下载中 ${mb(downloaded)}MB${total ? ' / ' + mb(total) + 'MB' : ''}   `)
        })
        res.pipe(file)
        file.on('finish', () => { process.stdout.write('\n'); resolve() })
        file.on('error', reject)
      }).on('error', reject)
    }

    doGet(url)
  })
}

// ─── RFC 4180 CSV 解析器 ───────────────────────────────────────────────────────

function buildECDICTIndex(text) {
  console.log('  解析词典...')
  const index = new Map()
  let i = 0
  const n = text.length
  let rows = 0

  function readField() {
    if (i >= n) return ''
    if (text[i] === '"') {
      i++
      const chars = []
      while (i < n) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { chars.push('"'); i += 2 }
          else { i++; break }
        } else {
          chars.push(text[i++])
        }
      }
      return chars.join('')
    }
    const start = i
    while (i < n && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') i++
    return text.slice(start, i)
  }

  function readRow() {
    const fields = []
    while (i < n) {
      fields.push(readField())
      if (i < n && text[i] === ',') { i++; continue }
      if (i < n && text[i] === '\r') i++
      if (i < n && text[i] === '\n') i++
      break
    }
    return fields
  }

  readRow() // 跳过表头

  while (i < n) {
    const f = readRow()
    if (f.length < 4) continue
    const word = f[0].toLowerCase().trim()
    if (word) {
      index.set(word, {
        phonetic: f[1].trim(),
        definition: f[2].trim(),   // 英文释义，用作例句来源
        translation: f[3].trim(),
        pos: f[4] ? f[4].trim() : '',
      })
    }
    rows++
    if (rows % 80000 === 0) process.stdout.write(`\r  已处理 ${rows} 词...`)
  }

  process.stdout.write(`\r  共加载 ${rows} 词汇\n`)
  return index
}

// ─── ECDICT 字段解析 ───────────────────────────────────────────────────────────

const POS_MAP = {
  n: 'n.', v: 'v.', vt: 'vt.', vi: 'vi.',
  adj: 'adj.', adv: 'adv.', prep: 'prep.',
  conj: 'conj.', int: 'intj.', interj: 'intj.',
  pron: 'pron.', phrase: 'phrase', abbr: 'abbr.',
  num: 'num.', art: 'art.',
}

function parsePOS(posField, translation) {
  if (posField) return POS_MAP[posField] || posField + '.'
  const m = translation && translation.match(/^([a-z]+)\.\s/)
  if (m) return POS_MAP[m[1]] || m[1] + '.'
  return 'n.'
}

function parseMeaning(translation) {
  if (!translation) return ''
  // ECDICT uses literal '\n' (two chars) as line separator within fields
  const firstLine = translation.split(/\\n|\n/)[0].trim()
  const withoutPOS = firstLine.replace(/^[a-z]+\.\s+/, '').trim()
  return withoutPOS.split('；')[0].split(';')[0].trim()
}

// ─── 单词查询 ─────────────────────────────────────────────────────────────────

function lookupWord(word, ecdict) {
  const entry = ecdict.get(word.toLowerCase())

  let phonetic = ''
  let pos = 'n.'
  let meaning = ''
  let definition = ''

  if (entry) {
    phonetic = entry.phonetic || ''
    pos = parsePOS(entry.pos, entry.translation)
    meaning = parseMeaning(entry.translation)
    definition = entry.definition || ''
  }

  if (!meaning) meaning = `${word}`

  const result = { word, phonetic, pos, meaning }
  if (definition) result.definition = definition
  return result
}

// ─── 主生成逻辑 ───────────────────────────────────────────────────────────────

async function loadECDICT() {
  if (existsSync(ECDICT_INDEX)) {
    process.stdout.write('📖 加载缓存索引...')
    const raw = await readFile(ECDICT_INDEX, 'utf-8')
    const obj = JSON.parse(raw)
    process.stdout.write(` ${Object.keys(obj).length} 词\n`)
    return new Map(Object.entries(obj))
  }

  if (!existsSync(ECDICT_CSV)) {
    console.log('⬇️  下载 ECDICT 词库（约 40MB，首次需要约 1 分钟）...')
    await mkdir(CACHE_DIR, { recursive: true })
    await download(ECDICT_URL, ECDICT_CSV)
    console.log('✅ 下载完成')
  }

  console.log('🔍 构建词典索引（首次约 30 秒）...')
  const text = await readFile(ECDICT_CSV, 'utf-8')
  const index = buildECDICTIndex(text)

  console.log('💾 保存索引缓存...')
  await writeFile(ECDICT_INDEX, JSON.stringify(Object.fromEntries(index)))
  console.log('✅ 索引就绪，后续运行将直接使用缓存')

  return index
}

async function generateTrack(trackId, level, ecdict) {
  const configPath = path.join(__dirname, 'config', `${trackId}-L${level}.json`)
  if (!existsSync(configPath)) {
    console.error(`❌ 缺少配置文件: scripts/config/${trackId}-L${level}.json`)
    return
  }

  const config = JSON.parse(await readFile(configPath, 'utf-8'))
  console.log(`\n📚 生成 ${trackId} L${level}「${config.levelName}」`)
  console.log(`   ${config.chapters.length} 章节 × ${config.chapters[0].stages.length} 舞台 = ${config.chapters.length * config.chapters[0].stages.length} 关`)

  const chapters = []
  let globalStage = 0

  for (let ci = 0; ci < config.chapters.length; ci++) {
    const chConf = config.chapters[ci]
    const chNum = ci + 1
    const chapterId = `${trackId}-L${level}-c${chNum}`
    const stages = []

    for (let si = 0; si < chConf.stages.length; si++) {
      const stConf = chConf.stages[si]
      const stNum = si + 1
      globalStage++
      const stageId = `${chapterId}-s${stNum}`

      process.stdout.write(`  [${globalStage}/${config.chapters.length * chConf.stages.length}] ${chConf.title} · ${stConf.title}\r`)

      const words = []
      for (const w of stConf.words) {
        words.push(lookupWord(w, ecdict))
      }

      stages.push({
        id: stageId,
        index: globalStage,
        title: stConf.title,
        theme: stConf.theme,
        words,
      })
    }

    chapters.push({
      id: chapterId,
      level,
      index: chNum,
      title: chConf.title,
      scenario: chConf.scenario,
      stages,
    })
  }

  const output = { level, name: config.levelName, chapters }
  const outPath = path.join(DATA_DIR, trackId, `L${level}.json`)
  await writeFile(outPath, JSON.stringify(output, null, 2))
  console.log(`\n✅ 已写入: src/data/tracks/${trackId}/L${level}.json`)
}

// ─── CLI 入口 ─────────────────────────────────────────────────────────────────

const [,, trackArg, levelArg] = process.argv
const level = parseInt(levelArg)

if (!trackArg || !levelArg || isNaN(level)) {
  console.log('用法: node scripts/generate-level-data.mjs <trackId|all> <level>')
  console.log('例如: node scripts/generate-level-data.mjs travel 1')
  console.log('      node scripts/generate-level-data.mjs all 1')
  process.exit(1)
}

const tracks = trackArg === 'all' ? ['travel', 'drama', 'exam'] : [trackArg]

const ecdict = await loadECDICT()

for (const t of tracks) {
  await generateTrack(t, level, ecdict)
}

console.log('\n🎉 全部完成！')
