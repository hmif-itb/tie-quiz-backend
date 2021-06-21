import * as http from "http";
import * as dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import { Server, Socket } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dayjs from "dayjs";
import { OAuth2Client, LoginTicket } from "google-auth-library";

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
const httpServer: http.Server = http.createServer(app);

const io: Server = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
    }
});

const client: OAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

const corsOptions: cors.CorsOptions = {
    origin: [CLIENT_URL],
    credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.post("/verifytoken", async (req: Request, res: Response): Promise<void> => {
    try {
        const token: string = req.body.token;

        const ticket: LoginTicket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        console.log(ticket.getPayload());

        res.cookie("accessToken", token, {
            secure: process.env.NODE_ENV !== "development",
            httpOnly: true,
            expires: dayjs().add(1, "hour").toDate()
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

app.get("/verifysession", async (req: Request, res: Response): Promise<void> => {
    try {
        const token: string = req.cookies.accessToken;

        const ticket: LoginTicket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        console.log(ticket.getPayload());

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

io.on("connection", (socket: Socket) => {
    console.log(socket.id);
});


httpServer.listen(PORT, () => {
    console.log(`Server is up and running at PORT: ${PORT}`);
});