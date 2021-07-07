<template>
	<div ref="chat" class="chat" tabindex="-1">
		<div v-show="channel.moreHistoryAvailable" class="show-more">
			<button
				ref="loadMoreButton"
				:disabled="channel.historyLoading || !$store.state.isConnected"
				class="btn"
				@click="onShowMoreClick"
			>
				<span v-if="channel.historyLoading">Loading…</span>
				<span v-else>Show older messages</span>
			</button>
		</div>
		<div
			class="messages"
			role="log"
			aria-live="polite"
			aria-relevant="additions"
			@copy="onCopy"
		>
			<template v-for="(message, id) in condensedMessages">
				<DateMarker
					v-if="shouldDisplayDateMarker(message, id)"
					:key="message.id + '-date'"
					:message="message"
					:focused="message.id == focused"
				/>
				<div
					v-if="shouldDisplayUnreadMarker(message.id)"
					:key="message.id + '-unread'"
					class="unread-marker"
				>
					<span class="tooltipped tooltipped-n" aria-label="Dismiss">
						<span class="unread-marker-text" @click="clearUnreadMarker" />
					</span>
				</div>

				<MessageCondensed
					v-if="message.type === 'condensed'"
					:key="message.messages[0].id"
					:network="network"
					:keep-scroll-position="keepScrollPosition"
					:messages="message.messages"
					:focused="message.id == focused"
				/>
				<Message
					v-else
					:key="message.id"
					:channel="channel"
					:network="network"
					:message="message"
					:keep-scroll-position="keepScrollPosition"
					:is-previous-source="isPreviousSource(message, id)"
					:focused="message.id == focused"
					@toggle-link-preview="onLinkPreviewToggle"
				/>
			</template>
		</div>
	</div>
</template>

<script>
const constants = require("../js/constants");
import eventbus from "../js/eventbus";
import clipboard from "../js/clipboard";
import socket from "../js/socket";
import Message from "./Message.vue";
import MessageCondensed from "./MessageCondensed.vue";
import DateMarker from "./DateMarker.vue";

let unreadMarkerShown = false;

