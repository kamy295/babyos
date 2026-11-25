import { z } from "zod";

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const normalized = value.toLowerCase();
    return normalized.startsWith("http://") || normalized.startsWith("https://");
  });

export const optionalMediaUrlSchema = z
  .union([
    z.string().trim().transform((value) => (value === "" ? null : value)),
    z.null(),
  ])
  .pipe(z.union([z.null(), httpUrlSchema]))
  .optional();
