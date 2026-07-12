# 海龟汤 MVP

这是 WhatAmI.today 的海龟汤网页版小游戏静态 MVP。它面向朋友线下聚会：主持人用一部手机抽题、查看题面、按住查看汤底、逐条给提示，并把玩家题面视角转向其他人。

## 文件结构

```txt
turtle-soup/
├── index.html
├── about.html
├── styles.css
├── app.js
├── data.js
├── soups.js
└── README.md
```

当前版本不需要框架、构建工具、数据库、登录、API、路由库或图片素材。所有路径均为相对路径，可直接部署到 GitHub Pages、Cloudflare Pages、Netlify 或普通静态服务器。

## 运行方式

```bash
cd turtle-soup
python3 -m http.server 8080
```

打开：

```txt
http://localhost:8080
```

开发时如果浏览器缓存了旧文件，可以 hard reload，或临时保留 `?v=4` 这类查询参数确认加载的是当前 CSS/JS。

也可以直接打开 `index.html`，因为脚本不是 ES module，不依赖构建步骤。

## 产品流程

```txt
首页
→ 选择或随机一题
→ 主持人视角
→ 玩家题面视角
→ 回到主持人视角
→ 按需查看提示
→ 揭晓答案
→ 下一题
```

URL hash 只使用：

```txt
#home
#soup/{slug}
```

刷新 `#soup/{slug}` 会回到主持人视角。玩家视角和揭晓视角只保存在内存状态里，不写入 hash。无效 slug 会回首页并显示轻量提示。浏览器返回从题目回到首页。

`about.html` 是独立静态页，不需要 JavaScript，可从首页 Header 的关于入口进入，也可返回 `index.html#home`。

## 题目数据

题目统一维护在 `soups.js` 中，数据访问和校验集中在 `data.js` 中：

```js
{
  slug: "third-knock",
  title: "第三次敲门",
  icon: "🚪",
  teaser: "前两次她没有动，第三次却立刻打开了门。",
  surface: "独居女生听见第三次敲门后，立刻打开门跑了出去。",
  answer: "完整汤底……",
  category: "horror",
  difficulty: 3,
  horrorLevel: 2,
  minutes: 10,
  tags: ["独居", "声音"],
  keyPoints: [],
  hostNotes: [],
  hints: []
}
```

`surface` 和 `answer` 是全项目统一字段名。`icon` 应来自题面已经出现的信息，不能暗示汤底答案。首页使用 `teaser`，主持人页面使用完整 `surface`。每题需要 3 到 5 个内容标签，避免剧透。

启动时会进行轻量校验。错误题目不会渲染，并会在 console 中输出 warning。

## 状态和存储

`app.js` 使用一个小状态对象：

```js
const state = {
  screen: "home",
  currentSoupSlug: null,
  activeFilter: "all",
  revealedHintIndexes: [],
  seenSoupSlugs: [],
  isAnswerVisible: false
};
```

`screen` 只包含 `home`、`host`、`players`、`reveal`。

Session 去重只保存 slug 数组：

```txt
turtle-soup-seen-v2
```

如果浏览器阻止 `sessionStorage`，游戏仍会继续运行。

## 参考实现

本次审计在项目根目录中只找到 `turtle-soup`，没有找到现有 food quiz、package.json 或其他 WhatAmI.today 页面实现。因此当前版本没有复用 food quiz 的容器、按钮或卡片代码；后续接入真实项目时，应优先对齐现有页面系统。
