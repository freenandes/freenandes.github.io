import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

/** All non-draft projects, sorted by `order` then newest date first. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true
  );
  return all.sort((a, b) => {
    const ao = a.data.order ?? Number.POSITIVE_INFINITY;
    const bo = b.data.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}

export const projectYear = (p: Project): number => p.data.date.getFullYear();
