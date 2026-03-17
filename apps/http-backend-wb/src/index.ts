import express from "express";
import { JWT_SCREAT } from "./config";
import jwt from "jsonwebtoken";
import { middleware } from "./middleware";
const app=express();

app.post("/signup",async(req,res)=>{

    res.json({
        userId:123
    })


})

app.post("/signin",async(req,res)=>{
    const userId=1;
    const token=jwt.sign({
        userId
    },JWT_SCREAT);

    res.json({
        token
    })
})


app.post("/room",middleware,async(req,res)=>{

    //db call

    res.json({
        roomId:123
    })

})
app.listen(3002);