# 插画资源指南

> A+B 混搭模式所需插画的下载和集成指引。
> 
> **目标**: 替代 emoji 的 AI 感，给每个章节配真正的插画。

---

## 1. 资源来源

### 主选: Storyset (https://storyset.com)
- ✅ 完全免费可商用 (无需署名，但建议保留)
- ✅ **可在线编辑**：调颜色、改人物、加文字
- ✅ SVG / PNG / 动画 GIF 三种格式
- ✅ 4 种风格风格切换

**4 种风格风格特点**：
| 风格 | 特点 | 适合 |
|-----|------|-----|
| **rafiki** | 标准多色，人物 + 场景平衡 | 通用，第一选择 |
| **bro** | 单色调，可大幅改色 | 需要风格统一时 |
| **amico** | 暖色调，柔和亲和 | 恋爱/生活场景 |
| **pana** | 圆润可爱，年轻化 | 朋友/休闲场景 |

### 备选: unDraw (https://undraw.co)
- ✅ 单色扁平，可一键改成主题色
- ✅ 风格统一性强
- 适合：应试派的简洁封面

### 备选: Humaaans (https://humaaans.com)
- 可拼装人物角色
- 适合：对话场景的 NPC 头像

---

## 2. 赛道主题色

下载/编辑插画时，请把主色调成对应的赛道色（Storyset 编辑器有取色器）：

| 赛道 | 主题色 | 副色（柔和版本） |
|-----|------|---------------|
| 🌍 旅行家 | `#3b82f6` 蓝 | `#93c5fd` 浅蓝 |
| 🎬 追剧党 | `#a855f7` 紫 | `#d8b4fe` 浅紫 |
| 📚 应试派 | `#ef4444` 红 | `#fca5a5` 浅红 |

---

## 3. 目录结构

下载后请按此结构放置：

```
public/
└── illustrations/
    ├── drama/                    # 追剧党 (5 张章节图)
    │   ├── ch1-greeting.svg
    │   ├── ch2-emotion.svg
    │   ├── ch3-friends.svg
    │   ├── ch4-dating.svg
    │   └── ch5-plot.svg
    ├── travel/                   # 旅行家 (5 张场景图)
    │   ├── ch1-packing.svg
    │   ├── ch2-airport.svg
    │   ├── ch3-customs.svg
    │   ├── ch4-hotel.svg
    │   └── ch5-direction.svg
    ├── exam/                     # 应试派 (1-5 张通用学习图)
    │   └── ch-study.svg
    └── npcs/                     # 对话 NPC 头像 (Humaaans 拼装或 Storyset 单人物)
        ├── friend-girl.svg       # 女性朋友
        ├── friend-boy.svg        # 男性朋友
        ├── staff.svg             # 服务员/前台
        └── traveler.svg          # 旅客 (主角)
```

---

## 4. 命名约定

格式: `<chapter-index>-<keyword>.svg`

例: `ch1-greeting.svg`

**规则**：
- 全小写
- 单词间用 `-` 连接
- 关键词用英文（方便 IDE 搜索）

---

## 5. 章节插画清单

### 🎬 追剧党 (5 章, 对话剧情模式)

每章一张「场景图」+ 几个「角色头像」。

#### Ch1 打招呼·日常寒暄
- **保存为**: `public/illustrations/drama/ch1-greeting.svg`
- **搜索链接**: https://storyset.com/search?q=greeting
- **关键词备选**: `greeting`, `hello`, `welcome`, `meeting friends`
- **推荐风格**: bro 或 amico (改成紫 `#a855f7`)
- **画面**: 两个人相遇打招呼/挥手

#### Ch2 表达情感
- **保存为**: `public/illustrations/drama/ch2-emotion.svg`
- **搜索链接**: https://storyset.com/search?q=emotion
- **关键词备选**: `emotion`, `feelings`, `mood`, `feedback`
- **推荐风格**: amico (改成紫)
- **画面**: 人物表情丰富、emoji 反应

#### Ch3 友情·朋友相聚
- **保存为**: `public/illustrations/drama/ch3-friends.svg`
- **搜索链接**: https://storyset.com/search?q=friends
- **关键词备选**: `friends`, `hangout`, `party`, `together`
- **推荐风格**: rafiki (改成紫)
- **画面**: 一群朋友聚会/聊天

