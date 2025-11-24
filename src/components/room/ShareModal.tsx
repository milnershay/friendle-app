import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Clipboard, Share2, Check, Twitter, MessageCircle } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';

interface ShareModalProps {
  shareText: string;
  onClose: () => void;
  language: Language;
}

export default function ShareModal({ shareText, onClose, language }: ShareModalProps) {
  const t = useTranslation(language);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      toast.success(t.room.copied);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy.');
      console.error('Failed to copy text: ', err);
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Friendle Results',
          text: shareText,
        });
      } catch (err) {
        console.error('Error using Web Share API:', err);
      }
    } else {
      handleCopyToClipboard();
    }
  };

  const encodedShareText = encodeURIComponent(shareText);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedShareText}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedShareText}`;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-800 max-w-md w-full rounded-xl p-6 border border-slate-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close share modal"
        >
          <X size={24} />
        </button>

        <h3 className="text-xl font-bold text-white text-center mb-4">{t.room.shareResults}</h3>

        <div className="bg-slate-900 rounded-lg p-4 mb-5 text-center whitespace-pre-wrap text-sm text-slate-300">
          {shareText}
        </div>

        <div className="flex gap-3 mb-4 justify-center">
            {navigator.share && (
                 <button onClick={handleWebShare} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Share2 size={18} />
                    <span>{t.room.share}</span>
                </button>
            )}
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-center">
                <Twitter size={18} />
                <span>{t.room.tweet}</span>
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] hover:bg-[#20b957] text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-center">
                <MessageCircle size={18} />
                <span>{t.room.whatsapp}</span>
            </a>
        </div>

        <button
          onClick={handleCopyToClipboard}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {isCopied ? <Check size={20} className="text-green-400" /> : <Clipboard size={18} />}
          <span>{isCopied ? t.room.copied : t.room.copyToClipboard}</span>
        </button>
      </div>
    </div>
  );
}
