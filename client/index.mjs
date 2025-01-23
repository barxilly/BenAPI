import { Chalk } from "chalk";
import axios from "axios";
import dotenv from "dotenv";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { stat } from "fs";
const chalk = new Chalk();
dotenv.config();
const execAsync = promisify(exec);
const args = process.argv.slice(2);

async function main() {
    console.log(chalk.blueBright("Client Starting"));
    if (!args.includes("--verbose"))
        console.log("Use --verbose to enable verbose logging");

    function log(msg) {
        if (args.includes("--verbose")) console.log(msg);
    }

    function error(msg) {
        console.log(chalk.whiteBright(chalk.bgRedBright("[ERROR]" + msg)));
    }

    log(chalk.yellowBright("Verbose logging enabled"));

    const osName = os.platform();
    log(chalk.yellowBright(`Detected OS: ${osName}`));

    async function checkProcesses() {
        // Check if VSCode is running
        let vscode = false;
        if (osName === "win32") {
            try {
                const { stdout } = await execAsync("tasklist");
                if (stdout.includes("Code.exe")) {
                    log(chalk.greenBright("VSCode is running"));
                    vscode = true;
                } else {
                    log(chalk.red("VSCode is not running"));
                    vscode = false;
                }
            } catch (err) {
                console.error(err);
            }
        } else if (osName === "linux") {
            try {
                const { stdout } = await execAsync("ps -A");
                if (stdout.includes("code")) {
                    log(chalk.greenBright("VSCode is running"));
                    vscode = true;
                } else {
                    log(chalk.red("VSCode is not running"));
                    vscode = false;
                }
            } catch (err) {
                console.error(err);
            }
        }

        // Check if Adobe Photoshop is running
        let photoshop = false;
        if (osName === "win32") {
            try {
                const { stdout } = await execAsync("tasklist");
                if (stdout.includes("Photoshop.exe")) {
                    log(chalk.greenBright("Photoshop is running"));
                    photoshop = true;
                } else {
                    log(chalk.red("Photoshop is not running"));
                    photoshop = false;
                }
            } catch (err) {
                console.error(err);
            }
        } else if (osName === "linux") {
            photoshop = false;
        }

        // Check if Google Chrome is running
        let chrome = false;
        if (osName === "win32") {
            try {
                const { stdout } = await execAsync("tasklist");
                if (stdout.includes("chrome.exe")) {
                    log(chalk.greenBright("Chrome is running"));
                    chrome = true;
                } else {
                    log(chalk.red("Chrome is not running"));
                    chrome = false;
                }
            } catch (err) {
                console.error(err);
            }
        } else if (osName === "linux") {
            try {
                const { stdout } = await execAsync("ps -A");
                if (stdout.includes("chrome") || stdout.includes("chromium")) {
                    log(chalk.greenBright("Chrome is running"));
                    chrome = true;
                } else {
                    log(chalk.red("Chrome is not running"));
                    chrome = false;
                }
            } catch (err) {
                console.error(err);
            }
        }

        // Check if Apple Music is running
        let appleMusic = false;
        if (osName === "win32") {
            try {
                const { stdout } = await execAsync("tasklist");
                if (stdout.includes("AppleMusic.exe")) {
                    log(chalk.greenBright("Apple Music is running"));
                    appleMusic = true;
                } else {
                    log(chalk.red("Apple Music is not running"));
                    appleMusic = false;
                }
            } catch (err) {
                console.error(err);
            }
        } else if (osName === "linux") {
            appleMusic = false;
        }
        return {
            vscode: vscode,
            photoshop: photoshop,
            chrome: chrome,
            appleMusic: appleMusic,
        };
    }

    async function ping() {
        log("")
        const processes = await checkProcesses();
        const serverUrl = process.env.SERVER_URL;
        execAsync(`curl ${serverUrl}`)
            .then(() => {
                log(chalk.greenBright("Server is online"));
                axios.get(`${serverUrl}/status`)
                    .then((res) => {
                        log(chalk.greenBright("Current status: " + JSON.stringify(res.data)));
                        let status = "";
                        if (processes.appleMusic) status = "Listening to Apple Music";
                        if (processes.chrome) status = "Doing School Stuff";
                        if (processes.photoshop) status = "Editing photos";
                        if (processes.vscode) status = "Coding";
                        const apiKey = process.env.API_KEY;
                        axios.post(`${serverUrl}/status`, {
                                headers: {
                                    'Authorization': 'Bearer ' + apiKey,
                                    status: status
                                }
                            }, {
                                'Authorization': 'Bearer ' + apiKey,
                                status: status

                            })
                            .then((res) => {
                                log(chalk.greenBright("Status updated"));
                            })
                            .catch((e) => {
                                error("Failed to update status" + e);
                            });
                    })
            })
            .catch((e) => {
                error("Server is offline");
            });

    }

    ping();
    setInterval(ping, 10000);
}

main();