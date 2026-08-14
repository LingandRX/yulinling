// @ts-check
import { visit } from "unist-util-visit";

/**
 * 为 markdown 语法节点的站内绝对路径（图片/链接）加上 base 前缀，
 * 保证 GH Pages 子路径部署下资源不 404（base=/ 时输出不变）。
 * 注意：内联 HTML 节点不在插件链中，不会被处理（当前文章均未使用内联 HTML）。
 * @param {string} [base]
 */
export default function remarkBasePrefix(base) {
	/** @param {import('mdast').Root} tree */
	return (tree) => {
		if (!base || base === "/") return;
		visit(tree, ["image", "link"], (node) => {
			const url = /** @type {{url?: unknown}} */ (node).url;
			if (
				typeof url === "string" &&
				url.startsWith("/") &&
				!url.startsWith("//") &&
				!url.startsWith(base)
			) {
				/** @type {{url: string}} */ (node).url = base + url.replace(/^\//, "");
			}
		});
	};
}
