# 故障排查

任何命令返回非零状态时都应停止后续步骤。保留源文件，修正原因后写入新的输出路径和新的预览目录；不要用失败产物覆盖输入，也不要交付只完成导出但未通过视觉检查的 PPTX。

参数、默认值和显式产物见 [`command-reference.md`](command-reference.md)，runtime 路径见 [`references/runtime.md`](../references/runtime.md)。

## 先做这组检查

```bash
command -v node
node --version
command -v unzip

test -f "$SKILL_DIR/SKILL.md"
test -f "$SKILL_DIR/assets/styles/catalog.json"

node "$SKILL_DIR/scripts/list-styles.mjs"
node "$SKILL_DIR/scripts/validate-style-kit.mjs"
```

如果问题只发生在严格模板模式，再检查当前环境是否能找到每个委托 helper：

```bash
node "$SKILL_DIR/scripts/template-tool.mjs" --action inspect --help
node "$SKILL_DIR/scripts/template-tool.mjs" --action validate --help
node "$SKILL_DIR/scripts/template-tool.mjs" --action prepare --help
node "$SKILL_DIR/scripts/template-tool.mjs" --action fidelity --help
```

## 快速索引

| 现象或错误 | 最可能原因 | 先做什么 |
| --- | --- | --- |
| `Missing required --...` | 参数缺失、使用了 `--key=value`，或值以 `--` 开头 | 改成带引号的 `--key value` |
| `Unexpected argument: ...` | 传入位置参数 | 删除位置参数，全部改用长参数 |
| `@oai/artifact-tool was not found` | Codex primary runtime 缺失或路径不同 | 核对默认 runtime；必要时设置受支持的 override |
| `Cannot find module` / `ERR_MODULE_NOT_FOUND`，指向 `sharp` 或 `lucide` | primary runtime 不完整 | 修复 runtime；artifact-tool override 对这两个包无效 |
| `Content plan is not approved` | `approved` 不是严格的 `true` | 获得用户确认后写 `approved: true`，或仅在明确跳过时用开关 |
| `Invalid content plan` / `ok: false` | 计划字段、layout 或数据形状不合法 | 先单独运行 `validate-plan.mjs` |
| `Image asset not found` | 相对路径基准理解错误或文件缺失 | 从 content-plan JSON 所在目录解析并检查文件 |
| `Unsupported image type` | 图片不是 PNG/JPEG/WebP | 转为支持的格式并更新计划路径 |
| `Bundled presentation template tool not found` | presentations runtime 中没有指定 helper | 阻断严格复用；恢复 compatible runtime 或请用户决定切换模式 |
| `No slide PNGs found for contact sheet` | prepare 预览目录不对或未生成 starter PNG | 核对 `--preview-dir`，先让 prepare 成功 |
| QA `ok: false` | 页数、位置、占位符或 XML 扫描失败 | 按 `issues[].type` 修复并重新渲染 |
| QA `ok: true` 但页面有问题 | 自动检查不覆盖所有裁切、遮挡和风格问题 | 全尺寸逐页查看 PNG，并检查 montage |

## 参数解析错误

### `Missing required --plan` 等必填参数错误

仓库脚本不支持等号形式：

```bash
# 错误
node "$SKILL_DIR/scripts/validate-plan.mjs" --plan="$TMP_DIR/content-plan.json"

# 正确
node "$SKILL_DIR/scripts/validate-plan.mjs" --plan "$TMP_DIR/content-plan.json"
```

布尔参数也不要带值：

```bash
# 错误：args 中得到字符串 "true"，不是脚本要求的布尔 true
node "$SKILL_DIR/scripts/build-deck.mjs" ... --allow-unapproved true

# 正确；只在用户明确跳过审批时使用
node "$SKILL_DIR/scripts/build-deck.mjs" ... --allow-unapproved
```

如果路径本身以 `--` 开头，解析器会把它当成下一个参数，无法作为值使用；改用不会以 `--` 开头的绝对路径。

