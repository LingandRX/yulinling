---
title: git
description: 可选：查看当前配置
pubDate: '2023-05-31'
updatedDate: '2026-08-28'
notionId: 3bd971f3-e8db-81b5-b779-e2bd0dfbece9
categories:
  - 技术
---

## 常用命令速查


| 场景       | 命令                                           | 说明               |
| -------- | -------------------------------------------- | ---------------- |
| 推送到远程并合并 | `git push`                                   | 上传本地提交到远程        |
| 拉取远程并合并  | `git pull`                                   | 下载远程并合并到本地       |
| 添加到暂存区   | `git add <file>` / `git add .`               | 将改动加入暂存区         |
| 查看状态     | `git status`                                 | 查看工作区/暂存区状态      |
| 查看差异     | `git diff`                                   | 工作区 vs 暂存区差异     |
| 提交       | `git commit -m "msg"`                        | 生成一次提交           |
| 回退版本     | `git reset [--soft\|--mixed\|--hard] <commit>` | 回退到指定提交          |
| 删除文件     | `git rm <file>`                              | 从版本库删除（并删除工作区文件） |
| 移动/重命名   | `git mv <from> <to>`                         | 移动或重命名文件         |
| 切换分支/文件  | `git checkout <branch>`                      | 切换分支（或恢复文件）      |
| 查看提交日志   | `git log`                                    | 查看提交历史           |
| 查看单文件历史  | `git blame <file>`                           | 查看某文件每行的修改记录     |
| 查看帮助     | `git <command> --help`                       | 查看命令帮助           |
| 合并分支     | `git merge <target-branch>`                  | 将目标分支合并到当前分支     |


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


## Git 基础配置 + SSH Key 配置（GitHub 与免密登录）


> 本文整理 Git 基础配置 + SSH Key 配置（GitHub 与免密登录）。按顺序执行即可。


#### 配置用户信息


```bash
git config --global user.name "username"
git config --global user.email "youremail@email.com"
```


可选：查看当前配置


```bash
git config --global --list
```


---


### 生成 SSH Key（id_rsa / id_rsa.pub）


```bash
ssh-keygen -t rsa
```


> 密钥默认存放目录：<code>~/.ssh/</code>


```
.ssh/
├── authorized_keys
├── id_rsa
├── id_rsa.pub
└── known_hosts

authorized_keys: 免密登录/密钥登录（服务器端）
id_rsa: 私钥（不要泄露）
id_rsa.pub: 公钥（可公开）
known_hosts: 记录已登录过的机器信息
```


---


### 配置 GitHub SSH Key

1. 在 GitHub 设置里打开 `SSH and GPG keys`
2. 点击 `New SSH key`
3. 填写 `Title`（任意名称）
4. `Key type` 默认即可
5. 将 `id_rsa.pub` 的内容复制到 `Key` 输入框

提示：查看公钥内容


```bash
cat ~/.ssh/id_rsa.pub
```


---


### 测试 GitHub 连通性


```bash
ssh -T git@github.com
```


---


### 配置服务器免密登录（authorized_keys）

1. 将本机公钥复制到服务器

```bash
scp -P 22 ~/.ssh/id_rsa.pub root@ipAddr:~/id_rsa.pub
```

2. 在服务器上追加到 `authorized_keys`（推荐用追加，避免覆盖）

```bash
mkdir -p ~/.ssh
cat ~/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

3. 测试登录

```bash
ssh root@ipAddr
```

