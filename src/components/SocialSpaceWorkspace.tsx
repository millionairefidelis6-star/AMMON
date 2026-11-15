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
  Crown,
  Film,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2,
  Wifi,
  Power,
  Disc,
  Square,
  Play
} from 'lucide-react';
import { Member, AdminUser, SocialMessage, OnlineMeeting, MeetingRecording } from '../types';
import { SOCIAL_CHANNELS, ADMIN_USERS } from '../data/mockData';
import {
  uploadChatMediaAsset,
  uploadMeetingRecordingAsset,
  isVideoFile,
  isAudioFile,
} from '../services/storageService';
import {
  RtcPeerInfo,
  RtcSignalPayload,
  RtcSignalingSession,
} from '../services/rtcSignalingService';

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
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [openPickerMsgId, setOpenPickerMsgId] = useState<string | null>(null);
  const [showEmojiComposer, setShowEmojiComposer] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{
    src: string;
    name: string;
    kind: 'image' | 'video';
  } | null>(null);

  // @ Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Meetings & WebRTC Live Audio/Video state
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingCategory, setNewMeetingCategory] = useState<OnlineMeeting['category']>('State Chapter Townhall');
  const [newMeetingDate, setNewMeetingDate] = useState('Today');
  const [newMeetingTime, setNewMeetingTime] = useState('04:00 PM WAT');
  const [newMeetingAgenda, setNewMeetingAgenda] = useState('');
  const [copiedMeetCode, setCopiedMeetCode] = useState(false);

  // Independent Mic / Camera / Screen-Share / Speaker Controls + Live WebRTC Peers
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [rtcTransportMode, setRtcTransportMode] = useState<'websocket' | 'firestore' | 'connecting'>('connecting');
  const [remotePeers, setRemotePeers] = useState<RtcPeerInfo[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerConnStates, setPeerConnStates] = useState<Record<string, string>>({});
  const [mediaNotice, setMediaNotice] = useState('');
  const [meetingLobbyNotice, setMeetingLobbyNotice] = useState('');
  const [localVideoRevision, setLocalVideoRevision] = useState(0);
  const [meetingChatText, setMeetingChatText] = useState('');

  // Meeting Recording state (host controls recording & saves video to AMMON Firebase Storage bucket)
  const [isLocalRecording, setIsLocalRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [remoteRecordingBy, setRemoteRecordingBy] = useState<string | null>(null);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [recordingUploadPct, setRecordingUploadPct] = useState(0);
  const [recordingStatusMessage, setRecordingStatusMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const localPreviewStreamRef = useRef<MediaStream | null>(null);
  const pendingAudioInitRef = useRef<Promise<MediaStreamTrack | null> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const signalingRef = useRef<RtcSignalingSession | null>(null);
  const selfPeerIdRef = useRef<string>(
    `peer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  );

  // Refs for session MediaRecorder compositor
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingDrawTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingDurationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const recordingAudioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const connectedRecordingAudioIdsRef = useRef<Set<string>>(new Set());
  const recordingCompositeStreamRef = useRef<MediaStream | null>(null);
  const recordingSecondsRef = useRef<number>(0);

  const peerConnectionsRef = useRef<
    Map<
      string,
      {
        pc: RTCPeerConnection;
        remoteStream: MediaStream;
        audioTx?: RTCRtpTransceiver;
        videoTx?: RTCRtpTransceiver;
        audioSender?: RTCRtpSender;
        videoSender?: RTCRtpSender;
        polite: boolean;
        makingOffer: boolean;
        ignoreOffer: boolean;
        pendingCandidates: RTCIceCandidateInit[];
      }
    >
  >(new Map());

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

  const isUserMeetingHost = (mtg: OnlineMeeting | null): boolean => {
    if (!mtg) return false;
    return Boolean(
      (mtg.hostId && currentUser.id && mtg.hostId === currentUser.id) ||
        (mtg.hostName &&
          currentUser.name &&
          mtg.hostName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
  };

  const isMeetingHost = isUserMeetingHost(activeMeeting);

  // Fresh refs for 20fps session recording compositor
  const liveRecordingStateRef = useRef({
    activeMeeting: activeMeeting,
    camOn,
    screenSharing,
    micOn,
    remotePeers,
    userName: currentUser.name,
  });
  liveRecordingStateRef.current = {
    activeMeeting,
    camOn,
    screenSharing,
    micOn,
    remotePeers,
    userName: currentUser.name,
  };

  const formatRecDuration = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const syncAudioTracksToRecorder = () => {
    const ctx = recordingAudioCtxRef.current;
    const dest = recordingAudioDestRef.current;
    if (!ctx || !dest) return;

    const candidateTracks: MediaStreamTrack[] = [];
    if (localAudioTrackRef.current && localAudioTrackRef.current.readyState === 'live') {
      candidateTracks.push(localAudioTrackRef.current);
    }
    for (const stream of Object.values(remoteStreams)) {
      if (!stream) continue;
      for (const t of stream.getAudioTracks()) {
        if (t.readyState === 'live') candidateTracks.push(t);
      }
    }

    for (const track of candidateTracks) {
      if (connectedRecordingAudioIdsRef.current.has(track.id)) continue;
      try {
        const src = ctx.createMediaStreamSource(new MediaStream([track]));
        src.connect(dest);
        connectedRecordingAudioIdsRef.current.add(track.id);
      } catch {
        // Ignore unconnectable tracks
      }
    }
  };

  useEffect(() => {
    if (isLocalRecording) {
      syncAudioTracksToRecorder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocalRecording, remoteStreams, micOn]);

  const cleanupRecorderResources = () => {
    if (recordingDrawTimerRef.current) {
      clearInterval(recordingDrawTimerRef.current);
      recordingDrawTimerRef.current = null;
    }
    if (recordingDurationTimerRef.current) {
      clearInterval(recordingDurationTimerRef.current);
      recordingDurationTimerRef.current = null;
    }
    if (recordingCompositeStreamRef.current) {
      recordingCompositeStreamRef.current.getTracks().forEach((t) => t.stop());
      recordingCompositeStreamRef.current = null;
    }
    if (recordingAudioCtxRef.current) {
      recordingAudioCtxRef.current.close().catch(() => {});
      recordingAudioCtxRef.current = null;
    }
    recordingAudioDestRef.current = null;
    connectedRecordingAudioIdsRef.current.clear();
  };

  const unlockAudioPlayback = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {
      // Ignore AudioContext unlock issues
    }
  };

  const formatMediaDeviceError = (err: unknown, deviceLabel: string): string => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return `${deviceLabel} requires HTTPS or localhost. Please open AMMON on a secure connection.`;
    }
    const domErr = err as { name?: string; message?: string } | undefined;
    const name = domErr?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return `${deviceLabel} permission was denied by your browser. Click the site lock/camera icon in your address bar to Allow ${deviceLabel} access, then retry.`;
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return `No physical ${deviceLabel.toLowerCase()} device was found on this computer or phone.`;
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return `Your ${deviceLabel.toLowerCase()} is currently in use by another app. Close the other app and try again.`;
    }
    return `Unable to access ${deviceLabel.toLowerCase()}${domErr?.message ? ` (${domErr.message})` : ''}.`;
  };

  const acquireDeviceAudioTrack = async (): Promise<MediaStreamTrack | null> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      return stream.getAudioTracks()[0] || null;
    } catch (err) {
      const domErr = err as { name?: string } | undefined;
      if (domErr?.name === 'OverconstrainedError' || domErr?.name === 'TypeError') {
        const fallback = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        return fallback.getAudioTracks()[0] || null;
      }
      throw err;
    }
  };

  const acquireDeviceCameraTrack = async (): Promise<MediaStreamTrack | null> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      return stream.getVideoTracks()[0] || null;
    } catch (err) {
      const domErr = err as { name?: string } | undefined;
      if (
        domErr?.name === 'OverconstrainedError' ||
        domErr?.name === 'NotReadableError' ||
        domErr?.name === 'TypeError'
      ) {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        return fallback.getVideoTracks()[0] || null;
      }
      throw err;
    }
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [channelMessages.length, activeChannelId, activeTab]);

  // Bind local camera/screen preview video element whenever camOn, screenSharing, or track updates
  useEffect(() => {
    if ((camOn || screenSharing) && videoRef.current && localVideoTrackRef.current) {
      const previewStream = new MediaStream([localVideoTrackRef.current]);
      localPreviewStreamRef.current = previewStream;
      videoRef.current.srcObject = previewStream;
      videoRef.current.play().catch(() => {});
    } else if (!camOn && !screenSharing && videoRef.current) {
      videoRef.current.srcObject = null;
      localPreviewStreamRef.current = null;
    }
  }, [camOn, screenSharing, localVideoRevision]);

  const negotiateWithPeer = async (
    remotePeerId: string,
    entry: {
      pc: RTCPeerConnection;
      makingOffer: boolean;
    }
  ) => {
    const { pc } = entry;
    if (entry.makingOffer || pc.signalingState !== 'stable') return;
    try {
      entry.makingOffer = true;
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription(offer);
      if (pc.localDescription) {
        signalingRef.current?.sendSignal(remotePeerId, {
          kind: 'offer',
          sdp: pc.localDescription.toJSON(),
        });
      }
    } catch (err) {
      console.warn('WebRTC renegotiation error:', err);
    } finally {
      entry.makingOffer = false;
    }
  };

  const replaceAudioTrackOnPeers = async (track: MediaStreamTrack | null) => {
    for (const [peerId, entry] of peerConnectionsRef.current.entries()) {
      try {
        let tx =
          entry.audioTx ||
          entry.pc.getTransceivers().find((t) => t.receiver.track?.kind === 'audio');
        if (!tx && track) {
          tx = entry.pc.addTransceiver('audio', { direction: 'sendrecv' });
        }
        if (tx) {
          entry.audioTx = tx;
          entry.audioSender = tx.sender;
          if (tx.direction !== 'sendrecv') {
            tx.direction = 'sendrecv';
          }
          await tx.sender.replaceTrack(track);
          if (
            track &&
            entry.pc.signalingState === 'stable' &&
            tx.currentDirection !== 'sendrecv' &&
            tx.currentDirection !== 'sendonly'
          ) {
            await negotiateWithPeer(peerId, entry);
          }
        }
      } catch (err) {
        console.warn('replaceTrack(audio) warning:', err);
      }
    }
  };

  const replaceVideoTrackOnPeers = async (track: MediaStreamTrack | null) => {
    for (const [peerId, entry] of peerConnectionsRef.current.entries()) {
      try {
        let tx =
          entry.videoTx ||
          entry.pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video');
        if (!tx && track) {
          tx = entry.pc.addTransceiver('video', { direction: 'sendrecv' });
        }
        if (tx) {
          entry.videoTx = tx;
          entry.videoSender = tx.sender;
          if (tx.direction !== 'sendrecv') {
            tx.direction = 'sendrecv';
          }
          await tx.sender.replaceTrack(track);
          if (
            track &&
            entry.pc.signalingState === 'stable' &&
            tx.currentDirection !== 'sendrecv' &&
            tx.currentDirection !== 'sendonly'
          ) {
            await negotiateWithPeer(peerId, entry);
          }
        }
      } catch (err) {
        console.warn('replaceTrack(video) warning:', err);
      }
    }
  };

  const closePeerConnection = (remotePeerId: string) => {
    const entry = peerConnectionsRef.current.get(remotePeerId);
    if (entry) {
      try {
        entry.pc.onnegotiationneeded = null;
        entry.pc.onicecandidate = null;
        entry.pc.ontrack = null;
        entry.pc.onconnectionstatechange = null;
        entry.pc.close();
      } catch {
        // ignore
      }
      peerConnectionsRef.current.delete(remotePeerId);
    }
    setRemoteStreams((prev) => {
      if (!(remotePeerId in prev)) return prev;
      const next = { ...prev };
      delete next[remotePeerId];
      return next;
    });
    setPeerConnStates((prev) => {
      if (!(remotePeerId in prev)) return prev;
      const next = { ...prev };
      delete next[remotePeerId];
      return next;
    });
  };

  const ensurePeerConnection = (remotePeerId: string) => {
    const existing = peerConnectionsRef.current.get(remotePeerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
          ],
        },
      ],
    });

    const remoteStream = new MediaStream();
    const polite = selfPeerIdRef.current > remotePeerId;

    let audioTx: RTCRtpTransceiver | undefined;
    let videoTx: RTCRtpTransceiver | undefined;

    if (!polite) {
      // Initial offerer pre-creates sendrecv transceivers so audio + video m-lines exist cleanly
      audioTx = pc.addTransceiver('audio', { direction: 'sendrecv' });
      videoTx = pc.addTransceiver('video', { direction: 'sendrecv' });

      if (localAudioTrackRef.current) {
        audioTx.sender.replaceTrack(localAudioTrackRef.current).catch(() => {});
      }
      if (localVideoTrackRef.current) {
        videoTx.sender.replaceTrack(localVideoTrackRef.current).catch(() => {});
      }
    }

    const entry = {
      pc,
      remoteStream,
      audioTx,
      videoTx,
      audioSender: audioTx?.sender,
      videoSender: videoTx?.sender,
      polite,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [] as RTCIceCandidateInit[],
    };

    peerConnectionsRef.current.set(remotePeerId, entry);

    pc.onnegotiationneeded = async () => {
      if (pc.localDescription === null && entry.polite) {
        return;
      }
      await negotiateWithPeer(remotePeerId, entry);
    };

    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        signalingRef.current?.sendSignal(remotePeerId, {
          kind: 'ice-candidate',
          candidate: evt.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (evt) => {
      const track = evt.track;
      if (!entry.remoteStream.getTracks().some((t) => t.id === track.id)) {
        entry.remoteStream.addTrack(track);
      }
      const refreshRemoteStream = () => {
        const updatedStream = new MediaStream(entry.remoteStream.getTracks());
        entry.remoteStream = updatedStream;
        setRemoteStreams((prev) => ({
          ...prev,
          [remotePeerId]: updatedStream,
        }));
      };
      track.onunmute = refreshRemoteStream;
      refreshRemoteStream();
    };

    pc.onconnectionstatechange = () => {
      setPeerConnStates((prev) => ({
        ...prev,
        [remotePeerId]: pc.connectionState,
      }));
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    return entry;
  };

  const handleIncomingSignal = async (fromPeerId: string, signal: RtcSignalPayload) => {
    const entry = ensurePeerConnection(fromPeerId);
    const { pc } = entry;

    try {
      if (signal.kind === 'offer') {
        const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';
        entry.ignoreOffer = !entry.polite && offerCollision;
        if (entry.ignoreOffer) return;

        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        // Bind matched transceivers to sendrecv and attach local mic/cam tracks BEFORE creating answer
        const transceivers = pc.getTransceivers();
        for (const tx of transceivers) {
          const kind = tx.receiver.track?.kind;
          if (kind === 'audio') {
            entry.audioTx = tx;
            entry.audioSender = tx.sender;
            if (tx.direction !== 'sendrecv') tx.direction = 'sendrecv';
            if (localAudioTrackRef.current) {
              await tx.sender.replaceTrack(localAudioTrackRef.current).catch(() => {});
            }
          } else if (kind === 'video') {
            entry.videoTx = tx;
            entry.videoSender = tx.sender;
            if (tx.direction !== 'sendrecv') tx.direction = 'sendrecv';
            if (localVideoTrackRef.current) {
              await tx.sender.replaceTrack(localVideoTrackRef.current).catch(() => {});
            }
          }
        }

        for (const cand of entry.pendingCandidates.splice(0)) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) {
          signalingRef.current?.sendSignal(fromPeerId, {
            kind: 'answer',
            sdp: pc.localDescription.toJSON(),
          });
        }
      } else if (signal.kind === 'answer') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          for (const cand of entry.pendingCandidates.splice(0)) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
        }
      } else if (signal.kind === 'ice-candidate') {
        if (!pc.remoteDescription) {
          entry.pendingCandidates.push(signal.candidate);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((err) => {
            if (!entry.ignoreOffer) {
              console.warn('ICE candidate error:', err);
            }
          });
        }
      }
    } catch (err) {
      console.warn('WebRTC signal handling error:', err);
    }
  };

  const stopVideoTrackOnly = () => {
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    localPreviewStreamRef.current = null;
    replaceVideoTrackOnPeers(null).catch(() => {});
    setCamOn(false);
    setScreenSharing(false);
  };

  const stopAllLocalMediaAndRtc = () => {
    pendingAudioInitRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
    cleanupRecorderResources();
    setIsLocalRecording(false);
    setRemoteRecordingBy(null);
    setRecordingSeconds(0);
    if (signalingRef.current) {
      signalingRef.current.stop();
      signalingRef.current = null;
    }
    for (const peerId of Array.from(peerConnectionsRef.current.keys())) {
      closePeerConnection(peerId);
    }
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }
    stopVideoTrackOnly();
    setRemotePeers([]);
    setRemoteStreams({});
    setPeerConnStates({});
    setAudioPlaybackBlocked(false);
  };

  // Exit room automatically if the host updates Firestore/app meeting status to 'Ended'
  useEffect(() => {
    if (activeMeetingId && activeMeeting && activeMeeting.status === 'Ended') {
      stopAllLocalMediaAndRtc();
      setActiveMeetingId(null);
      setMeetingLobbyNotice(`Meeting "${activeMeeting.title}" was concluded by the host (${activeMeeting.hostName}).`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMeetingId, activeMeeting?.status]);

  // Lifecycle effect: manage WebRTC room signaling when activeMeetingId changes
  useEffect(() => {
    if (!activeMeetingId) return;

    let cancelled = false;
    const roomId = activeMeetingId;
    const selfId = `peer-${currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now().toString(36).slice(-4)}`;
    selfPeerIdRef.current = selfId;

    const startRoom = async () => {
      let audioTrack: MediaStreamTrack | null = localAudioTrackRef.current;

      if (!audioTrack && pendingAudioInitRef.current) {
        audioTrack = await pendingAudioInitRef.current;
        pendingAudioInitRef.current = null;
      }

      if (
        !audioTrack &&
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function'
      ) {
        try {
          audioTrack = await acquireDeviceAudioTrack();
        } catch (err) {
          if (!cancelled) {
            setMediaNotice(formatMediaDeviceError(err, 'Microphone'));
          }
        }
      } else if (
        !audioTrack &&
        (typeof navigator === 'undefined' ||
          typeof navigator.mediaDevices?.getUserMedia !== 'function')
      ) {
        setMediaNotice(
          'Browser audio capture unavailable in this context. Ensure HTTPS and camera/microphone permissions are enabled.'
        );
      }

      if (cancelled) {
        if (audioTrack && audioTrack !== localAudioTrackRef.current) {
          audioTrack.stop();
        }
        return;
      }

      let initialMic = false;
      if (audioTrack) {
        audioTrack.enabled = true;
        localAudioTrackRef.current = audioTrack;
        initialMic = true;
        await replaceAudioTrackOnPeers(audioTrack);
      }

      if (cancelled) return;
      setMicOn(initialMic);

      const session = new RtcSignalingSession(
        roomId,
        {
          peerId: selfId,
          userId: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          micOn: initialMic,
          camOn: Boolean(localVideoTrackRef.current && camOn),
          screenSharing: Boolean(localVideoTrackRef.current && screenSharing),
          handRaised: false,
        },
        {
          onTransportChange: (mode) => {
            if (!cancelled) setRtcTransportMode(mode);
          },
          onPeersChange: (peers) => {
            if (cancelled) return;
            setRemotePeers(peers);
            const activeIds = new Set(peers.map((p) => p.peerId));
            for (const existingId of Array.from(peerConnectionsRef.current.keys())) {
              if (!activeIds.has(existingId)) {
                closePeerConnection(existingId);
              }
            }
            for (const peer of peers) {
              ensurePeerConnection(peer.peerId);
            }
          },
          onSignal: (fromPeerId, signal) => {
            if (!cancelled) {
              handleIncomingSignal(fromPeerId, signal);
            }
          },
          onRecordingState: (isRec, startedBy) => {
            if (!cancelled) {
              setRemoteRecordingBy(isRec ? startedBy || 'Meeting Host' : null);
            }
          },
          onMeetingEnded: (endedBy) => {
            if (cancelled) return;
            stopAllLocalMediaAndRtc();
            setActiveMeetingId(null);
            setMeetingLobbyNotice(
              `This online meeting was ended by ${endedBy || 'the meeting host'}.`
            );
          },
        }
      );

      signalingRef.current = session;
      session.start();
    };

    startRoom();

    return () => {
      cancelled = true;
      stopAllLocalMediaAndRtc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMeetingId]);

  const handleToggleMic = async () => {
    setMediaNotice('');
    unlockAudioPlayback();
    if (localAudioTrackRef.current) {
      const nextMic = !micOn;
      localAudioTrackRef.current.enabled = nextMic;
      setMicOn(nextMic);
      signalingRef.current?.updateMediaState({ micOn: nextMic });
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMediaNotice(formatMediaDeviceError(null, 'Microphone'));
        return;
      }
      const track = await acquireDeviceAudioTrack();
      if (!track) {
        setMediaNotice('No active microphone track detected on this device.');
        return;
      }
      track.enabled = true;
      localAudioTrackRef.current = track;
      await replaceAudioTrackOnPeers(track);
      setMicOn(true);
      signalingRef.current?.updateMediaState({ micOn: true });
    } catch (err) {
      setMediaNotice(formatMediaDeviceError(err, 'Microphone'));
    }
  };

  const handleToggleCamera = async () => {
    setMediaNotice('');
    unlockAudioPlayback();
    if (camOn) {
      stopVideoTrackOnly();
      signalingRef.current?.updateMediaState({ camOn: false, screenSharing: false });
      return;
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMediaNotice(formatMediaDeviceError(null, 'Camera'));
        return;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current = null;
      }
      const videoTrack = await acquireDeviceCameraTrack();
      if (!videoTrack) {
        setMediaNotice('No video camera track returned by browser.');
        return;
      }
      localVideoTrackRef.current = videoTrack;
      setLocalVideoRevision((n) => n + 1);
      await replaceVideoTrackOnPeers(videoTrack);
      setCamOn(true);
      setScreenSharing(false);
      signalingRef.current?.updateMediaState({ camOn: true, screenSharing: false });
    } catch (err) {
      setMediaNotice(formatMediaDeviceError(err, 'Camera'));
    }
  };

  const handleToggleScreenShare = async () => {
    setMediaNotice('');
    unlockAudioPlayback();
    if (screenSharing) {
      stopVideoTrackOnly();
      signalingRef.current?.updateMediaState({ camOn: false, screenSharing: false });
      return;
    }
    try {
      if (
        typeof navigator === 'undefined' ||
        typeof navigator.mediaDevices?.getDisplayMedia !== 'function'
      ) {
        setMediaNotice(
          'Screen sharing (getDisplayMedia) is not supported on this browser or device.'
        );
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as MediaTrackConstraints,
          audio: false,
        });
      } catch (constraintErr) {
        const errName = (constraintErr as { name?: string } | undefined)?.name;
        if (errName === 'OverconstrainedError' || errName === 'TypeError') {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        } else {
          throw constraintErr;
        }
      }

      const displayTrack = stream.getVideoTracks()[0];
      if (!displayTrack) {
        setMediaNotice('No screen video track was returned.');
        return;
      }

      // Stop previous webcam track only after screen selection succeeds
      if (localVideoTrackRef.current && localVideoTrackRef.current !== displayTrack) {
        localVideoTrackRef.current.stop();
      }
      localVideoTrackRef.current = displayTrack;
      setLocalVideoRevision((n) => n + 1);
      await replaceVideoTrackOnPeers(displayTrack);
      setScreenSharing(true);
      setCamOn(false);
      signalingRef.current?.updateMediaState({ camOn: false, screenSharing: true });
      displayTrack.onended = () => {
        if (localVideoTrackRef.current === displayTrack) {
          stopVideoTrackOnly();
          signalingRef.current?.updateMediaState({ camOn: false, screenSharing: false });
        }
      };
    } catch (err) {
      const domErr = err as { name?: string; message?: string } | undefined;
      if (domErr?.name === 'NotAllowedError') {
        setMediaNotice(
          'Screen sharing permission was cancelled or blocked by the embedded browser frame. Allow screen capture in site settings or open the meeting in a standalone browser tab.'
        );
      } else if (domErr?.name === 'AbortError') {
        setMediaNotice('Screen share selection was cancelled.');
      } else {
        setMediaNotice(formatMediaDeviceError(err, 'Screen Sharing'));
      }
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
        if (compressed.dataUrl.length <= 820000) {
          setPendingAttachment({
            name: file.name,
            type: 'image/jpeg',
            size: compressed.sizeLabel,
            data: compressed.dataUrl,
          });
          return;
        }
      }

      if (isVideoFile(file.name, file.type) || isAudioFile(file.name, file.type) || file.size > 400 * 1024) {
        setIsUploadingMedia(true);
        const uploaded = await uploadChatMediaAsset(file, activeChannelId);
        setPendingAttachment({
          name: file.name,
          type: uploaded.contentType,
          size: uploaded.sizeLabel,
          data: uploaded.url,
        });
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
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to upload selected file from device.'
      );
    } finally {
      setIsUploadingMedia(false);
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

  const primeAudioFromUserGesture = () => {
    unlockAudioPlayback();
    setMediaNotice('');
    setMeetingLobbyNotice('');
    if (
      !localAudioTrackRef.current &&
      !pendingAudioInitRef.current &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    ) {
      pendingAudioInitRef.current = acquireDeviceAudioTrack().catch((err) => {
        setMediaNotice(formatMediaDeviceError(err, 'Microphone'));
        return null;
      });
    }
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
      primeAudioFromUserGesture();
      setActiveMeetingId(id);
    }
  };

  const handleJoinMeeting = (mtg: OnlineMeeting) => {
    if (mtg.status === 'Ended') return;
    primeAudioFromUserGesture();
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
  };

  const handleStartRecording = () => {
    if (!activeMeeting || !isMeetingHost || isLocalRecording || isUploadingRecording) return;
    if (typeof MediaRecorder === 'undefined') {
      setMediaNotice('Session recording (MediaRecorder) is not supported in this browser.');
      return;
    }

    setMediaNotice('');
    setRecordingStatusMessage('');

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const audioDest = audioCtx.createMediaStreamDestination();
      recordingAudioCtxRef.current = audioCtx;
      recordingAudioDestRef.current = audioDest;
      connectedRecordingAudioIdsRef.current.clear();

      // Add a tiny silent oscillator keep-alive so AudioContext track never drops even when everyone mutes
      const keepAliveOsc = audioCtx.createOscillator();
      const keepAliveGain = audioCtx.createGain();
      keepAliveGain.gain.value = 0.00001;
      keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(audioDest);
      keepAliveOsc.start();

      syncAudioTracksToRecorder();

      // Create 1280x720 compositor canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) {
        cleanupRecorderResources();
        setMediaNotice('Unable to initialize canvas video compositor for recording.');
        return;
      }

      const drawCompositeFrame = () => {
        const snap = liveRecordingStateRef.current;
        ctx2d.fillStyle = '#0F172A';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);

        // Top AMMON Header Bar
        ctx2d.fillStyle = '#14532D';
        ctx2d.fillRect(0, 0, canvas.width, 54);
        ctx2d.fillStyle = '#FFFFFF';
        ctx2d.font = 'bold 20px sans-serif';
        ctx2d.fillText(
          `AMMON Meeting Recording • ${snap.activeMeeting?.title || 'Live Session'}`,
          22,
          34
        );

        // REC timer badge
        ctx2d.fillStyle = '#DC2626';
        ctx2d.fillRect(canvas.width - 155, 12, 134, 30);
        ctx2d.fillStyle = '#FFFFFF';
        ctx2d.font = 'bold 16px monospace';
        ctx2d.fillText(`● REC ${formatRecDuration(recordingSecondsRef.current)}`, canvas.width - 142, 33);

        // Check active screen share (<video> local or remote)
        const remoteVideos = Array.from(
          document.querySelectorAll<HTMLVideoElement>('video[data-rtc-peer-video="true"]')
        );
        const remoteScreenEl = remoteVideos.find(
          (v) => v.dataset.screenSharing === 'true' && v.readyState >= 2 && v.videoWidth > 0
        );
        const localVideoEl = videoRef.current;
        const localScreenReady =
          snap.screenSharing && localVideoEl && localVideoEl.readyState >= 2 && localVideoEl.videoWidth > 0;

        const screenSourceEl = localScreenReady ? localVideoEl : remoteScreenEl;
        const areaTop = 66;
        const areaHeight = canvas.height - areaTop - 16;
        const areaWidth = canvas.width - 32;

        if (screenSourceEl) {
          // Draw full-stage uncropped shared screen
          const scale = Math.min(
            areaWidth / screenSourceEl.videoWidth,
            areaHeight / screenSourceEl.videoHeight
          );
          const drawW = screenSourceEl.videoWidth * scale;
          const drawH = screenSourceEl.videoHeight * scale;
          const dx = 16 + (areaWidth - drawW) / 2;
          const dy = areaTop + (areaHeight - drawH) / 2;
          ctx2d.fillStyle = '#000000';
          ctx2d.fillRect(16, areaTop, areaWidth, areaHeight);
          ctx2d.drawImage(screenSourceEl, dx, dy, drawW, drawH);

          // Presenter label
          const presenterName = localScreenReady
            ? `${snap.userName} (Host Screen Share)`
            : `${remoteScreenEl?.dataset.peerName || 'Participant'} (Screen Share)`;
          ctx2d.fillStyle = 'rgba(23, 107, 55, 0.9)';
          ctx2d.fillRect(28, areaTop + 12, 340, 30);
          ctx2d.fillStyle = '#FFFFFF';
          ctx2d.font = 'bold 14px sans-serif';
          ctx2d.fillText(presenterName, 40, areaTop + 32);
          return;
        }

        // Participant tiles grid (video feeds + audio-only badges)
        interface TileItem {
          label: string;
          micOn: boolean;
          videoEl: HTMLVideoElement | null;
        }
        const tiles: TileItem[] = [
          {
            label: `${snap.userName} (Host)`,
            micOn: snap.micOn,
            videoEl:
              snap.camOn && localVideoEl && localVideoEl.readyState >= 2 && localVideoEl.videoWidth > 0
                ? localVideoEl
                : null,
          },
        ];

        for (const p of snap.remotePeers) {
          const matchEl =
            remoteVideos.find(
              (v) => v.dataset.peerId === p.peerId && p.camOn && v.readyState >= 2 && v.videoWidth > 0
            ) || null;
          tiles.push({
            label: p.name,
            micOn: p.micOn,
            videoEl: matchEl,
          });
        }

        const shownTiles = tiles.slice(0, 4);
        const cols = shownTiles.length <= 1 ? 1 : 2;
        const rows = shownTiles.length <= 2 ? 1 : 2;
        const gap = 16;
        const tileW = (areaWidth - gap * (cols - 1)) / cols;
        const tileH = (areaHeight - gap * (rows - 1)) / rows;

        shownTiles.forEach((tile, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = 16 + col * (tileW + gap);
          const y = areaTop + row * (tileH + gap);

          ctx2d.fillStyle = '#1E293B';
          ctx2d.fillRect(x, y, tileW, tileH);
          ctx2d.strokeStyle = '#176B37';
          ctx2d.lineWidth = 3;
          ctx2d.strokeRect(x, y, tileW, tileH);

          if (tile.videoEl) {
            const scale = Math.max(tileW / tile.videoEl.videoWidth, tileH / tile.videoEl.videoHeight);
            const dw = tile.videoEl.videoWidth * scale;
            const dh = tile.videoEl.videoHeight * scale;
            ctx2d.save();
            ctx2d.beginPath();
            ctx2d.rect(x, y, tileW, tileH);
            ctx2d.clip();
            ctx2d.drawImage(tile.videoEl, x + (tileW - dw) / 2, y + (tileH - dh) / 2, dw, dh);
            ctx2d.restore();
          } else {
            ctx2d.beginPath();
            ctx2d.arc(x + tileW / 2, y + tileH / 2 - 14, 42, 0, Math.PI * 2);
            ctx2d.fillStyle = '#176B37';
            ctx2d.fill();
            ctx2d.fillStyle = '#FFFFFF';
            ctx2d.font = 'bold 26px sans-serif';
            const initials = tile.label
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0] || '')
              .join('')
              .toUpperCase();
            ctx2d.textAlign = 'center';
            ctx2d.fillText(initials, x + tileW / 2, y + tileH / 2 - 5);
            ctx2d.textAlign = 'left';
          }

          ctx2d.fillStyle = 'rgba(0,0,0,0.7)';
          ctx2d.fillRect(x + 10, y + tileH - 36, Math.min(tileW - 20, 320), 26);
          ctx2d.fillStyle = tile.micOn ? '#4ADE80' : '#F87171';
          ctx2d.font = 'bold 13px sans-serif';
          ctx2d.fillText(`${tile.micOn ? 'MIC' : 'MUTED'} • ${tile.label}`, x + 18, y + tileH - 18);
        });
      };

      drawCompositeFrame();
      recordingDrawTimerRef.current = setInterval(drawCompositeFrame, 50); // 20fps keeps drawing even when tab backgrounded during screen share

      const canvasStream = canvas.captureStream(20);
      const combinedTracks: MediaStreamTrack[] = [
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ];
      const compositeStream = new MediaStream(combinedTracks);
      recordingCompositeStreamRef.current = compositeStream;

      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const supportedMime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = supportedMime
        ? new MediaRecorder(compositeStream, {
            mimeType: supportedMime,
            videoBitsPerSecond: 900_000,
            audioBitsPerSecond: 64_000,
          })
        : new MediaRecorder(compositeStream, {
            videoBitsPerSecond: 900_000,
            audioBitsPerSecond: 64_000,
          });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          recordedChunksRef.current.push(evt.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setIsLocalRecording(true);
      setRemoteRecordingBy(currentUser.name);

      recordingDurationTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);

      recorder.start(2500);

      onUpdateMeeting(activeMeeting.id, {
        isRecording: true,
        recordingStartedBy: currentUser.name,
      });
      signalingRef.current?.sendRecordingState(true, currentUser.name);
    } catch (err) {
      cleanupRecorderResources();
      setIsLocalRecording(false);
      setMediaNotice(
        err instanceof Error
          ? `Unable to start meeting recording: ${err.message}`
          : 'Unable to start meeting recording in this browser.'
      );
    }
  };

  const stopAndSaveRecording = async (targetMeeting: OnlineMeeting): Promise<void> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      cleanupRecorderResources();
      setIsLocalRecording(false);
      return;
    }

    const durationSnap = recordingSecondsRef.current;
    setIsLocalRecording(false);
    setRemoteRecordingBy(null);
    setIsUploadingRecording(true);
    setRecordingUploadPct(5);

    signalingRef.current?.sendRecordingState(false, currentUser.name);

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const mime = recorder.mimeType || 'video/webm';
        resolve(new Blob(recordedChunksRef.current, { type: mime }));
      };
      try {
        recorder.stop();
      } catch {
        resolve(new Blob(recordedChunksRef.current, { type: 'video/webm' }));
      }
    });

    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    cleanupRecorderResources();

    if (!blob.size) {
      setIsUploadingRecording(false);
      setRecordingUploadPct(0);
      setMediaNotice('Recording stopped before any video frames were captured.');
      onUpdateMeeting(targetMeeting.id, { isRecording: false, recordingStartedBy: '' });
      return;
    }

    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const safeTitle = targetMeeting.title
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40) || 'ammon_meeting';
      const uploadRes = await uploadMeetingRecordingAsset({
        blob,
        meetingId: targetMeeting.id,
        fileName: `${safeTitle}_${targetMeeting.meetingCode}.${ext}`,
        mimeType: blob.type || `video/${ext}`,
        meetingTitle: targetMeeting.title,
        recordedBy: currentUser.name,
        onProgress: (pct) => setRecordingUploadPct(pct),
      });

      const newRecording: MeetingRecording = {
        id: `rec-${Date.now()}`,
        title: `${targetMeeting.title} — Session Recording`,
        url: uploadRes.url,
        storagePath: uploadRes.storagePath,
        bucketName: uploadRes.bucketName,
        mimeType: uploadRes.mimeType,
        sizeLabel: uploadRes.sizeLabel,
        durationLabel: formatRecDuration(durationSnap),
        recordedBy: currentUser.name,
        recordedAt: new Date().toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        createdAtMs: Date.now(),
      };

      const existingRecs = Array.isArray(targetMeeting.recordings)
        ? targetMeeting.recordings
        : [];

      onUpdateMeeting(targetMeeting.id, {
        recordings: [newRecording, ...existingRecs],
        isRecording: false,
        recordingStartedBy: '',
      });

      const destLabel =
        uploadRes.provider === 'firebase-storage'
          ? `AMMON Firebase Storage (${uploadRes.bucketName}/${uploadRes.storagePath})`
          : `AMMON Persistent Media Vault (${uploadRes.storagePath})`;
      setRecordingStatusMessage(
        `Session video (${newRecording.sizeLabel}, ${newRecording.durationLabel}) saved to ${destLabel} for absent members.`
      );
    } catch (err) {
      onUpdateMeeting(targetMeeting.id, { isRecording: false, recordingStartedBy: '' });
      setMediaNotice(
        err instanceof Error
          ? err.message
          : 'Failed to upload recorded session video to AMMON Firebase Storage.'
      );
    } finally {
      setIsUploadingRecording(false);
      setRecordingUploadPct(0);
      setRecordingSeconds(0);
    }
  };

  const handleLeaveMeeting = async () => {
    if (isLocalRecording && activeMeeting) {
      await stopAndSaveRecording(activeMeeting);
    }
    stopAllLocalMediaAndRtc();
    setActiveMeetingId(null);
  };

  const handleEndMeeting = async (mtg: OnlineMeeting) => {
    if (!isUserMeetingHost(mtg)) return;
    if (isLocalRecording && activeMeeting?.id === mtg.id) {
      await stopAndSaveRecording(mtg);
    }
    signalingRef.current?.endMeeting(currentUser.name);
    onUpdateMeeting(mtg.id, { status: 'Ended', isRecording: false, recordingStartedBy: '' });
    stopAllLocalMediaAndRtc();
    setActiveMeetingId(null);
    setMeetingLobbyNotice(
      `Meeting "${mtg.title}" has been concluded by host (${currentUser.name}). Any saved recordings remain available below for members who could not attend.`
    );
  };

  const handleToggleRaiseHand = (mtg: OnlineMeeting) => {
    const hands = Array.isArray(mtg.raisedHands) ? mtg.raisedHands : [];
    const isRaised = hands.includes(currentUser.name);
    const updated = isRaised ? hands.filter((n) => n !== currentUser.name) : [...hands, currentUser.name];
    onUpdateMeeting(mtg.id, { raisedHands: updated });
    signalingRef.current?.updateMediaState({ handRaised: !isRaised });
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

                      {/* Device Attachment Preview: Images, Videos, Audio & Documents */}
                      {msg.attachmentData && msg.attachmentType?.startsWith('image/') && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-black/10 bg-white">
                          <img
                            src={msg.attachmentData}
                            alt={msg.attachmentName || 'Uploaded image'}
                            onClick={() =>
                              setPreviewMedia({
                                src: msg.attachmentData!,
                                name: msg.attachmentName || 'image.jpg',
                                kind: 'image',
                              })
                            }
                            className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          />
                        </div>
                      )}

                      {msg.attachmentData &&
                        isVideoFile(msg.attachmentName, msg.attachmentType) && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-black/15 bg-black shadow-xs">
                            <video
                              src={msg.attachmentData}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-72 bg-black object-contain"
                            />
                            <div className="px-2.5 py-1.5 bg-slate-900/95 text-white flex items-center justify-between gap-2 text-[11px]">
                              <span className="truncate font-semibold flex items-center gap-1.5 min-w-0">
                                <Film className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">{msg.attachmentName || 'Video clip'}</span>
                                {msg.attachmentSize && (
                                  <span className="text-slate-400 shrink-0">({msg.attachmentSize})</span>
                                )}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewMedia({
                                      src: msg.attachmentData!,
                                      name: msg.attachmentName || 'video.mp4',
                                      kind: 'video',
                                    })
                                  }
                                  className="text-emerald-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                                  title="Expand video player"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>Expand</span>
                                </button>
                                <a
                                  href={msg.attachmentData}
                                  download={msg.attachmentName || 'video.mp4'}
                                  className="text-slate-300 hover:text-white"
                                  title="Download video"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                      {msg.attachmentData &&
                        isAudioFile(msg.attachmentName, msg.attachmentType) && (
                          <div className="mb-2 p-2.5 rounded-xl bg-white/95 border border-[#E5E7EB] space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-bold text-[#14532D] truncate flex items-center gap-1.5">
                                <Volume2 className="w-3.5 h-3.5 text-[#176B37] shrink-0" />
                                <span className="truncate">{msg.attachmentName || 'Audio clip'}</span>
                              </span>
                              {msg.attachmentSize && (
                                <span className="text-gray-400 shrink-0">{msg.attachmentSize}</span>
                              )}
                            </div>
                            <audio
                              src={msg.attachmentData}
                              controls
                              preload="metadata"
                              className="w-full h-9"
                            />
                          </div>
                        )}

                      {msg.attachmentData &&
                        !msg.attachmentType?.startsWith('image/') &&
                        !isVideoFile(msg.attachmentName, msg.attachmentType) &&
                        !isAudioFile(msg.attachmentName, msg.attachmentType) && (
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

              {/* Uploading Media Progress Indicator */}
              {isUploadingMedia && (
                <div className="mb-2 px-3 py-2 rounded-xl bg-emerald-50 border border-[#176B37]/30 text-[#14532D] text-xs font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#176B37]" />
                  <span>Uploading media file to AMMON vault...</span>
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
                    ) : isVideoFile(pendingAttachment.name, pendingAttachment.type) ? (
                      <video
                        src={pendingAttachment.data}
                        muted
                        playsInline
                        controls
                        className="w-20 h-12 rounded-lg object-cover bg-black shrink-0 border border-gray-200"
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

                {/* Upload from Device (Videos, Photos, Audio & Documents) */}
                <label
                  className="p-2 rounded-full text-gray-600 hover:text-[#176B37] hover:bg-white transition-colors cursor-pointer shrink-0"
                  title="Upload photo, video, audio or document from device"
                >
                  <Paperclip className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                    className="hidden"
                    onChange={handleDeviceUpload}
                  />
                </label>

                {/* Quick Video Upload from Device */}
                <label
                  className="p-2 rounded-full text-gray-600 hover:text-[#176B37] hover:bg-white transition-colors cursor-pointer shrink-0"
                  title="Upload video from device (MP4, WebM, MOV up to 25MB)"
                >
                  <Film className="w-5 h-5" />
                  <input
                    type="file"
                    accept="video/*"
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

                <div className="flex flex-wrap items-center gap-2">
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

                  {isMeetingHost && (
                    <button
                      type="button"
                      onClick={() => handleEndMeeting(activeMeeting)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 border border-rose-300/40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="End meeting for all participants (Host only)"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>End Meeting</span>
                    </button>
                  )}

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
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex flex-wrap items-center justify-between gap-2">
                  <span>{mediaNotice}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {!micOn && (
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        className="px-2.5 py-1 rounded-lg bg-[#176B37] text-white font-bold cursor-pointer"
                      >
                        Retry Mic
                      </button>
                    )}
                    {!camOn && (
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        className="px-2.5 py-1 rounded-lg bg-[#14532D] text-white font-bold cursor-pointer"
                      >
                        Retry Camera
                      </button>
                    )}
                    <button type="button" onClick={() => setMediaNotice('')} className="cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {audioPlaybackBlocked && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-[#176B37]/30 text-[#14532D] text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>Browser blocked automatic speaker playback for remote members. Tap below to hear live audio:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSpeakerOn(true);
                      setAudioPlaybackBlocked(false);
                      document.querySelectorAll<HTMLAudioElement>('audio[data-rtc-remote]').forEach((el) => {
                        el.muted = false;
                        el.play().catch(() => {});
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#176B37] text-white font-bold cursor-pointer"
                  >
                    Enable Live Audio
                  </button>
                </div>
              )}

              {isUploadingRecording && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-[#176B37]/40 text-[#14532D] text-xs font-semibold flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#176B37]" />
                    <span>
                      Saving recorded session video to AMMON Firebase Storage bucket ({recordingUploadPct}%)...
                    </span>
                  </span>
                </div>
              )}

              {recordingStatusMessage && (
                <div className="p-3 rounded-xl bg-[#EAF3ED] border border-[#176B37]/30 text-[#14532D] text-xs font-semibold flex items-center justify-between gap-2">
                  <span>{recordingStatusMessage}</span>
                  <button
                    type="button"
                    onClick={() => setRecordingStatusMessage('')}
                    className="cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Video Stage + Live Meeting Chat Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left 8 Cols: Video Grid & Controls */}
                <div className="lg:col-span-8 space-y-3">
                  {/* Live Transport & Recording Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-[11px]">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="flex items-center gap-1.5 font-semibold text-[#14532D]">
                        <Wifi className="w-3.5 h-3.5 text-[#176B37]" />
                        <span>
                          Live Audio/Video Mesh:{' '}
                          {rtcTransportMode === 'websocket'
                            ? 'Real-Time WebSocket Connected'
                            : rtcTransportMode === 'firestore'
                            ? 'Cloud Sync Connected'
                            : 'Connecting...'}
                        </span>
                      </span>

                      {(isLocalRecording || activeMeeting.isRecording || remoteRecordingBy) && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[10px] tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          <span>
                            {isLocalRecording
                              ? `RECORDING • ${formatRecDuration(recordingSeconds)}`
                              : `REC LIVE (${activeMeeting.recordingStartedBy || remoteRecordingBy || 'Host'})`}
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 font-medium">
                      {remotePeers.length + 1} Active in Live Audio Room
                    </span>
                  </div>

                  {/* Active Screen-Sharing Indicator Banner + Broadcaster-only Stop Sharing button */}
                  {(screenSharing || remotePeers.some((p) => p.screenSharing)) && (() => {
                    const remotePresenter = remotePeers.find((p) => p.screenSharing);
                    return (
                      <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950 text-white border border-emerald-500/50 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-bold min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                          <MonitorUp className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span className="truncate">
                            {screenSharing
                              ? 'Screen Sharing Active: You are broadcasting your screen to all participants'
                              : `Screen Sharing Active: ${remotePresenter?.name || 'A participant'} is sharing their screen`}
                          </span>
                        </div>
                        {screenSharing && (
                          <button
                            type="button"
                            onClick={handleToggleScreenShare}
                            className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                          >
                            <Square className="w-3 h-3 fill-white" />
                            <span>Stop Sharing</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Your Live Video / Screen Share / Avatar Tile */}
                    <div
                      className={`relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-[#176B37] flex items-center justify-center ${
                        screenSharing ? 'sm:col-span-2 aspect-16/9 bg-black' : 'aspect-16/10'
                      }`}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full ${
                          screenSharing ? 'object-contain bg-black' : 'object-cover'
                        } ${camOn || screenSharing ? 'block' : 'hidden'}`}
                      />
                      {!camOn && !screenSharing && (
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
                            {micOn ? 'Microphone Active' : 'Mic Muted'} • Camera Off
                          </p>
                        </div>
                      )}
                      {screenSharing && (
                        <>
                          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#176B37] text-white text-[10px] font-extrabold flex items-center gap-1.5 shadow-sm">
                            <MonitorUp className="w-3 h-3 text-emerald-200" />
                            <span>Broadcasting Your Screen</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleScreenShare}
                            className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <Square className="w-2.5 h-2.5 fill-white" />
                            <span>Stop Sharing</span>
                          </button>
                        </>
                      )}
                      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/65 text-white text-[11px] font-semibold flex items-center gap-1.5">
                        {micOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-red-400" />}
                        <span>{currentUser.name} (You)</span>
                      </div>
                      {!screenSharing && (activeMeeting.raisedHands || []).includes(currentUser.name) && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold flex items-center gap-1">
                          <Hand className="w-3 h-3" />
                          <span>Hand Raised</span>
                        </div>
                      )}
                    </div>

                    {/* Connected Remote WebRTC Peers (Live Audio + Video) */}
                    {remotePeers.map((peer) => (
                      <RemotePeerTile
                        key={peer.peerId}
                        peer={peer}
                        remoteStream={remoteStreams[peer.peerId]}
                        connState={peerConnStates[peer.peerId]}
                        isHost={peer.name === activeMeeting.hostName}
                        speakerOn={speakerOn}
                        onPlaybackBlocked={() => setAudioPlaybackBlocked(true)}
                      />
                    ))}

                    {/* Directory Co-Participants who haven't opened audio room yet */}
                    {(activeMeeting.participants || [])
                      .filter(
                        (p) =>
                          p !== currentUser.name &&
                          !remotePeers.some((rp) => rp.name === p)
                      )
                      .slice(0, Math.max(0, 3 - remotePeers.length))
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
                            <span className="text-[10px] text-slate-300">
                              {isHost ? 'Meeting Host' : 'In Lobby / Audio Standby'}
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
                      onClick={handleToggleMic}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        micOn ? 'bg-[#EAF3ED] text-[#176B37]' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      <span>{micOn ? 'Mute Mic' : 'Unmute Mic'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        camOn ? 'bg-[#176B37] text-white' : 'bg-gray-100 text-gray-700 hover:bg-[#EAF3ED] hover:text-[#176B37]'
                      }`}
                    >
                      {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      <span>{camOn ? 'Turn Camera Off' : 'Turn Camera On'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleScreenShare}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        screenSharing
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-[#EAF3ED] hover:text-[#176B37]'
                      }`}
                    >
                      <MonitorUp className="w-4 h-4" />
                      <span>{screenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSpeakerOn(!speakerOn)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        speakerOn ? 'bg-[#EAF3ED] text-[#176B37]' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                      title="Toggle incoming audio from other participants"
                    >
                      {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      <span>{speakerOn ? 'Speaker On' : 'Speaker Muted'}</span>
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

                    {isMeetingHost && (
                      <button
                        type="button"
                        disabled={isUploadingRecording}
                        onClick={() =>
                          isLocalRecording
                            ? stopAndSaveRecording(activeMeeting)
                            : handleStartRecording()
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                          isUploadingRecording
                            ? 'bg-gray-200 text-gray-500 cursor-wait'
                            : isLocalRecording
                            ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer animate-pulse'
                            : 'bg-[#14532D] hover:bg-[#176B37] text-white cursor-pointer'
                        }`}
                        title="Record meeting video & save to AMMON Firebase Storage for absent members (Host only)"
                      >
                        {isUploadingRecording ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isLocalRecording ? (
                          <Square className="w-3.5 h-3.5 fill-white" />
                        ) : (
                          <Disc className="w-4 h-4 text-rose-300" />
                        )}
                        <span>
                          {isUploadingRecording
                            ? `Saving ${recordingUploadPct}%`
                            : isLocalRecording
                            ? `Stop Recording (${formatRecDuration(recordingSeconds)})`
                            : 'Record Session'}
                        </span>
                      </button>
                    )}

                    {isMeetingHost && (
                      <button
                        type="button"
                        disabled={isUploadingRecording}
                        onClick={() => handleEndMeeting(activeMeeting)}
                        className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        title="End meeting for all participants (Host only)"
                      >
                        <Power className="w-4 h-4" />
                        <span>End Meeting</span>
                      </button>
                    )}
                  </div>

                  {/* Saved Recordings in Current Session (Playable immediately when saved) */}
                  {(activeMeeting.recordings || []).length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-[#176B37]/30 space-y-2.5">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#176B37] flex items-center gap-1.5">
                        <Film className="w-4 h-4" />
                        <span>Saved Session Recordings ({activeMeeting.recordings!.length})</span>
                      </h5>
                      <div className="space-y-2">
                        {activeMeeting.recordings!.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-2.5 rounded-xl bg-[#F9FBFA] border border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-[#252525] truncate">{rec.title}</p>
                              <p className="text-[10px] text-gray-500">
                                {rec.durationLabel} • {rec.sizeLabel} • Saved by {rec.recordedBy} ({rec.recordedAt})
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewMedia({
                                    src: rec.url,
                                    name: `${rec.title} (${rec.durationLabel})`,
                                    kind: 'video',
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#176B37] hover:bg-[#14532D] text-white font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-white" />
                                <span>Watch</span>
                              </button>
                              <a
                                href={rec.url}
                                download={`${rec.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`}
                                className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] text-gray-700 hover:bg-gray-100 font-semibold flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>Save</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

              {meetingLobbyNotice && (
                <div className="p-3.5 rounded-2xl bg-[#EAF3ED] border border-[#176B37]/30 text-[#14532D] text-xs font-semibold flex items-center justify-between gap-2">
                  <span>{meetingLobbyNotice}</span>
                  <button
                    type="button"
                    onClick={() => setMeetingLobbyNotice('')}
                    className="p-1 text-[#176B37] hover:text-[#14532D] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Meetings Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meetings.map((mtg) => {
                  const isLive = mtg.status === 'Live';
                  const isEnded = mtg.status === 'Ended';
                  const isCardHost = isUserMeetingHost(mtg);
                  return (
                    <div
                      key={mtg.id}
                      className={`bg-white rounded-2xl border p-5 flex flex-col justify-between gap-4 shadow-xs ${
                        isLive
                          ? 'border-[#176B37] ring-1 ring-[#176B37]/20'
                          : isEnded
                          ? 'border-gray-200 opacity-80'
                          : 'border-[#E5E7EB]'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                              isLive
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : isEnded
                                ? 'bg-gray-100 text-gray-600 border border-gray-200'
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

                        {/* Recorded Session Replay Links for Members Who Missed the Meeting */}
                        {Array.isArray(mtg.recordings) && mtg.recordings.length > 0 && (
                          <div className="pt-2 border-t border-gray-100 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#176B37] flex items-center gap-1">
                              <Film className="w-3 h-3" />
                              <span>Recorded Sessions ({mtg.recordings.length})</span>
                            </p>
                            {mtg.recordings.slice(0, 3).map((rec) => (
                              <div
                                key={rec.id}
                                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#EAF3ED]/50 border border-[#176B37]/20 text-[11px]"
                              >
                                <div className="min-w-0">
                                  <p className="font-bold text-[#14532D] truncate">
                                    Replay • {rec.durationLabel}
                                  </p>
                                  <p className="text-[10px] text-gray-500 truncate">
                                    {rec.sizeLabel} • {rec.recordedAt}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewMedia({
                                        src: rec.url,
                                        name: `${rec.title} (${rec.durationLabel})`,
                                        kind: 'video',
                                      })
                                    }
                                    className="px-2 py-1 rounded-lg bg-[#176B37] hover:bg-[#14532D] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Play className="w-2.5 h-2.5 fill-white" />
                                    <span>Watch</span>
                                  </button>
                                  <a
                                    href={rec.url}
                                    download={`${mtg.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`}
                                    className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-[#176B37]"
                                    title="Download session video"
                                  >
                                    <Download className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isEnded}
                          onClick={() => handleJoinMeeting(mtg)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            isEnded
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : isLive
                              ? 'bg-[#176B37] hover:bg-[#14532D] text-white cursor-pointer'
                              : 'bg-[#EAF3ED] hover:bg-[#176B37] text-[#176B37] hover:text-white cursor-pointer'
                          }`}
                        >
                          <Video className="w-4 h-4" />
                          <span>
                            {isEnded
                              ? 'Meeting Ended'
                              : isLive
                              ? 'Join Live Meeting Room'
                              : 'Enter / Start Meeting'}
                          </span>
                        </button>

                        {isLive && isCardHost && (
                          <button
                            type="button"
                            onClick={() => handleEndMeeting(mtg)}
                            className="p-2.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 transition-colors cursor-pointer shrink-0"
                            title="End Meeting (Host Only)"
                            aria-label="End Meeting"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Media Preview (Images & Video Player) */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="font-bold text-xs text-[#252525] truncate">{previewMedia.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewMedia.src}
                  download={previewMedia.name}
                  className="px-3 py-1 rounded-lg bg-[#176B37] text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="p-1 text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {previewMedia.kind === 'video' ? (
              <video
                src={previewMedia.src}
                controls
                autoPlay
                playsInline
                className="max-h-[76vh] w-full bg-black rounded-lg mt-2"
              />
            ) : (
              <img
                src={previewMedia.src}
                alt={previewMedia.name}
                className="max-h-[75vh] w-auto mx-auto object-contain rounded-lg mt-2"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface RemotePeerTileProps {
  peer: RtcPeerInfo;
  remoteStream?: MediaStream;
  connState?: string;
  isHost: boolean;
  speakerOn: boolean;
  onPlaybackBlocked: () => void;
}

const RemotePeerTile: React.FC<RemotePeerTileProps> = ({
  peer,
  remoteStream,
  connState,
  isHost,
  speakerOn,
  onPlaybackBlocked,
}) => {
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const onPlaybackBlockedRef = useRef(onPlaybackBlocked);
  onPlaybackBlockedRef.current = onPlaybackBlocked;

  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (audioEl && remoteStream) {
      if (audioEl.srcObject !== remoteStream) {
        audioEl.srcObject = remoteStream;
      }
      audioEl.muted = !speakerOn;
      audioEl.volume = 1;
      audioEl.play().catch(() => {
        onPlaybackBlockedRef.current();
      });
    }
  }, [remoteStream, speakerOn]);

  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (videoEl && remoteStream && (peer.camOn || peer.screenSharing)) {
      if (videoEl.srcObject !== remoteStream) {
        videoEl.srcObject = remoteStream;
      }
      videoEl.play().catch(() => {});
    }
  }, [remoteStream, peer.camOn, peer.screenSharing]);

  const showVideo = Boolean(remoteStream && (peer.camOn || peer.screenSharing));

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-800 border border-emerald-500/40 flex flex-col items-center justify-center ${
        peer.screenSharing ? 'sm:col-span-2 aspect-16/9 bg-black' : 'aspect-16/10'
      }`}
    >
      {/* Persistent audio element so remote member voice plays reliably */}
      <audio ref={remoteAudioRef} data-rtc-remote="true" autoPlay playsInline className="hidden" />

      <video
        ref={remoteVideoRef}
        data-rtc-peer-video="true"
        data-peer-id={peer.peerId}
        data-peer-name={peer.name}
        data-screen-sharing={peer.screenSharing ? 'true' : 'false'}
        autoPlay
        muted
        playsInline
        className={`w-full h-full ${
          peer.screenSharing ? 'object-contain bg-black' : 'object-cover'
        } ${showVideo ? 'block' : 'hidden'}`}
      />

      {peer.screenSharing && showVideo && (
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#176B37] text-white text-[10px] font-extrabold flex items-center gap-1.5 shadow-sm">
          <MonitorUp className="w-3 h-3 text-emerald-200" />
          <span>Presenting Screen</span>
        </div>
      )}

      {!showVideo && (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-700 text-white font-bold text-lg flex items-center justify-center border-2 border-emerald-400/50">
            {peer.name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')}
          </div>
          <p className="text-white font-bold text-xs mt-2 truncate max-w-full">{peer.name}</p>
          <span className="text-[10px] text-emerald-300">
            {isHost ? 'Meeting Host' : peer.role} •{' '}
            {connState === 'connected' ? 'Audio Live' : connState || 'Connecting...'}
          </span>
        </div>
      )}

      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/65 text-white text-[11px] font-semibold flex items-center gap-1.5">
        {peer.micOn ? (
          <Mic className="w-3 h-3 text-emerald-400" />
        ) : (
          <MicOff className="w-3 h-3 text-red-400" />
        )}
        <span className="truncate max-w-[140px]">{peer.name}</span>
      </div>

      {peer.handRaised && (
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center gap-1">
          <Hand className="w-3 h-3" />
          <span>Raised</span>
        </div>
      )}
    </div>
  );
};
