import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

let io: Server;

export const initSocketServer = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { id: string, email: string };
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    
    // Join user-specific room for personal notifications
    socket.join(`user:${user.id}`);

    socket.on('subscribeToDeployment', async (deploymentId: string) => {
      try {
        const deployment = await prisma.deployment.findUnique({
          where: { id: deploymentId },
          include: { Project: true }
        });

        if (deployment && (deployment as any).Project.ownerId === user.id) {
          const roomName = `deployment:${deploymentId}`;
          socket.join(roomName);
          socket.emit('deployment:subscribed', { deploymentId, status: deployment.status, currentStep: deployment.currentStep, progressPercentage: deployment.progressPercentage });
        } else {
          socket.emit('deployment:error', { message: 'Access denied to this deployment.' });
        }
      } catch (error) {
        socket.emit('deployment:error', { message: 'Failed to subscribe.' });
      }
    });

    socket.on('unsubscribeFromDeployment', (deploymentId: string) => {
      socket.leave(`deployment:${deploymentId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
};

// Helper for the service to emit events easily
export const emitDeploymentEvent = (
  deploymentId: string,
  event: string,
  payload: any
) => {
  if (io) {
    io.to(`deployment:${deploymentId}`).emit(event, payload);
  }
};

export const emitToUser = (
  userId: string,
  event: string,
  payload: any
) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
};
