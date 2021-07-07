"use strict";

import socket from "../socket";
import store from "../store";
import {switchToChannel} from "../router";

socket.on("join", function (data) {
	store.getters.initChannel(data.chan);

	const network = store.getters.findNetwork(data.network);

	if (!network) {
		return;
	}

	network.channels.splice(data.index || -1, 0, data.chan);

	// Queries do not automatically focus, unless the user did a whois
	if (data.chan.type === "query" && !data.shouldOpen) {
		return;
	}

	const channel = store.getters.findChannel(data.chan.id);

	switchToChannel(channel.network, channel.channel);
});
