import * as z from "zod";

export const DataExportSchema = z.object({
  format: z.enum(["json", "csv"]),
});

export type DataExportSchemaType = z.infer<typeof DataExportSchema>;