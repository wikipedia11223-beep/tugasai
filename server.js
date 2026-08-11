"use strict";

/*
=========================================================
 TUGASAI — BACKEND SERVER
 Cocok dengan:
 - index.html
 - style.css
 - script.js

 Fungsi:
 - Menjalankan server lokal
 - Menyediakan endpoint /api/chat
 - Menerima pesan dari frontend
 - Menyediakan health check
 - Menangani error
 - Siap dikembangkan ke API AI sungguhan

 CATATAN:
 API AI BELUM DIPASANG.
 Server ini adalah fondasi backend TugasAI.
=========================================================
*/


/* =====================================================
   1. IMPORT
===================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


/* =====================================================
   2. CONFIG
===================================================== */

const CONFIG = {

    host: "0.0.0.0",

    port:
        Number(process.env.PORT) || 3000,

    maxBodySize:
        2 * 1024 * 1024,

    maxMessageLength:
        10000,

    appName:
        "TugasAI",

    version:
        "1.0.0"

};


/* =====================================================
   3. MIME TYPES
===================================================== */

const MIME_TYPES = {

    ".html":
        "text/html; charset=utf-8",

    ".css":
        "text/css; charset=utf-8",

    ".js":
        "application/javascript; charset=utf-8",

    ".json":
        "application/json; charset=utf-8",

    ".png":
        "image/png",

    ".jpg":
        "image/jpeg",

    ".jpeg":
        "image/jpeg",

    ".webp":
        "image/webp",

    ".svg":
        "image/svg+xml",

    ".ico":
        "image/x-icon",

    ".txt":
        "text/plain; charset=utf-8"

};


/* =====================================================
   4. ROOT DIRECTORY
===================================================== */

const ROOT_DIR =
    __dirname;


/* =====================================================
   5. SECURITY HEADERS
===================================================== */

function setSecurityHeaders(res) {

    res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
    );

    res.setHeader(
        "X-Frame-Options",
        "SAMEORIGIN"
    );

    res.setHeader(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
    );

    res.setHeader(
        "X-XSS-Protection",
        "0"
    );

}


/* =====================================================
   6. CORS
===================================================== */

function setCorsHeaders(res) {

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

}


/* =====================================================
   7. JSON RESPONSE
===================================================== */

function sendJSON(
    res,
    statusCode,
    data
) {

    setSecurityHeaders(res);

    setCorsHeaders(res);

    res.statusCode =
        statusCode;

    res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );

    res.end(
        JSON.stringify(data)
    );

}


/* =====================================================
   8. TEXT RESPONSE
===================================================== */

function sendText(
    res,
    statusCode,
    text
) {

    setSecurityHeaders(res);

    setCorsHeaders(res);

    res.statusCode =
        statusCode;

    res.setHeader(
        "Content-Type",
        "text/plain; charset=utf-8"
    );

    res.end(text);

}


/* =====================================================
   9. REQUEST BODY
===================================================== */

function readRequestBody(req) {

    return new Promise(
        (resolve, reject) => {

            let body = "";

            let received =
                0;


            req.on(
                "data",
                chunk => {

                    received +=
                        chunk.length;


                    if (
                        received >
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


                    body +=
                        chunk.toString();

                }
            );


            req.on(
                "end",
                () => {

                    if (!body) {

                        resolve({});

                        return;

                    }


                    try {

                        const parsed =
                            JSON.parse(body);

                        resolve(parsed);

                    } catch (error) {

                        reject(
                            new Error(
                                "INVALID_JSON"
                            )
                        );

                    }

                }
            );


            req.on(
                "error",
                error => {

                    reject(error);

                }
            );

        }
    );

}


/* =====================================================
   10. REQUEST ID
===================================================== */

function createRequestId() {

    return crypto
        .randomBytes(8)
        .toString("hex");

}


/* =====================================================
   11. HEALTH CHECK
===================================================== */

function handleHealth(req, res) {

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

            timestamp:
                new Date().toISOString()

        }
    );

}


/* =====================================================
   12. API CHAT
===================================================== */

