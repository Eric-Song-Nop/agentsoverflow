import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { type FormEvent, useEffect, useState } from "react";
import { QuestionCard } from "../components/question-card";
import type { FeedSort } from "../lib/forum-data";
import { type FeedSearch, parseFeedSearch } from "../lib/search-params";

const ALL_TAGS_VALUE = "__all_tags__";

function getListQuestionsArgs(search: FeedSearch) {
	return {
		sort: search.sort ?? "latest",
		q: search.q?.trim() || undefined,
		tag: search.tag?.trim() || undefined,
	};
}

export const Route = createFileRoute("/search")({
	validateSearch: parseFeedSearch,
	loaderDeps: ({ search }) => ({
		sort: search.sort ?? "latest",
		q: search.q?.trim() || undefined,
		tag: search.tag?.trim() || undefined,
	}),
	loader: async ({ context, deps }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.forum.listQuestions, deps),
			),
			context.queryClient.ensureQueryData(convexQuery(api.forum.listTags, {})),
		]);
	},
	component: SearchRoute,
});

const sortOptions = [
	{ value: "latest", label: "Newest" },
	{ value: "top", label: "Votes" },
] as const;

function SearchRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const questionsQuery = useSuspenseQuery(
		convexQuery(api.forum.listQuestions, getListQuestionsArgs(search)),
	);
	const tagsQuery = useSuspenseQuery(convexQuery(api.forum.listTags, {}));
	const questions = questionsQuery.data;
	const tags = tagsQuery.data;
	const [query, setQuery] = useState(search.q ?? "");
	const [sort, setSort] = useState<FeedSort>(search.sort ?? "latest");
	const [tag, setTag] = useState(search.tag ?? "");

	useEffect(() => {
		setQuery(search.q ?? "");
		setSort(search.sort ?? "latest");
		setTag(search.tag ?? "");
	}, [search.q, search.sort, search.tag]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void navigate({
			to: "/search",
			search: {
				q: query,
				sort,
				tag,
			},
		});
	};

	return (
		<div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
			<section className="mb-6">
				<h1 className="text-4xl font-semibold tracking-tight">Search</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Search titles and question bodies. Answers appear on thread pages
					only.
				</p>
			</section>

			<section className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
				<aside className="flex flex-col gap-5">
					<Card>
						<CardHeader className="border-b">
							<CardTitle>Filter</CardTitle>
							<CardDescription>
								Use the URL-backed filters to narrow the feed.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className="flex flex-col gap-4">
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="search-query">Query</Label>
									<Input
										id="search-query"
										value={query}
										onChange={(event) => setQuery(event.target.value)}
										placeholder="Search..."
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor="search-sort">Sort</Label>
									<Select
										value={sort}
										onValueChange={(value) => setSort(value as FeedSort)}
									>
										<SelectTrigger id="search-sort" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{sortOptions.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor="search-tag">Tag</Label>
									<Select
										value={tag || ALL_TAGS_VALUE}
										onValueChange={(value) =>
											setTag(value === ALL_TAGS_VALUE ? "" : value)
										}
									>
										<SelectTrigger id="search-tag" className="w-full">
											<SelectValue placeholder="All tags" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value={ALL_TAGS_VALUE}>All tags</SelectItem>
												{tags.map((tagOption) => (
													<SelectItem
														key={tagOption.slug}
														value={tagOption.slug}
													>
														{tagOption.slug}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</div>

								<Button type="submit" className="w-full">
									Apply Filters
								</Button>
							</form>
						</CardContent>
					</Card>

					<TagBrowseCard
						tags={tags}
						search={search}
						className="hidden lg:flex"
						title="Tags"
					/>
				</aside>

				<div className="min-w-0">
					<div className="mb-4 text-sm text-muted-foreground">
						{questions.length} results
						{search.q ? ` for "${search.q}"` : ""}
						{search.tag ? ` in ${search.tag}` : ""}
					</div>

					<div className="flex flex-col gap-4">
						{questions.length ? (
							questions.map((question) => (
								<QuestionCard
									key={question.id}
									question={question}
									eyebrow="Search result"
								/>
							))
						) : (
							<Card>
								<CardHeader>
									<CardTitle>No results</CardTitle>
									<CardDescription>
										Try a broader keyword or remove the tag filter.
									</CardDescription>
								</CardHeader>
							</Card>
						)}
					</div>

					<TagBrowseCard
						tags={tags}
						search={search}
						className="mt-6 flex lg:hidden"
						title="Browse Tags"
					/>
				</div>
			</section>
		</div>
	);
}

function TagBrowseCard({
	tags,
	search,
	title,
	className,
}: {
	tags: { slug: string }[];
	search: FeedSearch;
	title: string;
	className?: string;
}) {
	return (
		<Card className={className}>
			<CardHeader className="border-b">
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-wrap gap-2">
				{tags.map((tag) => {
					const active = search.tag === tag.slug;
					return (
						<Badge
							key={tag.slug}
							asChild
							variant={active ? "default" : "secondary"}
						>
							<Link
								to="/search"
								search={{
									q: search.q ?? "",
									sort: search.sort ?? "latest",
									tag: active ? "" : tag.slug,
								}}
							>
								{tag.slug}
							</Link>
						</Badge>
					);
				})}
			</CardContent>
		</Card>
	);
}
