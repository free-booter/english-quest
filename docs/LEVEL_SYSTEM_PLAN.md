# L1-L6 等级系统实施计划

## 📋 项目背景

### 当前状态
- **3 个轨道**：旅行家 (travel)、追剧党 (drama)、应试派 (exam)
- **每个轨道约 5 章**，每章 1 个 stage，每 stage 10 词
- **总词汇量**：约 50 词/轨道，**严重不足**
- **等级系统**：Chapter.level 字段存在（1-5），但未真正使用

### 目标状态

| 等级 | 关卡数 | 词汇量 | 累计词汇 | 难度定位 |
|------|--------|--------|----------|----------|
| L1 | 40 | 400 | 400 | 入门基础 |
| L2 | 60 | 600 | 1000 | 日常交流 |
| L3 | 80 | 800 | 1800 | 场景扩展 |
| L4 | 100 | 1000 | 2800 | 四级水平 |
| L5 | 100 | 1000 | 3800 | 六级水平 |
| L6 | 120 | 1200 | 5000 | 进阶表达 |
| **总计** | **500** | **5000** | - | - |

### 词汇量对比参考

| 标准 | 词汇量 | 本系统覆盖 |
|------|--------|-----------|
| 日常交流 | 2000-3000 | L1-L3 ✅ |
| 高考词汇 | ~3500 | L1-L4 ✅ |
| 四级词汇 | ~4500 | L1-L5 ✅ |
| 六级词汇 | ~6000 | L1-L6 ≈ |

---

## 🏗️ 架构设计

### 1. 类型定义修改

```typescript
// src/types/index.ts

// 等级从 1-5 扩展到 1-6
export interface Chapter {
  id: string
  trackId: string
  level: 1 | 2 | 3 | 4 | 5 | 6  // ← 新增 6
  // ...其他字段
}

export interface Word {
  // ...现有字段
  difficulty: 1 | 2 | 3 | 4 | 5 | 6  // ← 同步扩展
}

// 用户等级进度
export interface TrackProgress {
  trackId: string
  currentLevel: 1 | 2 | 3 | 4 | 5 | 6  // ← 扩展
  unlockedLevels: number[]  // ← 新增：已解锁等级列表
  levelProgress: Record<number, { completed: number; total: number }>  // ← 新增
  // ...其他字段
}

// 等级元数据（新增）
export interface LevelMeta {
  level: 1 | 2 | 3 | 4 | 5 | 6
  name: string           // 等级名称
  stageCount: number     // 关卡数
  wordCount: number      // 词汇量
  unlockCondition: string // 解锁条件描述
  color: string          // 主题色
}
```

### 2. 数据文件结构

```
src/data/
├── levels.ts                    # 等级元数据配置
├── tracks/
│   ├── travel/
│   │   ├── index.json           # 轨道基础信息
│   │   ├── L1.json              # L1 等级数据（40关×10词=400词）
│   │   ├── L2.json              # L2 等级数据（60关×10词=600词）
│   │   ├── L3.json              # L3 等级数据（80关×10词=800词）
│   │   ├── L4.json              # L4 等级数据（100关×10词=1000词）
│   │   ├── L5.json              # L5 等级数据（100关×10词=1000词）
│   │   └── L6.json              # L6 等级数据（120关×10词=1200词）
│   ├── drama/
│   │   └── ...（同上）
│   └── exam/
│       └── ...（同上）
```

### 3. 等级数据格式 (L1.json 示例)

```json
{
  "level": 1,
  "name": "入门基础",
  "chapters": [
    {
      "id": "travel-L1-ch1",
      "index": 1,
      "title": "机场出发",
      "scenario": "你第一次坐飞机去旅行...",
      "stages": [
        {
          "id": "travel-L1-ch1-st1",
          "index": 1,
          "title": "行李准备",
          "theme": "打包必备词汇",
          "words": [
            {
              "word": "suitcase",
              "phonetic": "[ˈsuːtkeɪs]",
              "pos": "n.",
              "meaning": "行李箱",
              "examples": [{"en": "I packed my suitcase last night.", "zh": "我昨晚打包了行李箱。"}]
            }
            // ... 共 10 个词
          ]
        },
        // ... 每章约 4 个 stage
      ]
    },
    // ... L1 共约 10 个 chapter，40 个 stage
  ]
}
```

