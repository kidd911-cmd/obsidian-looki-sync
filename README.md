# Looki Sync（Obsidian 社区插件）

把 [Looki](https://web.looki.tech) 的**日常数据（Moments）**与**即时提示（For You）**同步进 Obsidian，合并为按日期的「每日记忆」笔记。参考 [Flomo Sync](https://pkmer.cn/show/1780392511104000) 类插件的设计思路。

设计参照了 Flomo Sync 等成熟插件的形态：**设置页（API / 目标文件夹 / 同步开关 / 自动同步）+ 命令面板「Sync Now」+ 功能栏图标 + 增量同步历史**。

## 三个核心功能（对应需求）

1. **提供 API 配置**：设置页填 Looki API Key（`lk-xxxx`）与 Base URL（默认 `https://open.looki.tech/api/v1`），并提供「测试连接」按钮。
2. **同步到 Obsidian 指定位置**：设置页可指定「目标文件夹」（默认 `Looki/每日记忆`），所有每日记忆笔记写入该目录。
3. **选择是否同步视频 / 图片**：独立开关「同步图片」「同步视频」。开启后媒体下载到「媒体文件夹」并用 `![[...]]` 嵌入；默认图片开、视频关。

## 同步内容

- **文字**：moment / for-you 的标题、描述、地点、时间等 metadata，逐条写进笔记。
  - 地点是 JSON 字符串（省/市/区/街道），自动解析成可读地址。
  - For You 正文里 Looki 内嵌的 `![...](https://devo-user-file...mp4.001.jpg?x-looki-token=)` **视频抽帧外链**（签名 1 小时过期）会被自动剥离，只保留文字。
- **图片 / 视频**：仅当用户在设置中开启对应开关才下载并嵌入，否则不同步媒体（最省空间）。
- **合并**：同一天数据写进同一篇 `每日记忆/YYYY-MM-DD.md`，笔记内分两节：
  - `## 今日片段 (Moments)` —— 当天日常 moment
  - `## 即时提示 (For You)` —— 当天 Looki 主动生成的 AI 内容
- **幂等/自愈**：每篇笔记每次都按当前 API 数据整篇重写，不会重复堆积；Looki 端增删会反映在下一次同步。

## 设置项

| 设置 | 默认 | 说明 |
|---|---|---|
| API Key | 空 | Looki 开放 API 密钥 `lk-xxxx` |
| API Base URL | `https://open.looki.tech/api/v1` | 一般无需改 |
| 目标文件夹 | `Looki/每日记忆` | 每日记忆笔记目录 |
| 媒体文件夹 | `Looki/media` | 图片/视频保存目录 |
| 同步图片 | 开 | 下载 IMAGE 并嵌入 |
| 同步视频 | 关 | 下载 VIDEO 并嵌入（体积大） |
| 回填天数 | 1 | 每次额外补最近 N 天（兼顾延迟生成内容） |
| 自动同步间隔（分钟） | 30 | 0 = 关闭 |
| 启动时自动同步 | 关 | Obsidian 打开即同步一次 |

## 命令

- **Looki Sync: Sync now** —— 增量同步（命令面板 / 左侧功能栏 🔄 图标）
- **Looki Sync: Full resync (reset history)** —— 清空同步记录并重拉全量

## 安装（开发 / 试用）

先把本仓库克隆或下载到本地，构建出 `main.js`：

```bash
npm install
npm run build      # 生成 main.js
```

然后把以下三个文件放进你的 vault 插件目录并启用：

```
<你的vault>/.obsidian/plugins/looki-sync/
├── manifest.json
├── main.js
└── styles.css
```

1. Obsidian 设置 → 第三方插件 → 关闭「安全模式」
2. 在第三方插件列表里启用 **Looki Sync**
3. 打开插件设置，填入 API Key，点「测试连接」确认可用，再点「同步 Now」

> 想实时调试：先 `npm run dev`（esbuild watch 模式），Obsidian 里对插件点「重新加载」即可热更。

## 上架到 Obsidian 社区市场

Obsidian 社区插件通过 [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) 仓库的 PR 审核发布。正式上架前需准备：

1. **公开 GitHub 仓库**，根目录包含：`manifest.json`、`main.js`、`styles.css`、`README.md`、源码（`src/`）、构建配置。
2. **发布一个 Release**（如 `v1.0.0`），把 `main.js` / `manifest.json` / `styles.css` 作为 release asset 或直接在仓库根目录（社区审核读取仓库根目录文件）。
3. **提交 PR** 到 `obsidianmd/obsidian-releases` 的 `.github` 工作流程，按官方模板添加你的插件信息（id、repo、分支/tag）。
4. 等待官方人工审核（通常数天到数周）。审核通过即出现在社区插件市场搜索中。

### 上架前自查清单

- [ ] `manifest.json` 的 `id` 唯一、`author` / `authorUrl` 填你自己的信息
- [ ] `minAppVersion` 与 `versions.json` 一致
- [ ] `main.js` 由最新源码构建，未含密钥/硬编码（API Key 仅存于用户本地 `data.json`）
- [ ] `README.md` 清晰说明功能与隐私（API Key 仅存本地）
- [ ] 不读取/上传用户其他笔记内容；只用 Looki API
- [ ] 已自测：手动同步、自动同步、增量去重、媒体开关开/关

> 隐私提示：插件把 API Key 存在 vault 的 `data.json`（Obsidian 插件数据目录），不会外传。网络请求只发往 Looki API 与媒体 CDN。

## 开发

```bash
npm install
npm run dev       # watch 模式, 改源码自动重建 main.js
npm run build     # 生产构建 (tsc 类型检查 + esbuild 打包)
npm run version   # 版本号自增 (同步更新 versions.json)
```

## 许可证

MIT
