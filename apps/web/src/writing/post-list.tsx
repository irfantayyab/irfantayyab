import Link from "next/link";
import { PostDate } from "./post-date";
import { type Post, postPath } from "./writing";

export function PostList({
  posts,
  descriptions = true,
}: {
  posts: readonly Post[];
  descriptions?: boolean;
}) {
  return (
    <ul className={descriptions ? "space-y-6" : "space-y-3"}>
      {posts.map((post) => (
        <li key={post.slug}>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <Link href={postPath(post.slug)}>{post.title}</Link>
            <span className="shrink-0 font-sans text-base text-muted">
              <PostDate day={post.date} />
            </span>
          </div>
          {descriptions ? <p className="mt-1">{post.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}
