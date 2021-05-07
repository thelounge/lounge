"use strict";

const cheerio = require("cheerio");
const contentDisposition = require("content-disposition");
const got = require("got");
const URL = require("url").URL;
const mime = require("mime-types");
const Helper = require("../../helper");
const {findLinksWithSchema} = require("../../../client/js/helpers/ircmessageparser/findLinks");
const storage = require("../storage");
const currentFetchPromises = new Map();
const imageTypeRegex = /^image\/.+/;
const mediaTypeRegex = /^(audio|video)\/.+/;
const path = require("path");

module.exports = function (client, chan, msg, cleanText) {
	if (!Helper.config.prefetch) {
		return;
	}

	msg.previews = findLinksWithSchema(cleanText).reduce((cleanLinks, link) => {
		const url = normalizeURL(link.link);

		// If the URL is invalid and cannot be normalized, don't fetch it
		if (url === null) {
			return cleanLinks;
		}

		// If there are too many urls in this message, only fetch first X valid links
		if (cleanLinks.length > 4) {
			return cleanLinks;
		}

		// Do not fetch duplicate links twice
		if (cleanLinks.some((l) => l.link === link.link)) {
			return cleanLinks;
		}

		const preview = {
			type: "loading",
			head: "",
			body: "",
			thumb: "",
			size: -1,
			link: link.link, // Send original matched link to the client
			shown: null,
		};

		cleanLinks.push(preview);

		fetch(url, {
			accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			language: client.config.browser.language,
		})
			.then((res) => {
				parse(msg, chan, preview, res, client);
			})
			.catch((err) => {
				preview.type = "error";
				preview.error = "message";
				preview.message = err.message;
				emitPreview(client, chan, msg, preview);
			});

		return cleanLinks;
	}, []);
};

function parseHtml(preview, res, client) {
	return new Promise((resolve) => {
		const $ = cheerio.load(res.data);

		return parseHtmlMedia($, preview, client)
			.then((newRes) => resolve(newRes))
			.catch(() => {
				preview.type = "link";
				preview.head =
					$('meta[property="og:title"]').attr("content") ||
					$("head > title, title").first().text() ||
					"";
				preview.body =
					$('meta[property="og:description"]').attr("content") ||
					$('meta[name="description"]').attr("content") ||
					"";

				if (preview.head.length) {
					preview.head = preview.head.substr(0, 100);
				}

				if (preview.body.length) {
					preview.body = preview.body.substr(0, 300);
				}

				if (!Helper.config.prefetchStorage && Helper.config.disableMediaPreview) {
					resolve(res);
					return;
				}

				let thumb =
					$('meta[property="og:image"]').attr("content") ||
					$('meta[name="twitter:image:src"]').attr("content") ||
					$('link[rel="image_src"]').attr("href") ||
					"";

				// Make sure thumbnail is a valid and absolute url
				if (thumb.length) {
					thumb = normalizeURL(thumb, preview.link) || "";
				}

				// Verify that thumbnail pic exists and is under allowed size
				if (thumb.length) {
					fetch(thumb, {language: client.config.browser.language})
						.then((resThumb) => {
							if (
								resThumb !== null &&
								imageTypeRegex.test(resThumb.type) &&
								resThumb.size <= Helper.config.prefetchMaxImageSize * 1024
							) {
								preview.thumbActualUrl = thumb;
							}

							resolve(resThumb);
						})
						.catch(() => resolve(null));
				} else {
					resolve(res);
				}
			});
	});
}

