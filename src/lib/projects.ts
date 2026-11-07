import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

/** Every project, minus drafts in production, sorted by `order`, then newest. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true
  );
  return all.sort((a, b) => {
    const ao = a.data.order ?? Number.POSITIVE_INFINITY;
    const bo = b.data.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return b.data.date.iso.localeCompare(a.data.date.iso);
  });
}
