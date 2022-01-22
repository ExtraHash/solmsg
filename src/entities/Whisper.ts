import { Entity, Column, Unique, PrimaryColumn } from "typeorm";

@Entity()
@Unique(["signature"])
export class Whisper {
    @PrimaryColumn({ type: "varchar" })
    signature!: string;

    @Column({ type: "varchar" })
    from!: string;

    @Column({ type: "int" })
    at!: number;

    @Column({ type: "varchar" })
    message!: string;
}
