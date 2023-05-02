import requests
import threading

MAX_THREADS = 5
sema = threading.Semaphore(value=MAX_THREADS)


CLIENT_ID = 'YOUR_CLIENT_ID'
CLIENT_SECRET = 'YOUR_CLIENT_SECRET'

API_URL = 'https://api.getport.io/v1'

credentials = {'clientId': CLIENT_ID, 'clientSecret': CLIENT_SECRET}

token_response = requests.post(f'{API_URL}/auth/access_token', json=credentials)

access_token = token_response.json()['accessToken']

headers = {
    'Authorization': f'Bearer {access_token}'
}


def delete_port_entity(blueprint, entity):
    sema.acquire()
    res = requests.delete(f"{API_URL}/blueprints/{blueprint}/entities/{entity}", headers=headers)
    sema.release()
    if res.status_code == 200:
        print(f'Entity {entity} deleted')
    else:
        print(f'Encountered error deleting {entity}: {res.json()}')


API_URL = 'https://api.getport.io/v1'


all_blueprints = requests.get(f"{API_URL}/blueprints", headers=headers)

# Enter here the identifiers of the blueprints you want to delete all entities from
blueprints = ['YOUR_BLUEPRINT_IDENTIFIER']

report_threads = []

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
        report_thread = threading.Thread(
            target=delete_port_entity, args=(blue, ent['identifier']))
        report_thread.start()
        report_threads.append(report_thread)


for thread in report_threads:
    thread.join()

print('Done deleting')