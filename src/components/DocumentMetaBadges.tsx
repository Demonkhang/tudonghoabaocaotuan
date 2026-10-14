import React from 'react';
import {
  FileText,
  Calendar,
  Hash,
  Clock,
  Building2,
  Tag,
  UserCheck,
  Building,
  AlertCircle,
  Bookmark
} from 'lucide-react';

/**
 * Decode common HTML entities like &#37; -> %
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#37;/g, '%')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export interface ExtractedDocMeta {
  soDen?: string;
  ngayDen?: string;
  soKyHieu?: string;
  ngayBanHanh?: string;
  tacGia?: string;
  loaiVB?: string;
  linhVuc?: string;
  xuLyChinh?: string;
  donViNhan?: string;
  doKhan?: string;
  cleanText?: string;
  hasMeta: boolean;
}

/**
 * Parses document metadata from raw string containing tags like:
 * 📌 **Số đến:** 5750  🗓️ **Ngày đến:** 19/09/2026 ...
 */
export function parseDocumentMeta(text: string): ExtractedDocMeta {
  if (!text) {
    return { hasMeta: false, cleanText: '' };
  }

  const raw = decodeHtmlEntities(text);

  // Quick check if metadata markers exist
  const hasMarker = /Số đến|Ngày đến|Số\/Ký hiệu|Ngày ban hành|Cơ quan\/Tác giả|Loại văn bản|Lĩnh vực|Xử lý chính/i.test(raw);
  if (!hasMarker) {
    // Strip orphan markdown asterisks
    const cleaned = raw.replace(/\*\*/g, '').trim();
    return { hasMeta: false, cleanText: cleaned };
  }

  const getMatch = (regex: RegExp): string | undefined => {
    const match = raw.match(regex);
    return match && match[1] ? match[1].trim() : undefined;
  };

  const soDen = getMatch(/📌?\s*\*{0,2}Số đến:\*{0,2}\s*([^📍🗓️📅📄📆🏛️📋🏷️👤🏢\n*]+)/i);
  const ngayDen = getMatch(/🗓️?\s*\*{0,2}Ngày đến:\*{0,2}\s*([^📌📍📄📆🏛️📋🏷️👤🏢\n*]+)/i);
  const soKyHieu = getMatch(/📄?\s*\*{0,2}(?:Số\/Ký hiệu VB|Số\/Ký hiệu|Số ký hiệu):\*{0,2}\s*([^📌🗓️📅📆🏛️📋🏷️👤🏢\n*]+)/i);
  const ngayBanHanh = getMatch(/📆?\s*\*{0,2}(?:Ngày ban hành|Ngày VB|Ngày văn bản):\*{0,2}\s*([^📌🗓️📅📄🏛️📋🏷️👤🏢\n*]+)/i);
  const tacGia = getMatch(/🏛️?\s*\*{0,2}(?:Cơ quan\/Tác giả|Tác giả|Nơi gửi):\*{0,2}\s*([^📌🗓️📅📄📆📋🏷️👤🏢\n*]+)/i);
  const loaiVB = getMatch(/📋?\s*\*{0,2}Loại văn bản:\*{0,2}\s*([^📌🗓️📅📄📆🏛️🏷️👤🏢\n*]+)/i);
  const linhVuc = getMatch(/🏷️?\s*\*{0,2}Lĩnh vực:\*{0,2}\s*([^📌🗓️📅📄📆🏛️📋👤🏢\n*]+)/i);
  const xuLyChinh = getMatch(/👤?\s*\*{0,2}Xử lý chính:\*{0,2}\s*([^📌🗓️📅📄📆🏛️📋🏷️🏢\n*]+)/i);
  const donViNhan = getMatch(/🏢?\s*\*{0,2}(?:Đơn vị\/Người nhận|Đơn vị nhận|Người nhận):\*{0,2}\s*([^📌🗓️📅📄📆🏛️📋🏷️👤\n*]+)/i);

  // Remove meta blocks to leave clean non-meta description if any
  let cleanText = raw
    .replace(/📌?\s*\*{0,2}Số đến:\*{0,2}\s*[^📍🗓️📅📄📆🏛️📋🏷️👤🏢\n*]+/gi, '')
    .replace(/🗓️?\s*\*{0,2}Ngày đến:\*{0,2}\s*[^📌📍📄📆🏛️📋🏷️👤🏢\n*]+/gi, '')
    .replace(/📄?\s*\*{0,2}(?:Số\/Ký hiệu VB|Số\/Ký hiệu|Số ký hiệu):\*{0,2}\s*[^📌🗓️📅📆🏛️📋🏷️👤🏢\n*]+/gi, '')
    .replace(/📆?\s*\*{0,2}(?:Ngày ban hành|Ngày VB|Ngày văn bản):\*{0,2}\s*[^📌🗓️📅📄🏛️📋🏷️👤🏢\n*]+/gi, '')
    .replace(/🏛️?\s*\*{0,2}(?:Cơ quan\/Tác giả|Tác giả|Nơi gửi):\*{0,2}\s*[^📌🗓️📅📄📆📋🏷️👤🏢\n*]+/gi, '')
    .replace(/📋?\s*\*{0,2}Loại văn bản:\*{0,2}\s*[^📌🗓️📅📄📆🏛️🏷️👤🏢\n*]+/gi, '')
    .replace(/🏷️?\s*\*{0,2}Lĩnh vực:\*{0,2}\s*[^📌🗓️📅📄📆🏛️📋👤🏢\n*]+/gi, '')
    .replace(/👤?\s*\*{0,2}Xử lý chính:\*{0,2}\s*[^📌🗓️📅📄📆🏛️📋🏷️🏢\n*]+/gi, '')
    .replace(/🏢?\s*\*{0,2}(?:Đơn vị\/Người nhận|Đơn vị nhận|Người nhận):\*{0,2}\s*[^📌🗓️📅📄📆🏛️📋🏷️👤\n*]+/gi, '')
    .replace(/\*\*/g, '')
    .trim();

  const hasMeta = Boolean(soDen || ngayDen || soKyHieu || ngayBanHanh || tacGia || loaiVB || linhVuc || xuLyChinh || donViNhan);

  return {
    soDen,
    ngayDen,
    soKyHieu,
    ngayBanHanh,
    tacGia,
    loaiVB,
    linhVuc,
    xuLyChinh,
    donViNhan,
    cleanText: cleanText.length > 0 ? cleanText : undefined,
    hasMeta
  };
}

