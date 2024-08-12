// server.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// google gemini-1.5-flash based alt text generator middleware
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

async function getAltText(req, res, next) {
    // resolve filepath
    const filepath = path.resolve(__dirname, `./fromServer/${req.query.file}`);

    // generate alt text if file is found
    if (fs.existsSync(filepath)) {
        const file = fs.readFileSync(filepath);
        // standard prompt to generate alt text
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
//


// ================ express server ====================
const app = express();
const server = http.createServer(app);

// serving alttext route
app.get('/alttext', getAltText, (req, res) => {
    res.send(res.altText);
});

// Serve static files
if (process.env.MODE === 'production') {
    app.use(express.static(path.join(__dirname, 'prodBuild')));
} else {
    app.use(express.static(path.join(__dirname, 'devBuild')));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});