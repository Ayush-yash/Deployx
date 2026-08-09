import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../db';

let dummyUserId: string | null = null;

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!dummyUserId) {
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@deployx.local',
            password: 'mock_password',
            name: 'Admin User',
            role: 'ADMIN'
          }
        });
      }
      dummyUserId = user.id;
    }

    // Bypass authentication: Always attach a dummy user backed by a real DB row
    (req as any).user = {
      id: dummyUserId,
      name: 'Admin User',
      email: 'admin@deployx.local',
      role: 'ADMIN',
      createdAt: new Date()
    };
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Auth bypass failed' });
  }
};
