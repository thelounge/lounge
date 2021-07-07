<template>
	<div
		v-if="link.shown"
		v-show="link.sourceLoaded || link.type === 'link'"
		ref="container"
		class="preview"
		dir="ltr"
	>
		<div
			ref="content"
			:class="['toggle-content', 'toggle-type-' + link.type, {opened: isContentShown}]"
		>
			<template v-if="link.type === 'link'">
				<a
					v-if="link.thumb"
					v-show="link.sourceLoaded"
					:href="link.link"
					class="toggle-thumbnail"
					target="_blank"
					rel="noopener"
					@click="onThumbnailClick"
				>
					<img
						:src="link.thumb"
						decoding="async"
						alt=""
						class="thumb"
						@error="onThumbnailError"
						@abort="onThumbnailError"
						@load="onPreviewReady"
					/>
				</a>
				<div class="toggle-text" dir="auto">
					<div class="head">
						<div class="overflowable">
							<a
								:href="link.link"
								:title="link.head"
								target="_blank"
								rel="noopener"
								>{{ link.head }}</a
							>
						</div>

						<button
							v-if="showMoreButton"
							:aria-expanded="isContentShown"
							:aria-label="moreButtonLabel"
							dir="auto"
							class="more"
							@click="onMoreClick"
						>
							<span class="more-caret" />
						</button>
					</div>

					<div class="body overflowable">
						<a :href="link.link" :title="link.body" target="_blank" rel="noopener">{{
							link.body
						}}</a>
					</div>
				</div>
			</template>
			<template v-else-if="link.type === 'image'">
				<a
					:href="link.link"
					class="toggle-thumbnail"
					target="_blank"
					rel="noopener"
					@click="onThumbnailClick"
				>
					<img
						v-show="link.sourceLoaded"
						:src="link.thumb"
						decoding="async"
						alt=""
						@load="onPreviewReady"
					/>
				</a>
			</template>
			<template v-else-if="link.type === 'video'">
				<video
					v-show="link.sourceLoaded"
					preload="metadata"
					controls
					@canplay="onPreviewReady"
				>
					<source :src="link.media" :type="link.mediaType" />
				</video>
			</template>
			<template v-else-if="link.type === 'audio'">
				<audio
					v-show="link.sourceLoaded"
					controls
					preload="metadata"
					@canplay="onPreviewReady"
				>
					<source :src="link.media" :type="link.mediaType" />
				</audio>
			</template>
			<template v-else-if="link.type === 'error'">
				<em v-if="link.error === 'image-too-big'">
					This image is larger than {{ imageMaxSize }} and cannot be previewed.
					<a :href="link.link" target="_blank" rel="noopener">Click here</a>
					to open it in a new window.
				</em>
				<template v-else-if="link.error === 'message'">
					<div>
						<em>
							A preview could not be loaded.
							<a :href="link.link" target="_blank" rel="noopener">Click here</a>
							to open it in a new window.
						</em>
						<br />
						<pre class="prefetch-error">{{ link.message }}</pre>
					</div>

					<button
						:aria-expanded="isContentShown"
						:aria-label="moreButtonLabel"
						class="more"
						@click="onMoreClick"
					>
						<span class="more-caret" />
					</button>
				</template>
			</template>
		</div>
	</div>
</template>

<script>
import eventbus from "../js/eventbus";
import friendlysize from "../js/helpers/friendlysize";
import messageMatchFilters from "../js/helpers/messageMatchFilters";

export default {
	name: "LinkPreview",
	props: {
		link: Object,
		keepScrollPosition: Function,
		channel: Object,
	},
	data() {
		return {
			showMoreButton: false,
			isContentShown: false,
		};
	},
	computed: {
		moreButtonLabel() {
			return this.isContentShown ? "Less" : "More";
		},
		imageMaxSize() {
			if (!this.link.maxSize) {
				return;
			}

			return friendlysize(this.link.maxSize);
		},
	},
	watch: {
		"link.type"() {
			this.updateShownState();
			this.onPreviewUpdate();
		},
	},
	created() {
		this.updateShownState();
	},
	mounted() {
		eventbus.on("resize", this.handleResize);

		this.onPreviewUpdate();
	},
	beforeDestroy() {
		eventbus.off("resize", this.handleResize);
	},
	destroyed() {
		// Let this preview go through load/canplay events again,
		// Otherwise the browser can cause a resize on video elements
		this.link.sourceLoaded = false;
	},
	methods: {
		onPreviewUpdate() {
			// Don't display previews while they are loading on the server
			if (this.link.type === "loading") {
				return;
			}

			// Error does not have any media to render
			if (this.link.type === "error") {
				this.onPreviewReady();
			}

			// If link doesn't have a thumbnail, render it
			if (this.link.type === "link") {
				this.handleResize();
				this.keepScrollPosition();
			}
		},
		onPreviewReady() {
			this.$set(this.link, "sourceLoaded", true);

			this.keepScrollPosition();

			if (this.link.type === "link") {
				this.handleResize();
			}
		},
		onThumbnailError() {
			// If thumbnail fails to load, hide it and show the preview without it
			this.link.thumb = "";
			this.onPreviewReady();
		},
		onThumbnailClick(e) {
			e.preventDefault();

			const imageViewer = this.$root.$refs.app.$refs.imageViewer;
			imageViewer.channel = this.channel;
			imageViewer.link = this.link;
		},
		onMoreClick() {
			this.isContentShown = !this.isContentShown;
			this.keepScrollPosition();
		},
		handleResize() {
			this.$nextTick(() => {
				if (!this.$refs.content) {
					return;
				}

				this.showMoreButton =
					this.$refs.content.offsetWidth >= this.$refs.container.offsetWidth;
			});
		},
		shouldHidePreview() {
			return messageMatchFilters(
				this.$parent.message.text,
				this.$store.state.settings.hidePreviewFilters
			);
		},
		updateShownState() {
			// User has manually toggled the preview, or the message has been filtered
			// by the preview filter settings, do not apply default
			if (this.link.shown !== null || this.shouldHidePreview()) {
				return;
			}

			let defaultState = false;

			switch (this.link.type) {
				case "error":
					// Collapse all errors by default unless its a message about image being too big
					if (this.link.error === "image-too-big") {
						defaultState = this.$store.state.settings.media;
					}

					break;

				case "link":
					defaultState = this.$store.state.settings.links;
					break;

				default:
					defaultState = this.$store.state.settings.media;
			}

			this.link.shown = defaultState;
		},
	},
};
</script>
