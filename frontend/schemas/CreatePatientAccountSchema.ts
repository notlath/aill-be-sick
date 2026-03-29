import * as z from "zod";

export const CreatePatientAccountSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Patient name is required" })
    .max(100, { message: "Name cannot exceed 100 characters" }),
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  birthday: z
    .string()
    .min(1, { message: "Date of birth is required" })
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Please enter a valid date" }
    )
    .refine(
      (val) => {
        const date = new Date(val);
        return date < new Date();
      },
      { message: "Date of birth must be in the past" }
    ),
});

export type CreatePatientAccountSchemaType = z.infer<
  typeof CreatePatientAccountSchema
>;
