"use strict";

import {update as updateCursor} from "undate";

import socket from "./socket";
import store from "./store";

class Uploader {
	init() {
		this.xhr = null;
		this.fileQueue = [];
		this.tokenKeepAlive = null;

		document.addEventListener("dragenter", (e) => this.dragEnter(e));
		document.addEventListener("dragover", (e) => this.dragOver(e));
		document.addEventListener("dragleave", (e) => this.dragLeave(e));
		document.addEventListener("drop", (e) => this.drop(e));
		document.addEventListener("paste", (e) => this.paste(e));

		socket.on("upload:auth", (token) => this.uploadNextFileInQueue(token));
	}

	mounted() {
		this.overlay = document.getElementById("upload-overlay");
		this.uploadProgressbar = document.getElementById("upload-progressbar");
	}

	dragOver(event) {
		if (event.dataTransfer.types.includes("Files")) {
			// Prevent dragover event completely and do nothing with it
			// This stops the browser from trying to guess which cursor to show
			event.preventDefault();
		}
	}

	dragEnter(event) {
		// relatedTarget is the target where we entered the drag from
		// when dragging from another window, the target is null, otherwise its a DOM element
		if (!event.relatedTarget && event.dataTransfer.types.includes("Files")) {
			event.preventDefault();

			this.overlay.classList.add("is-dragover");
		}
	}

	dragLeave(event) {
		// If relatedTarget is null, that means we are no longer dragging over the page
		if (!event.relatedTarget) {
			event.preventDefault();
			this.overlay.classList.remove("is-dragover");
		}
	}

	drop(event) {
		if (!event.dataTransfer.types.includes("Files")) {
			return;
		}

		event.preventDefault();
		this.overlay.classList.remove("is-dragover");

		let files;

		if (event.dataTransfer.items) {
			files = Array.from(event.dataTransfer.items)
				.filter((item) => item.kind === "file")
				.map((item) => item.getAsFile());
		} else {
			files = Array.from(event.dataTransfer.files);
		}

		this.triggerUpload(files);
	}

	paste(event) {
		const items = event.clipboardData.items;
		const files = [];

		for (const item of items) {
			if (item.kind === "file") {
				files.push(item.getAsFile());
			}
		}

		if (files.length === 0) {
			return;
		}

		event.preventDefault();
		this.triggerUpload(files);
	}

	triggerUpload(files) {
		if (!files.length) {
			return;
		}

		if (!store.state.isConnected) {
			this.handleResponse({
				error: `You are currently disconnected, unable to initiate upload process.`,
			});

			return;
		}

		const wasQueueEmpty = this.fileQueue.length === 0;
		const maxFileSize = store.state.serverConfiguration.fileUploadMaxFileSize;

		for (const file of files) {
			if (maxFileSize > 0 && file.size > maxFileSize) {
				this.handleResponse({
					error: `File ${file.name} is over the maximum allowed size`,
				});

				continue;
			}

			this.fileQueue.push(file);
		}

		// if the queue was empty and we added some files to it, and there currently
		// is no upload in process, request a token to start the upload process
		if (wasQueueEmpty && this.xhr === null && this.fileQueue.length > 0) {
			this.requestToken();
		}
	}

	requestToken() {
		socket.emit("upload:auth");
	}

	setProgress(value) {
		this.uploadProgressbar.classList.toggle("upload-progressbar-visible", value > 0);
		this.uploadProgressbar.style.width = value + "%";
	}

	uploadNextFileInQueue(token) {
		const file = this.fileQueue.shift();

		// Tell the server that we are still upload to this token
		// so it does not become invalidated and fail the upload.
		// This issue only happens if The Lounge is proxied through other software
		// as it may buffer the upload before the upload request will be processed by The Lounge.
		this.tokenKeepAlive = setInterval(() => socket.emit("upload:ping", token), 40 * 1000);

		if (
			store.state.settings.uploadCanvas &&
			file.type.startsWith("image/") &&
			!file.type.includes("svg") &&
			file.type !== "image/gif"
		) {
			this.renderImage(file, (newFile) => this.performUpload(token, newFile));
		} else {
			this.performUpload(token, file);
		}
	}

	renderImage(file, callback) {
		const fileReader = new FileReader();

		fileReader.onabort = () => callback(file);
		fileReader.onerror = () => fileReader.abort();

		fileReader.onload = () => {
			const img = new Image();

			img.onerror = () => callback(file);

			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0);

				canvas.toBlob((blob) => {
					callback(new File([blob], file.name));
				}, file.type);
			};

			img.src = fileReader.result;
		};

		fileReader.readAsDataURL(file);
	}

	performUpload(token, file) {
		this.xhr = new XMLHttpRequest();

		this.xhr.upload.addEventListener(
			"progress",
			(e) => {
				const percent = Math.floor((e.loaded / e.total) * 1000) / 10;
				this.setProgress(percent);
			},
			false
		);

		this.xhr.onreadystatechange = () => {
			if (this.xhr.readyState === XMLHttpRequest.DONE) {
				let response;

				try {
					response = JSON.parse(this.xhr.responseText);
				} catch (err) {
					// This is just a safe guard and should not happen if server doesn't throw any errors.
					// Browsers break the HTTP spec by aborting the request without reading any response data,
					// if there is still data to be uploaded. Servers will only error in extreme cases like bad
					// authentication or server-side errors.
					response = {
						error: `Upload aborted: HTTP ${this.xhr.status}`,
					};
				}

				this.handleResponse(response);

				this.xhr = null;

				// this file was processed, if we still have files in the queue, upload the next one
				if (this.fileQueue.length > 0) {
					this.requestToken();
				}
			}
		};

		const formData = new FormData();
		formData.append("file", file);
		this.xhr.open("POST", `uploads/new/${token}`);
		this.xhr.send(formData);
	}

	handleResponse(response) {
		this.setProgress(0);

		if (this.tokenKeepAlive) {
			clearInterval(this.tokenKeepAlive);
			this.tokenKeepAlive = null;
		}

		if (response.error) {
			store.commit("currentUserVisibleError", response.error);
			return;
		}

		if (response.url) {
			this.insertUploadUrl(response.url);
		}
	}

	insertUploadUrl(url) {
		const fullURL = new URL(url, location).toString();
		const textbox = document.getElementById("input");
		const initStart = textbox.selectionStart;

		// Get the text before the cursor, and add a space if it's not in the beginning
		const headToCursor = initStart > 0 ? textbox.value.substr(0, initStart) + " " : "";

		// Get the remaining text after the cursor
		const cursorToTail = textbox.value.substr(initStart);

		// Construct the value until the point where we want the cursor to be
		const textBeforeTail = headToCursor + fullURL + " ";

		updateCursor(textbox, textBeforeTail + cursorToTail);

		// Set the cursor after the link and a space
		textbox.selectionStart = textbox.selectionEnd = textBeforeTail.length;
	}

	// TODO: This is a temporary hack while Vue porting is finalized
	abort() {
		this.fileQueue = [];

		if (this.xhr) {
			this.xhr.abort();
			this.xhr = null;
		}
	}
}

const instance = new Uploader();

export default {
	abort: () => instance.abort(),
	initialize: () => instance.init(),
	mounted: () => instance.mounted(),
	triggerUpload: (files) => instance.triggerUpload(files),
};
