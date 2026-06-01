import json
import sys
import os

def update_vercel(target_path):
    print(f"--- Updating vercel.json at {target_path} ---")
    if not os.path.exists(target_path):
        print(f"Target {target_path} does not exist. Creating new vercel.json")
        data = {"version": 2, "rewrites": [], "functions": {}}
    else:
        try:
            with open(target_path, 'r') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error reading vercel.json: {e}")
            data = {"version": 2, "rewrites": [], "functions": {}}

    if 'rewrites' not in data: data['rewrites'] = []
    if 'functions' not in data: data['functions'] = {}

    new_rewrites = [
        { "source": "/api/chat", "destination": "/api/chat.js" },
        { "source": "/api/webhook/whatsapp", "destination": "/api/webhook/whatsapp.js" },
        { "source": "/api/webhook/telegram", "destination": "/api/webhook/telegram.js" }
    ]

    # Remove any existing rewrites for these sources
    sources_to_add = [nr['source'] for nr in new_rewrites]
    data['rewrites'] = [r for r in data['rewrites'] if r.get('source') not in sources_to_add]

    # Prepend new rewrites
    data['rewrites'] = new_rewrites + data['rewrites']

    # Ensure functions runtime is set
    data['functions']["api/*.js"] = { "runtime": "vercel-node@latest" }

    with open(target_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Successfully updated {target_path} with chatbot configuration.")
    print(json.dumps(data, indent=2))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update_vercel_json.py <target_vercel_json_path>")
        sys.exit(1)
    update_vercel(sys.argv[1])
