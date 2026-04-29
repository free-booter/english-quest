---
title: "feat: L1 词库内容完善 — 用多 Agent 流水线替换占位符例句/词组/相关词"
type: feat
status: active
date: 2026-04-29
---

# feat: L1 词库内容完善（多 Agent 并行流水线）

## Overview

当前三个轨道（travel / drama / exam）的 L1 词库已通过 `enrich-l1-content.mjs` 生成了结构合规的占位符内容（例句、词组、相关词），但所有内容均为模板文本，毫无教学价值。本计划使用已定义的 4 个 Agent（`example-writer`、`example-reviewer`、`phrase-related-writer`、`release-checker`）以并行流水线的方式，为 3 个轨道 × 400 词 = 1200 个词逐步替换成真实、高质量的教学内容，并最终通过发布验收。

**执行路线**：义项、例句、词组与相关词 **仅由 Cursor 子 Agent** 按 `scripts/agents/*.md` 的角色说明、以 **stage（10 词）** 为粒度写回 `L1.json`。**不**使用批量规则脚本生成教学内容；曾用于试验的 `rewrite-l1-content.mjs` 已删除，`L1.json` 已与仓库基线（占位符 enrich 结果）对齐。`validate-level-data.mjs` 与 `scripts/l1-progress.mjs` 只做**结构校验**与**断点进度**，不参与文案创作。

---

## Problem Frame

`scripts/enrich-l1-content.mjs` 生成的数据在结构上通过了 `validate-level-data.mjs` 的校验（因为占位符格式合规），但内容形如：

```
example.en = 'The word "passport" is useful in this travel scene.'
phrase.phrase = 'passport in context'
relatedWords[0].word = 'passport in context'
```

这些内容对用户完全无教学价值，不能进入正式 App 发布。

需要完成的工作：
- 为 1200 个词的每个义项（senses）生成符合轨道风格的真实例句
- 为每个词生成真实的词组（phrases）和相关词（relatedWords）
- 经过审核、修复、验收闭环，确保质量达到发布标准

---

## Requirements Trace

- R1. 每个词每个 sense 有一条符合轨道场景、包含目标词的自然英文例句和准确中文翻译
- R2. teachingExamples 与 senses examples 一致，不再是占位符文本
- R3. 每个词有 1-3 个真实有教学价值的 phrases（词组/搭配），附带例句
- R4. 每个词有 1-4 个真实 relatedWords（同族词/近义词/反义词/易混词）
- R5. 三个轨道 L1 全部通过 `validate-level-data.mjs` 和 `release-checker` Agent 验收
- R6. 内容风格符合各轨道定位：travel=旅行场景，drama=影视对白，exam=考试语境
- R7. L1 例句难度：5-10 词，简单时态，无复杂从句

---

## Scope Boundaries

- 不修改词表结构（stages/chapters/词数不变）
- 不替换任何词条本身（word/pos/phonetic/meaning/definition 保留）
- 不处理 L2-L6 数据（本次只做 L1）
- 不修改前端代码
- 不修改校验脚本逻辑

### Deferred to Follow-Up Work

- L2-L6 词库内容完善：后续等级迭代时复用同一流水线
- 音标缺失词的音标补充：独立任务
- 插画/音频资源：独立任务

---

## Context & Research

### Relevant Code and Patterns

- `scripts/agents/example-writer.md` — 例句生成 Agent 角色定义
- `scripts/agents/example-reviewer.md` — 例句审核 Agent 角色定义
- `scripts/agents/phrase-related-writer.md` — 词组/相关词 Agent 角色定义
- `scripts/agents/release-checker.md` — 发布验收 Agent 角色定义
- `scripts/enrich-l1-content.mjs` — 当前占位符生成脚本（已运行，产生待替换内容）
- `scripts/validate-level-data.mjs` — 结构校验脚本
- `src/data/tracks/travel/L1.json` — 待完善（40 stages，400 词）
- `src/data/tracks/drama/L1.json` — 待完善（40 stages，400 词）
- `src/data/tracks/exam/L1.json` — 待完善（40 stages，400 词）
- `docs/DIFFICULTY_DESIGN.md` — 难度设计规范（L1 标准）
- `docs/CONTENT_AGENT_WORKFLOW.md` — 多 Agent 工作流文档

### Key Constraints from Agent Definitions

