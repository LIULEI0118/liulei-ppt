# 工作流

LIULEI PPT 支持三条互不替代的工作流：使用内置风格新建演示文稿、严格复用参考模板、提取参考风格后重绘。只要输入中含参考 PPTX 且用户没有指定模式，就必须先让用户在“严格模板复用”和“风格提取与重绘”之间选择；不能根据实现难度擅自切换。

无论采用哪条工作流，都先明确受众、演示目标、期望行动、核心结论、语言、比例、页数、来源边界和最终输出路径。逐页大纲应包含 takeaway 标题、叙事角色、证据、布局、视觉方向和来源引用。获得明确批准后，把内容计划的 `approved` 写为 `true`。只有用户明确要求跳过审批时，调用 `build-deck.mjs` 才可加 `--allow-unapproved`；严格模板模式没有这个参数，应在任务记录中保留用户的跳过决定。

建议统一设置路径：

```bash
export SKILL_DIR="/absolute/path/to/liulei-ppt"
export TMP_DIR="/absolute/path/to/task-workspace"
export FINAL_PPTX="/absolute/path/to/final-deck.pptx"
```

所有计划、图片、渲染、布局 JSON、来源笔记和 QA 报告放在任务专用的 `TMP_DIR`；只把用户要求的最终 PPTX 写入 `FINAL_PPTX`。编辑已有文件时，输出必须使用新路径。

## 如何选择模式

| 模式 | 适用情况 | 保真承诺 | 主要产物 |
| --- | --- | --- | --- |
| 内置风格 | 没有参考模板，或希望直接使用仓库的视觉系统 | 对齐获批样例的构图语言，不是只换颜色 | 内容计划、可编辑 PPTX、渲染与 QA 报告 |
| 严格模板复用 | 必须保留品牌模板、母版家具、字体、间距和对象结构 | 从指定源页复制并原位编辑；无法映射时停止 | 模板检查、frame map、starter deck、最终 PPTX、fidelity 报告 |
| 风格提取与重绘 | 希望借鉴参考 PPTX 的设计语言，同时允许新布局 | 匹配设计语言，不承诺像素级复刻 | 提取的 style profile、参考预览、新绘 PPTX、QA 报告 |

## 工作流一：使用内置风格

### 输入

- 已核实的文字、表格、数据、图片与来源；
- 受众、演示目标、语言、比例、期望页数和输出路径；
- 用户选择的内置风格；
- 已批准的逐页大纲，或用户明确记录的跳过审批决定。

### 关键决策

先列出全部风格，并向用户展示脚本返回的绝对预览路径：

```bash
node "$SKILL_DIR/scripts/list-styles.mjs"
```

当前内置风格为：

| ID | 中文名称 | 典型用途 | 视觉辨识点 |
| --- | --- | --- | --- |
| `business-minimal` | 商务极简 | 管理层汇报、方案、通用商务 | 暖白、黑、信号红，瑞士编辑网格与黑白建筑影像 |
| `consulting-data` | 咨询数据 | 分析、建议、数据决策 | 黑白与荧光绿，先结论后证据，突出一个关键系列 |
| `tech-dark` | 科技深色 | AI、科技、产品与工程 | 深黑画布、青色遥测信号、电影感系统影像 |
| `fresh-creative` | 清新创意 | 品牌、营销、工作坊与创意提案 | 蓝白编辑秩序、透明青色材质与电光黄绿 |
| `academic-report` | 学术报告 | 研究、教育与正式报告 | 研究蓝、论文式层级、科学模型与证据标记 |
| `editorial-premium` | 高端杂志 | 思想领导力、发布与高端叙事 | 建筑网格、黑白先锋摄影、尺度、裁切与留白 |

用户选定后，解析风格的 profile、获批样例与 montage：

```bash
node "$SKILL_DIR/scripts/style-brief.mjs" --style business-minimal
```

在生成前必须检查返回的 `sample` 和 `preview`，并阅读 `references/style-recipes.md` 中对应风格的一节。正常的 8–12 页演示至少采用该 recipe 的三种可辨认页面轮廓；不能把同一套卡片布局换色后当作另一风格。

根据内容选择每页的叙事角色、受支持的 layout 与视觉策略。基线构建器适合标准布局；如果获批样例的构图超出基线能力，应使用 `@oai/artifact-tool` 直接实现该页，同时保留可编辑文本、图表和表格，并继续使用同一 QA 流程。

### 执行与输出

将批准后的计划保存为 `$TMP_DIR/content-plan.json`，格式遵循 [`references/content-plan.schema.json`](../references/content-plan.schema.json)。相对 `imagePath` 和 `iconPath` 从内容计划 JSON 所在目录解析。

