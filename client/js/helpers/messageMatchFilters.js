"use strict";

export default (message, filters) => {
	// If a message was blank or we have no filters, don't hide the preview
	if (!message || !filters) {
		return false;
	}

	// Ensure we don't have empty strings in the list filters
	const filterTokens = filters
		.split(",")
		.map((filter) => filter.trim().toLowerCase())
		.filter((filter) => filter.length > 0);

	const messageText = message.toLowerCase();

	return filterTokens.some((filter) => {
		return messageText.includes(filter);
	});
};
