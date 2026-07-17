# Looki Sync v1.0.6 Release Notes

## 中文

基于 v1.0.5，本次更新很小：

- 在「媒体文件夹」设置项增加了一条提示：如果你希望把视频备份到百度网盘，可以在电脑上的**百度网盘客户端**里，把这个文件夹（vault 中对应的实际目录，例如 `Looki/media`）设为「同步文件夹」，客户端会自动把里面的视频上传到网盘。
- 其余功能与 v1.0.5 完全一致（笔记同步、图片/视频下载、ForYou 同步等）。

> 说明：本版本**不内置**百度网盘上传，也不要求填写任何百度 AppKey / SecretKey，因此无需申请百度开放平台审核。备份由你本机的百度网盘客户端完成。

## English

Built on v1.0.5, this is a small update:

- Added a hint under the **媒体文件夹 (Media folder)** setting: if you want to back up videos to Baidu Netdisk, you can open the **Baidu Netdisk PC client**, add that folder (the actual vault path, e.g. `Looki/media`) as a "同步文件夹 (sync folder)", and the client will automatically upload the videos to the cloud.
- Everything else is identical to v1.0.5 (note sync, image/video download, ForYou sync, etc.).

> Note: This version does **not** upload to Baidu inside the plugin and does **not** require any Baidu AppKey / SecretKey, so no Baidu Open Platform review is needed. Backup is handled by the Baidu Netdisk client on your own computer.

## 升级 / Upgrade

直接替换 `main.js` / `manifest.json` / `styles.css` 即可，无需改动任何设置。
Replace `main.js` / `manifest.json` / `styles.css`. No settings changes required.
