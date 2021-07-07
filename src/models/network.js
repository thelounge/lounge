"use strict";

const _ = require("lodash");
const {v4: uuidv4} = require("uuid");
const IrcFramework = require("irc-framework");
const Chan = require("./chan");
const Msg = require("./msg");
const Helper = require("../helper");
const STSPolicies = require("../plugins/sts");
const ClientCertificate = require("../plugins/clientCertificate");

module.exports = Network;

/**
 * @type {Object} List of keys which should be sent to the client by default.
 */
const fieldsForClient = {
	uuid: true,
	name: true,
	nick: true,
	serverOptions: true,
	host: true,
};

function Network(attr) {
	_.defaults(this, attr, {
		name: "",
		nick: "",
		host: "",
		port: 6667,
		tls: false,
		userDisconnected: false,
		rejectUnauthorized: false,
		password: "",
		awayMessage: "",
		commands: [],
		username: "",
		realname: "",
		leaveMessage: "",
		sasl: "",
		saslAccount: "",
		saslPassword: "",
		channels: [],
		irc: null,
		serverOptions: {
			CHANTYPES: ["#", "&"],
			PREFIX: ["!", "@", "%", "+"],
			NETWORK: "",
		},

		proxyHost: "",
		proxyPort: 1080,
		proxyUsername: "",
		proxyPassword: "",
		proxyEnabled: false,

		chanCache: [],
		ignoreList: [],
		keepNick: null,
	});

	if (!this.uuid) {
		this.uuid = uuidv4();
	}

	if (!this.name) {
		this.name = this.host;
	}

	this.channels.unshift(
		new Chan({
			name: this.name,
			type: Chan.Type.LOBBY,
		})
	);
}

Network.prototype.validate = function (client) {
	// Remove !, :, @ and whitespace characters from nicknames and usernames
	const cleanNick = (str) => str.replace(/[\x00\s:!@]/g, "_").substring(0, 100);

	// Remove new lines and limit length
	const cleanString = (str) => str.replace(/[\x00\r\n]/g, "").substring(0, 300);

	this.setNick(cleanNick(String(this.nick || Helper.getDefaultNick())));

	if (!this.username) {
		// If username is empty, make one from the provided nick
		this.username = this.nick.replace(/[^a-zA-Z0-9]/g, "");
	}

	this.username = cleanString(this.username) || "thelounge";
	this.realname = cleanString(this.realname) || "The Lounge User";
	this.leaveMessage = cleanString(this.leaveMessage);
	this.password = cleanString(this.password);
	this.host = cleanString(this.host).toLowerCase();
	this.name = cleanString(this.name);
	this.saslAccount = cleanString(this.saslAccount);
	this.saslPassword = cleanString(this.saslPassword);

	this.proxyHost = cleanString(this.proxyHost);
	this.proxyPort = this.proxyPort || 1080;
	this.proxyUsername = cleanString(this.proxyUsername);
	this.proxyPassword = cleanString(this.proxyPassword);
	this.proxyEnabled = !!this.proxyEnabled;

	if (!this.port) {
		this.port = this.tls ? 6697 : 6667;
	}

	if (!["", "plain", "external"].includes(this.sasl)) {
		this.sasl = "";
	}

	if (!this.tls) {
		ClientCertificate.remove(this.uuid);
	}

	if (Helper.config.lockNetwork) {
		// This check is needed to prevent invalid user configurations
		if (
			!Helper.config.public &&
			this.host &&
			this.host.length > 0 &&
			this.host !== Helper.config.defaults.host
		) {
			this.channels[0].pushMessage(
				client,
				new Msg({
					type: Msg.Type.ERROR,
					text: "Hostname you specified is not allowed.",
				}),
				true
			);

			return false;
		}

		if (Helper.config.public) {
			this.name = Helper.config.defaults.name;
			// Sync lobby channel name
			this.channels[0].name = Helper.config.defaults.name;
		}

		this.host = Helper.config.defaults.host;
		this.port = Helper.config.defaults.port;
		this.tls = Helper.config.defaults.tls;
		this.rejectUnauthorized = Helper.config.defaults.rejectUnauthorized;
	}

	if (this.host.length === 0) {
		this.channels[0].pushMessage(
			client,
			new Msg({
				type: Msg.Type.ERROR,
				text: "You must specify a hostname to connect.",
			}),
			true
		);

		return false;
	}

	const stsPolicy = STSPolicies.get(this.host);

	if (stsPolicy && !this.tls) {
		this.channels[0].pushMessage(
			client,
			new Msg({
				type: Msg.Type.ERROR,
				text: `${this.host} has an active strict transport security policy, will connect to port ${stsPolicy.port} over a secure connection.`,
			}),
			true
		);

		this.port = stsPolicy.port;
		this.tls = true;
		this.rejectUnauthorized = true;
	}

	return true;
};

