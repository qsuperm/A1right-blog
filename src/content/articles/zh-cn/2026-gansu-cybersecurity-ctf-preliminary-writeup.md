---
translationKey: 2026-gansu-cybersecurity-ctf-preliminary-writeup
locale: zh-cn
routeSlug: 2026-gansu-cybersecurity-ctf-preliminary-writeup
title: 2026第五届甘肃省大学生网络安全竞赛：信息安全实践能力赛初赛部分 WP
excerpt: 汇总 2026 第五届甘肃省大学生网络安全竞赛信息安全实践能力赛初赛部分题目，覆盖流量分析、MISC、Crypto 与 Web 解题过程。
author: A1right
seoTitle: 2026甘肃省大学生网络安全竞赛初赛部分 WP
seoDescription: 2026第五届甘肃省大学生网络安全竞赛信息安全实践能力赛初赛部分题解，记录流量分析、MISC、Crypto 与 Web 题目的解题过程。
categoryKey: ctf-writeup
category: CTF 题解
tags:
  - CTF
  - 流量分析
  - MISC
  - Crypto
  - Web
visibility: public
publishMode: now
publishedAt: 2026-11-01
updatedAt: 2026-11-01
cover: /images/uploads/2026-gansu-cybersecurity-ctf-preliminary-cover.jpg
coverAlt: 雪天街道中的动漫人物插画
contentType: original
allowRepost: allow-with-attribution
pinned: false
draft: false
---

## 题目一：

![image-20261031180507388](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-01.png)

> 【MISC】服务器被攻击了，请分析攻击流量，找到攻击者的内网攻击ip及恶意payload。flag格式为：flag1{XXX}-flag2{XXX}。
>
> 提示：共有2个flag。其中一个flag1为flag1{攻击者内网ip的MD5值(32位小写)}

![image-20261101174237003](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-02.png)

我们跟踪流大概看看，发现这应该是个sqlmap跑sql注入的流量包

![image-20261101175237094](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-03.png)

我们在tcp中能看到大量Zm开头，这很明显是flag的base64编码（典型 Base64（`ZmxhZ3s` = `flag{`））

![image-20261101175323899](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-04.png)

得到第一个flag也就是flag2

现在需要去找攻击者的内网地址md5值

不难看出![image-20261101181824498](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-05.png)

| 角色                  | IP              | MD5（小写）                      |
| --------------------- | --------------- | -------------------------------- |
| 内网 IP（攻击者主机） | 192.168.17.8    | dd73a692d474f6b3f4d668ff6cd37f51 |
| 外网 IP（被攻击目标） | 111.119.241.115 | daec2405559107330276d13b3ecdbed4 |

![image-20261101181809897](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-06.png)

所以最后得到完整flag

## 题目四：

![image-20261031182058630](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-07.png)

> 【流量分析】数据包中想要传达什么呢？分析流量数据找到flag。
>
> flag格式为：flag{XXX}。

![image-20261031180942709](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-08.png)

附件是个流量包,打开

![image-20261031181016823](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-09.png)

发现大多数的TCP包，于是去看看http

![image-20261031181149019](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-10.png)

可以发现还是有很多文件的，我们菜单 **文件 → 导出对象 → HTTP…**（File → Export Objects → HTTP…）把文件导出

![image-20261031182509653](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-11.png)

![image-20261031181226563](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-12.png)

再最后的流量包里面发现摩斯密码 .... . .-.. .-.. ----- ..-. ---

![image-20261031181333945](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-13.png)

解密之后得到HELL0FO

这个是压缩包的密码

![image-20261031182543102](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-14.png)

拿到佛曰密文

![image-20261031182628768](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-15.png)

![image-20261031182612016](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-16.png)

解密之后得到flag

## 题目五：

![image-20261101191135870](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-17.png)

> 【Crypto】53 4F 53 41 4C 49 54 59 2D 43 54 46 2D 43 48 41 4C 4C 45 4E 47 45 2D 32 30 32 35请解密。flag格式为：flag{XXX}。
>

![image-20261031173619283](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-18.png)

下载附件解压后，得到一个html文件