#### Ch4 恋爱·约会
- **保存为**: `public/illustrations/drama/ch4-dating.svg`
- **搜索链接**: https://storyset.com/search?q=dating
- **关键词备选**: `dating`, `couple`, `love`, `coffee date`
- **推荐风格**: pana (改成紫)
- **画面**: 情侣咖啡馆约会

#### Ch5 剧情用语·看剧
- **保存为**: `public/illustrations/drama/ch5-plot.svg`
- **搜索链接**: https://storyset.com/search?q=watching+movie
- **关键词备选**: `watching movie`, `cinema`, `tv series`, `streaming`
- **推荐风格**: bro (改成紫)
- **画面**: 沙发上看电视/电影院

---

### 🌍 旅行家 (5 章, 场景探索模式)

每章一张大场景图，**画面要清晰、元素丰富**（要在图上标互动热点）。

⚠️ 选图重点：场景图里要能看出 8-10 个可点击的物品/人物。

#### Ch1 准备行李
- **保存为**: `public/illustrations/travel/ch1-packing.svg`
- **搜索链接**: https://storyset.com/search?q=packing
- **关键词备选**: `packing`, `luggage`, `travel preparation`, `suitcase`
- **推荐风格**: rafiki (改成蓝 `#3b82f6`)
- **画面**: 行李箱 + 衣物 + 护照 + 票务等元素

#### Ch2 机场出发
- **保存为**: `public/illustrations/travel/ch2-airport.svg`
- **搜索链接**: https://storyset.com/search?q=airport
- **关键词备选**: `airport`, `boarding`, `check in`, `terminal`
- **推荐风格**: bro 或 rafiki (改成蓝)
- **画面**: 值机柜台 / 航站楼 / 登机口

#### Ch3 入境海关
- **保存为**: `public/illustrations/travel/ch3-customs.svg`
- **搜索链接**: https://storyset.com/search?q=customs
- **关键词备选**: `customs`, `passport control`, `immigration`
- **推荐风格**: amico (改成蓝)
- **画面**: 海关柜台 / 边检官员

⚠️ 备选关键词: `passport check` (Storyset 上海关图较少)

#### Ch4 酒店入住
- **保存为**: `public/illustrations/travel/ch4-hotel.svg`
- **搜索链接**: https://storyset.com/search?q=hotel
- **关键词备选**: `hotel`, `check in hotel`, `reception`, `lobby`
- **推荐风格**: pana (改成蓝)
- **画面**: 酒店大堂 / 前台办理

#### Ch5 问路购物
- **保存为**: `public/illustrations/travel/ch5-direction.svg`
- **搜索链接**: https://storyset.com/search?q=asking+directions
- **关键词备选**: `asking directions`, `street`, `shopping`, `tourist`
- **推荐风格**: rafiki (改成蓝)
- **画面**: 街头问路 / 商店购物

---

### 📚 应试派 (5 章, 保留卡片模式)

只需要一张通用学习图作为章节封面。

#### 通用 (5 章共用)
- **保存为**: `public/illustrations/exam/ch-study.svg`
- **搜索链接**: https://storyset.com/search?q=studying
- **关键词备选**: `studying`, `learning english`, `student`, `books`
- **推荐风格**: rafiki (改成红 `#ef4444`)
- **画面**: 学生看书 / 学习场景

如果想为每章单独配图（可选）：
- Ch1 高频动词 — `studying`
- Ch2 思维动词 — `thinking` / `brainstorming`
- Ch3 抽象名词 — `mind map` / `concepts`
- Ch4 学术名词 — `research` / `analysis`
- Ch5 形容词描述 — `creative writing`

---

### 👥 NPC 头像 (用于对话剧情)

追剧党赛道的对话需要不同 NPC。建议用 **Humaaans** 拼装，或在 Storyset 上找单人物特写。

| 头像 | 用途 | Storyset 搜索词 | 保存名 |
|-----|------|---------------|------|
| 女性朋友 | Ch1, Ch3, Ch4 | `young woman avatar` | `npcs/friend-girl.svg` |
| 男性朋友 | Ch1, Ch3, Ch5 | `young man avatar` | `npcs/friend-boy.svg` |
| 服务员/前台 | Ch4 (酒店), 旅行赛道 | `staff avatar` / `waiter` | `npcs/staff.svg` |
| 情侣对象 | Ch4 恋爱 | 找一对情侣插画里的一个角色 | `npcs/lover.svg` |

