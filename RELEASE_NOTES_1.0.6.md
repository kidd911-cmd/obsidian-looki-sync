# Looki Sync v1.0.6 Release Notes

## 中文

基于 v1.0.5，本次更新很小：

- 在「媒体文件夹」设置项增加了一条提示：如果你希望把视频备份到百度网盘，可以在电脑上的**百度网盘客户端**里，把这个文件夹（vault 中对应的实际目录，例如 `Looki/media`）设为「同步文件夹」，客户端会自动把里面的视频上传到网盘。
- 其余功能与 v1.0.5 完全一致（笔记同步、图片/视频下载、ForYou 同步等）。

> 说明：本版本**不内置**百度网盘上传，也不要求填写任何百度 AppKey / SecretKey，因此无需申请百度开放平台审核。备份由你本机的百度网盘客户端完成。

### 如何把视频备份到百度网盘

1. Obsidian 设置 → Looki Sync → 记下「媒体文件夹」的路径（默认 `Looki/media`）。
2. 在电脑上打开**百度网盘客户端**（PC 版）。
3. 找到「同步空间 / 同步文件夹」功能，把 vault 里对应的媒体目录（如 `你的笔记库/Looki/media`）**添加为同步文件夹**。
4. 之后每次 Looki Sync 同步下载的视频，都会由百度网盘客户端自动上传到你的网盘。

> 提示：这种方式视频只存在百度网盘，笔记里仍显示 `![[...]]` 嵌入本地文件；你可在百度网盘 App 里查看已备份的视频。

## English

Built on v1.0.5, this is a small update:

- Added a hint under the **媒体文件夹 (Media folder)** setting: if you want to back up videos to Baidu Netdisk, you can open the **Baidu Netdisk PC client**, add that folder (the actual vault path, e.g. `Looki/media`) as a "同步文件夹 (sync folder)", and the client will automatically upload the videos to the cloud.
- Everything else is identical to v1.0.5 (note sync, image/video download, ForYou sync, etc.).

> Note: This version does **not** upload to Baidu inside the plugin and does **not** require any Baidu AppKey / SecretKey, so no Baidu Open Platform review is needed. Backup is handled by the Baidu Netdisk client on your own computer.

### How to back up videos to Baidu Netdisk

1. In Obsidian → Settings → Looki Sync, note the **媒体文件夹 (Media folder)** path (default `Looki/media`).
2. Open the **Baidu Netdisk PC client** on your computer.
3. Use its "同步空间 / 同步文件夹 (Sync folder)" feature to add the corresponding media directory inside your vault (e.g. `YourVault/Looki/media`) as a sync folder.
4. From then on, every video downloaded by Looki Sync will be automatically uploaded to your Baidu Netdisk by the client.

> Tip: With this approach videos live in Baidu Netdisk only; notes still embed the local `![[...]]` file. You can view backed-up videos in the Baidu Netdisk app.

## 升级 / Upgrade

直接替换 `main.js` / `manifest.json` / `styles.css` 即可，无需改动任何设置。
Replace `main.js` / `manifest.json` / `styles.css`. No settings changes required.
