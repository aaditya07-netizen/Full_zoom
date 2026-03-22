"use client";

import { initDraw } from "../drawshapes";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "./Canvas-client";

export function RoomCanvas({roomId}: {roomId: string}) {
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:3002?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4MjE3ZTkwOC1iNmI1LTRhMzMtODc4OS02NzM4MTNmYWQ1ZDYiLCJpYXQiOjE3NzQxNjk1MTV9.XT-VBSUWoSfgLL4LFU0DJMXYbUq7-vqYmDSX8gpgyKY`)

        ws.onopen = () => {
            setSocket(ws);
            const data = JSON.stringify({
                type: "join_room",
                roomId
            });
            console.log(data);
            ws.send(data)
        }
        
    }, [])
   
    if (!socket) {
        return <div>
            Connecting to server....
        </div>
    }

    return <div>
        <Canvas roomId={roomId} socket={socket} />
    </div>
}