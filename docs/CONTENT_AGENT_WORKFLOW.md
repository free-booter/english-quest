# 内容生产多 Agent 工作流

*创建：2026-04-28 | 版本：v1.0*

---

## 这份文档解决什么问题

English Quest 的词库扩展不是简单地把 ECDICT 里的词批量塞进 App，而是先由课程设计决定：

- 哪个轨道需要什么词。
- 哪个等级应该学到什么难度。
- 每个词出现在什么场景里。
- 例句是否符合用户当前学习阶段。
- 中文释义、例句翻译、词性、音标是否可信。

因此，后续内容生产需要一套可重复执行的流程。这里的“多 Agent”不是训练多个模型，也不是必须购买某个独立产品，而是用不同角色、不同提示词、不同质量标准，让大模型在内容生产流水线里承担不同职责。

---

## 什么才算 Agent

### 普通大模型调用

普通大模型调用通常是一次问答：

```text
输入：给 passport 写一个例句
输出：I need my passport at the airport.
```

它可以帮忙，但它没有明确目标、没有持续检查、没有工具权限、没有状态记录，也不会主动发现问题。

### Agent

Agent 是“有目标、有工具、有判断标准、能循环执行直到完成”的工作单元。

在本项目里，一个内容生产 Agent 至少应该具备：

- **角色**：它负责生成、审核、修复、验收中的哪一类工作。
- **输入**：它读取哪些文件、哪些字段、哪些上下文。
- **输出**：它必须产出 JSON、报告、修复补丁或审核结论。
- **工具**：它能读写文件、运行校验脚本、搜索词库、比较差异。
- **标准**：它知道什么算合格，什么必须拒绝。
- **循环**：发现问题后可以继续修复，而不是只回答一次。
- **完成信号**：它明确说明任务完成、剩余风险和需要人工确认的部分。

一句话定义：

```text
Agent = 大模型 + 角色提示词 + 可用工具 + 输入输出协议 + 质量标准 + 执行循环
```

### 本项目当前处于什么阶段

当前项目已经具备 Agent 工作流的基础：

- `docs/DIFFICULTY_DESIGN.md` 定义课程难度标准。
- `scripts/config/*.json` 定义课程编排。
- `scripts/generate-level-data.mjs` 从 ECDICT 补音标、词性、释义。
- `src/data/tracks/*/L1.json` 是生成后的课程数据。

还没有完全具备的是：

- 专门的例句生成脚本。
- 专门的例句审核脚本。
- 自动质量报告。
- Agent 角色提示词文件。
- 人工确认和回写流程。

---

## 为什么不建议一开始训练模型

“训练一个 Agent”这个说法容易混淆。大多数情况下，你现在不需要 fine-tune 或训练模型。

原因：

- 你还没有足够多的高质量“通过/不通过”样本。
- 当前问题主要是流程和标准问题，不是模型能力不够。
- 例句质量可以通过角色拆分、提示词、规则校验、人工抽检显著提升。
- 训练模型会增加成本、数据准备、评估和维护复杂度。

更合理的路线是：

```text
先用 prompt + 脚本 + 审核流程稳定产出
        ↓
积累人工修正样本和审核报告
        ↓
总结常见错误，优化提示词和规则
        ↓
如果规模很大且错误模式稳定，再考虑训练或微调
```

---

## 多 Agent 总体架构

推荐把内容生产拆成 6 个 Agent 角色。

```text
课程设计 Agent
        ↓
词条资料 Agent
        ↓
例句生成 Agent
        ↓
例句审核 Agent
        ↓
修复 Agent
        ↓
发布验收 Agent
```

这些角色可以先由 Cursor 人工触发，也可以后续写成脚本批量调用 API。

---

## Agent 角色定义

### 1. 课程设计 Agent

#### 目标

确保词表符合轨道、等级和场景设计，而不是只按词频堆词。

#### 输入

- `docs/DIFFICULTY_DESIGN.md`
- `docs/LEVEL_SYSTEM_PLAN.md`
- `scripts/config/{track}-L{level}.json`
- 可选候选词池，如 `scripts/word-pools/*.json`

