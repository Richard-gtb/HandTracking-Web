/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HandTrackProvider, useHandTrack } from './components/HandTrackContext';
import HandTracker from './components/HandTracker';
import Scene from './components/Scene';

function AppContent() {
  const { landmarks, flexion, viewMode, setViewMode } = useHandTrack();

  const fingerLabels = [
    { key: 'thumb', label: 'Polegar' },
    { key: 'index', label: 'Indicador' },
    { key: 'middle', label: 'Médio' },
    { key: 'ring', label: 'Anelar' },
    { key: 'pinky', label: 'Mínimo' }
  ];

  return (
    <div className="w-full h-screen bg-[#050608] text-[#e0e6ed] font-sans flex flex-col overflow-hidden relative">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[150px]"></div>
      </div>

      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 z-20 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center border border-cyan-500/50 rounded-lg bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-cyan-400 rounded-sm rotate-45"></div>
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold tracking-widest uppercase">Synapse</h1>
            <p className="text-[8px] md:text-[10px] text-cyan-400/70 tracking-tighter uppercase font-mono">Neural Interface v2.4</p>
          </div>
        </div>
        <div className="flex gap-4 md:gap-8 items-center">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] md:text-[10px] text-white/40 uppercase font-mono tracking-widest text-[8px]">Status</p>
            <p className="text-xs md:text-sm font-mono text-cyan-400">ATIVO</p>
          </div>
          <button className="px-4 md:px-6 py-1.5 md:py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] md:text-xs uppercase tracking-widest rounded-full transition-all cursor-pointer">
            Reset
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row gap-0 md:gap-6 p-0 md:p-6 z-10 min-h-0 relative">
        {/* Left Sidebar: Telemetry (Hidden on Mobile) */}
        <aside className="hidden md:flex w-72 flex-col gap-4 shrink-0">
          <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm overflow-y-auto">
            <h2 className="text-[11px] font-mono text-cyan-500 uppercase tracking-widest mb-6 border-b border-cyan-500/20 pb-2">Dados Cinemáticos</h2>
            <div className="space-y-5 text-white">
              {fingerLabels.map((finger) => (
                <div key={finger.key}>
                  <div className="flex justify-between text-[9px] uppercase mb-1.5 opacity-60">
                    <span>{finger.label}</span>
                    <span className="font-mono text-cyan-400">{Math.round(flexion[finger.key as keyof typeof flexion])}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 transition-all duration-200 ease-out shadow-[0_0_8px_rgba(6,182,212,0.5)]" 
                      style={{ width: `${flexion[finger.key as keyof typeof flexion]}%` }}
                    />
                  </div>
                </div>
              ))}
              
              <div className="pt-6 grid grid-cols-2 gap-3 font-mono">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5 group hover:border-cyan-500/30 transition-colors">
                  <p className="text-[8px] opacity-40 uppercase mb-1">Eixo Hand X</p>
                  <p className="text-base text-cyan-100">{landmarks ? (landmarks[0].x * 100).toFixed(1) : '---'}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5 group hover:border-cyan-500/30 transition-colors">
                  <p className="text-[8px] opacity-40 uppercase mb-1">Eixo Hand Y</p>
                  <p className="text-base text-cyan-100">{landmarks ? (landmarks[0].y * 100).toFixed(1) : '---'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop Camera Feed */}
          <div className="h-48 shrink-0">
            <HandTracker />
          </div>
        </aside>

        {/* Center Stage: 3D Viewport */}
        <section className="flex-1 bg-transparent md:bg-gradient-to-b md:from-white/5 md:to-transparent md:border md:border-white/10 md:rounded-3xl relative overflow-hidden flex flex-col">
          <Scene />
          
          {/* Mobile Camera Overlay */}
          <div className="md:hidden absolute bottom-24 right-4 w-32 h-24 z-30 pointer-events-auto">
            <HandTracker />
          </div>

          {/* Viewport HUD */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none z-20">
             <div className="px-3 py-1 bg-black/60 border border-white/10 rounded-full backdrop-blur-md">
               <p className={`font-mono text-cyan-400 ${landmarks ? 'animate-pulse' : 'opacity-40'} tracking-widest text-[9px] uppercase`}>
                 {landmarks ? 'SINAL OK' : 'LOCALIZANDO...'}
               </p>
             </div>
          </div>

          <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex bg-black/80 border border-white/10 rounded-full p-1 backdrop-blur-lg z-20 scale-90 md:scale-100">
            <button 
              onClick={() => setViewMode('wireframe')}
              className={`px-4 md:px-6 py-2 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all cursor-pointer ${
                viewMode === 'wireframe' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-white/40 hover:text-white'
              }`}
            >
              Fios
            </button>
            <button 
              onClick={() => setViewMode('solid')}
              className={`px-4 md:px-6 py-2 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all cursor-pointer ${
                viewMode === 'solid' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-white/40 hover:text-white'
              }`}
            >
              Real
            </button>
            <button 
              onClick={() => setViewMode('bones')}
              className={`px-4 md:px-6 py-2 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all cursor-pointer ${
                viewMode === 'bones' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-white/40 hover:text-white'
              }`}
            >
              Híbrido
            </button>
          </div>
        </section>

        {/* Right Sidebar: Gestures (Hidden on Mobile) */}
        <aside className="hidden md:flex w-64 flex-col gap-4 shrink-0">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
            <h2 className="text-[11px] font-mono text-cyan-500 uppercase tracking-widest mb-4">Gesto Detectado</h2>
            <div className={`p-4 ${landmarks ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/10'} border rounded-xl transition-all`}>
              <p className="text-[10px] text-indigo-300 uppercase mb-1">Tipo</p>
              <p className="text-xl font-bold tracking-tight">
                {landmarks ? (landmarks[8].y < landmarks[6].y ? 'Aberta' : 'Garoa') : '---'}
              </p>
            </div>
          </div>

          <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm overflow-hidden text-white">
            <h2 className="text-[11px] font-mono text-white/40 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Status do Core</h2>
            <div className="space-y-4">
              {[
                { label: 'Visão Computacional', active: true },
                { label: 'Renderização 3D', active: true },
                { label: 'Sync Neural', active: landmarks ? true : false }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.active ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-white/10'}`}></div>
                  <p className={`text-[10px] leading-none ${!item.active && 'opacity-40'}`}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Status (Simplified on Mobile) */}
      <footer className="px-4 md:px-8 py-2 md:py-3 bg-cyan-950/20 border-t border-white/5 flex justify-between items-center text-[8px] md:text-[9px] uppercase font-mono tracking-widest text-white/40 shrink-0">
        <div className="flex gap-4 md:gap-6 overflow-hidden whitespace-nowrap">
          <span>Cam: ATIVA</span>
          <span className="hidden sm:inline">1920x1080</span>
          <span className="hidden sm:inline">99.2% Conf.</span>
        </div>
        <div className="text-cyan-400/60 font-bold truncate ml-4">
          SYSTEM NOMINAL
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <HandTrackProvider>
      <AppContent />
    </HandTrackProvider>
  );
}