### `Unexpected argument: ...` 或 `Unexpected positional argument: ...`

不要把输入文件直接放在命令末尾。仓库脚本使用前一种错误文字，严格模板委托 helper 使用后一种；两者都表示需要显式长参数，例如 `--pptx "$REFERENCE_PPTX"`。

### 不确定当前严格模板 helper 的参数

`template-tool.mjs` 会从已安装的 presentations runtime 动态选择 helper，因此 runtime 更新后接口可能变化。运行：

```bash
node "$SKILL_DIR/scripts/template-tool.mjs" --action prepare --help
```

`--action` 必须放在命令中；单独运行 `template-tool.mjs --help` 会先因缺少 action 失败。

## Node 与 runtime

### `node: command not found`

先确认当前 shell 能找到 Node：

```bash
command -v node
node --version
```

不要通过修改仓库脚本去调用一个未核实的 Node 路径。恢复当前 Codex 环境使用的 Node 后再重试。

### `@oai/artifact-tool was not found. Set CODEX_ARTIFACT_TOOL_PATH ...`

默认解析位置是：

```text
~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/
```

脚本会在该包目录下依次检查：

```text
dist/node/artifact_tool.mjs
dist/artifact_tool.mjs
```

如果包安装在其他位置，把 override 指向包目录，不是入口文件：

```bash
export CODEX_ARTIFACT_TOOL_PATH="/absolute/path/to/node_modules/@oai/artifact-tool"
```

然后重新运行原命令。这个 override 只影响仓库的 artifact-tool 加载；不会重定向 `sharp`、`lucide`，也不会让缺失的严格模板 helper 出现。

### `Cannot find module 'sharp'` 或 `Cannot find module 'lucide'`

这两个包始终从 Codex primary runtime 的 `node_modules` 解析。核对：

```bash
test -f "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json"
test -f "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/lucide/package.json"
```

缺失时修复或重新加载 primary runtime；不要在仓库中临时增加未记录的 `node_modules` 并把它当作可发布修复。

### import、render 或 export 报错

先区分失败阶段：

- import 失败：检查 PPTX 是否存在、非空、可正常打开，且不是改名伪装的其他文件；
- render 失败：定位最后处理的页面和素材，检查图片格式及对象内容；
- export 失败：检查输出父目录是否可写，并改用新的输出文件名；
- montage 失败：检查 `sharp`，以及预览目录中是否确实有逐页 PNG。

不要覆盖源 PPTX。保留已经生成的 layout、PNG 和 stderr，用最小输入复现后再修改内容或素材。

## 内容计划与审批

### JSON 无法解析

`readJson` 直接调用 `JSON.parse`。检查尾随逗号、注释、引号和文件编码；保存为纯 JSON，而不是 JavaScript 对象或 Markdown 代码块。

```bash
node "$SKILL_DIR/scripts/validate-plan.mjs" --plan "$TMP_DIR/content-plan.json"
```

只有该命令返回 `ok: true` 才进入构建。

### 常见 `validate-plan` 错误

| 错误片段 | 修复 |
| --- | --- |
| `<field> must be a non-empty string` | 补齐 `title`、`audience`、`goal`、`language` 或 `aspectRatio` |
| `aspectRatio must be 16:9 or 4:3` | 只使用字符串 `16:9` 或 `4:3` |
| `slides must contain at least one slide` | 增加至少一页 |
| `.layout is unsupported` | 使用文档列出的 12 种 layout |
| `.chart requires categories and series arrays` | 同时提供 `categories` 与 `series` 数组 |
| `values must match categories` | 每个 series 的 values 数量与 categories 相同 |
| `.table.values must be rectangular` | 每行列数相同，且至少含表头和一行内容 |
| `.imagePath is required for hero-image` | 为 hero 页提供非空路径 |
| `.metricValue is required for metric` | 提供字符串形式的主数字/指标 |
| `.quote is required for quote` | 提供 quote 文本 |
| `.steps must contain 2–5 timeline steps` | 把时间线限制为 2–5 步 |

