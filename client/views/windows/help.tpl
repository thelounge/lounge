<div class="header">
	<button class="lt" aria-label="Toggle channel list"></button>
</div>
<div class="container">
	<h1 class="title">Help</h1>

	<h2>
		<small class="pull-right">
			v{{version}}
			(<a href="#" id="view-changelog" data-target="#changelog">release notes</a>)
		</small>
		About The Lounge
	</h2>

	<div class="about">
		<div id="version-checker" class="hidden"></div>

		{{#if gitCommit}}
			<p>
				The Lounge is running from source
				(<a href="https://github.com/thelounge/lounge/tree/{{gitCommit}}" target="_blank" rel="noopener">commit <code>{{gitCommit}}</code></a>).
			</p>

			<ul>
				<li>
					Compare
					<a href="https://github.com/thelounge/lounge/compare/{{gitCommit}}...master" target="_blank" rel="noopener">between <code>{{gitCommit}}</code> and <code>master</code></a>
					to see what you are missing
				</li>
				<li>
					Compare
					<a href="https://github.com/thelounge/lounge/compare/{{version}}...{{gitCommit}}" target="_blank" rel="noopener">between <code>{{version}}</code> and <code>{{gitCommit}}</code></a>
					to see your local changes</li>
			</ul>
		{{/if}}

		<p>
			<a href="https://thelounge.github.io/" target="_blank" rel="noopener" class="website-link">Website</a>
		</p>
		<p>
			<a href="https://thelounge.github.io/docs/" target="_blank" rel="noopener" class="documentation-link">Documentation</a>
		</p>
		<p>
			<a href="https://github.com/thelounge/lounge/issues/new" target="_blank" rel="noopener" class="report-issue-link">Report an issue…</a>
		</p>
	</div>

	<h2>Keyboard Shortcuts</h2>

	<div class="help-item">
		<div class="subject">
			<kbd class="key-all">Ctrl</kbd><kbd class="key-apple">⌘</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd>
		</div>
		<div class="description">
			<p>Switch to the previous/next window in the channel list.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<kbd class="key-all">Ctrl</kbd><kbd class="key-apple">⌘</kbd> + <kbd>K</kbd>
		</div>
		<div class="description">
			<p>
				Mark any text typed after this shortcut to be colored. After
				hitting this shortcut, enter an integer in the range
				<code>0—15</code> to select the desired color, or use the
				autocompletion menu to choose a color name (see below).
			</p>
			<p>
				Background color can be specified by putting a comma and
				another integer in the range <code>0—15</code> after the
				foreground color number (autocompletion works too).
			</p>
			<p>
				A color reference can be found
				<a href="https://modern.ircdocs.horse/formatting.html#colors" target="_blank" rel="noopener">here</a>.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<kbd class="key-all">Ctrl</kbd><kbd class="key-apple">⌘</kbd> + <kbd>B</kbd>
		</div>
		<div class="description">
			<p>Mark all text typed after this shortcut as bold.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<kbd class="key-all">Ctrl</kbd><kbd class="key-apple">⌘</kbd> + <kbd>U</kbd>
		</div>
		<div class="description">
			<p>Mark all text typed after this shortcut as underlined.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<kbd class="key-all">Ctrl</kbd><kbd class="key-apple">⌘</kbd> + <kbd>I</kbd>
		</div>
		<div class="description">
			<p>Mark all text typed after this shortcut as italics.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<kbd class="key-all">Ctrl</kbd><kbd class="key-apple">⌘</kbd> + <kbd>S</kbd>
		</div>
		<div class="description">
			<p>Mark all text typed after this shortcut as struck through.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<kbd class="key-all">Ctrl</kbd><kbd class="key-apple">⌘</kbd> + <kbd>M</kbd>
		</div>
		<div class="description">
			<p>Mark all text typed after this shortcut as monospaced.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<kbd class="key-all">Ctrl</kbd><kbd class="key-apple">⌘</kbd> + <kbd>O</kbd>
		</div>
		<div class="description">
			<p>
				Mark all text typed after this shortcut to be reset to its
				original formatting.
			</p>
		</div>
	</div>

	<h2>Autocompletion</h2>

	<p>
		To auto-complete nicknames, channels, commands, and emoji, type one of the characters below to open
		a suggestion list. Use the <kbd>↑</kbd> and <kbd>↓</kbd> keys to highlight an item, and insert it by
		pressing <kbd>Tab</kbd> or <kbd>Enter</kbd> (or by clicking the desired item).
	</p>
	<p>
		Autocompletion can be disabled in settings.
	</p>

	<div class="help-item">
		<div class="subject">
			<code>@</code>
		</div>
		<div class="description">
			<p>Nickname</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>#</code>
		</div>
		<div class="description">
			<p>Channel</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/</code>
		</div>
		<div class="description">
			<p>Commands (see list of commands below)</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>:</code>
		</div>
		<div class="description">
			<p>Emoji (note: requires two search characters, to avoid conflicting with common emoticons like <code>:)</code>)</p>
		</div>
	</div>

	<h2>Commands</h2>

	<div class="help-item">
		<div class="subject">
			<code>/away [message]</code>
		</div>
		<div class="description">
			<p>Mark yourself as away with an optional message.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/back</code>
		</div>
		<div class="description">
			<p>Remove your away status (set with <code>/away</code>).</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/ban nick</code>
		</div>
		<div class="description">
			<p>Ban (<code>+b</code>) a user from the current channel.
			This can be a nickname or a hostmask.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/banlist</code>
		</div>
		<div class="description">
			<p>Load the banlist for the current channel.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/collapse</code>
		</div>
		<div class="description">
			<p>
				Collapse all previews in the current channel (opposite of
				<code>/expand</code>)
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/connect host [port]</code>
		</div>
		<div class="description">
			<p>
				Connect to a new IRC network. If <code>port</code> starts with
				a <code>+</code> sign, the connection will be made secure
				using TLS.
			</p>
			<p>Alias: <code>/server</code></p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/ctcp target cmd [args]</code>
		</div>
		<div class="description">
			<p>
				Send a <abbr title="Client-to-client protocol">CTCP</abbr>
				request. Read more about this on
				<a href="https://en.wikipedia.org/wiki/Client-to-client_protocol" target="_blank" rel="noopener">the dedicated Wikipedia article</a>.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/deop nick [...nick]</code>
		</div>
		<div class="description">
			<p>
				Remove op (<code>-o</code>) from one or several users in the
				current channel.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/devoice nick [...nick]</code>
		</div>
		<div class="description">
			<p>
				Remove voice (<code>-v</code>) from one or several users in
				the current channel.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/disconnect [message]</code>
		</div>
		<div class="description">
			<p>
				Disconnect from the current network with an
				optionally-provided message.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/expand</code>
		</div>
		<div class="description">
			<p>
				Expand all previews in the current channel (opposite of
				<code>/collapse</code>)
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/invite nick [channel]</code>
		</div>
		<div class="description">
			<p>
				Invite a user to the specified channel. If
				<code>channel</code> is ommitted, user will be invited to the
				current channel.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/join channel</code>
		</div>
		<div class="description">
			<p>Join a channel.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/kick nick</code>
		</div>
		<div class="description">
			<p>Kick a user from the current channel.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/list</code>
		</div>
		<div class="description">
			<p>Retrieve a list of available channels on this network.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/me message</code>
		</div>
		<div class="description">
			<p>
				Send an action message to the current channel. The Lounge will
				display it inline, as if the message was posted in the third
				person.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/mode flags [args]</code>
		</div>
		<div class="description">
			<p>
				Set the given flags to the current channel if the active
				window is a channel, another user if the active window is a
				private message window, or yourself if the current window is a
				server window.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/msg channel message</code>
		</div>
		<div class="description">
			<p>Send a message to the specified channel.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/nick newnick</code>
		</div>
		<div class="description">
			<p>Change your nickname on the current network.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/notice channel message</code>
		</div>
		<div class="description">
			<p>Sends a notice message to the specified channel.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/op nick [...nick]</code>
		</div>
		<div class="description">
			<p>
				Give op (<code>+o</code>) to one or several users in the
				current channel.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/part [channel]</code>
		</div>
		<div class="description">
			<p>
				Close the specified channel or private message window, or the
				current channel if <code>channel</code> is ommitted.
			</p>
			<p>Aliases: <code>/close</code>, <code>/leave</code></p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/rejoin</code>
		</div>
		<div class="description">
			<p>
				Leave and immediately rejoin the current channel. Useful to
				quickly get op from ChanServ in an empty channel, for example.
			</p>
			<p>Alias: <code>/cycle</code></p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/query nick</code>
		</div>
		<div class="description">
			<p>Send a private message to the specified user.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/quit [message]</code>
		</div>
		<div class="description">
			<p>
				Disconnect from the current network with an optional message.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/raw message</code>
		</div>
		<div class="description">
			<p>Send a raw message to the current IRC network.</p>
			<p>Aliases: <code>/quote</code>, <code>/send</code></p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/slap nick</code>
		</div>
		<div class="description">
			<p>Slap someone in the current channel with a trout!</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/topic newtopic</code>
		</div>
		<div class="description">
			<p>Set the topic in the current channel.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/unban nick</code>
		</div>
		<div class="description">
			<p>Unban (<code>-b</code>) a user from the current channel.
				This can be a nickname or a hostmask.</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/voice nick [...nick]</code>
		</div>
		<div class="description">
			<p>
				Give voice (<code>+v</code>) to one or several users in the
				current channel.
			</p>
		</div>
	</div>

	<div class="help-item">
		<div class="subject">
			<code>/whois nick</code>
		</div>
		<div class="description">
			<p>
				Retrieve information about the given user on the current
				network.
			</p>
		</div>
	</div>
</div>
