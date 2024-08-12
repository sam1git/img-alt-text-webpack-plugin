const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Compilation } = require("webpack");
const { GoogleGenerativeAI } = require("@google/generative-ai");

class ImgAltTextPlugin {
    constructor(options = {}) {
        this.options = options;
    }

    apply(compiler) {

        const pluginName = "ImgAltTextPlugin";

        // observerJS set to true implied output JS file
        // jsName sets name of output JS file
        // JS file fetches alt text for dynamically loaded images 
        const { jsName, observerJS } = this.options.jsInject;
        if (observerJS) {
            compiler.hooks.entryOption.tap('myPlugin', (context, entry) => {
                const JSfilepath = path.resolve(__dirname, 'src', 'worker.js');
                const absolutePath = path.resolve(context, JSfilepath);

                if (typeof entry === 'object' && !Array.isArray(entry)) {
                    // If entry is an object, add a new entry
                    entry[jsName] = {
                        import: [absolutePath],
                    };
                } else {
                    // If entry is an array or any other type, convert to an object and add the new entry
                    entry = {
                        ...entry,
                        [jsName]: {
                            import: [absolutePath],
                        }
                    };
                }
            });
        }

        // for adding alt text to every img element in output html files
        compiler.hooks.compilation.tap(pluginName, (compilation) => {
            // process assets before emit event
            compilation.hooks.processAssets.tapAsync({
                name: pluginName,
                stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                additionalAssets: true,
            },
                async (assets, callback) => {
                    // find JS filename if script tags needs to be injected in output html file
                    const matchingKey = Object.keys(assets).find(key => key.toLowerCase().includes(jsName.toLowerCase()));

                    // loop through each output asset to operate on html files
                    let keysArray = Object.keys(assets);
                    for (let i=0; i < keysArray.length; i++) {
                        let filename = keysArray[i];
                        if (filename.endsWith('.html')) {
                            const asset = compilation.assets[filename];
                            const originalSource = asset.source();
                
                            // update html with <img> elements altered to have alt attribute set
                            const updatedSource = await this.processContent(originalSource, assets, matchingKey, observerJS);
                            compilation.assets[filename] = {
                                source: () => updatedSource,
                                size: () => updatedSource.length
                            };
                        }
                    }
                    // signal work completion to webpack
                    callback();
                }
            );
        });
    }

    async processContent(content, assets, scriptFilename, scriptInjectionFlag) {
        // create dom from passed file content
        const dom = new JSDOM(content);
        const document = dom.window.document;

        // injecting script tag into output html file
        if (scriptInjectionFlag) {
            var script = document.createElement('script');
            script.src = `${scriptFilename}`; 
            script.type = 'text/javascript';
            document.body.appendChild(script);    
        }

        // operate on all <img> elements in the content
        let images = document.querySelectorAll('img');
        images = Array.from(images);
        for (let i = 0; i < images.length; i++) {
            let img = images[i];
            let src = img.getAttribute('src');
            if (src) {
                const altText = img.getAttribute('alt');
                // if alt text is not set or is just space characters
                if (!altText || /^\s*$/.test(altText)) {
                    let source = assets[src].source();
                    // generate lat text passing the image
                    let altText = await this.getAltText(source);
                    // set alt attribute
                    img.setAttribute('alt', altText);
                }
            }
        }

        return document.documentElement.outerHTML;
    }

    async getAltText(source) {
        // get gemini key and prompt from options passed to the plugin
        const { key, textPrompt = "Generate alt text for this image that can be inserted in img html element. Keep it concise." } = this.options;
        // get google genAI model
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // create buffer from image source if not already buffer and then
        // create base64 string from buffer
        if (Buffer.isBuffer(source)) {
            source = source.toString("base64");
        } else {
            source = Buffer.from(source, 'utf-8').toString("base64")
        }

        // object passed to genAI model representing image information
        const imageParts = {
            inlineData: {
                data: source,
                mimeType: "image/png"
            },
        };
        // get alt text back from gemini
        const result = await model.generateContent([textPrompt, imageParts]);
        const response = await result.response;
        const text = response.text();

        // return alt text
        return text;
    }

}

module.exports = ImgAltTextPlugin;