#### 输出

- 更新后的 `scripts/config/{track}-L{level}.json`
- 课程设计说明或变更报告
- 被拒绝词列表
- 需要人工确认的词列表

#### 判断标准

课程设计 Agent 应检查：

- 词是否符合轨道定位。
- 词是否符合等级难度。
- 每关 10 个词是否围绕同一场景。
- 同一等级内是否重复太多。
- 是否存在不适合 L1 的冷门词、专业词、抽象词。
- 应试派是否符合 CET4/CET6/IELTS/TOEFL/GRE 分层。
- 旅行家是否覆盖真实旅行流程。
- 追剧党是否覆盖情绪、关系、剧情和口语表达。

#### 示例提示词

```text
你是 English Quest 的课程设计 Agent。

你的任务是审查 scripts/config/travel-L1.json 是否符合 docs/DIFFICULTY_DESIGN.md。

请重点检查：
1. 每个 stage 的 10 个词是否围绕同一旅行场景。
2. 是否存在对 L1 用户过难、过抽象、过专业的词。
3. 是否存在重复词或相邻 stage 主题重叠。
4. 是否存在更适合替换的词。

输出：
- 问题列表
- 严重程度
- 建议替换词
- 是否建议直接修改配置
```

---

### 2. 词条资料 Agent

#### 目标

为课程配置中的单词补齐基础资料，但不负责创作例句。

#### 输入

- `scripts/config/{track}-L{level}.json`
- `scripts/.cache/ecdict-index.json`
- `scripts/generate-level-data.mjs`

#### 输出

- `src/data/tracks/{track}/L{level}.json`
- 资料缺失报告

#### 判断标准

词条资料 Agent 应检查：

- `word` 是否存在。
- `phonetic` 是否为空。
- `pos` 是否为空或明显错误。
- `meaning` 是否为空。
- `meaning` 是否包含太多无关释义。
- ECDICT 返回的释义是否混入医学、法律、网络释义等不适合主释义的内容。

#### 重要边界

ECDICT 的 `definition` 字段可以保留为英文释义，但不要直接当成教学例句。

不推荐：

```json
{
  "examples": [
    {
      "en": "n. a document issued by a country to a citizen allowing that person to travel abroad",
      "zh": ""
    }
  ]
}
```

推荐：

```json
{
  "definition": "a document issued by a country to a citizen allowing that person to travel abroad",
  "examples": []
}
```

---

### 3. 例句生成 Agent

#### 目标

为每个词生成符合轨道、等级、场景的自然例句和中文翻译。

#### 输入

- 轨道：`travel` / `drama` / `exam`
- 等级：`L1` 到 `L6`
- 章节标题
- Stage 标题和 theme
- 目标词
- 词性
- 中文主释义
- 可选英文 definition

#### 输出

每个词 1 到 2 条例句：

```json
{
  "examples": [
    {
      "en": "I forgot my passport at the hotel.",
      "zh": "我把护照忘在酒店了。",
      "source": "generated",
      "checked": false
    }
  ]
}
```

#### 通用生成标准

例句必须满足：

- 英文自然、常见、无语法错误。
- 必须包含目标词本身，除非是词形变化被明确允许。
- 中文翻译准确，不要过度意译。
- 不包含敏感、歧视、暴力、成人内容。
- 不使用比当前等级明显更难的表达。
- 不为了硬塞单词而写奇怪句子。
- 每个词的例句尽量短，尤其是 L1-L2。

#### 按等级控制难度

L1：

- 句子 5 到 10 个英文词优先。
- 使用简单现在时、简单过去时。
- 避免从句、抽象表达、复杂搭配。

L2：

- 可使用简单从句。
- 句子 8 到 14 个词。
- 开始体现常见搭配。

L3：

- 允许更完整语境。
- 可以出现多义词的具体语境。

L4：

- 可用于阅读、表达、讨论场景。
- 允许一定抽象表达。

L5：

- 强调近义词辨析、搭配、考试写作。

L6：

- 强调语域、文化语境、地道表达。

#### 按轨道控制风格

