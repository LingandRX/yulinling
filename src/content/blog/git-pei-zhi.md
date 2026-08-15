---
title: "Git配置"
description: ""
pubDate: "2023-05-31"
updatedDate: "2026-08-15"
notionId: 3bd971f3-e8db-818f-b75e-e8b48877a2d4
---

## 配置用户信息

```
git config --global user.name 'username'
git config --global user.email 'youremail@email.com'
```

## 生成 id\_rsa 和 id\_rsa.pub

```
ssh-keygen -t rsa

# 存储密钥路径
.ssh/
├── authorized_keys
├── id_rsa
├── id_rsa.pub
└── known_hosts

authorized_keys: 免密登录/密钥登录
id_rsa: 密钥
id_rsa.pub: 公开密钥
known_hosts: 记录登录机器信息
```

## 配置Github

1. 在github设置界面打开SSH and GPG keys页面

1. 点击new SSH keys

1. 填写Title,任意名称

1. Key type默认即可

1. 将id_rsa.pub中的内容至Key内容框中

## 测试 Github 是否连通

```
ssh -t git@github.com
```

## 配置免密登录

```
scp -P 22 ~/.ssh/id_rsa.pub root@ipAddr:~/home/your
cat ~/home/your/id_rsa.pub > ~/ssh/authorized_keys
ssh root@ipAddr
```
