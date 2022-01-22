import { Keypair } from "@solana/web3.js";
import fs from "fs";
import { KeyPairs } from "./KeyPairs";
import path from "path";
import os from "os";

export function prepareKeys() {
    if (!fs.existsSync(path.resolve(os.homedir(), ".solwhisper"))) {
        fs.mkdirSync(path.resolve(os.homedir(), ".solwhisper"));
    }

    if (!fs.existsSync(path.resolve(os.homedir(), ".solwhisper", "keys"))) {
        fs.mkdirSync(path.resolve(os.homedir(), ".solwhisper", "keys"));
    }
    if (
        !fs.existsSync(
            path.resolve(os.homedir(), ".solwhisper", "keys", "id.json")
        )
    ) {
        const sendKeys = Keypair.generate();
        fs.writeFileSync(
            path.resolve(os.homedir(), ".solwhisper", "keys", "id.json"),
            JSON.stringify(Array.from(sendKeys.secretKey))
        );
        console.log(
            `Created private key file at ${path.resolve(
                os.homedir(),
                ".solwhisper",
                "keys",
                "id.json"
            )}`
        );
    }

    const keypair = Keypair.fromSecretKey(
        Uint8Array.from(
            JSON.parse(
                fs
                    .readFileSync(
                        path.resolve(
                            os.homedir(),
                            ".solwhisper",
                            "keys",
                            "id.json"
                        )
                    )
                    .toString()
            )
        )
    );

    return new KeyPairs(keypair);
}
