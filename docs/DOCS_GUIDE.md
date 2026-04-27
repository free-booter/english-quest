# Markdown 文档维护规则

## 文档分工

### `README.md`

面向第一次打开项目的人，只保留：

- 项目是什么
- 如何启动
- 当前功能状态
- 文档导航
- 已知限制

不要把详细实施计划、长篇历史记录、临时代办塞进 `README.md`。

### `CLAUDE.md`

面向 AI/开发协作，保留：

- 项目背景
- 关键架构决策
- 已完成阶段摘要
- 重要文件导航
- 后续开发注意事项

如果某段内容已经变成纯历史，后续可以迁移到 `docs/archive/`。

### `UI_OPTIMIZATION_PLAN.md`

只记录首页、赛道、我的页面的 UI/UX 方案。

每次执行后要更新状态：

- `未开始`
- `进行中`
- `已完成`
- `部分完成`
- `废弃`

### `ILLUSTRATION_GUIDE.md`

只记录插画资源规范：

- 来源
- 主题色
- 文件命名
- 放置路径
- 接入方式

不要在这里写页面业务逻辑。

### `docs/ROADMAP.md`

记录当前优先级和 v1/v2 边界。

适合写：

- 现在先做什么
- 暂时不做什么
- 哪些属于 v2
- 哪些工作需要前置条件

## 更新节奏

- 小代码修改：通常不用改文档。
- 新功能完成：更新 `README.md` 的功能状态，必要时补 `CLAUDE.md`。
- 计划变化：更新 `docs/ROADMAP.md`。
- UI 方向变化：更新 `UI_OPTIMIZATION_PLAN.md`。
- 资源规范变化：更新 `ILLUSTRATION_GUIDE.md`。

## 命名建议

新文档使用大写英文和下划线：

- `ROADMAP.md`
- `DOCS_GUIDE.md`
- `API_INTEGRATION_PLAN.md`
- `DESIGN_NOTES.md`

如果是阶段归档，后续可放入：

```text
docs/archive/YYYY-MM-DD-topic.md
```

