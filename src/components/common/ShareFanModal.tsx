import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink, X, Smartphone, Wifi, Shield } from 'lucide-react';

interface ShareFanModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
}

export const ShareFanModal: React.FC<ShareFanModalProps> = ({
  isOpen,
  onClose,
  eventName,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  if (!isOpen) return null;

  // Clean fan-only link with ?mode=fan query parameter
  const origin = window.location.origin;
  const fanLink = `${origin}/?mode=fan`;

  const announcementMessage = `🏆 SPORTS CLUB IIM RAIPUR\nOfficial Fan & Live Scores Portal for ${eventName}\n\n👉 View live match scores, standings, and upcoming fixtures here:\n${fanLink}\n\nRegards,\nSports Club`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fanLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyAnnouncement = () => {
    navigator.clipboard.writeText(announcementMessage);
    setCopiedBroadcast(true);
    setTimeout(() => setCopiedBroadcast(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(announcementMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 sm:p-7 my-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Share Fan Portal with Students
            </h3>
            <p className="text-xs text-slate-400">
              Fans only see live scores and standings. Admin panel is locked.
            </p>
          </div>
        </div>

        {/* Security Assurance Badge */}
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <b>Protected Fan Mode:</b> Fans using this link cannot edit tournament scores, modify fixtures, or delete teams.
          </span>
        </div>

        {/* Link Field */}
        <div className="space-y-2 mb-4">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Protected Fan Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fanLink}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Ready-to-send WhatsApp Announcement */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Ready WhatsApp Batch Announcement</span>
            <button
              onClick={handleCopyAnnouncement}
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedBroadcast ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-line font-sans leading-relaxed">
            {announcementMessage}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Broadcast on WhatsApp</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
