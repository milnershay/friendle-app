import { Share2 } from "lucide-react";
import { useTranslation, Language } from "@/lib/i18n";

interface ShareButtonProps {
    onClick: () => void;
    className?: string;
    language: Language;
}

export default function ShareButton({ onClick, className, language }: ShareButtonProps) {
    const t = useTranslation(language);
    return (
        <button
            onClick={onClick}
            className={`bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2 ${className}`}
            aria-label={t.room.shareResults}
        >
            <Share2 size={18} />
            <span>{t.room.share}</span>
        </button>
    );
}