- **例句生成**：英文必须包含目标词本身，L1 限 5-10 词，只用简单时态
- **例句审核**：`high` 级别问题（词义错误/翻译错误/语法错误/不含目标词）= 阻塞；`medium` 级别 = 修复后发布；`low` 级别 = 带报告发布
- **词组写作**：L1 每词 1-3 个 phrases，1-4 个 relatedWords，只补有教学价值的，不硬凑
- **发布验收**：所有字段非空，senses/teachingExamples/phrases/relatedWords 均已填充，`contentStatus` = `reviewed`

---

## Key Technical Decisions

- **批处理粒度**：以 stage（10 词）为单位，每次让 Agent 处理一个 stage，减少 context window 压力
- **并行策略**：三个轨道完全独立，由三个子 Agent 实例并行处理，互不依赖
- **写回策略**：Agent 直接读写对应 JSON 文件，每处理完一个 stage 立即写入，避免批量写入丢失
- **审核策略**：审核 Agent 对每个 stage 输出审核报告，`high` 级别问题必须修复后重审，`medium` 以下带记录发布
- **ph rase-related 独立运行**：与例句流水线分开，在例句审核通过后再补充 phrases/relatedWords

---

## Open Questions

### Resolved During Planning

- **Q: 是否先跑 travel 验证流程，再跑其他两轨？**  
  A: 不需要。三个轨道完全独立，可以并行。travel 作为第一个处理轨道主要是为了验证 Agent 角色提示词质量，但不阻塞其他轨道启动。
- **Q: 需要修改 `contentStatus` 字段吗？**  
  A: 是。当前已是 `"reviewed"`（由 enrich 脚本写入），保持不变即可，Agent 替换内容后字段值不需修改。
- **Q: 验证脚本现在会 pass 吗？**  
  A: 通过结构校验（exit code 0），但内容质量不符合教学标准。Release Checker Agent 会做内容层面的二次验收。

### Deferred to Implementation

- 某些词如果多次审核仍失败，人工介入的具体操作步骤

---

## Output Structure

本计划不新增文件结构，只修改以下现有文件内容：

```
src/data/tracks/
├── travel/L1.json    ← 40 stages × 10 词 = 400 词 [内容替换]
├── drama/L1.json     ← 40 stages × 10 词 = 400 词 [内容替换]
└── exam/L1.json      ← 40 stages × 10 词 = 400 词 [内容替换]

scripts/reports/      ← 新建目录，存放审核报告
├── travel-L1-example-review.json   [新建]
├── drama-L1-example-review.json    [新建]
├── exam-L1-example-review.json     [新建]
├── travel-L1-release-check.json    [新建]
├── drama-L1-release-check.json     [新建]
└── exam-L1-release-check.json      [新建]
```

---

## High-Level Technical Design

> *以下流程图为方向性指导，不是实现规范。*

```mermaid
graph TB
    subgraph 并行三轨道
        direction TB
        T["🌍 travel-agent<br/>（子Agent 1）"]
        D["🎬 drama-agent<br/>（子Agent 2）"]
        E["📚 exam-agent<br/>（子Agent 3）"]
    end

    subgraph 每个 Agent 的循环
        direction LR
        W["例句生成<br/>example-writer"] --> R["例句审核<br/>example-reviewer"]
        R -->|pass| P["词组/相关词<br/>phrase-related-writer"]
        R -->|fail high| FIX["修复重审<br/>（最多2次）"]
        FIX --> R
        P --> VALIDATE["validate-level-data.mjs"]
    end

    T & D & E --> 每个 Agent 的循环
    VALIDATE --> RC["发布验收<br/>release-checker（汇总）"]
```

**每个子 Agent 按 stage 循环**（以 travel 为例）：
1. 读取 `src/data/tracks/travel/L1.json`
2. 按 chapter → stage 顺序，每次取 1 个 stage（10 词）
3. 对每个 stage 调用 example-writer 生成例句 → 写回 JSON
4. 调用 example-reviewer 审核 → 记录报告
5. 对 high 级别问题执行修复循环（最多 2 次）
6. 完成所有 stage 后，调用 phrase-related-writer 补充 phrases/relatedWords
7. 运行 `node scripts/validate-level-data.mjs travel 1` 验证
8. 输出审核报告到 `scripts/reports/travel-L1-example-review.json`

---

## Implementation Units

<!-- 三个轨道并行执行，U1/U2/U3 可同时启动 -->

---

- [ ] U1. **travel 轨道 L1 例句生成与审核**

**Goal:** 为 travel/L1.json 所有 400 个词的全部 senses 生成真实旅行场景例句，经审核通过后写回文件

**Requirements:** R1, R2, R6, R7

**Dependencies:** None

**Files:**
- Modify: `src/data/tracks/travel/L1.json`
- Create: `scripts/reports/travel-L1-example-review.json`

