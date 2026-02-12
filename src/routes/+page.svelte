<script lang="ts">
	import { onMount } from 'svelte';
	import { appStore } from '$lib/stores/app';
	import * as bsky from '$lib/bsky';
	import * as wasm from '$lib/wasm-bridge';
	import * as constellation from '$lib/constellation';
	import PostCard from '$lib/components/PostCard.svelte';
	import type { TimelineItem } from '$lib/types';

	let feed = $state<{
		items: TimelineItem[];
		loading: boolean;
		cursors: Record<string, string>;
		error: string | null;
	}>({
		items: [],
		loading: true,
		cursors: {},
		error: null
	});

	let sortMode = $state<'newest' | 'trending' | 'wilson' | 'score' | 'controversial'>('newest');
	let sortedItems = $state<TimelineItem[]>([]);
	let downvoteCounts = $state<Record<string, number>>({});
	let seenPosts = $state<Set<string>>(new Set());

	const loadFeed = async (append = false) => {
		feed = { ...feed, loading: true, error: null };
		try {
			const cursorsToUse = append && Object.keys(feed.cursors).length > 0 ? feed.cursors : undefined;
			const usePublic = !$appStore.session.isLoggedIn;
			const result = await bsky.getMixedFeed(
				$appStore.feedMix,
				30,
				cursorsToUse,
				usePublic
			);
			const items = append ? [...feed.items, ...result.feed] : result.feed;
			feed = {
				...feed,
				items,
				cursors: result.cursors ?? {},
				loading: false
			};
		} catch (err) {
			feed = {
				...feed,
				error: err instanceof Error ? err.message : 'Failed to load feed',
				loading: false
			};
		}
	};

	const markSeen = (uri: string) => {
		const next = new Set(seenPosts);
		next.add(uri);
		if (next.size > 2000) {
			const arr = Array.from(next);
			arr.splice(0, arr.length - 2000);
			seenPosts = new Set(arr);
		} else {
			seenPosts = next;
		}
		try {
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('violetsky-seen-posts', JSON.stringify(Array.from(seenPosts)));
			}
		} catch { /* ignore */ }
	};

	onMount(() => {
		let teardown: (() => void) | undefined;
		(async () => {
			try {
				const raw =
					typeof localStorage !== 'undefined' ? localStorage.getItem('violetsky-seen-posts') : null;
				if (raw) seenPosts = new Set(JSON.parse(raw));
			} catch { /* ignore */ }
			await loadFeed();
			const onRefresh = () => loadFeed();
			window.addEventListener('violetsky-feed-refresh', onRefresh);
			teardown = () => window.removeEventListener('violetsky-feed-refresh', onRefresh);
		})();
		return () => teardown?.();
	});

	$effect(() => {
		const items = feed.items;
		if (items.length === 0) {
			sortedItems = [];
			return;
		}
		const runSort = async () => {
			const sortable = items.map((item) => ({
				uri: item.post.uri,
				created_at: (item.post.record as { createdAt?: string })?.createdAt ?? new Date(0).toISOString(),
				like_count: item.post.likeCount ?? 0,
				downvote_count: downvoteCounts[item.post.uri] ?? 0,
				reply_count: item.post.replyCount ?? 0,
				repost_count: item.post.repostCount ?? 0
			}));

			let ordered: typeof sortable;
			switch (sortMode) {
				case 'trending':
					ordered = await wasm.sortByTrending(sortable);
					break;
				case 'wilson':
					ordered = await wasm.sortByWilsonScore(sortable);
					break;
				case 'score':
					ordered = await wasm.sortByScore(sortable);
					break;
				case 'controversial':
					ordered = await wasm.sortByControversial(sortable);
					break;
				default:
					ordered = await wasm.sortByNewest(sortable);
			}

			const byUri = new Map(items.map((i) => [i.post.uri, i]));
			sortedItems = ordered.map((s) => byUri.get(s.uri)).filter(Boolean) as TimelineItem[];
		};
		runSort();
	});

	$effect(() => {
		const items = feed.items;
		if (items.length === 0) {
			downvoteCounts = {};
			return;
		}
		const uris = items.map((i) => i.post.uri).filter(Boolean);
		constellation.getDownvoteCounts(uris).then((counts) => {
			downvoteCounts = counts;
		});
	});

	$effect(() => {
		const isLoggedIn = $appStore.session.isLoggedIn;
		const did = $appStore.session.did;
		if (feed.items.length === 0 && feed.loading) return;
		loadFeed();
	});

	const displayItems = $derived.by(() => {
		const items = sortedItems.length > 0 ? sortedItems : feed.items;
		return items.filter((item) => {
			if ($appStore.nsfwMode === 'hide' && bsky.isPostNsfw(item.post)) return false;
			if ($appStore.mediaOnly && !bsky.getPostMediaInfo(item.post)) return false;
			return true;
		});
	});

	const numCols = $derived($appStore.viewColumns);
	const columns = $derived.by(() => {
		const cols: Array<Array<{ item: TimelineItem; i: number }>> = Array.from(
			{ length: numCols },
			() => []
		);
		displayItems.forEach((item, i) => {
			cols[i % numCols].push({ item, i });
		});
		return cols;
	});

	const hasMoreCursor = $derived(Object.values(feed.cursors).some(Boolean));
