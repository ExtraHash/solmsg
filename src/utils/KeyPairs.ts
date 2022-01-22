import ed2curve from "ed2curve";
import { Keypair } from "@solana/web3.js";

export class KeyPairs {
    public edKeys: Keypair;
    public x2Keys: {
        publicKey: Uint8Array;
        secretKey: Uint8Array;
    };

    constructor(ed2Keypair: Keypair) {
        this.edKeys = ed2Keypair;

        this.x2Keys = {
            publicKey: ed2curve.convertPublicKey(
                ed2Keypair.publicKey.toBuffer()
            )!,
            secretKey: ed2curve.convertSecretKey(ed2Keypair.secretKey),
        };

        if (!this.x2Keys.publicKey) {
            throw new Error("Public key convert failed.");
        }
    }
}
