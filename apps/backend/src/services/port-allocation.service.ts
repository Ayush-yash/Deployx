import * as net from 'net';

export class PortAllocationService {
  /**
   * Finds the next available port starting from startPort.
   * Logs the checking process using the provided logger function.
   */
  static async findAvailablePort(startPort: number, logger?: (level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS', msg: string) => void): Promise<number> {
    let currentPort = startPort;
    
    while (true) {
      if (logger) logger('INFO', `Checking port ${currentPort}...`);
      const isAvailable = await this.isPortAvailable(currentPort);
      
      if (isAvailable) {
        if (logger) logger('SUCCESS', `Port ${currentPort} is available.`);
        return currentPort;
      } else {
        if (logger) logger('WARNING', `Port ${currentPort} is already in use. Trying ${currentPort + 1}...`);
        currentPort++;
      }
    }
  }

  private static isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          // If there's another error, assume it's not available to be safe
          resolve(false);
        }
      });
    });
  }
}