旅行家：

```text
例句应像真实旅行中会说或会看到的话。
优先场景：机场、酒店、餐厅、交通、购物、问路、突发情况。
```

示例：

```json
{
  "word": "passport",
  "en": "I need my passport at the airport.",
  "zh": "我在机场需要我的护照。"
}
```

追剧党：

```text
例句应像影视对白，短、自然、有情绪。
优先场景：朋友聊天、恋爱、家庭、争吵、误会、职场对话。
```

示例：

```json
{
  "word": "nervous",
  "en": "You look nervous. What happened?",
  "zh": "你看起来很紧张。发生什么了？"
}
```

应试派：

```text
例句应服务阅读理解和写作表达。
优先体现词义、搭配、学术/考试语境。
```

示例：

```json
{
  "word": "affect",
  "en": "Sleep can affect your memory.",
  "zh": "睡眠会影响你的记忆。"
}
```

#### 示例提示词

```text
你是 English Quest 的例句生成 Agent。

请为以下词生成 1 条英文例句和中文翻译。

轨道：travel
等级：L1
章节：机场出发
关卡：登机流程
目标词：boarding
词性：n.
中文释义：登机

要求：
1. 英文必须自然，像真实旅行场景中会出现的话。
2. 英文必须包含 boarding。
3. L1 难度，句子尽量短，不要复杂从句。
4. 中文翻译准确自然。
5. 只输出 JSON。

输出格式：
{
  "en": "...",
  "zh": "...",
  "source": "generated",
  "checked": false
}
```

---

### 4. 例句审核 Agent

#### 目标

只负责挑错，不负责创作。它应该像严格编辑一样审查例句是否可发布。

#### 输入

- 生成后的词条 JSON
- 轨道、等级、章节、关卡上下文
- `docs/DIFFICULTY_DESIGN.md`

#### 输出

审核报告：

```json
{
  "word": "passport",
  "status": "pass",
  "issues": [],
  "suggestedFix": null
}
```

或：

```json
{
  "word": "affect",
  "status": "fail",
  "issues": [
    {
      "type": "translation_inaccurate",
      "severity": "high",
      "message": "中文翻译没有体现 affect 的动词含义。"
    }
  ],
  "suggestedFix": {
    "en": "Sleep can affect your memory.",
    "zh": "睡眠会影响你的记忆。"
  }
}
```

#### 审核维度

例句审核 Agent 应检查：

- **词义准确性**：例句中的用法是否匹配当前主释义。
- **词性准确性**：目标词在句子里的词性是否和词条一致。
- **翻译准确性**：中文是否漏译、错译、过度发挥。
- **自然度**：英文是否像真实表达，不是中式英语。
- **等级匹配**：L1 不应出现复杂从句或高级词堆叠。
- **轨道匹配**：旅行词应有旅行场景，追剧词应有对白感，应试词应帮助考试理解。
- **目标词覆盖**：例句是否真的包含目标词。
- **安全性**：是否有不适合学习 App 的内容。
- **唯一性**：是否与其他词例句高度重复。

#### 严重程度

高：

- 词义用错。
- 翻译错误。
- 语法错误。
- 不包含目标词。
- 与轨道完全不匹配。

中：

- 句子不自然。
- 难度偏高。
- 例句太长。
- 中文翻译生硬。

低：

- 可读性一般。
- 例句信息量不足。
- 可以更贴近场景。

#### 示例提示词

```text
你是 English Quest 的例句审核 Agent。

你的任务不是生成新内容，而是严格审核下面的词条例句是否可以发布。

轨道：exam
等级：L1
章节：基础行为动词 I
关卡：动词 A-C
目标词：affect
词性：vt.
主释义：影响
例句：
Sleep can affect your memory.
睡眠会影响你的记忆。

请检查：
1. 英文用法是否准确。
2. 中文翻译是否准确。
3. 是否符合应试派 L1 难度。
4. 是否适合作为教学例句。

只输出 JSON：
{
  "status": "pass" | "fail",
  "issues": [],
  "suggestedFix": null
}
```

---

### 5. 修复 Agent

