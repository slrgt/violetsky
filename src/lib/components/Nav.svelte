<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { appStore } from '$lib/stores/app';
	import type { ThemeMode } from '$lib/types';

	let accountMenuOpen = $state(false);
	let accountWrapRef: HTMLElement | undefined;

	onMount(() => {
		const close = (e: MouseEvent) => {
			if (accountMenuOpen && accountWrapRef && !accountWrapRef.contains(e.target as Node)) {
				accountMenuOpen = false;
			}
		};
		document.addEventListener('click', close);
		return () => document.removeEventListener('click', close);
	});

	const navItems = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/forum/', label: 'Forums', icon: 'forum' },
		{ href: '/consensus/', label: 'Consensus', icon: 'consensus' },
		{ href: '/collab/', label: 'Collab', icon: 'collab' },
		{ href: '/artboards/', label: 'Collections', icon: 'collections' }
	];

	const navHref = (path: string) => (path === '/' ? `${base}/` : `${base}${path}`);

	const pathForActive = $page.url.pathname.replace(base || '/', '') || '/';

	const cycleTheme = () => {
		const modes: ThemeMode[] = ['dark', 'light', 'high-contrast', 'system'];
		const idx = modes.indexOf($appStore.theme);
		const next = modes[(idx + 1) % modes.length];
		appStore.update((s) => ({ ...s, theme: next }));
		document.documentElement.setAttribute('data-theme', next === 'system' ? '' : next);
		if (typeof localStorage !== 'undefined') localStorage.setItem('violetsky-theme', next);
	};

</script>

