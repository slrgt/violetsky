<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { withBase } from '$lib/path';
	import * as bsky from '$lib/bsky';
	import { appStore } from '$lib/stores/app';
	import PostCard from '$lib/components/PostCard.svelte';
	import { resizedAvatarUrl } from '$lib/image-utils';
	import type { TimelineItem } from '$lib/types';
	import { isPostNsfw } from '$lib/bsky';

	const handle = $derived(decodeURIComponent($page.params.handle ?? ''));
	let profile = $state<{
		did: string;
		handle: string;
		displayName?: string;
		description?: string;
		avatar?: string;
		followersCount?: number;
		followsCount?: number;
		postsCount?: number;
		viewer?: { following?: string; followedBy?: string };
	} | null>(null);
	let feed = $state<TimelineItem[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(true);
	let feedLoading = $state(false);
	let error = $state<string | null>(null);
	let followingUri = $state<string | null>(null);

	onMount(async () => {
		if (!handle) {
			error = 'Missing handle';
			loading = false;
			return;
		}
		try {
			const res = await bsky.agent.getProfile({ actor: handle });
			const d = res.data as typeof profile;
			profile = d;
			followingUri = d?.viewer?.following ?? null;
			const feedRes = await bsky.getAuthorFeed(handle, 30);
			feed = feedRes.feed;
			cursor = feedRes.cursor;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load profile';
		}
		loading = false;
	});

	async function loadMore() {
		if (!cursor || feedLoading || !profile) return;
		feedLoading = true;
		try {
			const res = await bsky.getAuthorFeed(profile.did, 20, cursor);
			feed = [...feed, ...res.feed];
			cursor = res.cursor;
		} catch {
			/* ignore */
		}
		feedLoading = false;
	}

	async function toggleFollow() {
		if (!profile || !$appStore.session.isLoggedIn) return;
		try {
			if (followingUri) {
				await bsky.unfollowUser(followingUri);
				followingUri = null;
				profile = { ...profile, followersCount: Math.max(0, (profile.followersCount ?? 0) - 1) };
			} else {
				const uri = await bsky.followUser(profile.did);
				followingUri = uri;
				profile = { ...profile, followersCount: (profile.followersCount ?? 0) + 1 };
			}
		} catch {
			/* ignore */
		}
	}
</script>

<div class="profile-page">
	<p class="back-link"><a href={withBase('/')}>← Back to feed</a></p>

	{#if loading}
		<div class="loading flex-center"><div class="spinner"></div></div>
	{:else if error}
		<div class="error-msg">{error}</div>
	{:else if profile}
		<header class="profile-header glass">
			<div class="profile-avatar-wrap">
				<img
					src={resizedAvatarUrl(profile.avatar, 96)}
					alt=""
					class="profile-avatar"
					width="96"
					height="96"
				/>
			</div>
			<h1 class="profile-display-name">{profile.displayName || profile.handle}</h1>
			<p class="profile-handle">@{profile.handle}</p>
			{#if profile.description}
				<p class="profile-bio">{profile.description}</p>
			{/if}
			<div class="profile-counts">
				<span>{profile.followersCount ?? 0} followers</span>
				<span>{profile.followsCount ?? 0} following</span>
				<span>{profile.postsCount ?? 0} posts</span>
			</div>
			{#if $appStore.session.isLoggedIn && profile.did !== $appStore.session.did}
				<button
					class="btn {followingUri ? 'btn-ghost' : 'btn-primary'}"
					onclick={toggleFollow}
				>
					{followingUri ? 'Unfollow' : 'Follow'}
				</button>
			{/if}
		</header>

		<section class="profile-feed">
			<h2 class="section-title">Posts</h2>
			<div class="feed-list">
				{#each feed as item}
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
			{#if !feed.length && !feedLoading}
				<p class="empty-feed">No posts yet.</p>
			{/if}
		</section>
	{:else}
		<div class="error-msg">Profile not found.</div>
	{/if}
</div>

<style>
	.profile-page {
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
	.loading {
		padding: var(--space-2xl);
	}
	.error-msg {
		color: var(--error);
		padding: var(--space-lg);
	}
	.profile-header {
		padding: var(--space-xl);
		border-radius: var(--glass-radius);
		margin-bottom: var(--space-xl);
		text-align: center;
	}
	.profile-avatar-wrap {
		margin-bottom: var(--space-md);
	}
	.profile-avatar {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		object-fit: cover;
	}
	.profile-display-name {
		font-size: var(--font-xl);
		font-weight: 700;
		margin-bottom: var(--space-xs);
	}
	.profile-handle {
		color: var(--muted);
		font-size: var(--font-sm);
		margin-bottom: var(--space-md);
	}
	.profile-bio {
		font-size: var(--font-sm);
		line-height: 1.5;
		color: var(--text);
		margin-bottom: var(--space-md);
		white-space: pre-wrap;
		max-width: 100%;
	}
	.profile-counts {
		display: flex;
		justify-content: center;
		gap: var(--space-lg);
		font-size: var(--font-sm);
		color: var(--muted);
		margin-bottom: var(--space-md);
	}
	.btn-primary {
		background: var(--accent);
		color: var(--text-on-accent);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--glass-radius-sm);
		font-weight: 600;
	}
	.btn-ghost {
		background: var(--glass-highlight);
		color: var(--text);
		border: 1px solid var(--glass-border);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--glass-radius-sm);
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
	.empty-feed {
		color: var(--muted);
		text-align: center;
		padding: var(--space-xl);
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
