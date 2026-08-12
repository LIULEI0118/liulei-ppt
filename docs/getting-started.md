# 安装与首次使用

本指南帮助你安装 LIULEI PPT、准备输入材料，并完成第一次“材料 → 大纲确认 → 可编辑 PPTX”任务。

## 运行前提

LIULEI PPT 运行在 Codex 中，不是独立的 PowerPoint 应用。开始前请确认：

- 已安装支持 Skills 的 Codex Desktop 或 Codex CLI。
- 终端可以执行 `node`。本仓库使用 Node.js 20.x 进行发布验证，当前验证版本为 `v20.20.0`。
- 终端可以执行 `git`，用于安装或更新仓库。
- Codex primary runtime 已安装，其中应包含 `@oai/artifact-tool`、`sharp` 与 `lucide`。脚本默认从 Codex runtime 解析这些包，不使用仓库级 `node_modules`，因此不要在本仓库中额外运行 `npm install`。
- 若要读取 DOCX、PDF、XLSX 或 CSV，当前 Codex 环境还应具备对应的文档、PDF 或电子表格能力。
- 若要严格复用参考 PPTX，Codex 的 presentations runtime 还必须包含模板检查、准备和保真度校验工具。缺少该工具时应停止严格复用流程，而不是自动改成重绘。

本仓库的发布验证环境如下。这里记录的是已验证组合，而不是最低兼容版本：

| 组件 | 已验证版本 |
| --- | --- |
| Codex CLI | `0.144.6` |
| Node.js | `v20.20.0` |
| Git | `2.42.0` |

可以先检查本机环境：

```bash
codex --version
node --version
git --version
codex doctor --summary
```

`codex doctor --summary` 用于检查 Codex 安装、配置、登录状态和 runtime 健康度；若你的 Codex 版本没有该选项，请先升级 Codex，再继续本指南。

## 安装 Skill

仓库根目录就是 Skill 根目录，必须安装到 Codex 的 skills 目录下，并保持目录名为 `liulei-ppt`：

```bash
CODEX_SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
mkdir -p "$CODEX_SKILLS_DIR"
git clone https://github.com/LIULEI0118/liulei-ppt.git "$CODEX_SKILLS_DIR/liulei-ppt"
```

如果目标目录已经存在，`git clone` 会安全退出；请先确认它是此前安装的同一仓库，再决定是否在该目录中执行 `git pull --ff-only`。不要覆盖一个来源不明的同名目录。

