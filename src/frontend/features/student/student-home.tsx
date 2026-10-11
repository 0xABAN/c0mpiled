"use client";

import { ExternalLink, FileUser, LogOut, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AnchorButton, Button, LinkButton } from "@/frontend/components/ui/button";
import { Checkbox, TextField } from "@/frontend/components/ui/field";
import { Monogram } from "@/frontend/components/ui/monogram";
import { SelectionCard } from "@/frontend/components/ui/selection-card";
import { useToast } from "@/frontend/components/ui/toast";
import { ResumeCard } from "@/frontend/features/resumes/resume-card";
import { deleteResume, leaveBook, requestBooks } from "@/frontend/lib/api/actions";
import { resumePdfUrl } from "@/frontend/lib/api/routes";
import type { BookSummary, MembershipStatus, ResumeView, SchoolRef, StudentHome as Home } from "@/frontend/lib/api/types";
import { pluralize, timeAgo } from "@/frontend/lib/format";

import { ClubCard, type ClubAtAGlance } from "./club-card";
import { ConfirmButton } from "./confirm-button";
import styles from "./student-home.module.css";

const STATUS_LABELS: Record<MembershipStatus, string> = {
  pending: "Pending",
  accepted: "In the book",
  rejected: "Not accepted",
};

type StudentHomeProps = {
  home: Home;
  /** The club this student runs, or `null` if they don't run one. */
  club: ClubAtAGlance | null;
  school: SchoolRef;
  /** Every book at the student's school. */
  books: BookSummary[];
};

