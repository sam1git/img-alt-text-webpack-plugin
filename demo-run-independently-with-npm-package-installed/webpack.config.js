require('dotenv').config();
const path = require("path");
const { merge } = require("webpack-merge");
const HtmlBundlerWebpackPlugin = require('html-bundler-webpack-plugin');
const ImgAltTextPlugin = require("img-alt-text-webpack-plugin");

const COMMON_CONFIG = {
    module: {
        rules: [
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                type: "asset/resource",     
            },
            {
                test: /\.css$/i,
                use: [
                    'css-loader'
                ],
            }
        ]
    },
    plugins: [
        new HtmlBundlerWebpackPlugin({
            entry: "./src/templates/",
        }),
        new ImgAltTextPlugin({
            key: process.env.GEMINI_API_KEY,
            jsInject: {
                observerJS: true,
                jsName: 'imageObserver',    
            }
        })
    ],
};

const PROD_CONFIG = {
    output: {
        path: path.resolve(__dirname, 'prodBuild'),
        filename: '[name].[hash].js',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.js$/i,
                exclude: [/node_modules/],
                use: {
                    loader: 'babel-loader',
                },
            },
        ]
    }
};

const DEV_CONFIG = {
    watch: true, // rebuilds bundle on any change of the project files
    output: {
        path: path.resolve(__dirname, 'devBuild'),
        clean: true,
    },
    devServer: {
        static: path.resolve(__dirname, 'devBuild'),
        watchFiles: {
            paths: ['src/**/*.*'],
            options: {
                usePolling: true,
            },
        }
    }
};

module.exports = (env, argv) => {
    if (argv.mode === 'production') {
        return merge(COMMON_CONFIG, PROD_CONFIG);
    } else {
        return merge(COMMON_CONFIG, DEV_CONFIG);
    }
};