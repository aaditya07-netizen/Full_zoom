import express from "express";
import jwt from "jsonwebtoken";
import { middleware } from "./middleware";
const app=express();
import {JWT_SECREAT} from "@repo/backend-common/config";
import {CreateUserSchema,SigninSchema,CreateRoomSchema} from "@repo/common/z_validation"

app.post("/signup",async(req,res)=>{
    const parsedData=CreateUserSchema.safeParse(req.body);
    if(!parsedData.success){
        res.json({
            message: "Incorred Inputs"
        })
        return;
    }

    res.json({
        userId:123
    })


})

app.post("/signin",async(req,res)=>{

    const parsedData=SigninSchema.safeParse(req.body);
    if(!parsedData.success){
        res.json({
            message: "Invalid Inputs"
        })
        return;
    }

    const userId=1;
    const token=jwt.sign({
        userId
    },JWT_SECREAT);

    res.json({
        token
    })
})


app.post("/room",middleware,async(req,res)=>{
    const parsedData= CreateRoomSchema.safeParse(req.body)
    if(!parsedData.success){
        res.json({
            message : "Incorrect Inputs"
        })
        return;
    }

    //db call

    res.json({
        roomId:123
    })

})
app.listen(3002);