`validate-plan.mjs` 不是完整 JSON Schema validator：它不检查批准状态、素材存在性和所有来源引用。不要因为这一关通过就跳过构建和 QA。

### `Content plan is not approved ...`

正常流程是先让用户确认逐页大纲，再在计划根对象写：

```json
{ "approved": true }
```

只有用户明确要求跳过审批时，才使用独立开关 `--allow-unapproved`。不要为了让命令通过而擅自修改批准状态。

### `Unknown sourceRefs on slide N`

当根对象含非空 `sources` 时，构建器要求该页的每个 `sourceRefs` 都能在 `sources[].id` 中找到。统一 ID 拼写；不要删除来源列表来绕过检查。

## 风格、图片与图标

### `Unknown style: ... Available: ...`

`style-brief.mjs` 只接受内置 ID。先运行：

```bash
node "$SKILL_DIR/scripts/list-styles.mjs"
```

自定义或提取 profile 只能传给 `build-deck.mjs --style`，且路径必须以 `.json` 结尾；否则构建器会把它当作内置 ID。

### `Style ... is missing ...`

自定义 profile 至少需要 `id`、`colors`、`fonts`、`type`、`layout` 和 `treatments`。提取 profile 时不要删除基线结构；修改后重新读取 JSON，并用小型计划试构建。

### `validate-style-kit.mjs` 失败

stderr 的 `errors` 会给出具体风格和缺项。常见原因是 catalog/profile ID 不一致、获批 sample/preview 缺失或为空、page silhouettes 少于四个、没有 `assets.imagePromptStyle`，或 avoid list 少于三项。修复 profile 或恢复已批准资产；不要把重新生成但未审核的预览直接当作获批预览。

### `Image asset not found: ...`

相对 `imagePath` 和 `iconPath` 不是从当前 shell 目录，也不是从 Skill 根目录解析，而是从 content-plan JSON 所在目录解析：

```text
/task/content-plan.json
/task/assets/hero.png
```

对应计划应使用 `assets/hero.png`。检查实际大小写和文件扩展名；macOS 上可用但大小写不一致的路径可能在其他系统失败。

### `Unsupported image type: ...`

构建器只接受 `.png`、`.jpg`、`.jpeg`、`.webp`。SVG、GIF、HEIC 和其他格式必须先转换为受支持的静态格式，再更新计划。不要只改扩展名。

### `Lucide icon not found: ...`

检查图标名是否存在于当前 runtime 的 Lucide 包。脚本会尝试原名、去掉 `Icon` 后缀，以及把连字符名称转为 PascalCase；仍失败时换用真实 Lucide 名称。

### `Invalid numeric icon options.`

确保：

- `size >= 32`；
- `padding >= 0`；
- `padding * 2 < size`；
- `size`、`padding`、`stroke-width` 都是有限数值。

## 构建结果不符合预期

### `approved` 已设置但仍被拒绝

脚本要求布尔值 `true`，不是字符串 `"true"`、数字 `1` 或其他 truthy 值。修正 JSON 类型。

### preview 中出现旧页或页数看起来过多

`build-deck.mjs` 和 `qa-deck.mjs` 都只创建目录，不会先清空既有目录。为每次尝试使用新目录：

```bash
node "$SKILL_DIR/scripts/build-deck.mjs" ... \
  --preview-dir "$TMP_DIR/build-attempt-02"
```

不要根据混有旧文件的 montage 做判断。

### PPTX 已生成，但风格只是换色

这不是 runtime 故障，而是视觉门禁失败。检查选定 style brief 的 `preview`、`sample`、`pageSilhouettes` 和 `references/style-recipes.md`。正常 8–12 页至少采用三种可辨认轮廓，并体现该风格的网格、媒体尺度、字体层级和页面节奏。基线 renderer 表达不了的获批构图，需要直接使用 artifact-tool 实现，而不是交付通用卡片页。

