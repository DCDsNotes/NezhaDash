# Nazhua

<div>
  <img src="./.github/images/nazhua-main.webp" style="max-height: 500px;" alt="Nazhua桌面版"/>
  <img src="./.github/images/nazhua-mobile.webp" style="max-height: 500px;" alt="Nazhua移动版"/>
  <img src="./.github/images/nazhua-detail-mobile.webp" style="max-height: 500px;" alt="Nazhua详情页"/>
</div>

## 📢 使用须知

**使用前，请务必阅读本文档，对您的部署会有很大帮助**

- 面向哪吒监控 v1 的前端主题（已移除 v0 支持）
- 所有字体、样式与图标均本地加载（不依赖第三方 CDN）

## 🚀 部署指南

**推荐使用Docker Compose + Cloudflare Tunnels部署Nazhua**

👉 [详细部署文档](./doc/deploy.md)

Nazhua提供了丰富的配置选项：
- 支持点阵地图显示/隐藏
- 首页风格切换等多种个性化设置

配置方式：
- **部署/嵌入**：通过 `config.js` 提供少量必要配置

## 🗺️ 节点位置配置

要在地图上显示节点位置，需在公开备注中指定`location`字段

👉 [公开备注配置文档](./doc/public-note.md)

## 📝 更新日志

👉 [功能更新记录](./doc/update.md)

## 🤝 赞助商

<table>
  <tr>
    <td align="center">
      <a href="https://www.vmiss.com" target="_blank" title="VMISS，加拿大企业，打造全球优质优化线路。提供香港、日本、韩国、美国、英国的云服务器">
        <img src="./.github/images/vmiss-logo.jpg" width="200px;" alt="VMISS"/>
      </a>
      <br />
      <strong>VMISS</strong>
    </td>
  </tr>
</table>

## 💻 开发者指南

### 环境配置

在`.env.development.local`中配置以下变量：

```bash
#### Sarasa Term SC字体设置
# VITE_DISABLE_SARASA_TERM_SC=1

#### 哪吒版本控制
# VITE_NEZHA_VERSION=v1

#### 本地开发设置
# PROXY_WS_HOST= # 本地开发时，可以代理WS服务的地址，启用后，自动转发至 {PROXY_WS_HOST}/proxy?wsPath={WS_HOST}
# API_HOST= # 本地开发时，代理的API服务地址
# WS_HOST= # 本地开发时，代理的WS服务地址
```

### 数据来源参考

| 数据类型 | V1版本 |
|---------|--------|
| 实时数据 | WS接口：`/api/v1/ws/server` |
| 监控数据 | API接口：`/api/v1/service/${id}` |
| 分组数据 | API接口：`/api/v1/server-group` |