function parseHtmlMedia($, preview, client) {
	return new Promise((resolve, reject) => {
		if (Helper.config.disableMediaPreview) {
			reject();
			return;
		}

		let foundMedia = false;
		const openGraphType = $('meta[property="og:type"]').attr("content");

		// Certain news websites may include video and audio tags,
		// despite actually being an article (as indicated by og:type).
		// If there is og:type tag, we will only select video or audio if it matches
		if (
			openGraphType &&
			!openGraphType.startsWith("video") &&
			!openGraphType.startsWith("music")
		) {
			reject();
			return;
		}

		["video", "audio"].forEach((type) => {
			if (foundMedia) {
				return;
			}

			$(`meta[property="og:${type}:type"]`).each(function (i) {
				const mimeType = $(this).attr("content");

				if (mediaTypeRegex.test(mimeType)) {
					// If we match a clean video or audio tag, parse that as a preview instead
					let mediaUrl = $($(`meta[property="og:${type}"]`).get(i)).attr("content");

					// Make sure media is a valid url
					mediaUrl = normalizeURL(mediaUrl, preview.link, true);

					// Make sure media is a valid url
					if (!mediaUrl) {
						return;
					}

					foundMedia = true;

					fetch(mediaUrl, {
						accept:
							type === "video"
								? "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5"
								: "audio/webm, audio/ogg, audio/wav, audio/*;q=0.9, application/ogg;q=0.7, video/*;q=0.6; */*;q=0.5",
						language: client.config.browser.language,
					})
						.then((resMedia) => {
							if (resMedia === null || !mediaTypeRegex.test(resMedia.type)) {
								return reject();
							}

							preview.type = type;
							preview.media = mediaUrl;
							preview.mediaType = resMedia.type;

							resolve(resMedia);
						})
						.catch(reject);

					return false;
				}
			});
		});

		if (!foundMedia) {
			reject();
		}
	});
}

function parse(msg, chan, preview, res, client) {
	let promise;

	preview.size = res.size;
	preview.filename = res.filename;

	switch (res.type) {
		case "text/html":
			preview.size = -1;
			promise = parseHtml(preview, res, client);
			break;

		case "text/plain":
			preview.type = "link";
			preview.body = res.data.toString().substr(0, 300);
			break;

		case "image/png":
		case "image/gif":
		case "image/jpg":
		case "image/jpeg":
		case "image/webp":
		case "image/avif":
			if (!Helper.config.prefetchStorage && Helper.config.disableMediaPreview) {
				return removePreview(msg, preview);
			}

			if (res.size > Helper.config.prefetchMaxImageSize * 1024) {
				preview.type = "error";
				preview.error = "image-too-big";
				preview.maxSize = Helper.config.prefetchMaxImageSize * 1024;
			} else {
				preview.type = "image";
				preview.thumbActualUrl = preview.link;
			}

			break;

		case "audio/midi":
		case "audio/mpeg":
		case "audio/mpeg3":
		case "audio/ogg":
		case "audio/wav":
		case "audio/x-wav":
		case "audio/x-mid":
		case "audio/x-midi":
		case "audio/x-mpeg":
		case "audio/x-mpeg-3":
		case "audio/flac":
		case "audio/x-flac":
			if (!preview.link.startsWith("https://")) {
				break;
			}

			if (Helper.config.disableMediaPreview) {
				return removePreview(msg, preview);
			}

			preview.type = "audio";
			preview.media = preview.link;
			preview.mediaType = res.type;

			break;

		case "video/webm":
		case "video/ogg":
		case "video/mp4":
			if (!preview.link.startsWith("https://")) {
				break;
			}

			if (Helper.config.disableMediaPreview) {
				return removePreview(msg, preview);
			}

			preview.type = "video";
			preview.media = preview.link;
			preview.mediaType = res.type;

			break;

		default:
			return removePreview(msg, preview);
	}

	if (!promise) {
		return handlePreview(client, chan, msg, preview, res);
	}

	promise.then((newRes) => handlePreview(client, chan, msg, preview, newRes));
}

function handlePreview(client, chan, msg, preview, res) {
	const thumb = preview.thumbActualUrl || "";
	delete preview.thumbActualUrl;

	if (!thumb.length || !Helper.config.prefetchStorage) {
		preview.thumb = thumb;
		return emitPreview(client, chan, msg, preview);
	}

	// Get the correct file extension for the provided content-type
	// This is done to prevent user-input being stored in the file name (extension)
	const extension = mime.extension(res.type);

	if (!extension) {
		// For link previews, drop the thumbnail
		// For other types, do not display preview at all
		if (preview.type !== "link") {
			return removePreview(msg, preview);
		}

		return emitPreview(client, chan, msg, preview);
	}

	storage.store(res.data, extension, (uri) => {
		preview.thumb = uri;

		emitPreview(client, chan, msg, preview);
	});
}

function emitPreview(client, chan, msg, preview) {
	// If there is no title but there is preview or description, set title
	// otherwise bail out and show no preview
	if (!preview.head.length && preview.type === "link") {
		if (preview.thumb.length || preview.body.length) {
			preview.head = "Untitled page";
		} else {
			return removePreview(msg, preview);
		}
	}

	client.emit("msg:preview", {
		id: msg.id,
		chan: chan.id,
		preview: preview,
	});
}

