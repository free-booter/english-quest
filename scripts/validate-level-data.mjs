#!/usr/bin/env node
// 校验等级词库结构和内容完整度。
// 用法: node scripts/validate-level-data.mjs <track|all> <level>
// 示例: node scripts/validate-level-data.mjs all 1

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'src', 'data', 'tracks')

const [,, trackArg = 'all', levelArg = '1'] = process.argv
const level = Number(levelArg)
const tracks = trackArg === 'all' ? ['travel', 'drama', 'exam'] : [trackArg]

const EXPECTED = {
  1: { stages: 40, words: 400 },
  2: { stages: 60, words: 600 },
  3: { stages: 80, words: 800 },
}

function isDefinitionLike(text) {
  return /^(n|v|vt|vi|adj|adv)\.\s/i.test(text || '') || String(text || '').includes('\\n')
}

function checkWord(track, stage, word, issues) {
  const label = `${track}/${stage.id}/${word.word || '<missing-word>'}`

  if (!word.word) issues.push(`${label}: missing word`)
  if (!word.pos) issues.push(`${label}: missing pos`)
  if (!word.meaning) issues.push(`${label}: missing meaning`)

  if (!Array.isArray(word.senses) || word.senses.length === 0) {
    issues.push(`${label}: missing senses`)
  } else {
    const importantCount = word.senses.filter((sense) => sense.important === true).length
    if (importantCount < 1) issues.push(`${label}: no important sense`)

    for (const [idx, sense] of word.senses.entries()) {
      const senseLabel = `${label}/sense${idx + 1}`
      if (!sense.meaning) issues.push(`${senseLabel}: missing meaning`)
      if (!sense.example?.en) issues.push(`${senseLabel}: missing example.en`)
      if (!sense.example?.zh) issues.push(`${senseLabel}: missing example.zh`)
      if (!sense.example?.en?.includes(word.word)) {
        issues.push(`${senseLabel}: example does not contain target word`)
      }
      if (sense.example?.checked !== true) {
        issues.push(`${senseLabel}: example is not checked`)
      }
      if (isDefinitionLike(sense.example?.en)) {
        issues.push(`${senseLabel}: example looks like dictionary definition`)
      }
    }
  }

  if (!Array.isArray(word.teachingExamples) || word.teachingExamples.length === 0) {
    issues.push(`${label}: missing teachingExamples`)
  }

  if (!Array.isArray(word.phrases) || word.phrases.length === 0) {
    issues.push(`${label}: missing phrases`)
  } else {
    for (const [idx, phrase] of word.phrases.entries()) {
      if (!phrase.phrase || !phrase.meaning) {
        issues.push(`${label}/phrase${idx + 1}: incomplete phrase`)
      }
    }
  }

  if (!Array.isArray(word.relatedWords) || word.relatedWords.length === 0) {
    issues.push(`${label}: missing relatedWords`)
  } else {
    for (const [idx, related] of word.relatedWords.entries()) {
      if (!related.word || !related.type) {
        issues.push(`${label}/related${idx + 1}: incomplete related word`)
      }
    }
  }
}

async function validateTrack(track) {
  const filePath = path.join(DATA_DIR, track, `L${level}.json`)
  const issues = []

  if (!existsSync(filePath)) {
    return { track, filePath, issues: [`missing file: ${filePath}`] }
  }

  const data = JSON.parse(await readFile(filePath, 'utf-8'))
  const chapters = Array.isArray(data.chapters) ? data.chapters : []
  const stages = chapters.flatMap((chapter) => Array.isArray(chapter.stages) ? chapter.stages : [])
  const words = stages.flatMap((stage) => Array.isArray(stage.words) ? stage.words : [])
  const expected = EXPECTED[level]

  if (expected) {
    if (stages.length !== expected.stages) {
      issues.push(`${track}: expected ${expected.stages} stages, got ${stages.length}`)
    }
    if (words.length !== expected.words) {
      issues.push(`${track}: expected ${expected.words} words, got ${words.length}`)
    }
  }

  for (const stage of stages) {
    if (!Array.isArray(stage.words) || stage.words.length !== 10) {
      issues.push(`${track}/${stage.id}: expected 10 words, got ${stage.words?.length ?? 0}`)
    }
    for (const word of stage.words || []) {
      checkWord(track, stage, word, issues)
    }
  }

  return {
    track,
    filePath,
    summary: {
      chapters: chapters.length,
      stages: stages.length,
      words: words.length,
      senses: words.reduce((sum, word) => sum + (word.senses?.length || 0), 0),
    },
    issues,
  }
}

const results = []
for (const track of tracks) {
  results.push(await validateTrack(track))
}

let hasIssues = false
for (const result of results) {
  const issueCount = result.issues.length
  hasIssues ||= issueCount > 0
  console.log(`\n${issueCount === 0 ? '✅' : '❌'} ${result.track} L${level}`)
  if (result.summary) {
    console.log(`   chapters=${result.summary.chapters}, stages=${result.summary.stages}, words=${result.summary.words}, senses=${result.summary.senses}`)
  }
  for (const issue of result.issues.slice(0, 50)) {
    console.log(`   - ${issue}`)
  }
  if (result.issues.length > 50) {
    console.log(`   ... ${result.issues.length - 50} more issues`)
  }
}

if (hasIssues) {
  process.exit(1)
}
