import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Video,
  Send,
  Paperclip,
  Image as ImageIcon,
  AtSign,
  Smile,
  Heart,
  ThumbsUp,
  Reply,
  X,
  Check,
  CheckCheck,
  Search,
  Users,
  Mic,
  MicOff,
  VideoOff,
  MonitorUp,
  Hand,
  PhoneOff,
  Calendar,
  Clock,
  Plus,
  Copy,
  Download,
  FileText,
  ArrowLeft,
  Radio,
  Sparkles,
  ShieldCheck,
  Crown
} from 'lucide-react';
import { Member, AdminUser, SocialMessage, OnlineMeeting } from '../types';
import { SOCIAL_CHANNELS, ADMIN_USERS } from '../data/mockData';

export type SocialSpaceTab = 'chat' | 'meetings';

interface CurrentParticipant {
  id: string;
  name: string;
  role: string;
  badge: string;
  avatar?: string;
}

interface SocialSpaceWorkspaceProps {
  currentUser: CurrentParticipant;
  members: Member[];
  messages: SocialMessage[];
  meetings: OnlineMeeting[];
  onSendMessage: (msg: SocialMessage) => void;
  onUpdateMessage: (id: string, updates: Partial<SocialMessage>) => void;
  onCreateMeeting: (meeting: OnlineMeeting) => void;
  onUpdateMeeting: (id: string, updates: Partial<OnlineMeeting>) => void;
  initialTab?: SocialSpaceTab;
  onClose?: () => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '👏', '✅', '😂'];

