import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadWriting } from "@/writing/load";
import { PostList } from "@/writing/post-list";

export const dynamicParams = false;

export async function generateStaticParams() {
  const { tags } = await loadWriting();
  return tags.map(({ slug }) => ({ tag: slug }));
}

async function findTag(slug: string) {
  const writing = await loadWriting();
  const tag = writing.tags.find((tag) => tag.slug === slug);
  if (!tag) {
    notFound();
  }
  return {
    tag,
    posts: writing.posts.filter((post) => post.tags.includes(slug)),
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/writing/tags/[tag]">): Promise<Metadata> {
  const { tag } = await findTag((await params).tag);
  return {
    title: `Writing on ${tag.label}`,
    description: `Everything I have written on ${tag.label}, newest first.`,
  };
}

export default async function TagPage({
  params,
}: PageProps<"/writing/tags/[tag]">) {
  const { tag, posts } = await findTag((await params).tag);
  return (
    <>
      <h1 className="text-4xl/tight font-semibold tracking-tight">
        Writing on {tag.label}
      </h1>
      <p className="mt-2 font-sans text-base">
        <Link href="/writing">All writing</Link>
      </p>
      <div className="mt-10">
        <PostList posts={posts} />
      </div>
    </>
  );
}