function removePreview(msg, preview) {
	// If a preview fails to load, remove the link from msg object
	// So that client doesn't attempt to display an preview on page reload
	const index = msg.previews.indexOf(preview);

	if (index > -1) {
		msg.previews.splice(index, 1);
	}
}

function getRequestHeaders(headers) {
	const formattedHeaders = {
		// Certain websites like Amazon only add <meta> tags to known bots,
		// lets pretend to be them to get the metadata
		"User-Agent":
			"Mozilla/5.0 (compatible; The Lounge IRC Client; +https://github.com/thelounge/thelounge)" +
			" facebookexternalhit/1.1 Twitterbot/1.0",
		Accept: headers.accept || "*/*",
		"X-Purpose": "preview",
	};

	if (headers.language) {
		formattedHeaders["Accept-Language"] = headers.language;
	}

	return formattedHeaders;
}

function fetch(uri, headers) {
	// Stringify the object otherwise the objects won't compute to the same value
	const cacheKey = JSON.stringify([uri, headers]);
	let promise = currentFetchPromises.get(cacheKey);

	if (promise) {
		return promise;
	}

	promise = new Promise((resolve, reject) => {
		let buffer = Buffer.from("");
		let contentLength = 0;
		let contentType;
		let filename;
		let limit = Helper.config.prefetchMaxImageSize * 1024;

		try {
			const gotStream = got.stream(uri, {
				retry: 0,
				timeout: 5000,
				headers: getRequestHeaders(headers),
				https: {
					rejectUnauthorized: false,
				},
			});

			gotStream
				.on("response", function (res) {
					contentLength = parseInt(res.headers["content-length"], 10) || 0;
					contentType = res.headers["content-type"];
					filename =
						"content-disposition" in res.headers
							? contentDisposition.parse(res.headers["content-disposition"])
									.parameters.filename || null
							: null;

					if (filename === null) {
						const basename = decodeURI(path.basename(new URL(uri).pathname));
						filename = basename.indexOf(".") > 0 ? basename : null;
					}

					if (imageTypeRegex.test(contentType)) {
						// response is an image
						// if Content-Length header reports a size exceeding the prefetch limit, abort fetch
						if (contentLength > limit) {
							gotStream.destroy();
						}
					} else if (mediaTypeRegex.test(contentType)) {
						// We don't need to download the file any further after we received content-type header
						gotStream.destroy();
					} else {
						// if not image, limit download to the max search size, since we need only meta tags
						// twitter.com sends opengraph meta tags within ~20kb of data for individual tweets, the default is set to 50.
						// for sites like Youtube the og tags are in the first 300K and hence this is configurable by the admin
						limit =
							"prefetchMaxSearchSize" in Helper.config
								? Helper.config.prefetchMaxSearchSize * 1024
								: // set to the previous size if config option is unset
								  50 * 1024;
					}
				})
				.on("error", (e) => reject(e))
				.on("data", (data) => {
					buffer = Buffer.concat([buffer, data], buffer.length + data.length);

					if (buffer.length >= limit) {
						gotStream.destroy();
					}
				})
				.on("end", () => gotStream.destroy())
				.on("close", () => {
					let type = "";

					// If we downloaded more data then specified in Content-Length, use real data size
					const size = contentLength > buffer.length ? contentLength : buffer.length;

					if (contentType) {
						type = contentType.split(/ *; */).shift();
					}

					resolve({data: buffer, type, size, filename});
				});
		} catch (e) {
			return reject(e);
		}
	});

	const removeCache = () => currentFetchPromises.delete(cacheKey);

	promise.then(removeCache).catch(removeCache);

	currentFetchPromises.set(cacheKey, promise);

	return promise;
}

function normalizeURL(link, baseLink, disallowHttp = false) {
	try {
		const url = new URL(link, baseLink);

		// Only fetch http and https links
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return null;
		}

		if (disallowHttp && url.protocol === "http:") {
			return null;
		}

		// Do not fetch links without hostname or ones that contain authorization
		if (!url.hostname || url.username || url.password) {
			return null;
		}

		// Drop hash from the url, if any
		url.hash = "";

		return url.toString();
	} catch (e) {
		// if an exception was thrown, the url is not valid
	}

	return null;
}
