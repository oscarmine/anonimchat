# AnonimChat

A simple Telegram bot for anonymous communication between users and an admin.  
Users send messages — the bot forwards them to the admin. When the admin replies, the bot delivers the response back to the right user.

## 🛠 Features

- Forwards all user messages (text, photo, video, documents, etc.) to the admin
- Admin replies go directly back to the right user
- Anonymous: users never see the admin’s info
- Ban / unban system with persistent storage (`better-sqlite3`)
- Generates gradient profile avatars when no profile photo is available (`canvas`)
- `/getinfo` command for admin to view user info (ID, name, username, bio, ban status)

## 📦 Requirements

- Node.js **20+** (needed for `better-sqlite3` and `canvas`)
- Telegram bot token (from [@BotFather](https://t.me/BotFather))
- Your Telegram user ID (get it from [@userinfobot](https://t.me/userinfobot))

## 🚀 Installation & Setup

```bash
# Clone the repo
git clone https://github.com/oscarmine/anonimchat.git

# Go into the project folder
cd anonimchat

# Install required dependencies
npm install node-telegram-bot-api better-sqlite3 canvas

# Run the bot
node index.mjs
```
# ⚠️ Important

Before running, set your own bot token and admin chat ID in index.mjs:
```nodejs
const token = 'BOT_TOKEN';   // Replace with your bot token
const adminId = 'CHAT_ID';   // Replace with your Telegram user ID
```
