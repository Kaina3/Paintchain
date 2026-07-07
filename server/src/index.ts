import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { roomRoutes } from './infra/http/roomRoutes.js';
import { wsHandler } from './infra/ws/wsHandler.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function main() {
  const fastify = Fastify({
    logger: true,
  });

  // Register plugins
  await fastify.register(cors, {
    // 本番では CORS_ORIGIN 環境変数で許可オリジンを制限できる（カンマ区切り）
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  });
  await fastify.register(websocket, {
    options: {
      // 巨大ペイロードによるDoSを防ぐ（描画データは数MB以内）
      maxPayload: 10 * 1024 * 1024, // 10MB
    },
  });

  // Register routes
  await fastify.register(roomRoutes, { prefix: '/api' });
  await fastify.register(wsHandler);

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
