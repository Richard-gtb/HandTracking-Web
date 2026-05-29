import { createContext, useContext, useState, ReactNode } from 'react';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type HandViewMode = 'wireframe' | 'solid' | 'bones';

export interface FingerFlexion {
  thumb: number;
  index: number;
  middle: number;
  ring: number;
  pinky: number;
}

interface HandTrackContextType {
  landmarks: Landmark[] | null;
  setLandmarks: (landmarks: Landmark[] | null) => void;
  flexion: FingerFlexion;
  setFlexion: (flexion: FingerFlexion) => void;
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
  viewMode: HandViewMode;
  setViewMode: (mode: HandViewMode) => void;
}

const HandTrackContext = createContext<HandTrackContextType | undefined>(undefined);

export function HandTrackProvider({ children }: { children: ReactNode }) {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [flexion, setFlexion] = useState<FingerFlexion>({ thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 });
  const [isReady, setIsReady] = useState(false);
  const [viewMode, setViewMode] = useState<HandViewMode>('wireframe');

  return (
    <HandTrackContext.Provider value={{ 
      landmarks, 
      setLandmarks, 
      flexion, 
      setFlexion, 
      isReady, 
      setIsReady, 
      viewMode, 
      setViewMode 
    }}>
      {children}
    </HandTrackContext.Provider>
  );
}

export function useHandTrack() {
  const context = useContext(HandTrackContext);
  if (context === undefined) {
    throw new Error('useHandTrack must be used within a HandTrackProvider');
  }
  return context;
}