### 4. 等级元数据配置

```typescript
// src/data/levels.ts

export const LEVEL_CONFIG: Record<number, LevelMeta> = {
  1: {
    level: 1,
    name: '入门',
    stageCount: 40,
    wordCount: 400,
    unlockCondition: '注册即解锁',
    color: '#22c55e', // green-500
  },
  2: {
    level: 2,
    name: '初级',
    stageCount: 60,
    wordCount: 600,
    unlockCondition: '完成 L1 30 关',
    color: '#3b82f6', // blue-500
  },
  3: {
    level: 3,
    name: '中级',
    stageCount: 80,
    wordCount: 800,
    unlockCondition: '完成 L2 45 关',
    color: '#8b5cf6', // violet-500
  },
  4: {
    level: 4,
    name: '进阶',
    stageCount: 100,
    wordCount: 1000,
    unlockCondition: '完成 L3 60 关',
    color: '#f59e0b', // amber-500
  },
  5: {
    level: 5,
    name: '高级',
    stageCount: 100,
    wordCount: 1000,
    unlockCondition: '完成 L4 75 关',
    color: '#ef4444', // red-500
  },
  6: {
    level: 6,
    name: '大师',
    stageCount: 120,
    wordCount: 1200,
    unlockCondition: '完成 L5 75 关',
    color: '#ec4899', // pink-500
  },
}

// 解锁条件：完成前一等级约 75% 的关卡
export const UNLOCK_THRESHOLD = 0.75
```

---

## 📱 UI 设计

### 1. 等级选择器（TrackMapPage 新增）

```
┌────────────────────────────────────────┐
│  ← 🌍 旅行家                            │
├────────────────────────────────────────┤
│  选择等级                               │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ L1  │ │ L2  │ │ L3  │               │
│  │入门 │ │初级 │ │🔒   │               │
│  │✓100%│ │ 45%│ │     │               │
│  └─────┘ └─────┘ └─────┘               │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ L4  │ │ L5  │ │ L6  │               │
│  │🔒   │ │🔒   │ │🔒   │               │
│  └─────┘ └─────┘ └─────┘               │
├────────────────────────────────────────┤
│  L2 初级 · 60关 · 600词                 │
│  ▓▓▓▓▓░░░░░ 45% (27/60)                │
├────────────────────────────────────────┤
│  [章节列表...]                          │
└────────────────────────────────────────┘
```

### 2. 等级进度卡片

```
┌──────────────────────────────────┐
│  L2 初级                          │
│  ━━━━━━━━━━░░░░░░░░░░ 45%        │
│  27/60 关 · 270/600 词           │
│  距离解锁 L3 还需完成 18 关        │
│                    [继续学习 →]   │
└──────────────────────────────────┘
```

### 3. 首页推荐适配

- 显示当前等级 + 进度
- 快捷切换等级入口

---

## 📊 词汇数据来源策略

### 词汇来源规划

| 等级 | 词汇量 | 主要来源 |
|------|--------|----------|
| L1 | 400 | 新概念英语第一册 + 小学高频词 |
| L2 | 600 | 新概念英语第二册 + 初中词汇 |
| L3 | 800 | 高考高频词 + 场景扩展 |
| L4 | 1000 | 四级核心词 |
| L5 | 1000 | 六级核心词 |
| L6 | 1200 | 进阶表达 + 地道口语 |

### 各轨道特色词汇

| 轨道 | 特色来源 |
|------|----------|
| 旅行家 | Lonely Planet 常用表达、机场/酒店/餐厅场景词 |
| 追剧党 | 美剧高频词、日常口语、俚语表达 |
| 应试派 | 四六级大纲词、学术词汇、考试高频词 |

### 数据准备方式

**Phase 1-2（L1-L2）**：
- 公开词库为主（准确性高）
- 手动补充例句

**Phase 3-4（L3-L4）**：
- 公开词库 + AI 生成例句
- 人工校验质量

**Phase 5-6（L5-L6）**：
- AI 辅助生成 + 人工校验
- 补充词根、同族词信息

### 词汇数据质量标准

每个词汇**必须**包含：
- [x] word（单词）
- [x] phonetic（音标，IPA 格式）
- [x] pos（词性）
- [x] meaning（中文释义）
- [x] examples（至少 1 个例句，英中对照）

