"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// AWS storage functions: this is used to store documents in an S3 bucket for textraction and analysis

if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY ||
  !process.env.AWS_REGION
) {
  throw new Error("AWS credentials are not set in the environment variables");
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

type PresignedUrlResult =
  | { success: true; url: string }
  | { success: false; error: unknown };

export async function getPresignedUrl(
  fileName: string,
  fileType: string
): Promise<PresignedUrlResult> {
  const params = {
    Bucket: "cheeto-bandito-textract-test",
    Key: fileName,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(params);
  try {
    const presignedURL = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });
    return { success: true, url: presignedURL };
  } catch (error) {
    console.error("Error generating the pre-signed URL: ", error);
    return { success: false, error: error };
  }
}

// Supabase storage functions:  This is used to connect uploaded documents to the user that uploaded them so you know what to reference in S3

export async function storeDocumentInfo(fileName: string, s3Url: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No authenticated user" };
  }

  const { data, error } = await supabase.from("documents").insert({
    user_id: user.id,
    file_name: fileName,
    s3_url: s3Url,
  });

  if (error) {
    console.error("Error storing document info in Supabase: ", error);
    return { success: false, error: error.message };
  }

  console.log(data);
  return { success: true, data };
}
