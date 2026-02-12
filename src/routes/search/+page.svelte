<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { withBase } from '$lib/path';
	import { goto } from '$app/navigation';
	import * as bsky from '$lib/bsky';
	import { appStore } from '$lib/stores/app';
	import PostCard from '$lib/components/PostCard.svelte';
	import { resizedAvatarUrl } from '$lib/image-utils';
	import type { TimelineItem } from '$lib/types';
	import type { PostView } from '$lib/types';
	import { isPostNsfw } from '$lib/bsky';

	let query = $state('');
	let posts = $state<PostView[]>([]);
	let actors: Array<{ did: string; handle: string; displayName?: string; avatar?: string }> = $state([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let searched = $state(false);

	$effect(() => {
		const param = $page.url.searchParams.get('q') ?? '';
		if (param !== query) query = param;
	});

	async function doSearch() {
		const term = query.trim();
		if (!term) return;
		loading = true;
		searched = true;
		posts = [];
		actors = [];
		cursor = undefined;
		try {
			const [postsRes, actorsRes] = await Promise.all([
				bsky.searchPostsByQuery(term, undefined),
				bsky.searchActorsTypeahead(term, 8)
			]);
			posts = postsRes.posts ?? [];
			cursor = postsRes.cursor;
			actors = (actorsRes.actors ?? []).map((a: { did: string; handle: string; displayName?: string; avatar?: string }) => ({
				did: a.did,
				handle: a.handle,
				displayName: a.displayName,
				avatar: a.avatar
			}));
		} catch {
			posts = [];
			actors = [];
		}
		loading = false;
	}

	function submitSearch(e: Event) {
		e.preventDefault();
		const term = query.trim();
		if (!term) return;
		query = term;
		goto(withBase(`/search/?q=${encodeURIComponent(term)}`));
		doSearch();
	}

	async function loadMore() {
		const term = query.trim();
		if (!cursor || loading || !term) return;
		loading = true;
		try {
			const res = await bsky.searchPostsByQuery(term, cursor);
			posts = [...posts, ...(res.posts ?? [])];
			cursor = res.cursor;
		} catch {
			/* ignore */
		}
		loading = false;
	}

	onMount(() => {
		const param = $page.url.searchParams.get('q') ?? '';
		if (param.trim()) {
			query = param;
			doSearch();
		}
	});
</script>

<div class="search-page">
	<p class="back-link"><a href={withBase('/')}>← Back to feed</a></p>

	<h1 class="page-title">Search</h1>
	<form class="search-form" onsubmit={submitSearch}>
		<input
			type="search"
			placeholder="Search people or posts…"
			class="search-input"
			bind:value={query}
			aria-label="Search"
		/>
		<button type="submit" class="btn btn-primary">Search</button>
	</form>

	{#if searched}
		{#if loading && posts.length === 0 && actors.length === 0}
			<div class="loading flex-center"><div class="spinner"></div></div>
		{:else}
			{#if actors.length > 0}
				<h2 class="section-title">People</h2>
				<div class="actors-list">
					{#each actors as actor}
						<a
							href={withBase(`/profile/${encodeURIComponent(actor.handle)}/`)}
							class="actor-card glass"
						>
							<img
								src={resizedAvatarUrl(actor.avatar, 48)}
								alt=""
								width="48"
								height="48"
								class="actor-avatar"
							/>
							<div class="actor-info">
								<span class="actor-name">{actor.displayName || actor.handle}</span>
								<span class="actor-handle">@{actor.handle}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}

			<h2 class="section-title">Posts</h2>
			{#if posts.length > 0}
				<div class="posts-list">
					{#each posts as post}
						<PostCard
							item={{ post } as TimelineItem}
							cardViewMode="full"
							nsfwBlurred={$appStore.nsfwMode === 'blur' && isPostNsfw(post)}
							onNsfwUnblur={() => {}}
							downvoteCount={0}
							isSelected={false}
							isMouseOver={false}
						/>
					{/each}
				</div>
				{#if cursor}
					<div class="load-more">
						<button type="button" class="btn-ghost" onclick={loadMore} disabled={loading}>
							{loading ? 'Loading…' : 'Load more'}
						</button>
					</div>
				{/if}
			{:else if !loading}
				<p class="empty">No posts found for "{query}".</p>
			{/if}
		{/if}
	{:else}
		<p class="hint">Enter a search term and press Search.</p>
	{/if}
</div>

<style>
	.search-page {
		max-width: 600px;
		margin: 0 auto;
		padding-bottom: var(--space-2xl);
	}
	.back-link {
		margin-bottom: var(--space-md);
	}
	.back-link a {
		color: var(--muted);
		font-size: var(--font-sm);
	}
	.page-title {
		font-size: var(--font-2xl);
		font-weight: 700;
		margin-bottom: var(--space-lg);
	}
	.search-form {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-xl);
	}
	.search-input {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--glass-radius-sm);
		border: 1px solid var(--glass-border);
		background: var(--glass-highlight);
	}
	.btn-primary {
		background: var(--accent);
		color: var(--text-on-accent);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--glass-radius-sm);
		font-weight: 600;
	}
	.section-title {
		font-size: var(--font-base);
		font-weight: 600;
		margin-bottom: var(--space-md);
		color: var(--muted);
	}
	.actors-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-xl);
	}
	.actor-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		border-radius: var(--glass-radius-sm);
		text-decoration: none;
		color: var(--text);
	}
	.actor-card:hover {
		background: var(--glass-hover);
	}
	.actor-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
	}
	.actor-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.actor-name {
		font-weight: 600;
	}
	.actor-handle {
		font-size: var(--font-sm);
		color: var(--muted);
	}
	.posts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
	.load-more {
		display: flex;
		justify-content: center;
		padding: var(--space-lg);
	}
	.btn-ghost {
		background: var(--glass-highlight);
		border: 1px solid var(--glass-border);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--glass-radius-sm);
		color: var(--text);
	}
	.empty,
	.hint {
		color: var(--muted);
		padding: var(--space-lg);
		font-size: var(--font-sm);
	}
	.loading {
		padding: var(--space-2xl);
	}
	.flex-center {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--glass-border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
