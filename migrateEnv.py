import json
import requests
import os
import copy

API_URL = 'https://api.getport.io/v1'

error = False

#The purpose of this script is to copy data between organization. It will copy both blueprints and entities.
#Fill in the secrets or set them as environment variables

OLD_CLIENT_ID = "" # or set to os.getenv("OLD_CLIENT_ID")
OLD_CLIENT_SECRET = "" # or set to os.getenv("OLD_CLIENT_SECRET")
NEW_CLIENT_ID = "" # or set to os.getenv("NEW_CLIENT_ID")
NEW_CLIENT_SECRET = "" # or set to os.getenv("NEW_CLIENT_SECRET")

old_credentials = { 'clientId': OLD_CLIENT_ID, 'clientSecret': OLD_CLIENT_SECRET }
old_credentials = requests.post(f'{API_URL}/auth/access_token', json=old_credentials)
old_access_token = old_credentials.json()["accessToken"]
old_headers = {
    'Authorization': f'Bearer {old_access_token}'
}

new_credentials = { 'clientId': NEW_CLIENT_ID, 'clientSecret': NEW_CLIENT_SECRET }
new_credentials = requests.post(f'{API_URL}/auth/access_token', json=new_credentials)
new_access_token = new_credentials.json()["accessToken"]
new_headers = {
    'Authorization': f'Bearer {new_access_token}'
}


def getBlueprints():
    print("Getting blueprints")
    res = requests.get(f'{API_URL}/blueprints', headers=old_headers)
    resp = res.json()["blueprints"]
    return resp

def getScorecards():
    print("Getting scorecards")
    res = requests.get(f'{API_URL}/scorecards', headers=old_headers)
    resp = res.json()["scorecards"]
    return resp

def getActions():
    print("Getting actions")
    res = requests.get(f'{API_URL}/actions', headers=old_headers)
    resp = res.json()["actions"]
    return resp

def getTeams():
    print("Getting teams")
    res = requests.get(f'{API_URL}/teams', headers=old_headers)
    resp = res.json()["teams"]
    return resp

def postBlueprints(blueprints):
    print("Posting blueprints")
    blueprintsWithoutRelation = copy.deepcopy(blueprints)
    for bp in blueprintsWithoutRelation:
        print(f"posting blueprint {bp['identifier']}")
        bp.get("relations").clear()
        bp.get("mirrorProperties").clear()
        res = requests.post(f'{API_URL}/blueprints', headers=new_headers, json=bp)
        if res.status_code != 200:
            print("error posting blueprint:" + res.json())
            error = True
    for blueprint in blueprints:
        print(f"patching blueprint {blueprint['identifier']} with relations")
        res = requests.patch(f'{API_URL}/blueprints/{blueprint["identifier"]}', headers=new_headers, json=blueprint)
        if res.status_code != 200:
            print("error patching blueprint:" + res.json())
            error = True

def postEntities(blueprints):
    for blueprint in blueprints:
        print(f"getting entities for blueprint {blueprint['identifier']}")
        res = requests.get(f'{API_URL}/blueprints/{blueprint["identifier"]}/entities', headers=old_headers)
        resp = res.json()["entities"]
        print(f"posting entities for blueprint {blueprint['identifier']}")
        for entity in resp:
            if entity["icon"] is None:
                entity.pop("icon", None)
            res = requests.post(f'{API_URL}/blueprints/{blueprint["identifier"]}/entities?upsert=true&validation_only=false&create_missing_related_entities=true&merge=false', headers=new_headers, json=entity)
            if res.status_code != 200:
                print("error posting entity:" + res.json())
                error = True

def postScorecards(scorecards):
    print("Posting scorecards")
    for scorecard in scorecards:
        print(f"posting scorecard {scorecard['identifier']}")
        res = requests.post(f'{API_URL}/blueprints/{scorecard["blueprint"]}/scorecards', headers=new_headers, json=scorecard)
        if res.status_code != 200:
            print("error posting scorecard:" + res.json())
            error = True


def postActions(actions):
    print("Posting actions")
    for action in actions:
        res = requests.post(f'{API_URL}/blueprints/{action["blueprint"]}/actions', headers=new_headers, json=action)
        if res.status_code != 200:
            print(f"error posting action {action["identifier"]} :" + res.json())
            error = True


def postTeams(teams):
    print("Posting teams")
    for team in teams:
        res = requests.post(f'{API_URL}/teams', headers=new_headers, json=team)
        if res.status_code != 200:
            print(f"error posting team {team['identifier']} :" + res.json())
            error = True


def main():
    blueprints = getBlueprints()
    postBlueprints(blueprints)
    postEntities(blueprints)
    scorecards = getScorecards()
    postScorecards(scorecards)
    actions = getActions()
    postActions(actions)
    teams = getTeams()
    postTeams(teams)
    if error:
        print("Errors occured during migration, please check logs")
    else:
        print("No errors were caught during migration")
    
if __name__ == "__main__":
    main()