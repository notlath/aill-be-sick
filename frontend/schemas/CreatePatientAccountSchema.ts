import * as z from "zod";

export const CreatePatientAccountSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Patient name is required" })
      .max(100, { message: "Name cannot exceed 100 characters" }),
    hasEmail: z.boolean(),
    email: z
      .string()
      .email({ message: "Please enter a valid email address" })
      .optional()
      .or(z.literal("")),
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
  })
  .refine(
    (data) => {
      // If hasEmail is true, email must be provided and valid
      if (data.hasEmail) {
        return data.email && data.email.length > 0;
      }
      return true;
    },
    {
      message: "Email is required when the patient has an email address",
      path: ["email"],
    }
  );

export type CreatePatientAccountSchemaType = z.infer<
  typeof CreatePatientAccountSchema
>;
