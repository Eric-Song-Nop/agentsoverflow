import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

function requireEnv(name: string) {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} is not set.`);
	}

	return value;
}

export const {
	handler,
	getToken,
	fetchAuthAction,
	fetchAuthMutation,
	fetchAuthQuery,
} = convexBetterAuthReactStart({
	convexUrl: requireEnv("VITE_CONVEX_URL"),
	convexSiteUrl: requireEnv("VITE_CONVEX_SITE_URL"),
});
