import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private url = import.meta.env.VITE_API_URL?.replace('/api', '') || `http://${window.location.hostname}:3000`;

  connect() {
    if (this.socket) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    this.socket = io(this.url, {
      auth: { token }
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToDeployment(deploymentId: string) {
    if (!this.socket) this.connect();
    this.socket?.emit('subscribeToDeployment', deploymentId);
  }

  unsubscribeFromDeployment(deploymentId: string) {
    this.socket?.emit('unsubscribeFromDeployment', deploymentId);
  }

  onLog(callback: (log: any) => void) {
    this.socket?.on('deployment:log', callback);
    return () => this.socket?.off('deployment:log', callback);
  }

  onProgress(callback: (progress: any) => void) {
    this.socket?.on('deployment:progress', callback);
    return () => this.socket?.off('deployment:progress', callback);
  }

  onStatus(callback: (status: any) => void) {
    this.socket?.on('deployment:status', callback);
    return () => this.socket?.off('deployment:status', callback);
  }

  onCompleted(callback: (data: any) => void) {
    this.socket?.on('deployment:completed', callback);
    return () => this.socket?.off('deployment:completed', callback);
  }
  
  onError(callback: (data: any) => void) {
    this.socket?.on('deployment:error', callback);
    return () => this.socket?.off('deployment:error', callback);
  }

  onStats(callback: (data: any) => void) {
    this.socket?.on('deployment:stats', callback);
    return () => this.socket?.off('deployment:stats', callback);
  }

  onNotification(callback: (notification: any) => void) {
    this.socket?.on('notification:new', callback);
    return () => this.socket?.off('notification:new', callback);
  }

  onProjectUpdated(callback: (data: any) => void) {
    this.socket?.on('project:updated', callback);
    return () => this.socket?.off('project:updated', callback);
  }

  offAll() {
    this.socket?.removeAllListeners();
  }
}

export const socketService = new SocketService();