⚠️ 头像建议尺寸: SVG 内人物为正方形或圆形，方便剪裁。

---

## 6. 下载步骤（详细版）

以 Ch1 打招呼为例：

### Step 1: 进入搜索
打开 https://storyset.com/search?q=greeting

### Step 2: 选择风格
顶部有 4 个风格 tab (rafiki / bro / amico / pana)，挑一个你喜欢的。

### Step 3: 点击具体插画
任选一张你觉得画面合适的，点击进入详情页。

### Step 4: 改颜色（核心步骤）
- 详情页右侧有「Edit colors」或调色板按钮
- 把主色改成 **追剧党紫 `#a855f7`**
- 副色保留或调成淡紫 `#d8b4fe`

### Step 5: 下载
- 选择 **SVG 格式**（方便后续缩放和改色）
- 下载后放到 `public/illustrations/drama/ch1-greeting.svg`

### Step 6: 重复
按上方清单依次完成 11 张主图 + 4 个 NPC 头像 = **共 15 张**。

⏱️ **预计时间**: 单张约 3-5 分钟，全部约 1 小时。

---

## 7. 代码集成方式

### 7.1 数据层
在 `src/data/tracks/drama.json` 等数据中给每个 chapter 加 `illustration` 字段：

```json
{
  "id": "drama-ch1",
  "title": "打招呼·日常寒暄",
  "scenario": "...",
  "illustration": "/illustrations/drama/ch1-greeting.svg",
  "stages": [...]
}
```

### 7.2 在组件中引用
SVG 放在 `public/` 下可直接通过 URL 访问：

```tsx
{chapter.illustration && (
  <img
    src={chapter.illustration}
    alt={chapter.title}
    className="w-full h-48 object-contain"
  />
)}
```

### 7.3 进阶: SVG 动态着色（可选）
如果想用单色 SVG 然后用 CSS 控制颜色，可以这样：

```tsx
// 把 SVG 内联到组件里 (需要 @svgr/webpack 配置)
import { ReactComponent as GreetingIcon } from '@/illustrations/drama/ch1-greeting.svg'

<GreetingIcon className="text-purple-500" />
```

⚠️ v1 不建议搞，下载时调好颜色就行。

---

## 8. 验收检查

下载完后检查：
- [ ] `public/illustrations/` 目录下有 3 个子文件夹 (drama / travel / exam) + npcs
- [ ] 每张 SVG 主色匹配对应赛道主题色
- [ ] 文件名符合命名约定 (小写 + `-` 分隔)
- [ ] 在 Storyset 上下载的 SVG 大小通常在 100KB 以内
- [ ] 所有 11 张主图 + 4 个 NPC 头像齐全

---

## 9. Plan B: 我懒得一张张下

如果觉得 15 张太多了，可以**最小化**：

**最小集**：
- 旅行家 5 章（必须，因为是场景探索的核心）
- 追剧党 1 张（Ch1 打招呼，做 demo 验证对话剧情模式）
- 应试派 1 张（通用封面）
- NPC 头像 2 个（一男一女）

**总计 9 张** (~30 分钟)，足够看到 A+B 混搭的效果。

剩下的等模式跑通了再补也不迟。

---

## 10. 备用方案（万一 Storyset 找不到合适的）

### unDraw 替代
- 网址: https://undraw.co/illustrations
- 顶部有色板，输入 hex 后所有插画都会改成这个颜色
- 风格更扁平、商务感
- 适合应试派的"严肃"感

### IconPark / Iconify
- https://icon-sets.iconify.design/
- 海量图标，适合作为辅助元素（不是主插画）

### Open Peeps
- https://www.openpeeps.com/
- 手绘人物，可拼装
- 适合 NPC 头像

---

## 📋 下一步

1. **先下最小集 9 张**（30 分钟）→ 跑通效果
2. **告诉我你下完了** → 我开始改代码（DialogueStage / SceneStage）
3. **看到效果满意** → 你再补剩下的 6 张

或者直接 15 张全下完，我代码一次性做齐。你定。
