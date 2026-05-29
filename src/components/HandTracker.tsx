import { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useHandTrack } from './HandTrackContext';

export default function HandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setLandmarks, setFlexion, setIsReady } = useHandTrack();
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    
    function getDistance(p1: {x:number, y:number, z:number}, p2: {x:number, y:number, z:number}) {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
    }

    function calculateFlexion(landmarks: any) {
      // Heuristic: Distance between tip and base relative to a scale factor (palm size)
      const palmScale = getDistance(landmarks[0], landmarks[5]);
      
      const compute = (tipIdx: number, baseIdx: number, maxMult = 1.3) => {
        const dist = getDistance(landmarks[tipIdx], landmarks[baseIdx]);
        // Normalize: 0 is closed, 100 is open
        const flex = (dist / (palmScale * maxMult)) * 100;
        return Math.min(100, Math.max(0, flex));
      };

      return {
        thumb: compute(4, 2, 0.8), // Thumb has different range
        index: compute(8, 5),
        middle: compute(12, 9),
        ring: compute(16, 13),
        pinky: compute(20, 17)
      };
    }

    async function setup() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        landmarkerRef.current = handLandmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsReady(true);
            requestAnimationFrame(predict);
          };
        }
      } catch (error) {
        console.error("Error setting up MediaPipe:", error);
      }
    }

    function predict() {
      if (videoRef.current && landmarkerRef.current) {
        const startTimeMs = performance.now();
        const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
        
        if (results.landmarks && results.landmarks.length > 0) {
          const lms = results.landmarks[0];
          setLandmarks(lms);
          setFlexion(calculateFlexion(lms));
        } else {
          setLandmarks(null);
        }
      }
      animationFrameId = requestAnimationFrame(predict);
    }

    setup();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [setLandmarks, setIsReady]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-cyan-500/30 shadow-xl group">
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1]"
        playsInline
        muted
      />
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-white">RAW FEED</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
    </div>
  );
}
