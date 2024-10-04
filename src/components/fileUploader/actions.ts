"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
