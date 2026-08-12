# 参与贡献

感谢你改进 LIULEI PPT。本仓库同时服务两类读者：根目录与 `docs/` 面向使用者，`SKILL.md` 与 `references/` 面向执行演示文稿任务的 AI。提交修改时请保持这两层职责清晰，并以脚本的实际行为为准。

## 修改前准备

本仓库的发布验证环境使用 Node.js 20；此外需要 Python 3 和 Codex 随附的 primary runtime。完整生成、图标与 QA 流程还依赖 `@oai/artifact-tool`、`sharp`、`lucide` 和系统命令 `unzip`。运行仓库命令前，在仓库根目录设置：

```bash
export SKILL_DIR="$(pwd)"
export CODEX_ROOT="${CODEX_HOME:-$HOME/.codex}"
export VALIDATION_DIR="$(mktemp -d "${TMPDIR:-/tmp}/liulei-ppt-validate.XXXXXX")"
```

`VALIDATION_DIR` 保存构建、渲染和 QA 产物，不要把这些临时文件写入 `assets/`。任何命令以非零状态退出时，都应先修复问题，再运行后续步骤。

## 各类修改应放在哪里

| 修改对象 | 适合承载的内容 | 同步检查 |
| --- | --- | --- |
| `SKILL.md` | 触发范围、请求路由、不可跳过的审批与交付门禁 | 保持精简；细节下沉到 `references/`，并检查引用路径 |
| `references/*.md` | 内容计划、运行环境、视觉系统、模板模式与 QA 的条件式说明 | 不复制 README；确认 `SKILL.md` 在正确阶段引用它 |
| `scripts/*.mjs` | 可重复执行的检查、构建、渲染与辅助工具 | 使用 ES modules 和 `@oai/artifact-tool`；参数缺失或失败时返回非零状态；同步命令参考与故障排查 |
| `assets/styles/` | 风格 JSON、获批样例 PPTX 与获批预览 | 更新 `catalog.json` 和对应 recipe；样例、预览与 profile 必须成套存在 |
| `assets/examples/` | 可重复验证的内容计划或映射示例 | 使用稳定的合成数据；资源路径相对于计划 JSON 所在目录；计划须通过验证器 |
| `README.md`、`docs/` | 人类用户的介绍、安装、工作流、命令与排错 | 只记录已验证行为；避免与脚本或 agent 文档形成第二套事实来源 |

不要移动或重命名现有脚本、风格 profile、获批样例 PPTX、预览 montage、schema 或示例资产，除非同一个提交修复全部引用并说明兼容性影响。不要使用 `python-pptx` 生成或修改演示文稿。

### 修改风格套件

每个内置风格必须同时具有：

- `assets/styles/<id>.json`；
- `assets/styles/<id>-approved.pptx`；
- `assets/styles/<id>-approved-preview/montage.png`；
- `assets/styles/catalog.json` 中的一条对应记录；
- `references/style-recipes.md` 中的明确设计规则。

当前验证器要求目录中恰好有六个内置风格。新增或删除风格时，必须有意更新验证器、README、工作流文档和测试预期；仅替换颜色而没有同步字体层级、网格、媒体尺度、图表处理与页面轮廓，不算有效的风格更新。

### 修改脚本

- 复用 `scripts/runtime.mjs` 的参数、JSON、runtime 与路径工具。
- 输入文件只读，输出使用不同路径；不要原地覆盖参考 PPTX。
- 中间文件写入任务专用临时目录，最终目录只保留用户要求的交付物。
- 新增或修改参数时，同步更新 `docs/command-reference.md`、相关工作流和 `docs/troubleshooting.md`。
- 严格模板复用不得创建全新 presentation、在继承内容上覆盖平行设计，或直接修改 OOXML；必须导入 starter deck 并原位编辑继承对象。

## 必须运行的验证

以下命令从仓库根目录执行。先做快速、静态检查，再做成本更高的构建与渲染。

### 1. Skill 结构

