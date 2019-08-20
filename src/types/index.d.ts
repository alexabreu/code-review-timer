interface Label {
  name: string;
  color: string;
}

interface Config {
  emoji: string,
  labelColor: string
  codeReviewTimeWindow: number,
  reminderCount: number
  pollIntervalTime: number
  shouldIgnoreDraftPullRequests: boolean
}
