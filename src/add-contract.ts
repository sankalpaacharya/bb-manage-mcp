import { z } from "zod";
import { HARNESSES } from "./model";
const base = z
  .object({
    harness: z.enum(HARNESSES),
    source: z.string().min(1).max(1024),
    name: z
      .string()
      .trim()
      .min(1)
      .max(159)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
  })
  .strict();
export const addInput = z.discriminatedUnion("transport", [
  base.extend({
    transport: z.literal("http"),
    url: z
      .string()
      .max(4096)
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        );
      }, "Use an HTTP(S) URL without embedded credentials."),
  }),
  base.extend({
    transport: z.literal("stdio"),
    command: z
      .string()
      .trim()
      .min(1)
      .max(1024)
      .regex(/^[^\u0000-\u001f\u007f]+$/),
    args: z
      .array(
        z
          .string()
          .max(4096)
          .refine((value) => !value.includes("\0")),
      )
      .max(64),
  }),
]);
export type AddInput = z.infer<typeof addInput>;
