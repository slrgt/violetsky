<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { withBase } from '$lib/path';
	import * as bsky from '$lib/bsky';
	import { appStore } from '$lib/stores/app';
	import PostCard from '$lib/components/PostCard.svelte';
	import type { TimelineItem, PostView } from '$lib/types';
	import { isPostNsfw } from '$lib/bsky';

	type ThreadNode =
		| { $type?: string; post: PostView; parent?: ThreadNode; replies?: ThreadNode[] }
		| { notFound: true; uri: string }
		| { blocked: true; uri: string };

	let thread = $state<ThreadNode | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const uri = $derived(decodeURIComponent($page.params.uri ?? ''));

	function isThreadPost(node: ThreadNode): node is ThreadNode & { post: PostView } {
		return node && 'post' in node && !!node.post && !('notFound' in node) && !('blocked' in node);
	}

	function toTimelineItem(node: ThreadNode & { post: PostView }): TimelineItem {
		return { post: node.post };
	}

	const threadReplies = $derived.by(() => {
		if (!thread || !isThreadPost(thread)) return [];
		const t = thread as { replies?: ThreadNode[] };
		return t.replies ?? [];
	});

	onMount(async () => {
		if (!uri) {
			error = 'Missing post URI';
			loading = false;
			return;
		}
		try {
			const res = await bsky.getPostThread(uri, 8);
			const t = res.thread as ThreadNode;
			if (t && (t as { notFound?: boolean }).notFound) {
				error = 'Post not found';
			} else if (t && (t as { blocked?: boolean }).blocked) {
				error = 'Post unavailable';
			} else {
				thread = t;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load post';
		}
		loading = false;
	});
</script>

<div class="post-page">
	<p class="back-link"><a href={withBase('/')}>← Back to feed</a></p>

	{#if loading}
		<div class="loading flex-center"><div class="spinner"></div></div>
	{:else if error}
		<div class="error-msg">{error}</div>
	{:else if thread && isThreadPost(thread)}
		<div class="thread">
			<div class="thread-main">
				<PostCard
					item={toTimelineItem(thread)}
					cardViewMode="full"
					nsfwBlurred={$appStore.nsfwMode === 'blur' && isPostNsfw(thread.post)}
					onNsfwUnblur={() => {}}
					downvoteCount={0}
					isSelected={true}
					isMouseOver={false}
				/>
			</div>
			{#if threadReplies.length}
				<h3 class="replies-heading">Replies</h3>
				<div class="replies">
					{#each threadReplies as reply}
						{#if isThreadPost(reply)}
							<div class="reply-item">
								<PostCard
									item={toTimelineItem(reply)}
									cardViewMode="full"
									nsfwBlurred={$appStore.nsfwMode === 'blur' && isPostNsfw(reply.post)}
									onNsfwUnblur={() => {}}
									downvoteCount={0}
									isSelected={false}
									isMouseOver={false}
								/>
							</div>
						{:else if reply && 'notFound' in reply}
							<div class="reply-placeholder">Reply unavailable</div>
						{:else if reply && 'blocked' in reply}
							<div class="reply-placeholder">Reply hidden</div>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="no-replies">No replies yet.</p>
			{/if}
		</div>
	{:else}
		<div class="error-msg">Could not load post.</div>
	{/if}
</div>

<style>
	.post-page {
		max-width: 600px;
		margin: 0 auto;
		padding-bottom: var(--space-xl);
	}
	.back-link {
		margin-bottom: var(--space-md);
	}
	.back-link a {
		color: var(--muted);
		font-size: var(--font-sm);
	}
	.loading {
		padding: var(--space-2xl);
	}
	.error-msg {
		color: var(--error);
		padding: var(--space-lg);
	}
	.thread-main {
		margin-bottom: var(--space-lg);
	}
	.replies-heading {
		font-size: var(--font-base);
		font-weight: 600;
		margin-bottom: var(--space-md);
		color: var(--muted);
	}
	.replies {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
	.reply-item {
		border-left: 3px solid var(--glass-border);
		padding-left: var(--space-sm);
	}
	.reply-placeholder {
		font-size: var(--font-sm);
		color: var(--muted);
		padding: var(--space-sm);
	}
	.no-replies {
		color: var(--muted);
		font-size: var(--font-sm);
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
