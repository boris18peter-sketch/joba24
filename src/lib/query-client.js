import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: true,
			retry: 1,
			staleTime: 0,        // always treat data as stale — rely on subscriptions + cache writes
			gcTime: 5 * 60 * 1000,
		},
	},
});