"use strict";

import socket from "../socket";
import eventbus from "../eventbus";

export function generateChannelContextMenu($root, channel, network) {
	const typeMap = {
		lobby: "network",
		channel: "chan",
		query: "query",
		special: "chan",
	};

	const closeMap = {
		lobby: "Remove",
		channel: "Leave",
		query: "Close",
		special: "Close",
	};

	let items = [
		{
			label: channel.name,
			type: "item",
			class: typeMap[channel.type],
			link: `/chan-${channel.id}`,
		},
		{
			type: "divider",
		},
	];

	// Add menu items for lobbies
	if (channel.type === "lobby") {
		items = [
			...items,
			{
				label: "Edit this network…",
				type: "item",
				class: "edit",
				link: `/edit-network/${network.uuid}`,
			},
			{
				label: "Join a channel…",
				type: "item",
				class: "join",
				action: () => (network.isJoinChannelShown = true),
			},
			{
				label: "List all channels",
				type: "item",
				class: "list",
				action: () =>
					socket.emit("input", {
						target: channel.id,
						text: "/list",
					}),
			},
			{
				label: "List ignored users",
				type: "item",
				class: "list",
				action: () =>
					socket.emit("input", {
						target: channel.id,
						text: "/ignorelist",
					}),
			},
			network.status.connected
				? {
						label: "Disconnect",
						type: "item",
						class: "disconnect",
						action: () =>
							socket.emit("input", {
								target: channel.id,
								text: "/disconnect",
							}),
				  }
				: {
						label: "Connect",
						type: "item",
						class: "connect",
						action: () =>
							socket.emit("input", {
								target: channel.id,
								text: "/connect",
							}),
				  },
		];
	}

	// Add menu items for channels
	if (channel.type === "channel") {
		items.push({
			label: "Edit topic",
			type: "item",
			class: "edit",
			action() {
				channel.editTopic = true;
				$root.switchToChannel(channel);
			},
		});
		items.push({
			label: "List banned users",
			type: "item",
			class: "list",
			action() {
				socket.emit("input", {
					target: channel.id,
					text: "/banlist",
				});
			},
		});
	}

	// Add menu items for queries
	if (channel.type === "query") {
		items.push(
			{
				label: "User information",
				type: "item",
				class: "action-whois",
				action() {
					$root.switchToChannel(channel);
					socket.emit("input", {
						target: channel.id,
						text: "/whois " + channel.name,
					});
				},
			},
			{
				label: "Ignore user",
				type: "item",
				class: "action-ignore",
				action() {
					socket.emit("input", {
						target: channel.id,
						text: "/ignore " + channel.name,
					});
				},
			}
		);
	}

	if (channel.type === "channel" || channel.type === "query") {
		items.push({
			label: "Clear history",
			type: "item",
			class: "clear-history",
			action() {
				eventbus.emit(
					"confirm-dialog",
					{
						title: "Clear history",
						text: `Are you sure you want to clear history for ${channel.name}? This cannot be undone.`,
						button: "Clear history",
					},
					(result) => {
						if (!result) {
							return;
						}

						socket.emit("history:clear", {
							target: channel.id,
						});
					}
				);
			},
		});
	}

	// The entire network is muted if the lobby is selected
	const humanFriendlyChanType = channel.type === "lobby" ? "network" : channel.type;
	items.push({
		label: channel.muted ? `Unmute ${humanFriendlyChanType}` : `Mute ${humanFriendlyChanType}`,
		type: "item",
		class: "mute",
		action() {
			socket.emit("mute:change", {
				target: channel.id,
				setMutedTo: !channel.muted,
			});
		},
	});

	// Add close menu item
	items.push({
		label: closeMap[channel.type],
		type: "item",
		class: "close",
		action() {
			$root.closeChannel(channel);
		},
	});

	return items;
}

