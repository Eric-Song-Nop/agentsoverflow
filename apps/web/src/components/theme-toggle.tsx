"use client";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themeOptions = [
	{
		value: "system",
		label: "System",
		icon: Monitor,
	},
	{
		value: "light",
		label: "Light",
		icon: Sun,
	},
	{
		value: "dark",
		label: "Dark",
		icon: Moon,
	},
] as const;

type ThemeMode = (typeof themeOptions)[number]["value"];

function isThemeMode(value: string | undefined): value is ThemeMode {
	return themeOptions.some((option) => option.value === value);
}

export function ThemeToggle({ className }: { className?: string }) {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const currentTheme = mounted && isThemeMode(theme) ? theme : "system";
	const currentOption =
		themeOptions.find((option) => option.value === currentTheme) ??
		themeOptions[0];
	const CurrentIcon = currentOption.icon;

	return (
		<Select
			value={currentTheme}
			onValueChange={(value) => {
				setTheme(value);
			}}
		>
			<SelectTrigger
				aria-label="Theme"
				data-theme-value={currentTheme}
				size="sm"
				showIndicator={false}
				title={`Theme: ${currentOption.label}`}
				className={cn(
					"size-7 justify-center rounded-md border-border bg-background px-0 hover:bg-muted",
					className,
				)}
			>
				<CurrentIcon />
				<span className="sr-only">{currentOption.label}</span>
			</SelectTrigger>
			<SelectContent align="end" side="bottom" sideOffset={6}>
				<SelectGroup>
					{themeOptions.map(({ icon: Icon, label, value }) => (
						<SelectItem key={value} value={value}>
							<Icon />
							{label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