#### 目标

根据审核报告修复失败条目。

#### 输入

- 失败条目
- 审核报告
- 原始词条
- 轨道和等级上下文

#### 输出

- 修复后的 JSON
- 修复说明

#### 工作原则

修复 Agent 不能随意改课程结构。它只能修：

- 例句英文。
- 例句中文。
- 明显错误的主释义。
- 明显错误的词性。
- 空音标标记为待补。

如果发现词本身不适合当前关卡，应交回课程设计 Agent，而不是私自替换。

#### 示例提示词

```text
你是 English Quest 的修复 Agent。

请根据审核报告修复这个词条的 examples 字段。

限制：
1. 不要改 word。
2. 不要改 stage 结构。
3. 除非明显错误，不要改 meaning。
4. 修复后必须仍然符合 travel L1 难度和当前场景。

输出修复后的完整 word 对象。
```

---

### 6. 发布验收 Agent

#### 目标

在内容写入正式数据前做最后验收，防止坏数据进入 App。

#### 输入

- `src/data/tracks/{track}/L{level}.json`
- 生成报告
- 审核报告
- 修复记录

#### 输出

- 发布结论：`ready` / `blocked`
- 阻塞问题列表
- 可接受风险列表
- 人工抽检建议

#### 验收门槛

一个等级数据可发布，需要满足：

- 每个 stage 正好 10 个词。
- 每个 track L1 正好 40 关、400 词。
- `word`、`pos`、`meaning` 不为空。
- 空 `phonetic` 数量低于可接受阈值，且有报告。
- 每个词至少 1 条通过审核的例句。
- 高严重度问题为 0。
- 中严重度问题低于阈值。
- 配置词和生成词数量一致。
- 没有重复 ID。
- 没有 JSON 结构错误。

---

## 推荐数据结构调整

当前生成数据中，ECDICT 的英文释义被放进了 `examples`，后续建议改成：

```ts
export interface Word {
  id: string
  word: string
  phonetic?: string
  pos: string
  meaning: string
  definition?: string
  examples?: WordExample[]
  roots?: string
  family?: string[]
  rootHint?: string
  trackTags: string[]
  difficulty: 1 | 2 | 3 | 4 | 5 | 6
  mastery: 0 | 1 | 2 | 3 | 4 | 5
}

export interface WordExample {
  en: string
  zh: string
  source: 'manual' | 'generated' | 'dictionary'
  checked: boolean
  reviewer?: 'agent' | 'human'
  note?: string
}
```

这样可以区分：

- `meaning`：给用户看的中文主释义。
- `definition`：英文释义，不一定展示。
- `examples`：真正教学例句。
- `source`：例句来源。
- `checked`：是否审核通过。

---

## 推荐文件组织

建议后续增加：

```text
scripts/
├── agents/
│   ├── course-designer.md
│   ├── lexical-enricher.md
│   ├── example-writer.md
│   ├── example-reviewer.md
│   ├── content-fixer.md
│   └── release-checker.md
├── reports/
│   ├── travel-L1-example-review.json
│   └── travel-L1-release-check.json
├── generate-level-data.mjs
├── generate-examples.mjs
├── review-examples.mjs
└── validate-level-data.mjs
```

其中：

- `scripts/agents/*.md` 存放 Agent 角色提示词。
- `scripts/reports/*.json` 存放生成和审核报告。
- `generate-examples.mjs` 调用例句生成 Agent。
- `review-examples.mjs` 调用例句审核 Agent。
- `validate-level-data.mjs` 做程序化校验。

---

## 完整工作流程

### 阶段 1：课程配置

由人和课程设计 Agent 共同维护：

```text
scripts/config/travel-L1.json
scripts/config/drama-L1.json
scripts/config/exam-L1.json
```

目标是先确定：

- 章节。
- Stage。
- 每关 10 个词。
- 场景顺序。
- 难度是否合理。

这一阶段不追求音标、释义、例句完整。

### 阶段 2：基础词条生成

运行：

```bash
node scripts/generate-level-data.mjs all 1
```

生成：

