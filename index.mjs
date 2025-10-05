import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import TelegramBot from 'node-telegram-bot-api';
import { createCanvas } from 'canvas';
import Database from 'better-sqlite3';

const token = 'BOT_TOKEN';
const adminId = 'CHAT_ID';

const gradients = [
    ['#5A87F4', '#90B5FF'],
    ['#4AB3F4', '#76D0FF'],
    ['#61D184', '#B0F2BD'],
    ['#FA8775', '#FFD2CB'],
    ['#F6C36E', '#FFE9B7'],
    ['#4BDAF5', '#C3F3FF'],
    ['#E7757B', '#F2B2B6'],
    ['#B99FFF', '#D4BBFF'],
    ['#FF8E5D', '#FFD7C4'],
    ['#F48F8F', '#FFB7B7']
];

const bot = new TelegramBot(token, { 
    polling: true,
    allowed_updates: ['message', 'edited_message']
});

const dbPath = path.join(__dirname, 'banned.db');
const db = new Database(dbPath);
db.exec(`CREATE TABLE IF NOT EXISTS banned_users (id TEXT PRIMARY KEY)`);

const isBanned = (userId) => !!db.prepare('SELECT id FROM banned_users WHERE id = ?').get(userId);
const banUser = (userId) => db.prepare('INSERT OR IGNORE INTO banned_users (id) VALUES (?)').run(userId);
const unbanUser = (userId) => db.prepare('DELETE FROM banned_users WHERE id = ?').run(userId);
const listBanned = () => db.prepare('SELECT id FROM banned_users').all().map(row => row.id);

const messageMap = new Map();
const userMsgToAdminMsg = new Map(); // `${userChatId}_${userMsgId}` -> adminMsgId
const adminMsgToUserKey = new Map(); // adminMsgId -> userKey (for user messages)
const adminMsgToUserReply = new Map(); // adminMsgId -> `${userChatId}_${userReplyMsgId}` (for replies)
const userReplyToAdminMsg = new Map(); // `${userChatId}_${userReplyMsgId}` -> adminMsgId

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function escapeMarkdown(text) {
    return text.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1');
}

