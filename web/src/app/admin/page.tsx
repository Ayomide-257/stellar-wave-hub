"use client";

import {useCallback, useEffect, useState} from "react";
import {useAuth} from "@/context/AuthContext";
import Link from "next/link";

const CATEGORIES = [
	"defi",
	"payments",
	"infrastructure",
	"tooling",
	"nft",
	"dao",
	"social",
	"gaming",
	"rwa",
	"other",
];

interface Project {
	id: number;
	name: string;
	slug: string;
	description: string;
	category: string;
	status: string;
	username: string;
	stellar_account_id?: string;
	created_at: string;
}

interface Maintainer {
	id: number;
	username: string;
	email: string | null;
	role: string;
}

export default function AdminPage() {
	const {user, token} = useAuth();
	const [pending, setPending] = useState<Project[]>([]);
	const [maintainers, setMaintainers] = useState<Maintainer[]>([]);
	const [assignments, setAssignments] = useState<Record<number, string[]>>({});
	const [loading, setLoading] = useState(true);
	const [maintainersLoading, setMaintainersLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState<number | null>(null);
	const [savingMaintainer, setSavingMaintainer] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const canReview = user?.role === "admin" || user?.role === "maintainer";
	const isAdmin = user?.role === "admin";

	const fetchPending = useCallback(async () => {
		setError(null);
		try {
			const res = await fetch("/api/projects/pending", {
				headers: {Authorization: `Bearer ${token}`},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Unable to load queue");
			setPending(data.projects || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to load queue");
		}
		setLoading(false);
	}, [token]);

	const fetchMaintainers = useCallback(async () => {
		setMaintainersLoading(true);
		try {
			const res = await fetch("/api/users/list", {
				headers: {Authorization: `Bearer ${token}`},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Unable to load maintainers");

			const users = data.users || [];
			setMaintainers(users);

			const categoryEntries = await Promise.all(
				users.map(async (maintainer: Maintainer) => {
					const categoriesRes = await fetch(
						`/api/users/${maintainer.id}/categories`,
						{headers: {Authorization: `Bearer ${token}`}},
					);
					const categoriesData = await categoriesRes.json();
					if (!categoriesRes.ok) {
						throw new Error(
							categoriesData.error || "Unable to load assignments",
						);
					}
					return [maintainer.id, categoriesData.categories || []] as const;
				}),
			);

			setAssignments(Object.fromEntries(categoryEntries));
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Unable to load maintainer assignments",
			);
		}
		setMaintainersLoading(false);
	}, [token]);

	useEffect(() => {
		if (!token) {
			setLoading(false);
			return;
		}
		fetchPending();
	}, [token, fetchPending]);

	useEffect(() => {
		if (token && isAdmin) {
			fetchMaintainers();
		}
	}, [token, isAdmin, fetchMaintainers]);

	const handleAction = async (
		projectId: number,
		action: "approve" | "reject",
		extra?: {featured?: boolean; reason?: string},
	) => {
		setActionLoading(projectId);
		setError(null);
		try {
			const res = await fetch(`/api/projects/${projectId}/${action}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(extra || {}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || `Unable to ${action} project`);
			setPending((prev) => prev.filter((p) => p.id !== projectId));
		} catch (err) {
			setError(err instanceof Error ? err.message : `Unable to ${action} project`);
		}
		setActionLoading(null);
	};

	const toggleAssignment = (maintainerId: number, category: string) => {
		setAssignments((prev) => {
			const current = prev[maintainerId] || [];
			return {
				...prev,
				[maintainerId]: current.includes(category)
					? current.filter((item) => item !== category)
					: [...current, category],
			};
		});
	};

	const saveAssignments = async (maintainerId: number) => {
		setSavingMaintainer(maintainerId);
		setError(null);
		try {
			const res = await fetch(`/api/users/${maintainerId}/categories`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({categories: assignments[maintainerId] || []}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Unable to save assignments");
			setAssignments((prev) => ({
				...prev,
				[maintainerId]: data.categories || [],
			}));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to save assignments",
			);
		}
		setSavingMaintainer(null);
	};

	if (!user || !canReview) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center px-4">
				<div className="glass rounded-2xl p-12 text-center max-w-md">
					<div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-supernova/10 flex items-center justify-center">
						<svg
							width="28"
							height="28"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--supernova)"
							strokeWidth="1.5"
						>
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						</svg>
					</div>
					<h2 className="font-semibold text-xl text-starlight mb-2">
						Review access required
					</h2>
					<p className="text-ash mb-6">
						Only admins and assigned maintainers can view this page
					</p>
					<Link href="/explore" className="btn-ghost inline-flex">
						Back to Explore
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div className="mb-8 animate-in">
				<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
					<div>
						<h1 className="font-display font-bold text-3xl text-starlight mb-1">
							{isAdmin ? "Admin Dashboard" : "Maintainer Queue"}
						</h1>
						<p className="text-ash">
							{isAdmin
								? "Review submissions and assign category maintainers"
								: "Review submissions in your assigned categories"}
						</p>
					</div>
					<span className="tag tag-solar self-start sm:self-auto">
						{user.role}
					</span>
				</div>
			</div>

			{error && (
				<div className="mb-6 rounded-xl border border-supernova/25 bg-supernova/10 px-4 py-3 text-sm text-red-100">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 animate-in animate-in-delay-1">
				<div className="glass rounded-2xl p-6 text-center">
					<p className="text-3xl font-bold text-solar-bright">
						{pending.length}
					</p>
					<p className="text-sm text-ash mt-1">Pending Review</p>
				</div>
				<div className="glass rounded-2xl p-6 text-center">
					<p className="text-3xl font-bold text-aurora-bright">
						{isAdmin ? maintainers.length : "-"}
					</p>
					<p className="text-sm text-ash mt-1">Maintainers</p>
				</div>
				<div className="glass rounded-2xl p-6 text-center">
					<p className="text-3xl font-bold text-plasma-bright">
						{isAdmin
							? Object.values(assignments).reduce(
									(total, cats) => total + cats.length,
									0,
								)
							: "-"}
					</p>
					<p className="text-sm text-ash mt-1">Category Assignments</p>
				</div>
			</div>

			{isAdmin && (
				<section className="mb-10 animate-in animate-in-delay-2">
					<h2 className="font-semibold text-xl text-starlight mb-6">
						Category Maintainers
					</h2>

					{maintainersLoading ? (
						<div className="skeleton h-40 rounded-2xl" />
					) : maintainers.length > 0 ? (
						<div className="space-y-4">
							{maintainers.map((maintainer) => (
								<div key={maintainer.id} className="glass rounded-2xl p-6">
									<div className="flex flex-col lg:flex-row lg:items-start gap-5">
										<div className="lg:w-56 shrink-0">
											<h3 className="font-semibold text-starlight">
												{maintainer.username}
											</h3>
											<p className="text-sm text-ash truncate">
												{maintainer.email || "No email"}
											</p>
										</div>
										<div className="flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
											{CATEGORIES.map((category) => (
												<label
													key={category}
													className="flex items-center gap-2 rounded-xl border border-dust/70 bg-void/30 px-3 py-2 text-sm text-moonlight hover:border-nova/50"
												>
													<input
														type="checkbox"
														checked={(assignments[maintainer.id] || []).includes(
															category,
														)}
														onChange={() =>
															toggleAssignment(maintainer.id, category)
														}
														className="accent-violet-500"
													/>
													<span className="capitalize">{category}</span>
												</label>
											))}
										</div>
										<button
											disabled={savingMaintainer === maintainer.id}
											onClick={() => saveAssignments(maintainer.id)}
											className="btn-nova text-sm !py-2 !px-4 shrink-0 disabled:opacity-50"
										>
											{savingMaintainer === maintainer.id ? "Saving" : "Save"}
										</button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="glass rounded-2xl p-8 text-center text-ash">
							No maintainer accounts found
						</div>
					)}
				</section>
			)}

			<section className="animate-in animate-in-delay-3">
				<h2 className="font-semibold text-xl text-starlight mb-6">
					Pending Submissions
				</h2>

				{loading ? (
					<div className="space-y-4">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="skeleton h-36 rounded-2xl" />
						))}
					</div>
				) : pending.length > 0 ? (
					<div className="space-y-4">
						{pending.map((project) => (
							<div key={project.id} className="glass rounded-2xl p-6">
								<div className="flex flex-col lg:flex-row lg:items-start gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex flex-wrap items-center gap-3 mb-2">
											<h3 className="font-semibold text-lg text-starlight">
												{project.name}
											</h3>
											<span className="tag tag-nova">
												{project.category}
											</span>
										</div>
										<p className="text-sm text-moonlight/80 mb-2 line-clamp-2">
											{project.description}
										</p>
										<div className="flex flex-wrap gap-4 text-xs text-ash">
											<span>by {project.username || "Unknown"}</span>
											<span>
												{new Date(project.created_at).toLocaleDateString()}
											</span>
											{project.stellar_account_id && (
												<span className="font-mono">
													{project.stellar_account_id.slice(0, 10)}
													...
												</span>
											)}
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-2 shrink-0">
										<Link
											href={`/projects/${project.slug}`}
											className="btn-ghost text-sm !py-2 !px-3"
										>
											Preview
										</Link>
										<button
											disabled={actionLoading === project.id}
											onClick={() =>
												handleAction(project.id, "approve", {featured: false})
											}
											className="bg-aurora/15 hover:bg-aurora/25 text-aurora-bright border border-aurora/20 font-medium text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-50"
										>
											Approve
										</button>
										<button
											disabled={actionLoading === project.id}
											onClick={() =>
												handleAction(project.id, "approve", {featured: true})
											}
											className="bg-solar/15 hover:bg-solar/25 text-solar-bright border border-solar/20 font-medium text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-50"
										>
											Feature
										</button>
										<button
											disabled={actionLoading === project.id}
											onClick={() => {
												const reason = prompt("Rejection reason (optional):");
												handleAction(project.id, "reject", {
													reason: reason || undefined,
												});
											}}
											className="bg-supernova/15 hover:bg-supernova/25 text-supernova border border-supernova/20 font-medium text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-50"
										>
											Reject
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="glass rounded-2xl p-12 text-center">
						<div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-aurora/10 flex items-center justify-center">
							<svg
								width="28"
								height="28"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--aurora)"
								strokeWidth="1.5"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
						</div>
						<h3 className="font-semibold text-lg text-moonlight mb-2">
							All caught up!
						</h3>
						<p className="text-ash">No projects pending review</p>
					</div>
				)}
			</section>
		</div>
	);
}
