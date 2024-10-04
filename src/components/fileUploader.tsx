"use client";
import React, { useRef, useState } from "react";

const FileUploadComponent = () => {
  const inputFile = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const onButtonClick = () => {
    if (inputFile) {
      inputFile.current?.click();
    }
  };

  const onChangeFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log(file);
      setUploadedFile(file);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <div className="mb-4">
        <p className="text-lg font-semibold">Upload Document</p>
      </div>
      <div className="flex gap-2 items-center">
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
          Click here to upload
        </button>
        {uploadedFile && (
          <p className="text-sm text-gray-600">
            File uploaded: {uploadedFile.name}
          </p>
        )}
      </div>
    </div>
  );
};

export default FileUploadComponent;
