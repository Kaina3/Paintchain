import type { FastifyInstance } from 'fastify';
import { createRoom, getRoom } from '../../application/roomUseCases.js';
import { getChains, getChain } from '../../application/gameUseCases.js';

export async function roomRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Create room
  fastify.post('/rooms', async () => {
    const room = createRoom();
    return { roomId: room.id };
  });

  // Get room info
  fastify.get<{ Params: { id: string } }>('/rooms/:id', async (request, reply) => {
    const room = getRoom(request.params.id);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }
    return room;
  });

  // Get all chains for a room (for replay)
  fastify.get<{ Params: { id: string } }>('/rooms/:id/chains', async (request, reply) => {
    const room = getRoom(request.params.id);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }
    const chains = getChains(request.params.id);
    if (!chains) {
      return reply.status(404).send({ error: 'No chains found' });
    }
    return { chains, players: room.players };
  });

  // Get single chain
  fastify.get<{ Params: { roomId: string; chainId: string } }>(
    '/rooms/:roomId/chains/:chainId',
    async (request, reply) => {
      const chain = getChain(request.params.roomId, request.params.chainId);
      if (!chain) {
        return reply.status(404).send({ error: 'Chain not found' });
      }
      return chain;
    }
  );
}
