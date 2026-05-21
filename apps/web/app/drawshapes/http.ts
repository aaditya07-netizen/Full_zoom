import axios from "axios";

const WB_HTTP_URL = process.env.NEXT_PUBLIC_WHITEBOARD_HTTP_URL || "http://localhost:3010";

export async function getExistingShapes(roomId: string) {
    const res = await axios.get(`${WB_HTTP_URL}/chats/${roomId}`);
    const messages = res.data.messages;

    const shapes = messages.reverse().map((x: {message: string}) => {
        const messageData = JSON.parse(x.message)
        return messageData.shape;
    })

    return shapes;
}
