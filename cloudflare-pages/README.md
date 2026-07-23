# 海龟汤 Cloudflare Pages 部署目录

这个目录是从仓库内层的完整版本整理出来的，可直接作为 Cloudflare Pages 的静态站点部署。

## Cloudflare Pages 设置

- 框架预设：`None`
- 构建命令：留空
- 构建输出目录：`cloudflare-pages`
- 根目录：仓库根目录

如果使用 Direct Upload，直接上传本目录中的全部文件即可。

## 访问码页面

首页带有一个轻量访问码门槛，验证通过后会在当前浏览器中记住授权。它用于付费资料的仪式感和基础分发控制，不属于真正的 DRM；熟悉前端代码的人仍可绕过纯静态验证。

- 验证脚本：`access.js`
- 当前访问码只以 SHA-256 摘要保存在 `TOKEN_HASH` 中，仓库不保存明文
- 更换访问码时，先对大写且去除空格后的新访问码计算 SHA-256，再替换 `TOKEN_HASH`
- 修改访问码后同时升级 `STORAGE_KEY` 和 `ACCESS_MARKER`，可让已授权设备重新验证

生成新摘要示例：

```bash
node -e 'const c=require("crypto"); console.log(c.createHash("sha256").update("你的新访问码").digest("hex"))'
```

## 本地预览

在仓库根目录执行：

```bash
python3 -m http.server 8080 --directory cloudflare-pages
```

然后访问 `http://localhost:8080`。