Network.prototype.createIrcFramework = function (client) {
	this.irc = new IrcFramework.Client({
		version: false, // We handle it ourselves
		outgoing_addr: Helper.config.bind,
		enable_chghost: true,
		enable_echomessage: true,
		enable_setname: true,
		auto_reconnect: true,

		// Exponential backoff maxes out at 300 seconds after 9 reconnects,
		// it will keep trying for well over an hour (plus the timeouts)
		auto_reconnect_max_retries: 30,
	});

	this.setIrcFrameworkOptions(client);

	this.irc.requestCap([
		"znc.in/self-message", // Legacy echo-message for ZNC
	]);

	// Request only new messages from ZNC if we have sqlite logging enabled
	// See http://wiki.znc.in/Playback
	if (client.messageProvider) {
		this.irc.requestCap("znc.in/playback");
	}
};

Network.prototype.setIrcFrameworkOptions = function (client) {
	this.irc.options.host = this.host;
	this.irc.options.port = this.port;
	this.irc.options.password = this.password;
	this.irc.options.nick = this.nick;
	this.irc.options.username = Helper.config.useHexIp
		? Helper.ip2hex(client.config.browser.ip)
		: this.username;
	this.irc.options.gecos = this.realname;
	this.irc.options.tls = this.tls;
	this.irc.options.rejectUnauthorized = this.rejectUnauthorized;
	this.irc.options.webirc = this.createWebIrc(client);
	this.irc.options.client_certificate = null;

	if (this.proxyEnabled) {
		this.irc.options.socks = {
			host: this.proxyHost,
			port: this.proxyPort,
			user: this.proxyUsername,
			pass: this.proxyPassword,
		};
	} else {
		delete this.irc.options.socks;
	}

	if (!this.sasl) {
		delete this.irc.options.sasl_mechanism;
		delete this.irc.options.account;
	} else if (this.sasl === "external") {
		this.irc.options.sasl_mechanism = "EXTERNAL";
		this.irc.options.account = {};
		this.irc.options.client_certificate = ClientCertificate.get(this.uuid);
	} else if (this.sasl === "plain") {
		delete this.irc.options.sasl_mechanism;
		this.irc.options.account = {
			account: this.saslAccount,
			password: this.saslPassword,
		};
	}
};

Network.prototype.createWebIrc = function (client) {
	if (
		!Helper.config.webirc ||
		!Object.prototype.hasOwnProperty.call(Helper.config.webirc, this.host)
	) {
		return null;
	}

	const webircObject = {
		password: Helper.config.webirc[this.host],
		username: "thelounge",
		address: client.config.browser.ip,
		hostname: client.config.browser.hostname,
	};

	// https://ircv3.net/specs/extensions/webirc#options
	if (client.config.browser.isSecure) {
		webircObject.options = {
			secure: true,
		};
	}

	if (typeof Helper.config.webirc[this.host] === "function") {
		webircObject.password = null;
		return Helper.config.webirc[this.host](webircObject, this);
	}

	return webircObject;
};

