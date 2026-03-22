import express from "express";
import jwt from "jsonwebtoken";
import  argon2  from "argon2";
import { middleware } from "./middleware";

import {JWT_SECREAT} from "@repo/backend-common/config";
import {CreateUserSchema,SigninSchema,CreateRoomSchema} from "@repo/common/z_validation";
import cors from "cors";

import {prisma} from "@repo/prisma/db";

const app=express();
app.use(cors())
app.use(express.json()); 
app.get("/signup", async(req, res) => {
    const parsedData=CreateUserSchema.safeParse(req.body);
    if(!parsedData.success){
        res.json({
            message: "Incorred Inputs"
        })
        return;
    }
    try{
        const hashedPassword=await argon2.hash(parsedData.data.password);
        const user=await prisma.user.create({
            data:{
                email: parsedData.data.username,
                password: hashedPassword,
                name: parsedData.data.username
            }
        })
        res.json({
            userId: user.id
        })
    }catch(e){
        res.status(411).json({
            message: "Error signing up, exists"
        })
    }
})






app.get("/signin", async(req, res) => {
    const parsedData=SigninSchema.safeParse(req.body);
    if(!parsedData.success){
        res.json({
            message: "Invalid Inputs"
        })
        return;
    }
    try{
        const user=await prisma.user.findFirst({
            where:{
                email: parsedData.data.username
            }
        })
        if(!user){
            res.status(401).json({
                message: "User not found, invalid"
            })
            return
        }
        const isValidPassword=await argon2.verify(user.password, parsedData.data.password);
        if(isValidPassword && user?.id){

            const token=jwt.sign({
                userId: user.id
            }, JWT_SECREAT)
            res.json({
                token: token
            })
        }else{
            res.status(401).json({
                message : "Invalid credentials, password not correct"
            })
        }
    }catch(e){
        res.status(411).json({
            message: "Unauthorization Error during signing in"
        })
    }
})


app.post("/room", middleware, async(req, res) => {
    const parsedData= CreateRoomSchema.safeParse(req.body)
    if(!parsedData.success){
        res.json({
            message : "Incorrect Inputs"
        })
        return;
    }
    //@ts-ignore
    const userId=req.userId;
    if(!userId){
        res.status(403).json({
            message : "Unauthorized"
        })
        return;
    }
    try{
        const room = await prisma.room.create({
            data:{
                slug: parsedData.data.name,
                adminId: userId
            }
        })
        res.json({
            roomId: room.id
        })
    }catch(e){
        res.status(411).json({
            message: "Room exits & Error creating Room"
        })
    }
})

app.get("/chats/:roomId", async(req, res)=>{
    try{
        const roomId=Number(req.params.roomId);
        const messages=await prisma.chat.findMany({
            where:{
                roomId: roomId
            },
            orderBy:{
                id: "desc"
            },
            take:50
        })
        res.json({
            messages: messages
        })
    }catch(e){
        res.status(411).json({
            message:[]
        })
    }
})  

app.get("/room/:slug", async (req, res) => {
    const slug = req.params.slug;
    const room = await prisma.room.findFirst({
        where: {
            slug
        }
    });

    res.json({
        room
    })
})

app.listen(3001);