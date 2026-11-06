import React from 'react';
import { Clock, Check, CheckCheck } from 'lucide-react';

export default function StatusTicks({ isPending, receipts = [], isOwnMessage }) {
  if (!isOwnMessage) return null;

  if (isPending) {
    return <Clock className="w-3.5 h-3.5 text-whatsapp-muted inline ml-1 opacity-70" />;
  }

  // Check if any receipt has status 'read'
  const isRead = receipts.some((r) => r.status === 'read');
  if (isRead) {
    return <CheckCheck className="w-4 h-4 text-whatsapp-check-blue inline ml-1 stroke-[2.2]" />;
  }

  // Check if any receipt has status 'delivered'
  const isDelivered = receipts.some((r) => r.status === 'delivered');
  if (isDelivered) {
    return <CheckCheck className="w-4 h-4 text-whatsapp-check-gray inline ml-1 stroke-[2]" />;
  }

  // Fallback: Message is sent to server
  return <Check className="w-4 h-4 text-whatsapp-check-gray inline ml-1 stroke-[2]" />;
}
