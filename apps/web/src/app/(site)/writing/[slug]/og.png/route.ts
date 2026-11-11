import { renderCard } from "@/app/card";
import { resume } from "@/resume/claims";
import { formatDate } from "@/writing/date";
import { loadWriting } from "@/writing/load";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const { posts } = await loadWriting();
  return posts.map(({ slug }) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/writing/[slug]/og.png">,
) {
  const { slug } = await params;
  const { posts } = await loadWriting();
  const post = posts.find((post) => post.slug === slug);
  if (!post) {
    throw new Error(`No post with the slug ${slug}`);
  }
  return renderCard({
    title: post.title,
    subtitle: formatDate(post.date),
    footer: `${resume.name} · ${resume.headline}`,
  });
}
