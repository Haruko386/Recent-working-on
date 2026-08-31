# Repository Activity Card

每天把指定 GitHub 仓库“昨天”的开发活动生成成适合放在 Profile README 中的 SVG 卡片。

卡片包含仓库所有者头像、仓库名、简介、Open Issues、Open PRs、昨日提交数与增删行数，以及最近最多 15 个完整自然日按天统计的代码变化和提交活动。语言标签采用紧凑的小尺寸展示，图表带轻量进入动画，并适配系统的“减少动态效果”设置。

## 使用 GitHub Actions

1. 将本项目的全部文件推送到 GitHub，不能只复制工作流文件；仓库根目录必须包含 `package.json`、`src/` 和 `test/`。
2. 打开 **Actions → Generate repository activity card → Run workflow**。
3. 在 `repository` 中填写 `OWNER/REPO`，例如 `Haruko386/FunPDF` 或 `infiniflow/ragflow`。
4. Action 会把 `repository-card.svg` 发布到孤立的 `output-repository-card` 分支，并在每天 UTC 00:17 自动更新。

在 Profile README 中引用：

```md
![Repository activity](https://raw.githubusercontent.com/<CARD_OWNER>/<CARD_REPO>/output-repository-card/repository-card.svg)
```

仓库的 **Settings → Actions → General → Workflow permissions** 需要设为 **Read and write permissions**，以便创建输出分支。

## 公开、私有和组织仓库权限

- 公开仓库通常可直接使用 Action 自动提供的 `GITHUB_TOKEN`，包括公开组织仓库。
- 对于私有仓库、组织限制访问的仓库或跨仓库权限不足的情况，请创建仅授权目标仓库的 fine-grained PAT，并给予 Contents、Issues、Pull requests 的只读权限（Metadata 会自动包含），然后在运行本项目的仓库中添加名为 `REPOSITORY_TOKEN` 的 Actions Secret。
- 不要把 PAT 填入工作流输入框、代码或 README。工作流会优先使用 `REPOSITORY_TOKEN`，否则回退到内置 `GITHUB_TOKEN`。
- 输出 SVG 会公开显示统计结果；不要把私有仓库的卡片发布到公开输出分支，除非你确认这些信息可以公开。

## 参数

- `repository`：目标仓库，必须为 `OWNER/REPO`。
- `timezone`：用于划分“昨天”的 IANA 时区，默认 `Asia/Shanghai`。
- `date`：可选的 `YYYY-MM-DD`，用于重新生成指定日期；留空时自动选择昨天。
- `days`：两张图展示的完整自然日数量，范围 1–15，默认 15。
- `theme`：`light` 或 `dark`。

代码增删与提交数来自目标仓库默认分支。一次合并提交展示的是 GitHub 对该提交计算的 additions/deletions；语言数据是当前仓库整体语言组成，不是仅统计昨天修改过的文件。

## 本地运行

需要 Node.js 20+ 和 GitHub Token：

```powershell
$env:GH_TOKEN = 'github_pat_xxx'
npm test
npm run generate -- --repository Haruko386/FunPDF --timezone Asia/Shanghai
```

也可以固定日期和主题：

```powershell
npm run generate -- --repository infiniflow/ragflow --date 2026-08-27 --theme dark
```

结果输出到 `dist/repository-card.svg`。

## License

[MIT](LICENSE)
