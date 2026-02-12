<script lang="ts">
	import { appStore } from '$lib/stores/app';
	import * as bsky from '$lib/bsky';

	let text = $state('');
	let posting = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!text.trim()) return;
		posting = true;
		error = '';
		try {
			await bsky.createPost(text.trim());
			appStore.update((s) => ({ ...s, showComposeModal: false }));
			text = '';
			window.dispatchEvent(new CustomEvent('violetsky-feed-refresh'));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to post';
		}
		posting = false;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="modal-overlay"
	onclick={() => appStore.update((s) => ({ ...s, showComposeModal: false }))}
	role="button"
	tabindex="-1"
	onkeydown={(e) => e.key === 'Escape' && appStore.update((s) => ({ ...s, showComposeModal: false }))}
>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div
		class="modal-card glass-strong"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="compose-title"
		tabindex="-1"
	>
		<h2 id="compose-title" class="modal-title">New post</h2>

		<form onsubmit={handleSubmit}>
			<textarea
				placeholder="What's on your mind?"
				class="modal-input"
				bind:value={text}
				rows="4"
				style="resize: vertical; min-height: 80px;"
			></textarea>

			{#if error}
				<p style="color: var(--danger); font-size: var(--font-sm); margin-top: var(--space-sm);">
					{error}
				</p>
			{/if}

			<button type="submit" class="btn modal-submit" disabled={posting || !text.trim()}>
				{posting ? 'Posting…' : 'Post'}
			</button>
		</form>

		<button
			class="modal-close"
			onclick={() => appStore.update((s) => ({ ...s, showComposeModal: false }))}
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
</style>
