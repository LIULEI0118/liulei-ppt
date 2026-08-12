# 命令参考

本文档记录仓库内 `scripts/` 命令的真实参数、默认值、显式产物和退出行为。示例均使用 Node.js ES modules；建议先阅读 [`references/runtime.md`](../references/runtime.md)，并把中间产物写入任务专用临时目录。

```bash
export SKILL_DIR="/absolute/path/to/liulei-ppt"
export TMP_DIR="/absolute/path/to/task-workspace"
export FINAL_PPTX="/absolute/path/to/final.pptx"
```

## 通用参数规则

除 `list-styles.mjs` 和 `validate-style-kit.mjs` 外，仓库命令使用同一类长参数解析方式：

- 只接受 `--key value`，不支持位置参数，也不要写成 `--key=value`。
- 路径含空格时必须加引号。
- 布尔开关单独出现，例如 `--allow-unapproved`、`--no-report`；不要在后面写 `true`。
- 缺少必填值时会报 `Missing required --<name>`。
- 多余的位置参数会报 `Unexpected argument: ...`；严格模板委托工具的对应错误文字是 `Unexpected positional argument: ...`。
- 脚本没有统一的本地 `--help`。只有 `template-tool.mjs` 可以在指定 action 后把 `--help` 转发给已安装的模板辅助工具。

所有命令成功时退出码为 `0`。验证结果不通过、输入无法读取、runtime 缺失或导入/渲染/导出失败时返回非零退出码，通常为 `1`。流水线应在任一非零退出后立即停止。

## 命令总览

| 命令 | 用途 | 主要依赖 |
| --- | --- | --- |
| `list-styles.mjs` | 列出六套内置风格及获批样例路径 | Node.js |
| `style-brief.mjs` | 解析一个内置风格的完整简报 | Node.js |
| `validate-style-kit.mjs` | 校验内置风格包、样例和预览 | Node.js |
| `validate-plan.mjs` | 校验内容计划的构建必需字段 | Node.js |
| `generate-icon.mjs` | 生成 Lucide PNG 图标 | `lucide`、`sharp` |
| `build-deck.mjs` | 从内容计划生成、渲染并导出 PPTX | `@oai/artifact-tool`、`sharp` |
| `extract-style.mjs` | 从参考 PPTX 提取风格起点和预览 | `@oai/artifact-tool` |
| `inspect-template.mjs` | 对 PPTX 做通用逐页检查 | `@oai/artifact-tool` |
| `template-tool.mjs` | 委托严格模板 inspect/validate/prepare/fidelity | Codex presentations runtime；contact sheet 另需 `sharp` |
| `qa-deck.mjs` | 重新导入、逐页渲染并输出自动 QA 报告 | `@oai/artifact-tool`、`sharp`、`unzip` |

`runtime.mjs` 是上述脚本共享的内部模块，不是 CLI；不要直接执行它。

## `list-styles.mjs`

列出 `assets/styles/catalog.json` 中的全部风格，并解析配置、获批样例 PPTX 和获批 montage 的绝对路径。

### 用法

```bash
node "$SKILL_DIR/scripts/list-styles.mjs"
```

无参数。

### 标准输出与产物

stdout 是一个 JSON 对象：

- `styles[].id`、`name`、`direction` 来自目录；
- `description` 和 `pageSilhouettes` 来自风格 profile；
- `profile`、`sample`、`preview` 是解析后的绝对路径。

该命令不写文件。目录或 profile 缺失、JSON 无法解析时以非零状态退出。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/list-styles.mjs"
```

发布验证结果包含六个 ID：`business-minimal`、`consulting-data`、`tech-dark`、`fresh-creative`、`academic-report`、`editorial-premium`。

## `style-brief.mjs`

读取一个内置风格，并确认其获批样例和预览文件可访问。

### 参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--style <id>` | 是 | 无 | `catalog.json` 中的内置风格 ID；不接受自定义 JSON 路径 |

### 标准输出与产物

