const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

// 1. Get all conversations of logged-in user
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId: currentUserId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            receipts: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format list for frontend
    const formatted = conversations.map((conv) => {
      const lastMessage = conv.messages[0] || null;
      let title = conv.name;
      let avatar = conv.groupAvatar;
      let otherUser = null;

      if (!conv.isGroup) {
        const otherMember = conv.members.find((m) => m.userId !== currentUserId);
        if (otherMember) {
          otherUser = otherMember.user;
          title = otherMember.user.displayName;
          avatar = otherMember.user.avatarUrl;
        }
      }

      return {
        id: conv.id,
        isGroup: conv.isGroup,
        title,
        avatar,
        otherUser,
        members: conv.members.map((m) => m.user),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              content: lastMessage.content,
              type: lastMessage.type,
              createdAt: lastMessage.createdAt,
              receipts: lastMessage.receipts,
            }
          : null,
        updatedAt: conv.updatedAt,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Fetch conversations error:', error);
    res.status(500).json({ error: 'Gagal memuat percakapan' });
  }
});

// 2. Get or create 1-on-1 conversation
router.post('/direct', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Target user tidak valid' });
    }

    // Check if 1-on-1 conversation already exists
    const existingConv = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    if (existingConv) {
      const otherMember = existingConv.members.find((m) => m.userId !== currentUserId);
      return res.json({
        id: existingConv.id,
        isGroup: false,
        title: otherMember?.user.displayName,
        avatar: otherMember?.user.avatarUrl,
        otherUser: otherMember?.user,
        members: existingConv.members.map((m) => m.user),
        updatedAt: existingConv.updatedAt,
      });
    }

    // Create new conversation
    const newConv = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [
            { userId: currentUserId, role: 'admin' },
            { userId: targetUserId, role: 'member' },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    const otherMember = newConv.members.find((m) => m.userId !== currentUserId);

    res.status(201).json({
      id: newConv.id,
      isGroup: false,
      title: otherMember?.user.displayName,
      avatar: otherMember?.user.avatarUrl,
      otherUser: otherMember?.user,
      members: newConv.members.map((m) => m.user),
      updatedAt: newConv.updatedAt,
    });
  } catch (error) {
    console.error('Create direct conversation error:', error);
    res.status(500).json({ error: 'Gagal membuat percakapan' });
  }
});

// 3. Create Group Conversation (Phase 3 readiness)
router.post('/group', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { name, memberIds } = req.body;

    if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Nama grup dan minimal 1 anggota wajib diisi' });
    }

    const uniqueMemberIds = Array.from(new Set([...memberIds, currentUserId]));

    const groupConv = await prisma.conversation.create({
      data: {
        isGroup: true,
        name,
        groupAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        members: {
          create: uniqueMemberIds.map((userId) => ({
            userId,
            role: userId === currentUserId ? 'admin' : 'member',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      id: groupConv.id,
      isGroup: true,
      title: groupConv.name,
      avatar: groupConv.groupAvatar,
      members: groupConv.members.map((m) => m.user),
      updatedAt: groupConv.updatedAt,
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Gagal membuat grup' });
  }
});

// 4. Get message history of a conversation
router.get('/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    // Verify membership
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Anda bukan anggota percakapan ini' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
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
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Gagal memuat pesan' });
  }
});

module.exports = router;