## 风格提取问题

### 提取的颜色或字体不完整

`extract-style.mjs` 只从 artifact-tool 输出的 layout 中收集可观察到的六位十六进制颜色和字体字段；某些 PPTX 会得到空字体数组或不完整配色。查看全部 `slide-XX.png`、layout 和 `montage.webp`，人工校正 profile。

`extraction.reviewed` 初始为 `false`。脚本不会强制阻止未复核 profile 被用于构建，因此工作流必须在人工检查后才把它改为 `true`。

### 需要像素级或对象级保真

风格提取重绘不承诺像素复刻。停止重绘，让用户明确选择严格模板复用。不要用提取 profile 冒充严格模式。

## 严格模板工具

### `ENOENT ... scandir .../openai-primary-runtime/presentations`

`template-tool.mjs` 期望 presentations runtime 位于：

```text
~/.codex/plugins/cache/openai-primary-runtime/presentations/
```

整个目录不存在时，版本枚举会直接失败。恢复当前 Codex 环境的 presentations runtime 后重试。`CODEX_ARTIFACT_TOOL_PATH` 不控制这个目录。

### `Bundled presentation template tool not found: <script>`

版本目录存在，但没有 action 对应的 helper：

| Action | 所需 helper |
| --- | --- |
| `inspect` | `inspect_template_deck.mjs` |
| `validate` | `validate_template_plan.mjs` |
| `prepare` | `prepare_template_starter_deck.mjs` |
| `fidelity` | `check_template_fidelity.mjs` |

这是严格模板工作流阻断项。不要改用仓库的 `inspect-template.mjs`：后者只生成通用渲染、layout、inspect NDJSON 和 manifest，不会抽取严格 helper 的媒体/字体清单，也不会提供 frame-map 校验、starter 准备或 fidelity。只有用户明确同意切换时，才能改用风格提取与重绘。

### strict inspect 与通用 inspect 的产物混淆

两条命令名称接近，但目录结构不同：

| 命令 | 默认/指定根目录 | 逐页文件 | 其他关键产物 |
| --- | --- | --- | --- |
| `inspect-template.mjs --workspace X` | `X/` | `slides/slide-NN.png`、`layouts/slide-NN.json` | `montage.webp`、根目录 `template-inspect.ndjson`、`template-manifest.json` |
| `template-tool.mjs --action inspect --workspace X` | `X/template-inspect/` | `source-slides/source-slide-NN.png`、`layouts/source-slide-NN.layout.json` | `assets/ppt/media/`、`template-inspect.ndjson`、`template-manifest.json` |

strict validate 默认读取第二种路径：

```text
X/template-inspect/template-inspect.ndjson
```

如果此前只运行了通用 inspector，就会得到 `missing-template-inspect`。请运行 strict inspect，不要手动复制文件来伪装流程。

### `Refusing to write template inspection outside workspace`

strict inspect 的 `--out-dir` 必须位于 workspace 内，而且不能等于 workspace 根目录。使用专用相对子目录：

```bash
node "$SKILL_DIR/scripts/template-tool.mjs" \
  --action inspect \
  --workspace "$TMP_DIR/strict" \
  --pptx "$REFERENCE_PPTX" \
  --out-dir template-inspect
```

注意：helper 会在开始时递归清空该 `out-dir`。绝对不要把 workspace 根、源文件目录或包含其他任务产物的目录用作 `out-dir`。

### workspace 中的 `package.json` 或 `node_modules` 冲突

当前 strict helper 会确保 workspace 是 ES module 工作区，并链接 primary runtime 包。可能出现：

- `<workspace>/package.json exists but does not set "type": "module"`；
- `<workspace>/node_modules/@oai/artifact-tool exists but is not @oai/artifact-tool`。

