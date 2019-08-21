// GitHub labels must be <= 50 chars. 
// Keep this in mind when picking an emoji and reminderCount.
// The combination of the two could result in longer labels.
const configDefaults: Config = {
  emoji: ":alarm_clock:",
  labelColor: "c5def5",
  codeReviewTimeWindow: 48 * 60 * 60 * 1000,
  reminderCount: 3, 
  pollIntervalTime: 0.5 * 60 * 60 * 1000,
  shouldIgnoreDraftPullRequests: true,
}

export default configDefaults
