import express from "express";
import chalk from "chalk";
import { exec } from "child_process";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import axios from "axios";
import os from "os";
import fs from "fs";
import { inspect } from "util";
import path from "path";
import { Filter } from "bad-words";
dotenv.config();
const app = express();
const port = 420;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "You've been rate limited. Wtf are you even doing?",
  keyGenerator: (req) => {
    const apiKey = req.headers["authorization"]?.split(" ")[1];
    if (apiKey && process.env.APP_KEYS.split(",").includes(apiKey)) {
      return apiKey; // Use API key as the unique key
    }
    return req.headers["cf-connecting-ip"] || req.ip;
  },
  skip: (req) => {
    const apiKey = req.headers["authorization"]?.split(" ")[1];
    return apiKey && process.env.APP_KEYS.split(",").includes(apiKey);
  },
});

app.use(limiter);

app.get("/", (req, res) => {
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    res.send(`
            <html>
                <body style="font-family: monospace; background-color: rebeccapurple;">
                    <h1 style="color: lime;">Welcome to benAPI</h1>
                    <h2 style="color: lightblue;">Available endpoints:</h2>
                    <p><span style="color: orange;">GET</span> <a href="/status" style="color: yellow;">/status</a><span style="color: white;"> - Ben's status</span></p>
                    <p><span style="color: orange;">GET</span> <a href="/freemem" style="color: yellow;">/freemem</a><span style="color: white;"> - The server's currently free RAM</span></p>
                    <p><span style="color: orange;">GET</span> <a href="/currentregion" style="color: yellow;">/currentregion</a><span style="color: white;"> - Ben's current region</span></p>
                    <p><span style="color: orange;">GET</span> <a href="/wifispeed" style="color: yellow;">/wifispeed</a><span style="color: white;"> - The server's current wifi speed</span></p>
                    <p><span style="color: orange;">GET</span> <a href="/weather" style="color: yellow;">/weather</a><span style="color: white;"> - The current weather in Ben's region</span></p>
                    <p><span style="color: orange;">GET</span> <a href="/processor" style="color: yellow;">/processor</a><span style="color: white;"> - The server's processor</span></p>
                    <p><span style="color: orange;">GET</span> <a href="/connecteddrives" style="color: yellow;">/connecteddrives</a><span style="color: white;"> - The server's connected drives</span></p>
                    <p><span style="color: orange;">GET</span> <a href="/currentos" style="color: yellow;">/currentos</a><span style="color: white;"> - The server's current operating system</span></p>
                    <p><span style="color: orange;">GET</span> <a href="/whatpeoplesay" style="color: yellow;">/whatpeoplesay</a><span style="color: white;"> - What people say</span></p>
                    <p><span style="color: orange;">POST</span> <span style="color: yellow;">/saysomething</span><span style="color: white;"> - Say something. Use request header 'message'</span></p>
                    <p><span style="color: orange;">POST</span> <span style="color: yellow;">/region</span><span style="color: white;"> - Set Ben's current region (Private)</span></p>
                </body>
            </html>
        `);
  } else {
    res.send(
      chalk.green("Welcome to benAPI") +
        "\n" +
        chalk.blueBright("Available endpoints:\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/status") +
        chalk.white(" - Ben's status\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/freemem") +
        chalk.white(" - The server's currently free RAM\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/currentregion") +
        chalk.white(" - Ben's current region\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/wifispeed") +
        chalk.white(" - The server's current wifi speed\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/weather") +
        chalk.white(" - The current weather in Ben's region\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/processor") +
        chalk.white(" - The server's processor\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/connecteddrives") +
        chalk.white(" - The server's connected drives\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/currentos") +
        chalk.white(" - The server's current operating system\n") +
        chalk.redBright("GET ") +
        chalk.yellow("/whatpeoplesay") +
        chalk.white(" - What people say\n") +
        chalk.redBright("POST ") +
        chalk.yellow("/saysomething") +
        chalk.white(" - Say something. Use request header 'message'\n") +
        chalk.redBright("POST ") +
        chalk.yellow("/region") +
        chalk.white(" - Set Ben's current region (Private)\n")
    );
  }
});

