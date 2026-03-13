import * as z from "zod";

export const ManageClinicianEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ManageClinicianEmailSchemaType = z.infer<typeof ManageClinicianEmailSchema>;
