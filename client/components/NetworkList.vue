<template>
	<div
		v-if="$store.state.networks.length === 0"
		class="empty"
		role="navigation"
		aria-label="Network and Channel list"
	>
		You are not connected to any networks yet.
	</div>
	<div v-else ref="networklist" role="navigation" aria-label="Network and Channel list">
		<div class="jump-to-input">
			<input
				ref="searchInput"
				:value="searchText"
				placeholder="Jump to..."
				type="search"
				class="search input mousetrap"
				aria-label="Search among the channel list"
				tabindex="-1"
				@input="setSearchText"
				@keydown.up="navigateResults($event, -1)"
				@keydown.down="navigateResults($event, 1)"
				@keydown.page-up="navigateResults($event, -10)"
				@keydown.page-down="navigateResults($event, 10)"
				@keydown.enter="selectResult"
				@keydown.escape="deactivateSearch"
				@focus="activateSearch"
			/>
		</div>
		<div v-if="searchText" class="jump-to-results">
			<div v-if="results.length">
				<div
					v-for="item in results"
					:key="item.channel.id"
					@mouseenter="setActiveSearchItem(item.channel)"
					@click.prevent="selectResult"
				>
					<Channel
						v-if="item.channel.type !== 'lobby'"
						:channel="item.channel"
						:network="item.network"
						:active="item.channel === activeSearchItem"
						:is-filtering="true"
					/>
					<NetworkLobby
						v-else
						:channel="item.channel"
						:network="item.network"
						:active="item.channel === activeSearchItem"
						:is-filtering="true"
					/>
				</div>
			</div>
			<div v-else class="no-results">No results found.</div>
		</div>
		<Draggable
			v-else
			:list="$store.state.networks"
			:filter="isCurrentlyInTouch"
			:prevent-on-filter="false"
			handle=".channel-list-item[data-type='lobby']"
			draggable=".network"
			ghost-class="ui-sortable-ghost"
			drag-class="ui-sortable-dragged"
			group="networks"
			class="networks"
			@change="onNetworkSort"
			@start="onDragStart"
			@end="onDragEnd"
		>
			<div
				v-for="network in $store.state.networks"
				:id="'network-' + network.uuid"
				:key="network.uuid"
				:class="{
					collapsed: network.isCollapsed,
					'not-connected': !network.status.connected,
					'not-secure': !network.status.secure,
				}"
				class="network"
				role="region"
				aria-live="polite"
			>
				<NetworkLobby
					:network="network"
					:is-join-channel-shown="
						network.isJoinChannelShown || !!getChannelQueryIfPresent()
					"
					:active="
						$store.state.activeChannel &&
						network.channels[0] === $store.state.activeChannel.channel
					"
					@toggle-join-channel="toggleJoinChannel(network)"
				/>
				<JoinChannel
					v-if="network.isJoinChannelShown || getChannelQueryIfPresent()"
					:network="network"
					:channel="network.channels[0]"
					@toggle-join-channel="toggleJoinChannel(network)"
				/>

				<Draggable
					draggable=".channel-list-item"
					ghost-class="ui-sortable-ghost"
					drag-class="ui-sortable-dragged"
					:group="network.uuid"
					:filter="isCurrentlyInTouch"
					:prevent-on-filter="false"
					:list="network.channels"
					class="channels"
					@change="onChannelSort"
					@start="onDragStart"
					@end="onDragEnd"
				>
					<template v-for="(channel, index) in network.channels">
						<Channel
							v-if="index > 0"
							:key="channel.id"
							:channel="channel"
							:network="network"
							:active="
								$store.state.activeChannel &&
								channel === $store.state.activeChannel.channel
							"
						/>
					</template>
				</Draggable>
			</div>
		</Draggable>
	</div>
</template>

<style>
.jump-to-input {
	margin: 8px;
	position: relative;
}

.jump-to-input .input {
	margin: 0;
	width: 100%;
	border: 0;
	color: #fff;
	background-color: rgba(255, 255, 255, 0.1);
	padding-right: 35px;
}

