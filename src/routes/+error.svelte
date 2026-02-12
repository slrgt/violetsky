<script lang="ts">
	import { page } from '$app/state';

	const status = $derived(page.status ?? 500);
	const { displayMessage, isOAuthServerError } = $derived.by(() => {
		const msg = page.error?.message ?? 'Something went wrong';
		const isOAuth =
			msg.includes('unable to handle') ||
			msg.includes('server_error') ||
			msg.includes('temporarily_unavailable');
		return {
			displayMessage: isOAuth
				? "Bluesky's login server is busy. Please try again in a moment."
				: msg,
			isOAuthServerError: isOAuth
		};
	});
</script>

<div class="error-page">
	<h1>{status}</h1>
	<p class="error-message">{displayMessage}</p>
	{#if isOAuthServerError}
		<a href="/" class="btn">Back to feed</a>
	{:else}
		<a href="/" class="btn">Go home</a>
	{/if}
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: var(--space-xl);
		text-align: center;
	}
	.error-page h1 {
		font-size: 2rem;
		color: var(--muted);
		margin-bottom: var(--space-md);
	}
	.error-message {
		color: var(--text);
		margin-bottom: var(--space-xl);
		max-width: 400px;
	}
	.btn {
		display: inline-block;
		padding: var(--space-sm) var(--space-lg);
		background: var(--accent);
		color: var(--text-on-accent);
		border-radius: var(--glass-radius-sm);
		text-decoration: none;
		font-weight: 500;
	}
</style>
