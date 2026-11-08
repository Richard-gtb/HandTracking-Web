# Firmware ESP32 — Mão Robótica

Recebe os ângulos dos dedos enviados pelo app web (via MQTT) e aciona 5 servos.

## Arquitetura

```
📱 App (navegador, HTTPS)  ──wss──►  ☁️ Broker MQTT  ──tcp (1883)──►  🤖 ESP32  ──PWM──►  5 servos
      MediaPipe → ângulos           (ex.: HiveMQ)                    PubSubClient
```

- O app publica no tópico `handtracking/<CÓDIGO_DA_SALA>/fingers`.
- O ESP32 se inscreve no mesmo tópico.
- Payload: CSV com 5 ângulos `0–180`, na ordem **polegar, indicador, médio, anelar, mínimo**.
  Exemplo: `90,10,180,45,0`.

## Pré-requisitos (Arduino IDE)

1. Instale o pacote de placas **esp32** (Espressif) em *Preferências → URLs adicionais*:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. Em *Gerenciador de Bibliotecas*, instale:
   - **PubSubClient** (Nick O'Leary)
   - **ESP32Servo** (Kevin Harrington)
3. Selecione a placa **ESP32 Dev Module**.

## Configuração

Abra [`handtracking_esp32/handtracking_esp32.ino`](handtracking_esp32/handtracking_esp32.ino) e edite o bloco `CONFIGURAÇÃO`:

| Campo | O que é |
|---|---|
| `WIFI_SSID` / `WIFI_PASSWORD` | Rede Wi-Fi **com internet** (pode ser o 4G de um celular como roteador) |
| `MQTT_HOST` / `MQTT_PORT` | Broker. Padrão: `broker.hivemq.com` / `1883` |
| `ROOM_CODE` | **Tem que ser idêntico** ao código digitado no app |
| `SERVO_PINS` | Pinos PWM dos 5 servos |
| `SERVO_MIN/MAX` | Limites de segurança por dedo |
| `FAILSAFE_MS` | Relaxa os servos se ficar sem comando |

> O broker precisa ser o mesmo nos dois lados. No app, o broker padrão é `wss://broker.hivemq.com:8884/mqtt` (WebSocket Seguro); no ESP é o mesmo broker em TCP puro `broker.hivemq.com:1883`.

## Ligação dos servos

- Alimente os servos com **fonte externa 5V** (não pelo pino 5V do ESP — servos puxam muita corrente e resetam a placa).
- **Una os GNDs** (fonte dos servos + ESP32) — terra comum é obrigatório.
- Sinal de cada servo nos pinos de `SERVO_PINS`.

```
         +5V ext ──────────┬──────┬──────┬──────┬──────┐
                           Vcc    Vcc    Vcc    Vcc    Vcc
  ESP32 GPIO13 ── sinal ── S1
  ESP32 GPIO12 ── sinal ───────── S2
  ESP32 GPIO14 ── sinal ──────────────── S3
  ESP32 GPIO27 ── sinal ───────────────────────  S4
  ESP32 GPIO26 ── sinal ──────────────────────────────── S5
         GND ───────────────┴──────┴──────┴──────┴──────┴──── ESP32 GND (terra comum)
```

## Calibração

- O **sentido** de cada dedo se ajusta no app (botão `INV` por dedo) — assim você não precisa reprogramar o ESP.
- Os **limites mecânicos** (para não forçar a mão) ajuste em `SERVO_MIN/MAX` no firmware.
- Se o servo não chega aos extremos, ajuste a largura de pulso em `servos[i].attach(pin, 500, 2400)`.

## Teste rápido sem a mão montada

Abra o **Monitor Serial** (115200 baud). Ao conectar, ele imprime o IP e o tópico inscrito.
Mexa a mão na frente da câmera: os ângulos chegam e os servos se movem. Sem comando por
`FAILSAFE_MS`, os servos voltam para a posição relaxada.