stdout JSON 包含 `id`、`name`、`approvedDirection`、`description`、`profile`、`sample`、`preview`、`pageSilhouettes`、`assetLanguage`、`avoid`、`designReferences` 和 `recipe`。该命令不写文件。

未知 ID 会报 `Unknown style: ... Available: ...`；样例或预览不可访问时以非零状态退出。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/style-brief.mjs" --style fresh-creative
```

## `validate-style-kit.mjs`

校验全部内置风格的 profile、样例 PPTX 和获批预览。

### 用法

```bash
node "$SKILL_DIR/scripts/validate-style-kit.mjs"
```

无参数。校验内容包括：

- catalog 恰好包含六套风格；
- 每个 profile 具有 `id`、`name`、`description`、`approvedDirection`、`colors`、`fonts`、`type`、`layout`、`composition`、`assets`、`treatments`、`avoid`；
- catalog ID 与 profile ID 一致；
- `composition.pageSilhouettes` 至少四项；
- 存在 `assets.imagePromptStyle`；
- `avoid` 至少三项；
- sample 和 preview 都是非空文件。

### 标准输出与退出

成功时 stdout：

```json
{ "ok": true, "styles": ["business-minimal", "consulting-data", "tech-dark", "fresh-creative", "academic-report", "editorial-premium"] }
```

失败时 stderr 输出 `{ "ok": false, "errors": [...] }`，并以 `1` 退出。该命令不写文件。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/validate-style-kit.mjs"
```

## `validate-plan.mjs`

执行 `build-deck.mjs` 使用的内容计划校验。完整字段说明见 [`references/content-plan.md`](../references/content-plan.md) 和 [`references/content-plan.schema.json`](../references/content-plan.schema.json)。

### 参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--plan <json>` | 是 | 无 | 内容计划 JSON 路径 |

脚本检查：

- `title`、`audience`、`goal`、`language`、`aspectRatio` 为非空字符串；
- `aspectRatio` 只能是 `16:9` 或 `4:3`；
- `slides` 至少一页；每页有非空 `title`、`role` 和受支持的 `layout`；
- chart 有 `categories`、`series`，每个 series 的 `values` 数量与 categories 相等；
- table 是至少含表头的矩形二维数组；
- `hero-image` 有 `imagePath`，`metric` 有 `metricValue`，`quote` 有 `quote`；
- timeline 含 2–5 个步骤。

该命令不会检查 `approved`、素材文件是否存在、来源 ID 是否存在，也不会完整执行 JSON Schema 的所有约束；这些检查分别发生在构建阶段或工作流审核中。

### 标准输出与退出

成功时 stdout 返回 `ok: true`、绝对 `plan` 路径和 `slides` 数量。验证失败时 stderr 返回 `ok: false` 及 `errors` 数组，并以 `1` 退出。该命令不修改计划。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/validate-plan.mjs" \
  --plan "$SKILL_DIR/assets/examples/sample-plan.json"
```

发布验证结果为 `ok: true`、`slides: 7`。

## `generate-icon.mjs`

把一个 Lucide 图标渲染为 PNG。

### 参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--name <name>` | 是 | 无 | Lucide 名称；支持原名、去掉 `Icon` 后缀和 kebab-case 转 PascalCase 的候选解析 |
| `--out <png>` | 是 | 无 | 输出 PNG 路径；父目录自动创建 |
| `--color <color>` | 否 | `#1738B8` | SVG stroke 颜色 |
| `--background <color>` | 否 | `transparent` | 背景；非透明时绘制圆角底板 |
| `--size <number>` | 否 | `256` | 输出像素边长，必须不小于 32 |
| `--padding <number>` | 否 | `28` | 四周留白，必须不小于 0，且两倍 padding 小于 size |
| `--stroke-width <number>` | 否 | `1.8` | SVG 线宽；必须是有限数值 |

### 标准输出与退出