Network.prototype.edit = function (client, args) {
	const oldNetworkName = this.name;
	const oldNick = this.nick;
	const oldRealname = this.realname;

	this.keepNick = null;
	this.nick = args.nick;
	this.host = String(args.host || "");
	this.name = String(args.name || "") || this.host;
	this.port = parseInt(args.port, 10);
	this.tls = !!args.tls;
	this.rejectUnauthorized = !!args.rejectUnauthorized;
	this.password = String(args.password || "");
	this.username = String(args.username || "");
	this.realname = String(args.realname || "");
	this.leaveMessage = String(args.leaveMessage || "");
	this.sasl = String(args.sasl || "");
	this.saslAccount = String(args.saslAccount || "");
	this.saslPassword = String(args.saslPassword || "");

	this.proxyHost = String(args.proxyHost || "");
	this.proxyPort = parseInt(args.proxyPort, 10);
	this.proxyUsername = String(args.proxyUsername || "");
	this.proxyPassword = String(args.proxyPassword || "");
	this.proxyEnabled = !!args.proxyEnabled;

	// Split commands into an array
	this.commands = String(args.commands || "")
		.replace(/\r\n|\r|\n/g, "\n")
		.split("\n")
		.filter((command) => command.length > 0);

	// Sync lobby channel name
	this.channels[0].name = this.name;

	if (this.name !== oldNetworkName) {
		// Send updated network name to all connected clients
		client.emit("network:name", {
			uuid: this.uuid,
			name: this.name,
		});
	}

	if (!this.validate(client)) {
		return;
	}

	if (this.irc) {
		const connected = this.irc.connection && this.irc.connection.connected;

		if (this.nick !== oldNick) {
			if (connected) {
				// Send new nick straight away
				this.irc.changeNick(this.nick);
			} else {
				this.irc.user.nick = this.nick;

				// Update UI nick straight away if IRC is not connected
				client.emit("nick", {
					network: this.uuid,
					nick: this.nick,
				});
			}
		}

		if (
			connected &&
			this.realname !== oldRealname &&
			this.irc.network.cap.isEnabled("setname")
		) {
			this.irc.raw("SETNAME", this.realname);
		}

		this.setIrcFrameworkOptions(client);

		this.irc.user.username = this.irc.options.username;
		this.irc.user.gecos = this.irc.options.gecos;
	}

	client.save();
};

Network.prototype.destroy = function () {
	this.channels.forEach((channel) => channel.destroy());
};

Network.prototype.setNick = function (nick) {
	this.nick = nick;
	this.highlightRegex = new RegExp(
		// Do not match characters and numbers (unless IRC color)
		"(?:^|[^a-z0-9]|\x03[0-9]{1,2})" +
			// Escape nickname, as it may contain regex stuff
			_.escapeRegExp(nick) +
			// Do not match characters and numbers
			"(?:[^a-z0-9]|$)",

		// Case insensitive search
		"i"
	);

	if (this.keepNick === nick) {
		this.keepNick = null;
	}

	if (this.irc) {
		this.irc.options.nick = nick;
	}
};

/**
 * Get a clean clone of this network that will be sent to the client.
 * This function performs manual cloning of network object for
 * better control of performance and memory usage.
 *
 * Both of the parameters that are accepted by this function are passed into channels' getFilteredClone call.
 *
 * @see {@link Chan#getFilteredClone}
 */
Network.prototype.getFilteredClone = function (lastActiveChannel, lastMessage) {
	const filteredNetwork = Object.keys(this).reduce((newNetwork, prop) => {
		if (prop === "channels") {
			// Channels objects perform their own cloning
			newNetwork[prop] = this[prop].map((channel) =>
				channel.getFilteredClone(lastActiveChannel, lastMessage)
			);
		} else if (fieldsForClient[prop]) {
			// Some properties that are not useful for the client are skipped
			newNetwork[prop] = this[prop];
		}

		return newNetwork;
	}, {});

	filteredNetwork.status = this.getNetworkStatus();

	return filteredNetwork;
};

