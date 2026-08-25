// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";
import remarkBasePrefix from "./src/remark-base-prefix.mjs";
import rehypeImgLightbox from "./src/rehype-img-lightbox.mjs";

// CLI 的 --base 不会注入 config 上下文（此处 import.meta.env.BASE_URL 恒为 "/"），
// 必须在 config:setup 阶段读取已解析的 config.base 再注入 markdown 插件
function basePrefix() {
	return /** @type {import('astro').AstroIntegration} */ ({
		name: "base-prefix",
		hooks: {
			"astro:config:setup": ({ config, updateConfig }) => {
				updateConfig({
					markdown: {
						remarkPlugins: [[remarkBasePrefix, config.base]],
					},
				});
			},
		},
	});
}

// 构建时为站内图片包一层带 data-pswp-* 尺寸标注的 <a>，供 PhotoSwipe 灯箱使用
function imageLightbox() {
	return /** @type {import('astro').AstroIntegration} */ ({
		name: "image-lightbox",
		hooks: {
			"astro:config:setup": ({ config, updateConfig }) => {
				updateConfig({
					markdown: {
						rehypePlugins: [
							[rehypeImgLightbox, { publicDir: fileURLToPath(config.publicDir), base: config.base }],
						],
					},
				});
			},
		},
	});
}

// https://astro.build/config
export default defineConfig({
	site: "https://yulinling.site",
	integrations: [basePrefix(), imageLightbox(), mdx(), sitemap()],
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
});