成功时写入一个 PNG，并在 stdout 输出 `ok`、规范化后的 `name`、绝对 `output`、`size`、`color` 和 `background`。找不到图标时报 `Lucide icon not found: ...`；数值不合法时报 `Invalid numeric icon options.`；依赖或写入失败时以非零状态退出。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/generate-icon.mjs" \
  --name target \
  --out "$TMP_DIR/assets/target.png" \
  --color "#1738B8" \
  --size 256 \
  --stroke-width 1.8
```

## `build-deck.mjs`

读取获批内容计划，使用内置或自定义 style profile 创建新 presentation，逐页渲染预览并导出可编辑 PPTX。

### 参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--plan <json>` | 是 | 无 | 内容计划 JSON |
| `--out <pptx>` | 是 | 无 | 最终 PPTX 路径；父目录自动创建 |
| `--style <id-or-json>` | 否 | `business-minimal` | 内置 style ID，或以 `.json` 结尾的 profile 路径 |
| `--preview-dir <dir>` | 否 | `<out目录>/<out文件名去掉.pptx>-preview` | 每页 PNG、layout JSON 与 montage 的目录 |
| `--allow-unapproved` | 否 | 关闭 | 仅当用户明确跳过大纲批准时使用；必须作为独立布尔开关传入 |

计划的 `approved` 必须严格等于 `true`；否则脚本报错，除非传入独立的 `--allow-unapproved`。自定义 profile 至少要有 `id`、`colors`、`fonts`、`type`、`layout` 和 `treatments`。

相对 `imagePath`、`iconPath` 从内容计划 JSON 所在目录解析。图片只支持 `.png`、`.jpg`、`.jpeg`、`.webp`。

### 文件产物

- `--out` 指定的 PPTX；
- `<preview-dir>/slide-01.png` 等逐页 PNG；
- `<preview-dir>/slide-01.layout.json` 等逐页布局；
- `<preview-dir>/montage.png`。

成功时 stdout JSON 返回 `ok`、`output`、`previewDir`、`slides`、`style` 和 `stylePath`。当前 Codex artifact-tool 在导出时还可能生成与 PPTX 相邻的 `.inspect.ndjson`；这是 runtime 的附加产物，不应作为本脚本的稳定接口。

脚本不会清空已有 preview 目录。为避免旧页面混入人工检查，应为每次运行使用新的空目录。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/build-deck.mjs" \
  --plan "$SKILL_DIR/assets/examples/sample-plan.json" \
  --style business-minimal \
  --out "$TMP_DIR/sample.pptx" \
  --preview-dir "$TMP_DIR/sample-preview"
```

发布验证结果为 7 页、`style: "business-minimal"`。

## `extract-style.mjs`

导入完整参考 PPTX，为每页生成预览与 layout，并以 `business-minimal` profile 为结构基线生成一个待人工复核的风格 JSON。

### 参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--pptx <file>` | 是 | 无 | 参考 PPTX |
| `--out <json>` | 是 | 无 | 提取后的 style profile |
| `--preview-dir <dir>` | 否 | `<out目录>/reference-preview` | 参考稿预览和 layout 目录 |

### 文件产物

- `--out` 指定的 style profile；
- `<preview-dir>/slide-01.png` 等逐页 PNG；
- `<preview-dir>/slide-01.layout.json` 等逐页布局；
- `<preview-dir>/montage.webp`。

profile 的 `extraction` 会记录源路径、页数、观察到的颜色和字体、预览目录，并把 `reviewed` 初始化为 `false`。脚本只统计 layout 中可观察到的颜色和字体；提取结果必须结合逐页预览人工校正。

成功时 stdout JSON 返回 `ok`、`source`、`output`、`previewDir`、`slides`，以及最多 8 个颜色和 6 个字体。导入、渲染、写入失败时非零退出。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/extract-style.mjs" \
  --pptx "$SKILL_DIR/assets/styles/business-minimal-approved.pptx" \
  --out "$TMP_DIR/extracted-style.json" \
  --preview-dir "$TMP_DIR/reference-preview"
