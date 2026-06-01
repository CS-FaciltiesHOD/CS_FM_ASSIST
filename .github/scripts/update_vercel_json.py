import json
import sys
import os

def update_vercel(target_path):
    print(f"--- Syncing Chatbot Configuration to {target_path} ---")
    if not os.path.exists(target_path):
        data = {"version": 2, "rewrites": [], "functions": {}}
    else:
        try:
            with open(target_path, 'r') as f:
                data = json.load(f)
        except:
            data = {"version": 2, "rewrites": [], "functions": {}}

    if 'rewrites' not in data: data['rewrites'] = []
    if 'functions' not in data: data['functions'] = {}

    new_rewrites = [
        { "source": "/api/chat", "destination": "/api/index.js" },
        { "source": "/api/webhook/whatsapp", "destination": "/api/webhook/whatsapp.js" },
        { "source": "/api/webhook/telegram", "destination": "/api/webhook/telegram.js" }
    ]

    # Prepend and deduplicate
    current_sources = [nr['source'] for nr in new_rewrites]
    data['rewrites'] = new_rewrites + [r for r in data['rewrites'] if r.get('source') not in current_sources]

    data['functions']["api/**/*.js"] = { "runtime": "vercel-node@latest" }

    with open(target_path, 'w') as f:
        json.dump(data, f, indent=2)
    print("Done.")

if __name__ == "__main__":
    update_vercel(sys.argv[1])
