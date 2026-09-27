# This is a script to migrate state from KV to D1 database.
# It reads the state from KV namespace, compacts it, and writes it to D1 database.
# It also deletes the KV namespace after a successful migration.
import requests
import os
import json

api_endpoint = f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CLOUDFLARE_ACCOUNT_ID']}"
headers = {
    "Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}",
}
d1_id = os.environ['D1_ID']
kv_name = "uptimeflare_kv"

# Fetch KV namespace ID
r = requests.get(
    api_endpoint + "/storage/kv/namespaces?per_page=1000",
    headers=headers
).json()

if not r['success']:
    print("Error fetching KV namespace info: ", r)
    exit(1)

kv_id = ''
for ns in r['result']:
    if ns['title'] == kv_name:
        kv_id = ns['id']
        break

if kv_id == '':
    print("KV namespace not found. Skipping migration.")
    exit(0)

print(f"Got KV namespace ID: {kv_id}")

# Fetch state from KV
r = requests.post(
    api_endpoint + f"/storage/kv/namespaces/{kv_id}/bulk/get",
    headers=headers,
    json={
        "keys": ["state"]
    }
).json()

if not r['success']:
    print("Error fetching state from KV: ", r)
    exit(1)

# Compact it
original_state = r['result']['values']['state']
state = json.loads(original_state)
compacted_state = {
    'lastUpdate': state['lastUpdate'],
    'overallUp': state['overallUp'],
    'overallDown': state['overallDown'],
    'incident': {
        k: {
            'start': [x['start'] for x in v],
            'end': [x.get('end') for x in v],
            'error': [x['error'] for x in v]
        } for k, v in state['incident'].items()
    },
    'latency': {}
}
compacted_state_str = json.dumps(compacted_state)


# Check whether D1 already has state before inserting
check = requests.post(
    api_endpoint + f"/d1/database/{d1_id}/query",
    headers=headers,
    json={
        "sql": "SELECT value FROM uptimeflare WHERE key = 'state'",
        "params": []
    }
).json()

if not check['success']:
    print("Error querying D1 database.")
    exit(1)

if check['result'][0]['results']:
    print("D1 already contains state. Migration skipped.")
    exit(0)

# Write compacted state to D1 without overwriting
r = requests.post(
    api_endpoint + f"/d1/database/{d1_id}/query",
    headers=headers,
    json={
        "sql": "INSERT INTO uptimeflare (key, value) VALUES (?, ?)",
        "params": ["state", compacted_state_str]
    }
).json()

if not r['success']:
    print("Error writing state to D1.")
    exit(1)

# Read back and verify without printing state contents
verify = requests.post(
    api_endpoint + f"/d1/database/{d1_id}/query",
    headers=headers,
    json={
        "sql": "SELECT value FROM uptimeflare WHERE key = 'state'",
        "params": []
    }
).json()

if not verify['success'] or not verify['result'][0]['results']:
    print("Verification failed after migration.")
    exit(1)

written = json.loads(verify['result'][0]['results'][0]['value'])
for field in ['lastUpdate', 'overallUp', 'overallDown', 'incident', 'latency']:
    if field not in written:
        print(f"Missing required field {field} after migration.")
        exit(1)

print("State migrated to D1 and verified successfully. KV namespace retained.")