```bash
node "$SKILL_DIR/scripts/validate-plan.mjs" \
  --plan "$TMP_DIR/content-plan.json"

node "$SKILL_DIR/scripts/build-deck.mjs" \
  --plan "$TMP_DIR/content-plan.json" \
  --style business-minimal \
  --out "$FINAL_PPTX" \
  --preview-dir "$TMP_DIR/final-preview"
```

`build-deck.mjs` 输出可编辑 PPTX，并在 preview 目录写入每页 PNG、每页 layout JSON 和 `montage.png`。需要自定义 Lucide 图标时先生成到 `TMP_DIR`；需要定制图片时先逐张生成、检查并记录来源或提示词，再写入计划。

### 验证

```bash
node "$SKILL_DIR/scripts/qa-deck.mjs" \
  --pptx "$FINAL_PPTX" \
  --report "$TMP_DIR/qa-report.json" \
  --preview-dir "$TMP_DIR/qa-preview" \
  --expected-count 10
```

把 `10` 替换为批准计划中的实际页数。只有报告 `ok: true`、页数一致、每页都能渲染且没有报告位置或占位符问题时，自动门禁才通过。随后逐页查看 PNG 和 montage，并把最终 montage 与该风格的获批 montage 比较；若字体层级、网格、媒体尺度、页面轮廓与节奏不一致，即使技术检查通过也必须返工。

## 工作流二：严格模板复用

### 输入

- 用户提供的参考 PPTX；
- 明确选择“严格模板复用”的决定；
- 已核实的内容、逐页大纲和最终输出路径；
- 可用的 Codex presentations 模板辅助工具。

严格模式的目标是继承参考文件的对象和版式，而不是看起来相似。模板辅助工具缺失或参考 PPTX 无法导入时，此工作流被阻断；应报告问题并停止，不能静默切换到重绘。

### 关键决策

先检查完整源文件，而不是只看封面或少数代表页：

```bash
node "$SKILL_DIR/scripts/template-tool.mjs" \
  --action inspect \
  --workspace "$TMP_DIR" \
  --pptx "$REFERENCE_PPTX"
```

默认输出位于 `$TMP_DIR/template-inspect/`，包括源页 PNG、layout JSON、抽取媒体、字体清单、`template-inspect.ndjson` 和 `template-manifest.json`。逐页判断哪一张源页的结构能够承载哪一个输出页面，然后建立 `$TMP_DIR/template-frame-map.json`。可参考 [`template-frame-map.example.json`](../assets/examples/template-frame-map.example.json)。

映射必须满足：

- `outputSlides` 从 1 开始连续编号；
- 每页提供有效的 `sourceSlide`、`narrativeRole`、`reuseMode: "duplicate-slide"` 和 `editTargets`；
- 每个 edit target 指向检查结果中的继承 shape ID，并使用 `rewrite`、`rewrite-and-reposition`、`replace`、`delete`、`keep` 或 `fill-placeholder`；
- 所有结构占位符必须明确改写、替换、填充或删除；
- 新增 primitive 默认不允许。确有必要时，映射必须同时给出允许标记、明确 zone、reason 和 `mustNotOverlapInherited: true`；内容页不能只靠新增对象搭建。

如果新文案不适配已有源页，应缩短内容、改用另一源页或拆页。没有合适源页时，停止并让用户选择最接近的源布局或改用重绘模式；不能缩小到不可读，也不能在复制页上覆盖一套平行设计。

### 执行与输出

先验证映射，再按映射复制源页生成 starter deck：

```bash
node "$SKILL_DIR/scripts/template-tool.mjs" \
  --action validate \
  --workspace "$TMP_DIR" \
  --map "$TMP_DIR/template-frame-map.json"

node "$SKILL_DIR/scripts/template-tool.mjs" \
  --action prepare \
  --workspace "$TMP_DIR" \
  --pptx "$REFERENCE_PPTX" \
  --map "$TMP_DIR/template-frame-map.json" \
  --out "$TMP_DIR/template-starter.pptx" \
  --preview-dir "$TMP_DIR/template-starter-preview" \
  --layout-dir "$TMP_DIR/template-starter-layout" \
  --contact-sheet "$TMP_DIR/template-starter-contact-sheet.png"
```

`validate` 在 `$TMP_DIR/qa/` 写入 plan check；只有确认 plan check 为 `status: "pass"` 后才可 prepare。`prepare` 只复制映射选中的源页并按输出顺序排列，同时写出 starter PPTX、预览、布局、contact sheet 和 manifest。

最终编辑必须用 `PresentationFile.importPptx` 导入 `$TMP_DIR/template-starter.pptx`，在继承的文字、图片、图表、表格、页脚、页码和 notes 对象上原位修改，再用 `PresentationFile.exportPptx` 导出 `FINAL_PPTX`。不要在严格模式中运行 `build-deck.mjs`，因为它会创建全新的 presentation；也不要使用 Python、LibreOffice 或直接 OOXML 修改来绕过继承结构。

### 验证

先运行通用 QA，生成最终页面的 layout JSON：

