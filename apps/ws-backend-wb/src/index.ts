import {WebSocket, WebSocketServer} from 'ws';
import jwt from "jsonwebtoken";
import { JWT_SECREAT } from './confog';

const wss= new WebSocketServer({port:3001})


wss.on('connection', function connection(ws, req){
    const url=req.url;
    if(!url) return;
    const queryParams=new URLSearchParams(url.split("?")[1])
    const token=queryParams.get("token")||"";
    const decode=jwt.verify(token,JWT_SECREAT);

    if(!decode){
        ws.close();
        return;
    }
    ws.on('message',function message(data){
        ws.send('pong');
    });
    

    
})