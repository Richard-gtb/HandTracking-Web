# Mão Virtual 3D → Mão Robótica (ESP32)

App web (React + Vite) que usa a câmera do celular para rastrear a mão com
**MediaPipe**, mede a flexão de cada dedo e envia os ângulos para um **ESP32**,
que reproduz os movimentos em uma **mão robótica com servos**.

## Como a comunicação funciona

```
📱 Navegador (HTTPS)                 ☁️ Broker MQTT              🤖 ESP32 (Wi-Fi)
 MediaPipe → flexão por dedo         (HiveMQ, grátis)            PubSubClient subscribe
   → ângulo 0–180° (suavizado)   ──wss──►   tópico   ──tcp──►      → 5× servo
   → publica "t,i,m,r,p" ~15 Hz       handtracking/<código>/fingers
```

**Por que MQTT e não Bluetooth?** O app precisa rodar em **iPhone e Android**.
O iOS não suporta Web Bluetooth, então a rota que funciona nos dois é falar com o
ESP **pela rede**. Como a página roda em HTTPS (exigência da câmera), a conexão
também precisa ser segura (`wss://`) — e um broker MQTT sobre WebSocket resolve
isso sem servidor próprio. Precisa de internet nos dois lados (o 4G de um celular
como roteador já basta).

> A camada de transporte em [`src/lib/transport.ts`](src/lib/transport.ts) é
> plugável: dá para trocar MQTT por BLE (só Android) ou WebSocket local no futuro
> sem mexer no resto do app.

## Rodar o app localmente

**Pré-requisitos:** Node.js

1. `npm install`
2. (opcional) copie `.env.example` para `.env.local` e ajuste o broker.
3. `npm run dev` → abra `http://localhost:3000`

Para usar no celular, publique em HTTPS (GitHub Pages, Vercel, etc.) —
`http://` não libera a câmera no celular.

## Usar com a mão robótica

1. No app, abra o painel **Robô** (botão flutuante no canto inferior esquerdo).
2. Anote/defina o **código da sala** e clique em **Conectar**.
3. No firmware do ESP32, use o **mesmo código** e o **mesmo broker**.
4. Grave o firmware: veja [`firmware/README.md`](firmware/README.md).
5. Ajuste o sentido de cada dedo pelo botão **INV** (no app) e os limites
   mecânicos no firmware.

## Estrutura

- `src/components/HandTracker.tsx` — câmera + MediaPipe, calcula a flexão 0–100% por dedo.
- `src/lib/fingerAngles.ts` — converte flexão → ângulo de servo (calibração + suavização).
- `src/lib/transport.ts` — transporte MQTT/wss (plugável).
- `src/components/RobotLink.tsx` — painel de conexão + loop de envio (~15 Hz).
- `firmware/` — sketch Arduino do ESP32 + guia de ligação dos servos.