async function compressImageFile(file: File): Promise<{ dataUrl: string; sizeLabel: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: e.target?.result as string,
            sizeLabel: `${Math.round(file.size / 1024)} KB`,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        const approxKb = Math.max(12, Math.round((compressed.length * 0.75) / 1024));
        resolve({
          dataUrl: compressed,
          sizeLabel: `${approxKb} KB`,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const SocialSpaceWorkspace: React.FC<SocialSpaceWorkspaceProps> = ({
  currentUser,
  members,
  messages,
  meetings,
  onSendMessage,
  onUpdateMessage,
  onCreateMeeting,
  onUpdateMeeting,
  initialTab = 'chat',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SocialSpaceTab>(initialTab);
  const [activeChannelId, setActiveChannelId] = useState<string>(SOCIAL_CHANNELS[0].id);
  const [mobileShowThread, setMobileShowThread] = useState<boolean>(false);
  const [channelSearch, setChannelSearch] = useState('');

  // Composer state
  const [draftText, setDraftText] = useState('');
  const [replyingTo, setReplyingTo] = useState<SocialMessage | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    name: string;
    type: string;
    size: string;
    data: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [openPickerMsgId, setOpenPickerMsgId] = useState<string | null>(null);
  const [showEmojiComposer, setShowEmojiComposer] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);

  // @ Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Meetings state
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingCategory, setNewMeetingCategory] = useState<OnlineMeeting['category']>('State Chapter Townhall');
  const [newMeetingDate, setNewMeetingDate] = useState('Today');
  const [newMeetingTime, setNewMeetingTime] = useState('04:00 PM WAT');
  const [newMeetingAgenda, setNewMeetingAgenda] = useState('');
  const [copiedMeetCode, setCopiedMeetCode] = useState(false);

  // WebRTC / Local Media state inside Live Meeting Room
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaNotice, setMediaNotice] = useState('');
  const [meetingChatText, setMeetingChatText] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // All taggable AMMON participants (Admins + Registered Members)
  const taggablePeople = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; badge: string }>();
    ADMIN_USERS.forEach((a) => {
      map.set(a.fullName.toLowerCase(), {
        id: a.id,
        name: a.fullName,
        role: a.role,
        badge: a.badgeNumber,
      });
    });
    members.forEach((m) => {
      if (!map.has(m.fullName.toLowerCase())) {
        map.set(m.fullName.toLowerCase(), {
          id: m.id,
          name: m.fullName,
          role: m.category === 'Super Agents' ? 'Super Agent' : 'POS Agent',
          badge: m.membershipId,
        });
      }
    });
    return Array.from(map.values());
  }, [members]);

  const mentionSuggestions = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return taggablePeople
      .filter((p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, taggablePeople]);

  const activeChannel = SOCIAL_CHANNELS.find((c) => c.id === activeChannelId) || SOCIAL_CHANNELS[0];
  const channelMessages = messages.filter((m) => m.channelId === activeChannelId);

  const activeMeeting = meetings.find((m) => m.id === activeMeetingId) || null;
  const liveMeetingsCount = meetings.filter((m) => m.status === 'Live').length;

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [channelMessages.length, activeChannelId, activeTab]);

  // Cleanup media streams on unmount or leaving meeting
  const stopLocalMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamOn(false);
    setScreenSharing(false);
  };

  useEffect(() => {
    return () => {
      stopLocalMedia();
    };
  }, []);

  const handleToggleCamera = async () => {
    setMediaNotice('');
    if (camOn) {
      stopLocalMedia();
      return;
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMediaNotice('Camera API unavailable in this browser context. Audio/Chat conference mode active.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamOn(true);
      setScreenSharing(false);
    } catch {
      setMediaNotice('Camera permission blocked or no webcam detected. Showing your AMMON verified avatar tile.');
    }
  };

  const handleToggleScreenShare = async () => {
    setMediaNotice('');
    if (screenSharing) {
      stopLocalMedia();
      return;
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setMediaNotice('Screen sharing is not supported in this browser preview.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScreenSharing(true);
      setCamOn(false);
      stream.getVideoTracks()[0].onended = () => {
        setScreenSharing(false);
      };
    } catch {
      setMediaNotice('Screen share cancelled or blocked by browser.');
    }
  };

  // Composer change with @ mention detection
  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setDraftText(val);

    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    if (lastAt >= 0) {
      const prevChar = lastAt > 0 ? textBeforeCursor[lastAt - 1] : ' ';
      const afterAt = textBeforeCursor.slice(lastAt + 1);
      if ((prevChar === ' ' || lastAt === 0) && !afterAt.includes('\n') && afterAt.length <= 28) {
        setMentionQuery(afterAt);
        setMentionStartIndex(lastAt);
        return;
      }
    }
    setMentionQuery(null);
    setMentionStartIndex(-1);
  };

  const handleInsertMention = (personName: string) => {
    if (mentionStartIndex >= 0) {
      const before = draftText.slice(0, mentionStartIndex);
      const afterAt = draftText.slice(mentionStartIndex + 1 + (mentionQuery?.length || 0));
      const updated = `${before}@${personName} ${afterAt.trimStart()}`;
      setDraftText(updated);
    } else {
      setDraftText((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${personName} `);
    }
    setMentionQuery(null);
    setMentionStartIndex(-1);
    inputRef.current?.focus();
  };

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImageFile(file);
        if (compressed.dataUrl.length > 820000) {
          setUploadError('Image is still too large after compression. Please select a smaller image.');
          return;
        }
        setPendingAttachment({
          name: file.name,
          type: 'image/jpeg',
          size: compressed.sizeLabel,
          data: compressed.dataUrl,
        });
      } else {
        if (file.size > 600 * 1024) {
          setUploadError('Document exceeds 600KB limit for instant chat sync. Please upload a smaller file.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const sizeLabel = file.size > 1024 ? `${Math.round(file.size / 1024)} KB` : `${file.size} B`;
          setPendingAttachment({
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: sizeLabel,
            data: dataUrl,
          });
        };
        reader.readAsDataURL(file);
      }
    } catch {
      setUploadError('Unable to read selected file from device.');
    }
  };

  const extractMentions = (text: string): string[] => {
    const found: string[] = [];
    taggablePeople.forEach((p) => {
      if (text.toLowerCase().includes(`@${p.name.toLowerCase()}`)) {
        found.push(p.name);
      }
    });
    return found;
  };

  const handleSendChat = (e: React.FormEvent, overrideChannelId?: string, overrideText?: string) => {
    e.preventDefault();
    const targetChannel = overrideChannelId || activeChannelId;
    const rawText = overrideText !== undefined ? overrideText : draftText;
    const trimmed = rawText.trim();

    if (!trimmed && !pendingAttachment) return;

    const newMsg: SocialMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channelId: targetChannel,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderBadge: currentUser.badge,
      senderAvatar: currentUser.avatar,
      text: trimmed || (pendingAttachment ? `Shared file: ${pendingAttachment.name}` : ''),
      mentions: extractMentions(trimmed),
      attachmentName: pendingAttachment?.name,
      attachmentType: pendingAttachment?.type,
      attachmentSize: pendingAttachment?.size,
      attachmentData: pendingAttachment?.data,
      replyToId: replyingTo?.id,
      replyToSender: replyingTo?.senderName,
      replyToText: replyingTo?.text?.slice(0, 90),
      likes: [],
      reactions: {},
      timestampLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now(),
    };

    onSendMessage(newMsg);

    if (overrideText !== undefined) {
      setMeetingChatText('');
    } else {
      setDraftText('');
      setPendingAttachment(null);
      setReplyingTo(null);
      setShowEmojiComposer(false);
      setMentionQuery(null);
    }
  };

  const handleToggleLike = (msg: SocialMessage) => {
    const currentLikes = Array.isArray(msg.likes) ? msg.likes : [];
    const alreadyLiked = currentLikes.includes(currentUser.id);
    const updatedLikes = alreadyLiked
      ? currentLikes.filter((id) => id !== currentUser.id)
      : [...currentLikes, currentUser.id];
    onUpdateMessage(msg.id, { likes: updatedLikes });
  };

  const handleToggleReaction = (msg: SocialMessage, emoji: string) => {
    const currentReactions = msg.reactions ? { ...msg.reactions } : {};
    const list = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];
    if (list.includes(currentUser.id)) {
      const next = list.filter((id) => id !== currentUser.id);
      if (next.length === 0) {
        delete currentReactions[emoji];
      } else {
        currentReactions[emoji] = next;
      }
    } else {
      currentReactions[emoji] = [...list, currentUser.id];
    }
    onUpdateMessage(msg.id, { reactions: currentReactions });
    setOpenPickerMsgId(null);
  };

  // Render text with clickable/highlighted @Member mentions
  const renderFormattedMessageText = (text: string, isOwn: boolean) => {
    const sortedNames = [...taggablePeople].sort((a, b) => b.name.length - a.name.length);
    if (sortedNames.length === 0) return <span>{text}</span>;

    const escaped = sortedNames.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(@(?:${escaped.join('|')}))`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      if (part.startsWith('@') && escaped.some((n) => new RegExp(`^@${n}$`, 'i').test(part))) {
        return (
          <span
            key={idx}
            className={`inline-flex items-center font-bold px-1.5 py-0.2 rounded-md mx-0.5 ${
              isOwn
                ? 'bg-[#176B37] text-white'
                : 'bg-[#EAF3ED] text-[#176B37] border border-[#176B37]/20'
            }`}
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  // Meeting handlers
  const handleStartOrScheduleMeeting = (e: React.FormEvent, instantLive: boolean) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;
    const id = `mtg-${Date.now()}`;
    const code = `AMMON-${Math.floor(10000 + Math.random() * 89999)}`;
    const meeting: OnlineMeeting = {
      id,
      title: newMeetingTitle.trim(),
      hostName: currentUser.name,
      hostRole: currentUser.role,
      hostId: currentUser.id,
      category: newMeetingCategory,
      scheduledDate: instantLive ? 'Today' : newMeetingDate,
      scheduledTime: instantLive ? 'Live Now • WAT' : newMeetingTime,
      status: instantLive ? 'Live' : 'Scheduled',
      agenda: newMeetingAgenda.trim() || 'Open AMMON Operator & Directorate briefing.',
      meetingCode: code,
      participants: [currentUser.name],
      raisedHands: [],
      createdAtMs: Date.now(),
    };
    onCreateMeeting(meeting);
    setNewMeetingTitle('');
    setNewMeetingAgenda('');
    setShowScheduleForm(false);
    if (instantLive) {
      setActiveMeetingId(id);
    }
  };

  const handleJoinMeeting = (mtg: OnlineMeeting) => {
    const existingParticipants = Array.isArray(mtg.participants) ? mtg.participants : [];
    const updates: Partial<OnlineMeeting> = {};
    if (!existingParticipants.includes(currentUser.name)) {
      updates.participants = [...existingParticipants, currentUser.name];
    }
    if (mtg.status === 'Scheduled') {
      updates.status = 'Live';
    }
    if (Object.keys(updates).length > 0) {
      onUpdateMeeting(mtg.id, updates);
    }
    setActiveMeetingId(mtg.id);
    setMediaNotice('');
  };

  const handleLeaveMeeting = () => {
    stopLocalMedia();
    setActiveMeetingId(null);
  };

  const handleToggleRaiseHand = (mtg: OnlineMeeting) => {
    const hands = Array.isArray(mtg.raisedHands) ? mtg.raisedHands : [];
    const isRaised = hands.includes(currentUser.name);
    const updated = isRaised ? hands.filter((n) => n !== currentUser.name) : [...hands, currentUser.name];
    onUpdateMeeting(mtg.id, { raisedHands: updated });
  };

  const filteredChannels = SOCIAL_CHANNELS.filter(
    (c) =>
      c.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs text-left">
      {/* Top Workspace Header Strip */}
      <div className="bg-[#14532D] text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            {activeTab === 'chat' ? (
              <MessageSquare className="w-5 h-5 text-emerald-200" />
            ) : (
              <Video className="w-5 h-5 text-emerald-200" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
              AMMON Community Space &amp; Online Meetings
            </h3>
            <p className="text-[11px] text-emerald-200 truncate">
              Signed in as <strong>{currentUser.name}</strong> ({currentUser.role}) • End-to-end Firestore Sync
            </p>
          </div>
        </div>

        {/* Mode Switcher: WhatsApp Chat vs Online Meetings */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-black/25 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Social Chats</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('meetings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'meetings'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Online Meetings</span>
              {liveMeetingsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[9px] rounded-full bg-red-500 text-white font-extrabold animate-pulse">
                  {liveMeetingsCount} LIVE
                </span>
              )}
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Close Social Space"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: WHATSAPP-STYLE SOCIAL CHAT SPACE                           */}
      {/* ================================================================= */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex min-h-[540px] max-h-[75vh] overflow-hidden relative">
          {/* LEFT PANE: Channels & Contacts (WhatsApp Chats List) */}
          <div
            className={`${
              mobileShowThread ? 'hidden md:flex' : 'flex'
            } w-full md:w-76 lg:w-80 border-r border-[#E5E7EB] flex-col bg-white shrink-0`}
          >
            {/* Search Box */}
            <div className="p-3 border-b border-gray-100 bg-[#F9FBFA]">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  placeholder="Search AMMON channels..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                />
              </div>
            </div>

            {/* Channel Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredChannels.map((ch) => {
                const chMsgs = messages.filter((m) => m.channelId === ch.id);
                const lastMsg = chMsgs[chMsgs.length - 1];
                const isSelected = activeChannelId === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveChannelId(ch.id);
                      setMobileShowThread(true);
                    }}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#EAF3ED]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                        isSelected
                          ? 'bg-[#176B37] text-white'
                          : 'bg-[#EAF3ED] text-[#176B37] border border-[#176B37]/20'
                      }`}
                    >
                      {ch.name
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-[#252525] truncate">{ch.name}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {lastMsg?.timestampLabel || 'New'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {lastMsg ? `${lastMsg.senderName.split(' ')[0]}: ${lastMsg.text}` : ch.description}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-white border border-[#E5E7EB] text-[#176B37]">
                          {ch.badge}
                        </span>
                        <span className="text-[10px] font-bold text-[#176B37]">
                          {chMsgs.length} msgs
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Quick Online Meeting Shortcut inside Channel List */}
              <div className="p-3 bg-[#EAF3ED]/40">
                <button
                  type="button"
                  onClick={() => setActiveTab('meetings')}
                  className="w-full p-3 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white flex items-center justify-between text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-emerald-200" />
                    <span>Join Live Online Meetings</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">
                    {meetings.length} Rooms
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANE: WhatsApp Active Chat Thread */}
          <div
            className={`${
              mobileShowThread ? 'flex' : 'hidden md:flex'
            } flex-1 flex-col bg-[#EFEAE2]/65 min-w-0 relative`}
          >
            {/* Active Channel Header */}
            <div className="bg-white px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileShowThread(false)}
                  className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                  aria-label="Back to channels"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#176B37] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {activeChannel.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-[#252525] truncate">
                    {activeChannel.name}
                  </h4>
                  <p className="text-[10px] text-gray-500 truncate">
                    {taggablePeople.length} AMMON members &amp; executives • Type <strong className="text-[#176B37]">@</strong> to tag
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('meetings')}
                className="px-3 py-1.5 rounded-xl bg-[#EAF3ED] hover:bg-[#176B37] text-[#176B37] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-[#176B37]/20"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Video Meeting</span>
              </button>
            </div>

            {/* Messages Scroll Feed */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
              {/* Encryption / Community Info Pill */}
              <div className="flex justify-center mb-2">
                <span className="px-3 py-1 rounded-full bg-white/90 border border-[#E5E7EB] text-[10px] font-semibold text-gray-500 shadow-2xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#176B37]" />
                  <span>Official AMMON Channel • Share device files, @tag members &amp; react</span>
                </span>
              </div>

              {channelMessages.map((msg) => {
                const isOwn = msg.senderId === currentUser.id || msg.senderName === currentUser.name;
                const likes = Array.isArray(msg.likes) ? msg.likes : [];
                const isLikedByMe = likes.includes(currentUser.id);
                const reactions = msg.reactions || {};

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-xs border relative ${
                        isOwn
                          ? 'bg-[#DCF8C6] border-emerald-300/70 rounded-tr-xs'
                          : 'bg-white border-[#E5E7EB] rounded-tl-xs'
                      }`}
                    >
                      {/* Sender Header */}
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-[11px] text-[#14532D] truncate">
                            {msg.senderName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                              msg.senderRole === 'Super Admin'
                                ? 'bg-amber-100 text-amber-900'
                                : msg.senderRole === 'Executive'
                                ? 'bg-emerald-100 text-[#176B37]'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {msg.senderRole}
                          </span>
                        </div>
                      </div>

                      {/* Reply Quote Strip if replying to a comment */}
                      {msg.replyToSender && (
                        <div className="mb-2 p-2 rounded-lg bg-black/5 border-l-4 border-[#176B37] text-[11px]">
                          <p className="font-bold text-[#176B37]">{msg.replyToSender}</p>
                          <p className="text-gray-600 truncate">{msg.replyToText}</p>
                        </div>
                      )}

                      {/* Device Attachment Preview */}
                      {msg.attachmentData && msg.attachmentType?.startsWith('image/') && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-black/10 bg-white">
                          <img
                            src={msg.attachmentData}
                            alt={msg.attachmentName || 'Uploaded image'}
                            onClick={() =>
                              setPreviewImage({
                                src: msg.attachmentData!,
                                name: msg.attachmentName || 'image.jpg',
                              })
                            }
                            className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          />
                        </div>
                      )}

                      {msg.attachmentData && !msg.attachmentType?.startsWith('image/') && (
                        <a
                          href={msg.attachmentData}
                          download={msg.attachmentName || 'attachment'}
                          className="mb-2 p-2.5 rounded-xl bg-white/90 border border-[#E5E7EB] flex items-center justify-between gap-3 hover:bg-white transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#EAF3ED] text-[#176B37] flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-[#252525] truncate">{msg.attachmentName}</p>
                              <p className="text-[10px] text-gray-400">{msg.attachmentSize || 'Document'}</p>
                            </div>
                          </div>
                          <Download className="w-4 h-4 text-[#176B37] shrink-0" />
                        </a>
                      )}

                      {/* Message Text with @Tag Highlighting */}
                      <p className="text-xs sm:text-[13px] text-[#252525] leading-relaxed whitespace-pre-wrap break-words">
                        {renderFormattedMessageText(msg.text, isOwn)}
                      </p>

                      {/* Timestamp + Read Ticks + Quick Actions Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-1.5 pt-1 border-t border-black/5">
                        {/* Like, React & Reply Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(msg)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                              isLikedByMe
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-black/5 text-gray-600 hover:bg-black/10'
                            }`}
                            title="Like comment"
                          >
                            <Heart className={`w-3 h-3 ${isLikedByMe ? 'fill-red-500 text-red-500' : ''}`} />
                            <span>{likes.length > 0 ? likes.length : 'Like'}</span>
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenPickerMsgId(openPickerMsgId === msg.id ? null : msg.id)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/5 text-gray-600 hover:bg-black/10 cursor-pointer"
                              title="React with emoji"
                            >
                              <Smile className="w-3 h-3" />
                              <span>React</span>
                            </button>

                            {openPickerMsgId === msg.id && (
                              <div className="absolute bottom-full left-0 mb-1.5 bg-white border border-[#E5E7EB] rounded-full shadow-lg px-2 py-1 flex items-center gap-1 z-30">
                                {REACTION_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleReaction(msg, emoji)}
                                    className="w-7 h-7 rounded-full hover:bg-[#EAF3ED] flex items-center justify-center text-sm cursor-pointer transition-transform hover:scale-110"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(msg);
                              inputRef.current?.focus();
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/5 text-gray-600 hover:bg-black/10 cursor-pointer"
                            title="Reply to comment"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                        </div>

                        {/* Time & Checkmarks */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 ml-auto">
                          <span>{msg.timestampLabel}</span>
                          {isOwn && <CheckCheck className="w-3.5 h-3.5 text-sky-600" />}
                        </div>
                      </div>

                      {/* Aggregated Emoji Reaction Pills */}
                      {Object.keys(reactions).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {Object.entries(reactions).map(([emoji, users]) => {
                            const userList = Array.isArray(users) ? users : [];
                            if (userList.length === 0) return null;
                            const reacted = userList.includes(currentUser.id);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer transition-colors ${
                                  reacted
                                    ? 'bg-[#176B37] text-white border-[#176B37]'
                                    : 'bg-white text-gray-700 border-[#E5E7EB] hover:bg-[#EAF3ED]'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{userList.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={chatEndRef} />
            </div>

            {/* Composer Area (Bottom) */}
            <div className="bg-[#F0F2F5] border-t border-[#E5E7EB] p-2.5 sm:p-3 relative shrink-0">
              {/* @ Mention Autocomplete Dropdown */}
              {mentionQuery !== null && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 sm:right-auto sm:w-80 mb-2 bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden z-40">
                  <div className="px-3 py-1.5 bg-[#EAF3ED] text-[10px] font-bold uppercase tracking-wider text-[#176B37] flex items-center justify-between">
                    <span>Tag AMMON Member</span>
                    <button
                      type="button"
                      onClick={() => setMentionQuery(null)}
                      className="text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                    {mentionSuggestions.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleInsertMention(person.name)}
                        className="w-full px-3 py-2 text-left hover:bg-[#EAF3ED]/60 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#252525] truncate">@{person.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{person.badge}</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#176B37] shrink-0">
                          {person.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Emoji Insert Bar */}
              {showEmojiComposer && (
                <div className="mb-2 p-2 bg-white rounded-xl border border-[#E5E7EB] flex items-center gap-2 flex-wrap">
                  {['👍', '❤️', '🔥', '👏', '✅', '😂', '🙏', '💼', '📱', '⚡'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setDraftText((prev) => `${prev}${em}`);
                        inputRef.current?.focus();
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-[#EAF3ED] text-base cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                  <span>{uploadError}</span>
                  <button type="button" onClick={() => setUploadError('')} className="cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Reply Quote Preview */}
              {replyingTo && (
                <div className="mb-2 p-2 rounded-xl bg-white border-l-4 border-[#176B37] flex items-center justify-between gap-2 text-xs shadow-2xs">
                  <div className="min-w-0">
                    <p className="font-bold text-[#176B37] text-[11px]">Replying to {replyingTo.senderName}</p>
                    <p className="text-gray-500 truncate text-[11px]">{replyingTo.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Pending Device Upload Preview */}
              {pendingAttachment && (
                <div className="mb-2 p-2 rounded-xl bg-white border border-[#176B37]/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {pendingAttachment.type.startsWith('image/') ? (
                      <img
                        src={pendingAttachment.data}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#EAF3ED] text-[#176B37] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[#252525] truncate">{pendingAttachment.name}</p>
                      <p className="text-[10px] text-[#176B37] font-semibold">
                        Ready to send • {pendingAttachment.size}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input Row */}
              <form onSubmit={(e) => handleSendChat(e)} className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiComposer(!showEmojiComposer)}
                  className="p-2 rounded-full text-gray-600 hover:text-[#176B37] hover:bg-white transition-colors cursor-pointer shrink-0"
                  title="Insert emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Upload from Device (Images & Documents) */}
                <label
                  className="p-2 rounded-full text-gray-600 hover:text-[#176B37] hover:bg-white transition-colors cursor-pointer shrink-0"
                  title="Upload photo or document from device"
                >
                  <Paperclip className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                    className="hidden"
                    onChange={handleDeviceUpload}
                  />
                </label>

                {/* @ Tag Member Shortcut Button */}
                <button
                  type="button"
                  onClick={() => {
                    const nextText = `${draftText}${draftText && !draftText.endsWith(' ') ? ' ' : ''}@`;
                    setDraftText(nextText);
                    setMentionStartIndex(nextText.length - 1);
                    setMentionQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-2 rounded-full text-[#176B37] bg-[#EAF3ED] hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                  title="Tag a member with @"
                >
                  <AtSign className="w-4 h-4" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={draftText}
                  onChange={handleDraftChange}
                  placeholder={`Message ${activeChannel.name} (type @ to tag)...`}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full bg-white border border-[#E5E7EB] text-xs sm:text-sm focus:outline-hidden focus:border-[#176B37]"
                />

                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-[#176B37] hover:bg-[#14532D] text-white flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: ONLINE MEETINGS SECTION                                    */}
      {/* ================================================================= */}
      {activeTab === 'meetings' && (
        <div className="flex-1 p-4 sm:p-6 bg-[#F9FBFA] overflow-y-auto space-y-5 min-h-[540px]">
          {/* Active Live Meeting Room Stage */}
          {activeMeeting ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Room Top Banner */}
              <div className="bg-[#14532D] text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold uppercase flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse" />
                      Live Meeting
                    </span>
                    <span className="text-xs font-mono text-emerald-200">{activeMeeting.meetingCode}</span>
                  </div>
                  <h4 className="font-bold text-base sm:text-lg mt-1 truncate">{activeMeeting.title}</h4>
                  <p className="text-xs text-emerald-100">
                    Host: <strong>{activeMeeting.hostName}</strong> ({activeMeeting.hostRole})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Join AMMON Online Meeting "${activeMeeting.title}" — Code: ${activeMeeting.meetingCode}`);
                      setCopiedMeetCode(true);
                      setTimeout(() => setCopiedMeetCode(false), 1800);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedMeetCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMeetCode ? 'Invite Copied' : 'Copy Invite'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLeaveMeeting}
                    className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>Leave Room</span>
                  </button>
                </div>
              </div>

              {mediaNotice && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  {mediaNotice}
                </div>
              )}

              {/* Video Stage + Live Meeting Chat Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left 8 Cols: Video Grid & Controls */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Your Live Video / Avatar Tile */}
                    <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-16/10 border-2 border-[#176B37] flex items-center justify-center">
                      {camOn || screenSharing ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                          <div className="w-16 h-16 rounded-full bg-[#176B37] text-white font-black text-xl flex items-center justify-center border-2 border-emerald-300">
                            {currentUser.name
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <p className="text-white font-bold text-xs mt-2">{currentUser.name} (You)</p>
                          <p className="text-emerald-300 text-[10px]">
                            {micOn ? 'Microphone Active' : 'Muted'} • Camera Off
                          </p>
                        </div>
                      )}
                      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-semibold flex items-center gap-1.5">
                        {micOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-red-400" />}
                        <span>{currentUser.name}</span>
                      </div>
                      {(activeMeeting.raisedHands || []).includes(currentUser.name) && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold flex items-center gap-1">
                          <Hand className="w-3 h-3" />
                          <span>Hand Raised</span>
                        </div>
                      )}
                    </div>

                    {/* Host / Co-Participants Tiles */}
                    {(activeMeeting.participants || [])
                      .filter((p) => p !== currentUser.name)
                      .slice(0, 3)
                      .map((participant) => {
                        const isHost = participant === activeMeeting.hostName;
                        const handUp = (activeMeeting.raisedHands || []).includes(participant);
                        return (
                          <div
                            key={participant}
                            className="relative rounded-2xl overflow-hidden bg-slate-800 aspect-16/10 border border-slate-700 flex flex-col items-center justify-center p-4"
                          >
                            <div className="w-14 h-14 rounded-full bg-emerald-800 text-white font-bold text-lg flex items-center justify-center border border-emerald-400/40">
                              {participant
                                .split(' ')
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <p className="text-white font-bold text-xs mt-2 text-center truncate max-w-full">
                              {participant}
                            </p>
                            <span className="text-[10px] text-emerald-300">
                              {isHost ? 'Meeting Host' : 'Connected Operator'}
                            </span>
                            {handUp && (
                              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center gap-1">
                                <Hand className="w-3 h-3" />
                                <span>Raised</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Interactive Controls Dock */}
                  <div className="bg-white p-3 rounded-2xl border border-[#E5E7EB] flex flex-wrap items-center justify-center gap-2.5 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setMicOn(!micOn)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        micOn ? 'bg-[#EAF3ED] text-[#176B37]' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      <span>{micOn ? 'Mic On' : 'Muted'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        camOn ? 'bg-[#176B37] text-white' : 'bg-gray-100 text-gray-700 hover:bg-[#EAF3ED] hover:text-[#176B37]'
                      }`}
                    >
                      {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      <span>{camOn ? 'Camera On' : 'Start Camera'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleScreenShare}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        screenSharing ? 'bg-[#176B37] text-white' : 'bg-gray-100 text-gray-700 hover:bg-[#EAF3ED] hover:text-[#176B37]'
                      }`}
                    >
                      <MonitorUp className="w-4 h-4" />
                      <span>{screenSharing ? 'Sharing Screen' : 'Share Screen'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleRaiseHand(activeMeeting)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        (activeMeeting.raisedHands || []).includes(currentUser.name)
                          ? 'bg-amber-400 text-slate-900'
                          : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-800'
                      }`}
                    >
                      <Hand className="w-4 h-4" />
                      <span>Raise Hand</span>
                    </button>
                  </div>

                  {/* Meeting Agenda Box */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB]">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-[#176B37] mb-1.5">
                      Meeting Agenda &amp; Briefing Notes
                    </h5>
                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                      {activeMeeting.agenda}
                    </p>
                  </div>
                </div>

                {/* Right 4 Cols: Live In-Meeting Chat & Participants */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E7EB] flex flex-col h-[430px] overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-[#EAF3ED]/50">
                    <span className="font-bold text-xs text-[#14532D] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#176B37]" />
                      <span>In-Meeting Chat</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#176B37]">
                      {(activeMeeting.participants || []).length} Joined
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#EFEAE2]/40">
                    {messages
                      .filter((m) => m.channelId === `meeting-${activeMeeting.id}` || m.channelId === 'national-hub')
                      .slice(-15)
                      .map((m) => (
                        <div key={m.id} className="bg-white p-2.5 rounded-xl border border-[#E5E7EB] text-xs shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[11px] text-[#176B37] truncate">{m.senderName}</span>
                            <span className="text-[9px] text-gray-400 shrink-0">{m.timestampLabel}</span>
                          </div>
                          <p className="text-gray-700 mt-0.5 break-words">{m.text}</p>
                        </div>
                      ))}
                  </div>

                  <form
                    onSubmit={(e) => handleSendChat(e, `meeting-${activeMeeting.id}`, meetingChatText)}
                    className="p-2.5 border-t border-gray-100 flex items-center gap-2 bg-white"
                  >
                    <input
                      type="text"
                      value={meetingChatText}
                      onChange={(e) => setMeetingChatText(e.target.value)}
                      placeholder="Send message to meeting..."
                      className="flex-1 px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-hidden focus:border-[#176B37]"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-[#176B37] text-white hover:bg-[#14532D] cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* Meetings Lobby & Scheduler */
            <div className="space-y-5">
              {/* Top Action Header */}
              <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-base text-[#252525]">AMMON Online Meetings &amp; Virtual Townhalls</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Join live Directorate briefings, chapter meetings, or start an instant video/audio session
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScheduleForm(!showScheduleForm)}
                  className="px-4 py-2.5 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showScheduleForm ? 'Cancel' : 'Start / Schedule Meeting'}</span>
                </button>
              </div>

              {/* Create / Schedule Meeting Form */}
              {showScheduleForm && (
                <form
                  onSubmit={(e) => handleStartOrScheduleMeeting(e, false)}
                  className="bg-white p-5 rounded-2xl border-2 border-[#176B37] space-y-4 shadow-sm animate-in fade-in duration-150"
                >
                  <h5 className="font-bold text-sm text-[#14532D]">Host a New AMMON Online Meeting</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-gray-700 mb-1">Meeting Title *</label>
                      <input
                        type="text"
                        required
                        value={newMeetingTitle}
                        onChange={(e) => setNewMeetingTitle(e.target.value)}
                        placeholder="e.g., Lagos Zone B Terminal Compliance Sync"
                        className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Category</label>
                      <select
                        value={newMeetingCategory}
                        onChange={(e) => setNewMeetingCategory(e.target.value as OnlineMeeting['category'])}
                        className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
                      >
                        <option>State Chapter Townhall</option>
                        <option>National Executive</option>
                        <option>Compliance Briefing</option>
                        <option>Anti-Fraud Workshop</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Date</label>
                        <input
                          type="text"
                          value={newMeetingDate}
                          onChange={(e) => setNewMeetingDate(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Time</label>
                        <input
                          type="text"
                          value={newMeetingTime}
                          onChange={(e) => setNewMeetingTime(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-gray-700 mb-1">Agenda / Briefing Points</label>
                      <textarea
                        rows={2}
                        value={newMeetingAgenda}
                        onChange={(e) => setNewMeetingAgenda(e.target.value)}
                        placeholder="Key discussion topics for participants..."
                        className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => handleStartOrScheduleMeeting(e, true)}
                      className="px-4 py-2.5 rounded-xl bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Start Live Now</span>
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl border border-[#176B37] text-[#176B37] hover:bg-[#EAF3ED] text-xs font-bold cursor-pointer"
                    >
                      Schedule for Later
                    </button>
                  </div>
                </form>
              )}

              {/* Meetings Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meetings.map((mtg) => {
                  const isLive = mtg.status === 'Live';
                  return (
                    <div
                      key={mtg.id}
                      className={`bg-white rounded-2xl border p-5 flex flex-col justify-between gap-4 shadow-xs ${
                        isLive ? 'border-[#176B37] ring-1 ring-[#176B37]/20' : 'border-[#E5E7EB]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                              isLive
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-[#EAF3ED] text-[#176B37]'
                            }`}
                          >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />}
                            <span>{mtg.status}</span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">{mtg.meetingCode}</span>
                        </div>

                        <h5 className="font-bold text-sm text-[#252525] leading-snug">{mtg.title}</h5>
                        <p className="text-xs text-gray-600 line-clamp-2">{mtg.agenda}</p>

                        <div className="pt-1 space-y-1 text-[11px] text-gray-500">
                          <p className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-[#176B37]" />
                            <span>
                              Host: <strong className="text-[#252525]">{mtg.hostName}</strong>
                            </span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#176B37]" />
                            <span>
                              {mtg.scheduledDate} • {mtg.scheduledTime}
                            </span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#176B37]" />
                            <span>{(mtg.participants || []).length} registered participants</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleJoinMeeting(mtg)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isLive
                            ? 'bg-[#176B37] hover:bg-[#14532D] text-white'
                            : 'bg-[#EAF3ED] hover:bg-[#176B37] text-[#176B37] hover:text-white'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        <span>{isLive ? 'Join Live Meeting Room' : 'Enter / Start Meeting'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Image Preview */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl max-h-[88vh] bg-white rounded-2xl overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="font-bold text-xs text-[#252525] truncate">{previewImage.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.src}
                  download={previewImage.name}
                  className="px-3 py-1 rounded-lg bg-[#176B37] text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <img src={previewImage.src} alt={previewImage.name} className="max-h-[75vh] w-auto mx-auto object-contain rounded-lg mt-2" />
          </div>
        </div>
      )}
    </div>
  );
};