```

发布验证结果为 4 页，写入 `montage.webp` 和 style profile。

## `inspect-template.mjs`

对一个 PPTX 做通用检查，生成每页渲染、layout、对象检查记录和 manifest。它不执行严格模板 frame-map 校验，也不能替代缺失的 `template-tool.mjs --action inspect`。

### 参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--pptx <file>` | 是 | 无 | 待检查 PPTX |
| `--workspace <dir>` | 否 | `<pptx目录>/<pptx文件名去掉.pptx>-inspect` | 检查产物根目录 |

### 文件产物

- `<workspace>/slides/slide-01.png` 等逐页 PNG；
- `<workspace>/layouts/slide-01.json` 等逐页布局；
- `<workspace>/montage.webp`；
- `<workspace>/template-inspect.ndjson`；
- `<workspace>/template-manifest.json`。

manifest 包含源路径、页数、preview/layout 目录和时间。成功时 stdout JSON 返回 `ok`、`source`、`workspace`、`slideCount`。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/inspect-template.mjs" \
  --pptx "$SKILL_DIR/assets/styles/business-minimal-approved.pptx" \
  --workspace "$TMP_DIR/general-inspect"
```

## `template-tool.mjs`

严格模板工作流的入口。该脚本本身不包含模板实现，而是从以下目录中选择按目录名降序排列的第一个、且包含目标辅助脚本的 presentations runtime 版本：

```text
~/.codex/plugins/cache/openai-primary-runtime/presentations/<version>/
  skills/presentations/template_following_scripts/
```

`--action` 之外的参数会转发给所选辅助脚本。已安装 helper 的接口可能随 runtime 更新；可用下面的方式查看当前环境实际帮助：

```bash
node "$SKILL_DIR/scripts/template-tool.mjs" --action inspect --help
node "$SKILL_DIR/scripts/template-tool.mjs" --action validate --help
node "$SKILL_DIR/scripts/template-tool.mjs" --action prepare --help
node "$SKILL_DIR/scripts/template-tool.mjs" --action fidelity --help
```

仓库发布验证环境使用 presentations runtime `26.805.11740`，以下参数已按该版本源码和实跑结果核对。

### 公共参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `--action <action>` | 是 | `inspect`、`validate`、`prepare` 或 `fidelity` |

不支持其他 action；错误会列出四个可选值。缺少 presentations helper 时严格复用被阻断，不能用 `inspect-template.mjs` 顶替，也不能静默改为重绘。

### Action：`inspect`

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--workspace <dir>` | 是 | 无 | 严格模板任务工作区；helper 可能在其中创建 `package.json` 和 runtime 包链接 |
| `--pptx <file>` | 是 | 无 | 源模板 PPTX |
| `--out-dir <dir>` | 否 | `<workspace>/template-inspect` | 检查输出；必须位于 workspace 内且不能等于 workspace 根目录 |
| `--scale <n>` | 否 | `1` | 正数渲染比例 |

运行前会递归清空 `out-dir`，因此必须使用专用子目录。产物包括：

- `source-slides/source-slide-01.png` 等源页渲染；
- `layouts/source-slide-01.layout.json` 等布局；
- `assets/ppt/media/` 中抽取的 PPTX 媒体；
- `template-inspect.ndjson`；
- `template-manifest.json`，内含字体、媒体、图表、表格页和逐页产物清单。

stdout 输出 manifest 的绝对路径。

