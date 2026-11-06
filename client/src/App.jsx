import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useChat } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import NewChatModal from './components/NewChatModal';
import AuthModal from './components/AuthModal';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const { activeConversation, setActiveConversation } = useChat();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState('direct');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-whatsapp-panel text-[#111b21]">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
          alt="WhatsApp"
          className="w-16 h-16 mb-4 animate-bounce"
        />
        <div className="flex items-center gap-2 text-sm text-whatsapp-muted font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-whatsapp-green" /> Memuat WhatsApp Web...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#d1d7db] flex items-center justify-center relative overflow-hidden">
        {/* Top green bar */}
        <div className="absolute top-0 left-0 w-full h-32 bg-whatsapp-green -z-0" />
        <AuthModal isOpen={true} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#d1d7db] flex items-center justify-center relative overflow-hidden p-0 md:p-3 lg:p-4">
      {/* Top green background banner (WhatsApp Web signature look) */}
      <div className="absolute top-0 left-0 w-full h-32 bg-whatsapp-green -z-0" />

      {/* Main App Container */}
      <div className="relative z-10 w-full h-full max-w-[1600px] bg-white rounded-none md:rounded-xl shadow-2xl flex overflow-hidden border border-black/10">
        {/* Mobile back button when in active chat */}
        {activeConversation && (
          <button
            onClick={() => setActiveConversation(null)}
            className="md:hidden absolute top-4 left-3 z-30 p-1.5 bg-white/80 rounded-full shadow"
          >
            <ArrowLeft className="w-5 h-5 text-whatsapp-dark" />
          </button>
        )}

        {/* Sidebar */}
        <div
          className={`${
            activeConversation ? 'hidden md:flex' : 'flex'
          } w-full md:w-auto h-full shrink-0`}
        >
          <Sidebar
            onOpenNewChat={() => {
              setNewChatTab('direct');
              setIsNewChatOpen(true);
            }}
            onOpenNewGroup={() => {
              setNewChatTab('group');
              setIsNewChatOpen(true);
            }}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        </div>

        {/* Chat Area */}
        <div
          className={`${
            activeConversation ? 'flex' : 'hidden md:flex'
          } flex-1 h-full`}
        >
          <ChatArea />
        </div>
      </div>

      {/* Modals */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        initialTab={newChatTab}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
