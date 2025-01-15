const path = require("path");
const prependFile = require("prepend-file");

const userScriptHeader = `// ==UserScript==
// @name         Znanija Solver
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Solves Znanija questions
// @author       scar17off
// @match        https://znanija.com/*
// @icon         https://znanija.com/favicon.ico
// @grant        none
// ==/UserScript==

`;

module.exports = {
    mode: "production",
    entry: "./src/index.js",
    output: {
        filename: "znanija-solver.user.js",
        path: path.resolve(__dirname, "./")
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js']
    },
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('PrependUserScriptHeader', compilation => {
                    prependFile(path.resolve(__dirname, "./znanija-solver.user.js"), userScriptHeader, function (err) {
                        if (err) {
                            console.error("Failed to prepend UserScript header:", err);
                        }
                    });
                });
            }
        }
    ]
};