export function generateUserContextMenu($root, channel, network, user) {
	const currentChannelUser = channel
		? channel.users.find((u) => u.nick === network.nick) || {}
		: {};

	const whois = () => {
		const chan = network.channels.find((c) => c.name === user.nick);

		if (chan) {
			$root.switchToChannel(chan);
		}

		socket.emit("input", {
			target: channel.id,
			text: "/whois " + user.nick,
		});
	};

	const items = [
		{
			label: user.nick,
			type: "item",
			class: "user",
			action: whois,
		},
		{
			type: "divider",
		},
		{
			label: "User information",
			type: "item",
			class: "action-whois",
			action: whois,
		},
		{
			label: "Ignore user",
			type: "item",
			class: "action-ignore",
			action() {
				socket.emit("input", {
					target: channel.id,
					text: "/ignore " + user.nick,
				});
			},
		},
		{
			label: "Direct messages",
			type: "item",
			class: "action-query",
			action() {
				const chan = $root.$store.getters.findChannelOnCurrentNetwork(user.nick);

				if (chan) {
					$root.switchToChannel(chan);
				}

				socket.emit("input", {
					target: channel.id,
					text: "/query " + user.nick,
				});
			},
		},
	];

	// Bail because we're in a query or we don't have a special mode.
	if (!currentChannelUser.modes || currentChannelUser.modes.length < 1) {
		return items;
	}

	// Names of the modes we are able to change
	const modes = {
		"~": ["owner", "q"],
		"&": ["admin", "a"],
		"@": ["operator", "o"],
		"%": ["half-op", "h"],
		"+": ["voice", "v"],
	};

	// Labels for the mode changes.  For example .rev(['admin', 'a']) => 'Revoke admin (-a)'
	const modeTextTemplate = {
		revoke: (m) => `Revoke ${m[0]} (-${m[1]})`,
		give: (m) => `Give ${m[0]} (+${m[1]})`,
	};

	const networkModes = network.serverOptions.PREFIX;

	/**
	 * Determine whether the prefix of mode p1 has access to perform actions on p2.
	 *
	 * EXAMPLE:
	 *    compare('@', '@') => true
	 *    compare('&', '@') => true
	 *    compare('+', '~') => false
	 * @param {string} p1 The mode performing an action
	 * @param {string} p2 The target mode
	 *
	 * @return {boolean} whether p1 can perform an action on p2
	 */
	function compare(p1, p2) {
		// The modes ~ and @ can perform actions on their own mode.  The others on modes below.
		return "~@".indexOf(p1) > -1
			? networkModes.indexOf(p1) <= networkModes.indexOf(p2)
			: networkModes.indexOf(p1) < networkModes.indexOf(p2);
	}

	networkModes.forEach((prefix) => {
		if (!compare(currentChannelUser.modes[0], prefix)) {
			// Our highest mode is below the current mode.  Bail.
			return;
		}

		if (!user.modes.includes(prefix)) {
			// The target doesn't already have this mode, therefore we can set it.
			items.push({
				label: modeTextTemplate.give(modes[prefix]),
				type: "item",
				class: "action-set-mode",
				action() {
					socket.emit("input", {
						target: channel.id,
						text: "/mode +" + modes[prefix][1] + " " + user.nick,
					});
				},
			});
		} else {
			items.push({
				label: modeTextTemplate.revoke(modes[prefix]),
				type: "item",
				class: "action-revoke-mode",
				action() {
					socket.emit("input", {
						target: channel.id,
						text: "/mode -" + modes[prefix][1] + " " + user.nick,
					});
				},
			});
		}
	});

	// Determine if we are half-op or op depending on the network modes so we can kick.
	if (!compare(networkModes.indexOf("%") > -1 ? "%" : "@", currentChannelUser.modes[0])) {
		if (user.modes.length === 0 || compare(currentChannelUser.modes[0], user.modes[0])) {
			// Check if the target user has no mode or a mode lower than ours.
			items.push({
				label: "Kick",
				type: "item",
				class: "action-kick",
				action() {
					socket.emit("input", {
						target: channel.id,
						text: "/kick " + user.nick,
					});
				},
			});
		}
	}

	return items;
}