app.get("/status", (req, res) => {
  // Get status.json
  fs.readFile("./status.json", (err, data) => {
    if (err) {
      console.error(err);
      res.send("Error:\n" + err);
      return;
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.get("/freemem", (req, res) => {
  if (os.platform() === "win32") {
    exec("systeminfo", (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        res.send("Error:\n" + err);
        return;
      }
      // Find available memory
      const mem = stdout.match(/Available Physical Memory: (.*?)MB/);
      res.json(mem[1].trim() + "MiB");
    });
  } else {
    exec("free -m", (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        res.send("Error:\n" + err);
        return;
      }
      // Find available memory
      const mem = stdout.match(/Mem:\s+\d+\s+\d+\s+(\d+)/);
      res.json(mem[1].trim() + "MiB");
    });
  }
});

const cacheFilePath = "wifiSpeedCache.json";

app.get("/wifispeed", (req, res) => {
  fs.readFile(cacheFilePath, "utf8", (err, data) => {
    const now = new Date();
    if (!err) {
      const cache = JSON.parse(data);
      if (cache.timestamp && now - new Date(cache.timestamp) < 5 * 60 * 1000) {
        // Cache is less than 5 minutes old
        res.status(200).json(cache.data);
        return;
      }
    }
    exec(
      "speedtest --accept-license --accept-gdpr -f json-pretty",
      (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          res.send("Error:\n" + err);
          return;
        }
        const speed = JSON.parse(stdout);
        const result = {
          timestamp: speed.timestamp,
          download: (speed.download.bandwidth / 1e5).toFixed(2) + "Mbps",
          upload: (speed.upload.bandwidth / 1e5).toFixed(2) + "Mbps",
          ping: speed.ping.latency.toFixed(2) + "ms",
          net: speed.isp,
        };

        // Update cache
        fs.writeFile(
          cacheFilePath,
          JSON.stringify({ timestamp: now, data: result }),
          (err) => {
            if (err) {
              console.error(err);
            }
          }
        );

        // Return as content_type: application/json
        res.status(200).json(result);
      }
    );
  });
});

app.get("/currentregion", (req, res) => {
  // Open region.json
  fs.readFile("./region.json", (err, data) => {
    if (err) {
      console.error(err);
      res.send("Error:\n" + err);
      return;
    }
    res.json(JSON.parse(data).region);
  });
});

const weatherCacheFilePath = "weatherCache.json";

app.get("/weather", (req, res) => {
  fs.readFile(weatherCacheFilePath, "utf8", (err, data) => {
    const now = new Date();
    if (!err) {
      const cache = JSON.parse(data);
      if (cache.timestamp && now - new Date(cache.timestamp) < 15 * 60 * 1000) {
        // Cache is less than 5 minutes old
        res.status(200).json(cache.data);
        return;
      }
    }
    // Get the region
    fs.readFile("./region.json", (err, data) => {
      if (err) {
        console.error(err);
        res.send("Error:\n" + err);
        return;
      } else {
        // Get the weather
        axios
          .get(
            `http://api.weatherapi.com/v1/current.json?key=${
              process.env.WEATHER_API_KEY
            }&q=${JSON.parse(data).region}`
          )
          .then((response) => {
            const result = {
              condition: response.data.current.condition.text,
              temp: response.data.current.temp_c,
              is_day: response.data.current.is_day,
            };

            // Update cache
            fs.writeFile(
              weatherCacheFilePath,
              JSON.stringify({ timestamp: now, data: result }),
              (err) => {
                if (err) {
                  console.error(err);
                }
              }
            );

            res.status(200).json(result);
          })
          .catch((error) => {
            console.error(error);
            res.send("Error:\n" + error);
          });
      }
    });
  });
});

app.get("/processor", (req, res) => {
  let proc = os.cpus()[0].model;
  if (proc.includes("Intel")) {
    proc = proc.split("-")[0].trim();
  }
  res.json(proc);
});

app.get("/processortemp", (req, res) => {
  if (os.platform() === "win32") {
    exec(
      "wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature",
      (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          res.send("Error:\n" + err);
          return;
        }
        const temp = parseInt(
          stdout.split("\n")[1].trim().slice(0, -2) / 10 - 273.15
        );
        res.json(temp + "°C");
      }
    );
  } else {
    exec(
      "cat /sys/class/thermal/thermal_zone0/temp",
      (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          res.send("Error:\n" + err);
          return;
        }
        const temp = parseInt(stdout.trim()) / 1000;
        res.json(temp + "°C");
      }
    );
  }
});

