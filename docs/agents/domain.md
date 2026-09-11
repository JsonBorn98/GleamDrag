# 领域文档

工程技能在探索代码库时该如何消费这个仓库的领域文档。

## 探索前先读这些

- 仓库根的 **`CONTEXT.md`**，或者
- 仓库根的 **`CONTEXT-MAP.md`**（如果存在），它指向每个上下文一个 `CONTEXT.md`。读跟主题相关的那些。
- **`docs/adr/`**，读跟你即将改动的区域相关的 ADR。多上下文仓库里，还要看 `src/<context>/docs/adr/` 里上下文作用域的决策。

这些文件如果有不存在的，**默默继续**。不要特意指出它们不存在，也不要建议提前创建。`matt-flow:domain-modeling`（经 `matt-flow:grill-with-docs` 和 `matt-flow:improve-codebase-architecture` 到达）会在术语或决策真正被解决时惰性创建它们。

## 文件结构

单上下文仓库（大多数仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根目录存在 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文专属决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 用词汇表里的词

当你的输出要命名一个领域概念（issue 标题、重构提案、假设、测试名）时，用 `CONTEXT.md` 里定义的术语。不要漂移到词汇表明确避开的同义词。

如果你需要的概念还不在词汇表里，那是个信号，要么你在生造项目里不用的说法（重新考虑），要么真有个缺口（记下来给 `matt-flow:domain-modeling`）。

## 标记 ADR 冲突

如果你的输出和某个已有 ADR 矛盾，显式指出，而不是悄悄覆盖。

> _与 ADR-0007（事件溯源订单）冲突，但值得重开，因为……_
