import type { Metadata } from "next";
import {
  feedPath,
  pageMetadata,
  writingDescription,
} from "@/app/page-metadata";
import { loadWriting } from "@/writing/load";
import { PostList } from "@/writing/post-list";

export const metadata: Metadata = pageMetadata({
  path: "/writing",
  title: "Writing",
  description: writingDescription,
});

export default async function WritingPage() {
  const { posts } = await loadWriting();
  return (
    <>
      <h1 className="text-4xl/tight font-semibold tracking-tight">Writing</h1>
      <p className="mt-2 font-sans text-base">
        <a href={feedPath}>RSS</a>
      </p>
      <div className="mt-10">
        <PostList posts={posts} />
      </div>
    </>
  );
}