</script>

<div class="feed-page">
	<div class="feed-controls">
		<div class="feed-controls-left">
			{#each [1, 2, 3] as n}
				<button
					class="col-btn {numCols === n ? 'col-btn-active' : ''}"
					aria-label="{n} column{n > 1 ? 's' : ''}"
					onclick={() => {
						appStore.update((s) => ({ ...s, viewColumns: n as 1 | 2 | 3 }));
						if (typeof localStorage !== 'undefined') localStorage.setItem('violetsky-view-columns', String(n));
					}}
				>
					{n}
				</button>
			{/each}
			<select
				class="sort-select"
				value={sortMode}
				onchange={(e) => (sortMode = (e.target as HTMLSelectElement).value as typeof sortMode)}
			>
				<option value="newest">Newest</option>
				<option value="trending">Trending</option>
				<option value="wilson">Best</option>
				<option value="score">Score</option>
				<option value="controversial">Controversial</option>
			</select>
		</div>
	</div>

	{#if feed.error}
		<div class="feed-error">
			<p>{feed.error}</p>
			<button class="btn" onclick={() => loadFeed()}>Retry</button>
		</div>
	{/if}

	<div class="masonry-grid masonry-cols-{numCols}">
		{#each columns as col, colIdx}
			<div class="masonry-column">
				{#each col as { item, i }}
					<PostCard
						item={item}
						isSeen={seenPosts.has(item.post.uri)}
						onSeen={() => markSeen(item.post.uri)}
						cardViewMode={$appStore.cardViewMode}
						nsfwBlurred={
							$appStore.nsfwMode === 'blur' &&
							bsky.isPostNsfw(item.post)
						}
						onNsfwUnblur={() => {}}
						downvoteCount={downvoteCounts[item.post.uri] ?? 0}
						isSelected={false}
						isMouseOver={false}
					/>
				{/each}
			</div>
		{/each}
	</div>

	{#if feed.loading}
		<div class="feed-loading flex-center">
			<div class="spinner"></div>
		</div>
	{/if}

	{#if !feed.loading && hasMoreCursor && displayItems.length > 0}
		<div class="load-more flex-center">
			<button class="btn-ghost" onclick={() => loadFeed(true)}>Load More</button>
		</div>
	{/if}

	{#if !feed.loading && !feed.error && displayItems.length === 0}
		<div class="feed-empty flex-center">
			<p>All caught up! No new posts.</p>
			<button class="btn-ghost" style="margin-top: var(--space-md)" onclick={() => loadFeed()}>
				Refresh feed
			</button>
		</div>
	{/if}
</div>


<style>
	.feed-page {
		width: 100%;
	}
	.feed-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
		flex-wrap: wrap;
	}
	.feed-controls-left {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	.col-btn {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		font-size: var(--font-sm);
		font-weight: 700;
		color: var(--muted);
		background: var(--glass-highlight);
		border: 1px solid var(--glass-border);
	}
	.col-btn-active {
		background: var(--accent);
		color: var(--text-on-accent);
		border-color: var(--accent);
	}
	.sort-select {
		padding: 4px 8px;
		border-radius: 8px;
		font-size: var(--font-sm);
		background: var(--glass-highlight);
		border: 1px solid var(--glass-border);
		color: var(--text);
	}
	.masonry-grid {
		display: flex;
		gap: var(--space-md);
		width: 100%;
	}
	.masonry-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		min-width: 0;
	}
	.masonry-cols-1 {
		max-width: 600px;
		margin: 0 auto;
	}
	.feed-loading {
		padding: var(--space-2xl);
	}
	.feed-error {
		text-align: center;
		padding: var(--space-xl);
		color: var(--error);
	}
	.feed-error p {
		margin-bottom: var(--space-md);
	}
	.feed-empty {
		padding: var(--space-2xl);
		color: var(--muted);
		text-align: center;
	}
	.load-more {
		padding: var(--space-lg);
	}
</style>