加密信息明显是16进制，我们把内容从16进制转换成字符

![image-20261031173910740](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-19.png)

得到SOSALITY-CTF-CHALLENGE-2025提交

![image-20261031173931059](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-20.png)

关键标识是CTF

![image-20261031173946192](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-21.png)

我们利用凯撒密码向后平移3位

![image-20261031174013468](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-22.png)

![image-20261031174049913](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-23.png)

栅栏密码分两栏

![image-20261031174116337](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-24.png)

分为2栏时，解密结果为:VORLVWDB

![image-20261031174128282](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-25.png)

元音向后移一位

VRLVWDB

![image-20261031174227327](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-26.png)

得到flag

flag{okmnjiuhbbhuijnmko}

## 题目六：

![image-20261031183058806](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-27.png)

> 【MISC】题目：Silent Whispers in ICMP
>
> 我们截获了一段异常的网络流量，怀疑攻击者使用ICMP协议进行隐蔽通信。请分析数据包并还原被隐藏的flag。flag格式为：CTF{XXX}

![image-20261101191422215](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-28.png)

- 把 26 个 Echo request 的**载荷长度**直接当 ASCII 码：

```
67 84 70 123 49 99 109 112 95 49 115 95 110 48 116 95
106 117 115 55 95 112 49 110 103 125
```

解码：

```
CTF{1cmp_1s_n0t_jus7_p1ng}
```

![image-20261101191544052](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-29.png)

## 题目七：

![image-20261031190136490](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-30.png)

> 【Crypto】解密图片得到的 flag 。flag格式为：flag{XXX}。
>
> 【数据包下载】

![image-20261031174321975](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-31.png)

![image-20261031174337853](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-32.png)

发现是宽高有问题，直接修复宽高

![image-20261031174448177](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-33.png)

![image-20261031174534803](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-34.png)

得到密码{N666}

![image-20261031174656981](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-35.png)

解压之后是对二维码的base64加密，解密之后得到二维码

![image-20261031174936339](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-36.png)

扫描二维码得到flag

![image-20261031175025197](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-37.png)

扫描二维码得到flag

## 题目八：

![image-20261031202320068](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-38.png)

> 【MISC】某个未知的攻击者在深夜对一台服务器进行了尝试连接，管理员怀疑攻击者通过网络通道传递了一些隐藏信息。你获得了当晚的网络流量（.zip 文件），请分析是否有可疑信息传出，并找出其中隐藏的 flag。
>
> flag格式为：flag{XXX}。



![image-20261031202623173](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-39.png)

![image-20261031202645799](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-40.png)

TCP SYN 包最后有十六进制

1. 

   ```
   666c6167 7b776575 725f7a6f 70637a7d
   ```

2. Hex 解码：

   ```
   flag{weur_zopcz}
   ```

![image-20261031202853434](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-41.png)

得到flag

## 题目十：

![image-20261031203009887](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-42.png)

> 【流量分析】某次红队行动中，安全团队截获了一段异常网络流量数据包，其中包含多种类型的数据包。攻击者似乎利用某种方式将先要传输的语句进行分段传输并且将数据进行加密，但流量本身被精心混淆。请分析数据包，找到隐藏的Flag。
>

![image-20261031203500620](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-43.png)



这里有一个假flag

FLAG{xLxKTpaOAzI93jzFghxdJmqHJ07MmibYDTui2HEI9tp7394blngYRKI1ytZb0tPQ}

44 个 ICMP echo request 的整帧长度

  → 78,117,102,89,52,111,...

  → chr() 拼串

  → "NufY4oKNJAv8QEewVRJGj/Rtw4rt731Qqt1Yptt3b10="

`From Base64` 后面加一个 **To Hex**

![image-20261031204650693](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-44.png)

```
  → 36e7d8e2828d240bfc4047b05512468ff46dc38aedef7d50aadd58a6db776f5d  (32 字节 = AES-256 key)
```



![image-20261031205047250](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-45.png)

得到flag

## 题目十一：

![image-20261101184414137](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-46.png)

