#!/usr/bin/env node

import {
    Transaction,
    TransactionInstruction,
    PublicKey,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { box, randomBytes } from "tweetnacl";
import { encode as encodeUtf8, decode as decodeUtf8 } from "@stablelib/utf8";
import {
    encode as encodeBase64,
    decode as decodeBase64,
} from "@stablelib/base64";
import { KeyPairs } from "./utils/KeyPairs";
import { prepareKeys } from "./utils/genKeys";
import ed2curve from "ed2curve";
import { ASCII, MSG_PROG_ID, solana } from "./constants/constants";
import { createConnection, getRepository } from "typeorm";
import path from "path";
import { Whisper } from "./entities/Whisper";
import prompts from "prompts";
import ora from "ora";
import { LastSeen } from "./entities/LastSeen";
import os from "os";
import chalk from "chalk";

// tslint:disable-next-line: no-var-requires
const packageJson = require("../package.json");

async function main() {
    console.log(ASCII);

    console.log(`whisper version ${packageJson.version}`);

    // get db conn
    const connection = await createConnection({
        type: "sqlite",
        database: path.resolve(os.homedir(), ".solwhisper", "sqlite.db"),
        entities: [path.resolve(__dirname, "entities/*{.ts,.js}")],
        synchronize: true,
    });

    // first, get the identity keys
    const idKeys = prepareKeys();
    console.log("Public address: " + idKeys.edKeys.publicKey.toString());

    // make sure the account has some sol
    const balance = await solana.getBalance(idKeys.edKeys.publicKey);
    if (balance === 0) {
        console.warn(
            "Your SOL balance is 0. Pease get some devnet SOL here: https://solfaucet.com/"
        );
        console.warn(chalk.yellow.bold("WARNING: ") + "Whisper is currently operating on devnet. Please DO NOT send mainnet funds to your address.")
        const spinner = ora("Waiting for wallet to be funded").start();

        while (true) {
            const newBalance = await solana.getBalance(idKeys.edKeys.publicKey);
            if (newBalance > 0) {
                spinner.succeed(
                    "Wallet funded. Balance: " +
                        (newBalance / LAMPORTS_PER_SOL).toFixed(4) +
                        " SOL"
                );
                break;
            }
            await sleep(2000);
        }
    } else {
        console.log(
            "Balance: " + (balance / LAMPORTS_PER_SOL).toFixed(4) + " SOL"
        );
    }
    while (true) {
        const response = await prompts({
            type: "select",
            name: "action",
            message: "What would you like to do?",
            choices: [
                { title: "Send Message", value: "send" },
                { title: "Check Messages", value: "retrieve" },
                { title: "Read Messages", value: "read" },
                { title: "Exit", value: "exit" },
            ],
        });
        switch (response.action) {
            case "send":
                const sendResponse = await prompts([
                    {
                        type: "text",
                        name: "to",
                        message:
                            "What SOL address do you wish to send a message to?",
                    },
                    {
                        type: "text",
                        name: "message",
                        message: "What is the message?",
                    },
                ]);
                await sendMessage(
                    idKeys,
                    sendResponse.to,
                    sendResponse.message
                );

                break;
            case "read":
                const pastMessages = await getRepository(Whisper).find();
                printMessages(pastMessages);
                break;
            case "retrieve":
                await getMessages(idKeys);
                break;
            case "exit":
                console.log("Thanks for stopping by");
                process.exit(0);
        }
    }
}

export function sleep(ms: number) {
    return new Promise((res, rej) => setTimeout(res, ms));
}

async function getMessages(idKeys: KeyPairs) {
    let spinner: ora.Ora;

    try {
        let lastSeen = await getRepository(LastSeen).findOne({
            index: 0,
        });

        if (!lastSeen) {
            await getRepository(LastSeen).insert({
                index: 0,
                signature: undefined,
            });

            lastSeen = await getRepository(LastSeen).findOne({
                index: 0,
            });
        }

        spinner = ora(
            !lastSeen!.signature
                ? "Checking for new messages (the first scan will take some time)"
                : "Checking for new messages"
        ).start();

        const res = await solana.getSignaturesForAddress(
            new PublicKey(MSG_PROG_ID),
            {
                until: lastSeen!.signature,
            }
        );

        const found: Partial<Whisper>[] = [];

        if (res.length > 0) {
            for (const txDetails of res) {
                try {
                    const tx = await solana.getTransaction(txDetails.signature);
                    const logMsg = (tx as any).meta.logMessages[1];
                    const msg: string = logMsg.split('"')[1];

                    const recvAddr = new PublicKey(
                        decodeBase64(msg.slice(0, 43))
                    );

                    if (
                        recvAddr.toBase58() ===
                        idKeys.edKeys.publicKey.toBase58()
                    ) {
                        const nonce = decodeBase64(msg.slice(44, 76));
                        const cryptMsg = decodeBase64(msg.slice(76));

                        const sendEdPubkey = tx?.transaction.message
                            .accountKeys[0] as PublicKey;
                        const sendX2Pubkey = ed2curve.convertPublicKey(
                            sendEdPubkey.toBytes()
                        );

                        const decryptedMsg = box.open(
                            cryptMsg,
                            nonce,
                            sendX2Pubkey!,
                            idKeys.x2Keys.secretKey
                        );

                        if (!decryptedMsg) {
                            throw new Error("Message not decrypted properly");
                        }

                        const msgDetails: Partial<Whisper> = {
                            signature: txDetails.signature,
                            from: sendEdPubkey.toBase58(),
                            to: idKeys.edKeys.publicKey.toBase58(),
                            at: new Date(tx?.blockTime! * 1000).getTime(),
                            message: decodeUtf8(decryptedMsg),
                            direction: "incoming",
                        };
                        await getRepository(Whisper).insert(msgDetails);
                        found.push(msgDetails);
                    }
                } catch (error) {
                    // console.error(error);
                }
            }
            lastSeen!.signature = res[0].signature;
            await getRepository(LastSeen).update({ index: 0 }, lastSeen!);
        }
        spinner.succeed("Found " + found.length + " new message(s).");
        printMessages(found);
    } catch (error: any) {
        spinner!.fail(error.toString());
    }
}

function printMessages(messages: Partial<Whisper>[]) {
    for (const m of messages.sort((a, b) => {
        if (a.at! > b.at!) {
            return 1;
        } else if (a.at! < b.at!) {
            return -1;
        }
        return 0;
    })) {
        printMessage(m);
    }
}

function printMessage(msg: Partial<Whisper>) {
    if (msg.direction === "incoming") {
        console.log("---------RECIEVED---------");
        console.log("From: " + msg.from);
    } else {
        console.log("-----------SENT-----------");
        console.log("To: " + msg.to);
    }
    console.log("At: " + new Date(msg.at as number).toLocaleString());
    console.log();
    console.log(msg.message);
    console.log("--------------------------");
}

async function sendMessage(
    idKeys: KeyPairs,
    receiver: string,
    message: string
) {
    const spinner = ora("Sending message").start();

    try {
        const nonce = makeNonce();
        const recvEdKey = new PublicKey(receiver);

        const recvX2Key = ed2curve.convertPublicKey(
            new PublicKey(receiver).toBytes()
        )!;
        const encryptedMsg = box(
            encodeUtf8(message),
            nonce,
            recvX2Key,
            idKeys.x2Keys.secretKey
        );

        const msg = `${encodeBase64(recvEdKey.toBytes())}${encodeBase64(
            nonce
        )}${encodeBase64(encryptedMsg)}`;

        const instruction = new TransactionInstruction({
            keys: [],
            programId: new PublicKey(MSG_PROG_ID),
            data: Buffer.from(msg),
        });

        const sentTime = new Date(Date.now()).getTime();

        const transaction = new Transaction().add(instruction);

        const signature = await sendAndConfirmTransaction(
            solana,
            transaction,
            [idKeys.edKeys],
            {
                skipPreflight: true,
                commitment: "singleGossip",
            }
        );
        spinner.succeed(
            `Message sent, transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`
        );

        const msgDetails: Partial<Whisper> = {
            signature,
            from: idKeys.edKeys.publicKey.toBase58(),
            to: receiver,
            at: sentTime,
            message,
            direction: "outgoing",
        };
        await getRepository(Whisper).insert(msgDetails);
    } catch (error: any) {
        spinner.fail(error.toString());
    }
}

export function makeNonce(): Uint8Array {
    return randomBytes(24);
}

main();
