# 笔记与随想

基于 [Astro 官方 Blog Starter](https://github.com/withastro/astro/tree/main/examples/blog) 的中文个人博客。官方模板的原始设计参考 [Bear Blog](https://github.com/HermanMartinus/bearblog/)；本项目保留 Astro 内容集合、文章布局、RSS 和 Sitemap 工作方式。

线上地址：https://xlqs23.github.io/blog/ 。个人主页：https://xlqs23.github.io/ 。

日常编辑、图片上传和发布使用本地管理台，无需手动执行命令。

## 内容约定

- 文章：`src/content/blog/*.md`
- 站点资料：`src/data/site.json`，字段 `title`、`description`、`author`、`homeUrl`
- 图片：`public/images/`，正文或 `heroImage` 可使用 `/images/文件名`，构建时补上 `/blog` 前缀。
- 文章字段：`title`、`description`、`pubDate`（YYYY-MM-DD）、`updatedDate`（可选）、`tags`（数组）、`draft`（布尔值）、`heroImage`（可选字符串）。
- 草稿仅在本地开发预览中显示，不生成到线上构建、RSS 或 Sitemap。

## 开发与部署

需要 Node.js 24。`npm ci` 安装锁定依赖；`npm run build` 生成静态文件。开发服务器按仓库 AGENTS.md 使用 `npm run dev -- --background`；默认地址 `http://127.0.0.1:4321/blog/`。

GitHub 仓库命名为 `blog`，Pages 发布源设置为 GitHub Actions。推送 `main` 后自动构建与部署。`SITE_URL` 可覆盖站点域名，路径前缀为 `/blog`。
