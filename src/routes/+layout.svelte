<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { appStore } from '$lib/stores/app';
	import * as bsky from '$lib/bsky';
	import * as oauth from '$lib/oauth';
	import Nav from '$lib/components/Nav.svelte';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import ComposeModal from '$lib/components/ComposeModal.svelte';
	import type { ThemeMode } from '$lib/types';

	let { children } = $props();

	onMount(async () => {
		// Restore theme
		const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('violetsky-theme') : null;
		if (savedTheme && ['dark', 'light', 'system', 'high-contrast'].includes(savedTheme)) {
			appStore.update((s) => ({ ...s, theme: savedTheme as ThemeMode }));
			document.documentElement.setAttribute('data-theme', savedTheme === 'system' ? '' : savedTheme);
		}
		const savedCols = typeof localStorage !== 'undefined' ? localStorage.getItem('violetsky-view-columns') : null;
		if (savedCols) {
			const n = parseInt(savedCols);
			if (n >= 1 && n <= 3) appStore.update((s) => ({ ...s, viewColumns: n as 1 | 2 | 3 }));
		}

		// Restore session
		try {
			const params = new URLSearchParams(window.location.search);
			const hasCallback = params.has('state') && (params.has('code') || params.has('error'));

			if (hasCallback) {
				const result = await oauth.initOAuth({ hasCallback: true });
				if (result?.session) {
					const { Agent } = await import('@atproto/api');
					const oauthAgent = new Agent(result.session);
					bsky.setOAuthAgent(oauthAgent, result.session);
					bsky.addOAuthDid(oauthAgent.did!, true);
					window.history.replaceState({}, '', window.location.pathname + window.location.hash);
				} else {
					// OAuth callback returned without a session (e.g. user cancelled or Bluesky server error)
					const params = new URLSearchParams(window.location.search);
					const oauthError = params.get('error');
					if (oauthError) {
						const friendly =
							oauthError === 'server_error' || oauthError === 'temporarily_unavailable'
								? "Bluesky's login server is busy. Please try again in a moment."
								: oauthError === 'access_denied'
									? 'Login was cancelled.'
									: `Login failed (${oauthError}). Try again.`;
						appStore.update((s) => ({ ...s, toastMessage: friendly }));
					}
					window.history.replaceState({}, '', window.location.pathname + window.location.hash);
				}
			} else {
				const oauthResult = await oauth.initOAuth().catch(() => undefined);
				if (oauthResult?.session) {
					const { Agent } = await import('@atproto/api');
					const oauthAgent = new Agent(oauthResult.session);
					bsky.setOAuthAgent(oauthAgent, oauthResult.session);
					bsky.addOAuthDid(oauthAgent.did!, true);
				} else {
					await bsky.resumeSession();
				}
			}

			const session = bsky.getSession();
			if (session?.did) {
				appStore.update((s) => ({
					...s,
					session: { ...s.session, did: session.did, isLoggedIn: true }
				}));
				try {
					const profile = await bsky.agent.getProfile({ actor: session.did });
					const d = profile.data as { handle?: string; avatar?: string; displayName?: string };
				appStore.update((s) => ({
					...s,
					session: {
						...s.session,
						handle: d.handle ?? null,
						avatar: d.avatar ?? null
					}
				}));
					bsky.saveAccountProfile({
						did: session.did,
						handle: d.handle ?? session.did,
						avatar: d.avatar,
						displayName: d.displayName
					});
				} catch { /* ignore */ }
			}
		} catch (err) {
			console.error('Session restore failed:', err);
			const msg = err instanceof Error ? err.message : '';
			const isOAuthServerError =
				msg.includes('unable to handle') ||
				msg.includes('server_error') ||
				msg.includes('temporarily_unavailable');
			if (isOAuthServerError && typeof window !== 'undefined') {
				appStore.update((s) => ({
					...s,
					toastMessage: "Bluesky's login server is busy. Please try again in a moment."
				}));
				if (window.location?.search) {
					window.history.replaceState({}, '', window.location.pathname + window.location.hash);
				}
			}
		}

		// Service worker: only in production (dev avoids old Qwik SW cache issues)
		if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
			if (import.meta.env.DEV) {
				navigator.serviceWorker.getRegistrations().then((regs) => {
					regs.forEach((r) => r.unregister());
				});
			} else {
				const scope = base ? `${base}/` : '/';
				navigator.serviceWorker.register(`${base || '/'}sw.js`, { scope }).catch((e) =>
					console.error('SW register failed:', e)
				);
			}
		}
	});

	// Toast auto-clear
	$effect(() => {
		const msg = $appStore.toastMessage;
		if (!msg) return;
		const id = setTimeout(() => {
			appStore.update((s) => ({ ...s, toastMessage: null }));
		}, 2500);
		return () => clearTimeout(id);
	});
</script>

<svelte:head>
	<title>VioletSky</title>
	<link rel="icon" href={`${base || '/'}icon.svg`} />
</svelte:head>

<div class="app-shell">
	<Nav />

	<main id="main-content" class="main-content">
		{@render children()}
	</main>

	{#if $appStore.showLoginModal}
		<LoginModal />
	{/if}

	{#if $appStore.showComposeModal}
		<ComposeModal />
	{/if}

	{#if $appStore.toastMessage}
		<div class="app-toast float-btn" role="status" aria-live="polite">
			{$appStore.toastMessage}
		</div>
	{/if}
</div>

<style>
	@import '../app.css';

	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.main-content {
		flex: 1;
		margin-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + var(--space-md));
		padding: var(--space-md);
		padding-top: calc(env(safe-area-inset-top) + var(--space-md) + 56px);
		max-width: 1400px;
		width: 100%;
		margin-left: auto;
		margin-right: auto;
	}

	.app-toast {
		position: fixed;
		bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + var(--space-xl));
		left: 50%;
		transform: translateX(-50%);
		z-index: 110;
		padding: 10px 18px;
		border-radius: 100px;
		font-size: var(--font-sm);
		font-weight: 500;
		color: var(--text);
		box-shadow: var(--shadow-dropdown);
	}
</style>
