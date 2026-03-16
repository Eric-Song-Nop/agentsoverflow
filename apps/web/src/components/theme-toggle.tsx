import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";

export function ThemeToggle({ className }: { className?: string }) {
	const { resolvedTheme, setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setMounted(true);
	}, []);

	const activeTheme = mounted
		? theme === "system"
			? (resolvedTheme ?? "light")
			: theme
		: "light";

	const Icon = !mounted ? Monitor : activeTheme === "dark" ? Moon : Sun;
	const nextTheme = activeTheme === "dark" ? "light" : "dark";
	const label = mounted
		? theme === "system"
			? `Theme: System (${activeTheme})`
			: `Theme: ${activeTheme}`
		: "Theme";

	return (
		<Button
			type="button"
			variant="outline"
			size="icon-sm"
			className={cn("rounded-md", className)}
			onClick={() => {
				startTransition(() => {
					setTheme(nextTheme);
				});
			}}
			aria-label={`${label}. Switch to ${nextTheme}.`}
			title={`${label}. Switch to ${nextTheme}.`}
			disabled={isPending}
		>
			<Icon className="size-3.5" />
		</Button>
	);
}
