import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getSocket } from '../services/socket';
import api from '../services/api';
import MessageItem from './MessageItem';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Search,
  X,
  Loader2,
  Lock,
} from 'lucide-react';
import { format, isToday } from 'date-fns';

const QUICK_EMOJIS = ['😊', '😂', '❤️', '👍', '🙏', '🔥', '🎉', '😍', '👋', '😎', '🤔', '✨'];

export default function ChatArea() {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    loadingMessages,
    sendMessage,
    presenceMap,
    typingMap,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, filePreview]);

  // Handle typing throttling (Fase 2)
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    const socket = getSocket();
    if (!socket || !activeConversation) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', {
        conversationId: activeConversation.id,
        isTyping: true,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing', {
        conversationId: activeConversation.id,
        isTyping: false,
      });
    }, 2500);
  };

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    const socket = getSocket();
    if (socket && isTypingRef.current && activeConversation) {
      isTypingRef.current = false;
      clearTimeout(typingTimeoutRef.current);
      socket.emit('typing', {
        conversationId: activeConversation.id,
        isTyping: false,
      });
    }

    // If file is attached, upload via REST first
    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const { url, type, fileName } = uploadRes.data;
        sendMessage(inputText.trim(), type, url, fileName);
        clearSelectedFile();
        setInputText('');
      } catch (err) {
        console.error('File upload failed:', err);
        alert('Gagal mengunggah file!');
      } finally {
        setUploading(false);
      }
    } else {
      // Pure text message
      sendMessage(inputText.trim(), 'text');
      setInputText('');
    }
  };

  if (!activeConversation) {
    return (
      <main className="flex-1 hidden md:flex flex-col items-center justify-center bg-whatsapp-panel border-b-4 border-whatsapp-green select-none">
        <div className="max-w-md text-center p-6">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
            alt="WhatsApp"
            className="w-20 h-20 mx-auto opacity-30 mb-6 grayscale"
          />
          <h2 className="text-2xl font-light text-[#41525d] mb-3">
            WhatsApp Web Realtime
          </h2>
          <p className="text-sm text-whatsapp-muted leading-relaxed mb-6">
            Kirim dan terima pesan secara instan antar pengguna. Nikmati pengalaman
            chat interaktif dengan status online, indikator mengetik, dan tanda centang dibaca.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs text-whatsapp-muted/70">
            <Lock className="w-3.5 h-3.5" /> Terenkripsi & realtime socket
          </div>
        </div>
      </main>
    );
  }

  // Header status calculation
  const otherUser = activeConversation.otherUser;
  const presence = otherUser ? presenceMap[otherUser.id] : null;
  const isOnline = presence?.isOnline;

  const isOtherTyping =
    typingMap[activeConversation.id] &&
    Object.entries(typingMap[activeConversation.id]).some(
      ([uid, typing]) => typing && uid !== user?.id
    );

  const getStatusText = () => {
    if (isOtherTyping) return 'sedang mengetik...';
    if (activeConversation.isGroup) {
      return `${activeConversation.members?.length || 0} anggota`;
    }
    if (isOnline) return 'online';
    if (presence?.lastSeen) {
      const date = new Date(presence.lastSeen);
      const timeStr = format(date, 'HH:mm');
      return isToday(date)
        ? `terakhir dilihat hari ini pukul ${timeStr}`
        : `terakhir dilihat ${format(date, 'dd/MM/yy')} pukul ${timeStr}`;
    }
    return 'offline';
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden select-none">
      {/* 1. Chat Header */}
      <header className="h-16 px-4 bg-whatsapp-panel flex items-center justify-between border-b border-whatsapp-border shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={
                activeConversation.avatar ||
                'https://api.dicebear.com/7.x/identicon/svg?seed=' + activeConversation.id
              }
              alt={activeConversation.title}
              className="w-10 h-10 rounded-full bg-slate-200 border border-black/5 object-cover"
            />
            {!activeConversation.isGroup && isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-whatsapp-light rounded-full border-2 border-white" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#111b21] truncate">
              {activeConversation.title}
            </h2>
            <p
              className={`text-xs truncate ${
                isOtherTyping
                  ? 'text-whatsapp-green font-medium animate-pulse'
                  : 'text-whatsapp-muted'
              }`}
            >
              {getStatusText()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-whatsapp-muted">
          <button className="p-2 hover:bg-black/5 rounded-full transition" title="Cari di chat">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition" title="Opsi lainnya">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Chat Messages Area */}
      <div className="flex-1 chat-bg overflow-y-auto px-4 md:px-8 py-4 relative">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-whatsapp-green animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow-sm text-xs text-whatsapp-muted max-w-sm">
              Kirim pesan pertama Anda untuk memulai percakapan realtime ini!
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isGroup={activeConversation.isGroup}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Attachment Preview Banner */}
      {selectedFile && (
        <div className="p-3 bg-white border-t border-whatsapp-border flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="w-12 h-12 object-cover rounded border"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                <Paperclip className="w-6 h-6 text-whatsapp-muted" />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-[#111b21] truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-whatsapp-muted">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={clearSelectedFile}
            className="p-1 hover:bg-black/5 rounded-full text-whatsapp-muted hover:text-rose-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 4. Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="bg-white border-t border-whatsapp-border px-4 py-2 flex items-center gap-2 overflow-x-auto z-10 shadow-inner">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputText((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="text-xl hover:scale-125 transition px-1.5 py-0.5 rounded hover:bg-slate-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 5. Message Input Bar */}
      <footer className="min-h-16 px-4 py-2 bg-whatsapp-panel flex items-center gap-2 border-t border-whatsapp-border shrink-0 z-10">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className={`p-2 rounded-full transition ${
            showEmojiPicker ? 'text-whatsapp-green bg-black/5' : 'text-whatsapp-muted hover:bg-black/5'
          }`}
          title="Emoji"
        >
          <Smile className="w-6 h-6" />
        </button>

        {/* Attachment button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-black/5 rounded-full text-whatsapp-muted transition"
          title="Lampirkan File / Gambar"
        >
          <Paperclip className="w-6 h-6" />
        </button>

        {/* Text Input */}
        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ketik pesan..."
            value={inputText}
            onChange={handleInputChange}
            className="w-full bg-white text-sm text-[#111b21] rounded-lg px-4 py-2.5 placeholder-whatsapp-muted focus:outline-none shadow-sm"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedFile) || uploading}
            className={`p-2.5 rounded-full text-white transition shrink-0 ${
              inputText.trim() || selectedFile
                ? 'bg-whatsapp-green hover:bg-whatsapp-dark shadow'
                : 'bg-whatsapp-muted/40 cursor-not-allowed'
            }`}
            title="Kirim"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 fill-current" />
            )}
          </button>
        </form>
      </footer>
    </main>
  );
}
