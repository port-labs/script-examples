# Ingest the status of jobs from a GitHub workflow run

This guide explains how to ingest the status of a specific job inside a GitHub workflow run to Port.

**Note:** this guide assumes you are already using Port's [GitHub app](https://docs.getport.io/build-your-software-catalog/sync-data-to-catalog/git/github/) and you are ingesting into Port you GitHub [workflow runs](https://docs.getport.io/build-your-software-catalog/sync-data-to-catalog/git/github/examples#mapping-repositories-workflows-and-workflow-runs)

To implement this functionality, you will use Port’s [webhook](https://docs.getport.io/build-your-software-catalog/sync-data-to-catalog/webhook/) feature.

Here are the steps you need to follow:

1. Add a `job_status` string property to the Workflow Run blueprint
   1. This step is optional, if you just want to override the general status of the workflow run entity with the status of the desired step, you can skip this and update the JQ provided below accordingly
2. Create a webhook in Port, to do that follow these steps:
   1. Go to the [app.getport.io](https://app.getport.io)
   2. Open the builder page
   3. Click on the `data sources` button on the left side of the page
   4. Click on the `+ Data source` button at the top right corner of the page
   5. Select the Webhook tab
   6. Click on the custom integration box
   7. In the new window, enter the title and select an icon for the webhook, then click on next
   8. In the integration configuration step, take a look at the numbered boxes
   9. The first box includes the URL for the webhook, save it as we will provide it to GitHub when configuring the webhook on their side
   10. You can ignore the second box
   11. For the third box, use the config provided below
   12. Click on next and then on create at the next page
3.  Create a webhook in GitHub, to do that follow these steps:
    1.  Go to the github repository with the desired workflow
    2.  Click on Settings
    3.  Click on webhooks
    4.  Click on add webhook
    5.  For the payload URL, use the URL Port provided when you created the webhook on Port’s side (it starts with https://ingest.getport.io…)
    6.  For the content type, select `application/json`
    7.  You can leave secret empty
    8.  For “which events…“, select - Let me select individual events, and then select Workflow jobs and also deselect pushes
    9.  Click on Add webhook


Now let’s take a look at the webhook configuration on Port’s side, you will notice this snippet includes some placeholders for `YOUR_WORKFLOW_NAME` and `YOUR_WORKFLOW_JOB_NAME`, These correspond to the workflow name itself, and then to the specific job you want to take the status from. 

As mentioned above, it is possible to override the existing status of the workflow run entity, with the status of the specific job in the workflow, to do that, simply replace the `job_status` key in the configuration below, with `status`

```
[
  {
    "blueprint": "workflowRun",
    "filter": ".body.workflow_job.workflow_name == \"YOUR_WORKFLOW_NAME\" and .body.workflow_job.name == \"YOUR_WORKFLOW_JOB_NAME\" and .body.workflow_job.status == \"completed\"",
    "entity": {
      "identifier": ".body.repository.name + (.body.workflow_job.run_id | tostring)",
      "properties": {
        "job_status": ".body.workflow_job.conclusion"
      }
    }
  }
]
```