```text
src/data/tracks/travel/L1.json
src/data/tracks/drama/L1.json
src/data/tracks/exam/L1.json
```

这一阶段由 ECDICT 补：

- 音标。
- 词性。
- 中文释义。
- 英文 definition。

### 阶段 3：程序校验

运行未来的校验脚本：

```bash
node scripts/validate-level-data.mjs all 1
```

检查：

- 空字段。
- 重复词。
- 重复 ID。
- 每关词数。
- 每等级关卡数。
- 释义异常。
- 音标缺失。

### 阶段 4：例句生成

运行未来的例句脚本：

```bash
node scripts/generate-examples.mjs travel 1
```

例句生成 Agent 根据轨道和场景补：

- 英文例句。
- 中文翻译。
- `source: "generated"`。
- `checked: false`。

### 阶段 5：例句审核

运行：

```bash
node scripts/review-examples.mjs travel 1
```

例句审核 Agent 输出：

```text
scripts/reports/travel-L1-example-review.json
```

报告包含：

- 通过数量。
- 失败数量。
- 高/中/低严重度问题。
- 每个失败词的原因。
- 建议修复。

### 阶段 6：修复

修复 Agent 根据审核报告修复失败条目。

对于高严重度问题：

- 自动修复后必须再次审核。
- 连续两次失败则标记人工处理。

对于中低严重度问题：

- 可批量修复。
- 发布前抽检。

### 阶段 7：人工抽检

建议抽检比例：

- L1：至少 20%。
- L2-L3：至少 10%。
- L4-L6：至少 5%，但考试词和高级表达应提高抽检比例。

重点抽检：

- 首页或新手流程会看到的内容。
- 高频词。
- 多义词。
- 文化表达。
- 例句审核 Agent 给出低信心的词。

### 阶段 8：发布验收

发布验收 Agent 给出结论：

```json
{
  "status": "ready",
  "track": "travel",
  "level": 1,
  "summary": {
    "stages": 40,
    "words": 400,
    "examplesChecked": 400,
    "highSeverityIssues": 0
  },
  "remainingRisks": [
    "9 words have empty phonetic fields."
  ]
}
```

---

## 质量门禁

### 必须阻塞发布

以下问题必须阻塞：

- JSON 无法解析。
- 关卡词数不对。
- `word` 为空。
- `meaning` 为空。
- 例句语法错误。
- 例句词义错误。
- 中文翻译错误。
- L1 出现明显超纲复杂例句。
- 同一关出现大量重复词。

### 可以带报告发布

以下问题可以带报告发布：

- 少量音标为空。
- 个别例句自然度一般但准确。
- 中文翻译略生硬但不错误。
- 少量低优先级风格问题。

### 必须人工确认

以下问题交给人工：

- 俚语、双关、文化梗。
- 多义词主释义选择。
- 考试词是否符合大纲。
- 可能引发误解的敏感语境。
- Agent 多次修复仍失败的词。

---

## Cursor 阶段如何使用多 Agent

在还没有脚本化之前，可以直接用 Cursor 手动跑。

### 例句生成

```text
请你作为 English Quest 的例句生成 Agent，
读取 src/data/tracks/travel/L1.json 的第 1 个 chapter，
为每个词生成 1 条 travel L1 难度的自然例句和中文翻译。

要求：
- 不改课程结构。
- 例句必须包含目标词。
- 不要使用复杂从句。
- 写回 examples 字段。
```

### 例句审核

```text
请你作为 English Quest 的例句审核 Agent，
审核 src/data/tracks/travel/L1.json 第 1 个 chapter 的 examples。

请输出：
- 通过词数
- 失败词数
- 每个失败词的问题
- 建议修复

不要直接改文件，先给审核报告。
```

### 修复

```text
请你作为 English Quest 的修复 Agent，
根据刚才的审核报告修复失败例句。

限制：
- 只改 examples。
- 不改 word、stage、chapter。
- 修复后再次检查是否符合 travel L1。
```

---

## API 自动化阶段如何实现

当内容量扩大到 L2-L6，建议写脚本调用模型 API。

### 例句生成脚本输入