### Action：`validate`

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--workspace <dir>` | 是 | 无 | 与 inspect 相同的工作区 |
| `--map <json>` | 是 | 无 | `template-frame-map.json` |
| `--inspect <ndjson>` | 否 | `<workspace>/template-inspect/template-inspect.ndjson` | inspect 对象记录 |
| `--source-slide-count <n>` | 否 | 未设置 | 额外检查 `sourceSlide` 上限 |
| `--no-report` | 否 | 关闭 | 只向 stdout 返回结果，不写报告文件 |

未使用 `--no-report` 时写入：

- `<workspace>/qa/template-plan-check.json`；
- `<workspace>/qa/template-plan-check.txt`。

stdout 是含 `status`、`issueCount` 和 `issues` 的 JSON。`status: "fail"` 时退出 `1`；`pass` 和当前实现可能产生的 `warning` 为 `0`。

映射要求详见 [`workflows.md`](workflows.md#工作流二严格模板复用)。当前 helper 验证连续页码、有效源页、`reuseMode: "duplicate-slide"`、叙事角色、继承对象 ID、占位符处理和新增 primitive 的明确许可。

### Action：`prepare`

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--workspace <dir>` | 是 | 无 | 与 inspect/validate 相同的工作区 |
| `--pptx <file>` | 是 | 无 | 源模板 PPTX |
| `--map <json>` | 是 | 无 | 已通过验证的 frame map |
| `--out <pptx>` | 是 | 无 | starter deck |
| `--preview-dir <dir>` | 否 | `<workspace>/template-starter-preview` | starter PNG；必须位于 workspace 内 |
| `--layout-dir <dir>` | 否 | `<workspace>/template-starter-layout` | starter layout；必须位于 workspace 内 |
| `--inspect <ndjson>` | 否 | `<workspace>/template-inspect/template-inspect.ndjson` | 用于再次验证映射 |
| `--contact-sheet <png>` | 否 | 未设置 | wrapper 在 prepare 成功后用 PNG 预览组装 contact sheet |
| `--scale <n>` | 否 | `1` | 正数渲染比例 |

prepare 会再次运行模板计划验证；失败时不会继续生成 starter。成功产物包括 starter PPTX、逐页 PNG、逐页 layout，以及紧邻 starter PPTX 的 `.manifest.json`。传入 `--contact-sheet` 时，wrapper 从 `preview-dir` 中匹配文件名为 `slide-NN.png` 或以 `-slide-NN.png` 结尾的 PNG；prepare 的正常文件名是 `starter-slide-NN.png`。随后它用 `sharp` 写出 montage；若没有匹配 PNG，则报 `No slide PNGs found for contact sheet: ...`。

stdout 先输出 manifest JSON；如请求 contact sheet，再输出其绝对路径。wrapper 会截留 `--contact-sheet`，因此当前 manifest 的 `contactSheet` 字段不会记录该路径。

### Action：`fidelity`

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--workspace <dir>` | 是 | 无 | 严格模板任务工作区 |
| `--final-pptx <file>` | 是 | 无 | 原位编辑后导出的最终 PPTX |
| `--map <json>` | 否 | 未设置 | 仅写入报告的 frame-map provenance |
| `--starter-pptx <file>` | 否 | 未设置 | 仅写入报告的 starter provenance |
| `--starter-layout-dir <dir>` | 否 | 未设置 | starter layout；与 final layout 同时提供时检查遮盖继承内容 |
| `--final-layout-dir <dir>` | 否 | 未设置 | 最终 layout；检查未解决占位符 |
| `--edit-dir <dir>` | 否 | `<workspace>` | 扫描 authoring 脚本和日志的目录 |
| `--agent-log <file>` | 否 | 未设置 | 额外扫描的 agent 日志 |
| `--no-report` | 否 | 关闭 | 不写报告文件 |

未使用 `--no-report` 时写入：

- `<workspace>/qa/template-fidelity-check.json`；
- `<workspace>/qa/template-fidelity-check.txt`。

检查包括：最终 PPTX 是否存在、是否有导入 starter 与 artifact-tool 导出的代码证据、是否使用 `python-pptx`/LibreOffice/直接 OOXML、是否新建 presentation 或新页、PPTX 和 layout 中是否残留占位符，以及是否有大面积新形状遮盖继承内容。`status: "fail"` 时退出 `1`。

`--map` 和 `--starter-pptx` 当前只记录来源，不会单独触发内容比较。要获得完整保真检查，应同时提供 starter/final layout 目录，并保留实际 authoring 脚本或日志供 `--edit-dir` 扫描。

### 已验证严格模板示例

下列链路使用仓库的 8 页 layout 测试稿和示例 frame map；发布验证已实跑通过 inspect、validate 和 prepare：

```bash
node "$SKILL_DIR/scripts/build-deck.mjs" \
  --plan "$SKILL_DIR/assets/examples/full-layout-plan.json" \
  --style business-minimal \
  --out "$TMP_DIR/strict-source.pptx" \
  --preview-dir "$TMP_DIR/strict-source-preview"