最安全的修复是建立新的任务专用 workspace，而不是覆盖现有项目的 `package.json` 或依赖目录。

### `--scale must be a positive number`

strict inspect/prepare 只接受大于 0 的数值。省略参数可使用默认 `1`。

### strict validate 报 `status: "fail"`

优先阅读：

```text
<workspace>/qa/template-plan-check.json
<workspace>/qa/template-plan-check.txt
```

常见 issue：

| Issue ID | 原因与修复 |
| --- | --- |
| `missing-template-inspect` | 先对同一 workspace 运行 strict inspect |
| `invalid-template-inspect` | NDJSON 某行无法解析；重新 inspect，不要手工拼接 |
| `missing-output-slides` | map 增加非空 `outputSlides` |
| `nonsequential-output-slide` | 从 1 开始连续编号 |
| `invalid-source-slide` | 指向实际存在的正整数源页；可传 `--source-slide-count` 加强检查 |
| `invalid-reuse-mode` | 使用严格的 `"duplicate-slide"` |
| `missing-narrative-role` | 为每页写清叙事角色 |
| `missing-edit-targets` | 每页提供数组；内容页不能用空数组伪装 preserve-only |
| `unknown-shape-id` | 使用 strict inspect 中该源页真实继承对象 ID |
| `unresolved-edit-target` | edit target 指向 `shapeId(s)` 或 `sourceElementId(s)` |
| `unsupported-edit-action` | 使用 `rewrite`、`rewrite-and-reposition`、`replace`、`delete`、`keep`、`fill-placeholder` |
| `unhandled-placeholder` | 对占位符明确改写、重排、替换、删除或填充；`keep`/`add` 不算处理 |
| `unresolved-add-target` | 尽量映射继承对象；确需新增时同时声明许可、zone、reason、禁止遮盖 |
| `add-only-content-slide` | 不要在复制页上只靠新增对象重建内容页 |

修正 map 后重新 validate；不要让 prepare 绕过失败报告。

### prepare 报输出路径位于 workspace 外

当前 helper 要求 `preview-dir` 和 `layout-dir` 位于 workspace 内。把 starter 中间产物统一放到该任务 workspace。最终对用户交付的 PPTX 在完成原位编辑和 QA 后再写到独立最终路径。

### `template-frame-map.json failed template plan validation`

prepare 会再次验证 map。查看错误中列出的 report 路径和前几项失败；修正后先单独运行 validate，确认 `status: "pass"`，再重跑 prepare。

### `No slide PNGs found for contact sheet`

wrapper 的匹配规则是文件名为 `slide-NN.png` 或以 `-slide-NN.png` 结尾；prepare 的正常输出是 `starter-slide-NN.png`。确认：

- `--preview-dir` 与 prepare 实际输出一致；
- starter 至少一页；
- prepare 在 contact sheet 阶段之前已经成功；
- `--preview-dir` 没有误指向通用或 strict inspect 的预览目录；这些文件名也可能命中规则，但不是 starter contact sheet 的正确输入。

### fidelity 报 authoring evidence 缺失

`missing-starter-import-evidence` 表示 `--edit-dir`/`--agent-log` 中找不到 `PresentationFile.importPptx` 导入 starter 的证据；`missing-artifact-export-evidence` 表示找不到 `PresentationFile.exportPptx`。保留实际原位编辑脚本或日志，并让 `--edit-dir` 指向它们所在目录。

不要通过添加虚假文本让扫描通过；fidelity 证据必须与实际生成过程一致。

### fidelity 报绕过或重建