```json
{
  "track": "travel",
  "level": 1,
  "chapter": "机场出发",
  "stage": "登机流程",
  "theme": "从值机到登机",
  "word": {
    "word": "boarding",
    "pos": "n.",
    "meaning": "登机"
  }
}
```

### 例句生成脚本输出

```json
{
  "en": "Boarding starts in ten minutes.",
  "zh": "登机将在十分钟后开始。",
  "source": "generated",
  "checked": false
}
```

### 审核脚本输出

```json
{
  "word": "boarding",
  "status": "pass",
  "confidence": 0.94,
  "issues": []
}
```

### 建议批处理粒度

不要一次把整个 L1 的 400 词都丢给模型。建议：

- 以 stage 为单位生成：一次 10 个词。
- 以 stage 为单位审核：一次 10 个词。
- 失败项单独修复。
- 每次写入前保存报告。

这样更容易追踪问题，也更容易回滚。

---

## L1 断点续跑（检查点）

子会话或 Cursor 会话中断后，可从**已完成的 stage** 继续，而不用从头跑整轨。

- **检查点文件**（可先运行 `npm run l1:progress:init` 生成）：
  - `scripts/reports/progress/travel-L1.progress.json`
  - `scripts/reports/progress/drama-L1.progress.json`
  - `scripts/reports/progress/exam-L1.progress.json`
- 每个文件内含两阶段：`examples`（例句生成+审核）与 `phrases`（词组+相关词），字段 `completedStageIds` 记录已落地的 stage id（如 `travel-L1-c1-s1`）。

**常用命令**（或直接 `node scripts/l1-progress.mjs …`）：

| 命令 | 作用 |
|------|------|
| `npm run l1:progress:init` | 初始化/同步检查点文件（相对 `L1.json` 的 40 个 stage） |
| `npm run l1:progress:status` | 查看三轨完成情况 |
| `npm run l1:progress:next -- travel examples --count=3` | 查看 travel 下一阶段待处理的至多 3 个 stage |

每处理完一个 stage 并写回 `L1.json` 后执行：

`node scripts/l1-progress.mjs mark travel examples travel-L1-c1-s1`

向主会话说明续跑时，可粘贴检查点路径并写：「从 `next` 输出的第一个 stage 继续」。

---

## Agent 不应该做什么

内容生产 Agent 不应该：

- 私自改变轨道设计。
- 私自新增章节。
- 私自删除用户已经确认过的词。
- 把 ECDICT 英文释义当作自然例句。
- 为了通过审核编造不存在的词义。
- 不写报告就直接大量修改正式数据。
- 在没有人工确认时批量替换 L1 核心词。

---

## 第一阶段落地建议

建议按以下顺序推进：

1. 调整 `generate-level-data.mjs`，把 ECDICT `definition` 写入 `definition` 字段，不再写入 `examples`。
2. 增加 `validate-level-data.mjs`，先做纯规则校验。
3. 用 Cursor 手动为 `travel L1` 的 1 个 chapter 生成例句。
4. 用 Cursor 以审核 Agent 角色审查这些例句。
5. 人工确认质量是否满意。
6. 再写 `generate-examples.mjs` 调用模型 API 批量生成。
7. 再写 `review-examples.mjs` 调用模型 API 批量审核。
8. 最后把报告纳入发布验收流程。

第一阶段目标不是一次性生成 5000 个词的所有例句，而是先验证：

- 角色提示词是否稳定。
- 审核标准是否有效。
- 生成例句是否符合轨道风格。
- 人工修正成本是否可接受。

---

## 当前结论

English Quest 现在不需要训练一个专门模型，也不需要马上搭复杂 Agent 平台。

更合适的做法是：

```text
先把 Agent 定义成内容生产角色
        ↓
用 Cursor 手动验证角色流程
        ↓
把稳定流程沉淀成 scripts/agents/*.md
        ↓
再用脚本调用模型 API 批量执行
        ↓
用报告和人工抽检守住质量
```

这样既能利用大模型提高内容生产效率，又不会让未经校准的模型输出直接污染正式课程数据。
