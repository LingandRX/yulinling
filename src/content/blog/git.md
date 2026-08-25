---
title: "git"
description: ""
pubDate: "2023-05-31"
updatedDate: "2026-08-24"
notionId: 3bd971f3-e8db-81b5-b779-e2bd0dfbece9
---

## 常用命令速查


| 场景       | 命令                                                 | 说明               |
| -------- | -------------------------------------------------- | ---------------- |
| 推送到远程并合并 | `git push`                                         | 上传本地提交到远程        |
| 拉取远程并合并  | `git pull`                                         | 下载远程并合并到本地       |
| 添加到暂存区   | `git add <file>` / `git add .`                     | 将改动加入暂存区         |
| 查看状态     | `git status`                                       | 查看工作区/暂存区状态      |
| 查看差异     | `git diff`                                         | 工作区 vs 暂存区差异     |
| 提交       | `git commit -m "msg"`                              | 生成一次提交           |
| 回退版本     | `git reset [--soft\|--mixed\|--hard] <commit>` | 回退到指定提交          |
| 删除文件     | `git rm <file>`                                    | 从版本库删除（并删除工作区文件） |
| 移动/重命名   | `git mv <from> <to>`                               | 移动或重命名文件         |
| 切换分支/文件  | `git checkout <branch>`                            | 切换分支（或恢复文件）      |
| 查看提交日志   | `git log`                                          | 查看提交历史           |
| 查看单文件历史  | `git blame <file>`                                 | 查看某文件每行的修改记录     |
| 查看帮助     | `git <command> --help`                             | 查看命令帮助           |
| 合并分支     | `git merge <target-branch>`                        | 将目标分支合并到当前分支     |


---


## 常用组合（可选）

- 新增/修改后提交流程：
    1. `git status`
    2. `git add .`
    3. `git commit -m "feat: ..."`
    4. `git push`
- 同步远程最新：
    1. `git pull`
    2. 解决冲突（如有）
    3. `git push`（如需要推送本地提交）

---

