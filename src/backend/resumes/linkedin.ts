import { z } from "zod";

/** Personal LinkedIn URLs only. Blank removes the link; tracking queries are not stored. */
export const linkedinUrlInput = z.string().trim().max(500).transform((value, context) => {
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    context.addIssue({ code: "custom", message: "Enter a LinkedIn profile URL, like https://www.linkedin.com/in/your-name." });
    return z.NEVER;
  }

  const linkedinHost = url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");
  const profile = url.pathname.match(/^\/in\/([a-z0-9_%-]+)\/?$/i);
  if (url.protocol !== "https:" || !linkedinHost || url.username || url.password || url.port || !profile) {
    context.addIssue({ code: "custom", message: "Use an HTTPS LinkedIn profile link, like https://www.linkedin.com/in/your-name." });
    return z.NEVER;
  }

  return `https://www.linkedin.com/in/${profile[1]}`;
});
