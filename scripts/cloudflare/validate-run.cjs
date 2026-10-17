// This file is executed only from the default branch by workflow_run.
function selectTarget(run, repository, mainSha, pulls) {
  if (run.repository?.full_name !== repository || run.path !== '.github/workflows/build.yml'
      || run.conclusion !== 'success' || !/^[a-f0-9]{40}$/.test(run.head_sha)) return null;

  if (run.event === 'push' || run.event === 'schedule') {
    return run.head_branch === 'main' && run.head_repository?.full_name === repository
      && run.head_sha === mainSha ? {kind: 'production', sha: run.head_sha, pr: ''} : null;
  }
  if (run.event !== 'pull_request') return null;
  const pr = pulls.find(pr => pr.state === 'open' && pr.base.repo.full_name === repository
    && pr.head.sha === run.head_sha && Number.isSafeInteger(pr.number) && pr.number > 0);
  return pr ? {kind: 'preview', sha: run.head_sha, pr: pr.number} : null;
}

async function validate({github, context}) {
  const {data: run} = await github.rest.actions.getWorkflowRun({
    ...context.repo, run_id: context.payload.workflow_run.id,
  });
  const {data: main} = await github.rest.repos.getBranch({...context.repo, branch: 'main'});
  const pulls = run.event === 'pull_request'
    ? await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
      ...context.repo, commit_sha: run.head_sha,
    }) : [];
  return selectTarget(run, `${context.repo.owner}/${context.repo.repo}`, main.commit.sha, pulls);
}

module.exports = validate;
module.exports.selectTarget = selectTarget;
