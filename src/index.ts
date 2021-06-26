import "reflect-metadata";
import * as http from "http";
import * as dotenv from "dotenv";
import * as jwt from "jsonwebtoken";
import express, { Express } from "express";
import { createConnection, getRepository } from "typeorm";
import { Server, Socket } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import * as cookie from "cookie";
import { OAuth2Client, LoginTicket } from "google-auth-library";

import { authRouter } from "./routes/auth.router";
import { User } from "./entity/user.model";
import { Question } from "./entity/question.model";
import { JWTPayload } from "./types/jwt";
import { registerHandler } from "./handlers/handler";

dotenv.config();

if(!process.env.PORT || !process.env.APP_MODE || !process.env.CLIENT_URL || !process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
    console.log("please set the environment variable correctly.")
    process.exit(1);
}

const PORT: number = parseInt(process.env.PORT, 10);
const APP_MODE: string = process.env.APP_MODE;
const CLIENT_URL: string = process.env.CLIENT_URL;
const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET: string = process.env.JWT_SECRET;

createConnection({
    type: "mysql",
    host: process.env.MYSQL_HOST as string,
    port: 3306,
    username: process.env.MYSQL_USER as string,
    password: process.env.MYSQL_PASS as string,
    database: process.env.MYSQL_DBNAME as string,
    entities: [
        User, Question
    ],
    synchronize: true,
    logging: false
}).then(() => {
    const app: Express = express();
    const httpServer: http.Server = http.createServer(app);

    const client: OAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

    const io: Server = new Server(httpServer, {
        cors: {
            origin: CLIENT_URL,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    const corsOptions: cors.CorsOptions = {
        origin: [CLIENT_URL],
        credentials: true
    };



    app.use(helmet());
    app.use(cors(corsOptions));
    app.use(cookieParser());
    app.use(express.json());

    app.use("/", authRouter);


    let idToSocket = new Map<string, string>();
    let socketToId = new Map<string, string>();


    io.on("connection", (socket: Socket) => {

        registerHandler(io, socket, idToSocket, socketToId);

    });


    httpServer.listen(PORT, () => {
        console.log(`Server is up and running at PORT: ${PORT}`);
    });
}).catch((error) => console.log(error));


