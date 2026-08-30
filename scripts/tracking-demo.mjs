import { io } from 'socket.io-client';

const driverId = process.argv[2];
if (!driverId) {
  console.error('Usage: npm run demo:tracking -- <driverId>');
  process.exit(1);
}

const socket = io('http://localhost:3004/tracking', { transports: ['websocket'] });
const points = [
  { latitude: -0.1600, longitude: -78.4700, speedKph: 24, headingDegrees: 180 },
  { latitude: -0.1610, longitude: -78.4708, speedKph: 27, headingDegrees: 188 },
  { latitude: -0.1620, longitude: -78.4716, speedKph: 29, headingDegrees: 192 },
];

socket.on('connect', async () => {
  console.log(`connected: ${socket.id}`);
  socket.emit('tracking.subscribe', { driverId }, (ack) => console.log('subscription', ack));
  for (const point of points) {
    await new Promise((resolve, reject) => {
      socket.timeout(3000).emit('driver.location.update', {
        driverId,
        ...point,
        recordedAt: new Date().toISOString(),
      }, (error, response) => {
        if (error) return reject(error);
        console.log('location ack', response);
        resolve();
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  socket.close();
});

socket.on('connect_error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
