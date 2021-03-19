<template>
	<div id="input-dialog-overlay" :class="{opened: data !== null}">
		<div v-if="data !== null" id="input-dialog">
			<div class="input-text">
				<div class="input-text-title">{{ data.title }}</div>
				<p>{{ data.text }}</p>
				<form
					id="inputform"
					class="inputdialogform"
					method="post"
					action=""
					@submit.prevent="onSubmit"
				>
					<textarea
						id="ReasonData"
						ref="ReasonData"
						class="input inputDialogBox"
						:placeholder="data.placeholder"
						type="text"
						:value="reason"
						@input="setReason"
						@keypress.enter.exact.prevent="close"
					/>
				</form>
			</div>
			<div class="input-buttons">
				<button class="btn btn-cancel" @click="close()">Cancel</button>
				<button class="btn btn-confirm" @click="close(true)">{{ data.button }}</button>
			</div>
		</div>
	</div>
</template>

<style>
#input-dialog {
	background: var(--body-bg-color);
	color: #fff;
	margin: 10px;
	border-radius: 5px;
	max-width: 500px;
}
.inputDialogBox textarea.input {
	border: none;
	resize: none;
	padding: 0;
	margin: 0;
	text-align: center;
	line-height: 10px;
}
#inputform {
	padding: 0;
}
#input-dialog .input-text {
	padding: 15px;
	user-select: text;
}
#input-dialog .input-text-title {
	font-size: 20px;
	font-weight: 700;
	margin-bottom: 10px;
}
#input-dialog .input-buttons {
	display: flex;
	justify-content: flex-end;
	padding: 15px;
	background: rgba(0, 0, 0, 0.3);
}
#input-dialog .input-buttons .btn {
	margin-bottom: 0;
	margin-left: 10px;
}
#input-dialog .input-buttons .btn-cancel {
	border-color: transparent;
}
</style>

<script>
import eventbus from "../js/eventbus";
export default {
	name: "InputDialog",
	data() {
		return {
			data: null,
			callback: null,
			reason: null,
		};
	},
	mounted() {
		eventbus.on("escapekey", this.close);
		eventbus.on("input-dialog", this.open);
	},
	destroyed() {
		eventbus.off("escapekey", this.close);
		eventbus.off("input-dialog", this.open);
	},
	methods: {
		setReason(e) {
			this.reason = e.target.value;
			this.setInputSize();
		},
		setInputSize() {
			this.$nextTick(() => {
				const style = window.getComputedStyle(this.$refs.ReasonData);
				const lineHeight = parseFloat(style.lineHeight, 10) || 1;
				// Start by resetting height before computing as scrollHeight does not
				// decrease when deleting characters
				this.$refs.ReasonData.style.height = "";
				// Use scrollHeight to calculate how many lines there are in input, and ceil the value
				// because some browsers tend to incorrently round the values when using high density
				// displays or using page zoom feature
				this.$refs.ReasonData.style.height =
					Math.ceil(this.$refs.ReasonData.scrollHeight / lineHeight) * lineHeight + "px";
			});
		},
		open(data, callback) {
			this.data = data;
			this.callback = callback;
			this.result = null;
			this.reason = null;
		},
		close(canceled) {
			this.data = null;

			/* Check if action was canceled */
			if (!canceled === true) {
				return false;
			}

			/* Return data */
			if (this.callback) {
				this.callback(this.reason);
			}
		},
	},
};
</script>