{#if pathForActive !== '/' && pathForActive !== ''}
	<button
		type="button"
		class="floating-back float-btn"
		aria-label="Back"
		onclick={() => history.back()}
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
			<path d="M19 12H5M12 19l-7-7 7-7" />
		</svg>
	</button>
{/if}

<div class="floating-top-right" bind:this={accountWrapRef}>
	{#if $appStore.session.isLoggedIn}
		<button
			class="floating-fab float-btn"
			aria-label="New post"
			onclick={() => appStore.update((s) => ({ ...s, showComposeModal: true }))}
		>
			New post
		</button>
		<div class="floating-top-right-col">
			<div class="account-btn-wrap">
				<button
					class="floating-fab float-btn"
					aria-label="Account menu"
					aria-expanded={accountMenuOpen}
					onclick={() => (accountMenuOpen = !accountMenuOpen)}
				>
					{#if $appStore.session.avatar}
						<img
							src={$appStore.session.avatar}
							alt=""
							width="28"
							height="28"
							class="floating-avatar"
						/>
					{:else}
						<span class="floating-avatar-placeholder">
							{($appStore.session.handle ?? '?')[0].toUpperCase()}
						</span>
					{/if}
				</button>
				{#if accountMenuOpen}
					<div class="account-dropdown glass-strong">
						{#if $appStore.session.handle}
							<button
								type="button"
								class="acct-row acct-current"
								onclick={() => {
									accountMenuOpen = false;
									goto(navHref(`/profile/${encodeURIComponent($appStore.session.handle!)}/`));
								}}
							>
								{#if $appStore.session.avatar}
									<img src={$appStore.session.avatar} alt="" width="24" height="24" class="acct-avatar" />
								{:else}
									<span class="acct-avatar-ph">{($appStore.session.handle ?? '?')[0].toUpperCase()}</span>
								{/if}
								<span class="acct-info">
									<span class="acct-handle">@{$appStore.session.handle}</span>
									<span class="acct-label">View profile</span>
								</span>
							</button>
						{/if}
						<div class="acct-divider"></div>
						<button type="button" onclick={cycleTheme}>Theme</button>
						<div class="acct-divider"></div>
						<button
							type="button"
							class="acct-logout"
							onclick={async () => {
								const { logoutAccount } = await import('$lib/bsky');
								const did = $appStore.session.did;
								if (did) {
									const next = await logoutAccount(did);
									if (next) {
										window.location.reload();
									} else {
										appStore.update((s) => ({
											...s,
											session: { did: null, handle: null, avatar: null, isLoggedIn: false }
										}));
										accountMenuOpen = false;
									}
								}
							}}
						>
							Log out @{$appStore.session.handle ?? ''}
						</button>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<button
			class="floating-fab floating-login float-btn"
			onclick={() => appStore.update((s) => ({ ...s, showLoginModal: true }))}
			aria-label="Log in"
		>
			Log in
		</button>
	{/if}
</div>

<nav class="nav glass" aria-label="Main navigation">
	{#each navItems as item}
		{@const fullHref = navHref(item.href)}
		{@const isActive = pathForActive === item.href || (item.href !== '/' && pathForActive.startsWith(item.href))}
		<a
			href={fullHref}
			class="nav-tab {isActive ? 'nav-tab-active' : ''}"
			role="tab"
			aria-selected={isActive}
			aria-label={item.label}
		>
			<span class="nav-label">{item.label}</span>
		</a>
	{/each}
	<a
		href={navHref('/search/')}
		class="nav-tab {pathForActive.startsWith('/search') ? 'nav-tab-active' : ''}"
		role="tab"
		aria-label="Search"
	>
		<span class="nav-label">Search</span>
	</a>
</nav>

<style>
	.floating-back {
		position: fixed;
		top: max(var(--space-md), env(safe-area-inset-top));
		left: max(var(--space-md), env(safe-area-inset-left));
		z-index: 100;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border-radius: 50%;
		color: var(--text);
	}
	.floating-top-right {
		position: fixed;
		top: max(var(--space-md), env(safe-area-inset-top));
		right: max(var(--space-md), env(safe-area-inset-right));
		z-index: 100;
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
	}
	.floating-top-right-col {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-sm);
	}
	.account-btn-wrap {
		position: relative;
	}
	.floating-fab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 8px 14px;
		border-radius: 100px;
		font-size: var(--font-sm);
		font-weight: 500;
	}
	.floating-avatar,
	.floating-avatar-placeholder {
		width: 28px;
		height: 28px;
		border-radius: 50%;
	}
	.floating-avatar-placeholder {
		background: var(--accent-subtle);
		color: var(--accent);
		font-weight: 700;
		font-size: var(--font-sm);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.account-dropdown {
		position: absolute;
		top: calc(100% + var(--space-sm));
		right: 0;
		min-width: 180px;
		max-height: 80vh;
		overflow: auto;
		padding: var(--space-xs);
		border-radius: 12px;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		box-shadow: var(--shadow-dropdown);
		z-index: 200;
	}
	.acct-row {
		display: flex !important;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md) !important;
		width: 100%;
		text-align: left;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--text);
	}
	.acct-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
	}
	.acct-avatar-ph {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--glass-hover);
		font-size: 11px;
		font-weight: 600;
		color: var(--muted);
	}
	.acct-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.acct-handle {
		font-size: var(--font-sm);
		font-weight: 500;
	}
	.acct-label {
		font-size: 10px;
		color: var(--muted);
	}
	.acct-current .acct-label {
		color: var(--accent);
	}
	.acct-divider {
		height: 1px;
		background: var(--glass-border);
		margin: var(--space-xs) 0;
	}
	.acct-logout {
		color: var(--danger) !important;
		font-size: var(--font-xs) !important;
	}
	.nav {
		position: fixed;
		bottom: calc(var(--space-md) + env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 8px;
		z-index: 100;
		border-radius: 28px;
		min-height: var(--nav-height);
	}
	.nav-tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 6px 14px;
		border-radius: 20px;
		text-decoration: none;
		color: var(--muted);
		transition: all var(--transition-fast);
		min-width: var(--touch-min);
	}
	.nav-tab:hover {
		background: var(--glass-hover);
		color: var(--text);
	}
	.nav-tab-active {
		color: var(--accent);
		background: var(--accent-subtle);
	}
	.nav-label {
		font-size: 10px;
		font-weight: 600;
	}
</style>
