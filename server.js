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
        "openai/gpt-5.6",

    appUrl:
        process.env.APP_URL ||
        "https://tugasai-production.up.railway.app"
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

    if (
        typeof apiKey !== "string" ||
        !apiKey.trim()
    ) {

        throw new Error(
            "OPENROUTER_API_KEY belum tersedia di Railway Variables."
        );
    }


    const response =
        await fetch(
            CONFIG.openRouterUrl,
            {

                method: "POST",

                headers: {

                    "Authorization":
                        `Bearer ${apiKey.trim()}`,

                    "Content-Type":
                        "application/json",

                    "HTTP-Referer":
                        CONFIG.appUrl,

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
