import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingMap, setTypingMap] = useState({}); // { [convId]: { [userId]: boolean } }
  const [presenceMap, setPresenceMap] = useState({}); // { [userId]: { isOnline, lastSeen } }

  const activeConvRef = useRef(activeConversation);
  activeConvRef.current = activeConversation;

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);

      // Populate presence map from conversation members
      const newPresence = {};
      res.data.forEach((c) => {
        if (c.otherUser) {
          newPresence[c.otherUser.id] = {
            isOnline: c.otherUser.isOnline,
            lastSeen: c.otherUser.lastSeen,
          };
        }
      });
      setPresenceMap((prev) => ({ ...prev, ...newPresence }));
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when activeConversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    api
      .get(`/conversations/${activeConversation.id}/messages`)
      .then((res) => {
        if (isMounted) {
          setMessages(res.data);
          setLoadingMessages(false);

          // Mark messages as read in backend
          const socket = getSocket();
          if (socket) {
            socket.emit('mark_as_read', { conversationId: activeConversation.id });
          }
        }
      })
      .catch((err) => {
        console.error('Error loading messages:', err);
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConversation?.id]);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    // 1. New Message received
    const handleNewMessage = (msg) => {
      const currentActive = activeConvRef.current;

      // Update message list if in active chat
      if (currentActive && currentActive.id === msg.conversationId) {
        setMessages((prev) => [...prev, msg]);
        // Automatically mark as read
        socket.emit('mark_as_read', { conversationId: msg.conversationId });
      }

      // Update conversations list (last message & order)
      setConversations((prev) => {
        const found = prev.find((c) => c.id === msg.conversationId);
        if (found) {
          const updated = {
            ...found,
            lastMessage: msg,
            updatedAt: msg.createdAt,
          };
          return [updated, ...prev.filter((c) => c.id !== msg.conversationId)];
        } else {
          // New conversation created by someone else
          loadConversations();
          return prev;
        }
      });
    };

    // 2. Message status update (delivered - 2 gray ticks)
    const handleMessageStatus = ({ messageId, conversationId, status }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const receipts = m.receipts ? [...m.receipts] : [];
            const existingIdx = receipts.findIndex((r) => r.status === status);
            if (existingIdx === -1) {
              receipts.push({ messageId, status });
            }
            return { ...m, receipts };
          }
          return m;
        })
      );
    };

    // 3. Messages read (2 blue ticks)
    const handleMessagesRead = ({ conversationId, messageIds }) => {
      const currentActive = activeConvRef.current;
      if (currentActive && currentActive.id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (messageIds.includes(m.id)) {
              return {
                ...m,
                receipts: [{ status: 'read' }],
              };
            }
            return m;
          })
        );
      }
    };

    // 4. User typing status
    const handleUserTyping = ({ conversationId, userId, isTyping }) => {
      setTypingMap((prev) => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || {}),
          [userId]: isTyping,
        },
      }));
    };

    // 5. User Presence (online / offline)
    const handleUserPresence = ({ userId, isOnline, lastSeen }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [userId]: { isOnline, lastSeen },
      }));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_status_update', handleMessageStatus);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_presence', handleUserPresence);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status_update', handleMessageStatus);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_presence', handleUserPresence);
    };
  }, [user, loadConversations]);

  // Send message function (Optimistic UI + Socket emit)
  const sendMessage = (content, type = 'text', mediaUrl = null, fileName = null) => {
    if (!activeConversation || !user) return;

    const socket = getSocket();
    if (!socket) return;

    const tempId = 'temp_' + Date.now();
    const optimisticMessage = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user.id,
      content,
      type,
      mediaUrl,
      fileName,
      createdAt: new Date().toISOString(),
      receipts: [], // Empty means pending (Clock icon)
      isPending: true,
      sender: user,
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, optimisticMessage]);

    // Emit via socket
    socket.emit(
      'send_message',
      {
        conversationId: activeConversation.id,
        content,
        type,
        mediaUrl,
        fileName,
        tempId,
      },
      (response) => {
        if (response && response.success) {
          // Replace optimistic pending message with confirmed DB message (Single tick)
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...response.message, isPending: false } : m))
          );

          // Update sidebar conversation item
          setConversations((prev) => {
            const found = prev.find((c) => c.id === activeConversation.id);
            if (found) {
              const updated = {
                ...found,
                lastMessage: response.message,
                updatedAt: response.message.createdAt,
              };
              return [updated, ...prev.filter((c) => c.id !== activeConversation.id)];
            }
            return prev;
          });
        }
      }
    );
  };

  // Start direct conversation with user
  const startDirectChat = async (targetUserId) => {
    try {
      const res = await api.post('/conversations/direct', { targetUserId });
      await loadConversations();
      setActiveConversation(res.data);
      return res.data;
    } catch (err) {
      console.error('Error starting direct chat:', err);
    }
  };

  // Create group chat
  const createGroupChat = async (name, memberIds) => {
    try {
      const res = await api.post('/conversations/group', { name, memberIds });
      await loadConversations();
      setActiveConversation(res.data);
      return res.data;
    } catch (err) {
      console.error('Error creating group chat:', err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation,
        messages,
        loadingMessages,
        sendMessage,
        startDirectChat,
        createGroupChat,
        typingMap,
        presenceMap,
        loadConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
