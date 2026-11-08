import { useEffect, useMemo, useRef, useState } from 'react';
import { Radio, X, Wifi, WifiOff, RefreshCw, Hand } from 'lucide-react';
import { useHandTrack } from './HandTrackContext';
import {
  MqttTransport,
  DEFAULT_BROKER_URL,
  DEFAULT_TOPIC_BASE,
  type TransportStatus,
} from '../lib/transport';
import {
  DEFAULT_CALIBRATION,
  FINGER_ORDER,
  type Calibration,
  type FingerKey,
  flexionsToAngles,
  anglesToPayload,
  smooth,
} from '../lib/fingerAngles';

const FINGER_LABELS: Record<FingerKey, string> = {
  thumb: 'Polegar',
  index: 'Indicador',
  middle: 'Médio',
  ring: 'Anelar',
  pinky: 'Mínimo',
};

const SEND_INTERVAL_MS = 66; // ~15 Hz
const SMOOTH_ALPHA = 0.35; // suavização do servo
const HEARTBEAT_MS = 500; // reenvia mesmo sem mudança

function randomRoom() {
  return 'mao-' + Math.random().toString(36).slice(2, 7);
}

function loadRoom() {
  try {
    const v = localStorage.getItem('hw_room');
    if (v) return v;
  } catch {}
  const r = randomRoom();
  try {
    localStorage.setItem('hw_room', r);
  } catch {}
  return r;
}

