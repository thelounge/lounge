<template>
	<div id="confirm-dialog-overlay" :class="{opened: data !== null}">
		<div v-if="data !== null" id="confirm-dialog">
			<div class="confirm-text">
				<div class="confirm-text-title">{{ data.title }}</div>
				<p v-html="data.text"></p>
			</div>
			<div class="confirm-buttons">
				<button class="btn btn-cancel" @click="close(false)">Cancel</button>
				<button class="btn btn-danger" @click="close(true)">{{ data.button }}</button>
			</div>
		</div>
	</div>
</template>

<style>
#confirm-dialog {
	background: var(--body-bg-color);
	color: #fff;
	margin: 10px;
	border-radius: 5px;
	max-width: 500px;
}

#confirm-dialog .confirm-text {
	padding: 15px;
	user-select: text;
}

#confirm-dialog .confirm-text-title {
	font-size: 20px;
	font-weight: 700;
	margin-bottom: 10px;
}

#confirm-dialog .confirm-buttons {
	display: flex;
	justify-content: flex-end;
	padding: 15px;
	background: rgba(0, 0, 0, 0.3);
}

#confirm-dialog .confirm-buttons .btn {
	margin-bottom: 0;
	margin-left: 10px;
}

#confirm-dialog .confirm-buttons .btn-cancel {
	border-color: transparent;
}
</style>

<script>
import eventbus from "../js/eventbus";
import socket from "../js/socket";

export default {
	name: "ConfirmDialog",
	data() {
		return {
			data: null,
			callback: null,
		};
	},
	mounted() {
		eventbus.on("escapekey", this.close);
		eventbus.on("confirm-dialog", this.open);
		socket.on("confirm-dialog", this.open);
	},
	destroyed() {
		eventbus.off("escapekey", this.close);
		eventbus.off("confirm-dialog", this.open);
		socket.off("confirm-dialog", this.open);
	},
	methods: {
		open(data, callback) {
			if (data.emit) {
				callback = (result) => {
					if (result) {
						socket.emit(data.emit.target, data.emit.data);
					}
				};
			}

			this.data = data;
			this.callback = callback;
		},
		close(result) {
			this.data = null;

			if (this.callback) {
				this.callback(!!result);
			}
		},
	},
};
</script>
