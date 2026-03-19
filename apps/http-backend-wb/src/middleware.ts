import { NextFunction,Request,Response } from "express";
import jwt from "jsonwebtoken";
import {JWT_SECREAT} from "@repo/backend-common/config"

export function middleware(req:Request,res:Response,next:NextFunction){
    const token =req.headers["authorization"] ?? "";
    const decode=jwt.verify(token,JWT_SECREAT);

    if(decode){
        //@ts-ignore
        req.userId=decode.userId;
        // is thorw error because the jwt could be of string and object so if string is there it is error but we only get the json object of ignoreing it is probalily the good idea and if not add the if condition that !string
        next();
    }
    else{
        res.status(403).json({
            message:"Unauthorized",
        })
    }
}