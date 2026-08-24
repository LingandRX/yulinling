---
title: "Git配置"
description: "可选：查看当前配置"
pubDate: "2023-05-31"
updatedDate: "2026-08-24"
notionId: 3bd971f3-e8db-818f-b75e-e8b48877a2d4
---

> 本文整理 Git 基础配置 + SSH Key 配置（GitHub 与免密登录）。按顺序执行即可。

## 目录

1. 配置用户信息

1. 生成 SSH Key（id_rsa / id_rsa.pub）

1. 配置 GitHub SSH Key

1. 测试 GitHub 连通性

1. 配置服务器免密登录（authorized_keys）

---

## 配置用户信息

```bash
git config --global user.name "username"
git config --global user.email "youremail@email.com"
```

可选：查看当前配置

```bash
git config --global --list
```

---

## 生成 SSH Key（id_rsa / id_rsa.pub）

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

## 配置 GitHub SSH Key

1. 在 GitHub 设置里打开 SSH and GPG keys

1. 点击 New SSH key

1. 填写 Title（任意名称）

1. Key type 默认即可

1. 将 id_rsa.pub 的内容复制到 Key 输入框

提示：查看公钥内容

```bash
cat ~/.ssh/id_rsa.pub
```

---

## 测试 GitHub 连通性

```bash
ssh -T git@github.com
```

---

## 配置服务器免密登录（authorized_keys）

1. 将本机公钥复制到服务器

```bash
scp -P 22 ~/.ssh/id_rsa.pub root@ipAddr:~/id_rsa.pub
```

1. 在服务器上追加到 authorized_keys（推荐用追加，避免覆盖）

```bash
mkdir -p ~/.ssh
cat ~/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

1. 测试登录

```bash
ssh root@ipAddr
```
