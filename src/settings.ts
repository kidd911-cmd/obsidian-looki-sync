import { App, PluginSettingTab, Setting } from "obsidian";
import LookiSyncPlugin from "./main";

export class LookiSettingTab extends PluginSettingTab {
  plugin: LookiSyncPlugin;
  private baiduCodeInput = "";

  constructor(app: App, plugin: LookiSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    new Setting(containerEl).setName("设置").setHeading();

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Looki 开放 API 密钥，形如 lk-xxxx")
      .addText((t) =>
        t
          .setPlaceholder("lk-...")
          .setValue(s.apiKey)
          .onChange(async (v) => {
            s.apiKey = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("API Base URL")
      .setDesc("默认 https://open.looki.tech/api/v1")
      .addText((t) =>
        t
          .setPlaceholder("https://open.looki.tech/api/v1")
          .setValue(s.baseUrl)
          .onChange(async (v) => {
            s.baseUrl = v.trim() || "https://open.looki.tech/api/v1";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("目标文件夹")
      .setDesc("每日记忆笔记写入的 vault 内相对路径")
      .addText((t) =>
        t
          .setPlaceholder("Looki/每日记忆")
          .setValue(s.notesFolder)
          .onChange(async (v) => {
            s.notesFolder = v.trim() || "Looki/每日记忆";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("媒体文件夹")
      .setDesc("图片/视频下载保存的 vault 内相对路径（媒体开关开启时生效）")
      .addText((t) =>
        t
          .setPlaceholder("Looki/media")
          .setValue(s.mediaFolder)
          .onChange(async (v) => {
            s.mediaFolder = v.trim() || "Looki/media";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("同步图片")
      .setDesc("下载 Looki 图片 (IMAGE) 到 vault 并用 ![[...]] 嵌入笔记")
      .addToggle((t) =>
        t.setValue(s.syncImages).onChange(async (v) => {
          s.syncImages = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("同步视频")
      .setDesc("下载 Looki 视频 (VIDEO) 到 vault 并嵌入（体积较大，默认关闭）")
      .addToggle((t) =>
        t.setValue(s.syncVideos).onChange(async (v) => {
          s.syncVideos = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("回填天数")
      .setDesc("每次同步额外补最近 N 天的日常与即时提示（兼顾延迟生成的内容）")
      .addText((t) =>
        t
          .setPlaceholder("1")
          .setValue(String(s.backfillDays))
          .onChange(async (v) => {
            const n = parseInt(v) || 0;
            s.backfillDays = n;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("自动同步间隔（分钟）")
      .setDesc("0 = 关闭自动同步。建议 30")
      .addText((t) =>
        t
          .setPlaceholder("30")
          .setValue(String(s.syncInterval))
          .onChange(async (v) => {
            const n = parseInt(v) || 0;
            s.syncInterval = n;
            await this.plugin.saveSettings();
            this.plugin.restartAutoSync();
          })
      );

    new Setting(containerEl)
      .setName("启动时自动同步")
      .setDesc("Obsidian 打开时立即同步一次")
      .addToggle((t) =>
        t.setValue(s.syncOnStartup).onChange(async (v) => {
          s.syncOnStartup = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("测试连接")
      .addButton((b) =>
        b.setButtonText("测试").onClick(async () => {
          try {
            await this.plugin.testConnection();
            this.plugin.notice("连接成功 ✅");
          } catch (e) {
            this.plugin.notice("连接失败：" + e.message);
          }
        })
      );

    new Setting(containerEl)
      .setName("立即同步")
      .addButton((b) =>
        b
          .setButtonText("同步 Now")
          .setCta()
          .onClick(async () => {
            await this.plugin.syncNow();
          })
      );

    new Setting(containerEl)
      .setName("全量重置并重新同步")
      .setDesc("清空同步记录，重新拉取全部历史")
      .addButton((b) =>
        b.setButtonText("全量重同步").onClick(async () => {
          await this.plugin.fullResync();
        })
      );

    // ---------- 百度网盘备份 ----------
    new Setting(containerEl).setName("百度网盘备份").setHeading();

    new Setting(containerEl)
      .setName("同步到百度网盘")
      .setDesc("把 Looki 图片/视频上传到你的百度网盘做备份（vault 不保留本地文件）")
      .addToggle((t) =>
        t.setValue(s.syncBaidu).onChange(async (v) => {
          s.syncBaidu = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("保留本地副本")
      .setDesc("同时把媒体存进 vault（笔记里能显示图片）。关闭 = 只传百度、vault 不留（省 iCloud 空间）")
      .addToggle((t) =>
        t.setValue(s.keepLocalCopy).onChange(async (v) => {
          s.keepLocalCopy = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("百度 API Key")
      .setDesc("百度网盘开放平台的 AppKey（client_id）")
      .addText((t) =>
        t
          .setPlaceholder("AppKey")
          .setValue(s.baiduClientId)
          .onChange(async (v) => {
            s.baiduClientId = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("百度 Secret Key")
      .setDesc("百度网盘开放平台的 Secretkey（client_secret）")
      .addText((t) =>
        t
          .setPlaceholder("Secretkey")
          .setValue(s.baiduClientSecret)
          .onChange(async (v) => {
            s.baiduClientSecret = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("百度网盘目录")
      .setDesc("媒体上传到的百度网盘路径（默认 /LookiSync/media）")
      .addText((t) =>
        t
          .setPlaceholder("/LookiSync/media")
          .setValue(s.baiduRemoteDir)
          .onChange(async (v) => {
            s.baiduRemoteDir = v.trim() || "/LookiSync/media";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("授权百度网盘")
      .setDesc("① 点“打开授权页”登录并同意 → 浏览器地址栏显示 ?code=xxx → 复制 → 粘贴到下方 → 点“完成授权”")
      .addButton((b) =>
        b.setButtonText("① 打开授权页").onClick(async () => {
          await this.plugin.openBaiduAuth();
        })
      );

    new Setting(containerEl)
      .setName("粘贴授权 code")
      .addText((t) =>
        t
          .setPlaceholder("code= 后面的字符串")
          .setValue(this.baiduCodeInput)
          .onChange(async (v) => {
            this.baiduCodeInput = v.trim();
          })
      )
      .addButton((b) =>
        b
          .setButtonText("③ 完成授权")
          .setCta()
          .onClick(async () => {
            if (!this.baiduCodeInput) {
              this.plugin.notice("请先粘贴 code");
              return;
            }
            try {
              await this.plugin.baiduExchange(this.baiduCodeInput);
              this.baiduCodeInput = "";
              this.plugin.notice("百度授权成功 ✅");
              this.display();
            } catch (e) {
              this.plugin.notice("授权失败：" + e.message);
            }
          })
      );

    new Setting(containerEl)
      .setName("授权状态")
      .setDesc(this.plugin.baiduTokenStatus());
  }
}
