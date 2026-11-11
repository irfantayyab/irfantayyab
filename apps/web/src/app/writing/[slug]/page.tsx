import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/app/page-metadata";
import { loadWriting } from "@/writing/load";
import { PostBody } from "@/writing/post-body";
import { PostDate } from "@/writing/post-date";
import { renderPost } from "@/writing/render";
import { postCardPath, postPath, tagPath } from "@/writing/writing";

export const dynamicParams = false;

export async function generateStaticParams() {
  const { posts } = await loadWriting();
  return posts.map(({ slug }) => ({ slug }));
}

async function findPost(slug: string) {
  const writing = await loadWriting();
  const post = writing.posts.find((post) => post.slug === slug);
  if (!post) {
    notFound();
  }
  return { post, tags: writing.tags };
}

export async function generateMetadata({
  params,
}: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { post, tags } = await findPost((await params).slug);
  return pageMetadata({
    path: postPath(post.slug),
    title: post.title,
    description: post.description,
    card: { path: postCardPath(post.slug), alt: post.title },
    article: {
      published: post.date,
      modified: post.updated,
      tags: post.tags.map(
        (slug) => tags.find((tag) => tag.slug === slug)?.label ?? slug,
      ),
    },
  });
}

export default async function PostPage({
  params,
}: PageProps<"/writing/[slug]">) {
  const { post, tags } = await findPost((await params).slug);
  const body = await renderPost(post);
  return (
    <article>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/code.css" precedence="default" />
      <h1 className="text-4xl/tight font-semibold tracking-tight">
        {post.title}
      </h1>
      <p className="mt-2 font-sans text-base text-muted">
        <PostDate day={post.date} />
        {post.updated ? (
          <>
            {" · Updated "}
            <PostDate day={post.updated} />
          </>
        ) : null}
      </p>
      {post.tags.length > 0 ? (
        <ul
          aria-label="Tags"
          className="mt-2 flex flex-wrap gap-x-4 font-sans text-base"
        >
          {post.tags.map((slug) => (
            <li key={slug}>
              <Link href={tagPath(slug)}>
                {tags.find((tag) => tag.slug === slug)?.label ?? slug}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-10">
        <PostBody body={body} />
      </div>
    </article>
  );
}
