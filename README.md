# A1right 的小窝

一个以 **Astro + MDX + Pagefind + Cloudflare Pages** 为核心的双语网络安全博客。

当前已经具备：

- Firefly / 二次元感首页
- 中文 / 英文双语文章
- 分类页 / 标签页 / 搜索弹层
- 文章归档分页
- Decap CMS 后台发文
- GitHub OAuth + Cloudflare Pages Functions
- 可选 SEO 标题 / SEO 描述字段

---

## 本地开发

```bash
pnpm dev
pnpm dev:cms
pnpm check
pnpm build
pnpm preview
```

后台地址：

- `http://localhost:4321/admin`

一键打开建仓 / 上线相关页面：

```bash
pnpm setup:publish
```

---

## 当前部署目标

- 免费托管：Cloudflare Pages
- 预设线上地址：`https://a1right-blog.pages.dev`
- 生产构建命令：`pnpm build`
- 输出目录：`dist`
- 生产分支：`master`

---

## GitHub 仓库配置

当前本地已经预设远程仓库：

- `https://github.com/qsuperm/a1right-blog.git`

如果你还没创建仓库，最省事的方式是直接打开这个 GitHub 预填链接：

- [创建预填仓库](https://github.com/new?owner=qsuperm&name=a1right-blog&visibility=public&description=A1right%27s+bilingual+cybersecurity+blog+built+with+Astro+and+Decap+CMS)

建议这样创建：

- Owner：`qsuperm`
- Repository name：`a1right-blog`
- Visibility：`Public`
- **不要勾选** 初始化 `README` / `.gitignore` / License

---

## 首次推送本地代码

仓库建好后，使用：

```bash
git -C "D:\ctftools\blog" add .
git -C "D:\ctftools\blog" commit -m "init: launch A1right blog"
git -C "D:\ctftools\blog" push -u origin master
```

---

## Cloudflare Pages 推荐设置

根据 Cloudflare Pages 当前的 Git 集成流程，建议在控制台中这样创建项目：

- Workers & Pages → Create application → Pages → Connect to Git
- 选择仓库：`qsuperm/a1right-blog`
- Framework preset：`Astro`
- Production branch：`master`
- Build command：`pnpm build`
- Build output directory：`dist`
- Root directory：留空

连接后，后续每次推送到 GitHub 都会自动触发构建和部署。

---

## GitHub OAuth App

后台 GitHub 登录需要一个 OAuth App。

新建地址：

- <https://github.com/settings/applications/new>

推荐填写：

- Application name：`A1right Blog CMS`
- Homepage URL：`https://a1right-blog.pages.dev`
- Authorization callback URL：`https://a1right-blog.pages.dev/api/callback`

> 回调地址一定要带 `/api/callback`，因为当前 Cloudflare Pages Functions 的回调接口就在这个路径。

---

## Cloudflare Pages 环境变量

在 Pages 项目里添加：

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

位置：

- Cloudflare Pages → 你的项目 → Settings → Environment variables

加完后重新部署一次，再打开：

- `https://a1right-blog.pages.dev/admin`

就可以用 GitHub 登录后台发文。

---

## 内容目录

中文文章：

- `D:\ctftools\blog\src\content\articles\zh-cn`

英文文章：

- `D:\ctftools\blog\src\content\articles\en`

图片上传目录：

- `D:\ctftools\blog\public\images\uploads`

---

## 站点主配置

主要配置文件：

- `D:\ctftools\blog\src\config.ts`
- `D:\ctftools\blog\astro.config.mjs`
- `D:\ctftools\blog\src\pages\admin\config.yml.ts`
- `D:\ctftools\blog\functions\api\auth.js`
- `D:\ctftools\blog\functions\api\callback.js`

---

## 更多后台说明

详见：

- `D:\ctftools\blog\CMS_SETUP.md`
