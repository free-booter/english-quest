# English Quest 词库 Agent 流水线操作手册

> 本文档是单一操作入口。启动任务时只需读这一个文件。  
> 背景设计见 `docs/CONTENT_AGENT_WORKFLOW.md`，不需要重复阅读。

---

## 角色速览（4 个）

| 文件 | 职责 | 输入 | 输出 |
|------|------|------|------|
| `example-writer.md` | 生成义项、例句、音标、词性 | 词汇列表 + 上下文 | 10 个词的完整 JSON |
| `example-reviewer.md` | 审核例句质量，挑错 | writer 的输出 | pass/fail + suggestedFix |
| `phrase-related-writer.md` | 补词组和相关词 | 词汇列表 + 上下文 | phrases + relatedWords |
| `release-checker.md` | 最终验收整个 stage/文件 | L1.json | ready/blocked 结论 |

---

## 完整流程（一个 Chapter = 4 个 Stage = 40 词）

```
┌─────────────────────────────────────────────────────┐
│  Step 1: 并行启动 N 个 writer agent（每 stage 一个） │
│  → 收到输出后立即启动对应的 reviewer                 │
│  → reviewer 完成后立即启动 phrase-related-writer     │
│  Step 2: 等所有 agent 全部完成                       │
│  Step 3: 整合数据，应用 reviewer 的所有修复          │
│  Step 4: 写入 L1.json                               │
│  Step 5: 标记进度（l1-progress.mjs mark）            │
│  （可选）Step 6: release-checker 验收整个 chapter    │
└─────────────────────────────────────────────────────┘
```

**关键原则：**
- 以 stage（10 词）为粒度，不要一次处理整个 chapter
- writer 完成后**立即**发 reviewer，不等其他 stage——流水线并行
- phrase-related-writer 和 reviewer **是并行关系**，reviewer 完成后才发 phrase-writer，但不同 stage 的 phrase-writer 可以同时跑
- **最后统一整合写文件**，不要每个 stage 单独写（避免文件频繁读写冲突）

---

## Prompt 模板

### Writer Agent Prompt

```
你是 English Quest 的例句生成 Agent。

## 角色（来自 scripts/agents/example-writer.md）
- 为词库中每个词生成教学内容
- 只输出可写入 JSON 的内容

## 上下文
- track: {travel/drama/exam}（旅行家/追剧党/应试派）
- level: L1（入门基础）
- chapter: {章节名}
- scenario: {章节情景描述}
- stage title: {舞台名}
- stage theme: {主题}

## 词汇列表（10个）
{word1}, {word2}, ..., {word10}

## 输出要求
- senses：1-2 个义项，每个有 meaning/important/example({en,zh,source:"generated",checked:false})
- teachingExamples：取最重要的 1-2 条 example
- phonetic：英式音标，格式如 [ˈpæspɔːt]
- pos：n. / v. / adj. 等
- meaning：最核心中文释义（简洁，如"护照"）
- contentStatus: "reviewed"
- 例句：L1 标准，5-10 个英文词，口语化，贴合轨道场景，必须包含目标词
- important: true 只标记最核心义项（一般每词只有一个 true）

## 输出格式
输出一个 JSON 数组，包含 10 个词对象。只输出 JSON，不要其他解释。
```

**轨道风格提示（加在"输出要求"之前）：**
- travel：机场、酒店、餐厅、交通、购物、问路、突发情况
- drama：影视对白，短句有情绪，朋友聊天/恋爱/家庭/争吵
- exam：阅读理解/写作语境，体现词义和搭配

---

### Reviewer Agent Prompt

```
你是 English Quest 的例句审核 Agent（scripts/agents/example-reviewer.md）。
你的任务是挑错验收，不负责自由创作。

## 审核上下文
- track: {track}
- level: L1
- chapter: {章节名}
- stage title: {舞台名}
- stage theme: {主题}

## 必查项目
- 每个中文义项是否都有对应例句
- 例句是否包含目标词（复数/变形也算）
- 目标词用法是否符合当前义项
- 中文翻译是否准确自然（不文言、不超译）
- L1 例句是否过长（超过 12 个英文词视为偏长）
- 例句是否符合轨道场景
- important: true 是否只标记最核心义项

## 严重程度
- high: 词义错误、翻译错误、语法错误、不包含目标词
- medium: 难度偏高、场景不匹配、表达不自然
- low: 可读性一般、中文略生硬

## 待审核数据
{粘贴 writer 的完整 JSON 输出}

## 输出格式
逐词给出审核结论（pass/fail + issues）。
失败时提供 suggestedFix 完整词对象。
最后给整体汇总：通过/失败词数统计。
```

---

### Phrase-Related-Writer Agent Prompt

