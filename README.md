# Contribution Life Game

把 GitHub 最近一年的贡献日历变成 Conway's Game of Life SVG 动画，并由 GitHub Actions 每天发布到 `output-lifegame` 分支。

生成器会按贡献数从高到低排列日期；贡献数相同时使用每日变化的随机种子打乱顺序，再取前 3 天作为初始活细胞。细胞遵循标准生命游戏规则（B3/S23，网格外视为死亡）。全部细胞死亡后动画回到起点；若一直存活，则在达到 `max-generations` 后回到起点。

## 使用

1. 将仓库的默认分支命名为 `main`，并把这些文件推送到 GitHub。
2. 打开仓库的 **Actions → Generate contribution life game → Run workflow**，首次手动运行。
3. Action 会创建仅包含生成产物的 `output-lifegame` 分支。之后每天 UTC 00:17 自动更新。
4. 在你的个人 Profile README 中引用：

```md
![My contribution Game of Life](https://raw.githubusercontent.com/<OWNER>/<REPO>/output-lifegame/lifegame.svg)
```

把 `<OWNER>/<REPO>` 换成实际仓库，例如：

```md
![My contribution Game of Life](https://raw.githubusercontent.com/Haruko386-UnOffical/lifegame-profile-readme/output-lifegame/lifegame.svg)
```

仓库的 **Settings → Actions → General → Workflow permissions** 需要允许 **Read and write permissions**。工作流使用内置的 `GITHUB_TOKEN`，不需要额外创建 PAT；私有贡献是否计入取决于 GitHub 账户的贡献可见性设置。

## 配置

手动运行 Action 时可以设置：

- `username`：要读取的 GitHub 用户，默认为仓库所有者。
- `theme`：`green`、`ocean` 或 `purple`。
- `max_generations`：仍有细胞存活时的最大演化代数，默认 60。

本地运行需要 Node.js 20+（Action 使用 Node.js 24）和一个可读取公开用户资料的 GitHub Token：

```powershell
$env:GH_TOKEN = 'github_pat_xxx'
npm test
npm run generate -- --username octocat --theme ocean --max-generations 60
```

结果位于 `dist/lifegame.svg`。可额外使用 `--seed` 固定并列日期的选择结果，或用 `--frame-ms` 调整每帧毫秒数。

## 目录

```text
src/contributions.js  GitHub GraphQL 数据获取与起点选择
src/lifegame.js       B3/S23 演化逻辑
src/svg.js            无 JavaScript 的 CSS 动画 SVG 渲染
src/index.js          命令行入口
test/                 Node.js 内置测试
```

## License

[MIT](LICENSE)
