"use strict";

const constants = require("./constants");

import Vue from "vue";
import VueRouter from "vue-router";

Vue.use(VueRouter);

import SignIn from "../components/Windows/SignIn.vue";
import Connect from "../components/Windows/Connect.vue";
import Settings from "../components/Windows/Settings.vue";
import Help from "../components/Windows/Help.vue";
import Changelog from "../components/Windows/Changelog.vue";
import NetworkEdit from "../components/Windows/NetworkEdit.vue";
import SearchResults from "../components/Windows/SearchResults.vue";
import RoutedChat from "../components/RoutedChat.vue";
import store from "./store";

const router = new VueRouter({
	routes: [
		{
			name: "SignIn",
			path: "/sign-in",
			component: SignIn,
			beforeEnter(to, from, next) {
				// Prevent navigating to sign-in when already signed in
				if (store.state.appLoaded) {
					next(false);
					return;
				}

				next();
			},
		},
		{
			name: "Connect",
			path: "/connect",
			component: Connect,
			props: (route) => ({queryParams: route.query}),
		},
		{
			name: "Settings",
			path: "/settings",
			component: Settings,
		},
		{
			name: "Help",
			path: "/help",
			component: Help,
		},
		{
			name: "Changelog",
			path: "/changelog",
			component: Changelog,
		},
		{
			name: "NetworkEdit",
			path: "/edit-network/:uuid",
			component: NetworkEdit,
		},
		{
			name: "RoutedChat",
			path: "/:networkHost/:channelName?",
			component: RoutedChat,
		},
		{
			name: "SearchResults",
			path: "/chan-:id/search",
			component: SearchResults,
		},
	],
});

router.beforeEach((to, from, next) => {
	// If user is not yet signed in, wait for appLoaded state to change
	// unless they are trying to open SignIn (which can be triggered in auth.js)
	if (!store.state.appLoaded && to.name !== "SignIn") {
		store.watch(
			(state) => state.appLoaded,
			() => next()
		);

		return;
	}

	next();
});

router.beforeEach((to, from, next) => {
	// Disallow navigating to non-existing routes
	if (!to.matched.length) {
		next(false);
		return;
	}

	// If trying to navigate to an invalid channel,
	// we attempt to either open a connection dialog to the network
	// or populate the Join Channel field in the existing network.
	if (to.name === "RoutedChat") {
		let channel = to.hash;
		const {networkHost, channelName} = to.params;

		// If the channel isn't provided as the hash, check if it's provided as the next param
		if (!channel) {
			if (channelName) {
				channel = channelName;
			}
		}

		if (store.getters.findChannelByName(networkHost, channel)) {
			next();
			return;
		}

		const existingNetwork = store.state.networks.find(
			(network) => network.host === to.params.networkHost
		);

		if (existingNetwork) {
			// Join Channel UI

			const activeChannel = store.state.activeChannel;

			// if the active channel is in the network, send the user back to that channel, else to the lobby
			if (activeChannel && activeChannel.network.uuid === existingNetwork.uuid) {
				next({
					path: `/${to.params.networkHost}/${encodeURIComponent(
						activeChannel.channel.name
					)}`,
					query: {channel},
				});
				return;
			}

			next({
				path: `/${to.params.networkHost}/${existingNetwork.name}`,
				query: {channel},
			});
			return;
		}

		// Connect UI
		next({
			path: "/connect",
			query: {...to.query, host: to.params.networkHost, channels: to.params.channelName},
		});
		return;
	}

	// Disallow navigating to invalid networks
	if (to.name === "NetworkEdit" && !store.getters.findNetwork(to.params.uuid)) {
		next(false);
		return;
	}

	// Handle closing image viewer with the browser back button
	if (!router.app.$refs.app) {
		next();
		return;
	}

	const imageViewer = router.app.$root.$refs.app.$refs.imageViewer;

	if (imageViewer && imageViewer.link) {
		imageViewer.closeViewer();
		next(false);
		return;
	}

	next();
});

router.afterEach((to) => {
	if (store.state.appLoaded) {
		if (window.innerWidth <= constants.mobileViewportPixels) {
			store.commit("sidebarOpen", false);
		}
	}

	if (store.state.activeChannel) {
		const channel = store.state.activeChannel.channel;

		if (to.name !== "RoutedChat") {
			store.commit("activeChannel", null);
		}

		// When switching out of a channel, mark everything as read
		if (channel.messages.length > 0) {
			channel.firstUnread = channel.messages[channel.messages.length - 1].id;
		}

		if (channel.messages.length > 100) {
			channel.messages.splice(0, channel.messages.length - 100);
			channel.moreHistoryAvailable = true;
		}
	}
});

function navigate(routeName, params = {}) {
	if (router.currentRoute.name) {
		router.push({name: routeName, params}).catch(() => {});
	} else {
		// If current route is null, replace the history entry
		// This prevents invalid entries from lingering in history,
		// and then the route guard preventing proper navigation
		router.replace({name: routeName, params}).catch(() => {});
	}
}

function switchToChannel(network, channel) {
	return navigate("RoutedChat", {networkHost: network.host, channelName: channel.name});
}

if ("serviceWorker" in navigator) {
	navigator.serviceWorker.addEventListener("message", (event) => {
		if (event.data && event.data.type === "open") {
			const id = parseInt(event.data.channel.substr(5), 10); // remove "chan-" prefix

			const channelTarget = store.getters.findChannel(id);

			if (channelTarget) {
				switchToChannel(channelTarget.network, channelTarget.channel);
			}
		}
	});
}

export {router, navigate, switchToChannel};
