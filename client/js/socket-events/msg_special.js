"use strict";

import socket from "../socket";
import store from "../store";
import {switchToChannel} from "../router";

socket.on("msg:special", function (data) {
	const channel = store.getters.findChannel(data.chan);
	channel.channel.data = data.data;
	switchToChannel(channel.network, channel.channel);
});