node "$SKILL_DIR/scripts/template-tool.mjs" \
  --action inspect \
  --workspace "$TMP_DIR/strict" \
  --pptx "$TMP_DIR/strict-source.pptx"

node "$SKILL_DIR/scripts/template-tool.mjs" \
  --action validate \
  --workspace "$TMP_DIR/strict" \
  --map "$SKILL_DIR/assets/examples/template-frame-map.example.json" \
  --source-slide-count 8

node "$SKILL_DIR/scripts/template-tool.mjs" \
  --action prepare \
  --workspace "$TMP_DIR/strict" \
  --pptx "$TMP_DIR/strict-source.pptx" \
  --map "$SKILL_DIR/assets/examples/template-frame-map.example.json" \
  --out "$TMP_DIR/strict/template-starter.pptx" \
  --preview-dir "$TMP_DIR/strict/template-starter-preview" \
  --layout-dir "$TMP_DIR/strict/template-starter-layout" \
  --contact-sheet "$TMP_DIR/strict/template-starter-contact-sheet.png"
```

仓库没有附带“原位编辑 starter 后的最终稿 + authoring evidence”固定 fixture，因此 fidelity 没有可独立通过的仓库自测命令。实际任务应按 [`workflows.md`](workflows.md#验证-1) 提供最终稿、两组 layout 和 authoring 目录后运行。

## `qa-deck.mjs`

重新导入最终 PPTX，逐页渲染 PNG 和 layout，扫描一部分位置异常、空结构占位符和未解决模板提示，并校验可选页数。

### 参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--pptx <file>` | 是 | 无 | 待检查 PPTX；必须是文件且至少 1024 字节 |
| `--report <json>` | 是 | 无 | QA JSON 报告；父目录自动创建 |
| `--preview-dir <dir>` | 否 | `<report目录>/qa-preview` | PNG、layout 和 montage 目录 |
| `--expected-count <integer>` | 否 | 未设置 | 期望页数；应传十进制整数 |

### 文件产物

- `<preview-dir>/slide-01.png` 等逐页 PNG；
- `<preview-dir>/slide-01.layout.json` 等逐页布局；
- `<preview-dir>/montage.png`；
- `--report` 指定的 JSON。

报告字段包括 `ok`、`pptx`、`bytes`、`slideCount`、`previewDir`、`issues`、`visualReviewRequired: true` 和 `generatedAt`。`issues` 非空时 `ok: false` 且退出 `1`；否则退出 `0`。

当前自动位置扫描只报告负的 left/top、负的 width/height 等 `invalid-position`，不会完整判断元素右侧或底部是否越过画布，也不会判断视觉上的文字裁切或非预期遮挡。即使 `ok: true`，仍必须逐页查看 PNG 和 montage。

脚本调用系统 `unzip` 扫描 PPTX XML 中的空结构占位符；扫描命令失败会写入 `placeholder-scan-failed` issue，而不是忽略。preview 目录不会预先清空，应使用新的空目录。

### 已验证示例

```bash
node "$SKILL_DIR/scripts/qa-deck.mjs" \
  --pptx "$TMP_DIR/sample.pptx" \
  --report "$TMP_DIR/qa-report.json" \
  --preview-dir "$TMP_DIR/qa-preview" \
  --expected-count 7
```

对前述 sample 构建运行时，发布验证结果为 `ok: true`、`slideCount: 7`、`issues: []`。

## 下一步

- 三条完整流程见 [`workflows.md`](workflows.md)。
- runtime、路径和依赖见 [`references/runtime.md`](../references/runtime.md)。
- 按错误信息定位问题见 [`troubleshooting.md`](troubleshooting.md)。
