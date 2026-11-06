import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import {
  MessageSquarePlus,
  Users,
  Search,
  LogOut,
  UserCheck,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import StatusTicks from './StatusTicks';

export default function Sidebar({ onOpenNewChat, onOpenNewGroup, onOpenAuthModal }) {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    presenceMap,
    typingMap,
  } = useChat();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter conversations based on search
  const filteredConversations = conversations.filter((c) => {
    const titleMatch = c.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const messageMatch = c.lastMessage?.content
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    return titleMatch || messageMatch;
  });

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isToday(date) ? format(date, 'HH:mm') : format(date, 'dd/MM/yy');
  };

  return (
    <aside className="w-full md:w-[400px] lg:w-[420px] h-full flex flex-col bg-white border-r border-whatsapp-border select-none">
      {/* 1. Header (User profile & action buttons) */}
      <div className="h-16 px-4 bg-whatsapp-panel flex items-center justify-between border-b border-whatsapp-border shrink-0">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={onOpenAuthModal}
          title="Klik untuk ganti pengguna"
        >
          <div className="relative">
            <img
              src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me'}
              alt={user?.displayName}
              className="w-10 h-10 rounded-full bg-slate-200 border border-black/10 object-cover"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-whatsapp-light rounded-full border-2 border-white" />
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold text-[#111b21] group-hover:text-whatsapp-green transition">
              {user?.displayName}
            </h2>
            <p className="text-[11px] text-whatsapp-muted">@{user?.username}</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-whatsapp-muted">
          <button
            onClick={onOpenNewGroup}
            className="p-2 hover:bg-black/5 rounded-full transition"
            title="Buat Grup Baru"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenNewChat}
            className="p-2 hover:bg-black/5 rounded-full transition"
            title="Chat Baru"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenAuthModal}
            className="p-2 hover:bg-black/5 rounded-full transition"
            title="Pilih / Ganti Akun"
          >
            <UserCheck className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="p-2 hover:bg-black/5 rounded-full transition text-rose-500 hover:text-rose-600"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="p-2 bg-white border-b border-whatsapp-border shrink-0">
        <div className="relative flex items-center bg-whatsapp-panel rounded-lg px-3 py-1.5 focus-within:bg-white focus-within:shadow-sm focus-within:ring-1 focus-within:ring-whatsapp-green transition">
          <Search className="w-4 h-4 text-whatsapp-muted shrink-0 mr-3" />
          <input
            type="text"
            placeholder="Cari atau mulai chat baru"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-[#111b21] placeholder-whatsapp-muted focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-whatsapp-border/40">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <p className="text-sm text-whatsapp-muted">Belum ada obrolan</p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 px-4 py-1.5 bg-whatsapp-green text-white text-xs font-medium rounded-full shadow hover:bg-whatsapp-dark transition"
            >
              Mulai Chat Baru
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = activeConversation?.id === conv.id;
            const otherUserPresence = conv.otherUser
              ? presenceMap[conv.otherUser.id]
              : null;
            const isOnline = otherUserPresence?.isOnline;

            // Check if anyone is typing in this conversation
            const isSomeoneTyping =
              typingMap[conv.id] &&
              Object.entries(typingMap[conv.id]).some(
                ([uid, typing]) => typing && uid !== user?.id
              );

            const isOwnLastMessage = conv.lastMessage?.senderId === user?.id;

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition ${
                  isSelected ? 'bg-whatsapp-panel' : 'hover:bg-[#f5f6f6]'
                }`}
              >
                {/* Avatar with online dot */}
                <div className="relative shrink-0">
                  <img
                    src={
                      conv.avatar ||
                      'https://api.dicebear.com/7.x/identicon/svg?seed=' + conv.id
                    }
                    alt={conv.title}
                    className="w-12 h-12 rounded-full bg-slate-200 border border-black/5 object-cover"
                  />
                  {!conv.isGroup && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-whatsapp-light rounded-full border-2 border-white shadow-sm" />
                  )}
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-medium text-[#111b21] truncate">
                      {conv.title || 'Percakapan'}
                    </h3>
                    <span className="text-[11px] text-whatsapp-muted shrink-0 ml-2">
                      {formatMessageTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                    </span>
                  </div>

                  {/* Subtitle / Last Message or Typing */}
                  <div className="flex items-center text-xs text-whatsapp-muted truncate">
                    {isSomeoneTyping ? (
                      <span className="text-whatsapp-green font-medium animate-pulse">
                        sedang mengetik...
                      </span>
                    ) : conv.lastMessage ? (
                      <div className="flex items-center truncate">
                        {isOwnLastMessage && (
                          <StatusTicks
                            isPending={conv.lastMessage.isPending}
                            receipts={conv.lastMessage.receipts}
                            isOwnMessage={true}
                          />
                        )}
                        {conv.lastMessage.type === 'image' ? (
                          <span className="flex items-center gap-1 ml-1 truncate">
                            <ImageIcon className="w-3.5 h-3.5" /> Foto
                          </span>
                        ) : (
                          <span className="ml-1 truncate">
                            {conv.lastMessage.content}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="italic text-whatsapp-muted/70">
                        Belum ada pesan
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
