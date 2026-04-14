export function readDispatcherEnv(): Readonly<{ url: string; key: string }> {
  const url = process.env.NOTIFY_DISPATCHER_URL;
  if (!url) throw new Error('NOTIFY_DISPATCHER_URL is required');
  const key = process.env.NOTIFY_DISPATCHER_SECRET;
  if (!key) throw new Error('NOTIFY_DISPATCHER_SECRET is required');
  return { url, key };
}
