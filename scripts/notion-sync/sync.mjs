#!/usr/bin/env node
/**
 * Notion -> GitHub blog sync (yulinling Astro project), Node rewrite.
 *
 * Uses the `notion-to-md` library (souvikinator) for block -> Markdown
 * conversion instead of hand-written rendering. Orchestration (frontmatter,
 * frontmatter, pubDate = 📅 marker else created_time, first paragraph -> description, image download to
 * public/uploads/, .sync-state.json incremental cache, pinyin slug, git commit
 * & push) is kept here.
 *
 * Usage: node sync.mjs [--dry-run] [--force] [--no-push] [--no-commit]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import matter from "gray-matter";
import yaml from "js-yaml";
import { pinyin } from "pinyin-pro";

// ---------------- config ----------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = os.homedir();
const REPO = process.env.BLOG_REPO_DIR || path.resolve(__dirname, "../..");
const BLOG_DIR = path.join(REPO, "src/content/blog");
const UPLOADS_DIR = path.join(REPO, "public/uploads");
const STATE_FILE = path.join(REPO, ".sync-state.json");
const NOTION_PARENT =
  process.env.NOTION_PARENT_ID || "3bc971f3-e8db-8056-b710-cd0646acbddf"; // 雨霖铃
const MAX_DESC = 120;
const DATE_RE = /_*\s*📅\s*发布于\s*([\d-]+)\s*_*/;
const DATE_LINE_RE = /^[\s_]*📅.*(?:\n|$)/;

function getNotionToken() {
  if (process.env.NOTION_TOKEN) {
    return process.env.NOTION_TOKEN;
  }
  const hermesConfigPath = path.join(HOME, ".hermes/config.yaml");
  if (fs.existsSync(hermesConfigPath)) {
    try {
      const _cfg = yaml.load(fs.readFileSync(hermesConfigPath, "utf8"));
      const token = _cfg?.mcp_servers?.notion?.env?.NOTION_TOKEN;
      if (token) return token;
    } catch (err) {
      console.warn(`[warn] 无法解析配置文件 ${hermesConfigPath}:`, err.message);
    }
  }
  console.error(
    "错误: 未找到 NOTION_TOKEN。请设置环境变量 NOTION_TOKEN 或在 ~/.hermes/config.yaml 中配置。",
  );
  process.exit(1);
}

const TOKEN = getNotionToken();

