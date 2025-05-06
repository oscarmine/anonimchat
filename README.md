# AnonimChat

A simple Telegram bot for anonymous chat between users and the admin.  
Users send messages — the bot forwards them to the admin. When the admin replies, the bot sends the reply back to the user.

## 🛠 Features

- Forwards all user messages to the admin (text, photo, video, docs, etc.)
- Admin replies go directly back to the right user
- Anonymous: users never see the admin’s info

## 📦 Requirements

- Node.js (v14+ recommended)
- Telegram bot token (from [@BotFather](https://t.me/BotFather))
- Your Telegram user ID (get it from [@userinfobot](https://t.me/userinfobot))

## 🚀 Installation & Setup

```bash
# Clone the repo
git clone https://github.com/oscarmine/anonimchat.git

# Go into the project folder
cd anonimchat

# Install the required package
npm install node-telegram-bot-api

# Run the bot
node index.mjs
```
# ⚠️ Important
## Don’t forget to set your own bot token and admin chat ID in index.js before running!
Open index.js and change these lines:
```javascript
const token = 'BOT_TOKEN';   // Replace with your bot token
const adminId = 'CHAT_ID';   // Replace with your Telegram user ID
```