function loadCalibration(): Calibration {
  try {
    const raw = localStorage.getItem('hw_cal');
    if (raw) return { ...DEFAULT_CALIBRATION, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CALIBRATION;
}

const STATUS_META: Record<TransportStatus, { label: string; color: string; dot: string }> = {
  idle: { label: 'Desconectado', color: 'text-white/50', dot: 'bg-white/30' },
  connecting: { label: 'Conectando…', color: 'text-amber-300', dot: 'bg-amber-400 animate-pulse' },
  connected: { label: 'Conectado', color: 'text-emerald-300', dot: 'bg-emerald-400 shadow-[0_0_8px_#10b981]' },
  reconnecting: { label: 'Reconectando…', color: 'text-amber-300', dot: 'bg-amber-400 animate-pulse' },
  error: { label: 'Erro', color: 'text-red-400', dot: 'bg-red-500' },
  closed: { label: 'Conexão fechada', color: 'text-red-300', dot: 'bg-red-500' },
};

export default function RobotLink() {
  const { flexion } = useHandTrack();

  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState(loadRoom);
  const [broker, setBroker] = useState(DEFAULT_BROKER_URL);
  const [calibration, setCalibration] = useState<Calibration>(loadCalibration);
  const [status, setStatus] = useState<TransportStatus>('idle');
  const [detail, setDetail] = useState<string | undefined>();
  const [liveAngles, setLiveAngles] = useState<Record<FingerKey, number>>({
    thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0,
  });

  // Refs lidas pelo loop de envio (sempre com o valor mais recente, sem recriar o intervalo).
  const flexionRef = useRef(flexion);
  const calibrationRef = useRef(calibration);
  const transportRef = useRef<MqttTransport | null>(null);
  const smoothedRef = useRef<Record<FingerKey, number>>({ ...liveAngles });
  const lastSentRef = useRef<string>('');
  const lastSendTimeRef = useRef<number>(0);

  useEffect(() => { flexionRef.current = flexion; }, [flexion]);
  useEffect(() => { calibrationRef.current = calibration; }, [calibration]);

  // Persiste configurações.
  useEffect(() => { try { localStorage.setItem('hw_room', room); } catch {} }, [room]);
  useEffect(() => { try { localStorage.setItem('hw_cal', JSON.stringify(calibration)); } catch {} }, [calibration]);

  const topic = useMemo(() => `${DEFAULT_TOPIC_BASE}/${room}/fingers`, [room]);

  function connect() {
    transportRef.current?.disconnect();
    const t = new MqttTransport({ brokerUrl: broker, roomCode: room, topicBase: DEFAULT_TOPIC_BASE });
    t.onStatus((s, d) => { setStatus(s); setDetail(d); });
    transportRef.current = t;
    t.connect().catch(() => {});
  }

  function disconnect() {
    transportRef.current?.disconnect();
    transportRef.current = null;
    setStatus('idle');
  }

  // Loop de envio (~15 Hz) com suavização e throttle por mudança + heartbeat.
  useEffect(() => {
    const id = setInterval(() => {
      const target = flexionsToAngles(flexionRef.current, calibrationRef.current);
      const sm = smoothedRef.current;
      (FINGER_ORDER as FingerKey[]).forEach((k) => {
        sm[k] = Math.round(smooth(sm[k], target[k], SMOOTH_ALPHA));
      });
      setLiveAngles({ ...sm });

      const payload = anglesToPayload(sm);
      const now = performance.now();
      const changed = payload !== lastSentRef.current;
      const heartbeat = now - lastSendTimeRef.current >= HEARTBEAT_MS;
      if (transportRef.current && (changed || heartbeat)) {
        transportRef.current.send(payload);
        lastSentRef.current = payload;
        lastSendTimeRef.current = now;
      }
    }, SEND_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => transportRef.current?.disconnect(), []);

  const meta = STATUS_META[status];
  const isConnected = status === 'connected';

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/80 border border-cyan-500/40 backdrop-blur-lg shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:border-cyan-400 transition-all cursor-pointer"
        aria-label="Conexão com a mão robótica"
      >
        <Radio size={16} className={isConnected ? 'text-emerald-400' : 'text-cyan-400'} />
        <span className="text-[10px] uppercase font-mono tracking-widest text-white/80 hidden sm:inline">
          Robô
        </span>
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
      </button>

      {/* Painel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-20 sm:left-4 z-50 sm:w-96">
          <div className="bg-[#0a0d12]/95 border border-white/10 sm:rounded-2xl rounded-t-2xl p-5 backdrop-blur-xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Hand size={16} className="text-cyan-400" />
                <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400">Mão Robótica</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
              <span className={`text-xs font-mono ${meta.color}`}>{meta.label}</span>
              {detail && <span className="text-[9px] text-red-400/70 ml-auto truncate max-w-[40%]">{detail}</span>}
            </div>

            {/* Código da sala */}
            <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-1 font-mono">
              Código da sala (igual no ESP32)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value.trim())}
                disabled={isConnected}
                className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-cyan-100 focus:border-cyan-500/60 outline-none disabled:opacity-50"
              />
              <button
                onClick={() => setRoom(randomRoom())}
                disabled={isConnected}
                className="px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                title="Gerar novo código"
              >
                <RefreshCw size={14} className="text-white/60" />
              </button>
            </div>

            {/* Broker (avançado) */}
            <label className="block text-[9px] uppercase tracking-widest text-white/40 mb-1 font-mono">Broker (wss)</label>
            <input
              value={broker}
              onChange={(e) => setBroker(e.target.value.trim())}
              disabled={isConnected}
              className="w-full mb-2 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white/70 focus:border-cyan-500/60 outline-none disabled:opacity-50"
            />
            <p className="text-[9px] text-white/30 font-mono mb-4 break-all">tópico: {topic}</p>

            {/* Conectar */}
            {isConnected ? (
              <button
                onClick={disconnect}
                className="w-full mb-5 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-xs uppercase tracking-widest font-bold hover:bg-red-500/25 transition cursor-pointer"
              >
                <WifiOff size={14} /> Desconectar
              </button>
            ) : (
              <button
                onClick={connect}
                className="w-full mb-5 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-black text-xs uppercase tracking-widest font-bold hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                <Wifi size={14} /> Conectar
              </button>
            )}

            {/* Ângulos ao vivo + inverter */}
            <h3 className="text-[9px] uppercase tracking-widest text-white/40 mb-2 font-mono border-b border-white/5 pb-1">
              Ângulos enviados (0–180°)
            </h3>
            <div className="space-y-2.5">
              {FINGER_ORDER.map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="text-[10px] text-white/60 w-16 shrink-0">{FINGER_LABELS[k]}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-100"
                      style={{ width: `${(liveAngles[k] / 180) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 w-9 text-right">{liveAngles[k]}°</span>
                  <button
                    onClick={() =>
                      setCalibration((c) => ({ ...c, [k]: { ...c[k], invert: !c[k].invert } }))
                    }
                    className={`text-[8px] px-1.5 py-0.5 rounded border cursor-pointer ${
                      calibration[k].invert
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                    title="Inverter sentido do servo"
                  >
                    INV
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-white/30 mt-4 leading-relaxed">
              Dica: se um dedo abrir quando deveria fechar, toque em <span className="text-cyan-400">INV</span>.
              Envio a ~15 Hz com suavização para não tremer o servo.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
