import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { prisma } from './db.js';
import { requireAuth, signToken, parseToken } from './auth.js';
import type { AuthedRequest, CursorPayload } from './types.js';

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT || 4000);
const uploadDir = process.env.UPLOAD_DIR || 'uploads';

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

const uploader = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${nanoid()}${ext}`);
    }
  })
});

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).optional()
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/auth/register', async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.name) return res.status(400).json({ message: 'Invalid payload' });
  const { email, password, name } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'Email already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/auth/login', async (req, res) => {
  const parsed = authSchema.omit({ name: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/auth/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

app.get('/boards', requireAuth, async (req: AuthedRequest, res) => {
  const boards = await prisma.board.findMany({ where: { ownerId: req.user!.userId }, orderBy: { updatedAt: 'desc' } });
  res.json(boards);
});

app.post('/boards', requireAuth, async (req: AuthedRequest, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name : 'Untitled board';
  const board = await prisma.board.create({ data: { name, ownerId: req.user!.userId, state: { objects: [] } } });
  res.status(201).json(board);
});

app.get('/boards/:id', requireAuth, async (req: AuthedRequest, res) => {
  const board = await prisma.board.findFirst({ where: { id: req.params.id, ownerId: req.user!.userId } });
  if (!board) return res.status(404).json({ message: 'Board not found' });
  res.json(board);
});

app.get('/boards/share/:shareId', async (req, res) => {
  const board = await prisma.board.findUnique({ where: { shareId: req.params.shareId } });
  if (!board) return res.status(404).json({ message: 'Board not found' });
  res.json(board);
});

app.patch('/boards/:id', requireAuth, async (req: AuthedRequest, res) => {
  const board = await prisma.board.findFirst({ where: { id: req.params.id, ownerId: req.user!.userId } });
  if (!board) return res.status(404).json({ message: 'Board not found' });

  const updated = await prisma.board.update({
    where: { id: req.params.id },
    data: {
      name: typeof req.body.name === 'string' ? req.body.name : board.name,
      state: req.body.state ?? board.state
    }
  });
  res.json(updated);
});

app.delete('/boards/:id', requireAuth, async (req: AuthedRequest, res) => {
  await prisma.board.deleteMany({ where: { id: req.params.id, ownerId: req.user!.userId } });
  res.status(204).send();
});

app.get('/boards/:id/files', requireAuth, async (req: AuthedRequest, res) => {
  const files = await prisma.fileAsset.findMany({ where: { boardId: req.params.id } });
  res.json(files);
});

app.post('/boards/:id/files', requireAuth, uploader.single('file'), async (req: AuthedRequest, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const asset = await prisma.fileAsset.create({
    data: {
      boardId: req.params.id,
      original: file.originalname,
      storageKey: file.filename,
      mimeType: file.mimetype,
      size: file.size
    }
  });
  res.status(201).json(asset);
});

app.delete('/boards/:boardId/files/:fileId', requireAuth, async (req: AuthedRequest, res) => {
  const file = await prisma.fileAsset.findUnique({ where: { id: req.params.fileId } });
  if (!file) return res.status(404).json({ message: 'File not found' });
  const fullPath = path.join(uploadDir, file.storageKey);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  await prisma.fileAsset.delete({ where: { id: req.params.fileId } });
  res.status(204).send();
});

const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }
});

const boardPresence = new Map<string, Map<string, { name: string; color: string }>>();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token || typeof token !== 'string') return next(new Error('Unauthorized'));
  const payload = parseToken(token);
  if (!payload) return next(new Error('Unauthorized'));
  socket.data.user = payload;
  next();
});

io.on('connection', (socket) => {
  socket.on('board:join', ({ boardId, color }: { boardId: string; color: string }) => {
    const user = socket.data.user;
    socket.join(boardId);

    if (!boardPresence.has(boardId)) boardPresence.set(boardId, new Map());
    boardPresence.get(boardId)!.set(socket.id, { name: user.name, color });
    io.to(boardId).emit('presence:update', Array.from(boardPresence.get(boardId)!.entries()).map(([id, data]) => ({ id, ...data })));
  });

  socket.on('board:cursor', (cursor: CursorPayload) => {
    socket.to(cursor.boardId).emit('board:cursor', { socketId: socket.id, ...cursor });
  });

  socket.on('board:update', ({ boardId, state }) => {
    socket.to(boardId).emit('board:update', state);
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach((room) => {
      const presence = boardPresence.get(room);
      if (!presence) return;
      presence.delete(socket.id);
      io.to(room).emit('presence:update', Array.from(presence.entries()).map(([id, data]) => ({ id, ...data })));
      if (presence.size === 0) boardPresence.delete(room);
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
