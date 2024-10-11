"use server";

import {
  TextractClient,
  GetDocumentAnalysisCommand,
  GetDocumentAnalysisCommandInput,
  Block,
} from "@aws-sdk/client-textract";

const textract = new TextractClient({ region: "us-east-2" });

type JobStatus = "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "PARTIAL_SUCCESS";

type CheckJobStatusResults =
  | { status: "SUCCEEDED"; blocks: Block[] | undefined }
  | { status: "FAILED"; error: string }
  | { status: "PARTIAL_SUCCESS"; blocks: Block[] | undefined; error: string }
  | { status: "IN_PROGRESS" }
  | { error: string };

export async function checkJobStatus(
  jobId: string
): Promise<CheckJobStatusResults> {
  console.log(`Job ID before creating request ${jobId}`);
  const request: GetDocumentAnalysisCommandInput = {
    JobId: jobId,
    MaxResults: 1,
  };
  const command = new GetDocumentAnalysisCommand(request);

  try {
    console.log(
      `Sending request to Textract.  This is the request ${JSON.stringify(
        request
      )}`
    );
    const response = await textract.send(command);
    console.log(
      "Received response from Textract:",
      JSON.stringify(response, null, 2)
    );

    switch (response.JobStatus as JobStatus) {
      case "SUCCEEDED":
        console.log("Job succeeded");
        return { status: "SUCCEEDED", blocks: response.Blocks };
      case "FAILED":
        console.log("Job failed");
        return {
          status: "FAILED",
          error: `Job failed: ${JSON.stringify(response.$metadata)}`,
        };
      case "PARTIAL_SUCCESS":
        console.log("Job partially succeeded");
        return {
          status: "PARTIAL_SUCCESS",
          blocks: response.Blocks,
          error: `Job completed with partial success.  Here is the metadata: ${response.$metadata}`,
        };
      case "IN_PROGRESS":
        return { status: "IN_PROGRESS" };
      default:
        return { error: `Unexpected job status: ${response.JobStatus}` };
    }
  } catch (error) {
    console.error("Error checking job status:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    if (typeof error === "object" && error !== null && "$metadata" in error) {
      console.error(
        "Error metadata:",
        JSON.stringify((error as any).$metadata, null, 2)
      );
    }
    return { error: `Error checking job status: ${error}` };
  }
}
