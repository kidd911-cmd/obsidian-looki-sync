# Looki Sync — 社区插件市场上架指南

> ⚠️ **旧流程已废弃**：Obsidian 官方已不再通过 `obsidianmd/obsidian-releases` 的 GitHub Pull Request 接收插件提交。该仓库已关闭 PR 入口。
>
> ✅ **新流程**：在 [community.obsidian.md](https://community.obsidian.md) 开发者后台提交，系统会自动扫描 GitHub 仓库与 Release。

---

## 0. 提交前自检

- [x] GitHub 仓库为 **Public**：`https://github.com/Kidd911-cmd/obsidian-looki-sync`
- [x] 仓库根目录含 `README.md`（说明功能与设置）
- [x] 仓库根目录含 `LICENSE`（本仓库使用 MIT）
- [x] 仓库根目录含 `manifest.json`（`id`、`name`、`version`、`minAppVersion`、`author`、`description` 完整）
- [x] 已发布 GitHub Release `1.0.0`，并附 3 个资产文件：
  - `manifest.json`
  - `main.js`
  - `styles.css`
- [x] Release tag `1.0.0` 与 `manifest.json` 里的 `"version": "1.0.0"` 一致
- [x] 不含任何密钥或调试残留（已确认无 `lk-OVao` 泄漏）
- [x] 插件 ID `looki-sync` 不含 `obsidian` 字样

---

## 1. 注册/登录 Obsidian 社区账号

1. 打开 https://community.obsidian.md
2. 点击右上角 **Sign in**
3. 用你常用的邮箱注册一个 Obsidian 账号（如果还没有）
4. 登录后进入个人中心/设置

---

## 2. 绑定 GitHub 账号

在 community.obsidian.md 的个人设置里：

1. 找到 **Connected accounts** 或 **GitHub**
2. 点击 **Connect GitHub account**
3. 按提示授权，允许 Obsidian 社区读取你的公开仓库信息

> 绑定 GitHub 是为了让后台验证你拥有要提交的仓库。

---

## 3. 提交插件

1. 登录后，在左侧边栏找到：
   ```
   Plugins → New plugin
   ```
2. 点击进入 **New plugin** 页面
3. 在输入框里粘贴你的 GitHub 仓库地址：
   ```
   https://github.com/Kidd911-cmd/obsidian-looki-sync
   ```
4. 系统会自动读取仓库默认分支 HEAD 的 `manifest.json`
5. 勾选同意 Developer policies（开发者政策）
6. 确认你会持续维护该插件
7. 点击 **Submit**

---

## 4. 等待审核

提交后：

- 系统会先自动扫描仓库/Release，通常几分钟内出结果
- 如果显示 **Validation failed**，按提示修改（常见原因：缺文件、`manifest.json` 字段不对、ID 含 `obsidian`、Release 资产不全）
- 如果通过自动扫描，会进入 Obsidian 团队人工审核队列
- 审核通过后，插件会在 24 小时内出现在 Obsidian 客户端的社区插件市场里

---

## 5. 用户如何安装

上架后，用户在 Obsidian 里：

1. 设置 → 第三方插件 → 关闭安全模式
2. 浏览社区插件
3. 搜索 **"Looki Sync"**
4. 点击安装并启用

---

## 附：本地已验证

- `npm install` + `npm run build` 通过（tsc 零报错，esbuild 产出 `main.js` 19KB）
- Node 烟雾测试打通真实 API：`/me`、`/moments?on_date=`、`/moments/{id}/files`、`/for_you/items?recorded_from=YYYY-MM-DD` 均正常
- 插件文件已安装到真实 vault：`<vault>/.obsidian/plugins/looki-sync/`（manifest/main.js/styles.css 已 sha256 校验一致），可在 Obsidian 设置 → 社区插件中启用测试