/** A student's one resume and where it stands in each club's book. */
export function StudentHome({ home, club, school, books }: StudentHomeProps) {
  const router = useRouter();
  const toast = useToast();
  const { resume, memberships } = home;

  const requested = new Set(memberships.map((membership) => membership.book.id));
  const joinable = books.filter((book) => !requested.has(book.id));

  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);

  const search = query.trim().toLowerCase();
  const visibleBooks = search
    ? joinable.filter((book) => `${book.club.name} ${book.club.tagline ?? ""}`.toLowerCase().includes(search))
    : joinable.slice(0, 3);
  const selectedBooks = joinable.filter((book) => chosen.includes(book.id));

  function chooseBook(id: string, checked: boolean) {
    setChosen((previous) => checked ? [...previous, id] : previous.filter((bookId) => bookId !== id));
    // Searching keeps consent; changing which books receive the resume requires it again.
    setConsent(false);
  }

  async function run(action: () => Promise<{ status: "ok" } | { status: "error"; message: string }>, success: string) {
    const result = await action();
    if (result.status === "error") return toast(result.message);
    toast(success);
    router.refresh();
  }

  async function send() {
    setSending(true);
    await run(() => requestBooks({ bookIds: chosen, consent: true }), chosen.length > 1 ? "Requests sent" : "Request sent");
    setSending(false);
    setChosen([]);
    setConsent(false);
  }

  // What companies see: the card is drawn from the profile and lists the books it's accepted into.
  const preview: ResumeView | null = resume && {
    id: resume.id,
    school,
    books: memberships.filter((m) => m.status === "accepted").map((m) => ({ id: m.book.id, club: m.book.club })),
    profile: resume.profile,
    contact: null,
    createdAt: resume.updatedAt,
    previewPageCount: 0, // the card never shows pages
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Your resume</h1>
        <p className={styles.lead}>Companies see your profile, never your name or email, until they buy a book you&apos;re in.</p>
      </header>

      <div className={styles.columns}>
        <aside className={styles.side}>
          {preview ? (
            <>
              <p className={styles.label}>What companies see</p>
              <div inert>
                <ResumeCard resume={preview} href="#" />
              </div>
              <p className={styles.updated}>Updated {timeAgo(resume!.updatedAt)}</p>
              <div className={styles.resumeActions}>
                {resume!.previewPageCount > 0 && (
                  <AnchorButton href={resumePdfUrl(resume!.id)} target="_blank" rel="noreferrer" variant="quiet" size="sm">
                    <ExternalLink size={15} strokeWidth={2.75} aria-hidden />
                    My PDF
                  </AnchorButton>
                )}
                <ConfirmButton
                  label="Delete resume"
                  confirmLabel="Delete everywhere?"
                  icon={<Trash2 size={16} strokeWidth={2.75} aria-hidden />}
                  onConfirm={() => run(deleteResume, "Resume deleted")}
                />
              </div>
            </>
          ) : (
            <div className={styles.noResume}>
              <Monogram name="Resume" size={64}>
                <FileUser size={32} strokeWidth={2.5} />
              </Monogram>
              <p className={styles.noResumeTitle}>No resume yet</p>
              <p className={styles.noResumeBody}>Pick a club below to upload yours and join its book.</p>
            </div>
          )}
        </aside>

        <div className={styles.main}>
          {club && <ClubCard glance={club} />}

          <section aria-labelledby="books-heading">
            <h2 id="books-heading" className={styles.sectionTitle}>
              Your books
            </h2>

            {memberships.length > 0 ? (
              <ul className={styles.rows}>
                {memberships.map(({ book, status, requestedAt }) => (
                  <li key={book.id} className={styles.row}>
                    <Monogram name={book.club.name} size={44} />
                    <div className={styles.rowText}>
                      <p className={styles.rowName}>{book.club.name}</p>
                      <p className={styles.rowMeta}>Requested {timeAgo(requestedAt)}</p>
                    </div>
                    <span className={styles.status} data-status={status}>
                      {STATUS_LABELS[status]}
                    </span>
                    {status !== "rejected" && (
                      <ConfirmButton
                        label="Leave"
                        confirmLabel="Leave book?"
                        icon={<LogOut size={15} strokeWidth={2.75} aria-hidden />}
                        onConfirm={() => run(() => leaveBook(book.id), `Left ${book.club.name}`)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>You haven&apos;t asked to join any club yet.</p>
            )}
          </section>

          {joinable.length > 0 && (
            <section aria-labelledby="join-heading">
              <h2 id="join-heading" className={styles.sectionTitle}>
                {memberships.length > 0 ? "Join another club" : "Join a club"}
              </h2>

              <TextField
                className={styles.clubSearch}
                label={`Search clubs at ${school.name}`}
                hideLabel
                type="search"
                placeholder="Search clubs by name or description"
                icon={<Search size={18} strokeWidth={2.5} aria-hidden />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                hint={
                  <span role="status">
                    {search
                      ? pluralize(visibleBooks.length, "matching club")
                      : `Showing ${visibleBooks.length} of ${joinable.length} clubs.${joinable.length > 3 ? " Search to find more." : ""}`}
                  </span>
                }
              />

              {visibleBooks.length === 0 && (
                <p className={styles.empty}>No clubs match your search. Try another name or description.</p>
              )}

              {resume ? (
                <>
                  <div className={styles.joinList} role="group" aria-label="Clubs you can join">
                    {visibleBooks.map((book) => (
                      <SelectionCard
                        key={book.id}
                        type="checkbox"
                        checked={chosen.includes(book.id)}
                        onChange={(checked) => chooseBook(book.id, checked)}
                        disabled={sending}
                        art={<Monogram name={book.club.name} size={44} />}
                        title={book.club.name}
                        description={[book.club.tagline, pluralize(book.resumeCount, "member")].filter(Boolean).join(" · ")}
                      />
                    ))}
                  </div>

                  {chosen.length > 0 && (
                    <div className={styles.joinFooter}>
                      <ul className={styles.selectedClubs} aria-label="Selected clubs">
                        {selectedBooks.map((book) => (
                          <li key={book.id}>
                            <Button
                              className={styles.selectedClub}
                              variant="quiet"
                              size="sm"
                              disabled={sending}
                              aria-label={`Remove ${book.club.name}`}
                              onClick={() => chooseBook(book.id, false)}
                            >
                              <span>{book.club.name}</span>
                              <X size={14} strokeWidth={2.75} aria-hidden />
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)}>
                        Share my resume with companies that unlock {chosen.length > 1 ? "these books" : "this book"}. I can leave any time.
                      </Checkbox>
                      <Button variant="primary" disabled={!consent} loading={sending} onClick={send}>
                        {chosen.length > 1 ? `Send ${chosen.length} requests` : "Send request"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <ul className={styles.rows}>
                  {visibleBooks.map((book) => (
                    <li key={book.id} className={styles.row}>
                      <Monogram name={book.club.name} size={44} />
                      <div className={styles.rowText}>
                        <p className={styles.rowName}>{book.club.name}</p>
                        <p className={styles.rowMeta}>{book.club.tagline ?? pluralize(book.resumeCount, "member")}</p>
                      </div>
                      <LinkButton href={`/join/${book.club.slug}`} variant="secondary" size="sm">
                        Join
                      </LinkButton>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {!club && <ClubCard glance={null} />}
        </div>
      </div>
    </div>
  );
}
