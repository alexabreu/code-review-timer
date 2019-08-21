import { Application, Context, Octokit } from 'probot'
import createScheduler from 'probot-scheduler'
import Moment from 'moment'

import configDefaults from './config'

type PullRequest = Octokit.PullsGetResponse

const removeExistingLabelsFromPullRequest = 
  async(  context: Context, 
          pullRequest: PullRequest, 
          shouldRemoveAll = false
  ) => 
{
  context.log('Removing exisiting labels from pull request', pullRequest.number, 'shouldRemoveAll', shouldRemoveAll)
  const issueParams = context.issue()
  const labelToBeAdded = await getLabelToBeAddedToPullRequest(context, pullRequest)
  const existingLabels = pullRequest.labels
  const labels = labelToBeAdded && !shouldRemoveAll ?
    existingLabels.filter(l => l.name !== labelToBeAdded.name) : 
    existingLabels

  for (let label of labels) {
    context.log('Removing Label...', label, 'from pull request', pullRequest.number)
    await context.github.issues.removeLabel(
      { 
        ...issueParams, 
        issue_number: pullRequest.number, 
        name: label.name 
      }
    ) 
  }
}

const getLabelToBeAddedToPullRequest = async (context: Context, pullRequest: PullRequest) => {
  const { codeReviewTimeWindow, reminderCount, emoji, labelColor: color } = await loadConfig(context)
  const timeIncrement = codeReviewTimeWindow / reminderCount
  const now = Moment()
  const elapsedTime = Moment(now).diff(pullRequest.created_at, 'milliseconds')

  for (let i = reminderCount; i >= 1; i--) {
    if (elapsedTime >= timeIncrement * i) {
      const label = getLabel(emoji, color, i)
      return label
    }
  }

  return undefined
}

const pullRequestAlreadyHasLabel = (pullRequest: PullRequest, label: Label) => {
  const existingLabels = pullRequest.labels;
  return !!existingLabels.find(l => l.name === label.name)
}

const addLabelToPullRequest = async (context: Context, pullRequest: PullRequest) => {
  const issueParams = context.issue()
  const label = await getLabelToBeAddedToPullRequest(context, pullRequest)

  if (!label) return
  if (pullRequestAlreadyHasLabel(pullRequest, label)) return
  
  context.log('Adding Label...', label, 'to pull request', pullRequest.number)
  return context.github.issues.addLabels({ ...issueParams, issue_number: pullRequest.number, labels: [label.name] })  
}

const getLabel = (emoji: string, color: string, length: number) => {
  let label = ''
  for (let i = 1; i <= length; i++) {
    label += `${emoji} `
  }

  return {
    name: label.trim(),
    color
  }
}

const createLabels = async (context: Context) => {
  const { emoji, labelColor: color, reminderCount } = await loadConfig(context)
  const labels = []
  for (let i = 1; i <= reminderCount; i++) {
    labels.push(getLabel(emoji, color, i))
  }

  try {
    const issueParams = context.issue()
    for (let l of labels) {
      await context.github.issues.createLabel({...issueParams, ...l})
    }
  } catch (e) {
    context.log('Unable to create labels!', e.errors)
  }
}

const runOnAllPullRequests =
  async ( context: Context, 
          callback: (context: Context, pullRequest: PullRequest) => Promise<any>, 
          state: 'open' | 'closed' | 'all' = 'open'
  ) => 
{
  const { shouldIgnoreDraftPullRequests } = await loadConfig(context)
  const pullRequestParams = context.issue()
  const pullRequestsResponse = await context.github.pulls.list({ ...pullRequestParams, state })
  if (!(pullRequestsResponse && pullRequestsResponse.data)) return
  let allOpenRequests = pullRequestsResponse.data as PullRequest[]

  let pulls = (shouldIgnoreDraftPullRequests ?
    allOpenRequests.filter(pull => !pull.draft) :
    allOpenRequests)

  for (let pull of pulls) {
    await callback(context, pull)
  }
}

const loadConfig = async (context: Context) => {
  let config: Config
  try {
    config = await context.config('code-review-timer.yml') as Config
    if (!config) config = { ...configDefaults }
  } catch(e) {
    context.log('No configuration found. Using defaults.', e)
    config = { ...configDefaults }
  }

  context.log('Configuration', config)
  return config
}

export = (app: Application) => {  
  app.on('schedule.repository', async (context) => {
    await runOnAllPullRequests(context, removeExistingLabelsFromPullRequest)
    await runOnAllPullRequests(context, addLabelToPullRequest)
  })

  app.on('pull_request.closed', async (context) => {
    context.log('Pull request closed...')
    await runOnAllPullRequests(
      context,
      (context: Context, pullRequest: PullRequest) => removeExistingLabelsFromPullRequest(context, pullRequest, true),
      'closed'
    )
  })

  app.on(['pull_request.opened', 'pull_request.reopened'], async(context) => {
    let { pollIntervalTime: interval } = await loadConfig(context)
    createScheduler(app, { delay: true, interval })
    createLabels(context)
  });

}