安装后可以验证 Skill 文件和六套风格清单：

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/liulei-ppt"
test -f "$SKILL_DIR/SKILL.md"
node "$SKILL_DIR/scripts/list-styles.mjs"
node "$SKILL_DIR/scripts/validate-style-kit.mjs"
```

成功时，`list-styles.mjs` 会输出六套风格及其配置、样例 PPTX 和预览拼图的绝对路径；`validate-style-kit.mjs` 会返回包含 `"ok": true` 的 JSON。

Skill 会在后续轮次或新任务中可用。若当前任务没有识别到 `$liulei-ppt`，新建一个 Codex 任务后再试。

## 准备输入材料

把材料附加到 Codex 任务，或放到 Codex 可以读取的工作目录，并在请求中写清文件名或路径。不要修改或覆盖源文件；LIULEI PPT 会为编辑任务使用不同的输出路径。

| 输入类型 | 建议准备方式 | 处理重点 |
| --- | --- | --- |
| TXT、Markdown | 提供文件或直接粘贴内容 | 识别受众、主张、证据和叙事顺序 |
| DOCX | 提供完整文档 | 先读取正文与结构，再进入演示规划 |
| PDF | 提供原始 PDF | 读取完整页面，区分正文、图表和引用 |
| XLSX、CSV | 提供原始数据文件并说明口径 | 先核算数据，再生成可编辑图表或表格 |
| PNG、JPG、WebP | 提供原图及使用说明 | 检查画面、裁切和来源后再使用 |
| PPTX | 提供完整参考稿 | 先检查全部页面，再选择严格复用或风格提取重绘 |

为减少往返，首次请求最好同时说明：

- 目标受众和演示场景；
- 希望受众看完后采取的行动或形成的判断；
- 必须保留的事实、数据和来源；
- 语言、页面比例和期望页数；
- 是否需要演讲者备注；
- 最终 `.pptx` 的输出路径；
- 是否允许补充外部研究。未明确允许时，Skill 默认只使用已提供材料。

如果未指定，Skill 会匹配输入语言、使用 16:9，并通常建议 8–12 页。未指定输出路径时，默认保存到当前工作目录的 `outputs/<topic-slug>.pptx`。

## 激活方式与示例

在请求中明确写出 `$liulei-ppt`，可以减少路由歧义。

### 从文字或 Markdown 开始

```text
使用 $liulei-ppt，把 brief.md 制作成面向管理层的 10 页中文季度汇报。
目标是让管理层批准下一季度的增长试验；只使用 brief.md 中的数据。
先展示六套内置风格预览，再给逐页大纲，等我确认后才生成。
输出到 outputs/quarterly-review.pptx。
```

### 从表格开始

```text
使用 $liulei-ppt，根据 sales.xlsx 制作一份 8 页销售复盘。
先核对各区域合计和增长率，图表必须可编辑，并在每页保留数据来源标识。
先给风格选项和逐页大纲，不要直接生成 PPTX。
```

### 从参考 PPTX 开始

如果你需要沿用现有品牌稿，请在请求中明确模式：

```text
使用 $liulei-ppt，严格复用 template.pptx 的现有版式制作新方案。
先检查模板的全部页面并给出源页到新页的映射；无法容纳内容时先停下来告诉我，不要改成重绘。
```

如果只想延续设计语言、允许新布局，则使用风格提取重绘：

```text
使用 $liulei-ppt，从 reference.pptx 提取设计语言，并用它重绘 proposal.md 的内容。
先展示参考稿预览和提取结果，再给逐页大纲。
```

未指定模式时，Skill 会要求你在“严格模板复用”和“风格提取重绘”之间选择。

## 第一次任务会发生什么

1. Codex 读取输入材料，并确认受众、任务、核心结论、来源限制、语言、比例、页数和输出位置。
2. 没有参考 PPTX 时，Codex 读取风格目录并展示六张已定稿预览；你可以选择其中一套。只有展示过预览后，才可以把 `business-minimal` 作为默认风格。
3. 有参考 PPTX 时，Codex 根据你选择的模式检查完整参考稿；严格复用模式还会建立源页到输出页的映射。
4. Codex 提交沟通目标和逐页大纲，等待你的明确确认。
5. 确认后，Codex 建立结构化内容计划，生成需要的视觉素材和可编辑页面。
6. Codex 渲染每一页，运行自动 QA，并检查整套预览的可读性、节奏和风格一致性。
7. 全部检查通过后，Codex 返回最终 PPTX 链接，并说明采用的风格、页数以及是否使用外部来源。

## 大纲确认门槛

逐页大纲是内容规划和生成之间的边界。正常情况下，每一页至少包含：

| 字段 | 用途 |
| --- | --- |
| 结论式标题 | 说明这一页希望受众记住什么 |
| 叙事角色 | 说明它承担开场、背景、证据、转折、建议或收束中的哪一项任务 |
| 关键内容或证据 | 列出支撑标题的事实、数据、引语或论点 |
| 布局 | 选择标题页、图文、关键数字、图表、表格、时间线等形式 |
| 视觉方向 | 说明主要视觉、层级和页面轮廓 |
| 来源引用 | 使用稳定的来源标识，连接输入材料与最终页面 |

确认时可以直接回复：

```text
大纲确认。按 consulting-data 生成，输出到 outputs/final.pptx。
```

如果要修改，直接指出页码和新要求，例如：

```text
第 4 页改成“问题—原因—影响”的三段结构；第 7 页删除，其他页确认。
```

只有你明确要求立即生成时，才会跳过大纲确认，例如：

```text
跳过大纲确认，按我已提供的页序立即生成；使用 business-minimal。
```

跳过确认并不会跳过内容校验、渲染和视觉 QA。

## 下一步

- 根据任务类型选择 [内置风格、严格模板复用或风格提取重绘](./workflows.md)。
- 需要手动运行或维护脚本时，查看 [命令参考](./command-reference.md)。
- 环境检查、生成或 QA 失败时，查看 [故障排查](./troubleshooting.md)。
- 返回 [项目首页](../README.md)。
