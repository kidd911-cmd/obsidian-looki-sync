# Looki Sync — 社区插件市场提交指南 (PR 物料)

本文件用于向 Obsidian 官方社区插件市场 (`obsidianmd/obsidian-releases`) 提交 `looki-sync` 插件。
仓库已在本地 `git init` 并提交 `1.0.0` tag，但 **GitHub 仓库、Release、PR 需你本人在自己的终端/浏览器完成**（本环境无 `gh`、未登录 GitHub）。

---

## 0. 提交前自检 (必过)

- [x] `manifest.json` 含 `id` / `name` / `version` / `minAppVersion` / `author` / `description` / `isDesktopOnly`
- [x] `main.js` 已构建（非源码，已 bundle，19KB）
- [x] `styles.css` 存在
- [x] 仓库含 `README.md`，说明功能、设置项、安装方式
- [x] 不含任何密钥（已 `grep` 确认无 `lk-OVao` 泄漏）
- [x] 无 `console.log` / 调试残留（请自行再扫一遍）
- [ ] **不要把 API Key 写进任何提交文件**（本仓库已确认干净）
- [ ] `authorUrl` 与 `repo` 中的 `<your-github-username>` 替换为你的真实用户名

---

## 1. 创建 GitHub 仓库

到 https://github.com/new 新建一个 **Public** 仓库：

- Repository name: `obsidian-looki-sync`
- Description: `Sync Looki Moments & For You into Obsidian`
- 设为 **Public**
- 不要勾选 "Add a README" / ".gitignore" / "License"（本地已包含）

创建后拿到地址： `https://github.com/<your-github-username>/obsidian-looki-sync`

---

## 2. 推送本地仓库

```bash
cd /Users/jeremyjin/WorkBuddy/2026-07-12-15-42-44/obsidian-looki-sync

# 先确认本地 git 身份（当前为占位 jeremy@example.com，推送前请改为你的真实邮箱）
git config user.email "you@example.com"

# 关联远端并推送
git remote add origin https://github.com/<your-github-username>/obsidian-looki-sync.git
git branch -M main
git push -u origin main --tags
```

---

## 3. 创建 GitHub Release `1.0.0`

Obsidian 市场通过 Release 拉取插件文件，必须发布一个 tag 为 `1.0.0` 的 Release，并在其中包含：

- `manifest.json`
- `main.js`
- `styles.css`

可在 GitHub 网页 `Releases → Draft a new release`：
- Tag: `1.0.0`（已本地打 tag，推送后可选 "Choose an existing tag"）
- Release title: `1.0.0`
- 把 `manifest.json` / `main.js` / `styles.css` 三个文件拖进 "Attach binaries"
- 勾选 "Set as the latest release"
- Publish

> 也可用 `gh release create 1.0.0 manifest.json main.js styles.css --title "1.0.0" --notes "Initial release"`（需先装并登录 `gh`）。

---

## 4. 向 obsidian-releases 提 PR

1. 打开 https://github.com/obsidianmd/obsidian-releases （Fork 后改 `master` 分支，或在网页直接编辑）
2. 编辑根目录的 **`community-plugins.json`**（是一个 JSON 数组）
3. 在数组里新增下面这一条（注意替换 `<your-github-username>`）：

```json
{
  "id": "looki-sync",
  "name": "Looki Sync",
  "author": "Jeremy Jin",
  "description": "将 Looki 的日常数据与即时提示同步进 Obsidian，合并为按日期的「每日记忆」笔记。可配置目标文件夹，并选择是否同步图片/视频。",
  "repo": "https://github.com/<your-github-username>/obsidian-looki-sync"
}
```

> 该条目也已存为仓库内的 `community-plugins-entry.json`，可直接复制。

4. 提交 PR，PR 标题建议：`Add Looki Sync plugin`
5. PR 描述（可直接粘贴下方）：

---

### PR 描述模板

**Plugin name:** Looki Sync
**Repo:** https://github.com/<your-github-username>/obsidian-looki-sync

**Description (中文):** 将 Looki 的「日常数据」(Moments) 与「即时提示」(For You) 同步进 Obsidian，按日期合并为「每日记忆」笔记。支持配置目标文件夹、媒体文件夹，并可分别开关图片/视频同步。自动剥离 For You 内容中 1 小时过期的外链图片，仅保留文字。

**Description (EN):** Sync Looki "Moments" and "For You" into Obsidian as date-merged daily notes. Configurable target/media folders; independently toggle image/video sync. Strips expiring external image links from For You content, keeping text only.

**Notes:**
- Uses `requestUrl` (Electron net layer) for API calls — no CORS issues.
- API auth via `x-api-key` header.
- No external tracking / telemetry; API key stored only in local vault `data.json`.

---

## 5. 审核通过后

obsidianmd 维护者合入后，插件即出现在社区市场，用户搜索 "Looki Sync" 即可安装。

---

## 附：本地已验证

- `npm install` + `npm run build` 通过（tsc 零报错，esbuild 产出 `main.js` 19KB）
- Node 烟雾测试打通真实 API：`/me`、`/moments?on_date=`、`/moments/{id}/files`、`/for_you/items?recorded_from=YYYY-MM-DD` 均正常，`recorded_from` 仅接受 `YYYY-MM-DD`（已规避 422）
- 插件文件已安装到真实 vault：`<vault>/.obsidian/plugins/looki-sync/`（manifest/main.js/styles.css 已 sha256 校验一致），可在 Obsidian 设置 → 社区插件中启用测试
