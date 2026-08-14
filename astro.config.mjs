// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";
import remarkBasePrefix from "./src/remark-base-prefix.mjs";

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

// https://astro.build/config
export default defineConfig({
	site: "https://yulinling.site",
	integrations: [basePrefix(), mdx(), sitemap()],
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
});
