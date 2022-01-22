import { Entity, Unique, PrimaryColumn, Column } from "typeorm";

@Entity()
@Unique(["signature"])
export class LastSeen {
    @PrimaryColumn({ type: "int" })
    index!: number;

    @Column({ type: "varchar", nullable: true })
    signature!: string | undefined;
}
