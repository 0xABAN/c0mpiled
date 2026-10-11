/** What every onboarding step receives from the flow that sequences it. */
export type StepFrame = {
  /** 0 to 1, for the top progress bar. */
  progress: number;
  /** Omit on the first step; the shell shows an exit X instead. */
  onBack?: () => void;
  exitHref: string;
};
