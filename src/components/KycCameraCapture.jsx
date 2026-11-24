import { useEffect, useRef, useState } from "react";
import {
  Camera,
  RefreshCw,
  X,
  AlertCircle,
  Upload,
  Aperture
} from "lucide-react";
const KycCameraCapture = ({
  mode,
  initialFacingMode = "environment",
  title,
  subtitle,
  onCaptureCanvas,
  onFallbackFileSelect,
  onCancel
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [facingMode, setFacingMode] = useState(initialFacingMode);
  const [status, setStatus] = useState("starting");
  const [errorMessage, setErrorMessage] = useState("");
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };
  useEffect(() => {
    let active = true;
    async function startCamera() {
      stopStream();
      setStatus("starting");
      setErrorMessage("");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (active) {
          setStatus("error");
          setErrorMessage(
            "Live camera streaming is unavailable in this browser context. Use the camera/file button below to snap or pick a photo."
          );
        }
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
          });
        }
        setStatus("ready");
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setErrorMessage(
          err instanceof Error && err.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access or use the device camera/upload button below." : "No live camera detected on this device. Use the device photo capture/upload option below."
        );
      }
    }
    startCamera();
    return () => {
      active = false;
      stopStream();
    };
  }, [facingMode]);
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopStream();
    onCaptureCanvas(canvas);
  };
  const handleFallbackInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      stopStream();
      onFallbackFileSelect(file);
    }
  };
  return <div className="rounded-2xl border-2 border-[#176B37] bg-slate-950 text-white overflow-hidden shadow-lg">
      {
    /* Top Bar */
  }
      <div className="px-4 py-2.5 bg-[#14532D] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Camera className="w-4 h-4 text-emerald-300 shrink-0" />
          <div className="min-w-0">
            <h4 className="text-xs font-bold truncate">{title}</h4>
            <p className="text-[10px] text-emerald-100 truncate">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
    type="button"
    onClick={() => setFacingMode((prev) => prev === "environment" ? "user" : "environment")}
    className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
    title="Switch Camera"
  >
            <RefreshCw className="w-3 h-3" />
            <span>Flip</span>
          </button>
          <button
    type="button"
    onClick={() => {
      stopStream();
      onCancel();
    }}
    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
    title="Close Camera"
  >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {
    /* Viewfinder */
  }
      <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
        {status !== "error" ? <>
            <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
  />

            {
    /* Alignment Guide Overlay */
  }
            {status === "ready" && <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-5">
                {mode === "document" ? <div className="w-full h-full max-w-sm max-h-56 border-2 border-dashed border-emerald-400/90 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-end justify-center pb-2">
                    <span className="bg-black/70 text-emerald-200 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                      Align Government ID or Business License inside frame
                    </span>
                  </div> : <div className="w-40 h-48 border-2 border-dashed border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex items-end justify-center pb-2">
                    <span className="bg-black/70 text-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Center Face &amp; Shoulders
                    </span>
                  </div>}
              </div>}

            {status === "starting" && <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-2 text-xs text-emerald-200">
                <Camera className="w-6 h-6 animate-pulse" />
                <span>Initializing device camera...</span>
              </div>}
          </> : <div className="p-5 text-center space-y-3 max-w-sm">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-xs text-gray-200 leading-relaxed">{errorMessage}</p>
            <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className="px-4 py-2 bg-[#176B37] hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
  >
              <Upload className="w-3.5 h-3.5" />
              <span>Snap / Choose Photo from Device</span>
            </button>
          </div>}
      </div>

      {
    /* Controls */
  }
      <div className="px-4 py-3 bg-slate-900 flex items-center justify-between gap-3">
        <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    capture={facingMode}
    onChange={handleFallbackInputChange}
    className="hidden"
  />

        <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
  >
          <Upload className="w-3.5 h-3.5" />
          <span>Device Camera / File</span>
        </button>

        {status === "ready" && <button
    type="button"
    onClick={handleCapture}
    className="px-5 py-2 rounded-xl bg-[#176B37] hover:bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md cursor-pointer"
  >
            <Aperture className="w-4 h-4" />
            <span>Capture Photo</span>
          </button>}
      </div>
    </div>;
};
export {
  KycCameraCapture
};
