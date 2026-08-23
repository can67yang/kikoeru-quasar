# Kikoeru (kikoeru-quasar)

一个自托管的 DLsite 音声作品在线播放器。

基于 [Quasar v2](https://quasar.dev)（Vue 3 + Vite）与 Pinia 构建，要求 Node.js >= 20。

## 功能特性

- 音声库，支持按标签、社团、声优聚合检索
- 全屏播放器，支持歌词显示、均衡器、睡眠定时
- 收藏与播放列表
- 管理后台：库扫描、文件夹管理、用户管理、远程同步
- 音频转码、元数据编辑（含封面图片编辑器）
- 支持 PWA，可离线使用或安装到桌面

## 安装依赖
```bash
npm install
```

### 以开发模式启动（热重载、错误提示等）
```bash
npm run dev
```
开发服务器运行在 8080 端口。

### 生产构建
默认构建目标为 PWA：
```bash
npm run build
```
如需 SPA：
```bash
quasar build
```

### Docker 部署
仓库自带的 `Dockerfile` 为两阶段构建：先用 `node:24-alpine` 编译应用，再用 nginx（`nginx:mainline-alpine`）提供静态文件服务。

```bash
docker build -t kikoeru-quasar .
docker run -p 80:80 -v /path/to/storage:/storage -v /path/to/covers:/covers kikoeru-quasar
```

- 构建参数 `FRONTEND_TYPE` 可选择 `spa` 或 `pwa`（默认 `pwa`）。
- nginx 需将 `/api` 反向代理到 [kikoeru](https://github.com/umonaca/kikoeru) 后端（见 `docs/nginx`）。

### 自定义配置
参见 [quasar.config.js](quasar.config.js) 与 [Quasar 配置文档](https://quasar.dev/quasar-cli-vite/quasar-config-js)。
