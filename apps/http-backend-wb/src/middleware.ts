import { NextFunction,Request,Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SCREAT } from "./config";

export function middleware(req:Request,res:Response,next:NextFunction){
    const token =req.headers["authorization"] ?? "";
    const decode=jwt.verify(token,JWT_SCREAT);

    if(decode){
        //@ts-ignore
        req.userId=decode.userId;
        next();
    }
    else{
        res.status(403).json({
            message:"Unauthorized",
        })
    }
}