var _ = require("lodash");
var identd = require("../../identd");
var Msg = require("../../models/msg");

module.exports = function(irc, network) {
	var client = this;
	var identHandler = this.manager.identHandler;

	network.channels[0].pushMessage(client, new Msg({
		text: "Network created, connecting to " + network.host + ":" + network.port + "..."
	}));

	irc.on("registered", function() {
		if (network.irc.network.cap.enabled.length > 0) {
			network.channels[0].pushMessage(client, new Msg({
				text: "Enabled capabilities: " + network.irc.network.cap.enabled.join(", ")
			}));
		}

		var delay = 1000;
		var commands = network.commands;
		if (Array.isArray(commands)) {
			commands.forEach(function(cmd) {
				setTimeout(function() {
					client.input({
						target: network.channels[0].id,
						text: cmd
					});
				}, delay);
				delay += 1000;
			});
		}

		network.channels.forEach(function(chan) {
			setTimeout(function() {
				network.irc.join(chan.name);
			}, delay);
			delay += 100;
		});
	});

	irc.on("socket connected", function() {
		network.channels[0].pushMessage(client, new Msg({
			text: "Connected to the network."
		}));
	});

	irc.on("close", function() {
		network.channels[0].pushMessage(client, new Msg({
			text: "Disconnected from the network, and will not reconnect."
		}));
	});

	if (identd.isEnabled()) {
		irc.on("socket connected", function() {
			identd.hook(irc.connection.socket, client.name || network.username);
		});
	}

	if (identHandler) {
		irc.on("socket connected", function() {
			identHandler.addSocket(irc.connection.socket, client.name || network.username);
			identHandler.refresh();
		});

		irc.on("socket close", function() {
			identHandler.removeSocket(irc.connection.socket);
			identHandler.refresh();
		});
	}

	irc.on("socket error", function(err) {
		log.debug("IRC socket error", err);
		network.channels[0].pushMessage(client, new Msg({
			type: Msg.Type.ERROR,
			text: "Socket error: " + err
		}));
	});

	irc.on("reconnecting", function() {
		network.channels[0].pushMessage(client, new Msg({
			text: "Disconnected from the network. Reconnecting..."
		}));
	});

	irc.on("ping timeout", function() {
		network.channels[0].pushMessage(client, new Msg({
			text: "Ping timeout, disconnecting..."
		}));
	});

	irc.on("server options", function(data) {
		if (network.serverOptions.PREFIX === data.options.PREFIX) {
			return;
		}

		network.prefixLookup = {};

		_.each(data.options.PREFIX, function(mode) {
			network.prefixLookup[mode.mode] = mode.symbol;
		});

		network.serverOptions.PREFIX = data.options.PREFIX;

		client.emit("network_changed", {
			network: network.id,
			serverOptions: network.serverOptions
		});
	});
};
