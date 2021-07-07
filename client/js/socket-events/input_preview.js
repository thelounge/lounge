"use strict";

import socket from "../socket";
import store from "../store";
import {findLinks} from "../helpers/ircmessageparser/findLinks";

socket.on("input:preview", function (data) {
	const {channel} = store.getters.findChannel(data.target);
	const currentLinks = channel.pendingMessagePreviews.map((obj) => obj.link);

	if (currentLinks.includes(data.preview.link)) {
		return;
	}

	const links = findLinks(channel.pendingMessage).map((obj) => obj.link);

	channel.pendingMessagePreviews.push(data.preview);
	channel.pendingMessagePreviews.sort((a, b) => links.indexOf(a.link) - links.indexOf(b.link));
});
