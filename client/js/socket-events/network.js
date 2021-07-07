"use strict";

import Vue from "vue";

import socket from "../socket";
import store from "../store";
import {switchToChannel} from "../router";

socket.on("network", function (data) {
	const network = data.networks[0];

	network.isJoinChannelShown = false;
	network.isCollapsed = false;
	network.channels.forEach(store.getters.initChannel);

	store.commit("networks", [...store.state.networks, network]);

	// Open last channel specified in `join`
	switchToChannel(network, network.channels[network.channels.length - 1]);
});

socket.on("network:options", function (data) {
	const network = store.getters.findNetwork(data.network);

	if (network) {
		network.serverOptions = data.serverOptions;
	}
});

socket.on("network:status", function (data) {
	const network = store.getters.findNetwork(data.network);

	if (!network) {
		return;
	}

	network.status.connected = data.connected;
	network.status.secure = data.secure;

	if (!data.connected) {
		network.channels.forEach((channel) => {
			channel.users = [];
			channel.state = 0;
		});
	}
});

socket.on("channel:state", function (data) {
	const channel = store.getters.findChannel(data.chan);

	if (channel) {
		channel.channel.state = data.state;
	}
});

socket.on("network:info", function (data) {
	const network = store.getters.findNetwork(data.uuid);

	if (!network) {
		return;
	}

	for (const key in data) {
		Vue.set(network, key, data[key]);
	}
});

socket.on("network:name", function (data) {
	const network = store.getters.findNetwork(data.uuid);
	network.name = network.channels[0].name = data.name;
});
