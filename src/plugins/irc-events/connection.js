"use strict";

const _ = require("lodash");
const Msg = require("../../models/msg");
const Chan = require("../../models/chan");
const Helper = require("../../helper");

module.exports = function(irc, network) {
	const client = this;

	network.channels[0].pushMessage(client, new Msg({
		text: "Network created, connecting to " + network.host + ":" + network.port + "...",
	}), true);

	irc.on("registered", function() {
		if (network.irc.network.cap.enabled.length > 0) {
			network.channels[0].pushMessage(client, new Msg({
				text: "Enabled capabilities: " + network.irc.network.cap.enabled.join(", "),
			}), true);
		}

		// Always restore away message for this network
		if (network.awayMessage) {
			irc.raw("AWAY", network.awayMessage);
		// Only set generic away message if there are no clients attached
		} else if (client.awayMessage && _.size(client.attachedClients) === 0) {
			irc.raw("AWAY", client.awayMessage);
		}

		let delay = 1000;

		if (Array.isArray(network.commands)) {
			network.commands.forEach((cmd) => {
				setTimeout(function() {
					client.input({
						target: network.channels[0].id,
						text: cmd,
					});
				}, delay);
				delay += 1000;
			});
		}

		network.channels.forEach((chan) => {
			if (chan.type !== Chan.Type.CHANNEL) {
				return;
			}

			setTimeout(function() {
				network.irc.join(chan.name, chan.key);
			}, delay);
			delay += 1000;
		});
	});

	irc.on("socket connected", function() {
		network.prefixLookup = {};
		irc.network.options.PREFIX.forEach(function(mode) {
			network.prefixLookup[mode.mode] = mode.symbol;
		});

		network.channels[0].pushMessage(client, new Msg({
			text: "Connected to the network.",
		}), true);

		sendStatus();
	});

	irc.on("close", function() {
		network.channels[0].pushMessage(client, new Msg({
			text: "Disconnected from the network, and will not reconnect. Use /connect to reconnect again.",
		}), true);
	});

	let identSocketId;

	irc.on("raw socket connected", function(socket) {
		let ident = client.name || network.username;

		if (Helper.config.useHexIp) {
			ident = Helper.ip2hex(network.ip);
		}

		identSocketId = client.manager.identHandler.addSocket(socket, ident);
	});

	irc.on("socket close", function(error) {
		if (identSocketId > 0) {
			client.manager.identHandler.removeSocket(identSocketId);
			identSocketId = 0;
		}

		network.channels.forEach((chan) => {
			chan.state = Chan.State.PARTED;
		});

		if (error) {
			network.channels[0].pushMessage(client, new Msg({
				type: Msg.Type.ERROR,
				text: `Connection closed unexpectedly: ${error}`,
			}), true);
		}

		sendStatus();
	});

	if (Helper.config.debug.ircFramework) {
		irc.on("debug", function(message) {
			log.debug(`[${client.name} (${client.id}) on ${network.name} (${network.uuid}]`, message);
		});
	}

	if (Helper.config.debug.raw) {
		irc.on("raw", function(message) {
			network.channels[0].pushMessage(client, new Msg({
				from: message.from_server ? "«" : "»",
				self: !message.from_server,
				type: "raw",
				text: message.line,
			}), true);
		});
	}

	irc.on("socket error", function(err) {
		network.channels[0].pushMessage(client, new Msg({
			type: Msg.Type.ERROR,
			text: "Socket error: " + err,
		}), true);
	});

	irc.on("reconnecting", function(data) {
		network.channels[0].pushMessage(client, new Msg({
			text: "Disconnected from the network. Reconnecting in " + Math.round(data.wait / 1000) + " seconds… (Attempt " + data.attempt + " of " + data.max_retries + ")",
		}), true);
	});

	irc.on("ping timeout", function() {
		network.channels[0].pushMessage(client, new Msg({
			text: "Ping timeout, disconnecting…",
		}), true);
	});

	irc.on("server options", function(data) {
		if (network.serverOptions.PREFIX === data.options.PREFIX && network.serverOptions.NETWORK === data.options.NETWORK) {
			return;
		}

		network.prefixLookup = {};

		data.options.PREFIX.forEach((mode) => {
			network.prefixLookup[mode.mode] = mode.symbol;
		});

		network.serverOptions.PREFIX = data.options.PREFIX;
		network.serverOptions.NETWORK = data.options.NETWORK;

		client.emit("network_changed", {
			network: network.uuid,
			serverOptions: network.serverOptions,
		});
	});

	function sendStatus() {
		const status = network.getNetworkStatus();
		status.network = network.uuid;

		client.emit("network:status", status);
	}
};
