/**
 * WASM Bridge – JavaScript ↔ Rust/WebAssembly Interface - VioletSky
 */
import type { ConsensusResult } from '$lib/types';

let wasmModule: Record<string, unknown> | null = null;
let wasmLoadPromise: Promise<Record<string, unknown>> | null = null;

async function loadWasm(): Promise<Record<string, unknown>> {
  if (wasmModule) return wasmModule;
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = (async () => {
    try {
      const mod = await import('../wasm-pkg/purplesky_wasm.js');
      if (typeof mod.default === 'function') {
        await mod.default();
      }
      wasmModule = mod;
      return mod;
    } catch (err) {
      console.warn('[WASM] Failed to load, using JS fallbacks:', err);
      wasmModule = {};
      return {};
    }
  })();

  return wasmLoadPromise;
}

export async function isWasmReady(): Promise<boolean> {
  const mod = await loadWasm();
  return Object.keys(mod).length > 0;
}

interface SortablePost {
  uri: string;
  created_at: string;
  like_count: number;
  downvote_count: number;
  reply_count: number;
  repost_count: number;
}

export async function sortByNewest(posts: SortablePost[]): Promise<SortablePost[]> {
  const mod = await loadWasm();
  if (typeof mod.sort_by_newest === 'function') {
    const result = (mod.sort_by_newest as (json: string) => string)(JSON.stringify(posts));
    return JSON.parse(result);
  }
  return [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function sortByTrending(posts: SortablePost[]): Promise<SortablePost[]> {
  const mod = await loadWasm();
  const now = Date.now();
  if (typeof mod.sort_by_trending === 'function') {
    const result = (mod.sort_by_trending as (json: string, now: number) => string)(JSON.stringify(posts), now);
    return JSON.parse(result);
  }
  return [...posts].sort((a, b) => {
    const scoreA = (a.like_count + a.repost_count) / Math.max(1, (now - new Date(a.created_at).getTime()) / 3600000);
    const scoreB = (b.like_count + b.repost_count) / Math.max(1, (now - new Date(b.created_at).getTime()) / 3600000);
    return scoreB - scoreA;
  });
}

export async function sortByWilsonScore(posts: SortablePost[]): Promise<SortablePost[]> {
  const mod = await loadWasm();
  if (typeof mod.sort_by_wilson_score === 'function') {
    const result = (mod.sort_by_wilson_score as (json: string) => string)(JSON.stringify(posts));
    return JSON.parse(result);
  }
  return [...posts].sort((a, b) => {
    const scoreA = a.like_count - a.downvote_count;
    const scoreB = b.like_count - b.downvote_count;
    return scoreB - scoreA;
  });
}

export async function sortByScore(posts: SortablePost[]): Promise<SortablePost[]> {
  const mod = await loadWasm();
  if (typeof mod.sort_by_score === 'function') {
    const result = (mod.sort_by_score as (json: string) => string)(JSON.stringify(posts));
    return JSON.parse(result);
  }
  return [...posts].sort((a, b) => {
    const scoreA = a.like_count - a.downvote_count;
    const scoreB = b.like_count - b.downvote_count;
    return scoreB - scoreA;
  });
}

export async function sortByControversial(posts: SortablePost[]): Promise<SortablePost[]> {
  const mod = await loadWasm();
  if (typeof mod.sort_by_controversial === 'function') {
    const result = (mod.sort_by_controversial as (json: string) => string)(JSON.stringify(posts));
    return JSON.parse(result);
  }
  return [...posts].sort((a, b) => {
    const totalA = a.like_count + a.downvote_count;
    const totalB = b.like_count + b.downvote_count;
    const balanceA = totalA > 0 ? 1 - Math.abs(a.like_count / totalA - 0.5) * 2 : 0;
    const balanceB = totalB > 0 ? 1 - Math.abs(b.like_count / totalB - 0.5) * 2 : 0;
    return (totalB * balanceB) - (totalA * balanceA);
  });
}

export async function analyzeConsensus(
  votes: Array<{ user_id: string; statement_id: string; value: number }>,
): Promise<ConsensusResult> {
  const mod = await loadWasm();
  if (typeof mod.analyze_consensus === 'function') {
    const result = (mod.analyze_consensus as (json: string) => string)(JSON.stringify(votes));
    const raw = JSON.parse(result);
    return {
      statements: (raw.statements ?? []).map((s: Record<string, unknown>) => ({
        statementId: s.statement_id,
        agreeCount: s.agree_count,
        disagreeCount: s.disagree_count,
        passCount: s.pass_count,
        totalVoters: s.total_voters,
        agreementRatio: s.agreement_ratio,
        divisiveness: s.divisiveness,
      })),
      totalParticipants: raw.total_participants ?? 0,
      clusterCount: raw.cluster_count ?? 0,
      clusters: (raw.clusters ?? []).map((c: Record<string, unknown>) => ({
        id: c.id,
        memberCount: c.member_count,
        memberIds: c.member_ids,
        avgAgreement: c.avg_agreement,
      })),
    };
  }
  return { statements: [], totalParticipants: 0, clusterCount: 0, clusters: [] };
}
