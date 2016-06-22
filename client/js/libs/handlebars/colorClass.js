"use strict";

Handlebars.registerHelper(
	// Generates a string from "color-1" to "color-32" based on an input string
	"colorClass", function(str) {
		var hash = 0;
		for (var i = 0; i < str.length; i++) {
			hash += str.charCodeAt(i);
		}

		return "color-" + (1 + hash % 32);
	}
);