> 【MISC】题目：日志分析
>
> 网站服务被攻击了，我将服务器日志下载下来了但是好像不能直接查看，你能想办法打开文件并找一下攻击者的攻击方式是什么吗？
>
> flag格式为：flag{XXX}。
>
> 提示：flag{攻击者的攻击方式MD5值32位大写}

 ![image-20261101184634298](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-47.png)



附件文件名是base64

![image-20261101184653552](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-48.png)

解密之后得到

@eval($_REQUEST['6e70d46ba4bf7b326eead9c79f1b57e2'])

![image-20261101184733192](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-49.png)

binwalk分离之后，得到一个加密的压缩包

尝试发现6e70d46ba4bf7b326eead9c79f1b57e2是密码

![image-20261101184817695](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-50.png)

拿到日志

统计：

- 攻击者 `192.168.1.10` 占 **27997 行**
  - **23362 行**是 `"A cat is fine too. Desudesudesu~..."` 的超长请求行（404）
  - **4564 行**是 `"GET  HTTP/1.0"` 空请求行
- 同一攻击者 `192.168.1.9` 还上传/下载了 `/uploads/DDOS.py`、`/uploads/ddos-p3.py`
- 时间线：上传脚本后立刻出现上面这波 HTTP 洪水

结论：攻击方式 = **DDOS**（HTTP 洪水）。

![image-20261101185019408](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-51.png)

很明显是DDOS

![image-20261101185046126](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-52.png)

得到flag

## 题目十二：

![image-20261101191732274](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-53.png)

【Crypto】我们截获了一个使用Python加密的密文文件。已知加密方式为简单的XOR，但密钥被隐藏了。请解密并获取Flag。

Hint：密钥长度 ≤ 6。flag格式为：CTF{XXX}

![image-20261031224236350](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-54.png)

拿脚本爆破，直接xor解密，得到flag

## 题目十三：

![image-20261031190709190](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-55.png)

> 【MISC】你发现了一个神秘的 ZIP 文件，其中包含一个损坏的二维码，可能与一个Java 漏洞相关。修复二维码后，你会发现一串奇怪的字符，或许它们隐藏着真正的秘密。你能找到最终的 Flag 吗？
>
> flag格式为：flag{XXX}。
>
> 提示：解码后的数据被加密，AES-256-CBC 可能是解密的关键。

![image-20261031190804412](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-56.png)

![image-20261031191448714](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-57.png)

我们搜索Java漏洞编号之后，发现CVE-2021-44228是密码

![image-20261031191601908](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-58.png)

扫描二维码得到doGIde+UiUIeVERp4z664Lnmiu7vD5FPRS4QnGamRgA=%%%

![image-20261031191657873](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-59.png)

我们把它先base64解码之后，得到原文，然后再转换成16进制

我们去 CyberChef 

1. Input 直接贴 `doGIde+UiUIeVERp4z664Lnmiu7vD5FPRS4QnGamRgA=`

2. 先加一个base64

3. 再加一个 Operation：

   ```
   AES Decrypt
   ```

   - Key：`6254dc332644b00acecc0b5e850672f136444e06d1b70730dffff5484420383d`，选 **Hex**
   - IV：`6254dc332644b00acecc0b5e850672f1`，选 **Hex**
   - Mode：`CBC/NoPadding`

4. 输出 `flag{qr_rep@ir_2025}`

![image-20261031200355892](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-60.png)

得到flag

## 题目十四：

![image-20261101190148433](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-61.png)

> 【MISC】攻击者入侵了一台服务器并上传了一个重要文件。你能在流量中找到并解密该文件吗？flag格式为：flag{XXX}。
>
> 【数据包下载】

![image-20261031183143362](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-62.png)

![image-20261031183237712](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-63.png)

发现只有一个ICMP

'U2VjcmV0UGFzc3dvcmQh'

![image-20261031183326352](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-64.png)

base64解密之后得到SecretPassword!

本题 6987 个包大部分是两件事：675 MB 视频流（206 分片，占 5000+ 包）和一堆 TLS（微信/浏览器，解不开）。这些看一眼就丢。

