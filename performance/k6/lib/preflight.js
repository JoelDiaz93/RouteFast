import http from 'k6/http';

export function requireGatewayReady(baseUrl) {
  const response = http.get(`${baseUrl}/health/ready`, {
    timeout: '3s',
    tags: { name: 'preflight_gateway_ready', preflight: 'true' },
  });

  if (response.status !== 200) {
    throw new Error(
      `RouteFast gateway is not ready at ${baseUrl}. ` +
      'Start infrastructure and run `npm run start:all` before executing k6.',
    );
  }
}
