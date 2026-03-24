const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const ENDPOINT = 'a2t7c8iasud6mb-ats.iot.us-east-2.amazonaws.com';
const PIVOT_ID = '94b034bc-a4db-4763-89de-982917b0b930'; // Pivô Central 1-A

// Paths are relative to the project root where the script is executed
const CERT_FILE = './certs/88c7d7941607ff0670affaa46ea37ec80e95068a92e20f563e546beafe2fba5e-certificate.pem.crt';
const KEY_FILE = './certs/88c7d7941607ff0670affaa46ea37ec80e95068a92e20f563e546beafe2fba5e-private.pem.key';
const CA_FILE = './certs/AmazonRootCA1.pem';

console.log('--- SoilTech Pivot Simulator ---');
console.log(`Connecting to AWS IoT Core: ${ENDPOINT}`);
console.log(`Simulating Pivot: ${PIVOT_ID}`);

const client = mqtt.connect(`mqtts://${ENDPOINT}:443`, {
  clientId: `simulated-pivot-${PIVOT_ID}`,
  cert: fs.readFileSync(CERT_FILE),
  key: fs.readFileSync(KEY_FILE),
  ca: fs.readFileSync(CA_FILE),
  protocol: 'mqtts',
  ALPNProtocols: ['x-amzn-mqtt-ca'],
});

client.on('connect', () => {
  console.log('✅ Connected to AWS IoT Core');
  
  // Simulation Loop
  let angle = 0;
  setInterval(() => {
    angle = (angle + 5) % 360;
    const payload = {
      timestamp: new Date().toISOString(),
      isOn: true,
      isIrrigating: false,
      direction: 'clockwise',
      angle: angle,
      percentimeter: 45.5,
      pressure: 3.2 + (Math.random() * 0.4), // Random variation in pressure
    };

    const topic = `soiltech/pivots/${PIVOT_ID}/telemetry`;
    client.publish(topic, JSON.stringify(payload), { qos: 1 });
    
    console.log(`[${new Date().toLocaleTimeString()}] Telemetry sent to ${topic}: angle=${angle}, pressure=${payload.pressure.toFixed(2)}`);
  }, 5000); // Send every 5 seconds
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
});

client.on('close', () => {
  console.log('ℹ️ Connection closed');
});
