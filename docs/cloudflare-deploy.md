# Cloudflare Pages 部署步骤

## 推荐方式：连接 Git 仓库

1. 把当前项目推到 GitHub 或 GitLab。
2. 打开 Cloudflare Dashboard，进入 `Workers & Pages`。
3. 选择 `Create application`，创建 `Pages` 项目并连接这个仓库。
4. 构建设置填写：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `public`
5. 进入 `Settings > Variables and Secrets`，添加生产环境变量：
   - `api_key`: 你的服务端 API key
6. 保存后重新部署。

部署完成后访问 Cloudflare 分配的 `*.pages.dev` 地址。页面会自动调用 `/api/sample` 和 `/api/generate`，接口由根目录下的 `functions/` 提供。

## 本地预览 Cloudflare Functions

如果你想在本机用 Cloudflare 的运行时预览：

```bash
npx wrangler pages dev public --binding=api_key=你的APIKey
```

然后打开 Wrangler 输出的本地地址测试页面。

## 命令行部署

如果你已经登录 Wrangler，也可以用命令行部署：

```bash
npx wrangler pages deploy public
```

Cloudflare 的文档说明，带 Functions 的 Pages 项目应通过 Git 集成或 Wrangler 部署；Dashboard 的拖拽上传不支持 Functions。

## 注意事项

- 不要把 `.env` 上传到公开仓库。
- 不要把 API key 写进 `public/` 目录，`public/` 会作为静态资源公开访问。
- 页面文案不会向用户展示底层服务或模型信息。