**Approach:**
- 以 stage 为单位循环（共 40 stages）
- 每个 stage：读取当前 stage 的 10 个词 → 调用 example-writer Agent → 写回 JSON → 调用 example-reviewer Agent → 记录审核结果
- high 严重度问题：修复后重审（最多 2 次），连续失败标记人工处理
- 每个 sense 的 example 字段替换为：自然英文例句（含目标词）+ 准确中文翻译，`source: "generated"`，`checked: true`
- teachingExamples 同步更新

**Execution note:** 按 chapter 顺序处理，完成一个 stage 立即写入文件，避免批量写入丢失

**Patterns to follow:**
- `scripts/agents/example-writer.md` 角色定义
- `scripts/agents/example-reviewer.md` 审核标准
- `docs/DIFFICULTY_DESIGN.md` L1 难度标准
- travel 轨道风格：机场/酒店/餐厅/交通/购物/问路/突发情况

**Test scenarios:**
- Happy path: 例句包含目标词，5-10 词，简单时态，符合旅行场景，中文翻译准确
- Edge case: 同一词有多个 senses，每个 sense 的例句体现对应义项，不互相混淆
- Edge case: 词形变化（如 boarding → boarded），只有固定短语才允许不含原形
- Error path: 审核 high 严重度 → 触发修复重审；连续 2 次失败 → 标记人工处理，不阻塞其他词继续处理
- Integration: 写回 JSON 后，`validate-level-data.mjs` 对该 sense 的校验全部 pass

**Verification:**
- `node scripts/validate-level-data.mjs travel 1` 退出码 0，无 issue
- `scripts/reports/travel-L1-example-review.json` 存在，high severity issues = 0

---

- [ ] U2. **drama 轨道 L1 例句生成与审核**

**Goal:** 为 drama/L1.json 所有 400 个词生成影视对白风格例句，经审核通过后写回

**Requirements:** R1, R2, R6, R7

**Dependencies:** None（与 U1 并行）

**Files:**
- Modify: `src/data/tracks/drama/L1.json`
- Create: `scripts/reports/drama-L1-example-review.json`

**Approach:**
- 与 U1 完全相同的流程，只是轨道风格不同
- drama 风格：影视对白感，短句，有情绪，优先朋友聊天/恋爱/家庭/争吵/误会/职场

**Patterns to follow:**
- `scripts/agents/example-writer.md`（drama 轨道段落）
- drama 场景示范：`"You look nervous. What happened?"`

**Test scenarios:**（同 U1 逻辑，drama 风格验证）
- Happy path: 例句像影视对白，短（≤10 词优先），有口语感，不像教科书
- Edge case: 情绪词（nervous/excited）的例句需体现情绪场景
- Error path: 同 U1

**Verification:**
- `node scripts/validate-level-data.mjs drama 1` 退出码 0
- `scripts/reports/drama-L1-example-review.json` high severity issues = 0

---

- [ ] U3. **exam 轨道 L1 例句生成与审核**

**Goal:** 为 exam/L1.json 所有 400 个词生成服务考试阅读/写作的例句，经审核通过后写回

**Requirements:** R1, R2, R6, R7

**Dependencies:** None（与 U1/U2 并行）

**Files:**
- Modify: `src/data/tracks/exam/L1.json`
- Create: `scripts/reports/exam-L1-example-review.json`

**Approach:**
- 与 U1 相同流程，exam 风格：体现词义和搭配，适合考试阅读理解和写作语境

**Patterns to follow:**
- `scripts/agents/example-writer.md`（exam 轨道段落）
- exam 场景示范：`"Sleep can affect your memory."`

**Test scenarios:**
- Happy path: 例句适合阅读理解语境，体现词的考试用法，中文翻译服务理解
- Edge case: 动词考试词（affect/acquire）的例句需体现正确动词用法
- Error path: 同 U1

**Verification:**
- `node scripts/validate-level-data.mjs exam 1` 退出码 0
- `scripts/reports/exam-L1-example-review.json` high severity issues = 0

---

- [ ] U4. **三轨道 L1 词组与相关词补充**

**Goal:** 在 U1/U2/U3 完成后，为三个轨道所有 1200 个词补充真实的 phrases 和 relatedWords

**Requirements:** R3, R4, R6

**Dependencies:** U1, U2, U3

**Files:**
- Modify: `src/data/tracks/travel/L1.json`
- Modify: `src/data/tracks/drama/L1.json`
- Modify: `src/data/tracks/exam/L1.json`

