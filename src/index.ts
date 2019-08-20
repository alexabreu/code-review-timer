import { Application, Context, Octokit } from 'probot'
import createScheduler from 'probot-scheduler'
import Moment from 'moment'

import configDefaults from './config'

type PullRequest = Octokit.PullsGetResponse

interface StateInterface {
  hasLoadedConfig: boolean;
  hasCreatedLabels: boolean;
  labels: Label[];
}

const state: StateInterface = {
  hasLoadedConfig: false,
  hasCreatedLabels: false,
  labels: [],
}

let config: Config
const schedulerOptions = {
  delay: true,
  interval: 1 * 60 * 60 // 1 hour
}

const removeExistingLabelsFromPullRequest = 
  async(  context: Context, 
          pullRequest: PullRequest, 
          shouldRemoveAll = false
  ) => 
{

  context.log('Removing exisiting labels from pull request', pullRequest.number, 'shouldRemoveAll', shouldRemoveAll)
  const issueParams = context.issue()
  const labelToBeAdded = getLabelToBeAddedToPullRequest(pullRequest)
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

const getLabelToBeAddedToPullRequest = (pullRequest: PullRequest) => {
  const { codeReviewTimeWindow, reminderCount } = config
  const timeIncrement = codeReviewTimeWindow / reminderCount
  const now = Moment()
  const elapsedTime = Moment(now).diff(pullRequest.created_at, 'milliseconds')

  for (let i = reminderCount; i >= 1; i--) {
    if (elapsedTime >= timeIncrement * i) {
      const label = state.labels.find(l => l.name.split(' ').length >= i)

      if (label) return label
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
  const label = getLabelToBeAddedToPullRequest(pullRequest)

  if (!label) return
  if (pullRequestAlreadyHasLabel(pullRequest, label)) return
  
  context.log('Adding Label...', label, 'to pull request', pullRequest.number)
  return context.github.issues.addLabels({ ...issueParams, issue_number: pullRequest.number, labels: [label.name] })  
}

const createLabels = async (context: Context) => {
  const issueParams = context.issue()
  const { emoji, labelColor: color, reminderCount } = config
  let label = ''
  for (let i = 1; i <= reminderCount; i++) {
    label += `${emoji} `
    state.labels.push({
      name: label.trim(),
      color
    })
  }

  try {
    for (let l of state.labels) {
      await context.github.issues.createLabel({...issueParams, ...l})
    }
  } catch (e) {
    context.log('Unable to create labels!', e.errors)
  }
  
  state.hasCreatedLabels = true;
}

const runOnAllPullRequests =
  async ( context: Context, 
          callback: (context: Context, pullRequest: PullRequest) => Promise<any>, 
          state: 'open' | 'closed' | 'all' = 'open'
  ) => 
{
  const { shouldIgnoreDraftPullRequests } = config
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

export = (app: Application) => {
  createScheduler(app, schedulerOptions)
  
  app.on('schedule.repository', async (context) => {
    if (!state.hasLoadedConfig) { 
      try {
        config = await context.config('code-review-timer.yml') as Config
      } catch(e) {
        context.log('No configuration found. Using defaults.')
        config = { ...configDefaults }
      } finally {
        state.hasLoadedConfig = true;
      }
    }

    schedulerOptions.interval = config.pollIntervalTime
    if (!state.hasCreatedLabels) createLabels(context)

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
}
