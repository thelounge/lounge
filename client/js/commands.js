"use strict";

// Taken from views/index.js

// This creates a version of `require()` in the context of the current
// directory, so we iterate over its content, which is a map statically built by
// Webpack.
// Second argument says it's recursive, third makes sure we only load javascript.
const commands = require.context("./commands/", true, /\.js$/);

module.exports = commands.keys().reduce((acc, path) => {
	// We are going to create nested properties on the accumulator object.
	let tmp = acc;

	// Split path by folders, and create a new property if necessary/
	// First 2 characters are "./"/
	// Last element in the array ends with `.tpl` and needs to be `require`d.
	path.substr(2).split("/").forEach((key) => {
		if (key.endsWith(".js")) {
			tmp[key.substr(0, key.length - 3)] = commands(path);
		} else {
			tmp[key] = tmp[key] || {};
		}

		tmp = tmp[key];
	});

	return acc;
}, {});
