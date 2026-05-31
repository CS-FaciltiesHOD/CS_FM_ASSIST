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

        new_rewrites = [
            { "source": "/api/chat", "destination": "/api/chat.js" },
            { "source": "/api/webhook/whatsapp", "destination": "/api/webhook/whatsapp.js" },
            { "source": "/api/webhook/telegram", "destination": "/api/webhook/telegram.js" }
        ]

        added = False
        # Remove any existing rewrites for these sources to avoid duplicates or old .cjs routes
        sources_to_add = [nr['source'] for nr in new_rewrites]
        data['rewrites'] = [r for r in data['rewrites'] if r.get('source') not in sources_to_add]

        # Prepend new rewrites to ensure priority
        data['rewrites'] = new_rewrites + data['rewrites']
        added = True

        if added:
            with open(target_path, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Successfully updated {target_path} with chatbot rewrites (prepended).")
        else:
            print(f"Chatbot rewrites already up to date in {target_path}.")

    except Exception as e:
        print(f"Error updating vercel.json: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update_vercel_json.py <target_vercel_json_path>")
        sys.exit(1)
    update_vercel(sys.argv[1])
