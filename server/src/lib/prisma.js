const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory state with file persistence
let state = {
  users: [],
  conversations: [],
  conversationMembers: [],
  messages: [],
  messageReceipts: [],
};

// Load database from disk
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      state = JSON.parse(content);
    } catch (err) {
      console.error('Error reading db.json, creating new store:', err);
    }
  } else {
    saveDB();
  }
}

// Save database to disk atomically
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

loadDB();

// Helper to project fields based on select
function applySelect(obj, select) {
  if (!select) return { ...obj };
  const res = {};
  for (const key of Object.keys(select)) {
    if (select[key]) {
      res[key] = obj[key];
    }
  }
  return res;
}

const prisma = {
  user: {
    async count() {
      return state.users.length;
    },

    async findUnique({ where, select }) {
      const u = state.users.find((user) => {
        if (where.id && user.id === where.id) return true;
        if (where.username && user.username.toLowerCase() === where.username.toLowerCase()) return true;
        return false;
      });
      if (!u) return null;
      return applySelect(u, select);
    },

    async findMany({ where, select, orderBy } = {}) {
      let list = [...state.users];
      if (where) {
        if (where.id?.not) {
          list = list.filter((u) => u.id !== where.id.not);
        }
      }
      if (orderBy?.displayName === 'asc') {
        list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      }
      return list.map((u) => applySelect(u, select));
    },

    async create({ data }) {
      const now = new Date().toISOString();
      const newUser = {
        id: randomUUID(),
        username: data.username.toLowerCase(),
        password: data.password,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl || null,
        about: data.about || 'Ada di WhatsApp',
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen || now,
        createdAt: now,
        updatedAt: now,
      };
      state.users.push(newUser);
      saveDB();
      return { ...newUser };
    },

    async update({ where, data }) {
      const user = state.users.find((u) => u.id === where.id);
      if (!user) throw new Error(`User ${where.id} not found`);
      Object.assign(user, data, { updatedAt: new Date().toISOString() });
      saveDB();
      return { ...user };
    },
  },

  conversation: {
    async findFirst({ where, include }) {
      const currentUserId = where.AND[0].members.some.userId;
      const targetUserId = where.AND[1].members.some.userId;

      const conv = state.conversations.find((c) => {
        if (where.isGroup !== undefined && c.isGroup !== where.isGroup) return false;
        const memberUserIds = state.conversationMembers
          .filter((m) => m.conversationId === c.id)
          .map((m) => m.userId);
        return (
          memberUserIds.includes(currentUserId) &&
          memberUserIds.includes(targetUserId) &&
          memberUserIds.length === 2
        );
      });

      if (!conv) return null;
      return prisma.conversation._expand(conv, include);
    },

    async findMany({ where, include, orderBy }) {
      let list = [...state.conversations];
      if (where?.members?.some?.userId) {
        const uid = where.members.some.userId;
        const userConvIds = state.conversationMembers
          .filter((m) => m.userId === uid)
          .map((m) => m.conversationId);
        list = list.filter((c) => userConvIds.includes(c.id));
      }

      const expanded = list.map((c) => prisma.conversation._expand(c, include));
      if (orderBy?.updatedAt === 'desc') {
        expanded.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }
      return expanded;
    },

    async create({ data, include }) {
      const now = new Date().toISOString();
      const newConv = {
        id: randomUUID(),
        isGroup: !!data.isGroup,
        name: data.name || null,
        groupAvatar: data.groupAvatar || null,
        createdAt: now,
        updatedAt: now,
      };
      state.conversations.push(newConv);

      if (data.members?.create) {
        for (const m of data.members.create) {
          state.conversationMembers.push({
            id: randomUUID(),
            conversationId: newConv.id,
            userId: m.userId,
            role: m.role || 'member',
            joinedAt: now,
          });
        }
      }

      saveDB();
      return prisma.conversation._expand(newConv, include);
    },

    async update({ where, data }) {
      const conv = state.conversations.find((c) => c.id === where.id);
      if (!conv) throw new Error(`Conversation ${where.id} not found`);
      Object.assign(conv, data, { updatedAt: new Date().toISOString() });
      saveDB();
      return { ...conv };
    },

    _expand(conv, include) {
      const result = { ...conv };
      if (include?.members) {
        const members = state.conversationMembers.filter((m) => m.conversationId === conv.id);
        result.members = members.map((m) => {
          const userObj = state.users.find((u) => u.id === m.userId);
          const userSelected = include.members.include?.user
            ? applySelect(userObj, include.members.include.user.select)
            : userObj;
          return {
            ...m,
            user: userSelected,
          };
        });
      }

      if (include?.messages) {
        let msgs = state.messages.filter((m) => m.conversationId === conv.id);
        msgs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (include.messages.take) {
          msgs = msgs.slice(0, include.messages.take);
        }
        result.messages = msgs.map((m) => {
          const receipts = state.messageReceipts.filter((r) => r.messageId === m.id);
          return {
            ...m,
            receipts,
          };
        });
      }
      return result;
    },
  },

  conversationMember: {
    async findUnique({ where }) {
      const { conversationId, userId } = where.conversationId_userId;
      const mem = state.conversationMembers.find(
        (m) => m.conversationId === conversationId && m.userId === userId
      );
      return mem ? { ...mem } : null;
    },

    async findMany({ where, select }) {
      let list = [...state.conversationMembers];
      if (where?.userId) {
        if (typeof where.userId === 'object' && where.userId.not) {
          list = list.filter((m) => m.userId !== where.userId.not);
        } else {
          list = list.filter((m) => m.userId === where.userId);
        }
      }
      if (where?.conversationId) {
        list = list.filter((m) => m.conversationId === where.conversationId);
      }
      return list.map((m) => applySelect(m, select));
    },
  },

  message: {
    async findMany({ where, include, orderBy }) {
      let list = state.messages.filter((m) => m.conversationId === where.conversationId);
      if (where?.senderId?.not) {
        list = list.filter((m) => m.senderId !== where.senderId.not);
      }
      if (orderBy?.createdAt === 'asc') {
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
      return list.map((m) => {
        const receipts = state.messageReceipts.filter((r) => r.messageId === m.id);
        const sender = state.users.find((u) => u.id === m.senderId);
        return {
          ...m,
          sender: include?.sender?.select ? applySelect(sender, include.sender.select) : sender,
          receipts: include?.receipts ? receipts : undefined,
        };
      });
    },

    async create({ data, include }) {
      const now = new Date().toISOString();
      const newMsg = {
        id: randomUUID(),
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content || '',
        type: data.type || 'text',
        mediaUrl: data.mediaUrl || null,
        fileName: data.fileName || null,
        createdAt: now,
      };
      state.messages.push(newMsg);
      saveDB();

      const sender = state.users.find((u) => u.id === newMsg.senderId);
      const receipts = state.messageReceipts.filter((r) => r.messageId === newMsg.id);

      return {
        ...newMsg,
        sender: include?.sender?.select ? applySelect(sender, include.sender.select) : sender,
        receipts,
      };
    },
  },

  messageReceipt: {
    async upsert({ where, create, update }) {
      const { messageId, userId } = where.messageId_userId;
      let existing = state.messageReceipts.find(
        (r) => r.messageId === messageId && r.userId === userId
      );

      const now = new Date().toISOString();
      if (existing) {
        Object.assign(existing, update, { updatedAt: now });
      } else {
        existing = {
          id: randomUUID(),
          messageId,
          userId,
          status: create.status || 'delivered',
          updatedAt: now,
        };
        state.messageReceipts.push(existing);
      }
      saveDB();
      return { ...existing };
    },
  },
};

module.exports = prisma;
