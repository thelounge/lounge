"use strict";

const _ = require("lodash");
const log = require("./log");
const colors = require("chalk");
const Chan = require("./models/chan");
const crypto = require("crypto");
const Msg = require("./models/msg");
const Network = require("./models/network");
const Helper = require("./helper");
const UAParser = require("ua-parser-js");
const {v4: uuidv4} = require("uuid");
const escapeRegExp = require("lodash/escapeRegExp");
const constants = require("../client/js/constants.js");
const inputs = require("./plugins/inputs");
const PublicClient = require("./plugins/packages/publicClient");

const MessageStorage = require("./plugins/messageStorage/sqlite");
const TextFileMessageStorage = require("./plugins/messageStorage/text");

module.exports = Client;

const events = [
	"away",
	"cap",
	"connection",
	"unhandled",
	"ctcp",
	"chghost",
	"error",
	"help",
	"info",
	"invite",
	"join",
	"kick",
	"mode",
	"modelist",
	"motd",
	"message",
	"names",
	"nick",
	"part",
	"quit",
	"topic",
	"welcome",
	"list",
	"whois",
];

function Client(manager, name, config = {}) {
	_.merge(this, {
		awayMessage: "",
		lastActiveChannel: -1,
		attachedClients: {},
		config: config,
		id: uuidv4(),
		idChan: 1,
		idMsg: 1,
		name: name,
		networks: [],
		mentions: [],
		manager: manager,
		messageStorage: [],
		highlightRegex: null,
		highlightExceptionRegex: null,
		messageProvider: undefined,
	});

	const client = this;

	client.config.log = Boolean(client.config.log);
	client.config.password = String(client.config.password);

	if (!Helper.config.public && client.config.log) {
		if (Helper.config.messageStorage.includes("sqlite")) {
			client.messageProvider = new MessageStorage(client);
			client.messageStorage.push(client.messageProvider);
		}

		if (Helper.config.messageStorage.includes("text")) {
			client.messageStorage.push(new TextFileMessageStorage(client));
		}

		for (const messageStorage of client.messageStorage) {
			messageStorage.enable();
		}
	}

	if (!_.isPlainObject(client.config.sessions)) {
		client.config.sessions = {};
	}

	if (!_.isPlainObject(client.config.clientSettings)) {
		client.config.clientSettings = {};
	}

	if (!_.isPlainObject(client.config.browser)) {
		client.config.browser = {};
	}

	// TODO: Backwards compatibility with older versions, remove in a future release?
	if (client.config.awayMessage) {
		client.config.clientSettings.awayMessage = client.config.awayMessage;
		delete client.config.awayMessage;
	}

	if (client.config.clientSettings.awayMessage) {
		client.awayMessage = client.config.clientSettings.awayMessage;
	}

	client.config.clientSettings.searchEnabled = client.messageProvider !== undefined;

	client.compileCustomHighlights();

	_.forOwn(client.config.sessions, (session) => {
		if (session.pushSubscription) {
			this.registerPushSubscription(session, session.pushSubscription, true);
		}
	});

	(client.config.networks || []).forEach((network) => client.connect(network, true));

	// Networks are stored directly in the client object
	// We don't need to keep it in the config object
	delete client.config.networks;

	if (client.name) {
		log.info(`User ${colors.bold(client.name)} loaded`);

		// Networks are created instantly, but to reduce server load on startup
		// We randomize the IRC connections and channel log loading
		let delay = manager.clients.length * 500;
		client.networks.forEach((network) => {
			setTimeout(() => {
				network.channels.forEach((channel) => channel.loadMessages(client, network));

				if (!network.userDisconnected && network.irc) {
					network.irc.connect();
				}
			}, delay);

			delay += 1000 + Math.floor(Math.random() * 1000);
		});

		client.fileHash = manager.getDataToSave(client).newHash;
	}
}

Client.prototype.createChannel = function (attr) {
	const chan = new Chan(attr);
	chan.id = this.idChan++;

	return chan;
};

Client.prototype.emit = function (event, data) {
	if (this.manager !== null) {
		this.manager.sockets.in(this.id).emit(event, data);
	}
};

Client.prototype.find = function (channelId) {
	let network = null;
	let chan = null;

	for (const i in this.networks) {
		const n = this.networks[i];
		chan = _.find(n.channels, {id: channelId});

		if (chan) {
			network = n;
			break;
		}
	}

	if (network && chan) {
		return {network, chan};
	}

	return false;
};

