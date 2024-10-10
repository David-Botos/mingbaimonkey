"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverClient } from "@/utils/supabase/server";
import { s3Client } from "@/utils/aws/s3Client";
import {
  TextractClient,
  StartDocumentAnalysisCommand,
  StartDocumentAnalysisCommandInput,
  FeatureType,
} from "@aws-sdk/client-textract";

// AWS storage functions: this is used to store documents in an S3 bucket for textraction and analysis //
// Fetch a presigned url for file uploads
type PresignedUrlResult =
  | { success: true; url: string }
  | { success: false; error: unknown };

export async function getPresignedUrl(
  fileName: string,
  fileType: string
): Promise<PresignedUrlResult> {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
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

// Supabase storage functions:  This is used to connect uploaded documents to the user that uploaded them so you know what to reference in S3 //

export async function storeDocumentInfo(
  fileName: string,
  s3Name: string,
  s3Url: string
) {
  // Create a serverside supabase client with the secrets and cookie methods to bridge nextjs and supabase auth
  const supabase = serverClient();

  // Get the current user based on the cookies from NextJS
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No authenticated user" };
  }

  // Upload the user's uuid and the s3 url + metadata so the document can be fetched at a later date
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      file_name: fileName,
      s3_name: s3Name,
      s3_url: s3Url,
    })
    .select()
    .single();

  if (error) {
    console.error("Error storing document info in Supabase: ", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

type TriggerStartDocumentAnalysisResult =
  | { success: true; jobId: string; $metadata?: Record<string, any> }
  | { success: false; error: string };

export async function triggerStartDocumentAnalysis(
  fileName: string
): Promise<TriggerStartDocumentAnalysisResult> {
  const textract = new TextractClient();

  const s3Object = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Name: fileName,
  };

  const notifChannel = {
    SNSTopicArn: process.env.AWS_TEXTRACT_SNS_ARN,
    RoleArn: process.env.AWS_TEXTRACT_ROLE_ARN,
  };

  const request: StartDocumentAnalysisCommandInput = {
    DocumentLocation: {
      S3Object: s3Object,
    },
    FeatureTypes: [FeatureType.LAYOUT],
    JobTag: `job_for_${fileName}`,
    NotificationChannel: notifChannel,
  };

  try {
    const command = new StartDocumentAnalysisCommand(request);
    const response = await textract.send(command);

    if (response.$metadata.httpStatusCode === 200) {
      console.log("Textract job started with job id: ", response.JobId);
      return {
        success: true,
        jobId: response.JobId!,
        $metadata: response.$metadata,
      };
    } else {
      console.log(response.$metadata);
      return {
        success: false,
        error: `${response.$metadata.httpStatusCode} Error: Unexpected response from Textract`,
      };
    }
  } catch (error) {
    console.error("Error starting textract job: ", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unknown error occurred while sending textract request",
    };
  }
}

// update supa with textract job
export async function updateSupaWithJob(supaUUID, jobUUID) {
  const supabase = serverClient();
  supabase
    .from("documents")
    .update({ textract_job: jobUUID })
    .eq("id", supaUUID);
}