app.get("/connecteddrives", (req, res) => {
  if (os.platform() === "win32") {
    exec("fsutil fsinfo drives", (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        res.send("Error:\n" + err);
        return;
      }
      const drives = stdout.split("Drives: ")[1].replace(
        "\\ ",
        `\\
`
      );
      res.json(drives.replace(" \r", "").split("\n").slice(0, -1));
    });
  } else {
    exec("lsblk -o NAME", (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        res.send("Error:\n" + err);
        return;
      }
      const drives = stdout.split("\n");
      drives.shift();
      res.json(drives);
    });
  }
});

app.get("/currentos", (req, res) => {
  // Work out name of OS, ie. Windows 11, Windows 10, Ubuntu 20.04, etc.
  if (os.platform() === "win32" && os.release() >= "10.0.22000") {
    res.json("Windows 11");
  } else if (os.platform() === "win32" && os.release() < "10.0.22000") {
    res.json("Windows 10");
  } else {
    res.json(os.type() + " " + os.release());
  }
});

app.get("/whatpeoplesay", (req, res) => {
  fs.readFile("./message.json", (err, data) => {
    if (err) {
      console.error(err);
      res.send("Error:\n" + err);
      return;
    }
    res.json(JSON.parse(data).message);
  });
});

app.post("/region", (req, res) => {
  if (authorise(req, res)) {
    try {
      const region = {
        region: req.headers.region,
      };
      fs.writeFile("./region.json", JSON.stringify(region), (err) => {
        if (err) {
          console.error(err);
          res.send("Error:\n" + err);
          return;
        }
        res.json("Region set to " + req.headers.region);
      });
    } catch (err) {
      res.status(400).json(err);
    }
  }
});

app.post("/status", (req, res) => {
  if (authorise(req, res)) {
    try {
      const status = {
        status: req.headers.status,
        updated: new Date(),
      };
      fs.writeFile("./status.json", JSON.stringify(status), (err) => {
        if (err) {
          console.error(err);
          res.status(400).send("Error:\n" + err);
          return;
        }
        res.json("Status set to " + req.headers.status);
      });
    } catch (err) {
      res.status(400).json(err);
    }
  }
});

const filter = new Filter();

app.post("/saysomething", (req, res) => {
  try {
    const messageContent = req.headers.message;

    if (filter.isProfane(messageContent)) {
      res.status(406).send("Inappropriate content detected in the message.");
      return;
    }

    const message = {
      message: messageContent,
    };

    fs.writeFile("./message.json", JSON.stringify(message), (err) => {
      if (err) {
        console.error(err);
        res.send("Error:\n" + err);
        return;
      }
      res.json("Message set to " + messageContent);
    });
  } catch (err) {
    res
      .status(400)
      .send(
        "Error setting message. Make sure the header 'message' is set. Err:\n",
        err
      );
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

function authorise(req, res) {
  if (!req.headers) {
    res.status(401).send("Unauthorized");
    return false;
  }
  console.log(req.headers);
  console.log(req.body);
  const authHeader = req.headers.authorization || req.headers.auth;
  if (
    authHeader &&
    authHeader.split(" ").length > 1 &&
    process.env.APP_KEYS.split(",").includes(authHeader.split(" ")[1])
  ) {
    return true;
  } else {
    console.log(authHeader);
    console.log(process.env.APP_KEYS.split(","));
    res.status(403).send("Forbidden");
    return false;
  }
}