.jump-to-input .input::placeholder {
	color: rgba(255, 255, 255, 0.35);
}

.jump-to-input::before {
	content: "\f002"; /* http://fontawesome.io/icon/search/ */
	color: rgba(255, 255, 255, 0.35);
	position: absolute;
	right: 8px;
	top: 0;
	bottom: 0;
	pointer-events: none;
	line-height: 35px !important;
}

.jump-to-results {
	margin: 0;
	padding: 0;
	list-style: none;
	overflow: auto;
}

.jump-to-results .no-results {
	margin: 14px 8px;
	text-align: center;
}

.jump-to-results .channel-list-item.active {
	cursor: pointer;
}

.jump-to-results .channel-list-item .add-channel,
.jump-to-results .channel-list-item .close-tooltip {
	display: none;
}

.jump-to-results .channel-list-item[data-type="lobby"] {
	padding: 8px 14px;
}

.jump-to-results .channel-list-item[data-type="lobby"]::before {
	content: "\f233";
}
</style>

<script>
import VueRouter from "vue-router";
import Mousetrap from "mousetrap";
import Draggable from "vuedraggable";
import {filter as fuzzyFilter} from "fuzzy";
import NetworkLobby from "./NetworkLobby.vue";
import Channel from "./Channel.vue";
import JoinChannel from "./JoinChannel.vue";

import socket from "../js/socket";
import collapseNetwork from "../js/helpers/collapseNetwork";
import isIgnoredKeybind from "../js/helpers/isIgnoredKeybind";

const {isNavigationFailure, NavigationFailureType} = VueRouter;

