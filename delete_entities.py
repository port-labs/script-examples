import json
import requests
​
API_URL = 'https://api.getport.io/v1'​
​
CLIENT_ID = 'CLIENT_ID'
CLIENT_SECRET = 'CLIENT_SECRET'
​
API_URL = 'https://app.getport.io'
​
credentials = {'clientId': CLIENT_ID, 'clientSecret': CLIENT_SECRET}
​
token_response = requests.post(f'{API_URL}/auth/access_token', json=credentials)
​
access_token = token_response.json()['accessToken']
​
headers = {
    'Authorization': f'Bearer {access_token}'
}
​
​
def delete_port_entity(blueprint, entity):
    res = requests.delete(f"{API_URL}/blueprints/{blueprint}/entities/{entity}?delete_dependents=true", headers=headers)
    if res.status_code == 200:
        print(f'Entity {entity} deleted')
    else:
        print(f'Encountered error deleting {entity}: {res.json()}')
​
​
def delete_all(blueprints):
    for blue in blueprints:
        search = {
            "combinator": "and",
            "rules": [
                {
                    "property": "$blueprint",
                    "value": blue,
                    "operator": "="
                }
            ]
        }
        entities = requests.post(f"{API_URL}/entities/search", headers=headers, json=search)
        print(f'Starting to delete all {blue} entities')
        res = entities.json()
        for ent in res['entities']:
            delete_port_entity(blue, ent['identifier'])
​​
​
all_blueprints = requests.get(f"{API_URL}/blueprints", headers=headers)
​
if all_blueprints.status_code != 200:
    print('Failed to get blueprints, exiting')
    exit(1)
​
blueprints = []
​
for blueprint in all_blueprints.json()['blueprints']:
    blueprints.append(blueprint['identifier'])
    print('identifier:', blueprint['identifier'], 'title:', blueprint['title'])
​
# Enter here the identifiers of the blueprints you want to delete all entities from
# blueprints = ['pod', 'workload', 'workflow-run', 'workflow', 'pullRequest', 'node', 'namespace', 'cluster', 'issue', 'microservice']
​
delete_all(blueprints)

​
​
print('Done deleting')