export default {
	name: "MessageList",
	components: {
		Message,
		MessageCondensed,
		DateMarker,
	},
	props: {
		network: Object,
		channel: Object,
		focused: String,
	},
	computed: {
		condensedMessages() {
			if (this.channel.type !== "channel") {
				return this.channel.messages;
			}

			// If actions are hidden, just return a message list with them excluded
			if (this.$store.state.settings.statusMessages === "hidden") {
				return this.channel.messages.filter(
					(message) => !constants.condensedTypes.has(message.type)
				);
			}

			// If actions are not condensed, just return raw message list
			if (this.$store.state.settings.statusMessages !== "condensed") {
				return this.channel.messages;
			}

			const condensed = [];
			let lastCondensedContainer = null;

			for (const message of this.channel.messages) {
				// If this message is not condensable, or its an action affecting our user,
				// then just append the message to container and be done with it
				if (
					message.self ||
					message.highlight ||
					!constants.condensedTypes.has(message.type)
				) {
					lastCondensedContainer = null;

					condensed.push(message);

					continue;
				}

				if (lastCondensedContainer === null) {
					lastCondensedContainer = {
						time: message.time,
						type: "condensed",
						messages: [],
					};

					condensed.push(lastCondensedContainer);
				}

				lastCondensedContainer.messages.push(message);

				// Set id of the condensed container to last message id,
				// which is required for the unread marker to work correctly
				lastCondensedContainer.id = message.id;

				// If this message is the unread boundary, create a split condensed container
				if (message.id === this.channel.firstUnread) {
					lastCondensedContainer = null;
				}
			}

			return condensed;
		},
	},
	watch: {
		"channel.id"() {
			this.channel.scrolledToBottom = true;

			// Re-add the intersection observer to trigger the check again on channel switch
			// Otherwise if last channel had the button visible, switching to a new channel won't trigger the history
			if (this.historyObserver) {
				this.historyObserver.unobserve(this.$refs.loadMoreButton);
				this.historyObserver.observe(this.$refs.loadMoreButton);
			}
		},
		"channel.messages"() {
			this.keepScrollPosition();
		},
		"channel.pendingMessage"() {
			this.$nextTick(() => {
				// Keep the scroll stuck when input gets resized while typing
				this.keepScrollPosition();
			});
		},
	},
	created() {
		this.$nextTick(() => {
			if (!this.$refs.chat) {
				return;
			}

			if (window.IntersectionObserver) {
				this.historyObserver = new window.IntersectionObserver(this.onLoadButtonObserved, {
					root: this.$refs.chat,
				});
			}

			this.jumpToBottom();
		});
	},
	mounted() {
		this.$refs.chat.addEventListener("scroll", this.handleScroll, {passive: true});

		eventbus.on("resize", this.handleResize);

		this.$nextTick(() => {
			if (this.historyObserver) {
				this.historyObserver.observe(this.$refs.loadMoreButton);
			}
		});
	},
	beforeUpdate() {
		unreadMarkerShown = false;
	},
	beforeDestroy() {
		eventbus.off("resize", this.handleResize);
		this.$refs.chat.removeEventListener("scroll", this.handleScroll);
	},
	destroyed() {
		if (this.historyObserver) {
			this.historyObserver.disconnect();
		}
	},
	methods: {
		shouldDisplayDateMarker(message, id) {
			const previousMessage = this.condensedMessages[id - 1];

			if (!previousMessage) {
				return true;
			}

			const oldDate = new Date(previousMessage.time);
			const newDate = new Date(message.time);

			return (
				oldDate.getDate() !== newDate.getDate() ||
				oldDate.getMonth() !== newDate.getMonth() ||
				oldDate.getFullYear() !== newDate.getFullYear()
			);
		},
		shouldDisplayUnreadMarker(id) {
			if (!unreadMarkerShown && id > this.channel.firstUnread) {
				unreadMarkerShown = true;
				return true;
			}

			return false;
		},
		isPreviousSource(currentMessage, id) {
			const previousMessage = this.condensedMessages[id - 1];
			return (
				previousMessage &&
				currentMessage.type === "message" &&
				previousMessage.type === "message" &&
				previousMessage.from &&
				currentMessage.from.nick === previousMessage.from.nick
			);
		},
		onCopy() {
			clipboard(this.$el);
		},
		onLinkPreviewToggle(preview, message) {
			this.keepScrollPosition();

			// Tell the server we're toggling so it remembers at page reload
			socket.emit("msg:preview:toggle", {
				target: this.channel.id,
				msgId: message.id,
				link: preview.link,
				shown: preview.shown,
			});
		},
		onShowMoreClick() {
			if (!this.$store.state.isConnected) {
				return;
			}

			let lastMessage = -1;

			// Find the id of first message that isn't showInActive
			// If showInActive is set, this message is actually in another channel
			for (const message of this.channel.messages) {
				if (!message.showInActive) {
					lastMessage = message.id;
					break;
				}
			}

			this.channel.historyLoading = true;

			socket.emit("more", {
				target: this.channel.id,
				lastId: lastMessage,
				condensed: this.$store.state.settings.statusMessages !== "shown",
			});
		},
		onLoadButtonObserved(entries) {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) {
					return;
				}

				this.onShowMoreClick();
			});
		},
		keepScrollPosition() {
			// If we are already waiting for the next tick to force scroll position,
			// we have no reason to perform more checks and set it again in the next tick
			if (this.isWaitingForNextTick) {
				return;
			}

			const el = this.$refs.chat;

			if (!el) {
				return;
			}

			if (!this.channel.scrolledToBottom) {
				if (this.channel.historyLoading) {
					const heightOld = el.scrollHeight - el.scrollTop;

					this.isWaitingForNextTick = true;
					this.$nextTick(() => {
						this.isWaitingForNextTick = false;
						this.skipNextScrollEvent = true;
						el.scrollTop = el.scrollHeight - heightOld;
					});
				}

				return;
			}

			this.isWaitingForNextTick = true;
			this.$nextTick(() => {
				this.isWaitingForNextTick = false;
				this.jumpToBottom();
			});
		},
		handleScroll() {
			// Setting scrollTop also triggers scroll event
			// We don't want to perform calculations for that
			if (this.skipNextScrollEvent) {
				this.skipNextScrollEvent = false;
				return;
			}

			const el = this.$refs.chat;

			if (!el) {
				return;
			}

			this.channel.scrolledToBottom = el.scrollHeight - el.scrollTop - el.offsetHeight <= 30;
		},
		handleResize() {
			// Keep message list scrolled to bottom on resize
			if (this.channel.scrolledToBottom) {
				this.jumpToBottom();
			}
		},
		jumpToBottom() {
			this.skipNextScrollEvent = true;
			this.channel.scrolledToBottom = true;

			const el = this.$refs.chat;
			el.scrollTop = el.scrollHeight;
		},
		clearUnreadMarker() {
			this.channel.firstUnread = this.channel.messages[this.channel.messages.length - 1].id;
		},
	},
};
</script>