**推荐**包含（L4+ 重点补充）：
- [ ] roots（词根分解）
- [ ] family（同族词）
- [ ] collocations（常见搭配）

---

## 🔄 分阶段实施计划

### Phase 1：基础架构（1-2 天）

**目标**：完成类型定义和数据结构改造

| 任务 | 文件 | 状态 |
|------|------|------|
| 1.1 扩展 Chapter.level 类型到 1-6 | `types/index.ts` | ⬜ |
| 1.2 扩展 Word.difficulty 到 1-6 | `types/index.ts` | ⬜ |
| 1.3 扩展 TrackProgress 增加 unlockedLevels | `types/index.ts` | ⬜ |
| 1.4 创建 LevelMeta 类型 | `types/index.ts` | ⬜ |
| 1.5 创建 levels.ts 配置文件 | `data/levels.ts` | ⬜ |
| 1.6 重构数据目录结构 | `data/tracks/*` | ⬜ |

### Phase 2：L1-L2 数据准备（5-7 天）

**目标**：完成 L1-L2 的词汇数据（1000 词/轨道）

| 任务 | 内容 | 词汇量 | 状态 |
|------|------|--------|------|
| 2.1 travel L1 数据 | 40 关 × 10 词 | 400 词 | ⬜ |
| 2.2 travel L2 数据 | 60 关 × 10 词 | 600 词 | ⬜ |
| 2.3 drama L1 数据 | 40 关 × 10 词 | 400 词 | ⬜ |
| 2.4 drama L2 数据 | 60 关 × 10 词 | 600 词 | ⬜ |
| 2.5 exam L1 数据 | 40 关 × 10 词 | 400 词 | ⬜ |
| 2.6 exam L2 数据 | 60 关 × 10 词 | 600 词 | ⬜ |

**小计**：3000 词（3 轨道 × 1000 词）

### Phase 3：seed.ts 重构（1-2 天）

**目标**：支持多等级数据加载

```typescript
// 新的 seed.ts 结构
async function loadLevelData(trackId: string, level: number) {
  const data = await import(`../data/tracks/${trackId}/L${level}.json`)
  return data.default
}

async function initializeTrack(trackId: string, levels: number[] = [1, 2]) {
  for (const level of levels) {
    const levelData = await loadLevelData(trackId, level)
    // 初始化章节、关卡、词汇...
  }
}
```

| 任务 | 文件 | 状态 |
|------|------|------|
| 3.1 改造 seed.ts 支持动态加载 | `db/seed.ts` | ⬜ |
| 3.2 添加等级解锁逻辑 | `db/seed.ts` | ⬜ |
| 3.3 更新 db.ts 版本号 | `db/db.ts` | ⬜ |
| 3.4 懒加载优化（按需加载等级数据） | `db/seed.ts` | ⬜ |

### Phase 4：UI 等级选择器（2-3 天）

**目标**：用户可在 TrackMapPage 选择等级

| 任务 | 文件 | 状态 |
|------|------|------|
| 4.1 创建 LevelSelector 组件 | `components/LevelSelector.tsx` | ⬜ |
| 4.2 TrackMapPage 集成等级选择 | `pages/track-map/TrackMapPage.tsx` | ⬜ |
| 4.3 等级切换动画效果 | `pages/track-map/TrackMapPage.tsx` | ⬜ |
| 4.4 等级解锁提示 Modal | `components/LevelUnlockModal.tsx` | ⬜ |
| 4.5 等级进度卡片 | `components/LevelProgressCard.tsx` | ⬜ |

**🎯 MVP 里程碑**：Phase 4 完成后可发布，用户可体验 L1-L2

### Phase 5：进度系统升级（1-2 天）

**目标**：按等级追踪学习进度

| 任务 | 文件 | 状态 |
|------|------|------|
| 5.1 TrackProgress 增加 levelProgress 字段 | `types/index.ts` | ⬜ |
| 5.2 更新进度计算逻辑 | `pages/tracks/TracksPage.tsx` | ⬜ |
| 5.3 首页推荐适配等级系统 | `pages/home/HomePage.tsx` | ⬜ |
| 5.4 练习模式词池按等级筛选 | `pages/quick-quiz/*.tsx` | ⬜ |
| 5.5 等级解锁成就系统 | `db/achievements.ts` | ⬜ |

### Phase 6：L3-L6 数据扩展（持续迭代）

