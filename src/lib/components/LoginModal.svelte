<script lang="ts">
	import { appStore } from '$lib/stores/app';
	import * as oauth from '$lib/oauth';

	let handleInput = $state('');
	let loginError = $state('');
	let loginLoading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const handle = handleInput.trim();
		if (!handle) return;
		loginError = '';
		loginLoading = true;
		try {
			const normalized = oauth.normalizeHandle(handle);
			handleInput = normalized;
			await oauth.signInWithOAuthRedirect(normalized);
		} catch (err) {
			console.error('OAuth login failed:', err);
			loginError = err instanceof Error ? err.message : 'Login failed.';
			loginLoading = false;
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="modal-overlay"
	onclick={() => appStore.update((s) => ({ ...s, showLoginModal: false }))}
	role="button"
	tabindex="-1"
	onkeydown={(e) => e.key === 'Escape' && appStore.update((s) => ({ ...s, showLoginModal: false }))}
>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div
		class="modal-card glass-strong"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="login-title"
		tabindex="-1"
	>
		<h2 id="login-title" class="modal-title">Log in with Bluesky</h2>
		<p class="modal-subtitle">Enter your Bluesky handle or custom domain</p>

		<form onsubmit={handleSubmit}>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			placeholder="yourname.bsky.social or custom.domain"
			class="modal-input"
			bind:value={handleInput}
			autofocus
		/>

			{#if loginError}
				<p style="color: var(--danger); font-size: var(--font-sm); margin-top: var(--space-sm);">
					{loginError}
				</p>
			{/if}

			<button type="submit" class="btn modal-submit" disabled={loginLoading}>
				{loginLoading ? 'Redirecting…' : 'Continue with Bluesky'}
			</button>
		</form>

		<p style="color: var(--muted); font-size: var(--font-xs); margin-top: var(--space-md); text-align: center;">
			Works with any AT Protocol PDS — just enter your full handle.
		</p>

		<button
			class="modal-close"
			onclick={() => appStore.update((s) => ({ ...s, showLoginModal: false }))}
			aria-label="Close"
		>
			✕
		</button>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: var(--overlay-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
	}
	.modal-card {
		position: relative;
		width: 100%;
		max-width: 400px;
		padding: var(--space-xl);
	}
	.modal-title {
		font-size: var(--font-xl);
		font-weight: 700;
		margin-bottom: var(--space-sm);
	}
	.modal-subtitle {
		color: var(--muted);
		font-size: var(--font-sm);
		margin-bottom: var(--space-lg);
	}
	.modal-input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		margin-bottom: var(--space-md);
		border-radius: var(--glass-radius-sm);
		font-size: var(--font-base);
	}
	.modal-submit {
		width: 100%;
		justify-content: center;
		padding: var(--space-sm) var(--space-lg);
	}
	.modal-close {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-size: var(--font-lg);
		color: var(--muted);
	}
	.modal-close:hover {
		background: var(--glass-hover);
	}
</style>
