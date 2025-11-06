const { Plugin, Notice, App, PluginSettingTab, Setting } = require("obsidian");

const DEFAULT_SETTINGS = {
  port: 3001,
  saveFolder: "obsidian-telegram-save-youtube"
};

module.exports = class JsonInboxPlugin extends Plugin {
  server = null;
  settings = {};

  async onload() {
    console.log("obsidian-telegram-save-youtube plugin loaded");
    new Notice("obsidian-telegram-save-youtube plugin loaded");

    await this.loadSettings();

    this.addSettingTab(new JsonInboxSettingTab(this.app, this));

    this.startServer();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    this.stopServer();
  }

  stopServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log("obsidian-telegram-save-youtube server stopped");
    }
  }

  startServer() {
    this.stopServer();

    const http = require("http");

    this.server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === "POST" && req.url === "/inbox") {
        const authHeader = req.headers["authorization"];
        const expectedKey = this.settings.authorizationKey;

        if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }

        let body = "";
        req.on("data", chunk => (body += chunk.toString()));
        req.on("end", async () => {
          try {
            if (!body.trim()) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Empty request body" }));
              return;
            }

            const json = JSON.parse(body);
            await this.saveToFile(json);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, message: "Item saved successfully" }));
          } catch (err) {
            console.error("Error processing request:", err);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON", details: err.message }));
          }
        });

        req.on("error", err => {
          console.error("Request error:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        });
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });

    this.server.on("error", err => {
      console.error("Server error:", err);
      if (err.code === "EADDRINUSE") {
        new Notice(`JSON Inbox: Port ${this.settings.port} is busy`);
      } else {
        new Notice(`JSON Inbox server error: ${err.message}`);
      }
    });

    this.server.listen(this.settings.port, () => {
      console.log(`JSON Inbox server listening on port ${this.settings.port}`);
      new Notice(`JSON Inbox server started on port ${this.settings.port}`);
    });
  }

  async saveToFile(item) {
    if (!item.title || !item.url) {
      throw new Error("Title and URL are required");
    }

    const vault = this.app.vault;
    const folderPath = this.settings.saveFolder;

    if (!vault.getAbstractFileByPath(folderPath)) {
      await vault.createFolder(folderPath);
    }

    const safeTitle = item.title.replace(/[\/\\\:\*\?\"\<\>\|]/g, "_");
    const dateStr = item.published_at
      ? new Date(item.published_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const fileName = `${dateStr} ${safeTitle}.md`;
    const filePath = `${folderPath}/${fileName}`;

    const content = `# ${item.title}

**URL:** [Open](${item.url})

${item.thumbnail ? `![Thumbnail](${item.thumbnail})\n` : ""}
${item.published_at ? `**Published:** ${item.published_at}\n` : ""}
${item.type ? `**Type:** ${item.type}\n` : ""}

${item.description || ""}

---
*Added via JSON Inbox on ${new Date().toLocaleString()}*
`;

    try {
      await vault.create(filePath, content);
      new Notice(`Saved: ${item.title}`);
    } catch (e) {
      if (e.message.includes("already exists")) {
        await this.createFileWithSuffix(vault, folderPath, dateStr, safeTitle, content, item.title);
      } else {
        new Notice(`Error saving: ${e.message}`);
        throw e;
      }
    }
  }

  async createFileWithSuffix(vault, folderPath, dateStr, safeTitle, content, originalTitle) {
    for (let i = 1; i <= 20; i++) {
      const newFileName = `${dateStr} ${safeTitle} (${i}).md`;
      const newFilePath = `${folderPath}/${newFileName}`;
      try {
        await vault.create(newFilePath, content);
        new Notice(`Saved: ${originalTitle} (${i})`);
        return;
      } catch (e) {
        if (!e.message.includes("already exists")) throw e;
      }
    }
    throw new Error(`Failed to save "${originalTitle}" - too many attempts`);
  }
};

// ---------------- Settings Tab ----------------

class JsonInboxSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "obsidian-telegram-save-youtube Settings" });

    new Setting(containerEl)
      .setName("Server Port")
      .setDesc("Port on which the obsidian-telegram-save-youtube HTTP server listens (restarts server when changed)")
      .addText(text => {
        text.setPlaceholder("3000")
          .setValue(this.plugin.settings.port.toString())
          .onChange(async value => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0 && num < 65536) {
              this.plugin.settings.port = num;
              await this.plugin.saveSettings();
              this.plugin.startServer();
            } else {
              new Notice("Please enter a valid port number (1-65535)");
            }
          });
      });

    new Setting(containerEl)
      .setName("Save Folder")
      .setDesc("Folder in the vault where obsidian-telegram-save-youtube files are saved")
      .addText(text => {
        text.setPlaceholder("obsidian-telegram-save-youtube")
          .setValue(this.plugin.settings.saveFolder)
          .onChange(async value => {
            if (value.trim()) {
              this.plugin.settings.saveFolder = value.trim();
              await this.plugin.saveSettings();
            }
          });
      });

    let authKeyField;

    new Setting(containerEl)
      .setName("Authorization Key")
      .setDesc("Authorization key that must be sent to the Telegram bot to secure incoming requests")
      .addButton(button => {
        button
          .setButtonText("Generate")
          .onClick(async () => {
            const randomKey = Array.from(crypto.getRandomValues(new Uint8Array(24)))
              .map(b => b.toString(16).padStart(2, "0"))
              .join("");

            this.plugin.settings.authorizationKey = randomKey;
            await this.plugin.saveSettings();

            if (authKeyField) authKeyField.value = randomKey;

            try {
              await navigator.clipboard.writeText(randomKey);
              new Notice("✅ Authorization key generated and copied to clipboard");
            } catch {
              new Notice("✅ Authorization key generated (but clipboard copy failed)");
            }
          });
      })

      .addButton(button => {
        button
          .setButtonText("Copy Key")
          .onClick(async () => {
            const key = this.plugin.settings.authorizationKey;
            if (key && key.trim()) {
              try {
                await navigator.clipboard.writeText(key);
                new Notice("📋 Authorization key copied to clipboard");
              } catch {
                new Notice("⚠️ Unable to copy — clipboard access denied");
              }
            } else {
              new Notice("⚠️ No authorization key to copy");
            }
          });
      })

      .addText(text => {
        authKeyField = text.inputEl;
        authKeyField.type = "password";

        text
          .setPlaceholder("Click 'Generate' to create a new key")
          .setValue(this.plugin.settings.authorizationKey || "")
          .onChange(async value => {
            if (value.trim()) {
              this.plugin.settings.authorizationKey = value.trim();
              await this.plugin.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName("Show Authorization Key")
      .setDesc("Toggle visibility of the authorization key field")
      .addToggle(toggle => {
        toggle
          .setValue(false)
          .onChange(value => {
            if (authKeyField) {
              authKeyField.type = value ? "text" : "password";
            }
          });
      });

    new Setting(containerEl)
      .setName("Restart Server")
      .setDesc("Manually restart the HTTP server")
      .addButton(button => {
        button.setButtonText("Restart")
          .onClick(() => {
            this.plugin.startServer();
            new Notice("obsidian-telegram-save-youtube server restarted");
          });
      });

    new Setting(containerEl)
      .setName("Server Status")
      .setDesc(this.plugin.server ? `Running on port ${this.plugin.settings.port}` : "Stopped")
      .addExtraButton(button => {
        button.setIcon(this.plugin.server ? "check" : "x")
          .setTooltip(this.plugin.server ? "Server is running" : "Server is stopped");
      });
  }

  hide() {
  }
}