const notion = new Client({ auth: TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const NO_PUSH = process.argv.includes("--no-push");
const NO_COMMIT = process.argv.includes("--no-commit");
const _ci = process.argv.indexOf("--compare");
const COMPARE_DIR = _ci !== -1 ? process.argv[_ci + 1] : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------- slug (pinyin) ----------------
function slugify(title) {
  // nonZh:"consecutive" keeps consecutive non-Chinese runs (e.g. "004") together
  // so "蓝天&白云004" -> "lan-tian-bai-yun-004" instead of "0-0-4".
  const s = pinyin(title, { toneType: "none", nonZh: "consecutive" });
  const cleaned = s
    .split(/\s+/)
    .map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  let out = cleaned
    .join("-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "post";
}

// ---------------- state ----------------
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  }
  return { pages: {} }; // {notionId: {etag, file}}
}
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------- notion api helpers ----------------
async function listNotionPages() {
  const pages = [];
  let cursor;
  do {
    const resp = await notion.blocks.children.list({
      block_id: NOTION_PARENT,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const b of resp.results) {
      if (b.type === "child_page") {
        pages.push({ id: b.id, title: b.child_page.title });
      }
    }
    cursor = resp.has_more ? resp.next_cursor : null;
  } while (cursor);

  for (const p of pages) {
    const meta = await notion.pages.retrieve({ page_id: p.id });
    p.last_edited_time = meta.last_edited_time || "";
    p.created_time = meta.created_time || "";
    p.url = meta.url || "";
    await sleep(250);
  }
  return pages;
}

// ---------------- image download ----------------
const IMG_URL_RE = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

// notion-to-md HTML-escapes some cell content (e.g. `<commit>` -> `&lt;commit&gt;`).
// Unescape common entities so inline code / tags render literally in the blog.
function unescapeHtml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// notion-to-md does not escape `|` inside table cells, which breaks rendering
// (e.g. `git reset [--soft|--mixed|--hard]`). Escape pipes that appear inside
// inline-code spans within table rows so the cell isn't split into columns.
function escapeTablePipes(body) {
  return body
    .split("\n")
    .map((line) =>
      line.startsWith("|")
        ? line.replace(/`[^`]*`/g, (m) => m.replace(/\|/g, "\\|"))
        : line,
    )
    .join("\n");
}

// The Astro theme now auto-generates the article TOC, so drop any manual
// "## 目录" block that Notion pages still carry (a heading `## 目录` followed
// by a numbered list of anchor links `](#...)` and a trailing `---` divider).
// Only strips when the block actually contains anchor links, so a genuine
// `## 目录` section without links is left untouched.
function stripManualToc(body) {
  const re = /##\s*目录[ \t]*\r?\n[\s\S]*?\n---[ \t]*(?:\r?\n)?/;
  const m = re.exec(body);
  if (m && /\]\(#/.test(m[0])) {
    return (
      body.slice(0, m.index) +
      body.slice(m.index + m[0].length).replace(/^\s*\n/, "")
    );
  }
  return body;
}

async function downloadImage(url, alt) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // 使用 URL 去除 query 后的 hash，确保命名稳定且同图不重下、异图不冲突
  const cleanUrl = url.split("?")[0];
  const urlHash = crypto
    .createHash("md5")
    .update(cleanUrl)
    .digest("hex")
    .slice(0, 8);

  let ext = ".jpg";
  let baseName = (alt && alt.trim()) || "";
  try {
    const parsedPath = new URL(url).pathname;
    const parsedExt = path.extname(parsedPath);
    if (parsedExt && parsedExt.length <= 5) {
      ext = parsedExt;
    }
    if (!baseName) {
      baseName = path.basename(parsedPath, parsedExt) || "img";
    }
  } catch {
    if (!baseName) baseName = "img";
  }

  baseName = baseName.replace(/[^\w.\-]/g, "_").slice(0, 30);
  const fname = `${baseName}_${urlHash}${ext}`;
  const dest = path.join(UPLOADS_DIR, fname);

  if (fs.existsSync(dest)) return "/uploads/" + fname;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    redirect: "follow",
  });
  if (!res.ok) {
    console.log(`  !! image download failed: ${res.status} ${url}`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(
    `  img: downloaded ${fname} (${Math.round(buf.length / 1024)}KB)`,
  );
  return "/uploads/" + fname;
}

// Download all remote images in the body, rewrite to local paths.
// Returns { body, hero } where hero is the first downloaded image local path.
async function localizeImages(body) {
  let hero = null;
  const out = [];
  let last = 0;
  let m;
  IMG_URL_RE.lastIndex = 0;
  while ((m = IMG_URL_RE.exec(body)) !== null) {
    const alt = m[1];
    const url = m[2];
    const local = await downloadImage(url, alt);
    if (local && hero === null) hero = local;
    out.push(body.slice(last, m.index));
    out.push(local ? `![${alt}](${local})` : m[0]);
    last = m.index + m[0].length;
  }
  out.push(body.slice(last));
  return { body: out.join(""), hero };
}

// Extract description = first real paragraph line (skip date marker, headings,
// lists, images, code, empty). Mirrors the old Python converter.
function extractDescription(body) {
  const lines = body.split("\n");
  let inCode = false;
  for (const raw of lines) {
    const t = raw.trim();
    if (/^```/.test(t)) {
      inCode = !inCode; // toggle fence
      continue;
    }
    if (inCode) continue; // skip code block content
    if (!t) continue;
    if (DATE_RE.test(t)) continue; // date marker
    // skip non-prose lines: headings, quotes, lists, tables, dividers, images
    if (/^(#{1,6}\s|>\s?|[-*+]\s|\d+\.\s|`|\||-{3,})/.test(t)) continue;
    if (/^!\[/.test(t)) continue; // image
    return t
      .replace(/[*`_]/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .trim()
      .slice(0, MAX_DESC);
  }
  return "";
}

function buildFrontmatter({
  title,
  description,
  category,
  categories,
  pubDate,
  updated,
  hero,
  notionId,
}) {
  const data = {
    title,
    description: description || "",
    categories: categories?.length ? categories : [category || "未分类"],
    pubDate: pubDate || "",
  };
  if (updated) data.updatedDate = updated;
  if (hero) data.heroImage = hero;
  if (notionId) data.notionId = String(notionId);

  return `---\n${yaml.dump(data, { lineWidth: -1 }).trim()}\n---`;
}

// ---------------- main ----------------
async function main() {
  const state = loadState();
  const pages = await listNotionPages();
  console.log(`Notion pages: ${pages.length}`);

  // existing repo articles: filename -> frontmatter
  const existing = {};
  for (const fn of fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"))) {
    const content = fs.readFileSync(path.join(BLOG_DIR, fn), "utf8");
    const { data } = matter(content);
    existing[fn] = data;
  }
  const idToFile = {};
  for (const [fn, fm] of Object.entries(existing)) {
    if (fm.notionId) idToFile[fm.notionId] = fn;
  }

  const changed = [];
  for (const p of pages) {
    const pid = p.id;
    if (pid in idToFile) {
      const fn = idToFile[pid];
      const prev = state.pages?.[pid]?.etag;
      if (!FORCE && prev === p.last_edited_time) continue;
      changed.push({ p, fn, kind: "update" });
    } else {
      let matched = null;
      for (const [fn, fm] of Object.entries(existing)) {
        if (
          !fm.notionId &&
          String(fm.title || "").trim() === String(p.title).trim()
        ) {
          matched = fn;
          break;
        }
      }
      if (matched) {
        const prev = state.pages?.[pid]?.etag;
        if (prev === p.last_edited_time) {
          state.pages[pid] = { etag: p.last_edited_time, file: matched };
          console.log(`mapped (unchanged): ${p.title} -> ${matched}`);
          continue;
        }
        changed.push({ p, fn: matched, kind: "update" });
      } else {
        changed.push({ p, fn: null, kind: "new" });
      }
    }
  }

  const newFiles = [];
  const updatedFiles = [];
  for (const { p, fn, kind } of changed) {
    const title = p.title;
    console.log(`\n[${kind}] ${title} (${p.id.slice(0, 8)})`);
    const mdblocks = await n2m.pageToMarkdown(p.id);
    let body = n2m.toMarkdownString(mdblocks).parent || "";
    body = unescapeHtml(body); // fix `&lt;commit&gt;`-style escaping from the lib
    body = body.replace(/```\s*plain\s*text\s*\n/gi, "```\n"); // invalid shiki lang -> plain
    body = escapeTablePipes(body); // escape `|` in code spans inside table rows
    let hero = null;

    // pubDate: prefer the in-article 📅 marker date; fall back to the page's
    // created_time when there's no marker, so a post never ships an empty date.
    let pubDate = "";
    const dateMatch = body.match(DATE_RE);
    if (dateMatch) {
      pubDate = dateMatch[1];
    } else {
      pubDate = (p.created_time || "").slice(0, 10);
    }
    body = body.replace(DATE_LINE_RE, "").replace(/^\s*\n/, ""); // strip any stray marker line
    body = stripManualToc(body); // drop theme-auto-rendered "## 目录" block

    // download images -> local, capture hero
    const local = await localizeImages(body);
    body = local.body;
    hero = local.hero;
    const desc = extractDescription(body);

    // empty page check: date marker stripped; anything else counts as content
    // (images/tables included, so pure-photo posts still sync)
    if (body.trim() === "") {
      console.log(`  !! skipped: page is empty (no content) — not syncing`);
      state.pages[p.id] = { etag: p.last_edited_time, file: fn || "" };
      continue;
    }

    const updated = kind === "update" ? p.last_edited_time.slice(0, 10) : null;
    const fmText = buildFrontmatter({
      title,
      description: desc,
      categories: existing[fn]?.categories?.length
        ? existing[fn].categories
        : [existing[fn]?.category || "未分类"],
      pubDate,
      updated,
      hero,
      notionId: p.id,
    });

    let outFn = fn;
    if (kind === "new") {
      outFn = slugify(title) + ".md";
      const base = outFn;
      let n = 2;
      while (
        outFn in existing ||
        newFiles.some((f) => f[0] === outFn) ||
        updatedFiles.some((f) => f[0] === outFn)
      ) {
        outFn = base.replace(".md", `-${n}.md`);
        n += 1;
      }
      console.log(`  new file: ${outFn} (slug from title)`);
      newFiles.push([outFn, fmText, body]);
    } else {
      console.log(`  update file: ${outFn}`);
      updatedFiles.push([outFn, fmText, body]);
    }
    state.pages[p.id] = { etag: p.last_edited_time, file: outFn };
    await sleep(150);
  }

  const writes = [...newFiles, ...updatedFiles];

  if (DRY_RUN) {
    console.log("\n[DRY RUN] would write:");
    for (const [fn] of writes) console.log("  +", fn);
    console.log("[DRY RUN] state NOT saved (etags not locked in).");
    return;
  }

  if (COMPARE_DIR) {
    fs.mkdirSync(COMPARE_DIR, { recursive: true });
    for (const [fn, fmText, body] of writes) {
      fs.writeFileSync(path.join(COMPARE_DIR, fn), fmText + "\n\n" + body);
      console.log(`  compare-wrote ${fn}`);
    }
    return; // no state, no git
  }

  for (const [fn, fmText, body] of writes) {
    fs.writeFileSync(path.join(BLOG_DIR, fn), fmText + "\n\n" + body);
    console.log(`  wrote ${fn}`);
  }
  saveState(state);

  if (writes.length === 0) {
    console.log("\nNo changes to sync.");
    return;
  }

  if (NO_COMMIT) {
    console.log(
      `\n[--no-commit] 同步完成（共 ${writes.length} 篇），跳过 Git 提交与推送。`,
    );
    return;
  }

  // git commit & push
  process.chdir(REPO);
  for (const [fn] of writes) {
    execSync(`git add "src/content/blog/${fn}"`, { stdio: "inherit" });
  }
  if (fs.existsSync(UPLOADS_DIR)) {
    execSync("git add public/uploads/", { stdio: "inherit" });
  }
  execSync(
    `git commit -m "sync: update ${writes.length} post(s) from Notion"`,
    {
      stdio: "inherit",
    },
  );

  if (NO_PUSH) {
    console.log(
      `\n[--no-push] 本地提交完成（共 ${writes.length} 篇），跳过 Git Push。`,
    );
    return;
  }

  try {
    const out = execSync("git push origin HEAD", { encoding: "utf8" });
    console.log(`\npush: 0\n${out.slice(-500)}`);
  } catch (err) {
    console.error(
      "\n[warn] git push 失败，请稍后检查网络或远程分支并手动推送:",
      err.message,
    );
  }

  console.log(`\nDone. Synced ${writes.length} file(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