bot.on('message', async (msg) => {
    try {
        if (msg.text && msg.text === '/start') {
            if (msg.chat.type !== 'private') return;
            bot.sendMessage(msg.chat.id, `*🔒 Secure connection established.*\n\nYour messages are relayed. Proceed with caution.`, { parse_mode: 'Markdown' });
            return;
        }

        const chatIdStr = msg.chat.id.toString();

        if (chatIdStr === adminId) {
            if (msg.text && msg.text.startsWith('/')) {
                const parts = msg.text.trim().split(/\s+/);
                const cmd = parts[0].slice(1).toLowerCase();

                if (cmd === 'ban') {
                    let targetId;
                    if (msg.reply_to_message) {
                        const repliedUserId = messageMap.get(msg.reply_to_message.message_id);
                        if (repliedUserId) {
                            targetId = repliedUserId.toString();
                        }
                    } else if (parts[1]) {
                        targetId = parts[1];
                    }
                    if (targetId) {
                        banUser(targetId);
                        bot.sendMessage(msg.chat.id, `*🛑 Access denied* for \`${targetId}\`.`, { parse_mode: 'Markdown' });
                        try {
                            await bot.sendMessage(targetId, "*⛔ Transmission blocked.*\n\nYour access to the network has been revoked. You are now on the restricted list.", { parse_mode: "Markdown" });
                        } catch (e) {
                            console.error("Failed to notify banned user:", e.message);
                        }
                    } else {
                        bot.sendMessage(msg.chat.id, '*Reply to a message or* `/ban <user_id>`.', { parse_mode: 'Markdown' });
                    }
                } else if (cmd === 'unban') {
                    let targetId;
                    if (msg.reply_to_message) {
                        const repliedUserId = messageMap.get(msg.reply_to_message.message_id);
                        if (repliedUserId) {
                            targetId = repliedUserId.toString();
                        }
                    } else if (parts[1]) {
                        targetId = parts[1];
                    }
                    if (targetId) {
                        unbanUser(targetId);
                        bot.sendMessage(msg.chat.id, `*🔓 Access restored* for \`${targetId}\`.`, { parse_mode: 'Markdown' });
                        try {
                            await bot.sendMessage(targetId, "*🔓 Access restored.*\n\nYour connection has been re-established. You may now transmit messages again.", { parse_mode: "Markdown" });
                        } catch (e) {
                            console.error("Failed to notify unbanned user:", e.message);
                        }
                    } else {
                        bot.sendMessage(msg.chat.id, '*Reply to a message or* `/unban <user_id>`.', { parse_mode: 'Markdown' });
                    }
                } else if (cmd === 'banned') {
                    const bannedList = listBanned();
                    const text = bannedList.length ? `*🛑 Restricted:*\n\`${bannedList.join(', ')}\`` : '*No restrictions active.*';
                    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
                } else if (cmd === 'getinfo') {
                    let targetId;
                    if (msg.reply_to_message) {
                        const repliedUserId = messageMap.get(msg.reply_to_message.message_id);
                        if (repliedUserId) {
                            targetId = repliedUserId.toString();
                        }
                    } else if (parts[1]) {
                        targetId = parts[1];
                    }
                    if (targetId) {
                        try {
                            const chat = await bot.getChat(targetId);
                            const firstName = chat.first_name || 'N/A';
                            const lastName = chat.last_name || 'N/A';
                            const username = chat.username ? `@${chat.username}` : 'N/A';
                            const bio = chat.bio || 'N/A';
                            const banned = isBanned(targetId);
                            const fullName = `${firstName}${lastName !== 'N/A' ? ` ${lastName}` : ''}`;
                            const escapedFullName = escapeMarkdown(fullName);
                            const escapedBio = escapeMarkdown(bio);
                            const text = `*🔍 Profile Scan:*\n\n` +
                                         `*ID:* \`${targetId}\`\n` +
                                         `*Name:* \`${escapedFullName}\`\n` +
                                         `*Username:* ${escapeMarkdown(username)}\n` +
                                         `*Bio:* \`${escapedBio}\`\n` +
                                         `*Status:* ${banned ? '🛑 Restricted' : '🟢 Active'}\n\n`;

                            const profilePhotos = await bot.getUserProfilePhotos(targetId, { limit: 1 });
                            if (profilePhotos.total_count > 0) {
                                const photoSizes = profilePhotos.photos[0];
                                const bigPhoto = photoSizes[photoSizes.length - 1].file_id;
                                await bot.sendPhoto(msg.chat.id, bigPhoto, { caption: text, parse_mode: 'Markdown' });
                            } else {
                                // Generate gradient profile
                                const canvas = createCanvas(512, 512);
                                const ctx = canvas.getContext('2d');
                                const index = hashCode(targetId) % gradients.length;
                                const gradientColors = gradients[index];
                                const gradient = ctx.createLinearGradient(0, 0, 512, 512);
                                gradient.addColorStop(0, gradientColors[0]);
                                gradient.addColorStop(1, gradientColors[1]);
                                ctx.fillStyle = gradient;
                                ctx.fillRect(0, 0, 512, 512);

                                // Add initial
                                if (firstName && firstName.length > 0) {
                                    ctx.fillStyle = 'white';
                                    ctx.font = 'bold 120px Arial';
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillText(firstName[0].toUpperCase(), 256, 256);
                                }

                                const buffer = canvas.toBuffer('image/png');
                                await bot.sendPhoto(msg.chat.id, buffer, { caption: text, parse_mode: 'Markdown' });
                            }
                        } catch (err) {
                            bot.sendMessage(msg.chat.id, `*Scan failed* for \`${targetId}\`: ${err.message}`, { parse_mode: 'Markdown' });
                        }
                    } else {
                        bot.sendMessage(msg.chat.id, '*Reply to a message or* `/getinfo <user_id>`.', { parse_mode: 'Markdown' });
                    }
                }
                return;
            }

            // Handle admin replies (only non-commands)
            if (msg.reply_to_message) {
                const userId = messageMap.get(msg.reply_to_message.message_id);
                if (!userId) return;

                let sent;
                if (msg.text) {
                    sent = await bot.sendMessage(userId, msg.text, { parse_mode: 'Markdown' });
                } else if (msg.photo) {
                    const photo = msg.photo[msg.photo.length - 1].file_id;
                    const caption = msg.caption;
                    sent = await bot.sendPhoto(userId, photo, { caption, parse_mode: 'Markdown' });
                } else if (msg.document) {
                    const caption = msg.caption;
                    sent = await bot.sendDocument(userId, msg.document.file_id, { caption, parse_mode: 'Markdown' });
                } else if (msg.video) {
                    const caption = msg.caption;
                    sent = await bot.sendVideo(userId, msg.video.file_id, { caption, parse_mode: 'Markdown' });
                } else if (msg.audio) {
                    const caption = msg.caption;
                    sent = await bot.sendAudio(userId, msg.audio.file_id, { caption, parse_mode: 'Markdown' });
                } else if (msg.voice) {
                    sent = await bot.sendVoice(userId, msg.voice.file_id);
                } else if (msg.sticker) {
                    sent = await bot.sendSticker(userId, msg.sticker.file_id);
                } else if (msg.animation) {
                    const animation = msg.animation.file_id;
                    const caption = msg.caption;
                    sent = await bot.sendAnimation(userId, animation, { caption, parse_mode: 'Markdown' });
                } else if (msg.location) {
                    sent = await bot.sendLocation(userId, msg.location.latitude, msg.location.longitude);
                } else if (msg.contact) {
                    sent = await bot.sendContact(userId, msg.contact.phone_number, msg.contact.first_name, { last_name: msg.contact.last_name });
                } else if (msg.poll) {
                    sent = await bot.sendPoll(userId, msg.poll.question, msg.poll.options.map(o => o.text), { is_anonymous: msg.poll.is_anonymous, type: msg.poll.type, allows_multiple_answers: msg.poll.allows_multiple_answers, correct_option_id: msg.poll.correct_option_id });
                } else {
                    // Fallback
                    sent = await bot.copyMessage(userId, msg.chat.id, msg.message_id);
                }

                if (sent && sent.message_id) {
                    const userReplyKey = `${userId}_${sent.message_id}`;
                    const adminReplyId = msg.message_id;
                    adminMsgToUserReply.set(adminReplyId, userReplyKey);
                    userReplyToAdminMsg.set(userReplyKey, adminReplyId);
                }
            }
            return;
        }

        // Handle user messages (non-admin) - only in private chats
        if (msg.chat.type !== 'private') return;
        if (isBanned(chatIdStr)) {
            await bot.sendMessage(msg.chat.id, "*⛔ Transmission blocked.*\n\nYour access to the network has been revoked. You are now on the restricted list.", { parse_mode: "Markdown" });
            return;
        }

        const forwarded = await bot.forwardMessage(adminId, msg.chat.id, msg.message_id);
        const adminMsgId = forwarded.message_id;
        messageMap.set(adminMsgId, msg.chat.id.toString());
        const userKey = `${msg.chat.id}_${msg.message_id}`;
        userMsgToAdminMsg.set(userKey, adminMsgId);
        adminMsgToUserKey.set(adminMsgId, userKey);
    } catch (error) {
        console.error('Error handling message:', error);
        // Optionally, notify admin about errors
        if (msg && msg.chat && msg.chat.id && msg.chat.id.toString() === adminId) {
            bot.sendMessage(adminId, `*⚠️ Signal interrupted:* ${error.message}`, { parse_mode: 'Markdown' });
        }
    }
});

