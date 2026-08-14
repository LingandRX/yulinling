#!/usr/bin/env node
/**
 * 新建博客文章模板脚本
 *
 * 用法：
 *   npm run new:post "文章标题"
 *   npm run new:post "文章标题" -- --slug lu-xing-02
 *   npm run new:post "文章标题" -- --desc "简介" --hero "/uploads/xx.jpg"
 *
 * slug 生成规则：
 *   - 传了 --slug 则直接用；
 *   - 纯 ASCII 标题自动转成连字符 slug（Test Post → test-post）；
 *   - 中文标题若安装了 pinyin-pro（npm i pinyin-pro）自动转拼音；
 *   - 否则回退为 post-YYYYMMDD-HHmm（交互环境下可手动输入）。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.resolve(__dirname, '../src/content/blog');

/** 解析命令行参数 */
function parseArgs(argv) {
	const args = argv.slice(2);
	const result = { title: null, slug: null, desc: null, hero: null };
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '--slug') result.slug = args[++i];
		else if (a === '--desc') result.desc = args[++i];
		else if (a === '--hero') result.hero = args[++i];
		else if (!a.startsWith('-')) result.title = result.title ?? a;
	}
	return result;
}

/** 统一 slug 格式：小写、连字符连接 */
function slugify(s) {
	return s
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');
}

/** 尝试用 pinyin-pro 把中文转拼音 slug；未安装返回 null */
async function pinyinSlug(text) {
	try {
		const { pinyin } = await import('pinyin-pro');
		const py = pinyin(text, { toneType: 'none', type: 'array', nonZh: 'consecutive' });
		return slugify(py.join('-'));
	} catch {
		return null;
	}
}

/** 生成日期 slug（兜底） */
function dateSlug(now = new Date()) {
	const p = (n) => String(n).padStart(2, '0');
	return `post-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
}

/** 文件名已存在时追加 -2/-3 序号 */
function uniqueFile(basePath, ext) {
	let file = `${basePath}${ext}`;
	let n = 2;
	while (existsSync(file)) {
		file = `${basePath}-${n}${ext}`;
		n++;
	}
	return file;
}

async function main() {
	const { title, slug: slugArg, desc: descArg, hero: heroArg } = parseArgs(process.argv);
	if (!title) {
		console.error('用法: npm run new:post "文章标题" [--slug xxx] [--desc "简介"] [--hero "/uploads/xx.jpg"]');
		process.exit(1);
	}

	// 1. 确定 slug
	const isCJK = /[\u4e00-\u9fff]/.test(title);
	let slug = slugArg;
	if (!slug) {
		if (!isCJK) {
			slug = slugify(title); // 纯 ASCII 标题直接转
		} else {
			slug = (await pinyinSlug(title)) || null; // 中文标题优先拼音
			if (!slug) {
				// 未安装拼音库：交互询问；非 TTY 环境用日期兜底
				let fallback = dateSlug();
				if (process.stdin.isTTY) {
					const rl = createInterface({ input: stdin, output: stdout });
					try {
						const input = await ask(rl, `无法自动转拼音，请输入 slug（回车使用 ${fallback}）: `, fallback);
						fallback = input;
					} finally {
						rl.close();
					}
				}
				slug = fallback;
			}
		}
	}
	slug = slugify(slug);

	// 2. 收集其余字段（缺省时交互询问；非 TTY 直接留空）
	const today = new Date().toISOString().slice(0, 10);
	let desc = descArg;
	let hero = heroArg;
	if ((desc === undefined || hero === undefined) && process.stdin.isTTY) {
		const rl = createInterface({ input: stdin, output: stdout });
		try {
			if (desc === undefined) {
				desc = await ask(rl, '简介（回车留空）: ', '');
			}
			if (hero === undefined) {
				hero = await ask(rl, '封面图路径，如 /uploads/xxx.jpg（回车留空）: ', '');
			}
		} finally {
			rl.close();
		}
	}
	desc ??= '';
	hero ??= '';

	// 3. 生成 frontmatter
	const frontmatter = [
		'---',
		`title: ${JSON.stringify(title)}`,
		`description: ${JSON.stringify(desc)}`,
		`pubDate: "${today}"`,
	];
	if (hero) frontmatter.push(`heroImage: ${JSON.stringify(hero)}`);
	frontmatter.push('---');
	const body = ['', `# ${title}`, '', '在这里写正文…', ''];
	const content = frontmatter.join('\n') + '\n' + body.join('\n');

	// 4. 写文件（重名自动加序号）
	await mkdir(BLOG_DIR, { recursive: true });
	const file = uniqueFile(path.join(BLOG_DIR, slug), '.md');
	await writeFile(file, content, 'utf8');

	const fileSlug = path.basename(file, '.md');
	console.log(`\n✅ 文章模板已创建: ${file}`);
	console.log(`   预览地址: /blog/${fileSlug}/`);
	console.log(`   本地预览: npm run dev  →  http://localhost:4321/blog/${fileSlug}/\n`);
}

/** 交互式提问 */
async function ask(rl, question, fallback) {
	const answer = (await rl.question(question)).trim();
	return answer || fallback;
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
