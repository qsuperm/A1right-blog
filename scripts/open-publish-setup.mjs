import { exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const configText = await readFile(new URL('../src/config.ts', import.meta.url), 'utf8');
const repoMatch = configText.match(/repo:\s*'([^']+)'/);
const branchMatch = configText.match(/branch:\s*'([^']+)'/);
const siteMatch = configText.match(/provisionalUrl:\s*'([^']+)'/);
const githubMatch = configText.match(/githubUrl:\s*'([^']+)'/);

const repo = repoMatch?.[1] ?? 'qsuperm/a1right-blog';
const branch = branchMatch?.[1] ?? 'master';
const siteUrl = siteMatch?.[1] ?? 'https://a1right-blog.pages.dev';
const githubUrl = githubMatch?.[1] ?? 'https://github.com/qsuperm';
const [owner, repoName] = repo.split('/');
const description = encodeURIComponent("A1right's bilingual cybersecurity blog built with Astro and Decap CMS");

const urls = [
  {
    label: 'GitHub 新建仓库',
    url: `https://github.com/new?owner=${owner}&name=${repoName}&visibility=public&description=${description}`,
  },
  {
    label: 'Cloudflare 控制台',
    url: 'https://dash.cloudflare.com/',
  },
  {
    label: 'GitHub OAuth App 新建页',
    url: 'https://github.com/settings/applications/new',
  },
  {
    label: '本地后台 /admin',
    url: 'http://localhost:4321/admin',
  },
  {
    label: 'GitHub 用户主页',
    url: githubUrl,
  },
];

function openUrl(url) {
  if (process.platform === 'win32') {
    exec(`cmd /c start "" "${url}"`);
    return;
  }

  if (process.platform === 'darwin') {
    exec(`open "${url}"`);
    return;
  }

  exec(`xdg-open "${url}"`);
}

console.log('已准备打开以下页面：');
for (const item of urls) {
  openUrl(item.url);
  console.log(`- ${item.label}: ${item.url}`);
}

console.log('\nCloudflare Pages 推荐构建配置：');
console.log(`- Production branch: ${branch}`);
console.log('- Build command: pnpm build');
console.log('- Output directory: dist');
console.log('- Framework preset: Astro');

console.log('\nGitHub OAuth App 推荐填写：');
console.log(`- Homepage URL: ${siteUrl}`);
console.log(`- Authorization callback URL: ${siteUrl}/api/callback`);
