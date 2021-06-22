import { Request, Response, Router } from "express";
import * as jwt from 'jsonwebtoken';
import * as dotenv from "dotenv";
import dayjs from "dayjs";
import { OAuth2Client, LoginTicket } from "google-auth-library";
import { JWTPayload } from "../types/jwt";

dotenv.config();

const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID as string;
const JWT_SECRET: string = process.env.JWT_SECRET as string;

const client: OAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

const authRouter: Router = Router();

authRouter.post("/verifytoken", async (req: Request, res: Response): Promise<void> => {
    try {
        const token: string = req.body.token;

        const ticket: LoginTicket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        
        const payload: JWTPayload = {
            name: ticket.getPayload()?.name,
            id: ticket.getPayload()?.email?.split("@")[0],
            token: token
        };

        jwt.sign(payload, JWT_SECRET, {
            expiresIn: "1h"
        }, (error: Error | null, jwtToken?: string): void => {
            if(error) {
                throw error;
            }
            res.cookie("accessToken", jwtToken, {
                secure: process.env.NODE_ENV !== "development",
                httpOnly: true,
                expires: dayjs().add(1, "hour").toDate()
            });
    
            res.status(200).json({
                status: "success"
            });
        });

    } catch (e) {
        const message: string = (e as Error).message;
        //console.log(message);

        res.status(401).json({
            status: "error"
        });
    }
});

authRouter.get("/verifysession", (req: Request, res: Response): void => {
    const accessToken: string = req.cookies.accessToken;

    jwt.verify(accessToken, JWT_SECRET, async (error: any, payload: any): Promise<void> => {
        try {
            if(error) {
                throw error;
            }
            const { token } = payload as JWTPayload;

            const ticket: LoginTicket = await client.verifyIdToken({
                idToken: token,
                audience: GOOGLE_CLIENT_ID
            });
    
            res.status(200).json({
                status: "success"
            });
        } catch (e) {
            const message: string = (e as Error).message;
            //console.log(message);
    
            res.status(401).json({
                status: "error"
            });
        }
    }); 
});

export { authRouter };



