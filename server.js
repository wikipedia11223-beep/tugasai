"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const CONFIG = {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 3000,
    appName: "TugasAI",
    version: "2.0.0",
    maxBodySize: 2 * 1024 * 1024,
    maxMessageLength: 10000,

    openRouterUrl:
        "https://openrouter.ai/api/v1/chat/completions",

    model:
        process.env.OPENROUTER_MODEL ||
        "openai/gpt-5.6"
};

const ROOT_DIR = __dirname;

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};


/* =====================================================
   RESPONSE
===================================================== */

function sendJSON(res, status, data) {

    res.statusCode = status;

    res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    res.end(JSON.stringify(data));
}


/* =====================================================
   BODY
===================================================== */

function readBody(req) {

    return new Promise((resolve, reject) => {

        let body = "";
        let size = 0;

        req.on("data", chunk => {

            size += chunk.length;

            if (
                size >
                CONFIG.maxBodySize
            ) {

                reject(
                    new Error(
                        "REQUEST_TOO_LARGE"
                    )
                );

                req.destroy();

                return;
            }

            body += chunk.toString();
        });

        req.on("end", () => {

            if (!body) {

                resolve({});

                return;
            }

            try {

                resolve(JSON.parse(body));

            } catch {

                reject(
                    new Error(
                        "INVALID_JSON"
                    )
                );

            }
        });

        req.on("error", reject);
    });
}


/* =====================================================
   OPENROUTER
===================================================== */

async function askOpenRouter(message) {

    const apiKey =
        process.env.OPENROUTER_API_KEY;

    if (!apiKey) {

        throw new Error(
            "OPENROUTER_API_KEY belum dipasang di Render."
        );
    }


    const response =
        await fetch(
            CONFIG.openRouterUrl,
            {

                method: "POST",

                headers: {

                    "Authorization":
                        `Bearer ${apiKey}`,

                    "Content-Type":
                        "application/json",

                    "HTTP-Referer":
                        "https://tugasai.onrender.com",

                    "X-Title":
                        "TugasAI"

                },

                body:
                    JSON.stringify({

                        model:
                            CONFIG.model,

                        max_tokens:
                            1000,

                        messages: [

                            {

                                role:
                                    "system",

                                content:
                                    "Kamu adalah TugasAI, asisten AI berbahasa Indonesia. Jawab dengan jelas, akurat, dan membantu."

                            },

                            {

                                role:
                                    "user",

                                content:
                                    message

                            }

                        ]

                    })

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "OpenRouter error:",
            data
        );

        throw new Error(
            data?.error?.message ||
            "OpenRouter gagal memproses permintaan."
        );
    }


    const reply =
        data?.choices?.[0]?.message?.content;


    if (!reply) {

        throw new Error(
            "OpenRouter tidak mengembalikan jawaban."
        );
    }


    return reply;
}


/* =====================================================
   CHAT
===================================================== */

async function handleChat(req, res) {

    try {

        const body =
            await readBody(req);


        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";


        if (!message) {

            sendJSON(
                res,
                400,
                {
                    ok: false,
                    error:
                        "Pesan tidak boleh kosong."
                }
            );

            return;
        }


        if (
            message.length >
            CONFIG.maxMessageLength
        ) {

            sendJSON(
                res,
                400,
                {
                    ok: false,
                    error:
                        `Pesan maksimal ${CONFIG.maxMessageLength} karakter.`
                }
            );

            return;
        }


        console.log(
            "TugasAI menerima pesan:",
            message.slice(0, 100)
        );


        const reply =
            await askOpenRouter(message);


        sendJSON(
            res,
            200,
            {

                ok: true,

                model:
                    CONFIG.model,

                message: {

                    role:
                        "assistant",

                    content:
                        reply

                }

            }
        );


    } catch (error) {

        console.error(
            "CHAT ERROR:",
            error
        );


        sendJSON(
            res,
            500,
            {

                ok: false,

                error:
                    error.message ||
                    "Terjadi kesalahan pada server."

            }
        );
    }
}


/* =====================================================
   STATIC FILES
===================================================== */

function serveStatic(req, res) {

    let requestedPath;

    try {

        requestedPath =
            decodeURIComponent(
                new URL(
                    req.url,
                    `http://${req.headers.host || "localhost"}`
                ).pathname
            );

    } catch {

        sendJSON(
            res,
            400,
            {
                ok: false,
                error: "URL tidak valid."
            }
        );

        return;
    }


    if (
        requestedPath === "/"
    ) {

        requestedPath =
            "/index.html";
    }


    const safePath =
        path.normalize(
            requestedPath
        );


    const filePath =
        path.join(
            ROOT_DIR,
            safePath
        );


    if (
        !filePath.startsWith(
            ROOT_DIR
        )
    ) {

        sendJSON(
            res,
            403,
            {
                ok: false,
                error: "Forbidden"
            }
        );

        return;
    }


    fs.stat(
        filePath,
        (error, stats) => {

            if (
                error ||
                !stats.isFile()
            ) {

                sendJSON(
                    res,
                    404,
                    {
                        ok: false,
                        error:
                            "File tidak ditemukan."
                    }
                );

                return;
            }


            const extension =
                path.extname(
                    filePath
                ).toLowerCase();


            const mime =
                MIME_TYPES[extension] ||
                "application/octet-stream";


            res.statusCode = 200;

            res.setHeader(
                "Content-Type",
                mime
            );


            fs.createReadStream(
                filePath
            ).pipe(res);
        }
    );
}


/* =====================================================
   SERVER
===================================================== */

const server =
    http.createServer(
        async (req, res) => {

            if (
                req.method === "OPTIONS"
            ) {

                res.statusCode = 204;

                res.end();

                return;
            }


            const url =
                new URL(
                    req.url,
                    `http://${req.headers.host || "localhost"}`
                );


            const pathname =
                url.pathname;


            if (
                req.method === "GET" &&
                pathname === "/api/health"
            ) {

                sendJSON(
                    res,
                    200,
                    {

                        ok: true,

                        app:
                            CONFIG.appName,

                        version:
                            CONFIG.version,

                        status:
                            "online",

                        ai:
                            Boolean(
                                process.env.OPENROUTER_API_KEY
                            )

                    }
                );

                return;
            }


            if (
                req.method === "POST" &&
                pathname === "/api/chat"
            ) {

                await handleChat(
                    req,
                    res
                );

                return;
            }


            if (
                req.method === "GET" &&
                pathname === "/api"
            ) {

                sendJSON(
                    res,
                    200,
                    {

                        ok: true,

                        app:
                            CONFIG.appName,

                        endpoints: {

                            health:
                                "GET /api/health",

                            chat:
                                "POST /api/chat"

                        }

                    }
                );

                return;
            }


            if (
                req.method === "GET"
            ) {

                serveStatic(
                    req,
                    res
                );

                return;
            }


            sendJSON(
                res,
                405,
                {

                    ok: false,

                    error:
                        "Method tidak diizinkan."

                }
            );
        }
    );


server.listen(
    CONFIG.port,
    CONFIG.host,
    () => {

        console.log(
            `${CONFIG.appName} berjalan di port ${CONFIG.port}`
        );

    }
);
