"use strict";

const constants = require("./constants");

import "../css/style.css";
import Vue from "vue";
import store from "./store";
import App from "../components/App.vue";
import storage from "./localStorage";
import {router, switchToChannel} from "./router";
import socket from "./socket";
import eventbus from "./eventbus";

import "./socket-events";
import "./webpush";
import "./keybinds";

const favicon = document.getElementById("favicon");
const faviconNormal = favicon.getAttribute("href");
const faviconAlerted = favicon.dataset.other;

new Vue({
	el: "#viewport",
	router,
	mounted() {
		socket.open();
	},
	methods: {
		switchToChannel(network, channel) {
			switchToChannel(network, channel);
		},
		closeChannel(channel) {
			if (channel.type === "lobby") {
				eventbus.emit(
					"confirm-dialog",
					{
						title: "Remove network",
						text: `Are you sure you want to quit and remove ${channel.name}? This cannot be undone.`,
						button: "Remove network",
					},
					(result) => {
						if (!result) {
							return;
						}

						channel.closed = true;
						socket.emit("input", {
							target: Number(channel.id),
							text: "/quit",
						});
					}
				);

				return;
			}

			channel.closed = true;

			socket.emit("input", {
				target: Number(channel.id),
				text: "/close",
			});
		},
	},
	render(createElement) {
		return createElement(App, {
			ref: "app",
			props: this,
		});
	},
	store,
});

store.watch(
	(state) => state.sidebarOpen,
	(sidebarOpen) => {
		if (window.innerWidth > constants.mobileViewportPixels) {
			storage.set("thelounge.state.sidebar", sidebarOpen);
			eventbus.emit("resize");
		}
	}
);

store.watch(
	(state) => state.userlistOpen,
	(userlistOpen) => {
		storage.set("thelounge.state.userlist", userlistOpen);
		eventbus.emit("resize");
	}
);

store.watch(
	(_, getters) => getters.title,
	(title) => {
		document.title = title;
	}
);

// Toggles the favicon to red when there are unread notifications
store.watch(
	(_, getters) => getters.highlightCount,
	(highlightCount) => {
		favicon.setAttribute("href", highlightCount > 0 ? faviconAlerted : faviconNormal);

		if (navigator.setAppBadge) {
			if (highlightCount > 0) {
				navigator.setAppBadge(highlightCount);
			} else {
				navigator.clearAppBadge();
			}
		}
	}
);

Vue.config.errorHandler = function (e) {
	store.commit("currentUserVisibleError", `Vue error: ${e.message}`);
	console.error(e); // eslint-disable-line
};
