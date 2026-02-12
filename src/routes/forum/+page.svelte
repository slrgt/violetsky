<script lang="ts">
	import { onMount } from 'svelte';
	import { withBase } from '$lib/path';
	import * as bsky from '$lib/bsky';
	import { appStore } from '$lib/stores/app';
	import PostCard from '$lib/components/PostCard.svelte';
	import type { TimelineItem } from '$lib/types';
	import { isPostNsfw } from '$lib/bsky';

	type FeedOption = { uri: string; displayName: string; description?: string };

	const DEFAULT_FEEDS: FeedOption[] = [
		{
			uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
			displayName: 'What\'s Hot',
			description: 'Popular posts from the network'
		},
		{
			uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-trending',
			displayName: 'What\'s Trending',
			description: 'Trending content'
		},
		{
			uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/discover',
			displayName: 'Discover',
			description: 'Discover new accounts and posts'
		}
	];

	let feeds = $state<FeedOption[]>(DEFAULT_FEEDS);
	let selectedFeed = $state<FeedOption | null>(null);
	let feedItems = $state<TimelineItem[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(true);
	let feedLoading = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			if ($appStore.session.isLoggedIn) {
				const res = await bsky.getSuggestedFeeds(25);
				if (res.feeds?.length) {
					feeds = [
						...DEFAULT_FEEDS,
						...res.feeds
							.filter((f: { uri: string }) => !DEFAULT_FEEDS.some((d) => d.uri === f.uri))
							.slice(0, 12)
							.map((f: { uri: string; displayName?: string; description?: string }) => ({
								uri: f.uri,
								displayName: f.displayName ?? 'Feed',
								description: f.description
							}))
					];
				}
			}
		} catch {
			/* keep default feeds */
		}
		loading = false;
	});

	async function selectFeed(feed: FeedOption) {
		selectedFeed = feed;
		feedLoading = true;
		error = null;
		try {
			const res = await bsky.getFeed(feed.uri, 30);
			feedItems = res.feed;
			cursor = res.cursor;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load feed';
			feedItems = [];
			cursor = undefined;
		}
		feedLoading = false;
	}

	async function loadMore() {
		if (!cursor || feedLoading || !selectedFeed) return;
		feedLoading = true;
		try {
			const res = await bsky.getFeed(selectedFeed.uri, 20, cursor);
			feedItems = [...feedItems, ...res.feed];
			cursor = res.cursor;
		} catch {
			/* ignore */
		}
		feedLoading = false;
	}
</script>

<div class="forum-page">
	<p class="back-link"><a href={withBase('/')}>← Back to feed</a></p>

	<h1 class="page-title">Forums & Feeds</h1>
	<p class="page-subtitle">Choose a feed to browse. Feeds work like topic-based forums.</p>

	{#if loading}
		<div class="loading flex-center"><div class="spinner"></div></div>
	{:else}
		<div class="feeds-grid">
			{#each feeds as feed}
				<button
					type="button"
					class="feed-card glass {selectedFeed?.uri === feed.uri ? 'feed-card-active' : ''}"
					onclick={() => selectFeed(feed)}
				>
					<span class="feed-card-name">{feed.displayName}</span>
					{#if feed.description}
						<span class="feed-card-desc">{feed.description.slice(0, 80)}{feed.description.length > 80 ? '…' : ''}</span>
					{/if}
				</button>
			{/each}
		</div>

		{#if selectedFeed}
			<section class="forum-feed">
				<h2 class="section-title">{selectedFeed.displayName}</h2>
				{#if feedLoading && feedItems.length === 0}
					<div class="loading flex-center"><div class="spinner"></div></div>
				{:else if error}
					<div class="error-msg">{error}</div>
				{:else}
					<div class="feed-list">
						{#each feedItems as item}
							<PostCard
								item={item}
								cardViewMode="full"
								nsfwBlurred={$appStore.nsfwMode === 'blur' && isPostNsfw(item.post)}
								onNsfwUnblur={() => {}}
								downvoteCount={0}
								isSelected={false}
								isMouseOver={false}
							/>
						{/each}
					</div>
					{#if cursor}
						<div class="load-more">
							<button class="btn-ghost" onclick={loadMore} disabled={feedLoading}>
								{feedLoading ? 'Loading…' : 'Load more'}
							</button>
						</div>
					{/if}
					{#if !feedItems.length && !feedLoading}
						<p class="empty-feed">No posts in this feed.</p>
					{/if}
				{/if}
			</section>
		{:else}
			<p class="hint">Select a feed above to view its posts.</p>
		{/if}
	{/if}
</div>

<style>
	.forum-page {
		max-width: 700px;
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
		margin-bottom: var(--space-xs);
	}
	.page-subtitle {
		color: var(--muted);
		font-size: var(--font-sm);
		margin-bottom: var(--space-xl);
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
	.feeds-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}
	.feed-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		padding: var(--space-md);
		border-radius: var(--glass-radius-sm);
		border: 1px solid var(--glass-border);
		transition: border-color var(--transition-fast), background var(--transition-fast);
	}
	.feed-card:hover {
		background: var(--glass-hover);
	}
	.feed-card-active {
		border-color: var(--accent);
		background: var(--accent-subtle);
	}
	.feed-card-name {
		font-weight: 600;
		font-size: var(--font-sm);
		margin-bottom: var(--space-xs);
	}
	.feed-card-desc {
		font-size: var(--font-xs);
		color: var(--muted);
		line-height: 1.3;
	}
	.forum-feed {
		margin-top: var(--space-lg);
	}
	.section-title {
		font-size: var(--font-base);
		font-weight: 600;
		margin-bottom: var(--space-md);
		color: var(--muted);
	}
	.feed-list {
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
		color: var(--text);
		border: 1px solid var(--glass-border);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--glass-radius-sm);
	}
	.empty-feed,
	.hint {
		color: var(--muted);
		text-align: center;
		padding: var(--space-xl);
		font-size: var(--font-sm);
	}
	.error-msg {
		color: var(--error);
		padding: var(--space-lg);
	}
</style>
