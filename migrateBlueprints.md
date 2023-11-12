# Migrate your Blueprints to a different account

The purpose of this file is to show you how to migrate Blueprints between Port Orgainzations, using a shell script.


First, export all of the blueprints using the following script (Make sure to use the API token of the old organization)
```
# Set Bearer value
export TOKEN="xxxx"
# Get existing blueprints and save them to blueprints.json
curl -X 'GET' "https://api.getport.io/v1/blueprints" -H "Authorization: $TOKEN" | jq > blueprints.json
```

Then, Import all of the blueprints using this script (Make sure to use the API token of the new organization)
```
# Set Bearer value
export TOKEN="xxxx"
# Create blueprints without relations and mirrorProperties
cat blueprints.json | jq -c '.blueprints[]' \
  | while read i; do; \
    jq --null-input --argjson i $i -c '$i | del(.relations, .mirrorProperties)' \
    | curl -s -X POST "https://api.getport.io/v1/blueprints" -H 'Content-Type: application/json' -H "Authorization: $TOKEN" --data-binary @- | jq \
  ; done
# Replace the blueprints including the relations and mirrorProperties
cat blueprints.json | jq -c '.blueprints[]' \
  | while read i; do; \
    export ID="$(jq -r --null-input --argjson i $i '$i.identifier')" \
    && jq --null-input --argjson i $i -c '$i' \
    | curl -s -X PUT "https://api.getport.io/v1/blueprints/$ID" -H 'Content-Type: application/json' -H "Authorization: $TOKEN" --data-binary @- | jq \
  ; done
```