唯一一条明文 HTTP，`POST /?page=upload`，`multipart/form-data`，body 只有 374 字节。

流量里能承载文件的东西只有那么几种——HTTP 下载/上传、FTP、SMB、邮件附件。

我们想到题目和文件上传有关，直接搜索tcp contains "upload"

![image-20261031185132300](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-65.png)

![image-20261031185150821](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-66.png)

跟踪tcp流会发现，post请求中上传了一个zip

![image-20261031185702005](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-67.png)

转换成原始数据之后，保存下来，放到随波逐流里面用binwalk分离出压缩包

![image-20261031185753309](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-68.png)

![image-20261031185922072](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-69.png)

得到flag

## 题目十五：

![image-20261101182426888](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-70.png)

> 【MISC】题目名称：神秘的对话
>
> 题目描述：我们在一次例行监控中捕获了一段可疑的网络流量。初步分析显示，这段流量中可能隐藏着一个秘密的信息。请你从这段流量中找出隐藏的FLAG。
>
> 不过，这个对话并不简单。传输的数据经过了某种混淆或转换，只有真正的分析高手才能找出其中的玄机。FLAG 就藏在这段通信的某个角落中，也许是某个字段，也许是某种模式。你能找出它吗？flag格式为：flag{XXX}。
>
> 提示：文件格式：.zip
>
> 关键词：HTTP、编码、Base64

![image-20261101182529858](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-71.png)

 我们进去之后直接看数据最长的包

![image-20261101182912194](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-72.png)

![image-20261101183330858](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-73.png)

`/seeyon/rest/orgMember/pass/<name>` 是致远 OA 的已知前台 RCE 入口（`pass` 接口反序列化 / 文件上传）

这里攻击者把恶意 zip 直接放在 body 里上传，服务端返回 `HTTP/1.1 401`
`{"code":"1010","success":false,"message":"被迫下线，原因：与服务器失去连接"}` —— 利用失败，
但**上传的压缩包完整留在了流量里**。

我们直接把http的文件导出，然后用binwalk分离

![image-20261101183639691](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-74.png)

成功得到我们需要的压缩包

这类"上传一个加密包"的题，密码基本都在同一个请求里。逐个试

![image-20261101184110353](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-75.png)

经过尝试得到，密码是Liyoubo

![image-20261101184130722](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-76.png)



base64解码得到flag

![image-20261101184149504](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-77.png)

## 题目十七：

![image-20261031190222237](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-78.png)

> 【WEB】某电厂信息人员小王，在登录公司数字化管理系统时，忘记了登录密码，只记得用户名是【HNGS】，而且小王担心自己忘记密码，经常习惯把密码放在网页里。请帮助他成功登陆系统。
>
> flag格式为：flag{XXX}。

这个忘记截图记录了

主要就是密码的爆破，很简单就不多说了

账号是HNGS,密码在网页源码里面有，爆破就出来flag了

1. 打开任务页面，查看源码（Ctrl+U），页面里给了一份**密码字典**：

   ```
   password 00000000 qwerty abc123 letmein monkey iloveyou sunshine 111111 welcome trustno1
   admin football baseball computer access woaini1314 1qaz2wsx superman gangshuamin 123456789
   87654321 1q2w3e4r mmbvxcz 19900101 Password zhangshan1990 admin123 qwerty123 iloveyou520
   asdfghjkl zxcvbnm 1qaz@wsx 20202020 1314520 root user guest test system aaaaaa abcabc
   abc123 abc123456 123!@# abc@123 hello123 admin456
   ```

2. 把字典导入 BurpSuite 对登录接口做**密码爆破**，命中正确口令后页面返回：

   ```
   【恭喜你，获得通关KEY】
   flag{9049bddf4cdf7531d4ae78f28ba6b1f3}
   ```

## 题目二十：

![image-20261031210423172](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-79.png)

> 【签到题】flag格式为：flag{XXX}。
>

![image-20261031210537559](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-80.png)

![image-20261031210555837](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-81.png)

![image-20261031210652814](/images/uploads/2026-gansu-cybersecurity-ctf-preliminary-82.png)

先base64然后base32然后hex得到flag

