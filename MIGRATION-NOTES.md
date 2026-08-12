# Halo → Astro 迁移说明

迁移日期：2026-08-12
来源：Halo 2.25.2（PostgreSQL 远程库）+ `~/Downloads/halo.zip` 备份

## 已迁移内容

9 篇文章已迁移到 `src/content/blog/`：

| 文章 | 文件 (slug) | 发布日期 |
|------|------------|---------|
| 自行车&风景 001 | `zi-xing-che-feng-jing-001.md` | 2026-06-06 |
| Git配置 | `git-pei-zhi.md` | 2023-05-31 |
| 旅行 01 | `lu-xing-01.md` | 2026-08-11 |
| 花&草 001 | `hua-cao-001.md` | 2026-05-17 |
| 蓝天&白云 001 | `lan-tian-bai-yun.md` | 2026-06-03 |
| 递归函数 | `di-gui-han-shu.md` | 2024-03-20 |
| git | `git.md` | 2023-05-31 |
| 蓝天&白云 003 | `lan-tian-bai-yun-003.md` | 2026-08-11 |
| 蓝天&白云 002 | `lan-tian-bai-yun-002.md` | 2026-08-02 |

> 注：已重命名自动生成的 slug（`wei-ming-ming-wen-zhang-*` → 语义化拼音名，`gitpei-zhi` → `git-pei-zhi`）

已忽略：2 篇草稿/已删除文章（`Hello Halo`、`使用 WXT + React 19...`）。

## 可选优化

- 代码块语言标注（Halo 存的 `language-shellscript` 等）在转换中丢失，如需高亮可手动补 ```bash 等标注
- `public/uploads/` 中图片为原始照片（单张 13~19MB，共 ~400MB），会拖慢网站加载并占用 Cloudflare 存储额度，建议后续压缩/生成缩略图

---

## 2026-08-12 第二轮迁移（网站信息 + 清理模板）

### 网站信息迁移（Halo → Astro）
- 网站名称：**雨霖铃**（Halo system config `title`）
- 域名：`https://example.com` → `https://yulinling.site`（Halo `externalUrl`）
- 备案信息（Halo theme-earth 配置）：
  - ICP：赣ICP备2024037374号-2
  - 公安：粤公网安备44030002013166号
- 导航菜单汉化：首页 / 博客 / 关于
- 首页从模板欢迎页改为博客文章列表
- 关于页：替换模板 Lorem ipsum 为实际内容
- 移除 Header/Footer 中 Astro 模板的社交链接

### 删除模板内容
- 删除模板示例文章：`first-post.md`、`second-post.md`、`third-post.md`、`markdown-style-guide.md`、`using-mdx.mdx`
- 删除占位图：`public/blog-placeholder-*.jpg`
