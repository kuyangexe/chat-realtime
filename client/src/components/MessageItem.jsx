import React from 'react';
import { format } from 'date-fns';
import StatusTicks from './StatusTicks';
import { useAuth } from '../context/AuthContext';
import { FileText, Download } from 'lucide-react';

export default function MessageItem({ message, isGroup }) {
  const { user } = useAuth();
  const isOwnMessage = message.senderId === user?.id;

  const formattedTime = message.createdAt
    ? format(new Date(message.createdAt), 'HH:mm')
    : '';

  const mediaSource = message.mediaUrl;

  return (
    <div
      className={`flex flex-col mb-1.5 ${
        isOwnMessage ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`relative max-w-[85%] md:max-w-[65%] rounded-lg px-2.5 py-1.5 shadow-sm text-sm break-words select-text ${
          isOwnMessage
            ? 'bg-whatsapp-bubble-out rounded-tr-none text-[#111b21]'
            : 'bg-whatsapp-bubble-in rounded-tl-none text-[#111b21]'
        }`}
      >
        {/* In group chats, display sender's name */}
        {isGroup && !isOwnMessage && (
          <p className="text-xs font-semibold text-whatsapp-dark mb-0.5">
            {message.sender?.displayName || 'User'}
          </p>
        )}

        {/* Image Attachment */}
        {message.type === 'image' && mediaSource && (
          <div className="mb-1 rounded overflow-hidden max-w-sm">
            <img
              src={mediaSource}
              alt="Media"
              className="w-full h-auto max-h-72 object-cover rounded cursor-pointer hover:opacity-95 transition"
              onClick={() => window.open(mediaSource, '_blank')}
            />
          </div>
        )}

        {/* File Attachment */}
        {message.type === 'file' && mediaSource && (
          <div className="flex items-center gap-2 p-2 mb-1 bg-black/5 rounded">
            <FileText className="w-6 h-6 text-whatsapp-dark" />
            <div className="flex-1 truncate">
              <p className="text-xs font-medium truncate">{message.fileName || 'Berkas'}</p>
            </div>
            <a
              href={mediaSource}
              target="_blank"
              rel="noreferrer"
              download
              className="p-1 hover:bg-black/10 rounded"
            >
              <Download className="w-4 h-4 text-whatsapp-muted" />
            </a>
          </div>
        )}

        {/* Text Message Content */}
        {message.content && (
          <p className="whitespace-pre-wrap leading-relaxed inline">
            {message.content}
          </p>
        )}

        {/* Timestamp and Status Ticks */}
        <span className="float-right ml-3 mt-1 inline-flex items-center text-[10.5px] text-whatsapp-muted select-none">
          {formattedTime}
          <StatusTicks
            isPending={message.isPending}
            receipts={message.receipts}
            isOwnMessage={isOwnMessage}
          />
        </span>
      </div>
    </div>
  );
}
