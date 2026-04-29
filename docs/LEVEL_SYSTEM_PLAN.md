# L1-L6 等级系统实施计划

*更新：2026-04-29*

---

## 📋 项目背景

### 当前状态
- **2 个活跃主题**：旅行家 (travel)、追剧党 (drama)
- **应试派 (exam)**：已从活跃主题中移除，词汇通过高等级关卡自然覆盖
- **每个主题约 3 章（L1-L3）**，词库为占位符内容，正在用多 Agent 流水线补全
- **L1 词汇目标**：每主题 400 词（40 关 × 10 词）

### 目标状态

| 等级 | 关卡数/主题 | 词汇量/主题 | 难度定位 |
|------|------------|------------|----------|
| L1 | 40 | 400 | 入门基础 |
| L2 | 60 | 600 | 日常交流 |
| L3 | 80 | 800 | 场景扩展 |
| L4 | 100 | 1000 | 进阶（相当于四级） |
| L5 | 100 | 1000 | 高阶（相当于六级） |
| L6 | 120 | 1200 | 地道表达 |
| **总计/主题** | **500** | **5000** | - |

---

## 🏗️ 架构设计

### 1. 类型定义

```typescript
// src/types/index.ts
export interface Chapter {
  id: string
  trackId: string
  level: 1 | 2 | 3 | 4 | 5 | 6
  // ...其他字段
}

export interface Word {
  difficulty: 1 | 2 | 3 | 4 | 5 | 6
  // ...其他字段
}

export interface TrackProgress {
  trackId: string
  currentLevel: 1 | 2 | 3 | 4 | 5 | 6
  unlockedLevels: number[]
  levelProgress: Record<number, { completed: number; total: number }>
  // ...其他字段
}
```

### 2. 数据文件结构

```
src/data/tracks/
├── travel/
│   ├── index.json    # 主题元数据
│   ├── L1.json       # 40 章 × 10 词 ← 当前正在补全
│   ├── L2.json       # 待创建
│   └── ...
└── drama/
    ├── index.json
    ├── L1.json       # 待补全
    └── ...
```

### 3. 解锁机制

完成当前等级 75% 的关卡解锁下一等级（`UNLOCK_THRESHOLD = 0.75`）。

---

## 📅 实施阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 基础架构（类型系统、数据结构） | ✅ 已完成 |
| Phase 2 | Travel L1 内容补全（400词） | 🔴 进行中 |
| Phase 3 | Drama L1 内容补全（400词） | ⬜ 待开始 |
| Phase 4 | seed.ts 支持多等级加载 | ⬜ 待开始 |
| Phase 5 | UI 等级选择器（TrackMapPage） | ⬜ 待开始 |
| Phase 6 | L2-L6 数据（每主题 4600词） | ⬜ 长期计划 |

---

## 🔗 相关文档

- 词库内容生产流程：[`docs/CONTENT_AGENT_WORKFLOW.md`](./CONTENT_AGENT_WORKFLOW.md)
- 等级难度设计：[`docs/DIFFICULTY_DESIGN.md`](./DIFFICULTY_DESIGN.md)
- 当前 L1 补全计划：[`docs/plans/2026-04-29-001-feat-l1-content-enrichment-plan.md`](./plans/2026-04-29-001-feat-l1-content-enrichment-plan.md)
