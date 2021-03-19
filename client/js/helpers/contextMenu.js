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
	const currentChannelUser = channel.users.find((u) => u.nick === network.nick) || {};
	const currentChannelModes = currentChannelUser.modes || [];

	const whois = () => {
		const chan = $root.$store.getters.findChannelOnCurrentNetwork(user.nick);

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

	if (currentChannelModes.includes("@")) {
		items.push({
			label: "Kick",
			type: "item",
			class: "action-kick",
			action() {
				eventbus.emit(
					"input-dialog",
					{
						title: "Kick Reason",
						text: `Please give your reason to kick ${user.nick} from ${channel.name}.`,
						placeholder: `Reason to kick ${user.nick} from ${channel.name}...`,
						button: `Kick ${user.nick}`,
					},
					(result) => {
						if (result === null) {
							socket.emit("input", {
								target: channel.id,
								text: `/kick ${user.nick}`,
							});
						} else {
							socket.emit("input", {
								target: channel.id,
								text: `/kick ${user.nick} ${result}`,
							});
						}
					}
				);
			},
		});

		if (user.modes.includes("@")) {
			items.push({
				label: "Revoke operator (-o)",
				type: "item",
				class: "action-op",
				action() {
					socket.emit("input", {
						target: channel.id,
						text: "/deop " + user.nick,
					});
				},
			});
		} else {
			items.push({
				label: "Give operator (+o)",
				type: "item",
				class: "action-op",
				action() {
					socket.emit("input", {
						target: channel.id,
						text: "/op " + user.nick,
					});
				},
			});
		}

		if (user.modes.includes("+")) {
			items.push({
				label: "Revoke voice (-v)",
				type: "item",
				class: "action-voice",
				action() {
					socket.emit("input", {
						target: channel.id,
						text: "/devoice " + user.nick,
					});
				},
			});
		} else {
			items.push({
				label: "Give voice (+v)",
				type: "item",
				class: "action-voice",
				action() {
					socket.emit("input", {
						target: channel.id,
						text: "/voice " + user.nick,
					});
				},
			});
		}
	}

	return items;
}