```bash
node "$SKILL_DIR/scripts/qa-deck.mjs" \
  --pptx "$FINAL_PPTX" \
  --report "$TMP_DIR/qa-report.json" \
  --preview-dir "$TMP_DIR/qa-preview" \
  --expected-count 10
```

再运行严格保真检查：

```bash
node "$SKILL_DIR/scripts/template-tool.mjs" \
  --action fidelity \
  --workspace "$TMP_DIR" \
  --final-pptx "$FINAL_PPTX" \
  --map "$TMP_DIR/template-frame-map.json" \
  --starter-pptx "$TMP_DIR/template-starter.pptx" \
  --starter-layout-dir "$TMP_DIR/template-starter-layout" \
  --final-layout-dir "$TMP_DIR/qa-preview" \
  --edit-dir "$TMP_DIR"
```

保留 authoring 脚本或日志在 `TMP_DIR`，因为 fidelity 会检查是否确实导入 starter、使用 artifact-tool 导出，以及是否出现全新建页、遮盖继承内容、未解决占位符或绕过 OOXML 的行为。`qa-report.json` 必须为 `ok: true`，`$TMP_DIR/qa/template-fidelity-check.json` 必须为 `status: "pass"`。最后逐页对照 starter 和最终渲染，确认字体、间距、对齐、品牌家具、logo、页码与 notes 均按要求保留。

## 工作流三：风格提取与重绘

### 输入

- 用户提供的参考 PPTX；
- 明确选择“风格提取与重绘”的决定；
- 已核实的新内容、逐页大纲和最终输出路径。

这条工作流借用参考文件的视觉语言，但会新建页面。应提前向用户说明：输出追求风格一致，不是像素级复刻；如果用户要求对象级和布局级保真，应改用严格模板复用。

### 关键决策

对完整参考文件执行提取：

```bash
node "$SKILL_DIR/scripts/extract-style.mjs" \
  --pptx "$REFERENCE_PPTX" \
  --out "$TMP_DIR/style-profile.json" \
  --preview-dir "$TMP_DIR/reference-preview"
```

脚本会为每页写 PNG 与 layout JSON，生成 `montage.webp`，并根据全套页面统计颜色和字体。生成的 profile 以 `business-minimal` 为结构基线，且 `extraction.reviewed` 初始为 `false`；因此它只是可编辑起点，不是自动完成的风格结论。

逐页检查参考预览后，人工校正 `$TMP_DIR/style-profile.json` 中的字体层级、颜色角色、网格、边距、信息密度、图表/表格处理、装饰节奏、媒体与图标语言、页面轮廓和 avoid list。完成复核后，将 `extraction.reviewed` 改为 `true`，作为任务内的检查记录。

### 执行与输出

根据获批大纲编写并验证内容计划，再把提取后的 JSON 路径传给 `--style`：

```bash
node "$SKILL_DIR/scripts/validate-plan.mjs" \
  --plan "$TMP_DIR/content-plan.json"

node "$SKILL_DIR/scripts/build-deck.mjs" \
  --plan "$TMP_DIR/content-plan.json" \
  --style "$TMP_DIR/style-profile.json" \
  --out "$FINAL_PPTX" \
  --preview-dir "$TMP_DIR/final-preview"
```

输出包括经过人工复核的 style profile、参考 deck 的逐页预览与 layout、可编辑最终 PPTX，以及最终 deck 的逐页预览、layout 和 montage。参考 PPTX 始终只读。

### 验证

```bash
node "$SKILL_DIR/scripts/qa-deck.mjs" \
  --pptx "$FINAL_PPTX" \
  --report "$TMP_DIR/qa-report.json" \
  --preview-dir "$TMP_DIR/qa-preview" \
  --expected-count 10
```

把页数替换为批准计划的实际值。自动 QA 通过后，逐页比较两组渲染，并对照 `$TMP_DIR/reference-preview/montage.webp` 与 `$TMP_DIR/qa-preview/montage.png`：检查层级、网格、密度、图片裁切、图表处理、留白和页面节奏是否属于同一设计语言。不要要求元素坐标或内容一一相同；若目标已变为像素或对象级保真，应停止重绘并让用户确认切换到严格模板模式。

## 共同交付门禁

三种工作流都只能在以下条件全部满足后交付：

1. 内容与来源准确，未捏造事实、指标、人物、引语或引用；
2. 批准状态与用户决定一致；
3. 最终 PPTX 存在、可重新导入、页数正确且保持可编辑；
4. 自动 QA 通过；严格模式还必须通过 fidelity；
5. 每张幻灯片已按全尺寸检查，montage 的叙事节奏与目标风格一致；
6. 最终路径只包含用户要求的交付物，原始输入未被覆盖。

参数、默认输出和退出行为见 [`command-reference.md`](command-reference.md)；运行环境或错误处理见 [`troubleshooting.md`](troubleshooting.md)。
