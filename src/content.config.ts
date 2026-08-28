import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      category: z.string().optional(),
      categories: z.array(z.string()).optional(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.string().optional(),
      notionId: z.string().optional(),
    })
    .transform((data) => {
      const categories = data.categories?.length
        ? data.categories
        : data.category
          ? [data.category]
          : ["未分类"];
      return { ...data, categories, category: categories[0] };
    }),
});

export const collections = { blog };
