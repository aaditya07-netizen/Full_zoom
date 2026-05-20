import express from "express";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { middleware } from "./middleware";
import { JWT_SECREAT } from "@repo/backend-common/config";
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/z_validation";
import cors from "cors";
import { prisma } from "@repo/prisma/db";

const app = express();
app.use(cors());
app.use(express.json());

// ─── Auth (for the standalone whiteboard web app) ────────────────────────────

app.post("/signup", async (req: any, res: any) => {
    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        return res.status(400).json({ message: "Incorrect Inputs" });
    }
    try {
        const hashedPassword = await argon2.hash(parsedData.data.password);
        const user = await prisma.user.create({
            data: {
                email: parsedData.data.username,
                password: hashedPassword,
                name: parsedData.data.name ?? parsedData.data.username,
            }
        });
        return res.json({ userId: user.id });
    } catch (e) {
        return res.status(411).json({ message: "Error signing up — user may already exist" });
    }
});

app.post("/signin", async (req: any, res: any) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        return res.status(400).json({ message: "Invalid Inputs" });
    }
    try {
        const user = await prisma.user.findFirst({
            where: { email: parsedData.data.username }
        });
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        const isValid = await argon2.verify(user.password, parsedData.data.password);
        if (isValid && user.id) {
            const token = jwt.sign({ userId: user.id }, JWT_SECREAT);
            return res.json({ token });
        } else {
            return res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (e) {
        return res.status(500).json({ message: "Error during sign in" });
    }
});

// ─── Rooms (standalone whiteboard — requires auth) ───────────────────────────

app.post("/room", middleware, async (req: any, res: any) => {
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        return res.status(400).json({ message: "Incorrect Inputs" });
    }
    const userId = req.userId;
    if (!userId) {
        return res.status(403).json({ message: "Unauthorized" });
    }
    try {
        const room = await prisma.room.create({
            data: { slug: parsedData.data.name, adminId: userId }
        });
        return res.json({ roomId: room.id });
    } catch (e) {
        return res.status(411).json({ message: "Room already exists or error creating room" });
    }
});

// ─── Ensure room (for zoom-clone — NO auth required) ─────────────────────────
// The Stream call ID is used as the room slug.
// No user creation needed — adminId is now optional in the schema.
// MUST be defined BEFORE /room/:slug so Express doesn't treat "ensure" as a slug.

app.post("/room/ensure", async (req: any, res: any) => {
    const { slug } = req.body;
    if (!slug) {
        return res.status(400).json({ message: "slug is required" });
    }
    try {
        // Try to find existing room first
        let room = await prisma.room.findUnique({ where: { slug } });
        if (!room) {
            try {
                room = await prisma.room.create({ data: { slug } });
            } catch (createErr: any) {
                // P2002 = unique constraint — another request created it first, just fetch it
                if (createErr?.code === 'P2002') {
                    room = await prisma.room.findUnique({ where: { slug } });
                } else {
                    throw createErr;
                }
            }
        }
        if (!room) {
            return res.status(500).json({ message: "Could not find or create room" });
        }
        return res.json({ roomId: room.id, slug: room.slug });
    } catch (e) {
        console.error("[/room/ensure]", e);
        return res.status(500).json({ message: "Error ensuring room" });
    }
});

app.get("/room/:slug", async (req: any, res: any) => {
    const slug = req.params.slug;
    const room = await prisma.room.findFirst({ where: { slug } });
    return res.json({ room });
});

// ─── Chats ───────────────────────────────────────────────────────────────────

app.get("/chats/:roomId", async (req: any, res: any) => {
    try {
        const roomId = Number(req.params.roomId);
        const messages = await prisma.chat.findMany({
            where: { roomId },
            orderBy: { id: "desc" },
            take: 50
        });
        return res.json({ messages });
    } catch (e) {
        return res.status(500).json({ messages: [] });
    }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.HTTP_BACKEND_PORT) || 3010;
app.listen(PORT, () => {
    console.log(`[http-backend] Running on port ${PORT}`);
});
