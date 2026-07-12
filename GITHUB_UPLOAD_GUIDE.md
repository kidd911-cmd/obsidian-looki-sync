# GitHub 上传教程（纯新手版）

适用：你只注册过 GitHub 账号，没装过 git 客户端、没用过命令行推送。
环境已确认：本机 git 2.50.1 已装、无 SSH 密钥、无 gh。本地插件仓库已 `git init` 并提交 + 打 tag `1.0.0`。

> 所有命令在**你自己的「终端」App**（/Applications/Utilities/终端.app）里跑，不要在 WorkBuddy 里跑（沙箱连不上 github.com）。

---

## 总览（5 步）

1. 准备：设好 git 身份（邮箱改成你的真实邮箱）
2. 网页建仓库：`obsidian-looki-sync`（Public）
3. 生成一个访问令牌 PAT（当作"密码"用，只显示一次，务必保存）
4. 命令行关联远程并推送（`git push`）
5. 发 Release `1.0.0`（含 3 个文件）+ 向 obsidian-releases 提 PR

---

## 第 1 步：准备 git 身份

打开「终端」，逐行粘贴（第 2 行把邮箱换成你注册 GitHub 用的真实邮箱）：

```bash
cd "/Users/jeremyjin/WorkBuddy/2026-07-12-15-42-44/obsidian-looki-sync"
git config user.name "Jeremy Jin"
git config user.email "你的真实邮箱@example.com"
```

> 用户名已经是 `Jeremy Jin`，只需改邮箱。

---

## 第 2 步：在 GitHub 网页新建仓库

1. 浏览器打开 https://github.com 并登录。
2. 右上角 **「+」→ New repository**（或点 https://github.com/new ）。
3. 填写：
   - **Repository name**: `obsidian-looki-sync`
   - **Description**（可选）: `Sync Looki Moments & For You into Obsidian`
   - 选 **Public**
   - ⚠️ **不要**勾选 "Add a README file" / "Add .gitignore" / "Choose a license"（本地已有这些，勾了会冲突）
4. 点 **Create repository**。
5. 建好后页面会显示仓库地址。复制 **HTTPS** 那行，形如：
   ```
   https://github.com/<你的GitHub用户名>/obsidian-looki-sync.git
   ```
   把 `<你的GitHub用户名>` 记下来，下面要用。

---

## 第 3 步：生成访问令牌（PAT）

GitHub 从 2021 年起不允许用登录密码推代码，必须用「个人访问令牌」当密码。

1. 右上角头像 → **Settings**。
2. 左侧最下方 **Developer settings**（开发者设置）。
3. **Personal access tokens → Tokens (classic)**（如果没有 classic 选项，先点 "Generate new token" 再选 classic）。
4. **Generate new token (classic)**。
5. 填写：
   - **Note**: `obsidian-looki-sync`
   - **Expiration**: 选 `90 days` 或 `No expiration`（长期项目建议 90 天，到期重新生成）
   - **Select scopes**: 勾选 **`repo`**（这一项包含全部仓库读写权限，展开后全勾也行）
6. 拉到最底点 **Generate token**。
7. ⚠️ **令牌只显示这一次！** 立刻复制保存到一个临时地方（记事本/备忘录）。形如：
   ```
   github_pat_xxxxxxxxxxxxxxxxxxxx
   ```
   丢了就只能回来重新生成。

---

## 第 4 步：命令行关联并推送

回到「终端」，继续（把 `<你的GitHub用户名>` 换成第 2 步记下的真实用户名）：

```bash
cd "/Users/jeremyjin/WorkBuddy/2026-07-12-15-42-44/obsidian-looki-sync"
git remote add origin https://github.com/<你的GitHub用户名>/obsidian-looki-sync.git
git branch -M main
git push -u origin main --tags
```

执行 `git push` 后会弹两次输入：
- **Username**：填你的 GitHub 用户名
- **Password**：**粘贴第 3 步生成的令牌**（粘贴时屏幕不显示任何字符，是正常的，回车即可）

✅ 成功后会显示 `main -> main` 和 `1.0.0 -> 1.0.0`。
之后 Mac 会记住令牌，日常 `git push` 不再需要输入。

