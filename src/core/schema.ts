import { z } from "zod";

const fillStyleSchema = z.enum(["solid", "hachure", "cross-hatch"]);
const strokeStyleSchema = z.enum(["solid", "dashed", "dotted"]);
const textAlignSchema = z.enum(["left", "center", "right"]);
const verticalAlignSchema = z.enum(["top", "middle", "bottom"]);
const arrowheadSchema = z
  .enum(["arrow", "bar", "dot", "triangle"])
  .nullable()
  .optional();

const labelSchema = z.object({
  text: z.string(),
  fontSize: z.number().positive().optional(),
  fontFamily: z.number().int().min(1).max(5).optional(),
  textAlign: textAlignSchema.optional(),
  verticalAlign: verticalAlignSchema.optional(),
  strokeColor: z.string().optional(),
});

const bindingTargetSchema = z.object({
  id: z.string(),
});

const pointSchema = z.tuple([z.number(), z.number()]);

const roundnessSchema = z
  .object({
    type: z.number().int(),
    value: z.number().optional(),
  })
  .nullable()
  .optional();

const diagramElementSchema = z
  .object({
    type: z.enum([
      "rectangle",
      "ellipse",
      "diamond",
      "text",
      "arrow",
      "line",
      "freedraw",
      "frame",
      "image",
    ]),
    id: z.string().optional(),
    x: z.number().optional().default(0),
    y: z.number().optional().default(0),
    width: z.number().optional(),
    height: z.number().optional(),
    strokeColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    fillStyle: fillStyleSchema.optional(),
    strokeWidth: z.number().positive().optional(),
    strokeStyle: strokeStyleSchema.optional(),
    roughness: z.number().min(0).max(2).optional(),
    opacity: z.number().min(0).max(100).optional(),
    rotation: z.number().optional(),
    roundness: roundnessSchema,
    label: labelSchema.optional(),
    // Text-specific
    text: z.string().optional(),
    fontSize: z.number().positive().optional(),
    fontFamily: z.number().int().min(1).max(5).optional(),
    textAlign: textAlignSchema.optional(),
    // Arrow/line-specific
    points: z.array(pointSchema).optional(),
    start: bindingTargetSchema.optional(),
    end: bindingTargetSchema.optional(),
    startArrowhead: arrowheadSchema,
    endArrowhead: arrowheadSchema,
    // Freedraw-specific
    pressures: z.array(z.number()).optional(),
    simulatePressure: z.boolean().optional(),
    // Frame-specific
    name: z.string().optional(),
    // Image-specific
    fileId: z.string().optional(),
    status: z.string().optional(),
    // Group
    groupIds: z.array(z.string()).optional(),
  })
  .refine(
    (el) => {
      if (el.type === "text" && !el.text) {
        return false;
      }
      return true;
    },
    { message: "Text elements must have a 'text' property" },
  );

const diagramMetaSchema = z.object({
  title: z.string().optional(),
  theme: z.enum(["light", "dark"]).optional(),
  background: z.string().optional(),
});

export const diagramInputSchema = z.object({
  meta: diagramMetaSchema.optional(),
  elements: z.array(diagramElementSchema).min(1, "At least one element is required"),
});
