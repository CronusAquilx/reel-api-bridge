/** Optional catalog failures must not discard matching songs. */
export async function catalogSearch<T, A, R>(songs: () => Promise<T[]>, albums: () => Promise<A[]>, artists: () => Promise<R[]>, fallback: () => Promise<T[]>) {
  const [t, a, r] = await Promise.allSettled([songs(), albums(), artists()]);
  const tracks = t.status === "fulfilled" ? t.value : await fallback();
  return { tracks, albums: a.status === "fulfilled" ? a.value : [], artists: r.status === "fulfilled" ? r.value : [] };
}