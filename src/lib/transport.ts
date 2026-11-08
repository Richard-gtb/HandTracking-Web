/**
 * Camada de transporte plugável.
 *
 * Hoje: MQTT sobre WebSocket Seguro (wss) -> funciona em iPhone e Android,
 * atravessa redes diferentes (celular no 4G, ESP no Wi-Fi) e não tem o
 * problema de "mixed content" de uma página HTTPS.
 *
 * Amanhã: dá pra implementar a mesma interface Transport com BLE ou
 * WebSocket local sem mexer no resto do app.
 */

import mqtt, { MqttClient } from 'mqtt';

export type TransportStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';

export interface Transport {
  connect(): Promise<void>;
  disconnect(): void;
  /** Envia o payload já serializado (ex.: "90,10,180,45,0"). */
  send(payload: string): void;
  onStatus(cb: (status: TransportStatus, detail?: string) => void): void;
  readonly status: TransportStatus;
}

export interface MqttConfig {
  /** URL wss do broker. Ex.: wss://broker.hivemq.com:8884/mqtt */
  brokerUrl: string;
  /** Código da sala: precisa ser IGUAL no ESP32. Mantém setups separados no broker público. */
  roomCode: string;
  /** Base do tópico. Resultado: `${topicBase}/${roomCode}/fingers`. */
  topicBase?: string;
}

export class MqttTransport implements Transport {
  private client: MqttClient | null = null;
  private _status: TransportStatus = 'idle';
  private statusCb: (s: TransportStatus, d?: string) => void = () => {};
  private readonly topic: string;

  constructor(private cfg: MqttConfig) {
    const base = cfg.topicBase ?? 'handtracking';
    this.topic = `${base}/${cfg.roomCode}/fingers`;
  }

  get status() {
    return this._status;
  }

  get topicName() {
    return this.topic;
  }

  onStatus(cb: (status: TransportStatus, detail?: string) => void) {
    this.statusCb = cb;
    cb(this._status);
  }

  private setStatus(s: TransportStatus, d?: string) {
    this._status = s;
    this.statusCb(s, d);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setStatus('connecting');
      try {
        const clientId = `handweb-${Math.random().toString(16).slice(2, 10)}`;
        this.client = mqtt.connect(this.cfg.brokerUrl, {
          clientId,
          reconnectPeriod: 2000,
          connectTimeout: 8000,
          clean: true,
        });

        let settled = false;

        this.client.on('connect', () => {
          this.setStatus('connected');
          if (!settled) {
            settled = true;
            resolve();
          }
        });
        this.client.on('reconnect', () => this.setStatus('reconnecting'));
        this.client.on('close', () => this.setStatus('closed'));
        this.client.on('error', (err) => {
          this.setStatus('error', err?.message);
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
      } catch (err: any) {
        this.setStatus('error', err?.message);
        reject(err);
      }
    });
  }

  disconnect() {
    this.client?.end(true);
    this.client = null;
    this.setStatus('idle');
  }

  send(payload: string) {
    if (this.client && this._status === 'connected') {
      // QoS 0, sem retain: é um fluxo contínuo; comandos antigos não devem persistir.
      this.client.publish(this.topic, payload, { qos: 0, retain: false });
    }
  }
}

/** Broker público padrão (sem autenticação). Para privacidade, use um roomCode difícil de adivinhar. */
export const DEFAULT_BROKER_URL =
  (import.meta as any).env?.VITE_MQTT_WSS_URL || 'wss://broker.hivemq.com:8884/mqtt';

export const DEFAULT_TOPIC_BASE =
  (import.meta as any).env?.VITE_MQTT_TOPIC_BASE || 'handtracking';
