import { Server, Socket } from "socket.io";
import * as cookie from "cookie";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import { OAuth2Client, LoginTicket } from "google-auth-library";
import { getRepository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { JWTPayload } from "../types/jwt";
import { User } from "../entity/user.model";

dotenv.config();

const client: OAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let waitingUser: string | null = null;

export const registerHandler = (io: Server, socket: Socket, idToSocket: Map<string, string>, socketToId: Map<string, string>) => {

    const onLogin = (arg: any): void => {

        const cookies = cookie.parse(socket.handshake.headers.cookie || "");

        const accessToken: string = cookies.accessToken;

        jwt.verify(accessToken, process.env.JWT_SECRET!, async (error: any, payload: any): Promise<void> => {
            try {
                if(error) {
                    throw error;
                }
                const { token, id, name } = payload as JWTPayload;

                const ticket: LoginTicket = await client.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_CLIENT_ID
                });

                const userData = await getRepository(User).findOne(id);

                if(userData?.id == undefined) {
                    throw Error;
                }

                idToSocket.set(userData?.id, socket.id);
                socketToId.set(socket.id, userData?.id);

                socket.emit("init", userData);

                
            } catch (e) {
                const message: string = (e as Error).message;
                console.log(message);
        
                
            }
        }); 
    };

    const onRoomCreate = (arg: any): void => {
        

    };

    const onMessage = (arg: { roomId: string, message: string }): void => {
        const currentRoom: string[] = Object.keys(socket.rooms).filter(item => item != socket.id);
        console.log("idnya: " + socket.id);
        console.log(socketToId);
        console.log(idToSocket);
        console.log("ada message: " + arg.message + " dari room " + arg.roomId);
        io.to(arg.roomId).emit("messagefromroom", arg.message);
        //io.to("mystoganclives").emit("messagefromroom", arg);
    }

    const startMatching = (arg: any): void => {

        if(waitingUser == null) {
            waitingUser = uuidv4();
            socket.join(waitingUser);
        } else {
            socket.join(waitingUser);
            io.to(waitingUser).emit("match", waitingUser);


            waitingUser = null;
        }
                //console.log(waitingUser);

                
        
    }

    socket.on("login", onLogin);
    socket.on("createroom", onRoomCreate);
    socket.on("sendmessage", onMessage);
    socket.on("startmatch", startMatching);
};