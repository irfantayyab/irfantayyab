import type { Metadata } from "next";
import { loadWriting } from "@/writing/load";
import { PostList } from "@/writing/post-list";

export const metadata: Metadata = {
  title: "Writing",
  description: "Everything I have written, newest first.",
};

export default async function WritingPage() {
  const { posts } = await loadWriting();
  return (
    <>
      <h1 className="text-4xl/tight font-semibold tracking-tight">Writing</h1>
      <div className="mt-10">
        {posts.length > 0 ? (
          <PostList posts={posts} />
        ) : (
          <p>Nothing here yet.</p>
        )}
      </div>
    </>
  );
}
