# `<img>` alt text webpack plugin

## Overview

A Webpack plugin that automatically adds alt text to <img> elements in HTML output and injects JavaScript to fetch alt text for dynamically loaded images, enhancing accessibility and SEO.

## Features

- Automatically sets the `alt` attribute for static `<img>` elements.
- Supports dynamic images by fetching `alt` text when the image loads.
- Easy integration with existing Webpack projects.
- Set up with Google Gemini API for generating alt text.

## Usage

### Installation

```bash
npm install img-alt-txt-webpack-plugin -D
```
### Set up webpack config

```
const ImgAltTextWebpackPlugin = require("img-alt-txt-webpack-plugin");

plugins: [
    new ImgAltTextPlugin({
        key: process.env.GEMINI_API_KEY,    // provide your gemini key
        jsInject: {
            observerJS: true,               // inject script for dynamically loaded images
            jsName: 'imageObserver',        // set name for emitted JS file
        }
    })
],
```

### Set up host server

```
// server.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { GoogleGenerativeAI } = require("@google/generative-ai");


// ================ set-up gemini ====================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// --------------- create similar middleware function -----------
async function getAltText(req, res, next) {
    // resolve filepath from query parameter
    const filepath = path.resolve(__dirname, `./fromServer/${req.query.file}`);

    // generate alt text if file is found
    if (fs.existsSync(filepath)) {
        const file = fs.readFileSync(filepath);
        // standard prompt to generating alt text
        const prompt = "Generate alt text for this image that can be inserted in img html element. Keep it concise."
        const imageParts = {
            inlineData: {
                data: Buffer.from(file).toString("base64"),
                mimeType: "image/png"
            },
        };
        const result = await model.generateContent([prompt, imageParts]);
        const response = await result.response;
        // add alt text generated to response
        res.altText = response.text();
    } else {
        // alt text does not exist
        res.altText = "alt text does not exist for this image";
    }
    next();
}



// ================ express server ====================
const app = express();
const server = http.createServer(app);

// using middleware to intercept alt text generation
app.get('/alttext', getAltText, (req, res) => {
    res.send(res.altText);
});

if (process.env.MODE === 'production') {
    app.use(express.static(path.join(__dirname, 'prodBuild')));
} else {
    app.use(express.static(path.join(__dirname, 'devBuild')));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
```