Client.prototype.connect = function (args, isStartup = false) {
	const client = this;
	let channels = [];

	// Get channel id for lobby before creating other channels for nicer ids
	const lobbyChannelId = client.idChan++;

	if (args.channels) {
		let badName = false;

		args.channels.forEach((chan) => {
			if (!chan.name) {
				badName = true;
				return;
			}

			channels.push(
				client.createChannel({
					name: chan.name,
					key: chan.key || "",
					type: chan.type,
				})
			);
		});

		if (badName && client.name) {
			log.warn(
				"User '" +
					client.name +
					"' on network '" +
					args.name +
					"' has an invalid channel which has been ignored"
			);
		}
		// `join` is kept for backwards compatibility when updating from versions <2.0
		// also used by the "connect" window
	} else if (args.join) {
		channels = args.join
			.replace(/,/g, " ")
			.split(/\s+/g)
			.map((chan) => {
				if (!chan.match(/^[#&!+]/)) {
					chan = `#${chan}`;
				}

				return client.createChannel({
					name: chan,
				});
			});
	}

	const network = new Network({
		uuid: args.uuid,
		name: String(
			args.name || (Helper.config.lockNetwork ? Helper.config.defaults.name : "") || ""
		),
		host: String(args.host || ""),
		port: parseInt(args.port, 10),
		tls: !!args.tls,
		userDisconnected: !!args.userDisconnected,
		rejectUnauthorized: !!args.rejectUnauthorized,
		password: String(args.password || ""),
		nick: String(args.nick || ""),
		username: String(args.username || ""),
		realname: String(args.realname || ""),
		leaveMessage: String(args.leaveMessage || ""),
		sasl: String(args.sasl || ""),
		saslAccount: String(args.saslAccount || ""),
		saslPassword: String(args.saslPassword || ""),
		commands: args.commands || [],
		channels: channels,
		ignoreList: args.ignoreList ? args.ignoreList : [],

		proxyEnabled: !!args.proxyEnabled,
		proxyHost: String(args.proxyHost || ""),
		proxyPort: parseInt(args.proxyPort, 10),
		proxyUsername: String(args.proxyUsername || ""),
		proxyPassword: String(args.proxyPassword || ""),
	});

	// Set network lobby channel id
	network.channels[0].id = lobbyChannelId;

	client.networks.push(network);
	client.emit("network", {
		networks: [network.getFilteredClone(this.lastActiveChannel, -1)],
	});

	if (!network.validate(client)) {
		return;
	}

	network.createIrcFramework(client);

	events.forEach((plugin) => {
		require(`./plugins/irc-events/${plugin}`).apply(client, [network.irc, network]);
	});

	if (network.userDisconnected) {
		network.channels[0].pushMessage(
			client,
			new Msg({
				text:
					"You have manually disconnected from this network before, use the /connect command to connect again.",
			}),
			true
		);
	} else if (!isStartup) {
		network.irc.connect();
	}

	if (!isStartup) {
		client.save();
		channels.forEach((channel) => channel.loadMessages(client, network));
	}
};

Client.prototype.generateToken = function (callback) {
	crypto.randomBytes(64, (err, buf) => {
		if (err) {
			throw err;
		}

		callback(buf.toString("hex"));
	});
};

Client.prototype.calculateTokenHash = function (token) {
	return crypto.createHash("sha512").update(token).digest("hex");
};

Client.prototype.updateSession = function (token, ip, request) {
	const client = this;
	const agent = UAParser(request.headers["user-agent"] || "");
	let friendlyAgent = "";

	if (agent.browser.name) {
		friendlyAgent = `${agent.browser.name} ${agent.browser.major}`;
	} else {
		friendlyAgent = "Unknown browser";
	}

	if (agent.os.name) {
		friendlyAgent += ` on ${agent.os.name}`;

		if (agent.os.version) {
			friendlyAgent += ` ${agent.os.version}`;
		}
	}

	client.config.sessions[token] = _.assign(client.config.sessions[token], {
		lastUse: Date.now(),
		ip: ip,
		agent: friendlyAgent,
	});

	client.save();
};

Client.prototype.setPassword = function (hash, callback) {
	const client = this;

	const oldHash = client.config.password;
	client.config.password = hash;
	client.manager.saveUser(client, function (err) {
		if (err) {
			// If user file fails to write, reset it back
			client.config.password = oldHash;
			return callback(false);
		}

		return callback(true);
	});
};

Client.prototype.input = function (data) {
	const client = this;
	data.text.split("\n").forEach((line) => {
		data.text = line;
		client.inputLine(data);
	});
};

Client.prototype.inputLine = function (data) {
	const client = this;
	const target = client.find(data.target);

	if (!target) {
		return;
	}

	// Sending a message to a channel is higher priority than merely opening one
	// so that reloading the page will open this channel
	this.lastActiveChannel = target.chan.id;

	let text = data.text;

	// This is either a normal message or a command escaped with a leading '/'
	if (text.charAt(0) !== "/" || text.charAt(1) === "/") {
		if (target.chan.type === Chan.Type.LOBBY) {
			target.chan.pushMessage(
				this,
				new Msg({
					type: Msg.Type.ERROR,
					text: "Messages can not be sent to lobbies.",
				})
			);
			return;
		}

		text = "say " + text.replace(/^\//, "");
	} else {
		text = text.substr(1);
	}

	const args = text.split(" ");
	const cmd = args.shift().toLowerCase();

	const irc = target.network.irc;
	let connected = irc && irc.connection && irc.connection.connected;

	if (inputs.userInputs.has(cmd)) {
		const plugin = inputs.userInputs.get(cmd);

		if (typeof plugin.input === "function" && (connected || plugin.allowDisconnected)) {
			connected = true;
			plugin.input.apply(client, [target.network, target.chan, cmd, args]);
		}
	} else if (inputs.pluginCommands.has(cmd)) {
		const plugin = inputs.pluginCommands.get(cmd);

		if (typeof plugin.input === "function" && (connected || plugin.allowDisconnected)) {
			connected = true;
			plugin.input(
				new PublicClient(client, plugin.packageInfo),
				{network: target.network, chan: target.chan},
				cmd,
				args
			);
		}
	} else if (connected) {
		irc.raw(text);
	}

	if (!connected) {
		target.chan.pushMessage(
			this,
			new Msg({
				type: Msg.Type.ERROR,
				text: "You are not connected to the IRC network, unable to send your command.",
			})
		);
	}
};

Client.prototype.compileCustomHighlights = function () {
	this.highlightRegex = compileHighlightRegex(this.config.clientSettings.highlights);
	this.highlightExceptionRegex = compileHighlightRegex(
		this.config.clientSettings.highlightExceptions
	);
};

function compileHighlightRegex(customHighlightString) {
	if (typeof customHighlightString !== "string") {
		return null;
	}

	// Ensure we don't have empty strings in the list of highlights
	const highlightsTokens = customHighlightString
		.split(",")
		.map((highlight) => escapeRegExp(highlight.trim()))
		.filter((highlight) => highlight.length > 0);

	if (highlightsTokens.length === 0) {
		return null;
	}

	return new RegExp(
		`(?:^|[ .,+!?|/:<>(){}'"@&~-])(?:${highlightsTokens.join("|")})(?:$|[ .,+!?|/:<>(){}'"-])`,
		"i"
	);
}

Client.prototype.more = function (data) {
	const client = this;
	const target = client.find(data.target);

	if (!target) {
		return null;
	}

	const chan = target.chan;
	let messages = [];
	let index = 0;

	// If client requests -1, send last 100 messages
	if (data.lastId < 0) {
		index = chan.messages.length;
	} else {
		index = chan.messages.findIndex((val) => val.id === data.lastId);
	}

	// If requested id is not found, an empty array will be sent
	if (index > 0) {
		let startIndex = index;

		if (data.condensed) {
			// Limit to 1000 messages (that's 10x normal limit)
			const indexToStop = Math.max(0, index - 1000);
			let realMessagesLeft = 100;

			for (let i = index - 1; i >= indexToStop; i--) {
				startIndex--;

				// Do not count condensed messages towards the 100 messages
				if (constants.condensedTypes.has(chan.messages[i].type)) {
					continue;
				}

				// Count up actual 100 visible messages
				if (--realMessagesLeft === 0) {
					break;
				}
			}
		} else {
			startIndex = Math.max(0, index - 100);
		}

		messages = chan.messages.slice(startIndex, index);
	}

	return {
		chan: chan.id,
		messages: messages,
		totalMessages: chan.messages.length,
	};
};

Client.prototype.clearHistory = function (data) {
	const client = this;
	const target = client.find(data.target);

	if (!target) {
		return;
	}

	target.chan.messages = [];
	target.chan.unread = 0;
	target.chan.highlight = 0;
	target.chan.firstUnread = 0;

	client.emit("history:clear", {
		target: target.chan.id,
	});

	if (!target.chan.isLoggable()) {
		return;
	}

	for (const messageStorage of this.messageStorage) {
		messageStorage.deleteChannel(target.network, target.chan);
	}
};

Client.prototype.search = function (query) {
	if (this.messageProvider === undefined) {
		return Promise.resolve([]);
	}

	return this.messageProvider.search(query);
};

Client.prototype.open = function (socketId, target) {
	// Due to how socket.io works internally, normal events may arrive later than
	// the disconnect event, and because we can't control this timing precisely,
	// process this event normally even if there is no attached client anymore.
	const attachedClient = this.attachedClients[socketId] || {};

	// Opening a window like settings
	if (target === null) {
		attachedClient.openChannel = -1;
		return;
	}

	target = this.find(target);

	if (!target) {
		return;
	}

	target.chan.unread = 0;
	target.chan.highlight = 0;

	if (target.chan.messages.length > 0) {
		target.chan.firstUnread = target.chan.messages[target.chan.messages.length - 1].id;
	}

	attachedClient.openChannel = target.chan.id;
	this.lastActiveChannel = target.chan.id;

	this.emit("open", target.chan.id);
};

Client.prototype.sort = function (data) {
	const order = data.order;

	if (!_.isArray(order)) {
		return;
	}

	switch (data.type) {
		case "networks":
			this.networks.sort((a, b) => order.indexOf(a.uuid) - order.indexOf(b.uuid));

			// Sync order to connected clients
			this.emit("sync_sort", {
				order: this.networks.map((obj) => obj.uuid),
				type: data.type,
			});

			break;

		case "channels": {
			const network = _.find(this.networks, {uuid: data.target});

			if (!network) {
				return;
			}

			network.channels.sort((a, b) => {
				// Always sort lobby to the top regardless of what the client has sent
				// Because there's a lot of code that presumes channels[0] is the lobby
				if (a.type === Chan.Type.LOBBY) {
					return -1;
				} else if (b.type === Chan.Type.LOBBY) {
					return 1;
				}

				return order.indexOf(a.id) - order.indexOf(b.id);
			});

			// Sync order to connected clients
			this.emit("sync_sort", {
				order: network.channels.map((obj) => obj.id),
				type: data.type,
				target: network.uuid,
			});

			break;
		}
	}

	this.save();
};

Client.prototype.names = function (data) {
	const client = this;
	const target = client.find(data.target);

	if (!target) {
		return;
	}

	client.emit("names", {
		id: target.chan.id,
		users: target.chan.getSortedUsers(target.network.irc),
	});
};

Client.prototype.quit = function (signOut) {
	const sockets = this.manager.sockets.sockets;
	const room = sockets.adapter.rooms.get(this.id);

	if (room) {
		for (const user of room) {
			const socket = sockets.sockets.get(user);

			if (socket) {
				if (signOut) {
					socket.emit("sign-out");
				}

				socket.disconnect();
			}
		}
	}

	this.networks.forEach((network) => {
		network.quit();
		network.destroy();
	});

	for (const messageStorage of this.messageStorage) {
		messageStorage.close();
	}
};

Client.prototype.clientAttach = function (socketId, token) {
	const client = this;

	if (client.awayMessage && _.size(client.attachedClients) === 0) {
		client.networks.forEach(function (network) {
			// Only remove away on client attachment if
			// there is no away message on this network
			if (network.irc && !network.awayMessage) {
				network.irc.raw("AWAY");
			}
		});
	}

	const openChannel = client.lastActiveChannel;
	client.attachedClients[socketId] = {token, openChannel};
};

Client.prototype.clientDetach = function (socketId) {
	const client = this;

	delete this.attachedClients[socketId];

	if (client.awayMessage && _.size(client.attachedClients) === 0) {
		client.networks.forEach(function (network) {
			// Only set away on client deattachment if
			// there is no away message on this network
			if (network.irc && !network.awayMessage) {
				network.irc.raw("AWAY", client.awayMessage);
			}
		});
	}
};

Client.prototype.registerPushSubscription = function (session, subscription, noSave) {
	if (
		!_.isPlainObject(subscription) ||
		!_.isPlainObject(subscription.keys) ||
		typeof subscription.endpoint !== "string" ||
		!/^https?:\/\//.test(subscription.endpoint) ||
		typeof subscription.keys.p256dh !== "string" ||
		typeof subscription.keys.auth !== "string"
	) {
		session.pushSubscription = null;
		return;
	}

	const data = {
		endpoint: subscription.endpoint,
		keys: {
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
		},
	};

	session.pushSubscription = data;

	if (!noSave) {
		this.save();
	}

	return data;
};

Client.prototype.unregisterPushSubscription = function (token) {
	this.config.sessions[token].pushSubscription = null;
	this.save();
};

Client.prototype.save = _.debounce(
	function SaveClient() {
		if (Helper.config.public) {
			return;
		}

		const client = this;
		client.manager.saveUser(client);
	},
	5000,
	{maxWait: 20000}
);