```
你是 English Quest 的词组和相关词 Agent（scripts/agents/phrase-related-writer.md）。

## 上下文
- track: {track}
- level: L1
- chapter: {章节名}
- stage title: {舞台名}
- stage theme: {主题}

## 生成标准
- L1 每个词补 1 到 3 个 phrases（常见词组/搭配）
- L1 每个词补 1 到 4 个 relatedWords（同族词/近义词/反义词/易混词）
- 旅行家优先场景词组，不要硬凑
- phrases 的 example 必须包含该 phrase
- relatedWords 的 type 只能是：family / synonym / antonym / confusable

## 待处理的 10 个词
{word1}, {word2}, ..., {word10}

## 输出格式
输出一个 JSON 数组，每个词对象只包含 word + phrases + relatedWords：

[
  {
    "word": "passport",
    "phrases": [
      { "phrase": "passport control", "meaning": "护照查验处",
        "example": { "en": "...", "zh": "..." } }
    ],
    "relatedWords": [
      { "word": "visa", "type": "confusable", "meaning": "签证" }
    ]
  }
]

只输出 JSON，不要其他解释。
```

---

## Reviewer 实际会发现的问题（经验汇总）

本节来自 travel-L1 章节1实际运行记录，作为预期问题参考：

| 问题类型 | 示例 | 严重度 |
|----------|------|--------|
| 音标缺字母 | `[ˈreɪzə]` 应为 `[ˈreɪzər]` | high |
| pos 与义项矛盾 | pos="n." 但有"允许（动词）"义项 | high |
| 义项一和例句语言不一致 | meaning="机票" 但例句只写 ticket 未说明是机票 | medium |
| 中文文言表达 | "以备雨天之需" 应改为 "以防下雨" | medium |
| 中文语义偏窄 | "stay cool" 译成"防晒"，实为"保持凉爽" | medium |
| 次要义项例句离轨 | 入场券例句写演出，travel 主题应写博物馆门票 | low |
| 义项二例句与义项一重叠 | cable 的电缆义项，例句仍是数据线场景 | medium |

**通过率参考**：travel 章节1实测，40词中 8 词需修复（~80% 首次通过）。

---

## 数据整合写文件（Step 3-4）

等所有 agent 完成后，在主对话中手动执行：

1. **应用所有修复**：把 reviewer 的 suggestedFix 覆盖 writer 原始输出中对应词
2. **合并 phrases/relatedWords**：把 phrase-writer 的输出按 word 字段 merge 进对应词对象
3. **构建 chapter JSON**：
   ```json
   {
     "id": "{track}-L1-c{N}",
     "level": 1,
     "index": N,
     "title": "{章节名}",
     "scenario": "{情景描述}",
     "stages": [
       { "id": "{track}-L1-c{N}-s1", "index": globalStageIndex,
         "title": "...", "theme": "...", "words": [...] }
     ]
   }
   ```
4. **写入文件**：`src/data/tracks/{track}/L{level}.json`

   文件顶层结构：
   ```json
   {
     "level": 1,
     "name": "入门基础",
     "chapters": [ ...所有 chapter 对象... ]
   }
   ```

5. **标记进度**：
   ```bash
   node scripts/l1-progress.mjs mark travel examples {stageId}
   node scripts/l1-progress.mjs mark travel phrases {stageId}
   ```

---

## 断点续跑

```bash
# 查看当前进度
npm run l1:progress:status

# 查看下一批待处理 stage
npm run l1:progress:next -- travel examples --count=4

# 手动标记某个 stage 完成
node scripts/l1-progress.mjs mark travel examples travel-L1-c1-s1
```

如果中断了，用 `next` 命令找到未完成的 stage，重新发 writer agent 继续。

---

## 一次完整 Chapter 的耗时参考

travel 章节1（40词）实测：
- 4 个 writer 并行：~30s
- 4 个 reviewer 滚动启动（writer 完成即触发）：~45s
- 4 个 phrase-writer 并行：~40s
- 合计墙上时间：约 2-3 分钟（并行下）

10 个 chapter 完整跑完预计：25-30 分钟（分批并行）

---

## 不要做的事

- 不要一次把整个 chapter（40词）塞给一个 writer，会超 context
- 不要跳过 reviewer 直接写文件
- 不要让 agent 自己写文件（容易覆盖其他 stage 数据），统一由主对话整合写入
- reviewer 给出 suggestedFix 后，不要人工修改 suggestedFix 的 JSON，直接用它

---

## 文件路径速查

```
scripts/
├── agents/
│   ├── RUNBOOK.md              ← 你正在读的文件
│   ├── example-writer.md       ← writer 角色定义
│   ├── example-reviewer.md     ← reviewer 角色定义
│   ├── phrase-related-writer.md ← 词组角色定义
│   └── release-checker.md      ← 验收角色定义
├── config/
│   ├── travel-L1.json          ← 词表配置（章节/stage/词汇列表）
│   ├── drama-L1.json
│   └── exam-L1.json
├── reports/
│   └── progress/
│       └── travel-L1.progress.json  ← 断点进度（运行 init 生成）
└── l1-progress.mjs             ← 进度管理工具

src/data/tracks/
├── travel/L1.json              ← 最终输出文件
├── drama/L1.json
└── exam/L1.json
```
