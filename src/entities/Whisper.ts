import {
    Entity,
    Column,
    Unique,
    PrimaryColumn,
    PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class Whisper {
    @PrimaryGeneratedColumn("increment")
    id!: number;

    @Column({ type: "varchar" })
    signature!: string;

    @Column({ type: "varchar" })
    from!: string;

    @Column({ type: "varchar" })
    to!: string;

    @Column({ type: "int" })
    at!: number;

    @Column({ type: "varchar" })
    message!: string;

    @Column({ type: "varchar" })
    direction!: "outgoing" | "incoming";
}
