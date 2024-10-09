"use client";

import React, { useRef, useState } from "react";
import {
  getPresignedUrl,
  storeDocumentInfo,
  triggerStartDocumentAnalysis,
  updateSupaWithJob,
} from "./actions";
import { rename } from "fs/promises";
import { join } from "path";
import { generateUUID } from "@/utils/utils";

const FileUploadComponent = () => {
  const inputFile = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileOriginalName, setFileOriginalName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [canContinue, setCanContinue] = useState<boolean>(false);
  const [textractJobId, setTextractJobId] = useState<string | null>(null);
  const [supaUUID, setSupaUUID] = useState<string | null>(null);

  // this opens up the file selector and puts the file into the input ref
  const onButtonClick = () => {
    inputFile.current?.click();
  };

  // this triggers when the input file changes. if there are multiple files uploaded, it selects the first one, then sets the useState which shows the upload button
  const onChangeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  function dupeFileForUpload(file: File, newName: string): File {
    return new File([file], newName, {
      type: file.type,
      lastModified: file.lastModified,
    });
  }

  // when the upload button is clicked
  const handleUpload = async () => {
    if (uploadedFile) {
      // rename file to unique uuid and store original name for user reference
      setFileOriginalName(uploadedFile.name);
      const uniqueName = `${generateUUID()}.pdf`;
      const fileForS3 = dupeFileForUpload(uploadedFile, uniqueName);
      // checking that files renamed successfully
      console.log("file's original name: ", fileOriginalName);
      console.log("file's s3 name: ", fileForS3.name);

      // get presigned url
      setUploadStatus("Fetching presigned url...");
      const presignedUrlResult = await getPresignedUrl(
        fileForS3.name,
        uploadedFile.type
      );
      if (!presignedUrlResult.success) {
        setUploadStatus(
          `Failed to get presigned url: ${presignedUrlResult.error}`
        );
        return;
      }

      try {
        // upload to s3
        setUploadStatus("Uploading to S3...");
        const response = await fetch(presignedUrlResult.url, {
          method: "PUT",
          body: uploadedFile,
          headers: {
            "Content-Type": uploadedFile.type,
          },
        });
        if (response.ok) {
          setUploadStatus(
            `Upload Successful. Storing document in your user profile...`
          );
          // store s3 url
          const storeResult = await storeDocumentInfo(
            fileOriginalName,
            fileForS3.name,
            response.url
          );
          if (storeResult.success) {
            setUploadStatus(
              "File uploaded and stored on your user profile successfully"
            );
            setSupaUUID(storeResult.data.id);
            // Trigger textract job
            setUploadStatus("Retrieving Textract Job ID...");
            console.log("fileForS3.name = ", fileForS3.name);
            const result = await triggerStartDocumentAnalysis(fileForS3.name);
            if (result.success) {
              setTextractJobId(result.jobId);
              // TODO: FINISH update supa with textract job id
              updateSupaWithJob(supaUUID, textractJobId);
              setUploadStatus(
                `Textract analysis initiated successfully with jobID ${result.jobId}`
              );
              setCanContinue(true);
            } else {
              setUploadStatus(
                `Failed to initiate Textract analysis: ${result.error}`
              );
            }
          } else {
            setUploadStatus(
              "File uploaded but failed to be stored on the user profile successfully"
            );
          }
        } else {
          setUploadStatus(`Upload failed: ${response.statusText}`);
          console.log(response);
        }
      } catch (error) {
        if (error instanceof Error)
          setUploadStatus(`Upload failed: ${error.message}`);
        else setUploadStatus(`Upload failed with an unknown error`);
      }
    }
  };

  const handleTextract = () => {
    if (textractJobId) {
      console.log(`Retrieving Textract results for job ID: ${textractJobId}`);
      // router.push(`/textract-results/${textractJobId}`);
    } else {
      setUploadStatus(
        "No Textract job ID available. Please upload a file first."
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 border rounded-lg shadow-sm">
        <div className="mb-4">
          <p className="text-lg font-semibold">Upload Document</p>
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            id="fileUploadInput"
            ref={inputFile}
            className="hidden"
            onChange={onChangeFile}
          />
          <button
            onClick={onButtonClick}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Select file
          </button>
          {uploadedFile && (
            <>
              <p className="text-sm text-gray-600">
                File selected: {fileOriginalName}
              </p>
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Upload to S3
              </button>
            </>
          )}
          {uploadStatus && (
            <p className="text-sm text-gray-600">{uploadStatus}</p>
          )}
        </div>
      </div>
      {canContinue && (
        <button
          onClick={handleTextract}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          View Textract Results
        </button>
      )}
    </div>
  );
};

export default FileUploadComponent;
