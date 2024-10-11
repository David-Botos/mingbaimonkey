import ReaderContent from "@/components/fileReader/readerContent";

export default function ReaderPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { jobUUID: string };
}) {
  console.log(
    `params on serverside page.tsx: ${params.slug}, ${searchParams.jobUUID}`
  );
  return (
    <div>
      <h1>Reader Page</h1>
      <ReaderContent supaID={params.slug} jobID={searchParams.jobUUID} />
    </div>
  );
}