```bash
python3 "$CODEX_ROOT/skills/.system/skill-creator/scripts/quick_validate.py" "$SKILL_DIR"
```

预期输出为 `Skill is valid!`。

### 2. Markdown 本地链接

```bash
python3 - "$SKILL_DIR" <<'PY'
from pathlib import Path
from urllib.parse import unquote
import re
import sys

root = Path(sys.argv[1]).resolve()
failures = []

for document in root.rglob("*.md"):
    text = document.read_text(encoding="utf-8")
    for match in re.finditer(r"\[[^\]]*\]\(([^)]+)\)", text):
        raw = match.group(1).strip()
        if not raw or raw.startswith(("#", "https://", "http://", "mailto:", "data:")):
            continue
        if raw.startswith("<") and ">" in raw:
            target = raw[1:raw.index(">")]
        else:
            target = raw.split(maxsplit=1)[0]
        target = unquote(target.split("#", 1)[0])
        resolved = (root / target.lstrip("/")) if target.startswith("/") else (document.parent / target)
        resolved = resolved.resolve()
        try:
            resolved.relative_to(root)
        except ValueError:
            failures.append(f"{document.relative_to(root)}: link leaves repository: {raw}")
            continue
        if not resolved.exists():
            failures.append(f"{document.relative_to(root)}: missing: {raw}")

if failures:
    print("\n".join(failures))
    raise SystemExit(1)

print("All local Markdown links resolve.")
PY
```

### 3. 六套内置风格与示例计划

```bash
node "$SKILL_DIR/scripts/validate-style-kit.mjs"
node "$SKILL_DIR/scripts/validate-plan.mjs" --plan "$SKILL_DIR/assets/examples/sample-plan.json"
node "$SKILL_DIR/scripts/validate-plan.mjs" --plan "$SKILL_DIR/assets/examples/full-layout-plan.json"
```

风格检查应返回 `"ok": true` 和六个风格 ID；两份计划应分别报告 7 页和 8 页。

### 4. 真实构建与 QA

```bash
node "$SKILL_DIR/scripts/build-deck.mjs" \
  --plan "$SKILL_DIR/assets/examples/sample-plan.json" \
  --style business-minimal \
  --out "$VALIDATION_DIR/sample.pptx" \
  --preview-dir "$VALIDATION_DIR/build-preview"

node "$SKILL_DIR/scripts/qa-deck.mjs" \
  --pptx "$VALIDATION_DIR/sample.pptx" \
  --report "$VALIDATION_DIR/qa-report.json" \
  --preview-dir "$VALIDATION_DIR/qa-preview" \
  --expected-count 7
```

确认 QA 输出中的 `ok` 为 `true`，然后逐页查看 `$VALIDATION_DIR/qa-preview/slide-*.png`，并比较：

- `$VALIDATION_DIR/qa-preview/montage.png`；
- `assets/styles/business-minimal-approved-preview/montage.png`。

自动检查不能替代视觉检查。标题换行、裁切、层级、节奏或风格辨识度不合格时，修复后重新构建和 QA。

### 5. 提交前检查

```bash
git diff --check
git diff --cached --check
git status --short
```

再次运行 Markdown 链接检查。确认没有提交 `node_modules/`、任务输出、临时预览、QA 报告、日志、`.env` 或操作系统元数据；有意更新的获批样例、预览和示例资产除外。

## 提交说明

一个提交应解决一个清晰问题。提交信息用简短动词说明结果，例如 `docs: clarify strict template workflow`。在 Pull Request 中写明：

- 修改原因与影响范围；
- 已运行的验证命令及结果；
- 风格或渲染变化的前后 montage；
- 是否改变命令参数、内容计划格式、文件路径或兼容性；
- 尚需人工判断的限制。

请勿提交来源不明的字体、图片、模板或品牌素材。引用第三方材料时，说明来源与使用权限；任何凭据、令牌、Cookie、私钥或恢复码都不得进入仓库。
