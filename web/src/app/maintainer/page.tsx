"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasMinRole } from "@/lib/roles";
import { useQuery } from "@tanstack/react-query";

interface ModeratedProject {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  featured: number;
  username: string | null;
  stellar_network?: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at?: string;
}

interface PendingPreview {
  id: number;
  name: string;
  slug: string;
  category: string;
  username: string | null;
  created_at: string;
}

interface OverviewResponse {
  pending_count: number;
  stats: {
    pending: number;
    approved: number;
    featured: number;
    rejected: number;
    delisted: number;
    total: number;
  };
  recently_moderated: ModeratedProject[];
  pending_preview: PendingPreview[];
}

function useMaintainerOverview(token: string | null) {
  return useQuery<OverviewResponse>({
    queryKey: ["maintainer-overview"],
    queryFn: async () => {
      const res = await fetch("/api/maintainer/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch overview");
      }
      return res.json();
    },
    enabled: !!token,
  });
}

function StatusBadge({ status, featured }: { status: string; featured?: number }) {
  const styles: Record<string, string> = {
    submitted: "tag-solar",
    approved: "tag-aurora",
    featured: "tag-nova",
    rejected: "bg-supernova/10 text-supernova border border-supernova/20",
    delisted: "bg-dust/50 text-ash border border-dust/30",
  };
  const label = featured ? "featured" : status;
  return <span className={`tag ${styles[label] || "tag-nova"} text-xs`}>{label}</span>;
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MaintainerPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { data, isLoading, isError, error } = useMaintainerOverview(token);

  const isMaintainer = !!user && hasMinRole(user.role, "maintainer");

  // Loading auth
  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="skeleton h-10 w-72 mb-3 rounded-xl" />
        <div className="skeleton h-4 w-96 mb-8 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  // Not signed in or not maintainer → sign-in required / access denied
  if (!user || !isMaintainer) {
    const isContributor = !!user && !isMaintainer;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="glass rounded-2xl p-10 text-center max-w-md w-full animate-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-plasma/10 border border-plasma/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--plasma-bright)" strokeWidth="1.6">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2 className="font-semibold text-xl text-starlight mb-2">
            { !user ? "Sign in required" : "Maintainer access required" }
          </h2>
          <p className="text-ash text-sm mb-6 leading-relaxed">
            { !user
              ? "You need to sign in with a maintainer or admin account to view the maintainer dashboard."
              : isContributor
                ? "Your account is a contributor account. Ask an existing maintainer to grant you the maintainer role to access this dashboard."
                : "You do not have permission to view this page."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!user ? (
              <>
                <Link href="/login" className="btn-nova text-sm text-center">
                  Sign In
                </Link>
                <Link href="/register" className="btn-ghost text-sm text-center">
                  Create Account
                </Link>
              </>
            ) : (
              <>
                <Link href="/explore" className="btn-ghost text-sm text-center">
                  Back to Explore
                </Link>
                <Link href="/queue" className="btn-nova text-sm text-center">
                  View Public Queue
                </Link>
              </>
            )}
          </div>
          {!user && (
            <Link href="/explore" className="text-xs text-ash hover:text-moonlight mt-4 inline-block transition-colors">
              Continue as guest → Explore projects
            </Link>
          )}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const pendingCount = data?.pending_count ?? 0;
  const recentlyModerated = data?.recently_moderated ?? [];
  const pendingPreview = data?.pending_preview ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8 animate-in">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-plasma/30 to-nova/30 border border-plasma/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--plasma-bright)" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="2.5" />
                <path d="M12 13.5v2.5" />
              </svg>
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl text-starlight">Maintainer Dashboard</h1>
              <p className="text-ash text-sm mt-0.5">Overview of what needs moderation — quick actions for maintainers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/queue" className="btn-ghost text-sm !py-2 !px-3 hidden sm:inline-flex">
              Public Queue
            </Link>
            <Link href="/admin" className="btn-nova text-sm !py-2 !px-3 inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Open Admin Queue
            </Link>
          </div>
        </div>
        {user && (
          <p className="text-xs text-ash ml-[52px]">
            Signed in as <span className="text-moonlight font-medium">{user.username}</span>{" "}
            <span className="tag tag-plasma text-[10px] ml-1 align-middle">{user.role}</span>
          </p>
        )}
      </div>

      {/* Error banner */}
      {isError && (
        <div className="bg-supernova/10 border border-supernova/20 text-supernova rounded-xl px-4 py-3 text-sm mb-6 animate-in">
          {(error as Error).message || "Failed to load overview"}
        </div>
      )}

      {/* Pending count hero + stats */}
      <div className="grid grid-cols-12 gap-4 mb-6 animate-in animate-in-delay-1">
        {/* Pending hero */}
        <div className="col-span-12 lg:col-span-5 glass rounded-2xl p-6 flex flex-col justify-between border-l-4 border-l-solar">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-ash mb-1">Pending review</p>
            <div className="flex items-baseline gap-3">
              <span className="font-display font-bold text-5xl text-solar-bright leading-none">
                {isLoading ? "—" : pendingCount}
              </span>
              <span className="text-sm text-ash">
                project{pendingCount === 1 ? "" : "s"} awaiting moderation
              </span>
            </div>
            <p className="text-xs text-ash/70 mt-3 leading-relaxed">
              New submissions appear here as <span className="text-moonlight">submitted</span>. Claim them in the admin queue to approve, feature, or reject.
            </p>
          </div>
          <div className="mt-5 flex gap-2">
            <Link
              href="/admin"
              className="btn-nova text-sm flex-1 text-center"
            >
              Review in Admin →
            </Link>
            <Link
              href="/queue"
              className="btn-ghost text-sm flex-1 text-center"
            >
              Public queue
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          <div className="glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-aurora-bright">{isLoading ? "—" : stats?.approved ?? 0}</p>
            <p className="text-xs text-ash uppercase tracking-wider mt-0.5">Approved</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-nova-bright">{isLoading ? "—" : stats?.featured ?? 0}</p>
            <p className="text-xs text-ash uppercase tracking-wider mt-0.5">Featured</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-plasma-bright">{isLoading ? "—" : stats?.total ?? 0}</p>
            <p className="text-xs text-ash uppercase tracking-wider mt-0.5">Total</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-supernova/80">{isLoading ? "—" : stats?.rejected ?? 0}</p>
            <p className="text-xs text-ash uppercase tracking-wider mt-0.5">Rejected</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-ash">{isLoading ? "—" : stats?.delisted ?? 0}</p>
            <p className="text-xs text-ash uppercase tracking-wider mt-0.5">Delisted</p>
          </div>
          <div className="glass rounded-2xl p-5 bg-plasma/5 border-plasma/15">
            <p className="text-sm font-semibold text-moonlight leading-tight">Quick links</p>
            <p className="text-xs text-ash mt-1">Jump to queue, explore, or revenue.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 animate-in animate-in-delay-2">
        {/* Pending preview */}
        <div className="col-span-12 lg:col-span-5">
          <div className="glass rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-starlight flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--solar-bright)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Pending preview
              </h3>
              <span className="text-xs text-ash">{pendingPreview.length} newest</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : pendingPreview.length > 0 ? (
              <div className="space-y-3">
                {pendingPreview.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="block bg-stardust/30 border border-dust/20 rounded-xl px-4 py-3 hover:border-plasma/30 hover:bg-stardust/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-starlight group-hover:text-plasma-bright transition-colors truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-ash mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="tag tag-nova text-[10px] !py-0 !px-2">{p.category}</span>
                          {p.username && <span>by {p.username}</span>}
                          <span>{timeAgo(p.created_at)}</span>
                        </p>
                      </div>
                      <span className="shrink-0 text-plasma/60 group-hover:text-plasma-bright transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))}
                <Link href="/admin" className="block text-center text-xs text-plasma-bright hover:text-starlight transition-colors mt-2">
                  View all pending in Admin →
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-aurora/10 border border-aurora/20 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--aurora-bright)" strokeWidth="1.6">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm text-moonlight font-medium">All caught up</p>
                <p className="text-xs text-ash mt-1">No projects pending review</p>
              </div>
            )}
          </div>
        </div>

        {/* Recently moderated */}
        <div className="col-span-12 lg:col-span-7">
          <div className="glass rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-starlight flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-bright)" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                Recently moderated
              </h3>
              <Link href="/admin" className="text-xs text-ash hover:text-moonlight transition-colors">
                Open Admin
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : recentlyModerated.length > 0 ? (
              <div className="space-y-2">
                {recentlyModerated.map((p) => (
                  <Link
                    key={`${p.id}-${p.updated_at ?? p.created_at}`}
                    href={`/projects/${p.slug}`}
                    className="flex items-center gap-3 bg-stardust/20 border border-dust/20 rounded-xl px-4 py-3 hover:border-nova/25 hover:bg-stardust/40 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-medium text-sm text-starlight group-hover:text-nova-bright transition-colors truncate">
                          {p.name}
                        </span>
                        <StatusBadge status={p.status} featured={p.featured} />
                        <span className="tag text-[10px] bg-stardust/50 text-ash border border-dust/20 !py-0 !px-2">
                          {p.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-ash flex-wrap">
                        {p.username && <span>by {p.username}</span>}
                        {p.updated_at && <span>{timeAgo(p.updated_at)}</span>}
                        {p.rejection_reason && (
                          <span className="text-supernova/60 italic truncate max-w-[180px]">{p.rejection_reason}</span>
                        )}
                      </div>
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="shrink-0 text-ash group-hover:text-nova-bright transition-colors"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-stardust/50 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ash)" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="text-sm text-moonlight font-medium">No moderation history yet</p>
                <p className="text-xs text-ash mt-1">Approved, rejected, and delisted projects will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 animate-in animate-in-delay-3">
        <h3 className="font-semibold text-starlight mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ash)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M13 2 L13 12 L18 12" />
            <path d="M16 8 L8 16" />
          </svg>
          Quick links
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/admin"
            className="glass rounded-2xl p-5 hover:border-plasma/30 hover:bg-stardust/70 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-plasma/15 border border-plasma/20 flex items-center justify-center mb-3 group-hover:bg-plasma/20 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--plasma-bright)" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <p className="font-medium text-sm text-starlight">Moderate in Admin</p>
            <p className="text-xs text-ash mt-1">Approve, feature, reject, delist</p>
          </Link>

          <Link
            href="/queue"
            className="glass rounded-2xl p-5 hover:border-solar/25 hover:bg-stardust/70 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-solar/15 border border-solar/20 flex items-center justify-center mb-3 group-hover:bg-solar/20 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--solar-bright)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="font-medium text-sm text-starlight">Public queue</p>
            <p className="text-xs text-ash mt-1">What contributors see awaiting review</p>
          </Link>

          <Link
            href="/explore"
            className="glass rounded-2xl p-5 hover:border-nova/25 hover:bg-stardust/70 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-nova/15 border border-nova/20 flex items-center justify-center mb-3 group-hover:bg-nova/20 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nova-bright)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="font-medium text-sm text-starlight">Explore projects</p>
            <p className="text-xs text-ash mt-1">Live directory of approved & featured</p>
          </Link>

          <a
            href="https://github.com/samieazubike/stellar-wave-hub/blob/main/docs/MAINTAINERS.md"
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-2xl p-5 hover:border-dust/40 hover:bg-stardust/70 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-stardust/60 border border-dust/30 flex items-center justify-center mb-3 group-hover:bg-stardust/80 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--moonlight)" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p className="font-medium text-sm text-starlight">Maintainer guide</p>
            <p className="text-xs text-ash mt-1">Checklist & permission matrix</p>
          </a>
        </div>

        {hasMinRole(user.role, "admin") && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/revenue"
              className="glass rounded-xl px-4 py-3 flex items-center justify-between hover:border-aurora/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-aurora/10 border border-aurora/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--aurora-bright)" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-moonlight group-hover:text-starlight">Revenue dashboard</span>
              </div>
              <span className="text-ash group-hover:text-moonlight">→</span>
            </Link>
            <Link
              href="/admin"
              className="glass rounded-xl px-4 py-3 flex items-center justify-between hover:border-nova/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-nova/10 border border-nova/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--nova-bright)" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-moonlight group-hover:text-starlight">Contract tab (admin)</span>
              </div>
              <span className="text-ash group-hover:text-moonlight">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
