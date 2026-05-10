import { defineCollection, z } from "astro:content";

const videos = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    title_zh: z.string().optional(),
    youtube_id: z.string(),
    year: z.number().optional(),
    description: z.string().optional(),
    // Slug of the associated publication (e.g., "2024-hsu-condensation-shock").
    related_pub: z.string().optional(),
    tags: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

const publications = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    title_zh: z.string().optional(),
    authors: z.array(z.string()),
    venue: z.string(),
    venue_short: z.string().optional(),
    year: z.number(),
    type: z.enum(["journal", "conference", "thesis", "preprint"]),
    doi: z.string().optional(),
    url: z.string().url().optional(),
    pdf: z.string().optional(),
    bibtex: z.string().optional(),
    abstract: z.string().optional(),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

const members = defineCollection({
  type: "content",
  schema: z.object({
    name_zh: z.string(),
    name_en: z.string(),
    role: z.enum([
      "pi",
      "postdoc",
      "phd",
      "ms",
      "undergrad",
      "research-assistant",
      "alumni",
    ]),
    email: z.string().email().optional(),
    photo: z.string().optional(),
    affiliation: z.string().optional(),
    interests: z.array(z.string()).default([]),
    cv: z.string().optional(),
    homepage: z.string().url().optional(),
    google_scholar: z.string().url().optional(),
    orcid: z.string().optional(),
    joined: z.string().optional(),
    graduated: z.string().optional(),
    current_position: z.string().optional(),
    order: z.number().default(100),
  }),
});

const research = defineCollection({
  type: "content",
  schema: z.object({
    title_zh: z.string(),
    title_en: z.string(),
    summary: z.string(),
    cover: z.string().optional(),
    order: z.number().default(100),
    related_publications: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  }),
});

const courses = defineCollection({
  type: "content",
  schema: z.object({
    code: z.string(),
    title_zh: z.string(),
    title_en: z.string().optional(),
    semester: z.string(),
    instructor: z.string(),
    level: z.enum(["undergrad", "grad", "both"]),
    credits: z.number().optional(),
    syllabus: z.string().optional(),
    materials: z
      .array(
        z.object({
          title: z.string(),
          file: z.string(),
          type: z.enum(["lecture", "homework", "project", "exam", "other"]),
        }),
      )
      .default([]),
  }),
});

const software = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    language: z.enum(["julia", "python", "matlab", "fortran", "cpp", "other"]),
    license: z.string(),
    repo: z.string().url(),
    latest_release: z.string().optional(),
    docs: z.string().url().optional(),
    doi: z.string().optional(),
    citation: z.string().optional(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title_zh: z.string(),
    title_en: z.string().optional(),
    funder: z.string(),
    grant_id: z.string().optional(),
    period_start: z.string(),
    period_end: z.string(),
    pi: z.string(),
    co_pis: z.array(z.string()).default([]),
    summary: z.string(),
    // 計畫總經費（單位：千元 NTD）— optional
    budget_twd: z.number().optional(),
    active: z.boolean().default(true),
  }),
});

export const collections = {
  videos,
  publications,
  members,
  research,
  courses,
  software,
  news,
  projects,
};
