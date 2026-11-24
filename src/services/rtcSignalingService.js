import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";
const RTC_HEARTBEAT_MS = 18e3;
class RtcSignalingSession {
  roomId;
  selfPeer;
  callbacks;
  ws = null;
  heartbeatTimer = null;
  firestoreUnsubs = [];
  processedSignalIds = /* @__PURE__ */ new Set();
  peersMap = /* @__PURE__ */ new Map();
  closed = false;
  mode = "connecting";
  constructor(roomId, selfPeer, callbacks) {
    this.roomId = roomId;
    this.selfPeer = { ...selfPeer };
    this.callbacks = callbacks;
  }
  start() {
    this.closed = false;
    this.mode = "connecting";
    this.callbacks.onTransportChange("connecting");
    this.connectWebSocket();
  }
  emitPeers() {
    this.callbacks.onPeersChange(Array.from(this.peersMap.values()));
  }
  connectWebSocket() {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      this.startFirestoreFallback();
      return;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
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
        this.mode = "websocket";
        this.callbacks.onTransportChange("websocket");
        ws.send(
          JSON.stringify({
            type: "join-room",
            roomId: this.roomId,
            ...this.selfPeer
          })
        );
        this.heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, RTC_HEARTBEAT_MS);
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data || "{}"));
          if (msg.type === "room-state" && Array.isArray(msg.peers)) {
            this.peersMap.clear();
            msg.peers.forEach((p) => {
              if (p.peerId && p.peerId !== this.selfPeer.peerId) {
                this.peersMap.set(p.peerId, p);
              }
            });
            this.emitPeers();
            return;
          }
          if (msg.type === "peer-joined" && msg.peer) {
            if (msg.peer.peerId !== this.selfPeer.peerId) {
              this.peersMap.set(msg.peer.peerId, msg.peer);
              this.emitPeers();
            }
            return;
          }
          if (msg.type === "peer-media-state" && msg.peer) {
            if (msg.peer.peerId !== this.selfPeer.peerId) {
              this.peersMap.set(msg.peer.peerId, msg.peer);
              this.emitPeers();
            }
            return;
          }
          if (msg.type === "peer-left" && msg.peerId) {
            if (this.peersMap.delete(msg.peerId)) {
              this.emitPeers();
            }
            return;
          }
          if (msg.type === "signal" && msg.fromPeerId && msg.signal) {
            this.callbacks.onSignal(msg.fromPeerId, msg.signal);
            return;
          }
          if (msg.type === "recording-state") {
            this.callbacks.onRecordingState?.(Boolean(msg.isRecording), msg.startedBy);
            return;
          }
          if (msg.type === "meeting-ended") {
            this.peersMap.clear();
            this.callbacks.onMeetingEnded?.(msg.endedBy);
          }
        } catch {
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
        } else if (!this.closed && opened && this.mode === "websocket") {
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
  startFirestoreFallback() {
    if (this.closed || this.mode === "firestore") return;
    this.mode = "firestore";
    this.callbacks.onTransportChange("firestore");
    const peerRef = doc(db, "meetings", this.roomId, "rtc_peers", this.selfPeer.peerId);
    setDoc(peerRef, {
      ...this.selfPeer,
      updatedAtMs: Date.now()
    }).catch((err) => {
      console.warn("Firestore peer registration warning:", err);
    });
    const peersCol = collection(db, "meetings", this.roomId, "rtc_peers");
    const unsubPeers = onSnapshot(
      peersCol,
      (snap) => {
        const nextMap = /* @__PURE__ */ new Map();
        const now = Date.now();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data?.peerId && data.peerId !== this.selfPeer.peerId && (!data.updatedAtMs || now - data.updatedAtMs < 12e4)) {
            nextMap.set(data.peerId, {
              peerId: data.peerId,
              userId: data.userId || data.peerId,
              name: data.name || "AMMON Member",
              role: data.role || "Member",
              micOn: Boolean(data.micOn),
              camOn: Boolean(data.camOn),
              screenSharing: Boolean(data.screenSharing),
              handRaised: Boolean(data.handRaised)
            });
          }
        });
        this.peersMap = nextMap;
        this.emitPeers();
      },
      (err) => {
        console.warn("Firestore peers listener warning:", err);
      }
    );
    const signalsCol = collection(db, "meetings", this.roomId, "rtc_signals");
    const unsubSignals = onSnapshot(
      signalsCol,
      (snap) => {
        snap.forEach((docSnap) => {
          if (this.processedSignalIds.has(docSnap.id)) return;
          const data = docSnap.data();
          if (data?.targetPeerId !== this.selfPeer.peerId || !data.fromPeerId || !data.kind) {
            return;
          }
          this.processedSignalIds.add(docSnap.id);
          try {
            const parsed = data.payload ? JSON.parse(data.payload) : {};
            if (data.kind === "offer" || data.kind === "answer") {
              this.callbacks.onSignal(data.fromPeerId, { kind: data.kind, sdp: parsed });
            } else if (data.kind === "ice-candidate") {
              this.callbacks.onSignal(data.fromPeerId, { kind: "ice-candidate", candidate: parsed });
            }
          } catch {
          }
          deleteDoc(doc(db, "meetings", this.roomId, "rtc_signals", docSnap.id)).catch(() => {
          });
        });
      },
      (err) => {
        console.warn("Firestore signals listener warning:", err);
      }
    );
    this.heartbeatTimer = setInterval(() => {
      if (!this.closed) {
        setDoc(peerRef, { ...this.selfPeer, updatedAtMs: Date.now() }, { merge: true }).catch(
          () => {
          }
        );
      }
    }, RTC_HEARTBEAT_MS);
    this.firestoreUnsubs.push(unsubPeers, unsubSignals);
  }
  updateMediaState(partial) {
    Object.assign(this.selfPeer, partial);
    if (this.mode === "websocket" && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "media-state",
          ...partial
        })
      );
      return;
    }
    if (this.mode === "firestore") {
      const peerRef = doc(db, "meetings", this.roomId, "rtc_peers", this.selfPeer.peerId);
      setDoc(peerRef, { ...this.selfPeer, updatedAtMs: Date.now() }, { merge: true }).catch(() => {
      });
    }
  }
  sendSignal(targetPeerId, signal) {
    if (this.mode === "websocket" && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "signal",
          targetPeerId,
          signal
        })
      );
      return;
    }
    if (this.mode === "firestore") {
      const signalId = `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const payload = signal.kind === "ice-candidate" ? JSON.stringify(signal.candidate) : JSON.stringify(signal.sdp);
      setDoc(doc(db, "meetings", this.roomId, "rtc_signals", signalId), {
        fromPeerId: this.selfPeer.peerId,
        targetPeerId,
        kind: signal.kind,
        payload,
        createdAtMs: Date.now()
      }).catch(() => {
      });
    }
  }
  sendRecordingState(isRecording, startedBy) {
    if (this.mode === "websocket" && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "recording-state",
            isRecording,
            startedBy: startedBy || this.selfPeer.name
          })
        );
      } catch {
      }
    }
  }
  endMeeting(endedBy) {
    this.closed = true;
    if (this.mode === "websocket" && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "end-meeting",
            roomId: this.roomId,
            name: endedBy || this.selfPeer.name
          })
        );
      } catch {
      }
    }
    this.stop();
  }
  stop() {
    this.closed = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "leave-room" }));
        }
        this.ws.close();
      } catch {
      }
      this.ws = null;
    }
    this.firestoreUnsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
      }
    });
    this.firestoreUnsubs = [];
    if (this.mode === "firestore") {
      deleteDoc(doc(db, "meetings", this.roomId, "rtc_peers", this.selfPeer.peerId)).catch(() => {
      });
    }
    this.peersMap.clear();
  }
}
export {
  RtcSignalingSession
};
