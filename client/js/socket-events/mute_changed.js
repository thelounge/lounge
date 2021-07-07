import socket from "../socket";
import store from "../store";

socket.on("mute:changed", (response) => {
	const {target, status} = response;
	const {channel, network} = store.getters.findChannel(target);

	if (channel.type === "lobby") {
		for (const chan of network.channels) {
			chan.muted = status;
		}
	} else {
		channel.muted = status;
	}
});
