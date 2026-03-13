"use server";

import prisma from "@/prisma/prisma";
import { UpdateProfileSchema } from "@/schemas/UpdateProfileSchema";
import { ProfileSchema } from "@/schemas/ProfileSchema";
import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/user";
import { revalidatePath, revalidateTag } from "next/cache";
import * as z from "zod";
import { actionClient } from "./client";

export const updateProfile = actionClient
  .inputSchema(UpdateProfileSchema)
  .action(async ({ parsedInput }) => {
    const { name, region, province, city, barangay, gender, birthday } =
      parsedInput;

    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { authId: authUser.id },
        data: {
          name,
          region: region || null,
          province: province || null,
          city: city || null,
          barangay: barangay || null,
          gender: gender || null,
          birthday: birthday ? new Date(birthday) : null,
        },
      });

      revalidateTag(`user-${authUser.id}`, { expire: 0 });
      revalidatePath("/", "layout");

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error(`Error updating profile: ${error}`);
      return { error: "Failed to update profile" };
    }
  });

export const updateProfileLocation = actionClient
  .inputSchema(ProfileSchema)
  .action(async ({ parsedInput }) => {
    const {
      birthday,
      gender,
      address,
      district,
      city,
      barangay,
      region,
      province,
      latitude,
      longitude,
    } = parsedInput;

    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { authId: authUser.id },
        data: {
          birthday: birthday ? new Date(birthday) : null,
          gender: gender || null,
          address: address || null,
          district: district || null,
          city: city || null,
          barangay: barangay || null,
          region: region || null,
          province: province || null,
          latitude: latitude || null,
          longitude: longitude || null,
        },
      });

      revalidateTag(`user-${authUser.id}`, { expire: 0 });
      revalidatePath("/", "layout");

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error(`Error updating profile location: ${error}`);
      return { error: "Failed to update profile location" };
    }
  });

export const uploadAvatar = actionClient
  .inputSchema(
    z.object({
      formData: z.instanceof(FormData),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { formData } = parsedInput;
    const file = formData.get("avatar") as File;

    if (!file || file.size === 0) {
      return { error: "No file provided" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return {
        error: "Invalid file type. Please upload JPEG, PNG, WebP, or GIF.",
      };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { error: "File size must be less than 5MB" };
    }

    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    try {
      const supabase = await createClient();

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Error uploading avatar: ${uploadError.message}`);
        return { error: "Failed to upload avatar" };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update user in database
      const updatedUser = await prisma.user.update({
        where: { authId: authUser.id },
        data: {
          avatar: avatarUrl,
        },
      });

      revalidateTag(`user-${authUser.id}`, { expire: 0 });
      revalidatePath("/", "layout");

      return { success: true, avatarUrl, user: updatedUser };
    } catch (error) {
      console.error(`Error uploading avatar: ${error}`);
      return { error: "Failed to upload avatar" };
    }
  });

export const removeAvatar = actionClient.action(async () => {
  const authUser = await getAuthUser();

  if (!authUser) {
    return { error: "Not authenticated" };
  }

  try {
    const supabase = await createClient();

    // Get current user to find avatar path
    const dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (dbUser?.avatar) {
      // Extract file path from URL
      const urlParts = dbUser.avatar.split("/");
      const filePath = urlParts.slice(-2).join("/");

      // Delete from Supabase Storage
      await supabase.storage.from("avatars").remove([filePath]);
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { authId: authUser.id },
      data: {
        avatar: null,
      },
    });

    revalidateTag(`user-${authUser.id}`, { expire: 0 });
    revalidatePath("/", "layout");

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error(`Error removing avatar: ${error}`);
    return { error: "Failed to remove avatar" };
  }
});
