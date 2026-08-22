# kikoeru-quasar 闭源版本源码复现说明

本仓库在 [Number178/kikoeru-quasar](https://github.com/Number178/kikoeru-quasar)
最后一个开源提交 `f3ab74b`（2024-01-11, alpha 分支）的基础上，**逆向重建了作者此后
未再开源的最新编译产物**（即 kikoeru-go `web/public/` 内嵌的 `app.34bfd94e.js` 等文件）
所对应的全部源码改动。

## 复现方式

1. 以 `f3ab74b` 为基线；
2. 美化（beautify）目标编译产物 `app.34bfd94e.js`（webpack 4 产物，无 sourcemap）；
3. 通过三条指纹锁定差异范围并逐一还原：
   - 中文字符串集合差集（初版 250 条 → 终版 0 条）；
   - API 端点差集（syncer / edit / lrc / transcode / uncensor 等 12 个新端点）；
   - Vue 组件名差集（10 个新组件/页面）；
4. render 函数还原为 Quasar 模板，混淆变量按语义重命名，中文文案（含原文错别字
   如 `iterms-center`、`color: "yello"`）原样保留。

## 重建的未开源功能

| 功能 | 涉及文件 |
| --- | --- |
| 远程同步（/admin/syncer，任务列表/停止/重启） | pages/Dashboard/Syncer.vue, components/SyncTrackListEditor.vue, SyncTaskListStatus.vue |
| 作品元数据编辑 / 封面裁剪编辑 / 关联作品 | components/EditMeta.vue, ImageEditor.vue, RelatedWorks.vue |
| GBK 乱码修复、删除作品（保留/删除文件） | components/WorkDetails.vue |
| 歌词选择/保存/查询（query-lrc/fetch-lrc/save-lrc） | components/LyricSelection.vue |
| 音频转码（AAC 128/320、预转码、扩展名过滤） | AudioElement.vue, TranscodingStatus.vue, AudioPlayer.vue, Advanced.vue, store |
| 定制版 lrc-file-parser（setLyricObject/updateTime，支持 AI 翻译歌词 timeEnd/deleted 行） | utils/lrc-file-parser.js（vendored） |
| 睡眠倒计时（新 UI，与旧时间点式并存） | components/CountDownSleepMode.vue |
| 深色/浅色/跟随系统三态模式 | store、MainLayout.vue |
| 作品列表分页模式（瀑布流可切换） | components/Pagination.vue, Works.vue |
| 高级聚合搜索重做（番号/声优/标签/社团候选、CODE 条件） | Works.vue, utils.js |
| AI 翻译任务批量删除/重试 | AILyricCenter.vue, utils.js |
| About 页（iOS 17.3 后台连播 bug 说明等） | pages/About.vue |
| 标签反和谐 / 刷新标签名 / 文件监听 / 重点文件展示配置 | Dashboard/Advanced.vue |
| 其它：音量增益（可视化增益节点）、iOS 17.3 检测告警、WorkTree 返回上层/重要目录定位 | AudioPlayer.vue, AudioElement.vue, WorkTree.vue, Work.vue |

## 构建方法

目标产物特征：legacy（非 modern）、无 sourcemap、PWA 模式、Workbox v4.3.1。
因此 `quasar.conf.js` 中 build 配置为 `modern: false; sourceMap: false`（基线原为
true，会额外产出 `.map` 与 modern 包，与目标产物形态不符）。

```bash
# 需要 Node 14（node-sass@4 不支持 Node 16+）
npm ci --legacy-peer-deps   # lockfile 中的 taobao 源已替换为 npmmirror
npx quasar build -m pwa     # 产物在 dist/pwa
```

## 验证结果

对 `dist/pwa/js/app.*.js` 与 kikoeru-go `web/public/js/app.34bfd94e.js` 比对：

- 中文字符串集合差集：**0**（目标全部字符串均出现在重建产物中）
- API 端点差集：**0**（`/api/syncer*`、`/api/edit/*`、`/api/media/*-lrc`、
  `/api/media/(pre-)?transcode`、`/api/work/fix/gbk`、`/api/uncensor/tags`、
  `/api/config/admin/refresh-tags` 等全覆盖）
- Vue 组件名差集：**0**

注：webpack contenthash 不可能与原作者的构建逐字节一致（构建环境、模块 id 分配
不同），故以功能面（字符串/接口/组件）一致性为验收标准。

## 已知保留的目标原版 bug / 瑕疵（忠实还原，未修正）

- Works.vue `lyricOption` watch 使用 `"no_lyric"` 而选项值为 `"lyric_no"`；
- SyncTrackListEditor 中 `class="row iterms-center"`（拼写错误）与冗余 `primary` class；
- SyncTaskListStatus 的 `color: "yello"`（拼写错误）；
- CountDownSleepMode 引用了未在 data 中声明的 `this.time`。
