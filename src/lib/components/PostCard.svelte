<script lang="ts">
	import { base } from '$app/paths';
	import type { TimelineItem, CardViewMode } from '$lib/types';
	import { getPostMediaInfo, isPostNsfw } from '$lib/bsky';
	import { resizedAvatarUrl } from '$lib/image-utils';
	import { goto } from '$app/navigation';

	interface Props {
		item: TimelineItem;
		isSeen?: boolean;
		onSeen?: () => void;
		cardViewMode?: CardViewMode;
		nsfwBlurred?: boolean;
		onNsfwUnblur?: () => void;
		downvoteCount?: number;
		myDownvoteUri?: string;
		isSelected?: boolean;
		isMouseOver?: boolean;
	}

	let {
		item: propItem,
		isSeen = false,
		onSeen,
		cardViewMode = 'full',
		nsfwBlurred = false,
		onNsfwUnblur,
		downvoteCount = 0,
		myDownvoteUri,
		isSelected = false,
		isMouseOver = false
	}: Props = $props();

	const item = $derived(propItem);
	const post = $derived(item.post);
	const record = $derived((post.record as { text?: string; createdAt?: string }) ?? {});
	const embed = $derived((post.embed as Record<string, unknown>) ?? {});
	const mediaType = $derived(embed?.$type as string | undefined);
	const mediaEmbed = $derived((embed?.media as Record<string, unknown>) ?? {});
	const isImage = $derived(
		mediaType === 'app.bsky.embed.images#view' ||
			(mediaEmbed?.$type as string) === 'app.bsky.embed.images#view'
	);
	const isVideo = $derived(
		mediaType === 'app.bsky.embed.video#view' ||
			(mediaEmbed?.$type as string) === 'app.bsky.embed.video#view'
	);
	const images = $derived(
		(embed?.images as Array<{ thumb: string; fullsize: string }>) ?? []
	);
	const videoThumb = $derived(
		(embed?.thumbnail as string) ?? (mediaEmbed?.thumbnail as string) ?? ''
	);
	const videoPlaylist = $derived(
		(embed?.playlist as string) ?? (mediaEmbed?.playlist as string) ?? ''
	);
	const hasMedia = $derived(isImage || isVideo || !!(embed?.media as Record<string, unknown>));
	const mediaInfo = $derived(getPostMediaInfo(post));
	const isNsfw = $derived(isPostNsfw(post));

	const handleClick = () => {
		onSeen?.();
		goto(`${base || '/'}post/${encodeURIComponent(post.uri)}/`);
	};

	const timeAgo = (dateStr: string) => {
		const d = new Date(dateStr);
		const now = new Date();
		const s = Math.floor((now.getTime() - d.getTime()) / 1000);
		if (s < 60) return 'now';
		if (s < 3600) return `${Math.floor(s / 60)}m`;
		if (s < 86400) return `${Math.floor(s / 3600)}h`;
		return `${Math.floor(s / 86400)}d`;
	};
</script>

<div
	class="post-card glass {cardViewMode} {isSeen ? 'post-card-seen' : ''} {isSelected ? 'post-card-selected' : ''} {isMouseOver ? 'post-card-mouse-over' : ''}"
	data-post-uri={post.uri}
	role="button"
	tabindex="0"
	onclick={handleClick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}}
>
	<div class="post-meta">
		<a
			href={`${base || '/'}profile/${encodeURIComponent(post.author.handle)}/`}
			class="post-author"
			onclick={(e) => e.stopPropagation()}
		>
			<img
				src={resizedAvatarUrl(post.author.avatar, 24)}
				alt=""
				class="post-avatar"
				width="24"
				height="24"
			/>
			<span class="post-handle">@{post.author.handle}</span>
		</a>
		<span class="post-time">{timeAgo(record?.createdAt ?? '')}</span>
	</div>

	{#if hasMedia && mediaInfo}
		<div class="post-media-wrap">
			{#if isImage && images.length > 0}
				{#if nsfwBlurred}
					<button
						type="button"
						class="post-nsfw-overlay"
						onclick={(e) => {
							e.stopPropagation();
							onNsfwUnblur?.();
						}}
					>
						<span>Tap to reveal</span>
						<small>Sensitive content</small>
					</button>
				{:else}
					<img
						src={images[0]?.fullsize ?? images[0]?.thumb ?? mediaInfo.url}
						alt=""
						class="post-media-img"
						loading="lazy"
					/>
				{/if}
			{:else if isVideo}
				<div class="post-video-wrap">
					{#if videoThumb}
						<img src={videoThumb} alt="" class="post-media-img" loading="lazy" />
					{/if}
					<div class="post-video-play">▶</div>
				</div>
			{/if}
		</div>
	{/if}

	{#if record?.text && (cardViewMode === 'full' || cardViewMode === 'mini')}
		<div class="post-text">{record.text.slice(0, 280)}{record.text.length > 280 ? '…' : ''}</div>
	{/if}

	<div class="post-actions">
		<span class="post-action">❤️ {post.likeCount ?? 0}</span>
		<span class="post-action">💬 {post.replyCount ?? 0}</span>
		{#if downvoteCount > 0}
			<span class="post-action">⬇ {downvoteCount}</span>
		{/if}
	</div>
</div>

<style>
	.post-card {
		overflow: hidden;
		transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast);
		cursor: pointer;
		user-select: none;
		border-radius: var(--glass-radius);
		padding-bottom: var(--space-sm);
	}
	.post-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-card);
	}
	.post-card-seen {
		opacity: 0.5;
	}
	.post-card-seen:hover {
		opacity: 0.8;
	}
	.post-card-selected {
		transform: scale(1.04) translateY(-4px);
		box-shadow: var(--shadow-card), 0 8px 24px rgba(0, 0, 0, 0.18);
		z-index: 2;
	}
	.post-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm);
		gap: var(--space-sm);
	}
	.post-author {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: var(--text);
		min-width: 0;
		flex: 1;
	}
	.post-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
	}
	.post-handle {
		font-size: var(--font-sm);
		font-weight: 600;
	}
	.post-time {
		font-size: var(--font-xs);
		color: var(--muted);
	}
	.post-media-wrap {
		position: relative;
		overflow: hidden;
		border-radius: 0 0 var(--glass-radius) var(--glass-radius);
		background: var(--surface);
	}
	.post-media-img {
		width: 100%;
		height: auto;
		display: block;
		object-fit: cover;
		max-height: 500px;
	}
	.post-video-wrap {
		position: relative;
	}
	.post-video-play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
		color: #fff;
		background: rgba(0, 0, 0, 0.3);
	}
	.post-nsfw-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		color: var(--muted);
		cursor: pointer;
		gap: var(--space-xs);
		backdrop-filter: blur(30px);
	}
	.post-text {
		font-size: var(--font-sm);
		line-height: 1.5;
		padding: var(--space-xs) var(--space-sm);
		color: var(--text);
		word-break: break-word;
	}
	.post-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 0 var(--space-sm) var(--space-xs);
		font-size: var(--font-xs);
		color: var(--muted);
	}
	.post-action {
		display: flex;
		align-items: center;
		gap: 4px;
	}
</style>
