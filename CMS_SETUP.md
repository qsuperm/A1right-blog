# Decap CMS 后台发文说明

这个项目现在已经接入了：

- `/admin` 后台发文页面
- GitHub OAuth 登录
- Cloudflare Pages Functions OAuth 回调
- 图片上传到 `public/images/uploads`
- 本地 `local_backend` 写作模式
- 中文化字段、中文筛选和分组
- 可选 `SEO 标题` / `SEO 描述`

---

## 1. 本地使用

启动本地联调环境：

```bash
pnpm dev:cms
```

然后打开：

- `http://localhost:4321/admin`

本地模式下：

- Astro 开发站跑在 `4321`
- Decap 本地代理跑在 `8081`
- 你可以直接在后台新建 / 编辑文章
- 图片会保存到 `public/images/uploads`

---

## 2. 当前仓库配置

我已经按你真实 GitHub 用户名配置成：

- GitHub 用户名：`qsuperm`
- 默认仓库：`qsuperm/a1right-blog`
- 默认分支：`master`

配置位置：

- `D:\ctftools\blog\src\config.ts`

如果你最终创建出来的仓库名不是 `a1right-blog`，只需要改这里：

```ts
export const CMS = {
  repo: 'qsuperm/你的真实仓库名',
  branch: 'master',
  locale: 'zh_Hans',
  mediaFolder: 'public/images/uploads',
  publicFolder: '/images/uploads',
  authEndpoint: '/api/auth',
} as const;
```

如果你的默认分支是 `main`，把这里改成：

```ts
branch: 'main'
```

---

## 3. GitHub OAuth App 怎么配

去 GitHub：

- Settings
- Developer settings
- OAuth Apps
- New OAuth App

推荐这样填：

- **Application name**：`A1right Blog CMS`
- **Homepage URL**：`https://a1right-blog.pages.dev`
- **Authorization callback URL**：`https://a1right-blog.pages.dev/api/callback`

创建后你会拿到：

- `Client ID`
- `Client Secret`

> 回调地址必须是 `/api/callback`，因为当前登录流程在 `functions/api/callback.js` 里完成 code 换 token。

---

## 4. Cloudflare Pages 里要加什么

Pages 项目中添加环境变量：

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

位置：

- Cloudflare Pages
- 你的项目
- Settings
- Environment variables

加完后重新部署。

---

## 5. Cloudflare Pages 推荐创建方式

建议在控制台中这样点：

- Workers & Pages
- Create application
- Pages
- Connect to Git

构建参数：

- Framework preset：`Astro`
- Production branch：`master`
- Build command：`pnpm build`
- Build output directory：`dist`
- Root directory：留空

---

## 6. 图片上传规则

后台上传图片后，文件会进入：

- `D:\ctftools\blog\public\images\uploads\`

文章里引用的路径会长这样：

```text
/images/uploads/xxx.png
```

这和当前站点的文章封面写法兼容。

---

## 7. 后台现在能编辑哪些内容

当前已经配好两个集合：

- 中文文章：`src/content/articles/zh-cn`
- 英文文章：`src/content/articles/en`

每篇文章可编辑字段包括：

- `translationKey`
- `routeSlug`
- `title`
- `excerpt`
- `author`
- `seoTitle`
- `seoDescription`
- `categoryKey`
- `category`
- `tags`
- `publishedAt`
- `updatedAt`
- `cover`
- `coverAlt`
- `pinned`
- `draft`
- `body`

---

## 8. 中文化增强做了什么

目前后台已经补了这些增强：

- 整体界面使用中文 locale：`zh_Hans`
- 中文 / 英文文章都统一用中文字段说明
- 文章列表支持中文筛选：
  - 草稿
  - 置顶
  - Web 安全
  - CTF 题解
  - Agent 渗透
- 支持列表分组：
  - 按分类分组
  - 按年份分组
- 保存提交信息改成中文
- 登录页和后台字体更适合中文阅读
- 文件名默认直接跟随 `routeSlug`
- 列表摘要显示：标题 / 日期 / 分类
- 发文页新增可选 SEO 字段

---

## 9. 一个重要约定

如果一篇文章有中英文两个版本：

- `translationKey` 必须一致

例如：

- 中文：`translationKey: sql-login-bypass`
- 英文：`translationKey: sql-login-bypass`

这样文章详情页里的语言切换才会正常对应。

---

## 10. 如果 GitHub 登录失败，优先检查

1. `src/config.ts` 里的 `repo` 是否写对
2. `branch` 是否和真实默认分支一致
3. Cloudflare Pages 是否已经配置：
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
4. OAuth App 的回调地址是否是：
   - `https://a1right-blog.pages.dev/api/callback`
5. 是否已经重新部署

---

## 11. 当前接入文件

主要文件：

- `D:\ctftools\blog\src\pages\admin\index.astro`
- `D:\ctftools\blog\src\pages\admin\config.yml.ts`
- `D:\ctftools\blog\public\admin\custom.css`
- `D:\ctftools\blog\functions\api\auth.js`
- `D:\ctftools\blog\functions\api\callback.js`
- `D:\ctftools\blog\functions\api\_utils.js`
- `D:\ctftools\blog\src\config.ts`
- `D:\ctftools\blog\package.json`
- `D:\ctftools\blog\scripts\open-publish-setup.mjs`

---

## 12. 常用命令

```bash
pnpm dev:cms
pnpm setup:publish
pnpm check
pnpm build
```
