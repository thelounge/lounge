<template>
	<div id="chat-container" class="window">
		<div
			id="chat"
			:class="{
				'colored-nicks': $store.state.settings.coloredNicks,
				'time-seconds': $store.state.settings.showSeconds,
				'time-12h': $store.state.settings.use12hClock,
			}"
		>
			<div
				class="chat-view"
				data-type="search-results"
				aria-label="Search results"
				role="tabpanel"
			>
				<div class="header">
					<SidebarToggle />
					<span class="title"
						>Searching in <span class="channel-name">{{ channel.name }}</span> for</span
					>
					<span class="topic">{{ $route.query.q }}</span>
					<MessageSearchForm :network="network" :channel="channel" />
					<button
						class="close"
						aria-label="Close search window"
						title="Close search window"
						@click="closeSearch"
					/>
				</div>
				<div class="chat-content">
					<div ref="chat" class="chat" tabindex="-1">
						<div v-show="moreResultsAvailable" class="show-more">
							<button
								ref="loadMoreButton"
								:disabled="
									$store.state.messageSearchInProgress ||
									!$store.state.isConnected
								"
								class="btn"
								@click="onShowMoreClick"
							>
								<span v-if="$store.state.messageSearchInProgress">Loading…</span>
								<span v-else>Show older messages</span>
							</button>
						</div>

						<div
							v-if="$store.state.messageSearchInProgress && !offset"
							class="search-status"
						>
							Searching…
						</div>
						<div v-else-if="!messages.length && !offset" class="search-status">
							No results found.
						</div>
						<div
							v-else
							class="messages"
							role="log"
							aria-live="polite"
							aria-relevant="additions"
						>
							<template v-for="(message, id) in messages">
								<div :key="message.id" class="result" @:click="jump(message, id)">
									<DateMarker
										v-if="shouldDisplayDateMarker(message, id)"
										:key="message.date"
										:message="message"
									/>
									<Message
										:key="message.id"
										:channel="channel"
										:network="network"
										:message="message"
										:data-id="message.id"
									/>
								</div>
							</template>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style>
.channel-name {
	font-weight: 700;
}
</style>

<script>
import socket from "../../js/socket";

import SidebarToggle from "../SidebarToggle.vue";
import Message from "../Message.vue";
import MessageSearchForm from "../MessageSearchForm.vue";
import DateMarker from "../DateMarker.vue";

export default {
	name: "SearchResults",
	components: {
		SidebarToggle,
		Message,
		DateMarker,
		MessageSearchForm,
	},
	data() {
		return {
			offset: 0,
			moreResultsAvailable: false,
			oldScrollTop: 0,
			oldChatHeight: 0,
		};
	},
	computed: {
		search() {
			return this.$store.state.messageSearchResults;
		},
		messages() {
			if (!this.search) {
				return [];
			}

			return this.search.results.slice();
		},
		chan() {
			const chanId = parseInt(this.$route.params.id, 10);
			return this.$store.getters.findChannel(chanId);
		},
		network() {
			if (!this.chan) {
				return null;
			}

			return this.chan.network;
		},
		channel() {
			if (!this.chan) {
				return null;
			}

			return this.chan.channel;
		},
	},
	watch: {
		"$route.params.id"() {
			this.doSearch();
			this.setActiveChannel();
		},
		"$route.query.q"() {
			this.doSearch();
			this.setActiveChannel();
		},
		messages() {
			this.moreResultsAvailable = this.messages.length && !(this.messages.length % 100);

			if (!this.offset) {
				this.jumpToBottom();
			} else {
				this.$nextTick(() => {
					const currentChatHeight = this.$refs.chat.scrollHeight;
					this.$refs.chat.scrollTop =
						this.oldScrollTop + currentChatHeight - this.oldChatHeight;
				});
			}
		},
	},
	mounted() {
		this.setActiveChannel();
		this.doSearch();
		this.$root.$on("re-search", this.doSearch); // Enable MessageSearchForm to search for the same query again
	},
	beforeDestroy() {
		this.$root.$off("re-search");
	},
	methods: {
		setActiveChannel() {
			this.$store.commit("activeChannel", this.chan);
		},
		closeSearch() {
			this.$root.switchToChannel(this.channel);
		},
		shouldDisplayDateMarker(message, id) {
			const previousMessage = this.messages[id - 1];

			if (!previousMessage) {
				return true;
			}

			return new Date(previousMessage.time).getDay() !== new Date(message.time).getDay();
		},
		doSearch() {
			this.offset = 0;
			this.$store.commit("messageSearchInProgress", true);

			if (!this.offset) {
				this.$store.commit("messageSearchResults", null); // Only reset if not getting offset
			}

			socket.emit("search", {
				networkUuid: this.network.uuid,
				channelName: this.channel.name,
				searchTerm: this.$route.query.q,
				offset: this.offset,
			});
		},
		onShowMoreClick() {
			this.offset += 100;
			this.$store.commit("messageSearchInProgress", true);

			this.oldScrollTop = this.$refs.chat.scrollTop;
			this.oldChatHeight = this.$refs.chat.scrollHeight;

			socket.emit("search", {
				networkUuid: this.network.uuid,
				channelName: this.channel.name,
				searchTerm: this.$route.query.q,
				offset: this.offset + 1,
			});
		},
		jumpToBottom() {
			this.$nextTick(() => {
				const el = this.$refs.chat;
				el.scrollTop = el.scrollHeight;
			});
		},
		jump(message, id) {
			// TODO: Implement jumping to messages!
			// This is difficult because it means client will need to handle a potentially nonlinear message set
			// (loading IntersectionObserver both before AND after the messages)
			this.$router.push({
				name: "MessageList",
				params: {
					id: this.chan.id,
				},
				query: {
					focused: id,
				},
			});
		},
	},
};
</script>
