import { Connection } from "@solana/web3.js";
import chalk from "chalk";

// constants
export const SOL_RPC =
    "https://dry-small-bush.solana-devnet.quiknode.pro/31b251093b17da198a07965c98b07f1bce41ef0b/";
export const MSG_PROG_ID = "MSG247fHe9juUsj7MwhDyuoLn9sRZFzvxuLZptmL8Rg";
export const solana = new Connection(SOL_RPC);

export const ASCII = chalk.magenta.bold(`
               /$$       /$$                                        
              | $$      |__/                                        
 /$$  /$$  /$$| $$$$$$$  /$$  /$$$$$$$  /$$$$$$   /$$$$$$   /$$$$$$ 
| $$ | $$ | $$| $$__  $$| $$ /$$_____/ /$$__  $$ /$$__  $$ /$$__  $$
| $$ | $$ | $$| $$  \\ $$| $$|  $$$$$$ | $$  \\ $$| $$$$$$$$| $$  \\__/
| $$ | $$ | $$| $$  | $$| $$ \\____  $$| $$  | $$| $$_____/| $$      
|  $$$$$/$$$$/| $$  | $$| $$ /$$$$$$$/| $$$$$$$/|  $$$$$$$| $$      
 \\_____/\\___/ |__/  |__/|__/|_______/ | $$____/  \\_______/|__/      
                                      | $$                          
                                      | $$                          
                                      |__/                          
`);
