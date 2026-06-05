import json
import sys
import os

def update_vercel(target_path):
    print(f"--- Refined Vercel Configuration Sync to {target_path} ---")
    if not os.path.exists(target_path):
        data = {"version": 2, "rewrites": [], "functions": {}}
    else:
        try:
            with open(target_path, 'r') as f:
                data = json.load(f)
        except:
            data = {"version": 2, "rewrites": [], "functions": {}}

    if 'rewrites' not in data: data['rewrites'] = []

    # Remove project name to avoid deployment mismatches
    if 'name' in data:
        print("Removing 'name' field from vercel.json to avoid project mismatch.")
        del data['name']

    # Update rewrites
    new_rewrites = [
        { "source": "/api/chat", "destination": "/api/chat.js" },
        { "source": "/api/webhook/whatsapp", "destination": "/api/webhook/whatsapp.js" },
        { "source": "/api/webhook/telegram", "destination": "/api/webhook/telegram.js" }
    ]
    current_sources = [nr['source'] for nr in new_rewrites]
    data['rewrites'] = new_rewrites + [r for r in data['rewrites'] if r.get('source') not in current_sources]

    # COMPREHENSIVE RUNTIME FIX:
    # Clear blocks that trigger legacy "Function Runtimes" errors.
    # Modern Vercel deployments (Project Type: Other/Node) often conflict with
    # explicit functions/runtimes if the project is being detected as something else.
    # We remove these and rely on package.json "engines" and auto-detection.
    for legacy_key in ['builds', 'builders', 'functions']:
        if legacy_key in data:
            print(f"Removing '{legacy_key}' field from vercel.json to avoid runtime conflicts.")
            del data[legacy_key]

    # Ensure version 2 is set
    data['version'] = 2

    with open(target_path, 'w') as f:
        json.dump(data, f, indent=2)
    print("Done.")

if __name__ == "__main__":
    update_vercel(sys.argv[1])
