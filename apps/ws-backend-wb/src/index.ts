import { WebSocket, WebSocketServer } from 'ws';
import { prisma } from "@repo/prisma/db";

const PORT = Number(process.env.WS_BACKEND_PORT) || 3011;
const wss = new WebSocketServer({ port: PORT });

type ConnectedUser = {
    ws: WebSocket;
    rooms: string[];
    userId: string;
};

const users: ConnectedUser[] = [];

/**
 * Resolve a roomId string (slug OR numeric string) to the numeric DB room ID.
 * Returns null if not found.
 */
async function resolveRoomId(roomId: string): Promise<number | null> {
    const asNumber = Number(roomId);
    if (!isNaN(asNumber) && String(asNumber) === roomId) {
        return asNumber;
    }
    const room = await prisma.room.findFirst({ where: { slug: roomId } });
    return room ? room.id : null;
}

wss.on('connection', function connection(ws, req) {
    const url = req.url ?? '';
    const queryParams = new URLSearchParams(url.split('?')[1] ?? '');

    // Accept any userId — no JWT needed.
    // zoom-clone passes Clerk user ID directly via ?userId=
    const userId = queryParams.get('userId') ?? queryParams.get('token') ?? `anon-${Date.now()}`;

    users.push({ userId, rooms: [], ws });

    ws.on('message', async function message(data) {
        let parsedData: any;
        try {
            parsedData = JSON.parse(typeof data === 'string' ? data : data.toString());
        } catch {
            return;
        }

        if (parsedData.type === 'join_room') {
            const user = users.find(x => x.ws === ws);
            if (user && !user.rooms.includes(parsedData.roomId)) {
                user.rooms.push(parsedData.roomId);
            }
            return;
        }

        if (parsedData.type === 'leave_room') {
            const user = users.find(x => x.ws === ws);
            if (user) {
                user.rooms = user.rooms.filter(r => r !== parsedData.roomId);
            }
            return;
        }

        if (parsedData.type === 'chat') {
            const roomId: string = parsedData.roomId;
            const message: string = parsedData.message;

            // Persist to DB (best-effort)
            const numericRoomId = await resolveRoomId(roomId);
            if (numericRoomId !== null) {
                try {
                    await prisma.chat.create({
                        data: { roomId: numericRoomId, message, userId }
                    });
                } catch (e) {
                    console.error('[ws] Failed to persist chat:', e);
                }
            } else {
                console.warn('[ws] Room not found for roomId:', roomId);
            }

            // Broadcast to everyone in this room
            users.forEach(user => {
                if (user.rooms.includes(roomId) && user.ws.readyState === WebSocket.OPEN) {
                    user.ws.send(JSON.stringify({ type: 'chat', message, roomId }));
                }
            });
        }
    });

    ws.on('close', () => {
        const idx = users.findIndex(x => x.ws === ws);
        if (idx !== -1) users.splice(idx, 1);
    });
});

console.log(`[ws-backend] WebSocket server running on port ${PORT}`);
