# Repository Activity Card

在任意 GitHub 仓库中用一份简短的 workflow，每天生成指定 `user/project` 的活动卡片。

## 使用

在要存放卡片的仓库中新建 `.github/workflows/repository-card.yml`：

```yaml
name: Update repository card

on:
  workflow_dispatch:
  schedule:
    - cron: '17 0 * * *'

permissions:
  contents: write
  issues: read
  pull-requests: read

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: Haruko386/Recent-working-on@main
        with:
          repository: Haruko386/FunPDF # 只需要修改这里：user/project
```

提交后手动运行一次 workflow。SVG 会发布到当前仓库的 `output-repository-card` 分支，然后在 README 中引用：

```md
![Repository activity](https://raw.githubusercontent.com/你的用户名/存放卡片的仓库/output-repository-card/repository-card.svg)
```

公开仓库无需额外设置。读取其他私有仓库时，创建可读取目标仓库的 fine-grained PAT，将它保存为 `REPOSITORY_TOKEN`，再增加一行：

```yaml
          token: ${{ secrets.REPOSITORY_TOKEN }}
```

可选参数：`timezone`（默认 `Asia/Shanghai`）、`days`（1–15）、`theme`（`light`/`dark`）。
