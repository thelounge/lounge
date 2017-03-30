"use strict";

const webpack = require("webpack");
const path = require("path");

// ********************
// Common configuration
// ********************

let config = {
	entry: {
		"js/bundle.js": path.resolve(__dirname, "client/js/lounge.js"),
		"js/bundle.vendor.js": [
			"handlebars/runtime",
			"jquery",
			"jquery-ui/ui/widgets/sortable",
			"mousetrap",
			"socket.io-client",
			"urijs",
		],
	},
	devtool: "source-map",
	output: {
		path: path.resolve(__dirname, "client"),
		filename: "[name]",
		publicPath: "/"
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				use: {
					loader: "webpack-remove-debug"
				}
			},
			{
				test: /\.js$/,
				include: [
					path.resolve(__dirname, "client"),
				],
				use: {
					loader: "babel-loader",
					options: {
						presets: [
							"es2015"
						]
					}
				}
			},
			{
				test: /\.tpl$/,
				include: [
					path.resolve(__dirname, "client/views"),
				],
				use: {
					loader: "handlebars-loader",
					options: {
						helperDirs: [
							path.resolve(__dirname, "client/js/libs/handlebars")
						],
						extensions: [
							".tpl"
						],
					}
				}
			},
		]
	},
	externals: {
		json3: "JSON", // socket.io uses json3.js, but we do not target any browsers that need it
	},
	plugins: [
		new webpack.optimize.CommonsChunkPlugin("js/bundle.vendor.js")
	]
};

// *********************************
// Production-specific configuration
// *********************************

if (process.env.NODE_ENV === "production") {
	config.plugins.push(new webpack.optimize.UglifyJsPlugin({
		comments: false
	}));
} else {
	console.log("Building in development mode, bundles will not be minified.");
}

module.exports = config;
