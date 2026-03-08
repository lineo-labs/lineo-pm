import { useRouter } from "next/router";

/**
 * <VideoWithBase src="/my-video.webm" /> automatically prepends the Next.js
 * basePath so videos resolve correctly on GitHub Pages (/lineo-pm/...).
 */
export default function VideoWithBase({ src, style, ...props }) {
  const { basePath } = useRouter();
  const fullSrc = `${basePath}${src}`;
  return (
    <video {...props} style={style}>
      <source src={fullSrc} type="video/webm" />
    </video>
  );
}