export default {
	name: "NetworkList",
	components: {
		JoinChannel,
		NetworkLobby,
		Channel,
		Draggable,
	},
	data() {
		return {
			searchText: "",
			activeSearchItem: null,
		};
	},
	computed: {
		items() {
			const items = [];

			for (const network of this.$store.state.networks) {
				for (const channel of network.channels) {
					if (
						this.$store.state.activeChannel &&
						channel === this.$store.state.activeChannel.channel
					) {
						continue;
					}

					items.push({network, channel});
				}
			}

			return items;
		},
		results() {
			const results = fuzzyFilter(this.searchText, this.items, {
				extract: (item) => item.channel.name,
			}).map((item) => item.original);

			return results;
		},
	},
	watch: {
		searchText() {
			this.setActiveSearchItem();
		},
	},
	mounted() {
		Mousetrap.bind("alt+shift+right", this.expandNetwork);
		Mousetrap.bind("alt+shift+left", this.collapseNetwork);
		Mousetrap.bind("alt+j", this.toggleSearch);
	},
	beforeDestroy() {
		Mousetrap.unbind("alt+shift+right", this.expandNetwork);
		Mousetrap.unbind("alt+shift+left", this.collapseNetwork);
		Mousetrap.unbind("alt+j", this.toggleSearch);
	},
	methods: {
		expandNetwork(event) {
			if (isIgnoredKeybind(event)) {
				return true;
			}

			if (this.$store.state.activeChannel) {
				collapseNetwork(this.$store.state.activeChannel.network, false);
			}

			return false;
		},
		collapseNetwork(event) {
			if (isIgnoredKeybind(event)) {
				return true;
			}

			if (this.$store.state.activeChannel) {
				collapseNetwork(this.$store.state.activeChannel.network, true);
			}

			return false;
		},
		isCurrentlyInTouch(e) {
			// TODO: Implement a way to sort on touch devices
			return e.pointerType !== "mouse";
		},
		onDragStart(e) {
			e.target.classList.add("ui-sortable-active");
		},
		onDragEnd(e) {
			e.target.classList.remove("ui-sortable-active");
		},
		onNetworkSort(e) {
			if (!e.moved) {
				return;
			}

			socket.emit("sort", {
				type: "networks",
				order: this.$store.state.networks.map((n) => n.uuid),
			});
		},
		onChannelSort(e) {
			if (!e.moved) {
				return;
			}

			const channel = this.$store.getters.findChannel(e.moved.element.id);

			if (!channel) {
				return;
			}

			socket.emit("sort", {
				type: "channels",
				target: channel.network.uuid,
				order: channel.network.channels.map((c) => c.id),
			});
		},
		toggleSearch(event) {
			if (isIgnoredKeybind(event)) {
				return true;
			}

			if (this.$refs.searchInput === document.activeElement) {
				this.deactivateSearch();
				return false;
			}

			this.activateSearch();
			return false;
		},
		activateSearch() {
			if (this.$refs.searchInput === document.activeElement) {
				return;
			}

			this.sidebarWasClosed = this.$store.state.sidebarOpen ? false : true;
			this.$store.commit("sidebarOpen", true);
			this.$nextTick(() => {
				this.$refs.searchInput.focus();
			});
		},
		deactivateSearch() {
			this.activeSearchItem = null;
			this.searchText = "";
			this.$refs.searchInput.blur();

			if (this.sidebarWasClosed) {
				this.$store.commit("sidebarOpen", false);
			}
		},
		setSearchText(e) {
			this.searchText = e.target.value;
		},
		setActiveSearchItem(channel) {
			if (!this.results.length) {
				return;
			}

			if (!channel) {
				channel = this.results[0].channel;
			}

			this.activeSearchItem = channel;
		},
		selectResult() {
			if (!this.searchText || !this.results.length) {
				return;
			}

			this.$root.switchToChannel(
				this.activeSearchItem.network,
				this.activeSearchItem.channel
			);
			this.deactivateSearch();
			this.scrollToActive();
		},
		navigateResults(event, direction) {
			// Prevent propagation to stop global keybind handler from capturing pagedown/pageup
			// and redirecting it to the message list container for scrolling
			event.stopImmediatePropagation();
			event.preventDefault();

			if (!this.searchText) {
				return;
			}

			const channels = this.results.map((r) => r.channel);

			// Bail out if there's no channels to select
			if (!channels.length) {
				this.activeSearchItem = null;
				return;
			}

			let currentIndex = channels.indexOf(this.activeSearchItem);

			// If there's no active channel select the first or last one depending on direction
			if (!this.activeSearchItem || currentIndex === -1) {
				this.activeSearchItem = direction ? channels[0] : channels[channels.length - 1];
				this.scrollToActive();
				return;
			}

			currentIndex += direction;

			// Wrap around the list if necessary. Normaly each loop iterates once at most,
			// but might iterate more often if pgup or pgdown are used in a very short list
			while (currentIndex < 0) {
				currentIndex += channels.length;
			}

			while (currentIndex > channels.length - 1) {
				currentIndex -= channels.length;
			}

			this.activeSearchItem = channels[currentIndex];
			this.scrollToActive();
		},
		scrollToActive() {
			// Scroll the list if needed after the active class is applied
			this.$nextTick(() => {
				const el = this.$refs.networklist.querySelector(".channel-list-item.active");

				if (el) {
					el.scrollIntoView({block: "nearest", inline: "nearest"});
				}
			});
		},
		getChannelQueryIfPresent() {
			return this.$route.query.channel;
		},
		toggleJoinChannel(network) {
			network.isJoinChannelShown = !network.isJoinChannelShown;

			// Clear the `channel` query if the user closes the join channel UI.
			// The UI opens automatically if `channel` is present, so this is only true when the Join Channel
			// form is being closed and we can safely set isJoinChannelShown to false.
			if (this.$route.query.channel) {
				const query = Object.assign({}, this.$route.query);
				delete query.channel;

				this.$router.push({path: this.$route.path, query}).catch((e) => {
					// Required because Vue complains when pushing a route with the same path
					if (!isNavigationFailure(e, NavigationFailureType.duplicated)) {
						throw e;
					}
				});
				// Manually set to false.
				network.isJoinChannelShown = false;
			}
		},
	},
};
</script>