**Approach:**
- 同样以 stage（10 词）为单位批量处理
- 调用 phrase-related-writer Agent，替换占位符 phrases 和 relatedWords
- 每个词的 phrases：1-3 个，真实词组/搭配，带 meaning 和 example（包含 phrase 本身）
- 每个词的 relatedWords：1-4 个，类型可为 synonym/antonym/family/confusable，带 meaning
- 三个轨道可再次并行运行（travel/drama/exam 各启动一个子 Agent）

**Patterns to follow:**
- `scripts/agents/phrase-related-writer.md`
- 生成标准：L1 每词 1-3 phrases，1-4 relatedWords，只补有学习价值的

**Test scenarios:**
- Happy path: phrases 是真实英文词组（如 `check in`），meaning 是中文释义，example 含该词组
- Edge case: 冷门词找不到有价值的相关词时，relatedWords 可只补 1 个
- Error path: 不为凑数量生成无意义的 relatedWords（如 `"passport in context"`）

**Verification:**
- 所有词 `phrases.length >= 1` 且 `relatedWords.length >= 1`
- phrases 中无包含 "in context" 的占位符文本
- relatedWords 中无 `word` 等于目标词本身加 "in context" 的条目

---

- [ ] U5. **全量校验与发布验收**

**Goal:** 三个轨道内容完善完成后，运行结构校验和发布验收 Agent，生成最终发布结论

**Requirements:** R5

**Dependencies:** U4

**Files:**
- Create: `scripts/reports/travel-L1-release-check.json`
- Create: `scripts/reports/drama-L1-release-check.json`
- Create: `scripts/reports/exam-L1-release-check.json`

**Approach:**
- 运行 `node scripts/validate-level-data.mjs all 1`，确认结构校验 pass
- 调用 release-checker Agent 对三个轨道分别验收，输出结论 JSON
- 关注：stages=40，words=400，missingExamples=0，missingPhrases=0，missingRelatedWords=0
- 如有 blocked 问题，记录到报告，人工确认后决定是否重新处理

**Patterns to follow:**
- `scripts/agents/release-checker.md` 验收标准

**Test scenarios:**
- Happy path: 三轨道全部输出 `"status": "ready"`，remainingRisks 只含非阻塞项
- Error path: 若某轨道 status = blocked，列出阻塞问题后回到对应轨道的 U1/U2/U3 修复

**Verification:**
- `node scripts/validate-level-data.mjs all 1` 退出码 0
- 三个 release-check 报告均 `status: "ready"`
- 报告中 highSeverityIssues = 0

---

## System-Wide Impact

- **Interaction graph:** 只修改 JSON 数据文件，不影响前端代码；seed.ts 初始化逻辑读取 JSON，不需修改
- **Error propagation:** 单词修复失败不阻塞同 stage 其他词；高严重度问题需人工介入，记录在报告中
- **State lifecycle risks:** Agent 每次写入前先读取完整 JSON，避免覆盖其他 stage 的修改；建议 stage 级原子写入
- **Unchanged invariants:** 词表结构（chapter/stage/word count）、word/pos/meaning/definition/phonetic 字段保持不变
- **Integration coverage:** 内容替换后需在 App（localhost:5173）中手动抽检 2-3 个词的展示效果

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 占位符例句中 `checked: true` 可能骗过校验脚本 | validate-level-data.mjs 已有 `isDefinitionLike` 检查，但不检查内容质量；release-checker Agent 会做语义层验收 |
| 1200 词批量处理时 context 溢出 | 以 stage（10 词）为粒度，单次调用不超过 50-100 tokens 词条 |
| 某些词多义项，义项例句互相混淆 | example-writer 按 sense 逐一生成，reviewer 按义项准确性检查 |
| 三轨道并行写入同一目录（无冲突） | 三个 JSON 文件完全独立，不存在并发写入冲突 |
| 词组难以找到高质量例子（冷门词） | phrase-related-writer 允许只补 1 个 phrase，不强制凑数 |

---

## Documentation / Operational Notes

- 生成报告保存到 `scripts/reports/`，作为内容生产历史记录
- 完成后建议在 App（localhost:5173）中随机抽检 travel ch1 的词汇展示，验证例句展示效果
- 后续 L2-L6 可复用本计划完全相同的流水线

---

## Sources & References

- `scripts/agents/example-writer.md`
- `scripts/agents/example-reviewer.md`
- `scripts/agents/phrase-related-writer.md`
- `scripts/agents/release-checker.md`
- `docs/CONTENT_AGENT_WORKFLOW.md`
- `docs/DIFFICULTY_DESIGN.md`
- `scripts/validate-level-data.mjs`
