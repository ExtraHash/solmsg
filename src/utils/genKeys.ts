import { Keypair } from "@solana/web3.js";
import fs from "fs";
import { KeyPairs } from "./KeyPairs";

export function prepareKeys() {
    if (!fs.existsSync("keys")) {
        fs.mkdirSync("keys");
    }
    if (!fs.existsSync("keys/id.json")) {
        const sendKeys = Keypair.generate();
        fs.writeFileSync(
            "keys/id.json",
            JSON.stringify(Array.from(sendKeys.secretKey))
        );
        console.log("Created private key file at keys/id.json");
    }

    const keypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync("keys/id.json").toString()))
    );

    return new KeyPairs(keypair);
}
