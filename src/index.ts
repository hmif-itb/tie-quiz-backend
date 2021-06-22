import * as http from "http";
import * as dotenv from "dotenv";
import express, { Express } from "express";
import { Server, Socket } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.router";

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


const app: Express = express();
const httpServer: http.Server = http.createServer(app);

const io: Server = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
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



io.on("connection", (socket: Socket) => {
    console.log(socket.id);
});


httpServer.listen(PORT, () => {
    console.log(`Server is up and running at PORT: ${PORT}`);
});