async function handleChat(
    req,
    res
) {

    const requestId =
        createRequestId();


    let body;


    try {

        body =
            await readRequestBody(req);

    } catch (error) {

        if (
            error.message ===
            "REQUEST_TOO_LARGE"
        ) {

            sendJSON(
                res,
                413,
                {

                    ok: false,

                    error:
                        "Ukuran request terlalu besar.",

                    requestId

                }
            );

            return;

        }


        if (
            error.message ===
            "INVALID_JSON"
        ) {

            sendJSON(
                res,
                400,
                {

                    ok: false,

                    error:
                        "Format JSON tidak valid.",

                    requestId

                }
            );

            return;

        }


        sendJSON(
            res,
            400,
            {

                ok: false,

                error:
                    "Request tidak dapat dibaca.",

                requestId

            }
        );

        return;

    }


    /*
        Frontend nanti dapat mengirim:

        {
            "message": "Halo",
            "conversationId": "...",
            "model": "default"
        }
    */


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
                    "Pesan tidak boleh kosong.",

                requestId

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
                    `Pesan maksimal ${CONFIG.maxMessageLength} karakter.`,

                requestId

            }
        );

        return;

    }


    const conversationId =
        typeof body.conversationId === "string"
            ? body.conversationId
            : null;


    const model =
        typeof body.model === "string"
            ? body.model
            : "default";


    console.log(
        `[CHAT ${requestId}]`,
        {
            conversationId,
            model,
            messageLength:
                message.length
        }
    );


    /*
    =====================================================
     TEMPORARY RESPONSE

     Ini masih respons backend sementara.
     Belum menghubungkan API AI sungguhan.
    =====================================================
    */


    const reply =
        createServerDemoResponse(
            message
        );


    sendJSON(
        res,
        200,
        {

            ok: true,

            requestId,

            conversationId,

            model,

            message: {

                role:
                    "assistant",

                content:
                    reply

            }

        }
    );

}


/* =====================================================
   13. SERVER DEMO AI
===================================================== */

function createServerDemoResponse(
    message
) {

    const text =
        message.toLowerCase();


    if (
        text.includes("halo") ||
        text.includes("hai") ||
        text.includes("hello")
    ) {

        return (
            "Halo! Saya TugasAI. " +
            "Backend TugasAI sudah menerima pesan kamu."
        );

    }


    if (
        text.includes("api")
    ) {

        return (
            "API adalah penghubung antara aplikasi " +
            "dengan layanan atau server lain. " +
            "Backend TugasAI nantinya akan menjadi penghubung " +
            "antara website dan API AI."
        );

    }


    if (
        text.includes("server")
    ) {

        return (
            "Server TugasAI sedang berjalan. " +
            "Saat ini backend masih menggunakan respons demo " +
            "dan belum terhubung ke model AI sungguhan."
        );

    }


    return (
        "Pesan kamu sudah berhasil diterima oleh " +
        "server TugasAI:\n\n" +
        `"${message}"\n\n` +
        "Backend sudah siap dikembangkan ke tahap " +
        "integrasi AI sungguhan."
    );

}


/* =====================================================
   14. STATIC FILE SERVER
===================================================== */

