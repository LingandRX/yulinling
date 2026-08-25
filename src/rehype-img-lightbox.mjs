// @ts-check
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { visit } from "unist-util-visit";
import { imageSize } from "image-size";

/**
 * 把 markdown 渲染出的站内 `<img>` 包成带 `data-pswp-width/height` 的 `<a>`，
 * 让 PhotoSwipe 5 灯箱（点击预览、翻页、缩放）开箱即用。
 *
 * PhotoSwipe 要求每个灯箱项预先声明图片宽高；这里在构建时读取
 * public 目录下本地图片的真实尺寸，运行时无需再探测。非本地路径
 * 或读取失败（外链、缺失文件）则跳过，不影响原图显示。
 *
 * @param {object} options
 * @param {string} options.publicDir - public 目录的绝对路径（构建时注入）
 * @param {string} [options.base] - 站点 base（默认 "/"），非根时图片 src 已带此前缀，解析前先剥掉
 */
export default function rehypeImgLightbox({ publicDir, base = "/" }) {
	// 归一化 base 为带前后斜杠的形态，如 "/foo/"
	const baseNorm = base === "/" ? "/" : `/${base.replace(/^\/+|\/+$/g, "")}/`;
	/** @type {(src: string) => string} 去掉 src 上的 base 前缀，得到 /uploads/... 形态 */
	const stripBase = (src) =>
		baseNorm !== "/" && src.startsWith(baseNorm)
			? src.slice(baseNorm.length - 1) // 保留开头的 "/"，如 /uploads/...
			: src;

	/** @param {import('hast').Root} tree */
	return (tree) => {
		visit(tree, "element", (node, index, parent) => {
			if (node.tagName !== "img") return;
			// 已处在 <a> 内（[![alt](src)](url)）时不重复包裹
			if (parent && parent.type === "element" && parent.tagName === "a") return;

			const src = /** @type {Record<string, unknown>} */ (node.properties).src;
			if (typeof src !== "string" || !src.startsWith("/") || src.startsWith("//")) return;

			let size;
			try {
				// 以 public 目录为根解析绝对路径；先剥掉 base 前缀再定位本地文件
				const filePath = resolve(publicDir, "." + stripBase(src));
				size = imageSize(readFileSync(filePath));
			} catch {
				return; // 外链 / 缺失文件：保持原样
			}
			if (!size.width || !size.height) return;

			/** @type {Record<string, string | number>} */
			const props = {
				href: src,
				"data-pswp-width": size.width,
				"data-pswp-height": size.height,
			};
			const alt = /** @type {Record<string, unknown>} */ (node.properties).alt;
			if (typeof alt === "string" && alt) props["data-pswp-caption"] = alt;

			/** @type {import('hast').Element} */
			const anchor = {
				type: "element",
				tagName: "a",
				properties: props,
				children: [node],
			};
			if (parent && index != null) parent.children[index] = anchor;
		});
	};
}
