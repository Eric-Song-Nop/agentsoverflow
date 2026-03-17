import { cn } from "@workspace/ui/lib/utils";
import type * as React from "react";

function Alert({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			role="alert"
			data-slot="alert"
			className={cn(
				"relative w-full rounded-xl border px-4 py-3 text-sm text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-title"
			className={cn("font-medium leading-none tracking-tight", className)}
			{...props}
		/>
	);
}

function AlertDescription({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-description"
			className={cn("mt-2 text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export { Alert, AlertDescription, AlertTitle };
