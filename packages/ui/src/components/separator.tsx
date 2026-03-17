import { cn } from "@workspace/ui/lib/utils";
import type * as React from "react";

function Separator({
	className,
	orientation = "horizontal",
	decorative = true,
	...props
}: React.ComponentProps<"div"> & {
	orientation?: "horizontal" | "vertical";
	decorative?: boolean;
}) {
	return (
		<div
			role={decorative ? "presentation" : "separator"}
			data-slot="separator"
			className={cn(
				"shrink-0 bg-border",
				orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
				className,
			)}
			{...(!decorative ? { "aria-orientation": orientation } : {})}
			{...props}
		/>
	);
}

export { Separator };
