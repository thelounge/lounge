"use strict";

import socket from "../socket";
import {switchToChannel, navigate} from "../router";
import store from "../store";

socket.on("quit", function (data) {
	// If we're in a channel, and it's on the network that is being removed,
	// then open another channel window
	const isCurrentNetworkBeingRemoved =
		store.state.activeChannel && store.state.activeChannel.network.uuid === data.network;

	store.commit("removeNetwork", data.network);

	if (!isCurrentNetworkBeingRemoved) {
		return;
	}

	if (store.state.networks.length > 0) {
		switchToChannel(store.state.networks[0], store.state.networks[0].channels[0]);
	} else {
		navigate("Connect");
	}
});
