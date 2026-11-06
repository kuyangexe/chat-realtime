import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useChat } from '../context/ChatContext';
import { X, Search, Check, Users, MessageSquare, Loader2 } from 'lucide-react';

export default function NewChatModal({ isOpen, onClose, initialTab = 'direct' }) {
  const { startDirectChat, createGroupChat } = useChat();
  const [tab, setTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    api
      .get('/auth/users')
      .then((res) => {
        setUsers(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load users:', err);
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    const nameMatch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const usernameMatch = u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || usernameMatch;
  });

  const handleSelectDirect = async (targetUserId) => {
    await startDirectChat(targetUserId);
    onClose();
  };

  const toggleSelectUserForGroup = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    setCreatingGroup(true);
    try {
      await createGroupChat(groupName.trim(), selectedUserIds);
      setGroupName('');
      setSelectedUserIds([]);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal membuat grup');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-whatsapp-dark text-white p-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {tab === 'direct' ? 'Mulai Chat Baru' : 'Buat Grup Baru'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-whatsapp-border text-sm font-medium">
          <button
            onClick={() => setTab('direct')}
            className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              tab === 'direct'
                ? 'border-whatsapp-green text-whatsapp-green'
                : 'border-transparent text-whatsapp-muted hover:text-black'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Chat Personal
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              tab === 'group'
                ? 'border-whatsapp-green text-whatsapp-green'
                : 'border-transparent text-whatsapp-muted hover:text-black'
            }`}
          >
            <Users className="w-4 h-4" /> Grup Baru
          </button>
        </div>

        {/* Group Name input if tab === 'group' */}
        {tab === 'group' && (
          <div className="p-3 bg-whatsapp-panel border-b border-whatsapp-border">
            <input
              type="text"
              placeholder="Ketik nama subjek grup..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-white px-3 py-2 text-sm rounded-lg border border-whatsapp-border focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
            />
            {selectedUserIds.length > 0 && (
              <p className="text-xs text-whatsapp-muted mt-2">
                {selectedUserIds.length} anggota terpilih
              </p>
            )}
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b border-whatsapp-border">
          <div className="flex items-center bg-whatsapp-panel rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-whatsapp-muted mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Cari pengguna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto divide-y divide-whatsapp-border/40 p-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 text-whatsapp-green animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-8 text-sm text-whatsapp-muted">
              Tidak ada pengguna lain ditemukan
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUserIds.includes(u.id);

              return (
                <div
                  key={u.id}
                  onClick={() =>
                    tab === 'direct'
                      ? handleSelectDirect(u.id)
                      : toggleSelectUserForGroup(u.id)
                  }
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-whatsapp-panel cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      className="w-10 h-10 rounded-full bg-slate-200 border object-cover"
                    />
                    <div className="truncate">
                      <h4 className="text-sm font-medium text-[#111b21] truncate">
                        {u.displayName}
                      </h4>
                      <p className="text-xs text-whatsapp-muted truncate">{u.about}</p>
                    </div>
                  </div>

                  {tab === 'group' && (
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-whatsapp-green border-whatsapp-green text-white'
                          : 'border-whatsapp-muted/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Group Submit Button */}
        {tab === 'group' && (
          <div className="p-3 bg-whatsapp-panel border-t border-whatsapp-border flex justify-end">
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUserIds.length === 0 || creatingGroup}
              className="px-5 py-2 bg-whatsapp-green hover:bg-whatsapp-dark text-white text-sm font-medium rounded-lg shadow disabled:opacity-50 transition"
            >
              {creatingGroup ? 'Membuat...' : 'Buat Grup'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
