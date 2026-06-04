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

    # Target repository project name usually stays as 'southafricassoul'
    # but we ensure the functions configuration is correct for the deployment environment.

    new_rewrites = [
        { "source": "/api/chat", "destination": "/api/chat.js" },
        { "source": "/api/webhook/whatsapp", "destination": "/api/webhook/whatsapp.js" },
        { "source": "/api/webhook/telegram", "destination": "/api/webhook/telegram.js" }
    ]

    # Prepend and deduplicate
    current_sources = [nr['source'] for nr in new_rewrites]
    data['rewrites'] = new_rewrites + [r for r in data['rewrites'] if r.get('source') not in current_sources]

    # Clean up potentially broken runtimes (like plain 'php' which causes Vercel build errors)
    if data['functions']:
        to_remove = []
        for pattern, config in data['functions'].items():
            runtime = config.get('runtime', '')
            # If it contains php but doesn't look like a valid versioned runtime string, remove it
            if 'php' in runtime and '@' not in runtime:
                print(f"Removing invalid PHP runtime config for {pattern}")
                to_remove.append(pattern)
        for pattern in to_remove:
            del data['functions'][pattern]

    # Ensure chatbot functions use a valid Node.js runtime
    data['functions']["api/**/*.js"] = { "runtime": "nodejs20.x" }

    with open(target_path, 'w') as f:
        json.dump(data, f, indent=2)
    print("Done.")

if __name__ == "__main__":
    update_vercel(sys.argv[1])
