const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../middlewares/auth');

// Map to track active sockets per user: userId -> Set of socketIds
const onlineUsers = new Map();

function setupChatSocket(io) {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.token;
    if (!token) {
      return next(new Error('Autentikasi gagal: Token tidak disediakan'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Autentikasi gagal: Token tidak valid'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    // Join personal room for direct routing
    socket.join(`user_${userId}`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      // First connection for this user: mark online in DB and broadcast
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true },
        });
      } catch (e) {
        console.error('Error updating online status:', e);
      }
      io.emit('user_presence', { userId, isOnline: true });
    }
    onlineUsers.get(userId).add(socket.id);

    // Join all conversation rooms user belongs to
    try {
      const memberships = await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      memberships.forEach((m) => socket.join(`conv_${m.conversationId}`));
    } catch (e) {
      console.error('Error joining user conversation rooms:', e);
    }

    // --- 1. Typing Indicator ---
    socket.on('typing', ({ conversationId, isTyping }) => {
      // Broadcast to other users in the conversation room
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        isTyping: !!isTyping,
      });
    });

    // --- 2. Send Message (Phase 1 + Phase 2 Receipts) ---
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, content, type = 'text', mediaUrl, fileName, tempId } = data;

        if (!conversationId || (!content && !mediaUrl)) {
          if (callback) callback({ error: 'Data pesan tidak lengkap' });
          return;
        }

        // Verify sender is in conversation
        const membership = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
        });
        if (!membership) {
          if (callback) callback({ error: 'Anda bukan anggota percakapan ini' });
          return;
        }

        // Save message to DB
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content: content || '',
            type,
            mediaUrl,
            fileName,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            receipts: true,
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Send ACK back to sender immediately (Clock -> Sent: Centang 1)
        if (callback) {
          callback({ success: true, message, tempId });
        }

        // Find other members of conversation
        const otherMembers = await prisma.conversationMember.findMany({
          where: {
            conversationId,
            userId: { not: userId },
          },
        });

        let anyDelivered = false;

        for (const member of otherMembers) {
          const recipientId = member.userId;
          const isRecipientOnline = onlineUsers.has(recipientId) && onlineUsers.get(recipientId).size > 0;

          // Emit new message to recipient
          io.to(`user_${recipientId}`).emit('new_message', message);

          if (isRecipientOnline) {
            anyDelivered = true;
            // Record delivered receipt in DB
            try {
              await prisma.messageReceipt.upsert({
                where: {
                  messageId_userId: {
                    messageId: message.id,
                    userId: recipientId,
                  },
                },
                create: {
                  messageId: message.id,
                  userId: recipientId,
                  status: 'delivered',
                },
                update: {
                  status: 'delivered',
                },
              });
            } catch (e) {
              console.error('Error creating receipt:', e);
            }
          }
        }

        // If delivered to at least one recipient, notify sender (Centang 2 Abu-abu)
        if (anyDelivered) {
          io.to(`user_${userId}`).emit('message_status_update', {
            messageId: message.id,
            conversationId,
            status: 'delivered',
          });
        }
      } catch (error) {
        console.error('send_message error:', error);
        if (callback) callback({ error: 'Gagal mengirim pesan' });
      }
    });

    // --- 3. Mark Messages as Read (Centang 2 Biru) ---
    socket.on('mark_as_read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        // Find all unread messages in this conversation not sent by current user
        const unreadMessages = await prisma.message.findMany({
          where: {
            conversationId,
            senderId: { not: userId },
          },
          select: { id: true, senderId: true },
        });

        if (unreadMessages.length === 0) return;

        const messageIds = unreadMessages.map((m) => m.id);

        // Update receipts to 'read'
        for (const msg of unreadMessages) {
          await prisma.messageReceipt.upsert({
            where: {
              messageId_userId: {
                messageId: msg.id,
                userId,
              },
            },
            create: {
              messageId: msg.id,
              userId,
              status: 'read',
            },
            update: {
              status: 'read',
            },
          });
        }

        // Notify senders that their messages were read (Double Blue Tick!)
        const senderIds = Array.from(new Set(unreadMessages.map((m) => m.senderId)));
        senderIds.forEach((senderId) => {
          io.to(`user_${senderId}`).emit('messages_read', {
            conversationId,
            readerId: userId,
            messageIds,
          });
        });
      } catch (error) {
        console.error('mark_as_read error:', error);
      }
    });

    // --- 4. Disconnect Handling ---
    socket.on('disconnect', async () => {
      if (onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeenTime = new Date();

          try {
            await prisma.user.update({
              where: { id: userId },
              data: { isOnline: false, lastSeen: lastSeenTime },
            });
          } catch (e) {
            console.error('Error updating offline status:', e);
          }

          io.emit('user_presence', {
            userId,
            isOnline: false,
            lastSeen: lastSeenTime.toISOString(),
          });
        }
      }
    });
  });
}

module.exports = { setupChatSocket };
