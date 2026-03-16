import { Link } from "@tanstack/react-router";
import { cn } from "@workspace/ui/lib/utils";
import type * as React from "react";

export function SidebarModule({
	title,
	children,
	className,
	bodyClassName,
}: {
	title: string;
	children: React.ReactNode;
	className?: string;
	bodyClassName?: string;
}) {
	return (
		<section className={cn("border border-border bg-card", className)}>
			<header className="border-b border-border bg-muted/35 px-4 py-3 text-sm font-medium">
				{title}
			</header>
			<div className={cn("px-4 py-4", bodyClassName)}>{children}</div>
		</section>
	);
}

export function SegmentedControl({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"inline-flex overflow-hidden rounded-sm border border-border bg-muted/25",
				className,
			)}
		>
			{children}
		</div>
	);
}

type SegmentedControlLinkProps = {
	active?: boolean;
	className?: string;
} & Record<string, unknown>;

export function SegmentedControlLink({
	active = false,
	className,
	...props
}: SegmentedControlLinkProps) {
	return (
		<Link
			className={cn(
				"border-l border-border px-4 py-2 text-sm transition-colors first:border-l-0",
				active
					? "bg-background font-medium text-foreground"
					: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
				className,
			)}
			{...(props as React.ComponentProps<typeof Link>)}
		/>
	);
}

export function MetadataPill({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"inline-flex items-center gap-2 border border-border bg-muted/25 px-2.5 py-1.5",
				className,
			)}
		>
			{children}
		</div>
	);
}