**目标**：逐步完成全部 5000 词/轨道

| 等级 | 词汇量/轨道 | 总词汇量 | 预计工时 | 优先级 |
|------|-------------|----------|----------|--------|
| L3 | 800 词 | 2400 词 | 5-7 天 | 中 |
| L4 | 1000 词 | 3000 词 | 7-10 天 | 中 |
| L5 | 1000 词 | 3000 词 | 7-10 天 | 低 |
| L6 | 1200 词 | 3600 词 | 10-14 天 | 低 |

**L3-L6 小计**：12000 词，预计 30-40 天

---

## 🧪 测试清单

### 功能测试

- [ ] 新用户注册后默认解锁 L1
- [ ] L1 完成 30 关后自动解锁 L2
- [ ] 等级选择器正确显示锁定/解锁状态
- [ ] 切换等级后关卡列表正确更新
- [ ] 练习模式只加载当前等级及以下的已学词汇
- [ ] 数据库迁移不影响现有用户数据
- [ ] 等级切换时保持学习进度

### 性能测试

- [ ] 首次加载时间 < 3 秒（仅加载 L1-L2）
- [ ] 等级切换响应 < 500ms
- [ ] 5000 词数据库查询 < 100ms
- [ ] 懒加载不影响用户体验

---

## 📝 迁移策略

### 现有用户数据处理

```typescript
// db.ts version 5 迁移
this.version(5).stores({
  // ... 现有表结构
}).upgrade(async tx => {
  // 1. 将现有关卡归类到 L1
  await tx.table('stages').toCollection().modify(stage => {
    stage.level = 1
  })

  // 2. 初始化 unlockedLevels
  await tx.table('trackProgress').toCollection().modify(progress => {
    progress.unlockedLevels = [1]
    progress.levelProgress = { 1: { completed: 0, total: 40 } }
  })
})
```

### 数据备份

- 迁移前导出 IndexedDB 数据
- 提供"重置进度"选项

---

## ✅ 验收标准

### Phase 1-4 完成后（MVP）

- [x] 用户可选择 L1 或 L2 等级
- [x] 每等级有完整的关卡（L1: 40关，L2: 60关）
- [x] 关卡进度正确保存
- [x] 练习模式正确筛选词汇
- [x] 等级解锁机制正常

### Phase 5-6 完成后（完整版）

- [x] 全部 6 个等级可用
- [x] 500 关/轨道全部可学习
- [x] 5000 词/轨道全部可学习
- [x] 无明显性能问题
- [x] 等级成就系统完整

---

## 🔧 开发注意事项

1. **懒加载数据**：按等级按需加载，不一次性加载 5000 词
2. **词汇 ID 命名规范**：`{track}-L{level}-ch{chapter}-st{stage}-w{index}`
3. **例句质量优先**：宁可少一点，不要有语法错误
4. **音标使用 IPA**：统一使用国际音标，不混用
5. **定期备份数据**：JSON 文件纳入 Git 版本控制
6. **渐进式发布**：先发布 L1-L2，后续逐步添加 L3-L6

---

## 📅 时间线总览

| 阶段 | 内容 | 预计工时 | 里程碑 |
|------|------|----------|--------|
| Phase 1 | 基础架构 | 1-2 天 | 类型系统完成 |
| Phase 2 | L1-L2 数据 | 5-7 天 | 可学习 1000 词/轨道 |
| Phase 3 | seed.ts 重构 | 1-2 天 | 数据正确加载 |
| Phase 4 | UI 等级选择 | 2-3 天 | **🎯 MVP 发布** |
| Phase 5 | 进度系统 | 1-2 天 | 完整体验闭环 |
| Phase 6 | L3-L6 数据 | 30-40 天 | 完整 5000 词 |

**MVP 总计**：约 10-14 天（L1-L2 可用）
**完整版总计**：约 40-55 天（全部 5000 词）

---

## 📈 数据量汇总

| 指标 | 单轨道 | 三轨道合计 |
|------|--------|-----------|
| 等级数 | 6 | 6 |
| 关卡数 | 500 | 1500 |
| 词汇量 | 5000 | 15000 |
| 例句数 | 5000+ | 15000+ |

---

*文档创建：2026-04-27*
*最后更新：2026-04-27*
*版本：v2.0（5000词方案）*