function serveStaticFile(
    req,
    res
) {

    let requestedPath =
        decodeURIComponent(
            new URL(
                req.url,
                `http://${req.headers.host || "localhost"}`
            ).pathname
        );


    if (
        requestedPath === "/"
    ) {

        requestedPath =
            "/index.html";

    }


    /*
        Mencegah path traversal seperti:

        ../../file
    */

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

        sendText(
            res,
            403,
            "Forbidden"
        );

        return;

    }


    fs.stat(
        filePath,
        (error, stats) => {

            if (error) {

                sendText(
                    res,
                    404,
                    "File tidak ditemukan."
                );

                return;

            }


            if (!stats.isFile()) {

                sendText(
                    res,
                    404,
                    "File tidak ditemukan."
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


            setSecurityHeaders(res);

            setCorsHeaders(res);


            res.statusCode =
                200;


            res.setHeader(
                "Content-Type",
                mime
            );


            const stream =
                fs.createReadStream(
                    filePath
                );


            stream.on(
                "error",
                () => {

                    if (!res.headersSent) {

                        sendText(
                            res,
                            500,
                            "Gagal membaca file."
                        );

                    } else {

                        res.destroy();

                    }

                }
            );


            stream.pipe(res);

        }
    );

}


/* =====================================================
   15. MAIN REQUEST HANDLER
===================================================== */

const server =
    http.createServer(
        async (req, res) => {

            try {

                setSecurityHeaders(res);

                setCorsHeaders(res);


                const method =
                    req.method || "GET";


                const url =
                    new URL(
                        req.url,
                        `http://${req.headers.host || "localhost"}`
                    );


                const pathname =
                    url.pathname;


                /*
                -----------------------------------------
                 OPTIONS / CORS
                -----------------------------------------
                */

                if (
                    method === "OPTIONS"
                ) {

                    res.statusCode =
                        204;

                    res.end();

                    return;

                }


                /*
                -----------------------------------------
                 HEALTH
                -----------------------------------------
                */

                if (
                    method === "GET" &&
                    pathname === "/api/health"
                ) {

                    handleHealth(
                        req,
                        res
                    );

                    return;

                }


                /*
                -----------------------------------------
                 CHAT API
                -----------------------------------------
                */

                if (
                    method === "POST" &&
                    pathname === "/api/chat"
                ) {

                    await handleChat(
                        req,
                        res
                    );

                    return;

                }


                /*
                -----------------------------------------
                 API INFO
                -----------------------------------------
                */

                if (
                    method === "GET" &&
                    pathname === "/api"
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


                /*
                -----------------------------------------
                 STATIC WEBSITE
                -----------------------------------------
                */

                if (
                    method === "GET"
                ) {

                    serveStaticFile(
                        req,
                        res
                    );

                    return;

                }


                /*
                -----------------------------------------
                 METHOD NOT ALLOWED
                -----------------------------------------
                */

                res.setHeader(
                    "Allow",
                    "GET, POST, OPTIONS"
                );


                sendJSON(
                    res,
                    405,
                    {

                        ok: false,

                        error:
                            "Method tidak diizinkan."

                    }
                );

            } catch (error) {

                console.error(
                    "SERVER ERROR:",
                    error
                );


                if (
                    !res.headersSent
                ) {

                    sendJSON(
                        res,
                        500,
                        {

                            ok: false,

                            error:
                                "Terjadi kesalahan pada server."

                        }
                    );

                } else {

                    res.destroy();

                }

            }

        }
    );


/* =====================================================
   16. SERVER ERROR
===================================================== */

server.on(
    "error",
    error => {

        if (
            error.code ===
            "EADDRINUSE"
        ) {

            console.error(
                `Port ${CONFIG.port} sedang digunakan.`
            );

        } else {

            console.error(
                "Server error:",
                error
            );

        }

    }
);


/* =====================================================
   17. START SERVER
===================================================== */

server.listen(
    CONFIG.port,
    CONFIG.host,
    () => {

        console.log("");
        console.log(
            "=========================================="
        );
        console.log(
            "        TUGASAI SERVER ONLINE"
        );
        console.log(
            "=========================================="
        );

        console.log(
            `App     : ${CONFIG.appName}`
        );

        console.log(
            `Version : ${CONFIG.version}`
        );

        console.log(
            `Port    : ${CONFIG.port}`
        );

        console.log(
            `Local   : http://localhost:${CONFIG.port}`
        );

        console.log(
            `Health  : http://localhost:${CONFIG.port}/api/health`
        );

        console.log(
            "=========================================="
        );

        console.log("");

    }
);


/* =====================================================
   18. GRACEFUL SHUTDOWN
===================================================== */

function shutdown(
    signal
) {

    console.log(
        `\n${signal} diterima. Menutup server...`
    );


    server.close(
        () => {

            console.log(
                "Server TugasAI berhasil dihentikan."
            );

            process.exit(0);

        }
    );

}


process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);


process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);