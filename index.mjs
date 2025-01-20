import express from "express";
import chalk from "chalk";
import { exec } from "child_process";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();
const app = express();
const port = 420;

app.get("/", (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.send(`
            <html>
                <body style="font-family: monospace; background-color: rebeccapurple;">
                    <h1 style="color: lime;">Welcome to bAPI</h1>
                    <h2 style="color: lightblue;">Available endpoints:</h2>
                    <p style="color: yellow;">/freemem - The server's currently free RAM</p>
                    <p style="color: yellow;">/currentregion - The server's current region</p>
                </body>
            </html>
        `);
    } else {
        res.send(chalk.green("Welcome to bAPI") + "\n" + chalk.blueBright("Available endpoints:\n") + chalk.yellow("/freemem - The server's currently free RAM\n") + chalk.yellow("/currentregion - The server's current region"));
    }
});

app.get("/freemem", (req, res) => {
    exec("systeminfo", (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            res.send("Error:\n" + err);
            return;
        }
        // Find available memory
        const mem = stdout.match(/Available Physical Memory: (.*?)MB/);
        res.send(mem[1].trim() + "MiB");
    });
});

app.get("/currentregion", (req, res) => {
    // Open region.json
    const region = require("./region.json");
    res.send(region.region);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});