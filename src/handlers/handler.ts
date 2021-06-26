import { Server, Socket } from "socket.io";
import * as cookie from "cookie";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import { OAuth2Client, LoginTicket } from "google-auth-library";
import { getRepository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { JWTPayload } from "../types/jwt";
import { User } from "../entities/user.model";
import { Question } from "../entities/question.model";

dotenv.config();

const client: OAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

type Game = {
    round: number,
    questionId: number[],
    player: Map<string, number[]>,
    point: Map<string, number>,
    count: number
};

let waitingUser: string | null = null;
let game = new Map<string, Game>();

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
        io.to(arg.roomId).emit("messagefromroom", arg.message);
        //io.to("mystoganclives").emit("messagefromroom", arg);
    }

    const startMatching = async (arg: {}): Promise<void> => {

        if(waitingUser == null) {
            waitingUser = uuidv4();

            game.set(waitingUser, {
                round: 0,
                questionId: [],
                player: new Map<string, number[]>(),
                count: 0,
                point: new Map<string, number>()
            });

            game.get(waitingUser)?.player.set(socketToId.get(socket.id)!, []);
            game.get(waitingUser)?.point.set(socketToId.get(socket.id)!, 0);

            socket.join(waitingUser);
        } else {
            socket.join(waitingUser);


            try {
                const questions = await getRepository(Question).find();

                console.log(questions);

                let obj: {
                    questions: string[],
                    answers: string[][],
                } = {
                    questions: [],
                    answers: []
                };

                for(let i = 0; i < 4; i++) {
                    obj.questions.push(questions[i].question);
                    obj.answers.push([questions[i].answer_a, questions[i].answer_b, questions[i].answer_c, questions[i].answer_d]);
                    game.get(waitingUser)?.questionId.push(questions[i].id);
                }

                game.get(waitingUser)?.player.set(socketToId.get(socket.id)!, []);
                game.get(waitingUser)?.point.set(socketToId.get(socket.id)!, 0);

                console.log(game.get(waitingUser));


                

                io.to(waitingUser).emit("match", {roomId: waitingUser, game: obj});

                waitingUser = null;
            } catch (e) {
                const message: string = (e as Error).message;
                console.log(message);
            }
                
                
            
        }
                //console.log(waitingUser);

                
        
    }

    const onAnswer = async (arg: {roomId: string, answer: number, point: number}): Promise<void> => {

        const currentGame = game.get(arg.roomId);
        const questionId = currentGame?.questionId[currentGame.round];

        try {
            const questionData = await getRepository(Question).findOne(questionId);

            const pointVal = (arg.answer === questionData?.answer) ? arg.point : 0;
            if(currentGame?.count === 0){
                currentGame.count++;

                currentGame.player.get(socketToId.get(socket.id)!)?.push(pointVal);
                currentGame.point.set(socketToId.get(socket.id)!, currentGame.point.get(socketToId.get(socket.id)!)! + pointVal);

                socket.emit("answerreceived", questionData?.answer);
            } else if(currentGame?.count === 1) {

                currentGame.round++;
                currentGame.player.get(socketToId.get(socket.id)!)?.push(pointVal);
                currentGame.point.set(socketToId.get(socket.id)!, currentGame.point.get(socketToId.get(socket.id)!)! + pointVal);

                socket.emit("answerreceived", questionData?.answer);
                if(currentGame.round === 4) {

                    let maxPoints = -1;
                    let players: string[] = [];
                    let points: number[] = [];
                    currentGame.point.forEach(async (value: number, key: string) => {
                        maxPoints = (value > maxPoints) ? value : maxPoints;
                        points.push(value);
                        await getRepository(User).increment({id: key}, "points", value);
                    });

                    /* this is a bit dangerous */

                    setTimeout(() => {
                        currentGame.point.forEach(async (value: number, key: string) => {
                            if(value === maxPoints && points[0] === points[1]) {
                                io.to(idToSocket.get(key)!).emit("gamefinished", {
                                    status: 'tie',
                                    point: value
                                });
                            }  else if(value === maxPoints && points[0] !== points[1]) {
                                io.to(idToSocket.get(key)!).emit("gamefinished", {
                                    status: 'win',
                                    point: value
                                });
                            } else {
                                io.to(idToSocket.get(key)!).emit("gamefinished", {
                                    status: 'lose',
                                    point: value
                                });
                            }
                        });

                    }, 3000);

                    

                } else {
                    setTimeout(() => {
                        io.to(arg.roomId).emit("nextround", currentGame.round);
                    }, 3000);
                }

                currentGame.count = 0;
            }

            

        } catch (e) {
            const message: string = (e as Error).message;
            console.log(message);
        }
    };

    socket.on("login", onLogin);
    socket.on("createroom", onRoomCreate);
    socket.on("sendmessage", onMessage);
    socket.on("startmatch", startMatching);
    socket.on("answer", onAnswer);
};