| Issue ID | 含义 | 修复 |
| --- | --- | --- |
| `deck-affecting-python` | 检测到 `python-pptx` 或 Python 保存 PPTX | 回到 artifact-tool 原位编辑 starter |
| `direct-ooxml-mutation` | 检测到直接修改 PPTX ZIP/XML | 移除绕过，使用继承对象 API |
| `libreoffice-pptx-mutation` | 检测到 LibreOffice 转换生成 PPTX | 不用转换流程修改严格模板稿 |
| `fresh-slide-rebuild` | 检测到 `Presentation.create` 或 `slides.add` | 导入 starter，不新建 presentation/slide |
| `unresolved-placeholder` | 最终 layout/PPTX 仍有提示文字 | 原位改写、填充或删除对应继承对象 |
| `empty-structural-placeholder` | 最终 PPTX XML 仍有空结构占位符 | 在继承对象上处理该占位符 |
| `mask-cover-overlay` | 大面积新形状疑似遮盖继承内容 | 删除遮盖层，编辑继承元素本身 |

`--map` 和 `--starter-pptx` 在当前 helper 中只进入报告 provenance。若未同时提供 `--starter-layout-dir` 与 `--final-layout-dir`，遮盖比较不会运行；若未提供 final layout，layout 占位符扫描也不会运行。使用完整参数，不要把缺少检查项的报告当作完整保真证明。

## QA 报告

### `PPTX is missing or too small`

检查路径、文件类型和大小。`qa-deck.mjs` 要求目标是普通文件且至少 1024 字节。不要对临时零字节文件继续检查。

### QA 早期崩溃且没有 report

文件 stat、artifact-tool 加载、PPTX import、逐页 render 或 layout JSON 解析在报告写入之前发生。此类失败可能没有 `qa-report.json`；stderr 才是主要证据。修复 runtime 或坏页后，从新的 preview 目录重跑。

### `issues[].type` 如何处理

| Type | 含义 | 修复 |
| --- | --- | --- |
| `invalid-position` | layout 中出现负 left/top 或负 width/height | 定位 `slide` 和 `trail`，修正对象位置/尺寸 |
| `empty-placeholder` | PPTX XML 中存在空结构占位符 | 填充或删除对应占位符；严格模板优先原位处理 |
| `placeholder-scan-failed` | `unzip -p` 扫描失败 | 检查 `unzip` 是否可用、PPTX 是否是有效 ZIP 包 |
| `unresolved-template-prompt` | inspect 文本中出现 Click to add、Title goes here、Slide Number、Date、Footer 等 | 搜索最终稿并处理对应提示对象 |
| `slide-count-mismatch` | 实际页数与 `--expected-count` 不同 | 对照获批计划；修复缺页/多页或传入正确期望值 |

### `placeholder-scan-failed`

确认：

```bash
command -v unzip
unzip -t "$FINAL_PPTX"
```

若 `unzip -t` 失败，文件可能损坏或不是 PPTX。回到最后一次成功导出重新生成；不要忽略该 issue。

### QA 为 `ok: true` 仍然不能交付

`visualReviewRequired` 永远为 `true`。当前自动位置检查不会完整检测右侧/底部越界、文本框内部裁切、非预期对象重叠、图表数据含义、图片裁切质量、字体替换或选定风格的视觉保真。必须：

1. 全尺寸查看每张 `slide-NN.png`；
2. 查看 `montage.png` 的叙事节奏；
3. 核对图表、表格和引用与来源一致；
4. 内置风格对比获批 montage；严格模板对比 starter 和源模板；
5. 修复后重新运行 QA，不能沿用旧报告。

## 安全重试清单

1. 保留源材料、参考 PPTX 和上一次 stderr。
2. 单独运行最便宜的验证：style kit、content plan 或 frame map。
3. 为新尝试选择新的输出文件名、preview 目录和 QA report。
4. 只修正报告指向的计划、素材、对象或 runtime 问题。
5. 重新构建或原位编辑，再重新运行自动 QA。
6. 严格模板模式额外重跑 fidelity。
7. 完整视觉检查通过后才交付。

严格模板 helper 缺失、参考稿不能导入或没有可承载内容的源布局时，应停止并向用户说明阻断项；切换到重绘属于模式变更，必须由用户决定。
