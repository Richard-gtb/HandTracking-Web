/*
 * Mão Robótica - Receptor ESP32 (MQTT)
 * -------------------------------------
 * Recebe 5 ângulos (0-180) do app web via broker MQTT e aciona 5 servos.
 *
 * Fluxo:
 *   App (navegador, HTTPS)  --wss-->  Broker MQTT  --tcp-->  ESP32  -->  5 servos
 *
 * Payload recebido no tópico: CSV "polegar,indicador,medio,anelar,minimo"
 *   ex.: "90,10,180,45,0"
 *
 * Bibliotecas (Arduino IDE -> Gerenciador de Bibliotecas):
 *   - PubSubClient (by Nick O'Leary)
 *   - ESP32Servo   (by Kevin Harrington / John K. Bennett)
 *   + Placa: "ESP32 Dev Module" (pacote esp32 da Espressif)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ====================== CONFIGURAÇÃO ======================
// 1) Wi-Fi (precisa ter internet para alcançar o broker)
const char* WIFI_SSID     = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";

// 2) Broker MQTT (o mesmo do app). Porta TCP padrão = 1883 (sem TLS).
const char* MQTT_HOST = "broker.hivemq.com";
const int   MQTT_PORT = 1883;

// 3) Código da sala: TEM que ser IGUAL ao digitado no app.
const char* ROOM_CODE  = "mao-xxxxx";
const char* TOPIC_BASE = "handtracking";

// 4) Pinos dos servos (polegar, indicador, médio, anelar, mínimo).
//    Use pinos com PWM. Evite os pinos de boot (0, 2, 15) se tiver problemas.
const int SERVO_PINS[5] = {13, 12, 14, 27, 26};

// 5) Limites de segurança por dedo (evita forçar a mecânica). [min, max] em graus.
const int SERVO_MIN[5] = {0, 0, 0, 0, 0};
const int SERVO_MAX[5] = {180, 180, 180, 180, 180};

// 6) Failsafe: sem mensagem por esse tempo, relaxa os servos (opcional).
const unsigned long FAILSAFE_MS = 3000;
const int FAILSAFE_ANGLE[5] = {0, 0, 0, 0, 0}; // posição "mão relaxada"
// =========================================================

Servo servos[5];
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

char topic[96];
unsigned long lastMsgMs = 0;
int lastAngle[5] = {-1, -1, -1, -1, -1};

int clampi(int v, int lo, int hi) { return v < lo ? lo : (v > hi ? hi : v); }

void applyAngles(int a[5]) {
  for (int i = 0; i < 5; i++) {
    int ang = clampi(a[i], SERVO_MIN[i], SERVO_MAX[i]);
    if (ang != lastAngle[i]) {
      servos[i].write(ang);
      lastAngle[i] = ang;
    }
  }
}

// Interpreta o CSV "t,i,m,r,p"
void onMessage(char* /*topic*/, byte* payload, unsigned int len) {
  char buf[64];
  if (len >= sizeof(buf)) len = sizeof(buf) - 1;
  memcpy(buf, payload, len);
  buf[len] = '\0';

  int a[5] = {0, 0, 0, 0, 0};
  int i = 0;
  char* tok = strtok(buf, ",");
  while (tok != nullptr && i < 5) {
    a[i++] = atoi(tok);
    tok = strtok(nullptr, ",");
  }
  if (i == 5) {
    applyAngles(a);
    lastMsgMs = millis();
  }
}

void connectWifi() {
  Serial.printf("Conectando ao Wi-Fi \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.printf("\nWi-Fi OK. IP: %s\n", WiFi.localIP().toString().c_str());
}

void connectMqtt() {
  while (!mqtt.connected()) {
    String clientId = "esp32-hand-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    Serial.printf("Conectando ao MQTT %s:%d ...", MQTT_HOST, MQTT_PORT);
    if (mqtt.connect(clientId.c_str())) {
      Serial.println(" OK");
      mqtt.subscribe(topic);
      Serial.printf("Inscrito no tópico: %s\n", topic);
    } else {
      Serial.printf(" falhou (rc=%d). Tentando de novo em 2s\n", mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  // Servos: período padrão de 50 Hz.
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  for (int i = 0; i < 5; i++) {
    servos[i].setPeriodHertz(50);
    servos[i].attach(SERVO_PINS[i], 500, 2400); // ajuste a largura de pulso ao seu servo
    servos[i].write(FAILSAFE_ANGLE[i]);
  }

  snprintf(topic, sizeof(topic), "%s/%s/fingers", TOPIC_BASE, ROOM_CODE);

  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  // Failsafe: sem comandos recentes -> relaxa.
  if (lastMsgMs != 0 && millis() - lastMsgMs > FAILSAFE_MS) {
    int relax[5];
    for (int i = 0; i < 5; i++) relax[i] = FAILSAFE_ANGLE[i];
    applyAngles(relax);
    lastMsgMs = 0;
  }
}
