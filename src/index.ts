import { createServer } from "http";
import * as dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import { Server, Socket } from "socket.io";
import cors from "cors";
import helmet from "helmet";

dotenv.config();

if(!process.env.PORT || !process.env.APP_MODE || !process.env.CLIENT_URL || !process.env.GOOGLE_CLIENT_ID) {
    console.log("please set the environment variable correctly.")
    process.exit(1);
}

const PORT: number = parseInt(process.env.PORT, 10);
const APP_MODE: string = process.env.APP_MODE;
const CLIENT_URL: string = process.env.CLIENT_URL;
const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID;


const app: Express = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
    }
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.post("/verifytoken", (req: Request, res: Response) => {

    const token: string = req.body.token;

    res.status(200).json({
        status: "success",
        payload: {
            string: token
        }
    });
});

io.on("connection", (socket: Socket) => {
    console.log(socket.id);
});


httpServer.listen(PORT, () => {
    console.log(`Server is up and running at PORT: ${PORT}`);
});