bot.on('edited_message', async (msg) => {
    try {
        // Only handle in private chats for user edits
        if (msg.chat.type !== 'private') return;

        const chatIdStr = msg.chat.id.toString();

        if (chatIdStr === adminId) {
            // Admin edit: only for replies
            const userReplyKey = adminMsgToUserReply.get(msg.message_id);
            if (userReplyKey) {
                const [userChatIdStr, userMsgIdStr] = userReplyKey.split('_');
                const userChatId = parseInt(userChatIdStr);
                const userMsgId = parseInt(userMsgIdStr);
                if (msg.text !== undefined) {
                    await bot.editMessageText(msg.text, { chat_id: userChatId, message_id: userMsgId, parse_mode: 'Markdown' });
                } else if (msg.caption !== undefined) {
                    await bot.editMessageCaption(userChatId, userMsgId, { caption: msg.caption, parse_mode: 'Markdown' });
                }
            }
        } else {
            // User edit: re-forward to admin
            const userKey = `${msg.chat.id}_${msg.message_id}`;
            const oldAdminMsgId = userMsgToAdminMsg.get(userKey);
            if (oldAdminMsgId) {
                try {
                    await bot.deleteMessage(adminId, oldAdminMsgId);
                    adminMsgToUserKey.delete(oldAdminMsgId);
                } catch (deleteErr) {
                    console.error('Error deleting old message:', deleteErr);
                }
            }
            const forwarded = await bot.forwardMessage(adminId, msg.chat.id, msg.message_id);
            const newAdminMsgId = forwarded.message_id;
            userMsgToAdminMsg.set(userKey, newAdminMsgId);
            adminMsgToUserKey.set(newAdminMsgId, userKey);
            messageMap.set(newAdminMsgId, msg.chat.id.toString());
        }
    } catch (err) {
        console.error('Error handling edit:', err);
    }
});
