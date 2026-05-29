import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float } from '@react-three/drei';
import HandModel from './HandModel';
import { useHandTrack } from './HandTrackContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Scene() {
  const { isReady } = useHandTrack();

  return (
    <div className="w-full h-full relative bg-transparent">
      {/* Grid overlay from design */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      <Canvas shadows gl={{ alpha: true }}>
        <PerspectiveCamera 
          makeDefault 
          position={[0, 0, window.innerWidth < 768 ? 12 : 8]} 
          fov={window.innerWidth < 768 ? 40 : 50} 
        />
        <OrbitControls enablePan={false} maxDistance={20} minDistance={2} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

        <Environment preset="night" />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <HandModel />
        </Float>
      </Canvas>

      <AnimatePresence>
        {!isReady && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#050608]/95 backdrop-blur-md z-40 px-6 text-center"
          >
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight uppercase">Sincronizando Rede Neural</h2>
            <p className="text-cyan-400/50 text-[10px] max-w-xs font-mono uppercase tracking-[0.2em]">Iniciando MediaPipe Vision & Interface 3D</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
