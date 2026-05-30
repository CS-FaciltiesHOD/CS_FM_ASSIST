import json
import sys
import os

def update_vercel(target_path):
    if not os.path.exists(target_path):
        print(f"Target {target_path} does not exist.")
        return

    try:
        with open(target_path, 'r') as f:
            data = json.load(f)

        if 'rewrites' not in data:
            data['rewrites'] = []

        # Check if already present to avoid duplicates
        existing_sources = [r.get('source') for r in data['rewrites']]

        new_rewrites = [
            { "source": "/api/chat", "destination": "/api/chat.js" },
            { "source": "/api/webhook/whatsapp", "destination": "/api/webhook/whatsapp.js" },
            { "source": "/api/webhook/telegram", "destination": "/api/webhook/telegram.js" }
        ]

        added = False
        for nr in new_rewrites:
            if nr['source'] not in existing_sources:
                data['rewrites'].append(nr)
                added = True

        if added:
            with open(target_path, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Successfully updated {target_path} with chatbot rewrites.")
        else:
            print(f"Chatbot rewrites already present in {target_path}.")

    except Exception as e:
        print(f"Error updating vercel.json: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update_vercel_json.py <target_vercel_json_path>")
        sys.exit(1)
    update_vercel(sys.argv[1])
