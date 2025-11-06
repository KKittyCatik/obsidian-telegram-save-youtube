# 📥 obsidian-saving-md-via-telegram

A local HTTP server for receiving JSON requests (for example, from a Telegram bot)
and automatically saving YouTube video information into your Obsidian vault as Markdown notes.

---

## 🚀 Features

   - 🧩 Runs a lightweight HTTP server directly inside Obsidian
   - 🛡 Accepts requests only with a valid Authorization Key
   - 💾 Saves incoming JSON data (title, description, thumbnail, URL, etc.) as Markdown files
   - 🪶 Automatically creates the target folder if it doesn’t exist
   - 🔁 Allows restarting the server without restarting Obsidian
   - 🔐 Supports generating, copying, and hiding the Authorization Key directly in the settings

---

## ⚙️ Installation

1. Open your Obsidian plugins folder: `<Vault>/.obsidian/plugins/`
2. Create a new folder: `obsidian-telegram-save-youtube`
3. Copy the plugin files there (`main.js`, `manifest.json`, and optionally `styles.css`).
4. Restart Obsidian and enable the plugin in **Settings → Community Plugins**.

---

## 🧰 Settings

Go to **Settings → Community Plugins → obsidian-telegram-save-youtube**.
You’ll find the following configuration options:

|Setting	| Description                                                                              |
|----------|------------------------------------------------------------------------------------------|
|Server Port:| 	The port the HTTP server listens on (default: 3001)                                     |
|Save Folder:| 	Folder where new Markdown files will be saved (default: obsidian-telegram-save-youtube) |
|Authorization Key:| 	Unique key required for secure requests                                                 |
|Generate:| 	Generates a new random key and copies it to your clipboard                              |
|Copy Key:| 	Copies the current key manually                                                         |
|Show:| Authorization Key	Toggles visibility of the key field (show/hide)                        |
|Restart Server:| 	Restarts the HTTP server manually                                                       |
|Server Status:| 	Displays whether the server is currently running and on which port                      |

---

## 🔑 Authorization Key Usage

1. In settings, click **Generate** → a random key will be created and copied to your clipboard, for example:
`d8f7bde41e8a4cd7fda70b2f5d9ce7a8e8ef1a3c0a7ff19d`
2. When sending data to the plugin, include the key in the HTTP header:
`Authorization: Bearer d8f7bde41e8a4cd7fda70b2f5d9ce7a8e8ef1a3c0a7ff19d`

## 🧱 Project Structure
```
obsidian-telegram-save-youtube/
│
├── main.js                  # Main plugin logic
├── manifest.json            # Plugin metadata
├── styles.css               # (optional)
└── README.md                # You’re reading it 🙂
```
## 🩵 Author & Compatible
- Author: **KKittyCatik**
- Compatible with: **Obsidian v1.6+**