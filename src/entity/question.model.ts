import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Question {
    
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    question: string;

    @Column()
    answer_a: string;

    @Column()
    answer_b: string;

    @Column()
    answer_c: string;

    @Column()
    answer_d: string;

    @Column()
    answer: number;
}