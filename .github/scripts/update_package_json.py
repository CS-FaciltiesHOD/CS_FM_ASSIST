import json
import sys
import os

def update_package_json(target_path, source_path):
    if not os.path.exists(target_path):
        print(f"Target {target_path} does not exist.")
        return
    if not os.path.exists(source_path):
        print(f"Source {source_path} does not exist.")
        return

    try:
        with open(target_path, 'r') as f:
            target_data = json.load(f)
        with open(source_path, 'r') as f:
            source_data = json.load(f)

        if 'dependencies' not in target_data:
            target_data['dependencies'] = {}

        source_deps = source_data.get('dependencies', {})

        # We only want to sync specific chatbot-related dependencies
        # to avoid bloat or conflicts in the target repo
        chatbot_deps = [
            "axios",
            "nodemailer",
            "node-telegram-bot-api",
            "cors",
            "dotenv",
            "@anthropic-ai/sdk",
            "@supabase/supabase-js"
        ]

        added = False
        for dep in chatbot_deps:
            if dep in source_deps and dep not in target_data['dependencies']:
                target_data['dependencies'][dep] = source_deps[dep]
                added = True
                print(f"Added {dep}@{source_deps[dep]} to target.")

        if added:
            with open(target_path, 'w') as f:
                json.dump(target_data, f, indent=2)
            print(f"Successfully updated {target_path} with chatbot dependencies.")
        else:
            print(f"No new chatbot dependencies to add to {target_path}.")

    except Exception as e:
        print(f"Error updating package.json: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python update_package_json.py <target_package_json_path> <source_package_json_path>")
        sys.exit(1)
    update_package_json(sys.argv[1], sys.argv[2])