interface DocumentMetaBadgesProps {
  content?: string;
  className?: string;
  compact?: boolean;
}

export const DocumentMetaBadges: React.FC<DocumentMetaBadgesProps> = ({
  content,
  className = '',
  compact = false
}) => {
  if (!content) return null;

  const meta = parseDocumentMeta(content);

  if (!meta.hasMeta && !meta.cleanText) {
    return null;
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Clean text description if present */}
      {meta.cleanText && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
          {meta.cleanText}
        </div>
      )}

      {/* Meta Badge Chips */}
      {meta.hasMeta && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {/* Số đến */}
          {meta.soDen && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/70 shadow-2xs"
              title={`Số văn bản đến: ${meta.soDen}`}
            >
              <FileText className="w-3 h-3 text-cyan-500 shrink-0" />
              <span>Số đến:</span>
              <strong className="font-black text-cyan-900 dark:text-cyan-100">{meta.soDen}</strong>
            </span>
          )}

          {/* Ngày đến */}
          {meta.ngayDen && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/70 shadow-2xs"
              title={`Ngày nhận văn bản: ${meta.ngayDen}`}
            >
              <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
              <span>Ngày đến:</span>
              <strong className="font-black text-blue-900 dark:text-blue-100">{meta.ngayDen}</strong>
            </span>
          )}

          {/* Số / Ký hiệu VB */}
          {meta.soKyHieu && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/70 shadow-2xs"
              title={`Số / Ký hiệu văn bản: ${meta.soKyHieu}`}
            >
              <Hash className="w-3 h-3 text-purple-500 shrink-0" />
              <span>Số/KH:</span>
              <strong className="font-black text-purple-900 dark:text-purple-100">{meta.soKyHieu}</strong>
            </span>
          )}

          {/* Ngày ban hành */}
          {meta.ngayBanHanh && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70 shadow-2xs"
              title={`Ngày ban hành văn bản: ${meta.ngayBanHanh}`}
            >
              <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>Ban hành:</span>
              <strong className="font-black text-emerald-900 dark:text-emerald-100">{meta.ngayBanHanh}</strong>
            </span>
          )}

          {/* Cơ quan / Tác giả */}
          {meta.tacGia && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/70 shadow-2xs max-w-[240px] truncate"
              title={`Nơi phát hành / Tác giả: ${meta.tacGia}`}
            >
              <Building2 className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Cơ quan:</span>
              <strong className="font-black text-amber-900 dark:text-amber-100 truncate">{meta.tacGia}</strong>
            </span>
          )}

          {/* Xử lý chính */}
          {meta.xuLyChinh && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/70 shadow-2xs"
              title={`Người xử lý chính: ${meta.xuLyChinh}`}
            >
              <UserCheck className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>Xử lý:</span>
              <strong className="font-black text-indigo-900 dark:text-indigo-100">{meta.xuLyChinh}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
