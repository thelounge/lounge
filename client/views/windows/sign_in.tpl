<form class="container" method="post" action="">
	<img src="img/logo-vertical-transparent-bg.svg" class="logo" alt="The Lounge" width="256" height="170">
	<img src="img/logo-vertical-transparent-bg-inverted.svg" class="logo-inverted" alt="The Lounge" width="256" height="170">

	<label>Username</label>
	<input class="input" name="username" autocapitalize="none" autocomplete="username" autofocus>

	<div class="password-container">
		<label>Password</label>
		<input class="input" type="password" name="password" autocomplete="current-password">
		{{> ../reveal-password}}
	</div>

	<div class="error">Authentication failed.</div>

	<button type="submit" class="btn">Sign in</button>
</form>
