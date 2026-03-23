import time
import requests

CLIENT_ID = ''
CLIENT_SECRET = ''

API_URL = 'https://api.getport.io/v1'
CREDS = {'clientId': CLIENT_ID, 'clientSecret': CLIENT_SECRET}

orgs = [
    "asdf"
]

def poll_run_until_finished(run_id, access_token):
    run_status_url = f"{API_URL}/actions/runs/{run_id}"
    response = requests.get(
        run_status_url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    ).json()

    if response['run']['status'] != 'IN_PROGRESS':
        return response['run']['status']
    else:
        time.sleep(1)
        print(f'Polling, status is {response["run"]["status"]}')
        return poll_run_until_finished(run_id, access_token)

for org_id in orgs:
    print(f'Deleting org {org_id}')
    token_response = requests.post(f'{API_URL}/auth/access_token', json=CREDS)
    access_token = token_response.json()['accessToken']
    action_run_url = f"{API_URL}/blueprints/organization/entities/{org_id}/actions/delete_org/runs"
    response = requests.post(
        action_run_url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json={
            "properties": {
                "reason": "Deleted by script"
            }
        }
    ).json()
    print(f'Started run for org deletion {org_id}')
    run_id = response['run']['id']
    status = poll_run_until_finished(run_id, access_token)

    if status != 'SUCCESS':
        print(f'Org {org_id} failed to delete, visit https://app.getport.io/organization/run?runId={run_id} to see why')
        exit(1)

    print(f'Org {org_id} deleted successfully')

