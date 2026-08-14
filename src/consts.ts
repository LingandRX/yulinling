// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = "雨霖铃";
export const SITE_DESCRIPTION = "雨霖铃的个人网站，记录生活与学习。";

// 站点根路径（GH Pages 子路径部署时自动带上前缀）
// BASE_URL 可能不带尾部斜杠（如 --base /yulinling），统一补上再拼接
const BASE_URL = import.meta.env.BASE_URL.replace(/\/?$/, "/");
export const withBase = (path: string): string => {
	if (!path.startsWith("/") || path.startsWith("//")) return path;
	return `${BASE_URL}${path.slice(1)}`;
};

// 文章列表分页：每页最多显示条数
export const POSTS_PER_PAGE = 50;

// 备案信息（来自 Halo 站点配置）
export const SITE_SHOW_BEIAN = true; // 备案显示开关
export const SITE_ICP = "赣ICP备2024037374号-2";
export const SITE_ICP_LINK = "https://beian.miit.gov.cn/";
export const SITE_GONGAN = "粤公网安备44030002013166号";
export const SITE_GONGAN_LINK = "https://beian.mps.gov.cn/#/query/webSearch";
