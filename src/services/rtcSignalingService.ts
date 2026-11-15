import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface RtcPeerInfo {
  peerId: string;
  userId: string;
  name: string;
  role: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  handRaised: boolean;
}

export type RtcSignalPayload =
  | { kind: 'offer'; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice-candidate'; candidate: RTCIceCandidateInit };

export interface RtcSignalingCallbacks {
  onTransportChange: (mode: 'websocket' | 'firestore' | 'connecting') => void;
  onPeersChange: (peers: RtcPeerInfo[]) => void;
  onSignal: (fromPeerId: string, signal: RtcSignalPayload) => void;
  onRecordingState?: (isRecording: boolean, startedBy?: string) => void;
  onMeetingEnded?: (endedBy?: string) => void;
  onError?: (message: string) => void;
}

const RTC_HEARTBEAT_MS = 18000;

export class RtcSignalingSession {
  readonly roomId: string;
  readonly selfPeer: RtcPeerInfo;
  private callbacks: RtcSignalingCallbacks;
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private firestoreUnsubs: Unsubscribe[] = [];
  private processedSignalIds = new Set<string>();
  private peersMap = new Map<string, RtcPeerInfo>();
  private closed = false;
  private mode: 'connecting' | 'websocket' | 'firestore' = 'connecting';

  constructor(
    roomId: string,
    selfPeer: RtcPeerInfo,
    callbacks: RtcSignalingCallbacks
  ) {
    this.roomId = roomId;
    this.selfPeer = { ...selfPeer };
    this.callbacks = callbacks;
  }

  start(): void {
    this.closed = false;
    this.mode = 'connecting';
    this.callbacks.onTransportChange('connecting');
    this.connectWebSocket();
  }

  private emitPeers(): void {
    this.callbacks.onPeersChange(Array.from(this.peersMap.values()));
  }

  private connectWebSocket(): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      this.startFirestoreFallback();
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/meetings`;
    let opened = false;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const connectTimeout = setTimeout(() => {
        if (!opened && !this.closed) {
          try {
            ws.close();
          } catch {
            // ignore
          }
          this.startFirestoreFallback();
        }
      }, 2800);

      ws.onopen = () => {
        if (this.closed) {
          ws.close();
          return;
        }
        opened = true;
        clearTimeout(connectTimeout);
        this.mode = 'websocket';
        this.callbacks.onTransportChange('websocket');

        ws.send(
          JSON.stringify({
            type: 'join-room',
            roomId: this.roomId,
            ...this.selfPeer,
          })
        );

        this.heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, RTC_HEARTBEAT_MS);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data || '{}')) as {
            type?: string;
            peers?: RtcPeerInfo[];
            peer?: RtcPeerInfo;
            peerId?: string;
            fromPeerId?: string;
            endedBy?: string;
            isRecording?: boolean;
            startedBy?: string;
            signal?: RtcSignalPayload;
          };

          if (msg.type === 'room-state' && Array.isArray(msg.peers)) {
            this.peersMap.clear();
            msg.peers.forEach((p) => {
              if (p.peerId && p.peerId !== this.selfPeer.peerId) {
                this.peersMap.set(p.peerId, p);
              }
            });
            this.emitPeers();
            return;
          }

          if (msg.type === 'peer-joined' && msg.peer) {
            if (msg.peer.peerId !== this.selfPeer.peerId) {
              this.peersMap.set(msg.peer.peerId, msg.peer);
              this.emitPeers();
            }
            return;
          }

          if (msg.type === 'peer-media-state' && msg.peer) {
            if (msg.peer.peerId !== this.selfPeer.peerId) {
              this.peersMap.set(msg.peer.peerId, msg.peer);
              this.emitPeers();
            }
            return;
          }

          if (msg.type === 'peer-left' && msg.peerId) {
            if (this.peersMap.delete(msg.peerId)) {
              this.emitPeers();
            }
            return;
          }

          if (msg.type === 'signal' && msg.fromPeerId && msg.signal) {
            this.callbacks.onSignal(msg.fromPeerId, msg.signal);
            return;
          }

          if (msg.type === 'recording-state') {
            this.callbacks.onRecordingState?.(Boolean(msg.isRecording), msg.startedBy);
            return;
          }

          if (msg.type === 'meeting-ended') {
            this.peersMap.clear();
            this.callbacks.onMeetingEnded?.(msg.endedBy);
          }
        } catch {
          // Ignore malformed signaling messages
        }
      };

      ws.onerror = () => {
        if (!opened && !this.closed) {
          clearTimeout(connectTimeout);
          this.startFirestoreFallback();
        }
      };

      ws.onclose = () => {
        clearTimeout(connectTimeout);
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        if (!this.closed && !opened) {
          this.startFirestoreFallback();
        } else if (!this.closed && opened && this.mode === 'websocket') {
          // Reconnect seamlessly or fall back to Firestore if WebSocket dropped
          setTimeout(() => {
            if (!this.closed) {
              this.connectWebSocket();
            }
          }, 1500);
        }
      };
    } catch {
      this.startFirestoreFallback();
    }
  }

  private startFirestoreFallback(): void {
    if (this.closed || this.mode === 'firestore') return;
    this.mode = 'firestore';
    this.callbacks.onTransportChange('firestore');

    const peerRef = doc(db, 'meetings', this.roomId, 'rtc_peers', this.selfPeer.peerId);
    setDoc(peerRef, {
      ...this.selfPeer,
      updatedAtMs: Date.now(),
    }).catch((err) => {
      console.warn('Firestore peer registration warning:', err);
    });

    const peersCol = collection(db, 'meetings', this.roomId, 'rtc_peers');
    const unsubPeers = onSnapshot(
      peersCol,
      (snap) => {
        const nextMap = new Map<string, RtcPeerInfo>();
        const now = Date.now();
        snap.forEach((docSnap) => {
          const data = docSnap.data() as RtcPeerInfo & { updatedAtMs?: number };
          if (
            data?.peerId &&
            data.peerId !== this.selfPeer.peerId &&
            (!data.updatedAtMs || now - data.updatedAtMs < 120_000)
          ) {
            nextMap.set(data.peerId, {
              peerId: data.peerId,
              userId: data.userId || data.peerId,
              name: data.name || 'AMMON Member',
              role: data.role || 'Member',
              micOn: Boolean(data.micOn),
              camOn: Boolean(data.camOn),
              screenSharing: Boolean(data.screenSharing),
              handRaised: Boolean(data.handRaised),
            });
          }
        });
        this.peersMap = nextMap;
        this.emitPeers();
      },
      (err) => {
        console.warn('Firestore peers listener warning:', err);
      }
    );

    const signalsCol = collection(db, 'meetings', this.roomId, 'rtc_signals');
    const unsubSignals = onSnapshot(
      signalsCol,
      (snap) => {
        snap.forEach((docSnap) => {
          if (this.processedSignalIds.has(docSnap.id)) return;
          const data = docSnap.data() as {
            fromPeerId?: string;
            targetPeerId?: string;
            kind?: RtcSignalPayload['kind'];
            payload?: string;
          };
          if (data?.targetPeerId !== this.selfPeer.peerId || !data.fromPeerId || !data.kind) {
            return;
          }
          this.processedSignalIds.add(docSnap.id);
          try {
            const parsed = data.payload ? JSON.parse(data.payload) : {};
            if (data.kind === 'offer' || data.kind === 'answer') {
              this.callbacks.onSignal(data.fromPeerId, { kind: data.kind, sdp: parsed });
            } else if (data.kind === 'ice-candidate') {
              this.callbacks.onSignal(data.fromPeerId, { kind: 'ice-candidate', candidate: parsed });
            }
          } catch {
            // ignore bad signal JSON
          }
          deleteDoc(doc(db, 'meetings', this.roomId, 'rtc_signals', docSnap.id)).catch(() => {});
        });
      },
      (err) => {
        console.warn('Firestore signals listener warning:', err);
      }
    );

    this.heartbeatTimer = setInterval(() => {
      if (!this.closed) {
        setDoc(peerRef, { ...this.selfPeer, updatedAtMs: Date.now() }, { merge: true }).catch(
          () => {}
        );
      }
    }, RTC_HEARTBEAT_MS);

    this.firestoreUnsubs.push(unsubPeers, unsubSignals);
  }

  updateMediaState(partial: Partial<Pick<RtcPeerInfo, 'micOn' | 'camOn' | 'screenSharing' | 'handRaised'>>): void {
    Object.assign(this.selfPeer, partial);
    if (this.mode === 'websocket' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'media-state',
          ...partial,
        })
      );
      return;
    }
    if (this.mode === 'firestore') {
      const peerRef = doc(db, 'meetings', this.roomId, 'rtc_peers', this.selfPeer.peerId);
      setDoc(peerRef, { ...this.selfPeer, updatedAtMs: Date.now() }, { merge: true }).catch(() => {});
    }
  }

  sendSignal(targetPeerId: string, signal: RtcSignalPayload): void {
    if (this.mode === 'websocket' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'signal',
          targetPeerId,
          signal,
        })
      );
      return;
    }

    if (this.mode === 'firestore') {
      const signalId = `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const payload =
        signal.kind === 'ice-candidate'
          ? JSON.stringify(signal.candidate)
          : JSON.stringify(signal.sdp);
      setDoc(doc(db, 'meetings', this.roomId, 'rtc_signals', signalId), {
        fromPeerId: this.selfPeer.peerId,
        targetPeerId,
        kind: signal.kind,
        payload,
        createdAtMs: Date.now(),
      }).catch(() => {});
    }
  }

  sendRecordingState(isRecording: boolean, startedBy?: string): void {
    if (this.mode === 'websocket' && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'recording-state',
            isRecording,
            startedBy: startedBy || this.selfPeer.name,
          })
        );
      } catch {
        // ignore
      }
    }
  }

  endMeeting(endedBy?: string): void {
    this.closed = true;
    if (this.mode === 'websocket' && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'end-meeting',
            roomId: this.roomId,
            name: endedBy || this.selfPeer.name,
          })
        );
      } catch {
        // ignore
      }
    }
    this.stop();
  }

  stop(): void {
    this.closed = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'leave-room' }));
        }
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.firestoreUnsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // ignore
      }
    });
    this.firestoreUnsubs = [];

    if (this.mode === 'firestore') {
      deleteDoc(doc(db, 'meetings', this.roomId, 'rtc_peers', this.selfPeer.peerId)).catch(() => {});
    }
    this.peersMap.clear();
  }
}
