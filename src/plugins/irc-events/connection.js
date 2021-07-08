"use strict";

const _ = require("lodash");
const log = require("../../log");
const Msg = require("../../models/msg");
const Chan = require("../../models/chan");
const Helper = require("../../helper");

module.exports = function (irc, network) {
	const client = this;

	network.channels[0].pushMessage(
		client,
		new Msg({
			text: "Network created, connecting to " + network.host + ":" + network.port + "...",
		}),
		true
	);

	irc.on("registered", function () {
		if (network.irc.network.cap.enabled.length > 0) {
			network.channels[0].pushMessage(
				client,
				new Msg({
					text: "Enabled capabilities: " + network.irc.network.cap.enabled.join(", "),
				}),
				true
			);
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
				setTimeout(function () {
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

			setTimeout(function () {
				network.irc.join(chan.name, chan.key);
			}, delay);
			delay += 1000;
		});
	});

	irc.on("socket connected", function () {
		if (irc.network.options.PREFIX) {
			network.serverOptions.PREFIX.update(irc.network.options.PREFIX);
		}

		network.channels[0].pushMessage(
			client,
			new Msg({
				text: "Connected to the network.",
			}),
			true
		);

		sendStatus();
	});

	irc.on("close", function () {
		network.channels[0].pushMessage(
			client,
			new Msg({
				text:
					"Disconnected from the network, and will not reconnect. Use /connect to reconnect again.",
			}),
			true
		);
	});

	let identSocketId;

	irc.on("raw socket connected", function (socket) {
		let ident = client.name || network.username;

		if (Helper.config.useHexIp) {
			ident = Helper.ip2hex(client.config.browser.ip);
		}

		identSocketId = client.manager.identHandler.addSocket(socket, ident);
	});

	irc.on("socket close", function (error) {
		if (identSocketId > 0) {
			client.manager.identHandler.removeSocket(identSocketId);
			identSocketId = 0;
		}

		network.channels.forEach((chan) => {
			chan.users = new Map();
			chan.state = Chan.State.PARTED;
		});

		if (error) {
			network.channels[0].pushMessage(
				client,
				new Msg({
					type: Msg.Type.ERROR,
					text: `Connection closed unexpectedly: ${error}`,
				}),
				true
			);
		}

		if (network.keepNick) {
			// We disconnected without getting our original nick back yet, just set it back locally
			irc.options.nick = irc.user.nick = network.keepNick;

			network.setNick(network.keepNick);
			network.keepNick = null;

			client.emit("nick", {
				network: network.uuid,
				nick: network.nick,
			});
		}

		sendStatus();
	});

	if (Helper.config.debug.ircFramework) {
		irc.on("debug", function (message) {
			log.debug(
				`[${client.name} (${client.id}) on ${network.name} (${network.uuid}]`,
				message
			);
		});
	}

	if (Helper.config.debug.raw) {
		irc.on("raw", function (message) {
			network.channels[0].pushMessage(
				client,
				new Msg({
					self: !message.from_server,
					type: Msg.Type.RAW,
					text: message.line,
				}),
				true
			);
		});
	}

	irc.on("socket error", function (err) {
		network.channels[0].pushMessage(
			client,
			new Msg({
				type: Msg.Type.ERROR,
				text: "Socket error: " + err,
			}),
			true
		);
	});

	irc.on("reconnecting", function (data) {
		network.channels[0].pushMessage(
			client,
			new Msg({
				text: `Disconnected from the network. Reconnecting in ${Math.round(
					data.wait / 1000
				)} seconds… (Attempt ${data.attempt})`,
			}),
			true
		);
	});

	irc.on("ping timeout", function () {
		network.channels[0].pushMessage(
			client,
			new Msg({
				text: "Ping timeout, disconnecting…",
			}),
			true
		);
	});

	irc.on("server options", function (data) {
		network.serverOptions.PREFIX.update(data.options.PREFIX);

		if (data.options.CHANTYPES) {
			network.serverOptions.CHANTYPES = data.options.CHANTYPES;
		}

		network.serverOptions.NETWORK = data.options.NETWORK;

		client.emit("network:options", {
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
