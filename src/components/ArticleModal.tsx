import React from 'react';
import { X, Calendar, User, Download, Share2, CheckCircle2, Paperclip } from 'lucide-react';
import { NewsArticle } from '../types';
import { downloadCircularDocument } from '../utils/documentGenerators';

interface ArticleModalProps {
  article: NewsArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  article,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative aspect-16/9 bg-slate-900">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <span className="bg-[#176B37] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block mb-2">
              {article.category}
            </span>
            <h3 className="text-lg sm:text-2xl font-bold leading-tight">
              {article.title}
            </h3>
          </div>
        </div>

        {/* Article Meta Strip */}
        <div className="px-6 py-3 border-b border-[#E5E7EB] bg-gray-50 flex flex-wrap items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#176B37]" />
              {article.date}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#176B37]" />
              {article.author}
            </span>
          </div>

          <button
            onClick={() => downloadCircularDocument(article)}
            className="text-xs font-semibold text-[#176B37] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Official Circular (PDF)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#252525] leading-relaxed">
          <p className="font-semibold text-gray-900 text-sm sm:text-base">
            {article.excerpt}
          </p>

          <div className="whitespace-pre-line text-gray-700 space-y-3">
            {article.content}
          </div>

          {article.attachmentName && (
            <div className="p-3.5 bg-[#EAF3ED] rounded-xl border border-[#176B37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#176B37]/20 flex items-center justify-center text-[#176B37] shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-[#14532D] truncate">
                    Attached Document: {article.attachmentName}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {article.attachmentSize || 'Annexure'} • Uploaded Official Device File
                  </p>
                </div>
              </div>

              <a
                href={article.attachmentData || '#'}
                download={article.attachmentName}
                className="px-3.5 py-2 bg-[#176B37] hover:bg-[#14532D] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Attachment</span>
              </a>
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl bg-[#EAF3ED] border border-[#176B37]/20 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-[#14532D]">AMMON National Secretariat</span>
              <p className="text-[11px] text-gray-600">Official Gazette Ref: AMMON/PUB/2025/VOL-IV</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Circular link copied to clipboard.');
              }}
              className="px-3 py-1.5 bg-white border border-[#176B37] text-[#176B37] font-semibold text-xs rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
