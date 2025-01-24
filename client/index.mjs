import { Chalk } from "chalk";
import axios from "axios";
import dotenv from "dotenv";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { stat } from "fs";
const chalk = new Chalk();
dotenv.config();
const execAsync = (command) => {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { shell: false, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
};
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
    // Check if Minecraft is running (Windows only)
    let minecraft = false;
    if (osName === "win32") {
      try {
        const { stdout } = await execAsync("tasklist");
        if (stdout.includes("MinecraftLauncher.exe")) {
          log(chalk.greenBright("Minecraft is running"));
          minecraft = true;
        } else {
          log(chalk.red("Minecraft is not running"));
          minecraft = false;
        }
      } catch (err) {
        console.error(err);
      }
    } else if (osName === "linux") {
      minecraft = false;
    }

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

    // Check if Adobe Photoshop is running (Windows only)
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

    // Check if Apple Music is running (Windows only)
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

    // Check if ssh is connected to a server
    let ssh = false;
    if (osName === "win32") {
      try {
        const { stdout } = await execAsync("tasklist");
        if (stdout.includes("ssh")) {
          log(chalk.greenBright("SSH is connected"));
          ssh = true;
        } else {
          log(chalk.red("SSH is not connected"));
          ssh = false;
        }
      } catch (err) {
        console.error(err);
      }
    } else if (osName === "linux") {
      try {
        const { stdout } = await execAsync("ps -A");
        if (stdout.includes("ssh")) {
          log(chalk.greenBright("SSH is connected"));
          ssh = true;
        } else {
          log(chalk.red("SSH is not connected"));
          ssh = false;
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Check if terminal is running
    let terminal = false;
    if (osName === "win32") {
      try {
        const { stdout } = await execAsync("tasklist");
        if (
          stdout.includes("pwsh") ||
          stdout.includes("cmd") ||
          stdout.includes("WindowsTerminal")
        ) {
          log(chalk.greenBright("Terminal is running"));
          terminal = true;
        } else {
          log(chalk.red("Terminal is not running"));
          terminal = false;
        }
      } catch (err) {
        console.error(err);
      }
    } else if (osName === "linux") {
      try {
        const { stdout } = await execAsync("ps -A");
        if (stdout.includes("bash") || stdout.includes("zsh")) {
          log(chalk.greenBright("Terminal is running"));
          terminal = true;
        } else {
          log(chalk.red("Terminal is not running"));
          terminal = false;
        }
      } catch (err) {
        console.error(err);
      }
    }
    return {
      minecraft: minecraft,
      vscode: vscode,
      photoshop: photoshop,
      chrome: chrome,
      ssh: ssh,
      terminal: terminal,
      appleMusic: appleMusic,
    };
  }

  async function ping() {
    log("");
    const processes = await checkProcesses();
    const serverUrl = process.env.SERVER_URL;
    execAsync(`curl ${serverUrl}`)
      .then(() => {
        log(chalk.greenBright("Server is online"));
        axios.get(`${serverUrl}/status`).then((res) => {
          log(chalk.greenBright("Current status: " + JSON.stringify(res.data)));
          let status = "";
          if (processes.minecraft) status = "Playing Minecraft";
          else if (processes.vscode) status = "Coding";
          else if (processes.photoshop) status = "Designing";
          else if (processes.chrome) status = "Learning";
          else if (processes.ssh) status = "SSH'd into a server";
          else if (processes.terminal) status = "PowerShellin'";
          else if (processes.appleMusic) status = "Listening to Apple Music";
          else status = "Online but Idle";
          const apiKey = process.env.API_KEY;
          axios
            .post(
              `${serverUrl}/status`,
              {
                api: apiKey,
                status: status,
              },
              {
                headers: {
                  Authorization: "Bearer " + apiKey,
                  status: status,
                },
              }
            )
            .then((res) => {
              log(chalk.greenBright("Status updated: "));
              log(chalk.greenBright(JSON.stringify(res.data)));
            })
            .catch((e) => {
              error("Failed to update status: " + e);
            });
        });
      })
      .catch((e) => {
        error("Server is offline");
      });
  }

  ping();
  setInterval(ping, 30000);
}

main();