Network.prototype.getNetworkStatus = function () {
	const status = {
		connected: false,
		secure: false,
	};

	if (this.irc && this.irc.connection && this.irc.connection.transport) {
		const transport = this.irc.connection.transport;

		if (transport.socket) {
			const isLocalhost = transport.socket.remoteAddress === "127.0.0.1";
			const isAuthorized = transport.socket.encrypted && transport.socket.authorized;

			status.connected = transport.isConnected();
			status.secure = isAuthorized || isLocalhost;
		}
	}

	return status;
};

Network.prototype.addChannel = function (newChan) {
	let index = this.channels.length; // Default to putting as the last item in the array

	// Don't sort special channels in amongst channels/users.
	if (newChan.type === Chan.Type.CHANNEL || newChan.type === Chan.Type.QUERY) {
		// We start at 1 so we don't test against the lobby
		for (let i = 1; i < this.channels.length; i++) {
			const compareChan = this.channels[i];

			// Negative if the new chan is alphabetically before the next chan in the list, positive if after
			if (
				newChan.name.localeCompare(compareChan.name, {sensitivity: "base"}) <= 0 ||
				(compareChan.type !== Chan.Type.CHANNEL && compareChan.type !== Chan.Type.QUERY)
			) {
				index = i;
				break;
			}
		}
	}

	this.channels.splice(index, 0, newChan);
	return index;
};

Network.prototype.quit = function (quitMessage) {
	if (!this.irc) {
		return;
	}

	// https://ircv3.net/specs/extensions/sts#rescheduling-expiry-on-disconnect
	STSPolicies.refreshExpiration(this.host);

	this.irc.quit(quitMessage || this.leaveMessage || Helper.config.leaveMessage);
};

Network.prototype.exportForEdit = function () {
	const fieldsToReturn = [
		"uuid",
		"name",
		"nick",
		"password",
		"username",
		"realname",
		"leaveMessage",
		"sasl",
		"saslAccount",
		"saslPassword",
		"commands",

		"proxyEnabled",
		"proxyHost",
		"proxyPort",
		"proxyUsername",
		"proxyPassword",
	];

	if (!Helper.config.lockNetwork) {
		fieldsToReturn.push("host");
		fieldsToReturn.push("port");
		fieldsToReturn.push("tls");
		fieldsToReturn.push("rejectUnauthorized");
	}

	const data = _.pick(this, fieldsToReturn);

	data.hasSTSPolicy = !!STSPolicies.get(this.host);

	return data;
};

Network.prototype.export = function () {
	const network = _.pick(this, [
		"uuid",
		"awayMessage",
		"nick",
		"name",
		"host",
		"port",
		"tls",
		"userDisconnected",
		"rejectUnauthorized",
		"password",
		"username",
		"realname",
		"leaveMessage",
		"sasl",
		"saslAccount",
		"saslPassword",
		"commands",
		"ignoreList",

		"proxyHost",
		"proxyPort",
		"proxyUsername",
		"proxyEnabled",
	]);

	network.channels = this.channels
		.filter(function (channel) {
			return channel.type === Chan.Type.CHANNEL || channel.type === Chan.Type.QUERY;
		})
		.map(function (chan) {
			const keys = ["name"];

			if (chan.type === Chan.Type.CHANNEL) {
				keys.push("key");
			} else if (chan.type === Chan.Type.QUERY) {
				keys.push("type");
			}

			return _.pick(chan, keys);
		});

	return network;
};

Network.prototype.getChannel = function (name) {
	name = name.toLowerCase();

	return _.find(this.channels, function (that, i) {
		// Skip network lobby (it's always unshifted into first position)
		return i > 0 && that.name.toLowerCase() === name;
	});
};