> 如果提示 `remote origin already exists`，先跑 `git remote remove origin` 再重做这步。

---

## 第 5 步：发 Release（必须含 3 个文件）

Obsidian 市场是从 GitHub Release 下载插件文件的，所以**必须发一个 `1.0.0` 的 Release，并包含这三个文件**：`manifest.json`、`main.js`、`styles.css`。

1. 打开你的仓库页面 `https://github.com/<你的GitHub用户名>/obsidian-looki-sync`。
2. 右侧或上方找 **Releases**（在 "About" 栏或代码页下方）→ 点 **Releases** → **Draft a new release**。
3. **Choose a tag**: 点下拉选 **`1.0.0`**（第 4 步已把本地 tag 推上去了；若没出现就手打 `1.0.0`）。
4. **Release title**: `1.0.0`
5. **Describe**（可选）: 写 `Initial release of Looki Sync.`
6. 下方 **"Attach binaries by dropping them here or selecting them"**：
   - 打开 Finder，进入 `/Users/jeremyjin/WorkBuddy/2026-07-12-15-42-44/obsidian-looki-sync`
   - 把 **`manifest.json`、`main.js`、`styles.css`** 三个文件拖进框里（**只拖这 3 个，别拖 node_modules / src**）
7. 勾选 **Set as the latest release**。
8. 点 **Publish release**。

---

## 第 6 步：向官方市场提 PR（上架）

提交到 `obsidianmd/obsidian-releases` 这个官方列表仓库。用网页编辑器最省事，不用克隆那个大仓库。

1. 打开 https://github.com/obsidianmd/obsidian-releases
2. 点 **Fork**（第一次会让你把仓库 fork 到自己的账号，按提示点 Confirm）。
3. 进入你 fork 的仓库，找根目录的 **`community-plugins.json`**，点进去。
4. 点文件右上角的 **铅笔图标（Edit）** 进入编辑。
5. 这是一个 JSON 数组（最外层是 `[ ... ]`）。在**最后一个 `}` 之后、数组结尾 `]` 之前**加一个逗号，然后粘贴下面这段（先替换 `<你的GitHub用户名>`）：

```json
{
  "id": "looki-sync",
  "name": "Looki Sync",
  "author": "Jeremy Jin",
  "description": "将 Looki 的日常数据与即时提示同步进 Obsidian，合并为按日期的「每日记忆」笔记。可配置目标文件夹，并选择是否同步图片/视频。",
  "repo": "https://github.com/<你的GitHub用户名>/obsidian-looki-sync"
}
```

> 这段也存成了仓库里的 `community-plugins-entry.json`，可以直接复制。

6. 拉到页面底部：
   - 选 **"Create a new branch for this commit and start a pull request"**
   - 新分支名填 `add-looki-sync`
   - 点 **Propose changes**
7. 在弹出的 PR 页面：
   - 标题：`Add Looki Sync plugin`
   - 描述：可粘贴本仓库 `PR_SUBMISSION.md` 里的「PR 描述模板」
   - 点 **Create pull request**
8. 等 obsidianmd 维护者审核合并（通常几天到一两周）。合并后插件即出现在 Obsidian 社区市场，搜索 "Looki Sync" 可装。

---

## 常见问题 / 坑

- **Password 那栏不是 GitHub 登录密码**，是第 3 步生成的令牌。
- **令牌只显示一次**，没保存就重新生成（第 3 步）。
- **不要提交 API Key**：本仓库已确认源码里没有 `lk-OVao` 密钥，以后也别把密钥写进任何文件再提交。
- **Release 必须含 `manifest.json`/`main.js`/`styles.css` 三件**，缺一个市场安装会失败。
- **`<你的GitHub用户名>` 占位**要替换（仓库 `manifest.json` 里的 `authorUrl` 也是占位，可顺手改掉）。
- 推完去 `https://github.com/<你的GitHub用户名>/obsidian-looki-sync` 看一眼，确认文件都在、Release 已发布。
- GitHub 现在强制 2FA，若注册时没开，首次操作可能让你补开——按提示用手机验证即可，不影响令牌推送。
