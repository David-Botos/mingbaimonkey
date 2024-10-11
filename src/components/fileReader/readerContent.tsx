"use client";

import { useEffect, useState } from "react";
import { checkJobStatus } from "./actions";
import { testCredentials } from "./testTextractCredentials";

type JobResult = Awaited<ReturnType<typeof checkJobStatus>>;

interface ReaderContentProps {
  supaID: string;
  jobID: string;
}

export default function ReaderContent({ supaID, jobID }: ReaderContentProps) {
  const [data, setData] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkJob(jobID);
  }, [jobID]);

  async function checkJob(jobID: string) {
    try {
      const response = await checkJobStatus(jobID);
      setData(response);

      if ("error" in response) {
        setError(response.error);
      } else if (response.status === "IN_PROGRESS") {
        setTimeout(() => {
          checkJob(jobID);
        }, 2000);
      } else if (response.status === "SUCCEEDED") {
        console.log(JSON.stringify(response.blocks));
      } else if (response.status === "PARTIAL_SUCCESS") {
        console.log(
          `${response.error} and here are the blocks ${JSON.stringify(
            response.blocks
          )}`
        );
      }
    } catch (err) {
      setError(`Failed to check job status: ${err}`);
    }
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
