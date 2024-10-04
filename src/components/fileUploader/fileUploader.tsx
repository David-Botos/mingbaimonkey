"use client";

import React, { useRef, useState } from "react";
import { getPresignedUrl, storeDocumentInfo } from "./actions";

const FileUploadComponent = () => {
  const inputFile = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const onButtonClick = () => {
    inputFile.current?.click();
  };

  const onChangeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (uploadedFile) {
      setUploadStatus("Fetching presigned url...");
      const presignedUrlResult = await getPresignedUrl(
        uploadedFile.name,
        uploadedFile.type
      );
      if (!presignedUrlResult.success) {
        setUploadStatus(
          `Failed to get presigned url: ${presignedUrlResult.error}`
        );
        return;
      }

      try {
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
          const storeResult = await storeDocumentInfo(
            uploadedFile.name,
            response.url
          );
          if (storeResult.success) {
            setUploadStatus(
              "File uploaded and stored on your user profile successfully"
            );
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

  return (
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Select file
        </button>
        {uploadedFile && (
          <>
            <p className="text-sm text-gray-600">
              File selected: {uploadedFile.name}
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
  );
};

export default FileUploadComponent;
